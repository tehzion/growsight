import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

const setPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

const SetPassword = () => {
  const { updatePassword, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // Check if this is first-time setup or password change
  const isFirstTime = location.state?.firstTime || false;
  const userEmail = location.state?.email || '';
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');
  
  const onSubmit = async (data: SetPasswordFormData) => {
    try {
      await updatePassword(data.currentPassword, data.newPassword);
      
      if (isFirstTime) {
        navigate('/dashboard', { 
          replace: true,
          state: { message: 'Welcome! Your password has been set successfully.' }
        });
      } else {
        navigate('/dashboard', { 
          replace: true,
          state: { message: 'Your password has been updated successfully.' }
        });
      }
    } catch (err) {
      // Error is handled by the store
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-error-500', 'bg-warning-500', 'bg-yellow-500', 'bg-primary-500', 'bg-success-500'];
  
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">
        {isFirstTime ? 'Set Your Password' : 'Change Password'}
      </h2>
      <p className="text-gray-600 mb-6">
        {isFirstTime 
          ? `Welcome! Please set a secure password for your account: ${userEmail}`
          : 'Update your password to keep your account secure'
        }
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <FormInput
            label={isFirstTime ? "Temporary Password" : "Current Password"}
            type={showPasswords.current ? "text" : "password"}
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            helperText={isFirstTime ? "Enter the temporary password provided to you" : undefined}
            {...register('currentPassword')}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
          >
            {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        <div className="relative">
          <FormInput
            label="New Password"
            type={showPasswords.new ? "text" : "password"}
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
          >
            {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {newPassword && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Password Strength:</span>
              <span className={`font-medium ${
                passwordStrength >= 4 ? 'text-success-600' :
                passwordStrength >= 3 ? 'text-primary-600' :
                passwordStrength >= 2 ? 'text-yellow-600' :
                'text-error-600'
              }`}>
                {strengthLabels[passwordStrength - 1] || 'Very Weak'}
              </span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-2 flex-1 rounded ${
                    level <= passwordStrength 
                      ? strengthColors[passwordStrength - 1] || 'bg-gray-200'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center space-x-2">
                <CheckCircle className={`h-3 w-3 ${newPassword.length >= 8 ? 'text-success-500' : 'text-gray-300'}`} />
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className={`h-3 w-3 ${/[A-Z]/.test(newPassword) ? 'text-success-500' : 'text-gray-300'}`} />
                <span>One uppercase letter</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className={`h-3 w-3 ${/[0-9]/.test(newPassword) ? 'text-success-500' : 'text-gray-300'}`} />
                <span>One number</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="relative">
          <FormInput
            label="Confirm New Password"
            type={showPasswords.confirm ? "text" : "password"}
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
          >
            {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          fullWidth
          leftIcon={<Save className="h-4 w-4" />}
        >
          {isFirstTime ? 'Set Password & Continue' : 'Update Password'}
        </Button>
      </form>
      
      {!isFirstTime && (
        <div className="mt-6 text-center">
          <Link to="/dashboard" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Cancel and return to dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default SetPassword;