import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 24, className }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin text-primary-600', className)}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
      <Spinner size={36} />
    </div>
  );
}
