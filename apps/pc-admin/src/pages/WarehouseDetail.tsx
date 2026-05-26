import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Card, Button } from '@heroui/react'
import { ArrowLeft, Plus, Minus, ArrowLeftRight } from 'lucide-react'
import { LoadingView } from '@kinho/shared-components'
import { apiGet } from '../utils/api-client'
import './WarehouseDetail.css'

interface Balance {
  id: number; warehouseId: number; warehouseName: string;
  partId: number; partNo: string; partName: string; partModel: string;
  quantityOnHand: number; quantityAvailable: number; quantityReserved: number; quantityDamaged: number;
}

export default function WarehouseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [balances, setBalances] = useState<Balance[]>([])
  const [warehouse, setWarehouse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      apiGet('/warehouses/' + id),
      apiGet<{ list: Balance[] }>('/inventory/balances?warehouseId=' + id),
    ]).then(([wh, inv]: any[]) => {
      setWarehouse(wh)
      setBalances(inv.list || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="wh-detail"><LoadingView text="加载仓库信息..." /></div>
  if (!warehouse) return <div className="wh-detail"><div className="wh-detail__empty">仓库不存在</div></div>

  return (
    <div className="wh-detail">
      <div className="wh-detail__header">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => navigate('/warehouses')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="wh-detail__header-info">
          <h1 className="wh-detail__title">{warehouse.name}</h1>
          <span className={`wh-detail__type-tag ${warehouse.type === 'ENGINEER_WAREHOUSE' ? 'wh-detail__type-tag--engineer' : 'wh-detail__type-tag--hq'}`}>
            {warehouse.type === 'HQ_WAREHOUSE' ? '中心仓' : warehouse.type === 'ENGINEER_WAREHOUSE' ? '个人仓' : warehouse.type}
          </span>
        </div>
        <div className="wh-detail__header-actions">
          <span className="wh-detail__meta">{warehouse.warehouseNo} · {warehouse.outletName || '—'}</span>
        </div>
      </div>

      <div className="wh-detail__actions">
        {warehouse.type === 'HQ_WAREHOUSE' ? (
          <>
            <Button variant="secondary" size="sm" onPress={() => navigate(`/warehouses/transfer?fromWarehouseId=${id}`)}><ArrowLeftRight className="h-4 w-4" />调拨</Button>
            <Button variant="primary" size="sm" onPress={() => navigate(`/warehouse/${id}/stock-in`)}><Plus className="h-4 w-4" />入库</Button>
            <Button variant="secondary" size="sm" onPress={() => navigate(`/warehouse/${id}/stock-out`)}><Minus className="h-4 w-4" />出库</Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onPress={() => navigate(`/warehouses/transfer?fromWarehouseId=${id}`)}><ArrowLeftRight className="h-4 w-4" />调拨</Button>
        )}
      </div>

      <Card className="wh-detail__card">
        <Card.Content className="p-0">
          {balances.length === 0 ? (
            <div className="wh-detail__empty">暂无库存记录</div>
          ) : (
            <div className="wh-detail__list">
              {balances.map((b) => (
                <div key={b.id} className="wh-detail__row">
                  <div className="wh-detail__row-info">
                    <div className="wh-detail__row-name">{b.partNo} {b.partName}</div>
                    <div className="wh-detail__row-meta">{b.partModel || '—'}</div>
                  </div>
                  <div className="wh-detail__row-qty">
                    <div className="wh-detail__qty"><span className="wh-detail__qty-num">{b.quantityOnHand}</span><span className="wh-detail__qty-label">在库</span></div>
                    <div className="wh-detail__qty"><span className="wh-detail__qty-num">{b.quantityAvailable}</span><span className="wh-detail__qty-label">可用</span></div>
                    <div className="wh-detail__qty"><span className="wh-detail__qty-num">{b.quantityReserved}</span><span className="wh-detail__qty-label">预留</span></div>
                    <div className="wh-detail__qty"><span className="wh-detail__qty-num">{b.quantityDamaged}</span><span className="wh-detail__qty-label">损坏</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  )
}
