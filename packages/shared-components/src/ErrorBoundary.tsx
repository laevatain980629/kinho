import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-lg font-bold mb-2">页面出错了</h1>
            <p className="text-sm text-[var(--muted)] mb-4">请刷新页面重试</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-[var(--accent-foreground)]"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
