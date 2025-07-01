import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const { resetPassword, isLoading, error } = useAuthStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await resetPassword(data.email);
      setIsSubmitted(true);
    } catch (err) {
      // Error is handled by the store
    }
  };
  
  if (isSubmitted) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Check your email</h2>
        <p className="mb-6 text-gray-600">
          We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
        </p>
        <Link to="/login" className="inline-flex items-center font-medium text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign in
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset password</h2>
      <p className="text-gray-600 mb-6">Enter your email and we'll send you a link to reset your password.</p>
      
      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          fullWidth
          leftIcon={<KeyRound className="h-4 w-4" />}
        >
          Reset password
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <Link to="/login" className="inline-flex items-center font-medium text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;