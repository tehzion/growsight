import { 
  X, 
  BarChart4, 
  Users, 
  ClipboardList, 
  Building2, 
  CheckCircle2, 
  User, 
  Shield, 
  Eye, 
  Settings, 
  UserCheck, 
  UserCircle,
  Activity,
  Server,
  FileText,
  UserPlus,
  Palette,
  BookOpen,
  Tag,
  MessageSquare,
  Database,
  Layers,
  BarChart3
} from 'lucide-react';
import { User as UserType } from '../../types';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  user: UserType | null;
}

const Sidebar = ({ isOpen, toggleSidebar, user }: SidebarProps) => {
  const { hasPermission } = useAuthStore();
  const isRoot = user?.role === 'root';
  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const isSubscriber = user?.role === 'subscriber';
  const isAdminLevel = isSuperAdmin || isOrgAdmin;
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <BarChart4 className="h-5 w-5" />, roles: ['root', 'super_admin', 'org_admin', 'employee', 'reviewer', 'subscriber'] },
    { path: '/root-dashboard', label: 'Root Dashboard', icon: <Server className="h-5 w-5" />, roles: ['root'] },
    { path: '/organizations', label: 'Organizations', icon: <Building2 className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/permissions', label: 'Permissions', icon: <Shield className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/users', label: 'Users', icon: <Users className="h-5 w-5" />, roles: ['super_admin', 'org_admin', 'subscriber'], permission: 'manage_users' },
    { path: '/assessments', label: 'Assessments', icon: <ClipboardList className="h-5 w-5" />, roles: ['super_admin', 'org_admin', 'subscriber'], permission: 'create_assessments' },
    { path: '/templates', label: 'Templates', icon: <Layers className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/email-templates', label: 'Email Templates', icon: <Mail className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/reporting', label: 'Reporting', icon: <BarChart3 className="h-5 w-5" />, roles: ['super_admin', 'org_admin'] },
    { path: '/assessment-assignments', label: 'Assignments', icon: <UserCheck className="h-5 w-5" />, roles: ['org_admin'], permission: 'assign_assessments' },
    { path: '/results', label: 'Analytics', icon: <BarChart4 className="h-5 w-5" />, roles: ['super_admin', 'org_admin'], permission: 'view_results' },
    { path: '/assessment-results', label: 'Assessment Results', icon: <Activity className="h-5 w-5" />, roles: ['super_admin', 'org_admin'], permission: 'view_results' },
    { path: '/assessment-360', label: '360° Assessments', icon: <Users className="h-5 w-5" />, roles: ['super_admin', 'org_admin'], permission: 'view_results' },
    { path: '/import-export', label: 'Import/Export', icon: <Database className="h-5 w-5" />, roles: ['super_admin', 'org_admin'] },
    { path: '/my-results', label: 'My Results', icon: <BarChart4 className="h-5 w-5" />, roles: ['subscriber'] },

    { path: '/subscriber-assessments', label: 'My Assessments', icon: <ClipboardList className="h-5 w-5" />, roles: ['subscriber'] },
    { path: '/competencies', label: 'Competencies', icon: <Tag className="h-5 w-5" />, roles: ['org_admin'], permission: 'create_assessments' },
    { path: '/support', label: 'Support & Consultation', icon: <MessageSquare className="h-5 w-5" />, roles: ['super_admin', 'org_admin', 'employee', 'reviewer', 'subscriber'] },
    
    // Super Admin System Management
    { path: '/system-settings', label: 'System Settings', icon: <Settings className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/access-requests', label: 'Access Requests', icon: <UserPlus className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/access-requests', label: 'Access Requests', icon: <UserPlus className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/branding', label: 'Branding', icon: <Palette className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/admin/branding', label: 'Organization Branding', icon: <Palette className="h-5 w-5" />, roles: ['org_admin'] },
    
    // User-level navigation
    { path: '/my-assessments', label: 'My Assessments', icon: <ClipboardList className="h-5 w-5" />, roles: ['employee', 'reviewer'] },
    { path: '/my-results', label: 'My Results', icon: <BarChart4 className="h-5 w-5" />, roles: ['employee', 'reviewer'] },
    { path: '/profile', label: 'My Profile', icon: <UserCircle className="h-5 w-5" />, roles: ['super_admin', 'org_admin', 'employee', 'reviewer', 'subscriber'] }
  ];
  
  const filteredNavItems = navItems.filter(item => {
    // Check if user role is included in allowed roles
    const hasRole = item.roles.includes(user?.role || '');
    
    // Check for specific permission if required
    const hasRequiredPermission = item.permission ? hasPermission(item.permission) : true;
    
    // Super admin always has access to everything
    if (isSuperAdmin) return hasRole;
    
    // For other roles, check both role and permission
    return hasRole && hasRequiredPermission;
  });

  // Group navigation items by category for Super Admin
  const getGroupedNavItems = () => {
    if (!isSuperAdmin) return { main: filteredNavItems, system: [] };
    
    return {
      main: filteredNavItems.filter(item => 
        !['/system-settings', '/access-requests', '/branding'].includes(item.path)
      ),
      system: filteredNavItems.filter(item => 
        ['/system-settings', '/access-requests', '/branding'].includes(item.path)
      )
    };
  };

  const groupedNavItems = getGroupedNavItems();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'root':
        return <Server className="h-5 w-5" />;
      case 'super_admin':
        return <Shield className="h-5 w-5" />;
      case 'org_admin':
        return <Settings className="h-5 w-5" />;
      case 'reviewer':
        return <Eye className="h-5 w-5" />;
      case 'subscriber':
        return <User className="h-5 w-5 text-accent-600" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'root':
        return 'bg-red-600';
      case 'super_admin':
        return 'bg-purple-600';
      case 'org_admin':
        return 'bg-indigo-600';
      case 'reviewer':
        return 'bg-green-600';
      case 'subscriber':
        return 'bg-accent-600';
      default:
        return 'bg-primary-600';
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
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary-800 text-white transform transition duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-primary-700">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
              <span className="ml-2 font-semibold text-xl">Growsight SaaS</span>
            </div>
            <button 
              className="md:hidden text-white hover:text-primary-200 transition-colors"
              onClick={toggleSidebar}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* User info */}
          <div className="px-4 py-4 border-b border-primary-700">
            <div className="flex items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getRoleColor(user?.role || '')}`}>
                {getRoleIcon(user?.role || '')}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs opacity-75">
                  {getRoleLabel(user?.role || '')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {/* Main Navigation */}
            <div className="px-4 space-y-1">
              {groupedNavItems.main.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-700 text-white'
                        : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                    }`
                  }
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 768) {
                      toggleSidebar();
                    }
                  }}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* System Management Section for Super Admin */}
            {isSuperAdmin && groupedNavItems.system.length > 0 && (
              <>
                <div className="px-4 pt-6 pb-2">
                  <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                    System Management
                  </h3>
                </div>
                <div className="px-4 space-y-1">
                  {groupedNavItems.system.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-primary-700 text-white'
                            : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                        }`
                      }
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          toggleSidebar();
                        }
                      }}
                    >
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </>
            )}

            {isSuperAdmin && (
              <SidebarItem
                to="/assessment-results"
                icon={<BarChart3 className="h-5 w-5" />}
                label="Assessment Results"
              />
            )}

            {(isSuperAdmin || isOrgAdmin) && (
              <SidebarItem
                to="/assessments"
                icon={<ClipboardList className="h-5 w-5" />}
                label="360° Assessments"
              />
            )}
          </nav>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t border-primary-700">
            <div className="text-xs opacity-75">
              <p>© 2025 Growsight SaaS</p>
              <p className="mt-1">Enterprise Permission Control</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;