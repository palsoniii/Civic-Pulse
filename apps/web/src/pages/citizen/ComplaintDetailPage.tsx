import { useParams } from 'react-router-dom';
import { MapPin, Calendar, Tag, Flag } from 'lucide-react';
import { useComplaint, useComplaintHistory } from '@/hooks/useComplaints';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { ComplaintStatusBadge } from '@/components/complaints/ComplaintStatusBadge';
import { StatusTimeline } from '@/components/complaints/StatusTimeline';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatDate';
import { formatCategory, formatPriority } from '@/utils/formatStatus';

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: complaint, isLoading } = useComplaint(id!);
  const { data: history } = useComplaintHistory(id!);

  if (isLoading) return <FullPageSpinner />;
  if (!complaint) return <p className="text-gray-500">Complaint not found.</p>;

  const { label: priorityLabel, badgeClass: priorityClass } = formatPriority(complaint.priority);
  const timeline = [
    {
      id: `${complaint.id}-open`,
      complaintId: complaint.id,
      fromStatus: 'OPEN' as const,
      toStatus: 'OPEN' as const,
      changedBy: complaint.reporterId,
      createdAt: complaint.createdAt,
    },
    ...((history ?? []).filter((entry) => !(entry.fromStatus === 'OPEN' && entry.toStatus === 'OPEN'))),
  ];

  return (
    <div>
      <PageHeader
        title={`Complaint #${complaint.id.slice(0, 8).toUpperCase()}`}
        breadcrumbs={[
          { label: 'Complaints', to: '/complaints' },
          { label: 'Details' },
        ]}
        actions={<ComplaintStatusBadge status={complaint.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardTitle className="mb-3">Description</CardTitle>
            <p className="text-sm leading-relaxed text-gray-700">{complaint.description}</p>
          </Card>

          <Card>
            <CardTitle className="mb-3">Details</CardTitle>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  <Tag size={12} /> Category
                </dt>
                <dd className="mt-1 font-medium text-gray-800">{formatCategory(complaint.category)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  <Flag size={12} /> Priority
                </dt>
                <dd className="mt-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityClass}`}>
                    {priorityLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  <MapPin size={12} /> Location
                </dt>
                <dd className="mt-1 font-medium text-gray-800">
                  {complaint.lat.toFixed(5)}, {complaint.lng.toFixed(5)}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  <Calendar size={12} /> Submitted
                </dt>
                <dd className="mt-1 text-gray-800">{formatDate(complaint.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          {complaint.mediaRefs?.length ? (
            <Card>
              <CardTitle className="mb-3">Media</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {complaint.mediaRefs.map((media) => (
                  <a
                    key={media.id}
                    href={media.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={media.thumbnailUrl ?? media.mediaUrl}
                      alt="Complaint attachment"
                      className="h-40 w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        {/* Sidebar: timeline */}
        <Card>
          <CardTitle className="mb-4">Status History</CardTitle>
          <StatusTimeline history={timeline} />
        </Card>
      </div>
    </div>
  );
}
