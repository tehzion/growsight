import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Dashboard from './Dashboard';
import AdminDashboard from './admin/AdminDashboard';
import SuperAdminDashboard from './admin/SuperAdminDashboard';

/**
 * Smart Dashboard Router
 * 
 * Automatically routes users to the appropriate dashboard based on their role:
 * - super_admin -> SuperAdminDashboard
 * - org_admin -> AdminDashboard (dedicated admin interface)
 * - subscriber, employee, reviewer -> Dashboard (generic)
 * 
 * This ensures org admins see their purpose-built dashboard instead of
 * the generic multi-role Dashboard component.
 */
const DashboardRouter: React.FC = () => {
    const { user } = useAuthStore();

    // Route to appropriate dashboard based on user role
    if (!user) {
        // If no user, redirect to login
        return <Navigate to="/login" replace />;
    }

    switch (user.role) {
        case 'super_admin':
            // Super admins get their dedicated dashboard
            return <SuperAdminDashboard />;

        case 'org_admin':
            // Org admins get their dedicated AdminDashboard
            // This was previously inaccessible!
            return <AdminDashboard />;

        case 'subscriber':
        case 'employee':
        case 'reviewer':
        case 'root':
        default:
            // All other roles use the generic Dashboard
            return <Dashboard />;
    }
};

export default DashboardRouter;
