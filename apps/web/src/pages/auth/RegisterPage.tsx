import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await registerUser(values);
      toast.success('Account created. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Registration failed. Please try again.';
      setError('root', { message: msg });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <span className="text-2xl font-bold text-white">CP</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="mt-2 text-primary-200">Join CivicPulse today</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            id="register-form"
          >
            {errors.root && (
              <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {errors.root.message}
              </div>
            )}
            <Input
              id="register-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              required
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="register-password"
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              required
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              id="register-phone"
              label="Phone (optional)"
              type="tel"
              placeholder="+91 98765 43210"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Button
              id="register-submit-btn"
              type="submit"
              loading={isSubmitting}
              className="w-full"
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
