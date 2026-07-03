import { Link } from 'react-router-dom';
import { MapPin, Calendar, Tag } from 'lucide-react';
import type { Complaint } from '@/types';
import { formatRelativeDate } from '@/utils/formatDate';
import { formatCategory } from '@/utils/formatStatus';
import { Card } from '@/components/ui/Card';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';

interface ComplaintCardProps {
  complaint: Complaint;
}

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  return (
    <Card padding="sm" className="hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ComplaintStatusBadge status={complaint.status} />
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Tag size={12} />
              {formatCategory(complaint.category)}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-gray-700">{complaint.description}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {complaint.lat.toFixed(4)}, {complaint.lng.toFixed(4)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatRelativeDate(complaint.createdAt)}
            </span>
          </div>
        </div>
        <Link
          to={`/complaints/${complaint.id}`}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50"
        >
          View →
        </Link>
      </div>
    </Card>
  );
}
