import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
        <MapPin size={36} />
      </div>
      <h1 className="text-5xl font-extrabold text-gray-900">404</h1>
      <p className="mt-3 text-lg font-medium text-gray-700">Page not found</p>
      <p className="mt-2 text-sm text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-8">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
