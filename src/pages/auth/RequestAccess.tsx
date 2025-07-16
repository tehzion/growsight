import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, ArrowLeft, Mail, Building2, User } from 'lucide-react';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

const requestAccessSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  organizationName: z.string().min(1, 'Organization name is required'),
  role: z.enum(['org_admin', 'subscriber'], { required_error: 'Please select a role' }),
  message: z.string().optional(),
});

type RequestAccessFormData = z.infer<typeof requestAccessSchema>;

import { useAccessRequestStore } from '../../stores/accessRequestStore';

const RequestAccess = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { createRequest, isLoading } = useAccessRequestStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestAccessFormData>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      organizationName: '',
      role: 'org_admin',
      message: '',
    },
  });
  
  const onSubmit = async (data: RequestAccessFormData) => {
    try {
      await createRequest(data);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit access request:', error);
    }
  };
  
  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-success-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Request Submitted</h2>
          <p className="text-gray-600">
            Your access request has been sent to the system administrators. You'll receive an email once your account is approved and set up.
          </p>
        </div>
        
        <div className="bg-primary-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-primary-800 mb-2">What happens next?</h3>
          <ul className="text-sm text-primary-700 space-y-1 text-left">
            <li>• System administrators will review your request</li>
            <li>• You'll receive an email with your account details</li>
            <li>• A temporary password will be provided</li>
            <li>• You can then set your own password on first login</li>
          </ul>
        </div>
        
        <Link to="/login" className="inline-flex items-center font-medium text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign in
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Request Account Access</h2>
      <p className="text-gray-600 mb-6">
        Submit a request to get access to the Growsight platform. A system administrator will review and approve your request.
      </p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="First Name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          
          <FormInput
            label="Last Name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        
        <FormInput
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        
        <FormInput
          label="Organization Name"
          error={errors.organizationName?.message}
          helperText="Enter your company or organization name"
          {...register('organizationName')}
        />
        
        <div>
          <label htmlFor="role" className="block text-base font-semibold text-gray-800 mb-2">
            Requested Role
          </label>
          <select
            id="role"
            {...register('role')}
            className="w-full text-base px-4 py-3 rounded-lg bg-gray-50 border-2 border-gray-300 hover:border-primary-300 focus:border-primary-500 focus:ring-primary-200 shadow-sm focus:ring-4 focus:outline-none"
          >
            <option value="org_admin">Organization Administrator</option>
            <option value="subscriber">Subscriber</option>
          </select>
          <p className="mt-2 text-sm text-gray-500">
            Organization Administrators can manage users and assessments within their organization.
            Subscribers have limited access to features based on their subscription level.
          </p>
          {errors.role && (
            <p className="mt-2 text-sm text-error-600">{errors.role.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="message" className="block text-base font-semibold text-gray-800 mb-2">
            Additional Message (Optional)
          </label>
          <textarea
            id="message"
            rows={3}
            {...register('message')}
            className="w-full text-base px-4 py-3 rounded-lg bg-gray-50 border-2 border-gray-300 hover:border-primary-300 focus:border-primary-500 focus:ring-primary-200 shadow-sm focus:ring-4 focus:outline-none resize-none"
            placeholder="Tell us more about your organization or specific needs..."
          />
        </div>
        
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          fullWidth
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Submit Access Request
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RequestAccess;