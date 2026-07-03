import type { ComplaintStatus } from '@/types';
import { formatStatus } from '@/utils/formatStatus';
import { cn } from '@/utils/cn';

interface ComplaintStatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
}

export function ComplaintStatusBadge({ status, className }: ComplaintStatusBadgeProps) {
  const { label, badgeClass } = formatStatus(status);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        badgeClass,
        className
      )}
    >
      {label}
    </span>
  );
}
