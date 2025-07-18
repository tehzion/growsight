import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

const rootLoginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type RootLoginFormData = z.infer<typeof rootLoginSchema>;

// Type-safe interface for location state
interface LocationState {
  from?: {
    pathname: string;
  };
  message?: string;
}

// Type guard to safely check location state
const isValidLocationState = (state: unknown): state is LocationState => {
  if (!state || typeof state !== 'object') return false;
  const typedState = state as Record<string, unknown>;
  
  return (
    (!typedState.from || 
     (typeof typedState.from === 'object' && 
      typedState.from !== null && 
      typeof (typedState.from as Record<string, unknown>).pathname === 'string')) &&
    (!typedState.message || typeof typedState.message === 'string')
  );
};

const RootLogin = () => {
  const { loginAsAdmin, isLoading, error, clearError } = useAuthStore();
  const { fetchProfile } = useProfileStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Safely extract location state with type checking
  const locationState = isValidLocationState(location.state) ? location.state : {};
  const from = locationState.from?.pathname || '/root/dashboard';
  const message = locationState.message;

  useEffect(() => {
    // Clear any previous errors when component mounts
    clearError();
  }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RootLoginFormData>({
    resolver: zodResolver(rootLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RootLoginFormData) => {
    clearError();
    try {
      await loginAsAdmin({
        email: data.email,
        password: data.password,
      });
      setLoginAttempts(0); // Reset attempts on success
      
      // Fetch user profile after successful login
      // Navigate to intended destination or root dashboard
      navigate(from, { replace: true });
    } catch (err) {
      setLoginAttempts(prev => prev + 1);
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            System Administrator
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Root access login for system administrators
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Success message from redirect */}
          {message && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 text-success-700 rounded-md text-sm">
              <CheckCircle className="h-4 w-4 inline mr-2" />
              {message}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-md text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Login attempts warning */}
          {loginAttempts >= 3 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Multiple failed attempts detected. Please verify your credentials.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormInput
              label="Administrator Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              placeholder="admin@system.com"
              {...register('email')}
            />

            <FormInput
              label="Administrator Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              placeholder="••••••••"
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              fullWidth
              leftIcon={<LogIn className="h-4 w-4" />}
            >
              {isLoading ? 'Authenticating...' : 'Access System'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Security Notice</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>This is a restricted access portal for system administrators only.</p>
              <p>All access attempts are logged and monitored.</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-300">
            Need root access?{' '}
            <button
              onClick={() => navigate('/root/register')}
              className="font-medium text-green-400 hover:text-green-300"
            >
              Request administrator access
            </button>
          </p>
          <p className="text-sm text-gray-300">
            Regular user login?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Go to main login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RootLogin;