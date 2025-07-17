import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationDisplay from '../ui/NotificationDisplay';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { fetchOrganizations, currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchOrganizations();
    }
  }, [user, fetchOrganizations]);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} user={user} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar} 
          user={user} 
          onLogout={handleLogout}
          currentOrganization={currentOrganization}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Notification Display */}
        <NotificationDisplay />
      </div>
    </div>
  );
};

export default Layout;