import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Mail, ArrowLeft, RefreshCw, Building2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

const otpVerificationSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
});

type OTPVerificationFormData = z.infer<typeof otpVerificationSchema>;

const OTPVerification = () => {
  const { verifyOTP, sendOTP, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  
  const email = location.state?.email || '';
  const organizationId = location.state?.organizationId || '';
  const from = location.state?.from || '/dashboard';
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OTPVerificationFormData>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: {
      otp: '',
    },
  });

  const otpValue = watch('otp');

  useEffect(() => {
    if (!email || !organizationId) {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, organizationId, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const onSubmit = async (data: OTPVerificationFormData) => {
    try {
      await verifyOTP(email, data.otp, organizationId);
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleResendOTP = async () => {
    try {
      await sendOTP(email, organizationId);
      setTimeLeft(300);
      setCanResend(false);
    } catch (err) {
      // Error is handled by the store
    }
  };
  
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
      <p className="text-gray-600 mb-6">
        We've sent a 6-digit code to <strong>{email}</strong>. Enter it below to sign in.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-primary-600 mr-2" />
            <span className="text-sm font-medium text-primary-800">
              Code expires in: {formatTime(timeLeft)}
            </span>
          </div>
          {canResend && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              disabled={isLoading}
            >
              Resend
            </Button>
          )}
        </div>
        <div className="mt-2 flex items-center text-sm text-primary-700">
          <Building2 className="h-4 w-4 mr-2" />
          <span>Organization ID: <strong>{organizationId}</strong></span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="Verification Code"
          type="text"
          maxLength={6}
          autoComplete="one-time-code"
          error={errors.otp?.message}
          helperText="Enter the 6-digit code from your email"
          className="text-center text-2xl tracking-widest"
          {...register('otp')}
        />
        
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          fullWidth
          disabled={otpValue.length !== 6}
          leftIcon={<LogIn className="h-4 w-4" />}
        >
          Verify & Sign In
        </Button>
      </form>
      
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-gray-600">
          Didn't receive the code?{' '}
          {canResend ? (
            <button
              onClick={handleResendOTP}
              className="font-medium text-primary-600 hover:text-primary-500"
              disabled={isLoading}
            >
              Resend OTP
            </button>
          ) : (
            <span className="text-gray-400">
              Wait {formatTime(timeLeft)} to resend
            </span>
          )}
        </p>
        <Link 
          to="/login" 
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default OTPVerification;