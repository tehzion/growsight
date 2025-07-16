import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const { setNewPassword, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { email, organizationId } = (location.state || {}) as { email?: string; organizationId?: string };
  
  // In a real app, get token from URL query parameters
  const query = new URLSearchParams(location.search);
  const token = query.get('token') || '';
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });
  
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      // If coming from a password reset required flow, use email and orgId
      if (email && organizationId) {
        // This would typically involve a backend endpoint to reset password by email/orgId
        // For now, we'll simulate success and then update the user's requiresPasswordChange flag
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Manually update the user's requiresPasswordChange flag in the store
        // In a real app, this would be handled by the backend after successful password reset
        const { user } = useAuthStore.getState();
        if (user && user.email === email && user.organizationId === organizationId) {
          await supabase.from('users').update({ requires_password_change: false }).eq('id', user.id);
          useAuthStore.getState().setNewPassword(token, data.password); // This will also update the store
        }
      } else {
        await setNewPassword(token, data.password);
      }
      navigate('/login', { 
        replace: true,
        state: { message: 'Your password has been reset successfully. Please sign in with your new password.' }
      });
    } catch (err) {
      // Error is handled by the store
    }
  };
  
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Set new password</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="New Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          helperText="Must be at least 8 characters"
          {...register('password')}
        />
        
        <FormInput
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          fullWidth
          leftIcon={<Save className="h-4 w-4" />}
        >
          Set new password
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;