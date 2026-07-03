import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { complaintsApi } from '@/api/complaints.api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ComplaintStatusBadge } from '@/components/complaints/ComplaintStatusBadge';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatCategory } from '@/utils/formatStatus';

const schema = z.object({
  departmentId: z.string().min(1, 'Please select a department'),
});

type FormValues = z.infer<typeof schema>;

export function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: complaint, isLoading: loadingComplaint } = useQuery({
    queryKey: ['complaints', 'detail', id],
    queryFn: async () => {
      const { data } = await complaintsApi.getById(id!);
      return data;
    },
    enabled: !!id,
  });

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const { data } = await adminApi.getDepartments();
      return data;
    },
  });

  const { mutateAsync: assign, isPending } = useMutation({
    mutationFn: async (departmentId: string) => {
      const { data } = await adminApi.assignComplaint(id!, departmentId);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      navigate('/admin/complaints');
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await assign(values.departmentId);
    } catch {
      setError('root', { message: 'Failed to assign complaint.' });
    }
  };

  if (loadingComplaint || loadingDepts) return <FullPageSpinner />;

  const deptOptions = (departments ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div>
      <PageHeader
        title="Assign Complaint"
        description="Route this complaint to the appropriate department."
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Complaints', to: '/admin/complaints' },
          { label: 'Assign' },
        ]}
      />

      <div className="max-w-lg">
        {complaint && (
          <Card className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-gray-400">
                  #{complaint.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {formatCategory(complaint.category)}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{complaint.description}</p>
              </div>
              <ComplaintStatusBadge status={complaint.status} />
            </div>
          </Card>
        )}

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} id="assign-form" className="flex flex-col gap-5">
            {(errors as { root?: { message?: string } }).root && (
              <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {(errors as { root?: { message?: string } }).root?.message}
              </div>
            )}
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Department"
                  required
                  options={deptOptions}
                  placeholder="Select a department"
                  error={errors.departmentId?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button id="assign-submit-btn" type="submit" loading={isPending}>
                Assign
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
