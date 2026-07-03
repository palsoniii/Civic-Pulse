import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DashboardSummary } from '@/types';

function unwrapData<T>(payload: T | { data: T } | undefined): T | undefined {
  if (!payload) return undefined;
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function AdminDashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { data } = await adminApi.getDashboardSummary();
      return unwrapData<DashboardSummary>(data);
    },
  });

  const { data: violations, isLoading: loadingViolations } = useQuery({
    queryKey: ['admin', 'sla-violations'],
    queryFn: async () => {
      const { data } = await adminApi.getSlaViolations();
      return unwrapData(data) ?? [];
    },
  });
  const { data: departments } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const { data } = await adminApi.getDepartments();
      return unwrapData(data) ?? [];
    },
  });
  const departmentNameById = new Map(
    (departments ?? []).map((department: { id: string; name: string }) => [department.id, department.name])
  );

  const statCards = [
    { label: 'Open', value: summary?.open, icon: <AlertTriangle size={18} />, color: 'blue' as const },
    { label: 'In Progress', value: summary?.in_progress, icon: <Clock size={18} />, color: 'amber' as const },
    { label: 'Resolved', value: summary?.resolved, icon: <CheckCircle size={18} />, color: 'green' as const },
    { label: 'SLA Violations', value: summary?.sla_violations ?? violations?.length, icon: <XCircle size={18} />, color: 'red' as const },
    ...(summary?.closed !== undefined
      ? [{ label: 'Closed', value: summary.closed, icon: <CheckCircle size={18} />, color: 'gray' as const }]
      : []),
    ...(summary?.rejected !== undefined
      ? [{ label: 'Rejected', value: summary.rejected, icon: <XCircle size={18} />, color: 'red' as const }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of all civic complaints and SLA performance."
        actions={
          <div className="flex items-center gap-3">
            <Link to="/admin/sla">
              <Button variant="outline">View SLA Violations</Button>
            </Link>
            <Link to="/admin/complaints">
              <Button>Manage Complaints</Button>
            </Link>
          </div>
        }
      />

      {loadingSummary ? (
        <FullPageSpinner />
      ) : summary ? (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {statCards.map((card) => (
            <SummaryCard key={card.label} label={card.label} value={card.value} icon={card.icon} color={card.color} />
          ))}
        </div>
      ) : null}

      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <CardTitle>SLA Violations</CardTitle>
          <Link to="/admin/sla">
            <Button size="sm" variant="outline">Open full list</Button>
          </Link>
        </div>
        {loadingViolations ? (
          <FullPageSpinner />
        ) : !violations?.length ? (
          <EmptyState
            title="No SLA violations"
            description="All complaints are within SLA thresholds."
            icon={<CheckCircle size={32} />}
          />
        ) : (
          <div className="space-y-3">
            {violations.slice(0, 3).map((violation) => (
              <div key={violation.complaintId} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/40 px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-gray-600">#{violation.complaintId.slice(0, 8).toUpperCase()}</p>
                  {violation.departmentId && departmentNameById.get(violation.departmentId) ? (
                    <p className="text-sm text-gray-600">{departmentNameById.get(violation.departmentId)}</p>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      Unassigned
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">SLA {violation.resolutionHours}h</p>
                  <p className="font-semibold text-danger-600">{violation.hoursOverdue} hrs overdue</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value?: number;
  icon: React.ReactNode;
  color: 'blue' | 'amber' | 'green' | 'red' | 'gray';
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  gray: 'bg-gray-50 text-gray-600',
};

function SummaryCard({ label, value, icon, color }: SummaryCardProps) {
  return (
    <Card padding="sm">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colorMap[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </Card>
  );
}
