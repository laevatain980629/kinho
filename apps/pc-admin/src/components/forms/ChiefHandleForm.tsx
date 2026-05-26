import { useState } from 'react';
import { Button } from '@heroui/react';
import { Wrench, CheckCircle } from 'lucide-react';
import PhotoUpload from './shared/PhotoUpload';

interface AttachUI { id: number; name: string; url: string; type: 'image' | 'file'; size: number; uploadedAt: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    handleAction: 'GIVE_SOLUTION' | 'REASSIGN_ENGINEER' | 'COMPLETE' | 'CLOSE';
    solution: string;
    engineerIds: number[];
    closeReason: string;
    photos: { url: string; name: string; size: number }[];
  }) => void;
  engineers?: { id: number; name: string }[];
}

const HANDLE_ACTION_OPTIONS = [
  { value: 'GIVE_SOLUTION', label: '提供方案' },
  { value: 'REASSIGN_ENGINEER', label: '重新指派' },
  { value: 'COMPLETE', label: '直接完成' },
  { value: 'CLOSE', label: '关闭工单' },
] as const;

export default function ChiefHandleForm({ open, onClose, onSubmit, engineers = [] }: Props) {
  const [handleAction, setHandleAction] = useState<'GIVE_SOLUTION' | 'REASSIGN_ENGINEER' | 'COMPLETE' | 'CLOSE'>('GIVE_SOLUTION');
  const [solution, setSolution] = useState('');
  const [engineerIds, setEngineerIds] = useState<number[]>([]);
  const [closeReason, setCloseReason] = useState('');
  const [photos, setPhotos] = useState<AttachUI[]>([]);

  const toggleEngineer = (id: number) => {
    setEngineerIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    onSubmit({
      handleAction,
      solution,
      engineerIds,
      closeReason,
      photos: photos.map(p => ({ url: p.url, name: p.name, size: p.size })),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[520px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Wrench className="h-5 w-5 text-[var(--accent)]" />
          总工处理
        </h2>

        {/* Handle Action */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">处理方式</label>
          <div className="flex flex-wrap gap-2">
            {HANDLE_ACTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setHandleAction(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  handleAction === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Solution (for GIVE_SOLUTION / COMPLETE) */}
        {(handleAction === 'GIVE_SOLUTION' || handleAction === 'COMPLETE') && (
          <>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">解决方案</label>
              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="请输入解决方案..."
                rows={4}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">相关照片（可选）</label>
              <PhotoUpload value={photos} onChange={setPhotos} max={9} />
            </div>
          </>
        )}

        {/* Engineer multi-select (for REASSIGN_ENGINEER) */}
        {handleAction === 'REASSIGN_ENGINEER' && engineers.length > 0 && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">选择工程师（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {engineers.map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => toggleEngineer(eng.id)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    engineerIds.includes(eng.id)
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  {eng.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Close Reason (for CLOSE) */}
        {handleAction === 'CLOSE' && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">关闭原因</label>
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="请输入关闭原因..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="primary" onPress={handleSubmit}>
            <CheckCircle className="h-4 w-4" />
            确认处理
          </Button>
        </div>
      </div>
    </div>
  );
}
