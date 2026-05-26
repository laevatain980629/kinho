import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, Button, TextArea, Select, ListBox, TextField, Label, Input } from '@heroui/react';
import { ShoppingCart, ArrowLeft, Plus, Trash2, Save, Search } from 'lucide-react';
import type { Part, ProcurementItem } from '@kinho/shared-types';
import { createProcurement, updateProcurement, getProcurementById } from '@/services/procurement';
import { searchParts } from '@/services/part';
import { getCurrentUser } from '@/utils/current-user';
import { toast } from '@kinho/shared-components';

interface FormItem {
  id?: number;
  partId: number;
  partName: string;
  partModel: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export default function ProcurementForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [workOrderId, setWorkOrderId] = useState<number | undefined>(undefined);
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [quoteId, setQuoteId] = useState<number | undefined>(undefined);
  const [quoteNo, setQuoteNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState<FormItem[]>([{ partId: 0, partName: '', partModel: '', unitPrice: 0, quantity: 1, amount: 0 }]);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [remark, setRemark] = useState('');
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);

  useEffect(() => {
    if (isEdit && id) {
      getProcurementById(Number(id)).then((p) => {
        if (p) {
          setWorkOrderId(p.workOrderId);
          setWorkOrderNo(p.workOrderNo || '');
          setQuoteId(p.quoteId);
          setQuoteNo(p.quoteNo || '');
          setSupplierName(p.supplierName);
          setItems(p.items.map((i) => ({ partId: i.partId, partName: i.partName, partModel: i.partModel, unitPrice: i.unitPrice, quantity: i.quantity, amount: i.amount })));
          setEstimatedCost(String(p.estimatedCost));
          setRemark(p.remark || '');
        }
      });
    }
  }, [id, isEdit]);

  const handleSearch = async (index: number, keyword: string) => {
    setSearchIndex(index);
    setSearchKeyword(keyword);
    if (keyword.length < 1) { setSearchResults([]); return; }
    const results = await searchParts(keyword);
    setSearchResults(results);
  };

  const handleSelectPart = (index: number, part: Part) => {
    const newItems = [...items];
    const unitPrice = part.unitPrice ?? 0;
    newItems[index] = { partId: part.id, partName: part.name, partModel: part.model, unitPrice, quantity: 1, amount: unitPrice };
    setItems(newItems);
    setSearchIndex(null);
    setSearchKeyword('');
    setSearchResults([]);
  };

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      item.amount = item.unitPrice * item.quantity;
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { partId: 0, partName: '', partModel: '', unitPrice: 0, quantity: 1, amount: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const partsTotal = items.reduce((sum, i) => sum + i.amount, 0);

  const handleSave = async () => {
    const user = getCurrentUser();
    if (!user?.id || !(user.name || user.username)) {
      toast.danger('无法获取当前用户信息');
      return;
    }

    const payload = {
      workOrderId: workOrderId || 0,
      workOrderNo,
      quoteId: quoteId || 0,
      quoteNo,
      supplierId: 1,
      supplierName,
      items: items.filter((i) => i.partId > 0) as ProcurementItem[],
      supplierQuotes: [],
      estimatedCost: Number(estimatedCost || partsTotal),
      remark,
      createdById: user.id,
      createdByName: user.name || user.username || '',
    };
    if (isEdit && id) {
      await updateProcurement(Number(id), payload);
    } else {
      await createProcurement(payload);
    }
    navigate('/procurements');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--warning)]/10">
            <ShoppingCart className="h-5 w-5 text-[var(--warning)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              {isEdit ? '编辑采购单' : '新建采购单'}
            </h1>
            <p className="text-xs text-[var(--muted)]">创建和管理配件采购单</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onPress={() => navigate('/procurements')}>
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
      </div>

