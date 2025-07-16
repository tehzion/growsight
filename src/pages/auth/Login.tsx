import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Mail, KeyRound, AlertTriangle, CheckCircle, Building2, Globe } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { usePDFExportStore } from '../../stores/pdfExportStore';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

const loginSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const otpSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  email: z.string().email('Please enter a valid email'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

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

const Login = () => {
  const { login, sendOTP, isLoading, error, clearError } = useAuthStore();
  const { fetchProfile } = useProfileStore();
  const { organizations, fetchOrganizations, currentOrganization } = useOrganizationStore();
  const { pdfSettings } = usePDFExportStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  
  // Safely extract location state with type checking
  const locationState = isValidLocationState(location.state) ? location.state : {};
  const from = locationState.from?.pathname || '/dashboard';
  const message = locationState.message;
  
  const demoCredentials = {
    organizationId: 'demo-org-1',
    email: 'admin@acme.com',
    password: 'password123',
  };
  const formRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    // Clear any previous errors when component mounts or login mode changes
    clearError();
    
    // Fetch organizations for the dropdown
    fetchOrganizations();
  }, [loginMode, clearError, fetchOrganizations]);
  
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      organizationId: '',
      email: '',
      password: '',
    },
  });

  const {
    register: registerOTP,
    handleSubmit: handleOTPSubmit,
    formState: { errors: otpErrors },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      organizationId: '',
      email: '',
    },
  });
  
  const onPasswordLogin = async (data: LoginFormData) => {
    clearError();
    try {
      await login({
        ...data,
        organizationId: data.organizationId
      });
      setLoginAttempts(0); // Reset attempts on success
      
      // Fetch user profile after successful login
      // Redirect to dashboard or intended destination
      navigate(from, { replace: true });
    } catch (err) {
      setLoginAttempts(prev => prev + 1);
      if ((err as Error).message === 'PASSWORD_RESET_REQUIRED') {
        navigate('/reset-password', { state: { email: data.email, organizationId: data.organizationId } });
      } else {
        // Error is handled by the store
      }
    }
  };

  const onOTPRequest = async (data: OTPFormData) => {
    clearError();
    try {
      await sendOTP(data.email, data.organizationId);
      setOtpSent(true);
    } catch (err) {
      // Error is handled by the store
    }
  };
  
  return (
    <div>
      {/* Organization Branding Header */}
      {currentOrganization && (
        <div className="text-center mb-6">
          {pdfSettings.logoUrl && (
            <div className="mb-4">
              <img 
                src={pdfSettings.logoUrl} 
                alt={`${currentOrganization.name} Logo`}
                className="h-12 mx-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {currentOrganization.name}
          </h1>
          <p className="text-gray-600 text-sm">360° Feedback Platform</p>
        </div>
      )}
      
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
      <p className="text-gray-600 mb-6">Sign in to your platform</p>
      
      {/* Success message from redirect */}
      {message && (
        <div className="mb-6 p-4 bg-success-50 border border-success-200 text-success-700 rounded-md text-sm">
          <CheckCircle className="h-4 w-4 inline mr-2" />
          {message}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-md text-sm whitespace-pre-line">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Login Method Toggle */}
      <div className="mb-6 flex bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => {
            setLoginMode('password');
            setOtpSent(false);
            clearError();
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <KeyRound className="h-4 w-4 inline mr-2" />
          Password Login
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('otp');
            setOtpSent(false);
            clearError();
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'otp'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Mail className="h-4 w-4 inline mr-2" />
          OTP Login
        </button>
      </div>

      {/* Password Login Form */}
      {loginMode === 'password' && (
        <form ref={formRef} onSubmit={handleLoginSubmit(onPasswordLogin)} className="space-y-4">
          <FormInput
            label="Organization ID"
            autoComplete="organization"
            error={loginErrors.organizationId?.message}
            {...registerLogin('organizationId')}
          />
          
          <FormInput
            label="Email"
            type="email"
            autoComplete="email"
            error={loginErrors.email?.message}
            {...registerLogin('email')}
          />
          
          <FormInput
            label="Password"
            type="password"
            autoComplete="current-password"
            error={loginErrors.password?.message}
            {...registerLogin('password')}
          />
          
          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              Forgot your password?
            </Link>
          </div>
          
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            fullWidth
            leftIcon={<LogIn className="h-4 w-4" />}
          >
            Sign in
          </Button>
          {/* Demo Login Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            className="mt-2"
            onClick={() => {
              // Set demo credentials in the form fields
              (document.querySelector('input[name="organizationId"]') as HTMLInputElement).value = demoCredentials.organizationId;
              (document.querySelector('input[name="email"]') as HTMLInputElement).value = demoCredentials.email;
              (document.querySelector('input[name="password"]') as HTMLInputElement).value = demoCredentials.password;
              // Optionally, trigger form submit
              formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }}
          >
            Demo Login
          </Button>
        </form>
      )}

      {/* OTP Login Form */}
      {loginMode === 'otp' && !otpSent && (
        <form onSubmit={handleOTPSubmit(onOTPRequest)} className="space-y-4">
          <FormInput
            label="Organization ID"
            autoComplete="organization"
            error={otpErrors.organizationId?.message}
            {...registerOTP('organizationId')}
          />
          
          <FormInput
            label="Email"
            type="email"
            autoComplete="email"
            error={otpErrors.email?.message}
            helperText="We'll send you a one-time password to sign in"
            {...registerOTP('email')}
          />
          
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            fullWidth
            leftIcon={<Mail className="h-4 w-4" />}
          >
            Send OTP
          </Button>
        </form>
      )}

      {/* OTP Verification */}
      {loginMode === 'otp' && otpSent && (
        <div className="text-center">
          <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg">
            <Mail className="h-8 w-8 mx-auto text-success-600 mb-2" />
            <h3 className="font-medium text-success-800">OTP Sent!</h3>
            <p className="text-sm text-success-700 mt-1">
              Check your email for a one-time password and click the link to sign in.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setOtpSent(false)}
          >
            Send Another OTP
          </Button>
        </div>
      )}
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Need access?{' '}
          <Link to="/request-access" className="font-medium text-primary-600 hover:text-primary-500">
            Request Account Access
          </Link>
        </p>
      </div>


    </div>
  );
};

export default Login;