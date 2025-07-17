import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { XSSProtection } from '@/lib/security/xssProtection';
import { 
  User, 
  Mail, 
  Building2, 
  Calendar, 
  Save, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle,
  AlertTriangle,
  Camera,
  Phone,
  MapPin,
  Briefcase,
  Tag,
  Plus,
  X,
  FileText,
  Clock,
  Award,
  Bookmark
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useProfileStore } from '../../stores/profileStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import { useNotificationStore } from '../../stores/notificationStore';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  yearsOfExperience: z.string().optional(),
  education: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const UserProfile: React.FC = () => {
  const { user, updatePassword, isLoading } = useAuthStore();
  const { profile, updateProfile, profileTags, addProfileTag, removeProfileTag } = useProfileStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences' | 'tags'>('profile');
  const [profileUpdateStatus, setProfileUpdateStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [newTag, setNewTag] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [recentAssessments, setRecentAssessments] = useState([
    {
      id: 'assessment-1',
      title: 'Leadership Assessment',
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      score: 4.8,
      tags: ['leadership', 'management', 'communication']
    },
    {
      id: 'assessment-2',
      title: 'Communication Skills',
      completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      score: 5.2,
      tags: ['communication', 'presentation', 'listening']
    }
  ]);
  
  // Calculate profile completeness
  const calculateProfileCompleteness = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.phone,
      profile.jobTitle,
      profile.location,
      profile.bio,
      profile.skills?.length > 0,
      profile.interests?.length > 0,
      profile.certifications?.length > 0,
      profile.yearsOfExperience,
      profile.education,
      profile.preferredLanguage
    ];
    
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  };
  
  const profileCompleteness = calculateProfileCompleteness();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    setValue: setProfileValue,
    watch: watchProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: profile?.phone || '',
      department: user?.departmentId || '',
      jobTitle: profile?.jobTitle || '',
      location: profile?.location || '',
      bio: profile?.bio || '',
      skills: profile?.skills || [],
      interests: profile?.interests || [],
      certifications: profile?.certifications || [],
      yearsOfExperience: profile?.yearsOfExperience || '',
      education: profile?.education || '',
      preferredLanguage: profile?.preferredLanguage || 'en',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');
  const skills = watchProfile('skills') || [];
  const interests = watchProfile('interests') || [];
  const certifications = watchProfile('certifications') || [];
  const [bioContent, setBioContent] = useState(profile?.bio || '');

  useEffect(() => {
    if (user) {
      setProfileValue('firstName', user.firstName);
      setProfileValue('lastName', user.lastName);
      setProfileValue('email', user.email);
      
      if (user.organizationId) {
        fetchDepartments(user.organizationId);
      }
      
      // Profile is now display-only
    }
      }, [user, setProfileValue, fetchDepartments, addNotification]);

  useEffect(() => {
    if (profile) {
      setProfileValue('phone', profile.phone || '');
      setProfileValue('department', user?.departmentId || '');
      setProfileValue('jobTitle', profile.jobTitle || '');
      setProfileValue('location', profile.location || '');
      setProfileValue('bio', profile.bio || '');
      setBioContent(profile.bio || '');
      setProfileValue('skills', profile.skills || []);
      setProfileValue('interests', profile.interests || []);
      setProfileValue('certifications', profile.certifications || []);
      setProfileValue('yearsOfExperience', profile.yearsOfExperience || '');
      setProfileValue('education', profile.education || '');
      setProfileValue('preferredLanguage', profile.preferredLanguage || 'en');
    }
  }, [profile, setProfileValue, user]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileUpdateStatus('saving');
    try {
      // Sanitize bio content before saving to prevent XSS
      const sanitizedBio = XSSProtection.sanitizeRichText(bioContent);
      
      await updateProfile({
        phone: data.phone,
        jobTitle: data.jobTitle,
        location: data.location,
        bio: sanitizedBio,
        skills: data.skills,
        interests: data.interests,
        certifications: data.certifications,
        yearsOfExperience: data.yearsOfExperience,
        education: data.education,
        preferredLanguage: data.preferredLanguage,
        departmentId: data.department
      });
      
      setProfileUpdateStatus('saved');
      
      // Add notification
      addNotification({
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        type: 'success'
      });
      
      // Profile is now display-only
      
      setTimeout(() => setProfileUpdateStatus('idle'), 2000);
    } catch (error) {
      setProfileUpdateStatus('error');
      
      // Add error notification
      addNotification({
        title: 'Profile Update Failed',
        message: (error as Error).message || 'Failed to update profile. Please try again.',
        type: 'error'
      });
      
      setTimeout(() => setProfileUpdateStatus('idle'), 3000);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordUpdateStatus('saving');
    try {
      await updatePassword(data.currentPassword, data.newPassword);
      setPasswordUpdateStatus('saved');
      resetPasswordForm();
      
      // Add notification
      addNotification({
        title: 'Password Updated',
        message: 'Your password has been updated successfully.',
        type: 'success'
      });
      
      setTimeout(() => setPasswordUpdateStatus('idle'), 2000);
    } catch (error) {
      setPasswordUpdateStatus('error');
      
      // Add error notification
      addNotification({
        title: 'Password Update Failed',
        message: (error as Error).message || 'Failed to update password. Please try again.',
        type: 'error'
      });
      
      setTimeout(() => setPasswordUpdateStatus('idle'), 3000);
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

  const passwordStrength = getPasswordStrength(newPassword || '');
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-error-500', 'bg-warning-500', 'bg-yellow-500', 'bg-primary-500', 'bg-success-500'];

  const handleAddSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setProfileValue('skills', [...skills, newSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setProfileValue('skills', skills.filter(s => s !== skill));
  };

  const handleAddInterest = () => {
    if (newInterest && !interests.includes(newInterest)) {
      setProfileValue('interests', [...interests, newInterest]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setProfileValue('interests', interests.filter(i => i !== interest));
  };

  const handleAddCertification = () => {
    if (newCertification && !certifications.includes(newCertification)) {
      setProfileValue('certifications', [...certifications, newCertification]);
      setNewCertification('');
    }
  };

  const handleRemoveCertification = (certification: string) => {
    setProfileValue('certifications', certifications.filter(c => c !== certification));
  };

  const handleAddTag = () => {
    if (newTag && !profileTags.includes(newTag)) {
      addProfileTag(newTag);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    removeProfileTag(tag);
  };

  const handleAddAssessmentTag = (assessmentId: string, tag: string) => {
    setRecentAssessments(prev => 
      prev.map(assessment => 
        assessment.id === assessmentId && !assessment.tags.includes(tag)
          ? { ...assessment, tags: [...assessment.tags, tag] }
          : assessment
      )
    );
  };

  const handleRemoveAssessmentTag = (assessmentId: string, tag: string) => {
    setRecentAssessments(prev => 
      prev.map(assessment => 
        assessment.id === assessmentId
          ? { ...assessment, tags: assessment.tags.filter(t => t !== tag) }
          : assessment
      )
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <div className="bg-purple-600 p-2 rounded-full"><User className="h-6 w-6 text-white" /></div>;
      case 'org_admin':
        return <div className="bg-indigo-600 p-2 rounded-full"><User className="h-6 w-6 text-white" /></div>;
      case 'subscriber':
        return <div className="bg-accent-600 p-2 rounded-full"><User className="h-6 w-6 text-white" /></div>;
      default:
        return <div className="bg-primary-600 p-2 rounded-full"><User className="h-6 w-6 text-white" /></div>;
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
      case 'employee':
        return 'Employee';
      case 'reviewer':
        return 'Reviewer';
      case 'subscriber':
        return 'Subscriber';
      default:
        return role;
    }
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return 'None';
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unknown';
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Not authenticated</h3>
        <p className="text-gray-500">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {getRoleIcon(user.role)}
              <button className="absolute -bottom-1 -right-1 bg-white border-2 border-gray-200 rounded-full p-1 hover:bg-gray-50">
                <Camera className="h-3 w-3 text-gray-600" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {getRoleLabel(user.role)}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
                {user.departmentId && (
                  <span className="flex items-center">
                    <Building2 className="h-4 w-4 mr-1" />
                    {getDepartmentName(user.departmentId)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Profile Completeness Indicator */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completeness</span>
              <span className="text-sm font-medium text-gray-700">{profileCompleteness}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  profileCompleteness >= 80 ? 'bg-success-500' :
                  profileCompleteness >= 50 ? 'bg-primary-500' :
                  profileCompleteness >= 30 ? 'bg-warning-500' :
                  'bg-error-500'
                }`}
                style={{ width: `${profileCompleteness}%` }}
              ></div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {profileCompleteness < 50 ? 
                'Complete your profile to improve your experience and get more personalized feedback.' :
                profileCompleteness < 80 ?
                'Good progress! Continue adding information to complete your profile.' :
                'Great job! Your profile is nearly complete.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'profile', label: 'Profile Information', icon: User },
            { id: 'password', label: 'Password & Security', icon: KeyRound },
            { id: 'tags', label: 'Profile Tags', icon: Tag },
            { id: 'preferences', label: 'Preferences', icon: CheckCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <p className="text-sm text-gray-600">
              Update your personal information and contact details
            </p>
          </CardHeader>
          <CardContent>
            {profileUpdateStatus === 'saved' && (
              <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 rounded-md flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Profile updated successfully!
              </div>
            )}

            {profileUpdateStatus === 'error' && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Failed to update profile. Please try again.
              </div>
            )}

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="First Name"
                  error={profileErrors.firstName?.message}
                  {...registerProfile('firstName')}
                />
                <FormInput
                  label="Last Name"
                  error={profileErrors.lastName?.message}
                  {...registerProfile('lastName')}
                />
              </div>

              <FormInput
                label="Email"
                type="email"
                error={profileErrors.email?.message}
                helperText="Your email address is used for login and notifications"
                {...registerProfile('email')}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <FormInput
                    label="Phone Number"
                    type="tel"
                    error={profileErrors.phone?.message}
                    {...registerProfile('phone')}
                  />
                  <Phone className="absolute right-3 top-9 h-4 w-4 text-gray-400" />
                </div>
                <div className="relative">
                  <FormInput
                    label="Location"
                    error={profileErrors.location?.message}
                    {...registerProfile('location')}
                  />
                  <MapPin className="absolute right-3 top-9 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    {...registerProfile('department')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">No Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <FormInput
                    label="Job Title"
                    error={profileErrors.jobTitle?.message}
                    {...registerProfile('jobTitle')}
                  />
                  <Briefcase className="absolute right-3 top-9 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <select
                    {...registerProfile('yearsOfExperience')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Select experience</option>
                    <option value="0-1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Education
                  </label>
                  <select
                    {...registerProfile('education')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Select education</option>
                    <option value="high_school">High School</option>
                    <option value="associate">Associate Degree</option>
                    <option value="bachelor">Bachelor's Degree</option>
                    <option value="master">Master's Degree</option>
                    <option value="doctorate">Doctorate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language
                </label>
                <select
                  {...registerProfile('preferredLanguage')}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              <div>
                <label htmlFor="bio" className="block text-base font-semibold text-gray-800 mb-2">
                  Bio
                </label>
                <ReactQuill
                  theme="snow"
                  value={bioContent}
                  onChange={setBioContent}
                  placeholder="Tell us a bit about yourself..."
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                  className="h-40 mb-12"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={profileUpdateStatus === 'saving'}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password & Security Tab */}
      {activeTab === 'password' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <p className="text-sm text-gray-600">
                Update your password to keep your account secure
              </p>
            </CardHeader>
            <CardContent>
              {passwordUpdateStatus === 'saved' && (
                <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 rounded-md flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Password updated successfully!
                </div>
              )}

              {passwordUpdateStatus === 'error' && (
                <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Failed to update password. Please check your current password and try again.
                </div>
              )}

              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                <div className="relative">
                  <FormInput
                    label="Current Password"
                    type={showPasswords.current ? "text" : "password"}
                    autoComplete="current-password"
                    error={passwordErrors.currentPassword?.message}
                    {...registerPassword('currentPassword')}
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
                    error={passwordErrors.newPassword?.message}
                    {...registerPassword('newPassword')}
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
                    error={passwordErrors.confirmPassword?.message}
                    {...registerPassword('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    isLoading={passwordUpdateStatus === 'saving'}
                    leftIcon={<KeyRound className="h-4 w-4" />}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle>Security Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Last Login</h4>
                    <p className="text-sm text-gray-600">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Account Created</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Tags Tab */}
      {activeTab === 'tags' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Profile Tags
              </CardTitle>
              <p className="text-sm text-gray-600">
                Add tags to your profile to highlight your skills and interests
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Personal Tags */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profileTags.map(tag => (
                      <div key={tag} className="flex items-center bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm">
                        <span>{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-primary-600 hover:text-primary-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {profileTags.length === 0 && (
                      <p className="text-sm text-gray-500">No tags added yet. Add tags to highlight your expertise and interests.</p>
                    )}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a new tag"
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!newTag}
                      className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Tags help others understand your expertise and can improve assessment matching
                  </p>
                </div>

                {/* Skills */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {skills.map(skill => (
                      <div key={skill} className="flex items-center bg-secondary-100 text-secondary-800 px-3 py-1 rounded-full text-sm">
                        <span>{skill}</span>
                        <button 
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-secondary-600 hover:text-secondary-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {skills.length === 0 && (
                      <p className="text-sm text-gray-500">No skills added yet. Add skills to showcase your capabilities.</p>
                    )}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a new skill"
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={!newSkill}
                      className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {interests.map(interest => (
                      <div key={interest} className="flex items-center bg-accent-100 text-accent-800 px-3 py-1 rounded-full text-sm">
                        <span>{interest}</span>
                        <button 
                          onClick={() => handleRemoveInterest(interest)}
                          className="ml-2 text-accent-600 hover:text-accent-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {interests.length === 0 && (
                      <p className="text-sm text-gray-500">No interests added yet. Add interests to show what you're passionate about.</p>
                    )}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add a new interest"
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      disabled={!newInterest}
                      className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {certifications.map(certification => (
                      <div key={certification} className="flex items-center bg-success-100 text-success-800 px-3 py-1 rounded-full text-sm">
                        <span>{certification}</span>
                        <button 
                          onClick={() => handleRemoveCertification(certification)}
                          className="ml-2 text-success-600 hover:text-success-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {certifications.length === 0 && (
                      <p className="text-sm text-gray-500">No certifications added yet. Add certifications to showcase your qualifications.</p>
                    )}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Add a new certification"
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      disabled={!newCertification}
                      className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-white bg-success-600 hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Assessment Tags */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Assessment Tags</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Tags associated with your completed assessments for better analysis and tracking
                  </p>
                  
                  {recentAssessments.length > 0 ? (
                    <div className="space-y-4">
                      {recentAssessments.map(assessment => (
                        <div key={assessment.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{assessment.title}</h4>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>Completed: {new Date(assessment.completedAt).toLocaleDateString()}</span>
                                <span className="mx-2">•</span>
                                <Award className="h-4 w-4 mr-1" />
                                <span>Score: {assessment.score}/7</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Bookmark className="h-4 w-4 text-primary-600 mr-1" />
                              <span className="text-sm text-primary-600">Save</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {assessment.tags.map(tag => (
                              <div key={tag} className="flex items-center bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                                <span>{tag}</span>
                                <button 
                                  onClick={() => handleRemoveAssessmentTag(assessment.id, tag)}
                                  className="ml-2 text-gray-600 hover:text-gray-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex">
                            <input
                              type="text"
                              placeholder="Add a tag"
                              className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const input = e.target as HTMLInputElement;
                                  if (input.value) {
                                    handleAddAssessmentTag(assessment.id, input.value);
                                    input.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                const input = e.currentTarget.previousSibling as HTMLInputElement;
                                if (input.value) {
                                  handleAddAssessmentTag(assessment.id, input.value);
                                  input.value = '';
                                }
                              }}
                              className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Assessments Yet</h3>
                      <p className="text-sm text-gray-500">
                        Complete assessments to start tagging and tracking your progress
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate('/my-assessments')}
                      >
                        Go to Assessments
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleProfileSubmit(onProfileSubmit)}
                    isLoading={profileUpdateStatus === 'saving'}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save All Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <p className="text-sm text-gray-600">
              Customize your experience and notification settings
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
                <div className="space-y-4">
                  {[
                    { id: 'email_assignments', label: 'Email notifications for new assignments', description: 'Get notified when you receive new assessment assignments' },
                    { id: 'email_reminders', label: 'Email reminders for deadlines', description: 'Receive reminders before assessment deadlines' },
                    { id: 'email_results', label: 'Email notifications for results', description: 'Get notified when assessment results are available' },
                  ].map((setting) => (
                    <label key={setting.id} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{setting.label}</div>
                        <div className="text-sm text-gray-500">{setting.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Display</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                      <option>UTC-8 (Pacific Time)</option>
                      <option>UTC-5 (Eastern Time)</option>
                      <option>UTC+0 (GMT)</option>
                      <option>UTC+1 (Central European Time)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button leftIcon={<Save className="h-4 w-4" />}>
                  Save Preferences
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserProfile;