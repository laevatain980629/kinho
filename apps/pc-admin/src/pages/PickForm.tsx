import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Card, Button, Select, ListBox, TextField, Input } from '@heroui/react'
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react'
import { toast } from '@kinho/shared-components'
import { apiGet, apiPost } from '../utils/api-client'
import { getCurrentUser } from '../utils/current-user'

interface PartItem { partId: number; partNo: string; partName: string; quantity: number }

const TYPE_OPTIONS = [
  { key: 'WORK_ORDER_PICK', label: '工单领料' },
  { key: 'ADDITIONAL_PICK', label: '补充领料' },
  { key: 'PRE_PICK', label: '预领料' },
]

function parseUser() {
  const user = getCurrentUser()
  if (!user?.id || !(user.name || user.username)) return null
  return { id: user.id, name: user.name || user.username || '' }
}

export default function PickForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const woId = searchParams.get('workOrderId') || ''
  const woNo = searchParams.get('workOrderNo') || ''

  const [type, setType] = useState('WORK_ORDER_PICK')
  const [fromWH, setFromWH] = useState('')
  const [toWH, setToWH] = useState('')
  const [remark, setRemark] = useState('')
  const [parts, setParts] = useState<PartItem[]>([{ partId: 0, partNo: '', partName: '', quantity: 1 }])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiGet('/warehouses/all').then((r: any) => setWarehouses(r)).catch(() => setWarehouses([]))
  }, [])

  // 当源仓变化时，加载该仓库存
  useEffect(() => {
    if (!fromWH) { setInventory([]); return }
    apiGet(`/inventory/balances?warehouseId=${fromWH}`).then((r: any) => setInventory(r.list || r || [])).catch(() => setInventory([]))
  }, [fromWH])

  // 源仓变化时重置配件选择
  useEffect(() => { setParts([{ partId: 0, partNo: '', partName: '', quantity: 1 }]) }, [fromWH])

  const addPart = () => setParts([...parts, { partId: 0, partNo: '', partName: '', quantity: 1 }])
  const removePart = (i: number) => { if (parts.length <= 1) return; setParts(parts.filter((_, j) => j !== i)) }

  // 只显示源仓有可用库存的配件
  const invOptions = inventory
    .filter((inv: any) => inv.quantityAvailable > 0)
    .map((inv: any) => ({
      key: String(inv.partId),
      label: `${inv.partName} · ${inv.partNo} · 可用${inv.quantityAvailable}`,
      partNo: inv.partNo, partName: inv.partName, available: inv.quantityAvailable,
    }))

  // 源仓：只允许 HQ_WAREHOUSE 和 OUTLET_WAREHOUSE
  const SOURCE_WH = warehouses
    .filter((w: any) => w.type !== 'ENGINEER_WAREHOUSE')
    .map((w: any) => ({ key: String(w.id), label: `${w.name} · ${w.type === 'HQ_WAREHOUSE' ? '中心仓' : '网点仓'}` }))

  // 目标仓：只允许 ENGINEER_WAREHOUSE
  const TARGET_WH = warehouses
    .filter((w: any) => w.type === 'ENGINEER_WAREHOUSE')
    .map((w: any) => ({ key: String(w.id), label: w.name }))

  // 获取配件当前可选的最大数量
  const maxForPart = (partId: number) => {
    const inv = inventory.find((i: any) => i.partId === partId)
    return inv?.quantityAvailable ?? 0
  }

  const isValid = fromWH && toWH && parts.every((p) => p.partId > 0 && p.quantity > 0)

  const handleSubmit = async () => {
    if (!isValid) return; setSubmitting(true)
    try {
      const operator = parseUser()
      if (!operator) { toast.danger('无法获取当前用户信息'); return }
      await apiPost('/parts-requests', {
        type, workOrderId: woId ? Number(woId) : undefined,
        fromWarehouseId: Number(fromWH), toWarehouseId: Number(toWH),
        items: parts.map((p) => ({ partId: p.partId, partNo: p.partNo, partName: p.partName, quantity: p.quantity, partModel: '' })),
        remark: remark || undefined, operatorId: operator.id, operatorName: operator.name,
      })
      toast.success('领料申请已提交'); navigate(-1)
    } catch (err: any) { toast.danger(err?.message || '提交失败') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div><h1 className="text-lg font-bold">新建领料申请</h1><p className="text-xs text-[var(--muted)]">从中心仓/网点仓预领配件到工程师个人仓</p></div>
      </div>

      {woId && (
        <div className="rounded-lg bg-[var(--accent)]/10 px-4 py-3 flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-[var(--accent)]" /> 关联工单：<b>{woNo}</b>
        </div>
      )}

      <Card>
        <Card.Content className="p-6 space-y-5">
          <Select value={type} onChange={(v) => setType(String(v || ''))}>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover><ListBox>{TYPE_OPTIONS.map((t) => <ListBox.Item key={t.key} id={t.key} textValue={t.label}>{t.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select value={fromWH} onChange={(v) => setFromWH(String(v || ''))}>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox className="max-h-[200px]">{SOURCE_WH.map((w) => <ListBox.Item key={w.key} id={w.key} textValue={w.label}>{w.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
            </Select>

            <Select value={toWH} onChange={(v) => setToWH(String(v || ''))}>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox className="max-h-[200px]">{TARGET_WH.map((w) => <ListBox.Item key={w.key} id={w.key} textValue={w.label}>{w.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
            </Select>
          </div>

          {!fromWH && <p className="text-xs text-[var(--muted)]">请先选择出库仓库</p>}

          {fromWH && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--muted)] font-medium">配件明细 *</span>
                <Button variant="ghost" size="sm" onPress={addPart}><Plus className="h-3 w-3" />添加</Button>
              </div>
              <div className="space-y-3">
                {parts.map((part, i) => {
                  const max = part.partId ? maxForPart(part.partId) : 0
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2">
                      <div className="flex-1">
                        <Select value={String(part.partId)} onChange={(v) => {
                          const opt = invOptions.find((o: any) => o.key === v)
                          setParts(parts.map((p, j) => j === i ? { ...p, partId: Number(v), partNo: opt?.partNo || '', partName: opt?.partName || '', quantity: 1 } : p))
                        }}>
                          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                          <Select.Popover><ListBox className="max-h-[200px]">{invOptions.map((inv: any) => <ListBox.Item key={inv.key} id={inv.key} textValue={inv.label}>{inv.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                        </Select>
                      </div>
                      <TextField value={String(part.quantity)} onChange={(v) => {
                        const qty = Math.max(1, Math.min(max, Number(v) || 1))
                        setParts(parts.map((p, j) => j === i ? { ...p, quantity: qty } : p))
                      }} className="w-20">
                        <Input type="number" placeholder="数量" className="text-center" />
                      </TextField>
                      {max > 0 && <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">/ {max}</span>}
                      {parts.length > 1 && <Button variant="ghost" size="sm" isIconOnly onPress={() => removePart(i)}><Trash2 className="h-3 w-3 text-[var(--danger)]" /></Button>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="选填备注" rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none" />
        </Card.Content>
      </Card>

      <Button variant="primary" size="lg" fullWidth onPress={handleSubmit} isDisabled={submitting || !isValid}>
        {submitting ? '提交中...' : '提交领料申请'}
      </Button>
    </div>
  )
}
