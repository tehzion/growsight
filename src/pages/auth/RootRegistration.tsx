import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Shield, AlertTriangle, CheckCircle, Building, Phone, Mail, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import SecureLogger from '../../lib/secureLogger';

const rootRegistrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  position: z.string().min(2, 'Position must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  justification: z.string().min(50, 'Justification must be at least 50 characters').max(1000, 'Justification must not exceed 1000 characters'),
});

type RootRegistrationFormData = z.infer<typeof rootRegistrationSchema>;

const RootRegistration = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RootRegistrationFormData>({
    resolver: zodResolver(rootRegistrationSchema),
  });

  const justificationValue = watch('justification', '');

  const onSubmit = async (data: RootRegistrationFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!supabase) {
        throw new Error('Database connection not available. Please try again later.');
      }

      // Check if email already has a pending request
      const { data: existingRequest, error: checkError } = await supabase
        .from('root_access_requests')
        .select('id, status')
        .eq('email', data.email.toLowerCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error('Failed to check existing requests. Please try again.');
      }

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          throw new Error('You already have a pending root access request. Please wait for approval.');
        } else if (existingRequest.status === 'approved') {
          throw new Error('You already have an approved root access request. Please contact support.');
        } else if (existingRequest.status === 'rejected') {
          throw new Error('Your previous root access request was rejected. Please contact support.');
        }
      }

      // Create the root access request
      const { error: insertError } = await supabase
        .from('root_access_requests')
        .insert([
          {
            email: data.email.toLowerCase(),
            first_name: data.firstName,
            last_name: data.lastName,
            company_name: data.companyName,
            position: data.position,
            phone: data.phone,
            justification: data.justification,
            status: 'pending',
          },
        ]);

      if (insertError) {
        throw new Error('Failed to submit root access request. Please try again.');
      }

      // Log the request
      SecureLogger.info('Root access request submitted', {
        type: 'root_access_request',
        email: data.email,
        company: data.companyName,
        position: data.position,
      });

      setSuccess(true);
    } catch (err) {
      console.error('Root registration error:', err);
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="bg-white shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Request Submitted Successfully
              </h2>
              <p className="text-gray-600 mb-6">
                Your root access request has been submitted and is pending approval. 
                You will receive an email notification once your request has been reviewed.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/root')}
                  variant="primary"
                  fullWidth
                >
                  Back to Root Login
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  fullWidth
                >
                  Regular Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Request Root Access
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Submit a request for system administrator privileges
          </p>
        </div>

        <Card className="bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-primary-600" />
              Administrator Access Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Security Notice */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
                <div>
                  <h3 className="font-medium text-amber-800">Security Notice</h3>
                  <p className="text-sm text-amber-700">
                    Root access requests require approval from an existing system administrator. 
                    All requests are logged and monitored for security purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="First Name"
                    type="text"
                    error={errors.firstName?.message}
                    placeholder="John"
                    {...register('firstName')}
                  />
                  <FormInput
                    label="Last Name"
                    type="text"
                    error={errors.lastName?.message}
                    placeholder="Doe"
                    {...register('lastName')}
                  />
                </div>
                <div className="mt-4">
                  <FormInput
                    label="Email Address"
                    type="email"
                    error={errors.email?.message}
                    placeholder="john.doe@company.com"
                    {...register('email')}
                  />
                </div>
                <div className="mt-4">
                  <FormInput
                    label="Phone Number"
                    type="tel"
                    error={errors.phone?.message}
                    placeholder="+1 (555) 123-4567"
                    {...register('phone')}
                  />
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-gray-600" />
                  Company Information
                </h3>
                <div className="space-y-4">
                  <FormInput
                    label="Company Name"
                    type="text"
                    error={errors.companyName?.message}
                    placeholder="Acme Corporation"
                    {...register('companyName')}
                  />
                  <FormInput
                    label="Position/Title"
                    type="text"
                    error={errors.position?.message}
                    placeholder="IT Director"
                    {...register('position')}
                  />
                </div>
              </div>

              {/* Justification */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-gray-600" />
                  Access Justification
                </h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Business Justification <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.justification ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={6}
                    placeholder="Please explain why you need root access, including your business requirements, intended use, and any relevant experience with similar systems..."
                    {...register('justification')}
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>
                      {errors.justification && (
                        <span className="text-red-500">{errors.justification.message}</span>
                      )}
                    </span>
                    <span className={justificationValue.length < 50 ? 'text-red-500' : 'text-gray-500'}>
                      {justificationValue.length}/1000 characters
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                fullWidth
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                {isSubmitting ? 'Submitting Request...' : 'Submit Access Request'}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Already have access?{' '}
                <button
                  onClick={() => navigate('/root')}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign in here
                </button>
              </p>
              <p className="text-sm text-gray-600">
                Need regular user access?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Go to main login
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RootRegistration;