import { useState } from 'react';
import { Filter } from 'lucide-react';
import { useComplaints } from '@/hooks/useComplaints';
import { PageHeader } from '@/components/layout/PageHeader';
import { ComplaintCard } from '@/components/complaints/ComplaintCard';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ComplaintStatus, ComplaintCategory } from '@/types';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: 'POTHOLE', label: 'Pothole' },
  { value: 'GARBAGE', label: 'Garbage' },
  { value: 'WATER_LEAK', label: 'Water Leak' },
  { value: 'STREETLIGHT', label: 'Streetlight' },
  { value: 'OTHER', label: 'Other' },
];

export function ComplaintListPage() {
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: complaints, isLoading } = useComplaints({
    status: status || undefined,
    category: category || undefined,
    page,
  });
  const filteredComplaints = (complaints ?? []).filter((complaint) =>
    !search || complaint.id.toLowerCase().includes(search.trim().toLowerCase())
  );
  const hasPrev = page > 1;
  const hasNext = (complaints?.length ?? 0) >= 20;

  return (
    <div>
      <PageHeader
        title="All Complaints"
        description="Browse and filter civic complaints in your community."
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <div className="w-44">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as ComplaintStatus | '')}
          />
        </div>
        <div className="w-48">
          <Select
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value as ComplaintCategory | '')}
          />
        </div>
        <div className="min-w-[240px] flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by complaint ID"
          />
        </div>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : !filteredComplaints.length ? (
        <EmptyState title="No complaints found" description="Try adjusting your filters." />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {filteredComplaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" disabled={!hasPrev} onClick={() => setPage((value) => value - 1)}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <Button type="button" variant="outline" disabled={!hasNext} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
