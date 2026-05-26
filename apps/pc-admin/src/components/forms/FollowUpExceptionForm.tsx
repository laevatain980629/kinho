import { useState } from 'react';
import { Button } from '@heroui/react';
import { AlertTriangle, Camera, CheckCircle } from 'lucide-react';
import PhotoUpload from './shared/PhotoUpload';

// Match PhotoUpload's local Attachment type
interface Attachment {
  id: number;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: number;
  uploadedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    exceptionType: 'COMPLAINT' | 'UNRESOLVED' | 'BAD_ATTITUDE' | 'OTHER';
    exceptionNote: string;
    attachments: Attachment[];
  }) => void;
}

const EXCEPTION_TYPE_OPTIONS = [
  { value: 'COMPLAINT', label: '客户投诉' },
  { value: 'UNRESOLVED', label: '问题未解决' },
  { value: 'BAD_ATTITUDE', label: '服务态度差' },
  { value: 'OTHER', label: '其他' },
] as const;

export default function FollowUpExceptionForm({ open, onClose, onSubmit }: Props) {
  const [exceptionType, setExceptionType] = useState<'COMPLAINT' | 'UNRESOLVED' | 'BAD_ATTITUDE' | 'OTHER'>('COMPLAINT');
  const [exceptionNote, setExceptionNote] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleSubmit = () => {
    onSubmit({ exceptionType, exceptionNote, attachments });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[520px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
          回访异常
        </h2>

        {/* Exception Type */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">异常类型</label>
          <div className="flex flex-wrap gap-2">
            {EXCEPTION_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExceptionType(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  exceptionType === opt.value
                    ? 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--warning)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exception Note */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">异常说明</label>
          <textarea
            value={exceptionNote}
            onChange={(e) => setExceptionNote(e.target.value)}
            placeholder="请详细描述异常情况..."
            rows={4}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Attachments */}
        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
            <Camera className="h-4 w-4" />
            附件凭证
          </label>
          <PhotoUpload value={attachments} onChange={setAttachments} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="secondary" onPress={handleSubmit}>
            <CheckCircle className="h-4 w-4" />
            提交异常
          </Button>
        </div>
      </div>
    </div>
  );
}
