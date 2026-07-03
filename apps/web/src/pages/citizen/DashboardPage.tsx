import { Link } from 'react-router-dom';
import { PlusCircle, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useMyComplaints } from '@/hooks/useComplaints';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ComplaintCard } from '@/components/complaints/ComplaintCard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: complaints, isLoading } = useMyComplaints();

  const stats = {
    total: complaints?.length ?? 0,
    open: complaints?.filter((c) => c.status === 'OPEN').length ?? 0,
    inProgress: complaints?.filter((c) => c.status === 'IN_PROGRESS').length ?? 0,
    resolved: complaints?.filter((c) => c.status === 'RESOLVED').length ?? 0,
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.email ? ', ' + user.email.split('@')[0] : ''}!`}
        description="Here's an overview of your civic reports."
        actions={
          <Link to="/complaints/new">
            <Button leftIcon={<PlusCircle size={16} />}>New Complaint</Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={<MessageSquare size={20} />} color="blue" />
        <StatCard label="Open" value={stats.open} icon={<AlertCircle size={20} />} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Clock size={20} />} color="amber" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle size={20} />} color="green" />
      </div>

      {/* Recent complaints */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My Recent Complaints</h2>
          <Link to="/complaints" className="text-sm text-primary-600 hover:underline">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <FullPageSpinner />
        ) : !complaints?.length ? (
          <EmptyState
            title="No complaints yet"
            description="Submit your first civic complaint to get started."
            action={
              <Link to="/complaints/new">
                <Button size="sm" leftIcon={<PlusCircle size={14} />}>
                  Report an issue
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {complaints.slice(0, 5).map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'amber' | 'green' | 'red';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
};

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}
