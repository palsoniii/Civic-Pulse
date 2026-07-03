import type { ComplaintHistory } from '@/types';
import { formatDate } from '@/utils/formatDate';
import { formatStatus } from '@/utils/formatStatus';
import { ArrowRight } from 'lucide-react';

interface StatusTimelineProps {
  history: ComplaintHistory[];
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (!history.length) {
    return <p className="text-sm text-gray-400">No status changes yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200">
      {history.map((entry, i) => {
        const from = formatStatus(entry.fromStatus);
        const to = formatStatus(entry.toStatus);

        return (
          <li key={entry.id ?? i} className="mb-6 ml-4">
            <div className="absolute -left-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary-600" />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${from.badgeClass}`}>
                {from.label}
              </span>
              <ArrowRight size={14} className="text-gray-400" />
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${to.badgeClass}`}>
                {to.label}
              </span>
            </div>
            {entry.reason && (
              <p className="mt-1 text-xs text-gray-500 italic">"{entry.reason}"</p>
            )}
            <p className="mt-1 text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
          </li>
        );
      })}
    </ol>
  );
}
