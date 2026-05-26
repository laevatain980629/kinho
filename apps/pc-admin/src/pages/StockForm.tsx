import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Card, Button, Select, ListBox, TextField, Label, Input } from '@heroui/react'
import { ArrowLeft } from 'lucide-react'
import { toast } from '@kinho/shared-components'
import { apiGet, apiPost } from '../utils/api-client'
import { getCurrentUser } from '../utils/current-user'

function parseUser() {
  const user = getCurrentUser()
  if (!user?.id || !(user.name || user.username)) return null
  return { id: user.id, name: user.name || user.username || '' }
}

export default function StockForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const mode = location.pathname.includes('stock-in') ? 'in' : 'out'

  const [partId, setPartId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [parts, setParts] = useState<any[]>([])
  const [warehouse, setWarehouse] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      apiGet('/warehouses/' + id).then(setWarehouse).catch(() => {})
      apiGet<{ list: any[] }>('/inventory/balances?warehouseId=' + id).then(r => setParts(r.list || [])).catch(() => setParts([]))
    } else {
      apiGet('/inventory/balances').then((r: any) => setParts(r.list || [])).catch(() => setParts([]))
    }
  }, [id])

  const partOptions = parts.map((p: any) => ({
    key: String(p.partId), label: `${p.partNo} ${p.partName} (在库:${p.quantityOnHand})`, partNo: p.partNo, partName: p.partName,
  }))

  const handleSubmit = async () => {
    if (!partId || !quantity || !id) return
    setSubmitting(true)
    try {
      const operator = parseUser()
      if (!operator) { toast.danger('无法获取当前用户信息'); return }
      const qty = mode === 'in' ? Number(quantity) : -Number(quantity)
      await apiPost('/inventory/adjust', {
        warehouseId: Number(id), partId: Number(partId), quantity: qty,
        reason: reason || (mode === 'in' ? '手动入库' : '手动出库'),
        operatorId: operator.id, operatorName: operator.name,
      })
      toast.success(mode === 'in' ? '入库成功' : '出库成功')
      navigate(-1)
    } catch { toast.danger('操作失败') }
    finally { setSubmitting(false) }
  }

  const label = mode === 'in' ? '入库' : '出库'

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div><h1 className="text-lg font-bold">{label}</h1><p className="text-xs text-[var(--muted)]">{warehouse?.name || '选择仓库'}</p></div>
      </div>

      <Card>
        <Card.Content className="p-6 space-y-4">
          {!id && (
            <div>
              <Label className="text-xs text-[var(--muted)] mb-1 block">仓库</Label>
              <Select value={id || ''} onChange={(v) => navigate(`/warehouse/${v}/stock-${mode}`)} placeholder="请先选择仓库">
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs text-[var(--muted)] mb-1 block">配件 *</Label>
            <Select value={partId} onChange={(v) => setPartId(String(v || ''))}>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox className="max-h-[240px]">{partOptions.map(o => <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
            </Select>
          </div>

          <TextField value={quantity} onChange={setQuantity}>
            <Label>数量 *</Label><Input type="number" placeholder="输入数量" />
          </TextField>

          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={`${label}原因（选填）`} rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none" />
        </Card.Content>
      </Card>

      <Button variant="primary" size="lg" fullWidth onPress={handleSubmit} isDisabled={submitting || !partId || !quantity}>
        {submitting ? '提交中...' : `确认${label}`}
      </Button>
    </div>
  )
}
