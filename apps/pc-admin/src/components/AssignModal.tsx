import { useState, useEffect } from 'react';
import { Button, Chip } from '@heroui/react';
import type { User } from '@kinho/shared-types';
import { getEngineers } from '@/services/user';

interface WorkOrderInfo {
  orderNo: string;
  title: string;
  faultType: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAssign: (engineer: User) => void;
  workOrderInfo?: WorkOrderInfo;
  outletId?: number | null;
}

export default function AssignModal({ open, onClose, onAssign, workOrderInfo, outletId }: Props) {
  const [engineers, setEngineers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);

  useEffect(() => {
    if (open) {
      if (!outletId) {
        setEngineers([]);
        setSelected(null);
        return;
      }
      getEngineers({ status: 'ACTIVE', outletId: outletId ?? undefined, page: 1, pageSize: 50 })
        .then((res) => setEngineers(res.list))
        .catch(() => setEngineers([]));
      setSelected(null);
    }
  }, [open, outletId]);

  if (!open) return null;

  // Simple recommendation: first 2 engineers are "recommended"
  const recommendedIds = engineers.slice(0, 2).map((e) => e.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-[680px] flex-col gap-4 rounded-xl bg-[var(--surface)] p-6 shadow-xl">
        <div className="flex gap-4">
          {/* Left: Engineer list */}
          <div className="flex-1">
            <h2 className="mb-3 text-base font-semibold">选择工程师</h2>
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {engineers.map((eng) => (
                <button
                  key={eng.id}
                  onClick={() => setSelected(eng)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selected?.id === eng.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                      : recommendedIds.includes(eng.id)
                      ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{eng.name}</span>
                    {recommendedIds.includes(eng.id) && (
                      <Chip color="accent" variant="primary" size="sm">推荐</Chip>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {eng.outletName || '未分配网点'} · {eng.phone}
                  </div>
                </button>
              ))}
              {engineers.length === 0 && (
                <div className="py-8 text-center text-sm text-[var(--muted)]">
                  {outletId ? '暂无可用工程师' : '请先为工单分配服务网点'}
                </div>
              )}
            </div>
          </div>

          {/* Right: Work order summary */}
          <div className="w-[220px] rounded-lg bg-[var(--surface-secondary)] p-4">
            <h3 className="mb-2 text-sm font-semibold">工单信息</h3>
            {workOrderInfo ? (
              <div className="space-y-2 text-xs">
                <div><span className="text-[var(--muted)]">编号：</span>{workOrderInfo.orderNo}</div>
                <div><span className="text-[var(--muted)]">标题：</span>{workOrderInfo.title}</div>
                <div><span className="text-[var(--muted)]">故障：</span>{workOrderInfo.faultType}</div>
              </div>
            ) : (
              <div className="text-xs text-[var(--muted)]">无工单信息</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button
            variant="primary"
            onPress={() => { if (selected && selected.outletId === outletId) onAssign(selected); }}
            isDisabled={!selected || selected.outletId !== outletId}
          >
            确认分配
          </Button>
        </div>
      </div>
    </div>
  );
}
