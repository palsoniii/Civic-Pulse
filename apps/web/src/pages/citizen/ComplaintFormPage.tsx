import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateComplaint } from '@/hooks/useComplaints';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { ComplaintCategory, Priority } from '@/types';

const schema = z.object({
  category: z.enum(['POTHOLE', 'GARBAGE', 'WATER_LEAK', 'STREETLIGHT', 'OTHER']),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

type FormValues = z.infer<typeof schema>;

const categoryOptions = [
  { value: 'POTHOLE', label: 'Pothole' },
  { value: 'GARBAGE', label: 'Garbage' },
  { value: 'WATER_LEAK', label: 'Water Leak' },
  { value: 'STREETLIGHT', label: 'Streetlight' },
  { value: 'OTHER', label: 'Other' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export function ComplaintFormPage() {
  const navigate = useNavigate();
  const { mutateAsync: createComplaint, isPending } = useCreateComplaint();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const complaint = await createComplaint({
        category: values.category as ComplaintCategory,
        description: values.description,
        lat: values.lat,
        lng: values.lng,
        priority: values.priority as Priority | undefined,
      });
      toast.success('Complaint submitted successfully.');
      navigate(`/complaints/${complaint.id}`);
    } catch {
      setError('root', { message: 'Failed to submit complaint. Please try again.' });
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setValue('lat', parseFloat(pos.coords.latitude.toFixed(6)));
      setValue('lng', parseFloat(pos.coords.longitude.toFixed(6)));
    });
  };

  return (
    <div>
      <PageHeader
        title="Report an Issue"
        description="Describe the civic problem and we'll route it to the right department."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'New Complaint' },
        ]}
      />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} id="complaint-form" className="flex flex-col gap-6">
          {errors.root && (
            <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {errors.root.message}
            </div>
          )}

          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                label="Category"
                required
                options={categoryOptions}
                placeholder="Select a category"
                error={errors.category?.message}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Description <span className="text-danger-600">*</span>
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="Describe the issue in detail (min 20 characters)..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-danger-600">{errors.description.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Location *</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<MapPin size={14} />}
                onClick={useCurrentLocation}
              >
                Use my location
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="complaint-lat"
                label="Latitude"
                type="number"
                step="any"
                placeholder="e.g. 12.9716"
                required
                error={errors.lat?.message}
                {...register('lat')}
              />
              <Input
                id="complaint-lng"
                label="Longitude"
                type="number"
                step="any"
                placeholder="e.g. 77.5946"
                required
                error={errors.lng?.message}
                {...register('lng')}
              />
            </div>
          </div>

          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select
                label="Priority"
                options={priorityOptions}
                error={errors.priority?.message}
                value={field.value ?? 'MEDIUM'}
                onChange={field.onChange}
              />
            )}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button id="complaint-submit-btn" type="submit" loading={isPending}>
              Submit Complaint
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
