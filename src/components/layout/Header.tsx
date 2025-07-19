import { ChevronDown, LogOut, Menu, User, Shield, Eye, Settings, KeyRound, UserCircle, Bell, BellDot, MessageSquare, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Organization, User as UserType } from '../../types';
import { useNotificationStore } from '../../stores/notificationStore';
import { useSupportStore } from '../../stores/supportStore';
import { useBrandingStore } from '../../stores/brandingStore';

interface HeaderProps {
  toggleSidebar: () => void;
  user: UserType | null;
  onLogout: () => void;
  currentOrganization: Organization | null;
}

const Header = ({ toggleSidebar, user, onLogout, currentOrganization }: HeaderProps) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { tickets } = useSupportStore();
  const { webBranding } = useBrandingStore();
  
  // Count open tickets
  const openTicketsCount = tickets.filter(t => 
    t.status === 'open' || t.status === 'in_progress' || t.status === 'escalated'
  ).length;
  
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const toggleNotificationMenu = () => {
    setNotificationMenuOpen(!notificationMenuOpen);
    if (!notificationMenuOpen && unreadCount > 0) {
      // Mark notifications as read when opening the menu
      markAllAsRead();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'root':
        return <Shield className="h-4 w-4" />;
      case 'super_admin':
        return <Shield className="h-4 w-4" />;
      case 'org_admin':
        return <Settings className="h-4 w-4" />;
      case 'reviewer':
        return <Eye className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'root':
        return 'bg-red-700 text-white';
      case 'super_admin':
        return 'bg-purple-700 text-white';
      case 'org_admin':
        return 'bg-indigo-700 text-white';
      case 'reviewer':
        return 'bg-green-700 text-white';
      case 'subscriber':
        return 'bg-accent-700 text-white';
      default:
        return 'bg-primary-700 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'root':
        return 'System Administrator';
      case 'super_admin':
        return 'Super Admin';
      case 'org_admin':
        return 'Organization Admin';
      case 'reviewer':
        return 'Reviewer';
      case 'employee':
        return 'Employee';
      case 'subscriber':
        return 'Subscriber';
      default:
        return role;
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200 z-10 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button
              type="button"
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-shrink-0 flex items-center ml-4 md:ml-0">
              {currentOrganization && (
                <div className="flex items-center space-x-3">
                  {webBranding?.logo_url && (
                    <img 
                      src={webBranding.logo_url} 
                      alt="Logo" 
                      className="h-8 w-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <span 
                      className="text-lg font-semibold" 
                      style={{ 
                        color: webBranding?.primary_color || '#1f2937',
                        fontFamily: webBranding?.font_family || 'inherit'
                      }}
                    >
                      {webBranding?.company_name || currentOrganization.name}
                    </span>
                    <div className="text-xs text-gray-500">
                      {user?.role === 'super_admin' ? 'System Dashboard' : 'Organization Dashboard'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {/* Support Hub Button */}
            <div className="ml-3 relative">
              <button
                type="button"
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => navigate('/support')}
              >
                <span className="sr-only">Support Hub</span>
                <div className="relative">
                  <MessageSquare className="h-6 w-6" />
                  {openTicketsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {openTicketsCount > 9 ? '9+' : openTicketsCount}
                    </span>
                  )}
                </div>
              </button>
            </div>
            
            {/* Notification bell */}
            <div className="ml-3 relative">
              <button
                type="button"
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={toggleNotificationMenu}
              >
                <span className="sr-only">View notifications</span>
                {unreadCount > 0 ? (
                  <div className="relative">
                    <BellDot className="h-6 w-6" />
                    <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                ) : (
                  <Bell className="h-6 w-6" />
                )}
              </button>
              
              {notificationMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setNotificationMenuOpen(false)}
                  />
                  
                  {/* Notification Menu */}
                  <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          className="text-xs text-primary-600 hover:text-primary-800"
                          onClick={() => markAllAsRead()}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center">
                          <Bell className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map(notification => (
                            <div 
                              key={notification.id} 
                              className={`p-4 hover:bg-gray-50 cursor-pointer ${notification.read ? 'opacity-75' : ''}`}
                              onClick={() => {
                                markAsRead(notification.id);
                                if (notification.link) {
                                  navigate(notification.link);
                                }
                                setNotificationMenuOpen(false);
                              }}
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                  {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-success-500" />}
                                  {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-warning-500" />}
                                  {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-error-500" />}
                                  {notification.type === 'info' && <Info className="h-5 w-5 text-primary-500" />}
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                  <p className="text-sm text-gray-500">{notification.message}</p>
                                  <p className="mt-1 text-xs text-gray-400">
                                    {new Date(notification.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="ml-2 flex-shrink-0">
                                    <div className="h-2 w-2 rounded-full bg-primary-500"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-100 text-center">
                        <button
                          className="text-xs text-primary-600 hover:text-primary-800"
                          onClick={() => navigate('/notifications')}
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* User dropdown */}
            <div className="ml-3 relative">
              <div>
                <button
                  type="button"
                  className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 p-2 hover:bg-gray-50 transition-colors"
                  onClick={toggleUserMenu}
                >
                  <span className="sr-only">Open user menu</span>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getRoleColor(user?.role || '')}`}>
                    {getRoleIcon(user?.role || '')}
                  </div>
                  <div className="ml-3 hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700">{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs text-gray-500">{getRoleLabel(user?.role || '')}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                </button>
              </div>
              
              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setUserMenuOpen(false)}
                  />
                  
                  {/* Menu */}
                  <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getRoleColor(user?.role || '')}`}>
                          {getRoleIcon(user?.role || '')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className={`
                              inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                              ${user?.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                user?.role === 'org_admin' ? 'bg-indigo-100 text-indigo-800' :
                                user?.role === 'reviewer' ? 'bg-green-100 text-green-800' :
                                user?.role === 'subscriber' ? 'bg-accent-100 text-accent-800' :
                                'bg-blue-100 text-blue-800'}
                            `}>
                              {getRoleLabel(user?.role || '')}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                      >
                        <UserCircle className="h-4 w-4 mr-3" />
                        My Profile
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/set-password');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                      >
                        <KeyRound className="h-4 w-4 mr-3" />
                        Change Password
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/support');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                      >
                        <MessageSquare className="h-4 w-4 mr-3" />
                        Support & Consultation
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Compliance Link */}
            <Link
              to="/compliance"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              <Shield className="h-4 w-4 inline mr-1" />
              Privacy & GDPR
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;