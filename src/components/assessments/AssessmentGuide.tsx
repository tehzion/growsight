import React from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

interface AssessmentGuideProps {
  role: 'employee' | 'reviewer';
}

const AssessmentGuide: React.FC<AssessmentGuideProps> = ({ role }) => {
  return (
    <Card className="bg-primary-50 border-primary-100">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-primary-100 p-2 rounded-full">
            <HelpCircle className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-medium mb-2">Assessment Guide</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Instructions</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {role === 'employee' ? (
                    <>
                      <li>Rate yourself honestly on each competency</li>
                      <li>Consider your performance over the past year</li>
                      <li>Provide specific examples in your comments</li>
                    </>
                  ) : (
                    <>
                      <li>Rate the employee objectively based on observed behavior</li>
                      <li>Focus on specific examples and incidents</li>
                      <li>Provide constructive feedback in your comments</li>
                    </>
                  )}
                  <li>Complete all required questions in each section</li>
                  <li>You can save your progress and return later</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Rating Scale (1-7)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">1-2:</span>
                    <span className="text-gray-600">Needs Development</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">3-4:</span>
                    <span className="text-gray-600">Developing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">5:</span>
                    <span className="text-gray-600">Proficient</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">6-7:</span>
                    <span className="text-gray-600">Advanced/Expert</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-primary-100">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-primary-600" />
                  <span className="font-medium">Important:</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Your responses will be compared with {role === 'employee' ? 'reviewer' : 'self'} ratings to identify areas of alignment and development opportunities. Be thorough and honest in your assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentGuide;