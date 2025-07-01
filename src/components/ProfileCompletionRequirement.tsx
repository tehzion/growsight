import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
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
  Building
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

const REQUIRED_FIELDS = [
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

export default function ProfileCompletionRequirement({ 
  onComplete, 
  showSkip = false,
  redirectTo = '/profile'
}: ProfileCompletionRequirementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

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
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = (profileData: ProfileData) => {
    let completedWeight = 0;
    let totalWeight = 0;
    const missing: string[] = [];

    REQUIRED_FIELDS.forEach(field => {
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
        if (typeof value !== 'object') return false;
        return value.name && value.relationship && value.phone;
      
      case 'skills':
      case 'certifications':
        return Array.isArray(value) && value.length > 0;
      
      case 'education':
      case 'work_experience':
        return Array.isArray(value) && value.length > 0;
      
      default:
        return true;
    }
  };

  const getCompletionStatus = () => {
    if (completionPercentage >= 80) {
      return {
        status: 'complete',
        message: 'Profile is complete!',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (completionPercentage >= 50) {
      return {
        status: 'partial',
        message: 'Profile is partially complete',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        status: 'incomplete',
        message: 'Profile needs completion',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      window.location.href = redirectTo;
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    } else {
      window.location.href = '/dashboard';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Profile Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Unable to load your profile information. Please contact your administrator.
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = getCompletionStatus();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Complete Your Profile</h1>
        <p className="text-muted-foreground">
          Please complete your profile to access all features of the platform.
        </p>
      </div>

      {/* Progress Card */}
      <Card className={`${status.bgColor} ${status.borderColor} border-2`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${status.color}`}>
            {completionPercentage >= 80 ? (
              <CheckCircle className="h-5 w-5" />
            ) : completionPercentage >= 50 ? (
              <Clock className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {status.message}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Progress</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {completionPercentage < 80 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Missing Information:</p>
              <div className="flex flex-wrap gap-2">
                {missingFields.map((field, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {profile.first_name} {profile.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.position && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.position}</span>
                  </div>
                )}
                {profile.department && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.department}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Additional Details</h3>
              <div className="space-y-2 text-sm">
                {profile.skills && profile.skills.length > 0 && (
                  <div>
                    <span className="font-medium">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {profile.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{profile.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {profile.certifications && profile.certifications.length > 0 && (
                  <div>
                    <span className="font-medium">Certifications:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.certifications.slice(0, 2).map((cert, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.bio && (
                  <div>
                    <span className="font-medium">Bio:</span>
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      {profile.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleComplete}
          disabled={completionPercentage < 80}
          className="min-w-[150px]"
        >
          {completionPercentage >= 80 ? (
            <>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            'Complete Profile'
          )}
        </Button>
        
        {showSkip && (
          <Button
            variant="outline"
            onClick={handleSkip}
            className="min-w-[150px]"
          >
            Skip for Now
          </Button>
        )}
      </div>

      {/* Completion Requirements */}
      {completionPercentage < 80 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">What's Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Required Fields (80% needed):</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• First and Last Name</li>
                  <li>• Email Address</li>
                  <li>• Phone Number</li>
                  <li>• Position/Job Title</li>
                  <li>• Department</li>
                  <li>• Emergency Contact</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Optional Fields:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Bio/About</li>
                  <li>• Skills & Certifications</li>
                  <li>• Education History</li>
                  <li>• Work Experience</li>
                  <li>• Profile Picture</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 