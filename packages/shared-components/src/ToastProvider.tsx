import { Toast } from '@heroui/react';
import type { ReactNode } from 'react';

export { toast } from '@heroui/react';

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * 全局 Toast 通知系统
 * 基于 HeroUI Toast，在应用根部渲染 Provider 后，
 * 任何地方都可以直接调用 `toast.success()` / `toast.danger()` 等方法
 */
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      <Toast.Provider
        placement="bottom end"
        maxVisibleToasts={5}
        gap={12}
      />
      {children}
    </>
  );
}
