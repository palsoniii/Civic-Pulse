import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Filter, RefreshCcw, UserCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { useComplaints, useUpdateComplaintStatus } from '@/hooks/useComplaints';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ComplaintStatusBadge } from '@/components/complaints/ComplaintStatusBadge';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/formatDate';
import { formatCategory } from '@/utils/formatStatus';
import { getErrorMessage } from '@/utils/errorMessage';
import type { AssignmentRecord, ComplaintStatus, Department } from '@/types';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function AdminComplaintListPage() {
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [assignDepartmentId, setAssignDepartmentId] = useState('');
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const qc = useQueryClient();
  const { data: complaints, isLoading } = useComplaints({
    status: status || undefined,
  });
  const { data: departments } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const { data } = await adminApi.getDepartments();
      return data;
    },
  });
  const { data: assignments } = useQuery({
    queryKey: ['admin', 'assignments'],
    queryFn: async () => {
      const { data } = await adminApi.getAssignments();
      return data;
    },
  });
  const assignMutation = useMutation({
    mutationFn: async ({
      complaintId,
      departmentId,
    }: {
      complaintId: string;
      departmentId: string;
    }) => {
      const { data } = await adminApi.assignComplaint(complaintId, departmentId);
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'assignments'] });
      await qc.invalidateQueries({ queryKey: ['complaints'] });
      await qc.refetchQueries({ queryKey: ['admin', 'assignments'], type: 'active' });
      await qc.refetchQueries({ queryKey: ['complaints'], type: 'active' });
      toast.success('Complaint assigned.');
      closeAssignModal();
    },
  });
  const updateStatusMutation = useUpdateComplaintStatus();
  const selectedComplaint = complaints?.find((complaint) => complaint.id === selectedComplaintId) ?? null;
  const departmentOptions = (departments ?? []).map((department) => ({
    value: department.id,
    label: department.name,
  }));
  const assignmentMap = useMemo(() => {
    const departmentById = new Map((departments ?? []).map((department: Department) => [department.id, department.name]));

    return (assignments ?? []).reduce<Record<string, string>>((map, assignment: AssignmentRecord) => {
      if (map[assignment.complaintId]) {
        return map;
      }

      map[assignment.complaintId] =
        assignment.department?.name ??
        departmentById.get(assignment.departmentId) ??
        'Unassigned';
      return map;
    }, {});
  }, [assignments, departments]);
  const modalStatusOptions = useMemo(
    () => [
      { value: 'OPEN', label: 'Open' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'RESOLVED', label: 'Resolved' },
      { value: 'CLOSED', label: 'Closed' },
      { value: 'REJECTED', label: 'Rejected' },
    ],
    []
  );

  function openAssignModal(complaintId: string) {
    setSelectedComplaintId(complaintId);
    setAssignDepartmentId('');
    setStatusModalOpen(false);
    setAssignModalOpen(true);
  }

  function closeAssignModal() {
    setAssignModalOpen(false);
    setSelectedComplaintId(null);
    setAssignDepartmentId('');
  }

  function openStatusModal(complaintId: string) {
    setSelectedComplaintId(complaintId);
    setNextStatus('');
    setStatusReason('');
    setAssignModalOpen(false);
    setStatusModalOpen(true);
  }

  function closeStatusModal() {
    setStatusModalOpen(false);
    setSelectedComplaintId(null);
    setNextStatus('');
    setStatusReason('');
  }

  async function handleAssignSubmit() {
    if (!selectedComplaintId || !assignDepartmentId) return;
    try {
      await assignMutation.mutateAsync({ complaintId: selectedComplaintId, departmentId: assignDepartmentId });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleStatusSubmit() {
    if (!selectedComplaintId || !nextStatus) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: selectedComplaintId,
        status: nextStatus,
        reason: statusReason || undefined,
      });
      toast.success('Status updated.');
      closeStatusModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Manage Complaints"
        description="View and assign all complaints in the system."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Complaints' }]}
      />

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <div className="w-44">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as ComplaintStatus | '')}
          />
        </div>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="p-6">
            <FullPageSpinner />
          </div>
        ) : !complaints?.length ? (
          <div className="p-6">
            <EmptyState title="No complaints found" description="Try adjusting your filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {complaints.map((c) => {
                  const assignedDepartmentName = assignmentMap[c.id];

                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        #{c.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">{formatCategory(c.category)}</td>
                      <td className="px-4 py-3">
                        <ComplaintStatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        {assignedDepartmentName && assignedDepartmentName !== 'Unassigned' ? (
                          <span className="text-gray-700">{assignedDepartmentName}</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/complaints/${c.id}`}>
                            <Button size="sm" variant="ghost">
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<UserCheck size={13} />}
                            onClick={() => openAssignModal(c.id)}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<RefreshCcw size={13} />}
                            onClick={() => openStatusModal(c.id)}
                          >
                            Change Status
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={assignModalOpen && !!selectedComplaint} onClose={closeAssignModal} title="Assign to Department">
        <div className="flex flex-col gap-4">
          <Select
            label="Department"
            options={departmentOptions}
            placeholder="Select department"
            value={assignDepartmentId}
            onChange={(event) => setAssignDepartmentId(event.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeAssignModal}>
              Cancel
            </Button>
            <Button type="button" loading={assignMutation.isPending} disabled={!assignDepartmentId} onClick={handleAssignSubmit}>
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={statusModalOpen && !!selectedComplaint} onClose={closeStatusModal} title="Change Complaint Status">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Current Status</span>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              {selectedComplaint ? (
                <ComplaintStatusBadge status={selectedComplaint.status} />
              ) : (
                <span className="text-sm text-gray-500">Unavailable</span>
              )}
            </div>
          </div>
          <Select
            label="New Status"
            options={modalStatusOptions}
            placeholder="Select status"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as ComplaintStatus)}
          />
          <Input
            label="Reason"
            placeholder="Optional reason"
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeStatusModal}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={updateStatusMutation.isPending}
              disabled={!nextStatus}
              onClick={handleStatusSubmit}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
