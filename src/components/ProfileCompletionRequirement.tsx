import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { supabase } from '../lib/supabase';
import { 
  User, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  MapPin,
  FileText,
  Award,
  GraduationCap,
  Building,
  SkipForward,
  Shield,
  Settings
} from 'lucide-react';

interface ProfileData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  bio?: string;
  avatar_url?: string;
  date_of_birth?: string;
  hire_date?: string;
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  skills?: string[];
  certifications?: string[];
  education?: {
    degree: string;
    institution: string;
    year: string;
  }[];
  work_experience?: {
    company: string;
    position: string;
    start_date: string;
    end_date?: string;
    description: string;
  }[];
  is_first_login: boolean;
  profile_completed: boolean;
  completion_percentage: number;
}

interface ProfileCompletionRequirementProps {
  onComplete?: () => void;
  showSkip?: boolean;
  redirectTo?: string;
}

// Different field requirements based on user role
const getRequiredFields = (userRole: string) => {
  switch (userRole) {
    case 'root':
    case 'super_admin':
      // Admin users have minimal requirements
      return [
        { key: 'first_name', label: 'First Name', icon: User, weight: 10 },
        { key: 'last_name', label: 'Last Name', icon: User, weight: 10 },
        { key: 'email', label: 'Email', icon: Mail, weight: 10 },
        { key: 'phone', label: 'Phone', icon: Phone, weight: 8 }
      ];
    
    case 'org_admin':
      // Organization admins need basic contact info
      return [
        { key: 'first_name', label: 'First Name', icon: User, weight: 10 },
        { key: 'last_name', label: 'Last Name', icon: User, weight: 10 },
        { key: 'email', label: 'Email', icon: Mail, weight: 10 },
        { key: 'phone', label: 'Phone', icon: Phone, weight: 8 },
        { key: 'position', label: 'Position', icon: Briefcase, weight: 8 },
        { key: 'department', label: 'Department', icon: Building, weight: 8 }
      ];
    
    case 'subscriber':
      // Subscribers need professional info
      return [
        { key: 'first_name', label: 'First Name', icon: User, weight: 10 },
        { key: 'last_name', label: 'Last Name', icon: User, weight: 10 },
        { key: 'email', label: 'Email', icon: Mail, weight: 10 },
        { key: 'phone', label: 'Phone', icon: Phone, weight: 8 },
        { key: 'position', label: 'Position', icon: Briefcase, weight: 8 },
        { key: 'department', label: 'Department', icon: Building, weight: 8 },
        { key: 'bio', label: 'Bio', icon: FileText, weight: 5 }
      ];
    
    case 'employee':
    case 'reviewer':
    default:
      // Regular users need comprehensive profile
      return [
        { key: 'first_name', label: 'First Name', icon: User, weight: 10 },
        { key: 'last_name', label: 'Last Name', icon: User, weight: 10 },
        { key: 'email', label: 'Email', icon: Mail, weight: 10 },
        { key: 'phone', label: 'Phone', icon: Phone, weight: 8 },
        { key: 'position', label: 'Position', icon: Briefcase, weight: 8 },
        { key: 'department', label: 'Department', icon: Building, weight: 8 },
        { key: 'date_of_birth', label: 'Date of Birth', icon: Calendar, weight: 6 },
        { key: 'hire_date', label: 'Hire Date', icon: Calendar, weight: 6 },
        { key: 'bio', label: 'Bio', icon: FileText, weight: 5 },
        { key: 'emergency_contact', label: 'Emergency Contact', icon: Phone, weight: 7 },
        { key: 'skills', label: 'Skills', icon: Award, weight: 4 },
        { key: 'certifications', label: 'Certifications', icon: Award, weight: 4 },
        { key: 'education', label: 'Education', icon: GraduationCap, weight: 3 },
        { key: 'work_experience', label: 'Work Experience', icon: Briefcase, weight: 3 }
      ];
  }
};

// Get completion threshold based on user role
const getCompletionThreshold = (userRole: string) => {
  switch (userRole) {
    case 'root':
    case 'super_admin':
      return 50; // Lower threshold for admin users
    case 'org_admin':
      return 60; // Medium threshold for org admins
    case 'subscriber':
      return 70; // Higher threshold for subscribers
    case 'employee':
    case 'reviewer':
    default:
      return 80; // Full threshold for regular users
  }
};

// Get role-specific benefits message
const getRoleBenefits = (userRole: string) => {
  switch (userRole) {
    case 'root':
    case 'super_admin':
      return [
        '• Access to all system features and organizations',
        '• Full administrative capabilities',
        '• System-wide analytics and reporting',
        '• User and organization management'
      ];
    
    case 'org_admin':
      return [
        '• Manage your organization\'s users and assessments',
        '• Access organization-level analytics',
        '• Create and assign assessments',
        '• Configure organization settings'
      ];
    
    case 'subscriber':
      return [
        '• Access to premium assessment features',
        '• Enhanced personal analytics',
        '• Priority support and consultation',
        '• Advanced reporting capabilities'
      ];
    
    case 'employee':
    case 'reviewer':
    default:
      return [
        '• Better personalized feedback and recommendations',
        '• Improved assessment matching and results',
        '• Enhanced collaboration with team members',
        '• Access to all platform features and analytics'
      ];
  }
};

