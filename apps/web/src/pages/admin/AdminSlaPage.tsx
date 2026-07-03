import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { complaintsApi } from '@/api/complaints.api';
import { ComplaintStatusBadge } from '@/components/complaints/ComplaintStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatCategory, formatPriority } from '@/utils/formatStatus';
import type { Complaint, SlaViolation } from '@/types';

function unwrapData<T>(payload: T | { data: T } | undefined): T | undefined {
  if (!payload) return undefined;
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function getHoursOverdue(violation: SlaViolation): number | null {
  if (typeof violation.time_overdue_hours === 'number') return violation.time_overdue_hours;
  if (typeof violation.hoursOverdue === 'number') return violation.hoursOverdue;
  return null;
}

function formatCreatedDate(createdAt?: string): string {
  if (!createdAt) return '—';
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function truncate(text: string, max = 60): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function AdminSlaPage() {
  const { data: rawDepartments } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const { data } = await adminApi.getDepartments();
      return unwrapData(data) ?? [];
    },
  });
  const { data: rawViolations, isLoading } = useQuery({
    queryKey: ['admin', 'sla-violations'],
    queryFn: async () => {
      const { data } = await adminApi.getSlaViolations();
      return unwrapData<SlaViolation[]>(data) ?? [];
    },
  });

  const violations = rawViolations ?? [];
  const departmentNameById = useMemo(
    () =>
      new Map((rawDepartments ?? []).map((department: { id: string; name: string }) => [department.id, department.name])),
    [rawDepartments]
  );

  const complaintQueries = useQueries({
    queries: violations.map((violation) => ({
      queryKey: ['admin', 'sla-complaint', violation.complaintId],
      queryFn: async () => {
        const { data } = await complaintsApi.getById(violation.complaintId);
        return data;
      },
      enabled: Boolean(violation.complaintId),
      staleTime: 30_000,
    })),
  });

  const complaintMap = useMemo(() => {
    const map = new Map<string, Complaint>();
    complaintQueries.forEach((query, index) => {
      const complaintId = violations[index]?.complaintId;
      if (complaintId && query.data) {
        map.set(complaintId, query.data);
      }
    });
    return map;
  }, [complaintQueries, violations]);

  const isLoadingComplaints = complaintQueries.some((query) => query.isLoading);

  return (
    <div>
      <PageHeader
        title="SLA Violations"
        description="Complaints currently overdue against their configured response targets."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'SLA Violations' }]}
        actions={
          <Link to="/admin">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        }
      />

      {isLoading || isLoadingComplaints ? (
        <FullPageSpinner />
      ) : !violations.length ? (
        <EmptyState
          title="No SLA violations"
          description="All complaints are within SLA thresholds."
        />
      ) : (
        <div className="grid gap-4">
          {violations.map((violation) => {
            const complaint = complaintMap.get(violation.complaintId) ?? violation.complaint;
            const overdueHours = getHoursOverdue(violation);
            const isSevere = overdueHours !== null && violation.resolutionHours > 0 && overdueHours >= violation.resolutionHours * 2;
            const priority = complaint?.priority ? formatPriority(complaint.priority) : null;
            const departmentName = violation.departmentId
              ? departmentNameById.get(violation.departmentId)
              : undefined;

            return (
              <Card key={violation.complaintId}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {complaint?.category ? formatCategory(complaint.category) : 'Unknown category'}
                      </span>
                      {priority ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${priority.badgeClass}`}>
                          {priority.label}
                        </span>
                      ) : null}
                      {complaint?.status ? <ComplaintStatusBadge status={complaint.status} /> : null}
                    </div>
                    <div>
                      <p className="mb-1 font-mono text-xs text-gray-500">#{violation.complaintId.slice(0, 8).toUpperCase()}</p>
                      <p className="text-base font-semibold text-gray-900">
                        {complaint?.description ? truncate(complaint.description, 60) : 'Complaint details unavailable'}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <p>Created: {formatCreatedDate(complaint?.createdAt)}</p>
                      <p>Department: {departmentName ?? 'Unassigned'}</p>
                      <p>SLA Limit: {violation.resolutionHours} hrs</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${isSevere ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    <AlertTriangle size={16} />
                    {overdueHours !== null ? `${overdueHours} hrs overdue` : 'Overdue duration unavailable'}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
