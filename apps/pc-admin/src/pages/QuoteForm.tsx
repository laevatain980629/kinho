import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Card, Button, TextArea, Select, ListBox, TextField, Label, Input } from '@heroui/react';
import { DollarSign, ArrowLeft, Plus, Trash2, Save, Send, Search } from 'lucide-react';
import type { Part } from '@kinho/shared-types';
import { createQuote, updateQuote, getQuoteById } from '@/services/quote';
import { getWorkOrders } from '@/services/work-order';
import { searchParts } from '@/services/part';
import { getCurrentUser, getCurrentUserName } from '@/utils/current-user';
import { toast } from '@kinho/shared-components';

interface FormItem {
  partId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export default function QuoteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const [workOrderId, setWorkOrderId] = useState(Number(searchParams.get('workOrderId')) || 0);
  const [workOrderNo, setWorkOrderNo] = useState(searchParams.get('workOrderNo') || '');
  const [workOrders, setWorkOrders] = useState<{ id: number; orderNo: string; title: string }[]>([]);

  useEffect(() => {
    getWorkOrders({}).then(res => {
      setWorkOrders(res.list || []);
      // If no workOrderId from URL, don't default
      if (!searchParams.get('workOrderId') && res.list?.length > 0) {
        setWorkOrderId(res.list[0].id);
        setWorkOrderNo(res.list[0].orderNo);
      }
    }).catch(() => {});
  }, []);
  const [items, setItems] = useState<FormItem[]>([{ partId: 0, name: '', unitPrice: 0, quantity: 1, amount: 0 }]);
  const [laborCost, setLaborCost] = useState('');
  const [remark, setRemark] = useState('');
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);

  useEffect(() => {
    if (isEdit && id) {
      getQuoteById(Number(id)).then((quote) => {
        if (quote) {
          setWorkOrderId(quote.workOrderId);
          setWorkOrderNo(quote.workOrderNo);
          setItems(quote.items.map((i) => ({ partId: i.partId, name: i.name, unitPrice: i.unitPrice, quantity: i.quantity, amount: i.amount })));
          setLaborCost(String(quote.laborCost));
          setRemark(quote.remark);
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
    newItems[index] = { partId: part.id, name: part.name, unitPrice, quantity: 1, amount: unitPrice };
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

  const addItem = () => setItems([...items, { partId: 0, name: '', unitPrice: 0, quantity: 1, amount: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const partsTotal = items.reduce((sum, i) => sum + i.amount, 0);
  const totalAmount = partsTotal + Number(laborCost || 0);

  const handleSave = async (_submit: boolean) => {
    const user = getCurrentUser();
    const currentUserName = getCurrentUserName();
    if (!user?.id || !currentUserName) {
      toast.danger('无法获取当前用户信息');
      return;
    }

    const payload = {
      workOrderId,
      workOrderNo,
      laborCost: Number(laborCost || 0),
      totalAmount,
      remark,
      creatorId: user.id,
      createdBy: currentUserName,
      items: items.filter((i) => i.partId > 0),
    };
    if (isEdit && id) {
      await updateQuote(Number(id), payload);
    } else {
      await createQuote(payload);
    }
    navigate('/quotes');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <DollarSign className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              {isEdit ? '编辑报价' : '新建报价'}
            </h1>
            <p className="text-xs text-[var(--muted)]">创建和管理维修报价单</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onPress={() => navigate('/quotes')}>
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
      </div>

      {/* Main Form Card */}
      <Card>
        <Card.Header className="px-5 pt-5">
          <Card.Title className="text-base font-semibold">报价信息</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-5 px-5 pb-5">
          {/* Work Order Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">关联工单</label>
            <Select
              value={workOrderId ? String(workOrderId) : ''}
              onChange={(val) => {
                const id = Number(val);
                setWorkOrderId(id);
                const wo = workOrders.find(w => w.id === id);
                setWorkOrderNo(wo?.orderNo || '');
              }}
              className="w-full"
              placeholder="选择关联工单"
            >
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {workOrders.map(wo => (
                    <ListBox.Item key={String(wo.id)} id={String(wo.id)} textValue={`${wo.orderNo} - ${wo.title}`}>
                      {wo.orderNo} - {wo.title}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
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
                        value={searchIndex === index ? searchKeyword : item.name}
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
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                    className="w-24 rounded-lg border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="单价"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="数量"
                  />
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

          {/* Labor Cost & Remark */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <TextField value={laborCost} onChange={setLaborCost}>
                <Label>工时费</Label>
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
            <span className="text-sm text-[var(--muted)]">
              工时费：<span className="font-medium text-[var(--foreground)]">¥{Number(laborCost || 0).toLocaleString()}</span>
            </span>
            <span className="text-lg font-bold text-[var(--foreground)]">
              总计：¥{totalAmount.toLocaleString()}
            </span>
          </div>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onPress={() => navigate('/quotes')}>
          取消
        </Button>
        <Button variant="secondary" onPress={() => handleSave(false)}>
          <Save className="h-4 w-4" />
          保存草稿
        </Button>
        <Button variant="primary" onPress={() => handleSave(true)}>
          <Send className="h-4 w-4" />
          提交审核
        </Button>
      </div>
    </div>
  );
}
