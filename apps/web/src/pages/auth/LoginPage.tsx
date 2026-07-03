import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/utils/errorMessage';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await login(values);
      toast.success('Welcome back!');
      navigate(result.user.role === 'ADMIN' || result.user.role === 'SUPERADMIN' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError('root', { message: getErrorMessage(err) });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <span className="text-2xl font-bold text-white">CP</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-primary-200">Sign in to CivicPulse</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" id="login-form">
            {errors.root && (
              <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
                {errors.root.message}
              </div>
            )}
            <Input
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="login-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button id="login-submit-btn" type="submit" loading={isSubmitting} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
