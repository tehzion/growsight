import { Outlet } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

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