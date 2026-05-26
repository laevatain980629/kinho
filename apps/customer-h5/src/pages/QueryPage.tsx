import { useState } from 'react'
import { Card, Button, TextField, Label, Input, FieldError } from '@heroui/react'
import { useNavigate } from 'react-router'
import { apiGet } from '../services/api-client'

interface OrderInfo {
  id: number
  requestNo?: string
  orderNo: string
  title: string
  state: string
  status?: string
  createdAt: string
  outletName: string
  engineerName: string | null
  faultDesc?: string
  machineSerial?: string | null
  rejectReason?: string | null
}

export default function QueryPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<OrderInfo[] | null>(null)

  const handleSearch = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await apiGet<{ list: OrderInfo[] }>(`/customer-requests/public?phone=${phone}`)
      setResults(data.list || [])
    } catch {
      setError('查询失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[var(--background)] p-4'>
      <div className='mb-8 text-center pt-8'>
        <button onClick={() => navigate('/')} className='mb-4 text-sm text-[var(--accent)]'>
          &larr; 返回报修
        </button>
        <h1 className='text-xl font-bold'>工单查询</h1>
        <p className='mt-1 text-sm text-[var(--muted)]'>输入报修手机号查看工单进度</p>
      </div>

      <div className='mx-auto max-w-md space-y-3'>
        <Card>
          <Card.Content className='p-4'>
            <TextField value={phone} onChange={setPhone} isInvalid={!!error}>
              <Label>手机号</Label>
              <Input placeholder='请输入报修时填写的手机号' type='tel' inputMode='numeric' />
              <FieldError>{error}</FieldError>
            </TextField>
          </Card.Content>
        </Card>

        <Button
          variant='primary'
          fullWidth
          onPress={handleSearch}
          isDisabled={loading}
          className='h-12'
        >
          {loading ? '查询中...' : '查询'}
        </Button>

        {results !== null && results.length === 0 && (
          <div className='rounded-xl bg-[var(--surface-secondary)] p-8 text-center'>
            <p className='text-sm text-[var(--muted)]'>未找到工单</p>
            <p className='mt-1 text-xs text-[var(--muted)]'>请确认手机号是否正确</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className='space-y-3'>
            {results.map((order) => (
              <Card key={order.id}>
                <Card.Content className='p-4'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <p className='text-sm font-bold'>{order.orderNo || order.requestNo || '待生成工单号'}</p>
                      <p className='mt-1 text-xs text-[var(--muted)]'>{order.title || order.faultDesc || '客户报修申请'}</p>
                    </div>
                    <span className='rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)]'>
                      {order.state || order.status}
                    </span>
                  </div>
                  <div className='mt-3 text-xs text-[var(--muted)]'>
                    <p>网点：{order.outletName || '待分配'}</p>
                    {order.engineerName && <p>工程师：{order.engineerName}</p>}
                    {order.machineSerial && <p>设备编号：{order.machineSerial}</p>}
                    {order.status === 'REJECTED' && order.rejectReason && (
                      <p className='text-[var(--danger)]'>驳回原因：{order.rejectReason}</p>
                    )}
                    <p>提交时间：{new Date(order.createdAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