      {/* Main Form Card */}
      <Card>
        <Card.Header className="px-5 pt-5">
          <Card.Title className="text-base font-semibold">采购信息</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-5 px-5 pb-5">
          {/* Work Order & Quote Selects */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">关联工单</label>
              <Select
                value={workOrderId ? String(workOrderId) : ''}
                onChange={(val) => {
                  setWorkOrderId(Number(val));
                  setWorkOrderNo(`WO-2026-040${val}`);
                }}
                className="w-full"
              >
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item key="" id="" textValue="请选择工单">请选择工单<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item key="1" id="1" textValue="WO-2026-0401 - 液压系统异响">WO-2026-0401 - 液压系统异响<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item key="2" id="2" textValue="WO-2026-0402 - 发动机保养">WO-2026-0402 - 发动机保养<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item key="3" id="3" textValue="WO-2026-0403 - 履带板更换">WO-2026-0403 - 履带板更换<ListBox.ItemIndicator /></ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">关联报价单</label>
              <Select
                value={quoteId ? String(quoteId) : ''}
                onChange={(val) => {
                  setQuoteId(Number(val));
                  setQuoteNo(`QT-2026-0430-${String(val).padStart(3, '0')}`);
                }}
                className="w-full"
              >
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item key="" id="" textValue="请选择报价单">请选择报价单<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item key="1" id="1" textValue="QT-2026-0430-001 - 液压系统异响">QT-2026-0430-001 - 液压系统异响<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item key="2" id="2" textValue="QT-2026-0430-002 - 发动机保养">QT-2026-0430-002 - 发动机保养<ListBox.ItemIndicator /></ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          {/* Supplier Name */}
          <div>
            <TextField value={supplierName} onChange={setSupplierName}>
              <Label>供应商名称</Label>
              <Input placeholder="请输入供应商名称" />
            </TextField>
          </div>

          {/* Parts List */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--foreground)]">配件明细</label>
              <Button variant="ghost" size="sm" onPress={addItem}>
                <Plus className="h-4 w-4" />
                添加配件
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="relative flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--accent)]/30"
                >
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                      <input
                        value={searchIndex === index ? searchKeyword : item.partName}
                        onChange={(e) => handleSearch(index, e.target.value)}
                        onFocus={() => setSearchIndex(index)}
                        placeholder="搜索配件..."
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--field-background)] py-2 pl-8 pr-3 text-sm transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                    {searchIndex === index && searchResults.length > 0 && (
                      <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPart(index, p)}
                            className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-secondary)]"
                          >
                            <span className="font-medium">{p.materialNo}</span>
                            <span className="mx-1 text-[var(--muted)]">-</span>
                            <span>{p.name}</span>
                            <span className="ml-auto text-[var(--accent)]">(¥{p.unitPrice})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <TextField value={String(item.unitPrice)} onChange={(v) => updateItem(index, 'unitPrice', Number(v))} className="w-24">
                    <Input type="number" placeholder="单价" />
                  </TextField>
                  <TextField value={String(item.quantity)} onChange={(v) => updateItem(index, 'quantity', Number(v))} className="w-20">
                    <Input type="number" placeholder="数量" />
                  </TextField>
                  <span className="w-24 text-right text-sm font-medium">
                    ¥{item.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => removeItem(index)}
                    className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Cost & Remark */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <TextField value={String(estimatedCost || partsTotal)} onChange={setEstimatedCost}>
                <Label>预估费用</Label>
                <Input type="number" placeholder="0" />
              </TextField>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">备注</label>
              <TextArea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="备注信息..."
              />
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-end gap-6 rounded-lg bg-[var(--surface-secondary)] px-4 py-3">
            <span className="text-sm text-[var(--muted)]">
              配件合计：<span className="font-medium text-[var(--foreground)]">¥{partsTotal.toLocaleString()}</span>
            </span>
            <span className="text-lg font-bold text-[var(--foreground)]">
              预估费用：¥{(Number(estimatedCost || partsTotal)).toLocaleString()}
            </span>
          </div>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onPress={() => navigate('/procurements')}>
          取消
        </Button>
        <Button variant="primary" onPress={handleSave}>
          <Save className="h-4 w-4" />
          {isEdit ? '保存' : '保存草稿'}
        </Button>
      </div>
    </div>
  );
}
