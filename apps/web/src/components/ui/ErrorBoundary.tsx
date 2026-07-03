import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-red-50 p-4 text-danger-600">
            <AlertTriangle size={32} />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Something went wrong</p>
            <p className="mt-1 text-sm text-gray-500">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
