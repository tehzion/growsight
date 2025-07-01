import React from 'react';
import { User, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';

interface ProfileCompletionRequirementProps {
  onCompleteProfile: () => void;
  onSkip?: () => void;
}

const ProfileCompletionRequirement: React.FC<ProfileCompletionRequirementProps> = ({ 
  onCompleteProfile, 
  onSkip 
}) => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  // Calculate profile completeness
  const calculateProfileCompleteness = () => {
    if (!profile) return 0;
    
    const requiredFields = [
      profile.phone,
      profile.jobTitle,
      profile.departmentId
    ];
    
    const optionalFields = [
      profile.location,
      profile.bio,
      profile.skills?.length > 0,
      profile.interests?.length > 0,
      profile.certifications?.length > 0,
      profile.yearsOfExperience,
      profile.education
    ];
    
    const requiredComplete = requiredFields.filter(Boolean).length / requiredFields.length;
    const optionalComplete = optionalFields.filter(Boolean).length / optionalFields.length;
    
    // Weight required fields more heavily
    return Math.round((requiredComplete * 0.7 + optionalComplete * 0.3) * 100);
  };

  const profileCompleteness = calculateProfileCompleteness();
  const isProfileComplete = profileCompleteness >= 80;

  const getMissingFields = () => {
    const missing = [];
    
    if (!profile?.phone) missing.push('Phone Number');
    if (!profile?.jobTitle) missing.push('Job Title');
    if (!profile?.departmentId) missing.push('Department');
    
    return missing;
  };

  const missingFields = getMissingFields();

  if (isProfileComplete) {
    return (
      <Card className="bg-success-50 border-success-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-success-600" />
            <div>
              <h3 className="font-semibold text-success-800">Profile Complete!</h3>
              <p className="text-success-700 text-sm">
                Your profile is {profileCompleteness}% complete. You can now access all features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-warning-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-600 mt-2">
            Please complete your profile information before proceeding. This helps ensure accurate feedback and better user experience.
          </p>
        </div>
      </div>

      {/* Profile Progress */}
      <Card className="border-warning-200 bg-warning-50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-warning-800">Profile Completion</h3>
              <span className="text-sm font-medium text-warning-700">{profileCompleteness}%</span>
            </div>
            
            <div className="w-full bg-warning-200 rounded-full h-2">
              <div 
                className="bg-warning-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${profileCompleteness}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-warning-700">
              {profileCompleteness < 50 ? 
                'Your profile needs more information to proceed.' :
                'Almost there! Just a few more details needed.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Missing Information */}
      {missingFields.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Required Information
            </h3>
            <div className="space-y-2">
              {missingFields.map((field, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-warning-500 rounded-full"></div>
                  <span>{field}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              These fields are required to ensure proper functionality and user experience.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Profile Info */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Current Profile Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <span className="ml-2 text-gray-900">{user?.firstName} {user?.lastName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <span className="ml-2 text-gray-900">{user?.email}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Phone:</span>
              <span className="ml-2 text-gray-900">{profile?.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Job Title:</span>
              <span className="ml-2 text-gray-900">{profile?.jobTitle || 'Not provided'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Department:</span>
              <span className="ml-2 text-gray-900">{profile?.departmentId || 'Not assigned'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <span className="ml-2 text-gray-900">{profile?.location || 'Not provided'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onCompleteProfile}
          leftIcon={<ArrowRight className="h-4 w-4" />}
          className="flex-1"
        >
          Complete Profile Now
        </Button>
        
        {onSkip && (
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1"
          >
            Skip for Now
          </Button>
        )}
      </div>

      {/* Benefits */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Why Complete Your Profile?</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-1">Better Feedback</h4>
              <p>Reviewers can provide more relevant and contextual feedback when they know your role and department.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Accurate Assignments</h4>
              <p>Administrators can assign assessments to the right people based on your job title and department.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Professional Reports</h4>
              <p>Your profile information appears in assessment reports and analytics for better context.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Personalized Experience</h4>
              <p>The platform can provide more relevant features and suggestions based on your role.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileCompletionRequirement; 