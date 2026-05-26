import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@heroui/react';
import { FileText } from 'lucide-react';
import { LoadingView, EmptyView } from '@kinho/shared-components';
import type { AuditLog } from '@kinho/shared-types';
import { AUDIT_ACTION_LABELS } from '@kinho/shared-types';
import { getAuditLogs } from '@/services/audit-log';

const MODULE_LABELS: Record<string, string> = {
  'work-order': '工单', quote: '报价', procurement: '采购', warehouse: '仓库',
  'parts-request': '领料', 'parts-return': '退料', user: '用户', system: '系统', inventory: '库存',
};

const ACTION_STYLES: Record<string, string> = {
  CREATE:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
  UPDATE:  'bg-sky-500/10 text-sky-400 border-sky-500/40',
  DELETE:  'bg-red-500/10 text-red-400 border-red-500/40',
  LOGIN:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  EXPORT:  'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  APPROVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
  REJECT:  'bg-red-500/10 text-red-400 border-red-500/40',
};

const DOT_COLORS: Record<string, string> = {
  CREATE: '#22c55e', UPDATE: '#60a5fa', DELETE: '#ef4444',
  LOGIN: '#71717a', EXPORT: '#71717a', APPROVE: '#22c55e', REJECT: '#ef4444',
};

const FILTER_ACTIONS = [
  { key: '', label: '全部操作' },
  { key: 'CREATE', label: '创建' },
  { key: 'UPDATE', label: '更新' },
  { key: 'DELETE', label: '删除' },
  { key: 'APPROVE', label: '审批' },
  { key: 'REJECT', label: '驳回' },
  { key: 'LOGIN', label: '登录' },
];

const FILTER_MODULES = [
  { key: '', label: '全部模块' },
  { key: 'work-order', label: '工单' },
  { key: 'quote', label: '报价' },
  { key: 'procurement', label: '采购' },
  { key: 'warehouse', label: '仓库' },
  { key: 'parts-request', label: '领料' },
  { key: 'parts-return', label: '退料' },
  { key: 'user', label: '用户' },
  { key: 'system', label: '系统' },
  { key: 'inventory', label: '库存' },
];

function fmtTime(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dt = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  return { time: t, date: dt };
}

export default function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [module, setModule] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    getAuditLogs({ action: action || undefined, module: module || undefined, page, pageSize: 20 })
      .then((res) => { setLogs(res.list); setTotal(res.total); })
      .catch(() => { setLogs([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [action, module, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <FileText className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">审计日志</h1>
          <p className="text-xs text-[var(--muted)]">查看系统操作记录，追踪用户行为</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_ACTIONS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setAction(f.key); setPage(1); }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              action === f.key
                ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-transparent bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--border)]" />
        {FILTER_MODULES.map((f) => (
          <button
            key={f.key}
            onClick={() => { setModule(f.key); setPage(1); }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              module === f.key
                ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-transparent bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-6"><LoadingView skeleton skeletonRows={6} /></div>
          ) : logs.length === 0 ? (
            <div className="p-6"><EmptyView title="暂无审计日志" /></div>
          ) : (
            <div className="relative ml-10 mr-6 py-4">
              {/* Vertical track */}
              <div className="absolute bottom-4 left-[-18px] top-4 w-px bg-[var(--border)]" />

              <div className="flex flex-col">
                {logs.map((log) => {
                  const dot = DOT_COLORS[log.action] || DOT_COLORS.LOGIN;
                  const actCls = ACTION_STYLES[log.action] || ACTION_STYLES.LOGIN;
                  const initial = log.userName?.charAt(0) || '?';
                  const { time, date } = fmtTime(log.occurredAt);

                  return (
                    <div key={log.id} className="group relative pb-4 last:pb-0">
                      {/* Dot on track */}
                      <div
                        className="absolute left-[-22px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)]"
                        style={{ backgroundColor: dot, boxShadow: `0 0 6px ${dot}66` }}
                      />

                      <div className="grid grid-cols-[100px_1fr] gap-4">
                        {/* Time */}
                        <div className="pt-1 text-right font-mono text-xs leading-relaxed text-[var(--muted)]">
                          <div>{time}</div>
                          <div className="text-[10px] opacity-50">{date}</div>
                        </div>

                        {/* Event card */}
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors group-hover:border-[var(--accent)]/25">
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${actCls}`}>
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              {/* Actor + action badge */}
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-semibold text-[var(--foreground)]">{log.userName}</span>
                                <span className={`inline-block rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${actCls}`}>
                                  {AUDIT_ACTION_LABELS[log.action]}
                                </span>
                              </div>
                              {/* Detail */}
                              {log.detail && (
                                <p className="text-xs text-[var(--muted)] leading-relaxed mt-0.5">{log.detail}</p>
                              )}
                              {/* Meta */}
                              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--muted)]/60">
                                <span>{MODULE_LABELS[log.module] || log.module}</span>
                                {log.targetName && <span>{log.targetName}</span>}
                                {log.ip && <span className="font-mono">{log.ip}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>共 {total} 条记录</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" isDisabled={page <= 1} onPress={() => setPage(page - 1)}>
              上一页
            </Button>
            <span className="rounded-md bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
              {page} / {totalPages}
            </span>
            <Button variant="ghost" size="sm" isDisabled={page >= totalPages} onPress={() => setPage(page + 1)}>
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
