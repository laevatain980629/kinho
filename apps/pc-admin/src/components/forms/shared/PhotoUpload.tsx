import { useRef, useCallback } from 'react';
import { Button } from '@heroui/react';
import { Camera, X } from 'lucide-react';

// Attachment type - defined locally until @kinho/shared-types exports it
interface Attachment {
  id: number;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: number;
  uploadedAt: string;
}

interface Props {
  value: Attachment[];
  onChange: (files: Attachment[]) => void;
  max?: number;
  accept?: string;
}

export default function PhotoUpload({ value, onChange, max = 9, accept = 'image/*' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newAttachments: Attachment[] = Array.from(files).map((file) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        url: URL.createObjectURL(file),
        type: 'image' as const,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      }));

      onChange([...value, ...newAttachments].slice(0, max));

      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [value, onChange, max],
  );

  const handleRemove = useCallback(
    (id: number) => {
      const removed = value.find((a) => a.id === id);
      if (removed?.url.startsWith('blob:')) {
        URL.revokeObjectURL(removed.url);
      }
      onChange(value.filter((a) => a.id !== id));
    },
    [value, onChange],
  );

  const canAdd = value.length < max;

  return (
    <div className="flex flex-wrap gap-3">
      {value.map((attachment) => (
        <div
          key={attachment.id}
          className="group relative h-24 w-24 overflow-hidden rounded-lg border border-[var(--border)]"
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => handleRemove(attachment.id)}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {canAdd && (
        <Button
          type="button"
          variant="secondary"
          className="h-24 w-24 flex-col gap-1 rounded-lg border border-dashed border-[var(--border)]"
          onPress={() => inputRef.current?.click()}
        >
          <Camera className="h-5 w-5 text-[var(--muted)]" />
          <span className="text-xs text-[var(--muted)]">
            {value.length}/{max}
          </span>
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleAdd}
      />
    </div>
  );
}
