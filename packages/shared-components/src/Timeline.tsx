import { CheckCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface TimelineStep {
  /** 步骤标题 */
  label: string;
  /** 辅助文本（如时间、操作人） */
  detail?: string;
  /** 是否已完成 */
  done?: boolean;
  /** 是否为当前步骤 */
  current?: boolean;
  /** 自定义图标（覆盖默认） */
  icon?: ReactNode;
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

/**
 * 共享时间轴组件
 * 用于工单流程、审批进度、采购流程等
 *
 * 用法:
 *   <Timeline steps={[
 *     { label: '已创建', detail: '客服 · 04-01 09:30', done: true },
 *     { label: '维修中', detail: '张工 · 04-01 15:00', current: true },
 *     { label: '待签名', detail: '' },
 *   ]} />
 */
export function Timeline({ steps, className = '' }: TimelineProps) {
  return (
    <div className={`relative pl-6 ${className}`}>
      {/* 连接线 */}
      <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-[var(--border)]" />

      {steps.map((step, i) => (
        <div key={i} className="relative mb-5 last:mb-0">
          {/* 节点圆点 */}
          <div
            className={`absolute -left-6 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${
              step.current
                ? 'border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_20%,transparent)]'
                : step.done
                  ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_20%,transparent)]'
                  : 'border-[var(--border)] bg-[var(--surface-secondary)]'
            }`}
          >
            {step.icon || (
              step.done ? <CheckCircle className="h-3 w-3 text-[var(--success)]" />
              : step.current ? <div className="h-2 w-2 rounded-full bg-[var(--warning)]" />
              : null
            )}
          </div>

          {/* 内容 */}
          <div className={`text-sm font-medium ${step.current ? 'text-[var(--warning)]' : step.done ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
            {step.label}
          </div>
          {step.detail && (
            <div className="mt-0.5 text-xs text-[var(--muted)]">{step.detail}</div>
          )}
        </div>
      ))}
    </div>
  );
}
