import { Outlet } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - branding */}
      <div className="bg-primary-800 text-white w-full md:w-1/2 p-8 flex flex-col justify-center items-center">
        <div className="max-w-md animate-fade-in">
          <CheckCircle2 className="h-16 w-16 mb-6" />
          <h1 className="text-4xl font-bold mb-4">Growsight</h1>
          <p className="text-lg opacity-80 mb-8">
            Unlock your team's potential with comprehensive, structured feedback.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-1 rounded mr-3 mt-1">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p>Section-based assessments with customizable questions</p>
            </div>
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-1 rounded mr-3 mt-1">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p>Side-by-side comparison of self and reviewer ratings</p>
            </div>
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-1 rounded mr-3 mt-1">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p>Secure multi-organization management</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - auth forms */}
      <div className="bg-gray-50 w-full md:w-1/2 flex justify-center items-center p-8">
        <div className="w-full max-w-md animate-slide-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;