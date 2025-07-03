import { Outlet } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - branding */}
      <div className="bg-primary-800 text-white w-full md:w-1/2 p-8 flex flex-col justify-center items-center">
        {/* Organization branding will be rendered here in the future. Left intentionally blank for now. */}
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