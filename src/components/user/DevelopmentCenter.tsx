/**
 * Employee Development Center
 * Comprehensive personal and professional development features
 * 
 * TEMPORARILY DISABLED - TODO: Implement real API calls
 * Issues:
 * - Development goals, skills, and feedback are TODO items (line 133)
 * - Real API calls not implemented
 * - Development center features don't work
 * 
 * Status: HIDDEN from navigation until implementation is complete
 */

import React from 'react';
import { 
  Target, 
  TrendingUp, 
  Award, 
  MessageSquare,
  Lightbulb,
  Map
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export const DevelopmentCenter: React.FC = () => {
  const { user } = useAuthStore();
  
  // TEMPORARY: Return "coming soon" message until real API implementation is complete
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Development Center</h2>
          <p className="text-gray-600 mb-6">
            Personal and professional development features are coming soon!
          </p>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Planned Features:</h3>
            <ul className="text-left space-y-2 text-gray-600">
              <li className="flex items-center">
                <Target className="h-4 w-4 text-blue-500 mr-2" />
                Development Goals Tracking
              </li>
              <li className="flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                Skills Assessment
              </li>
              <li className="flex items-center">
                <MessageSquare className="h-4 w-4 text-purple-500 mr-2" />
                Peer Feedback System
              </li>
              <li className="flex items-center">
                <Map className="h-4 w-4 text-orange-500 mr-2" />
                Career Path Planning
              </li>
              <li className="flex items-center">
                <Award className="h-4 w-4 text-yellow-500 mr-2" />
                Achievement Tracking
              </li>
            </ul>
          </div>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Lightbulb className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">
                <strong>Development Status:</strong> API integration in progress. 
                This feature will be available in a future release.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ORIGINAL IMPLEMENTATION COMMENTED OUT UNTIL API IS READY
/*
Original component implementation with TODO items at line 133+
Will be restored once real API calls are implemented for:
- Development goals loading and management
- Skills assessment and tracking  
- Peer feedback system
- Career path planning

The original implementation had extensive TODO placeholders for:
1. loadDevelopmentData() function - no real API calls
2. Development goals management
3. Skills assessment tracking
4. Peer feedback system
5. Career path planning
6. Achievement tracking

Component now shows "coming soon" message until APIs are implemented.
This prevents users from accessing incomplete/non-functional features.
*/

export default DevelopmentCenter;