export default function ProfileCompletionRequirement({ 
  onComplete, 
  showSkip = false,
  redirectTo = '/profile'
}: ProfileCompletionRequirementProps) {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Get role-specific requirements
  const requiredFields = user ? getRequiredFields(user.role) : [];
  const completionThreshold = user ? getCompletionThreshold(user.role) : 80;
  const roleBenefits = user ? getRoleBenefits(user.role) : [];

  // Skip profile completion for root and super admin users
  const shouldSkipProfileCompletion = user?.role === 'root' || user?.role === 'super_admin';

  useEffect(() => {
    if (shouldSkipProfileCompletion) {
      // Auto-complete for root and super admin users
      if (onComplete) {
        onComplete();
      }
      return;
    }

    if (user?.id) {
      loadProfile();
    }
  }, [user?.id, shouldSkipProfileCompletion, onComplete]);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Try to load from profiles table first
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, try users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id, email, first_name, last_name, organization_id, department_id,
            phone, job_title, location, bio, avatar_url, timezone, date_format,
            skills, interests, certifications, years_of_experience, 
            education, preferred_language
          `)
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        // Convert user data to profile format
        data = {
          id: userData.id,
          user_id: userData.id,
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          position: userData.job_title || '',
          department: userData.department_id || '',
          bio: userData.bio || '',
          avatar_url: userData.avatar_url || '',
          date_of_birth: '',
          hire_date: '',
          emergency_contact: {
            name: '',
            relationship: '',
            phone: ''
          },
          skills: userData.skills || [],
          certifications: userData.certifications || [],
          education: [],
          work_experience: [],
          is_first_login: true,
          profile_completed: false,
          completion_percentage: 0
        };
      } else if (error) {
        throw error;
      }

      setProfile(data);
      calculateCompletion(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to load profile data',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = (profileData: ProfileData) => {
    let completedWeight = 0;
    let totalWeight = 0;
    const missing: string[] = [];

    requiredFields.forEach(field => {
      totalWeight += field.weight;
      const value = profileData[field.key as keyof ProfileData];
      
      if (isFieldComplete(field.key, value)) {
        completedWeight += field.weight;
      } else {
        missing.push(field.label);
      }
    });

    const percentage = Math.round((completedWeight / totalWeight) * 100);
    setCompletionPercentage(percentage);
    setMissingFields(missing);
  };

  const isFieldComplete = (fieldKey: string, value: any): boolean => {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    switch (fieldKey) {
      case 'emergency_contact':
        return typeof value === 'object' && value.name && value.relationship && value.phone;
      case 'skills':
      case 'certifications':
        return Array.isArray(value) && value.length > 0;
      case 'education':
      case 'work_experience':
        return Array.isArray(value) && value.length > 0;
      default:
        return typeof value === 'string' && value.trim().length > 0;
    }
  };

  const getCompletionStatus = () => {
    if (completionPercentage >= completionThreshold) {
      return {
        status: 'complete',
        color: 'text-success-600',
        bgColor: 'bg-success-50',
        borderColor: 'border-success-200',
        icon: CheckCircle,
        message: `Profile is complete! You can now access all features.`
      };
    } else if (completionPercentage >= completionThreshold * 0.75) {
      return {
        status: 'almost',
        color: 'text-warning-600',
        bgColor: 'bg-warning-50',
        borderColor: 'border-warning-200',
        icon: Clock,
        message: `Almost there! Complete a few more fields to unlock all features.`
      };
    } else {
      return {
        status: 'incomplete',
        color: 'text-error-600',
        bgColor: 'bg-error-50',
        borderColor: 'border-error-200',
        icon: AlertCircle,
        message: `Please complete your profile to access all platform features.`
      };
    }
  };

  const handleComplete = () => {
    navigate(redirectTo);
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/dashboard');
    }
  };

  const status = getCompletionStatus();
  const StatusIcon = status.icon;

  if (shouldSkipProfileCompletion) {
    return null; // Don't render anything for root and super admin users
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'root':
        return <Shield className="h-5 w-5" />;
      case 'super_admin':
        return <Shield className="h-5 w-5" />;
      case 'org_admin':
        return <Settings className="h-5 w-5" />;
      case 'subscriber':
        return <User className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'root':
        return 'System Administrator';
      case 'super_admin':
        return 'Super Administrator';
      case 'org_admin':
        return 'Organization Administrator';
      case 'subscriber':
        return 'Subscriber';
      case 'employee':
        return 'Employee';
      case 'reviewer':
        return 'Reviewer';
      default:
        return role;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {getRoleIcon(user?.role || '')}
          <span className="ml-2">Complete Your Profile</span>
          {user?.role && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({getRoleLabel(user.role)})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`p-4 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
          <div className="flex items-start">
            <StatusIcon className={`h-5 w-5 mt-0.5 mr-3 ${status.color}`} />
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${status.color}`}>
                Profile Completion Required
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {status.message}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Completion Progress</span>
            <span className="text-sm text-gray-500">{completionPercentage}% / {completionThreshold}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                completionPercentage >= completionThreshold ? 'bg-success-500' : 
                completionPercentage >= completionThreshold * 0.75 ? 'bg-warning-500' : 'bg-error-500'
              }`}
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {completionPercentage >= completionThreshold 
              ? 'Profile complete!' 
              : `${completionThreshold - completionPercentage}% more needed`
            }
          </div>
        </div>

        {missingFields.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Missing Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {missingFields.map((field, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <AlertCircle className="h-4 w-4 mr-2 text-warning-500" />
                  {field}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleComplete}
            leftIcon={<ArrowRight className="h-4 w-4" />}
            className="flex-1"
          >
            Complete Profile
          </Button>
          {showSkip && (
            <Button
              variant="outline"
              onClick={handleSkip}
              leftIcon={<SkipForward className="h-4 w-4" />}
              className="flex-1"
            >
              Skip for Now
            </Button>
          )}
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Why Complete Your Profile?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {roleBenefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 