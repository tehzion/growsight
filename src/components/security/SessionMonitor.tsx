/**
 * Session Monitor Component
 * Provides real-time session monitoring and security alerts
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import SessionSecurity from '../../lib/security/sessionSecurity';
import SecureLogger from '../../lib/secureLogger';
import { AlertTriangle, Clock, Shield, Users } from 'lucide-react';

interface SessionInfo {
  sessionId: string;
  timeRemaining: number;
  idleTime: number;
  isValid: boolean;
  activeSessions: number;
  securityAlerts: SecurityAlert[];
}

interface SecurityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export const SessionMonitor: React.FC = () => {
  const { user, sessionId, lastActivity, validateSession, logout } = useAuthStore();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user || !sessionId) {
      setSessionInfo(null);
      return;
    }

    const updateSessionInfo = () => {
      try {
        const sessionSecurity = SessionSecurity.getInstance();
        const sessionData = sessionSecurity.getSessionInfo(sessionId);
        const userSessions = sessionSecurity.getUserSessions(user.id);
        const isValid = validateSession();
        
        if (sessionData) {
          const now = Date.now();
          const timeRemaining = Math.max(0, (sessionData.createdAt + 8 * 60 * 60 * 1000) - now); // 8 hours max
          const idleTime = now - sessionData.lastActivity;
          
          // Generate security alerts
          const alerts: SecurityAlert[] = [];
          
          if (timeRemaining < 10 * 60 * 1000) { // 10 minutes remaining
            alerts.push({
              id: 'session_expiring',
              type: 'warning',
              message: 'Session expires in less than 10 minutes',
              timestamp: now
            });
          }
          
          if (idleTime > 20 * 60 * 1000) { // 20 minutes idle
            alerts.push({
              id: 'idle_warning',
              type: 'warning',
              message: 'You have been idle for over 20 minutes',
              timestamp: now
            });
          }
          
          if (userSessions.length > 2) {
            alerts.push({
              id: 'multiple_sessions',
              type: 'info',
              message: `You have ${userSessions.length} active sessions`,
              timestamp: now
            });
          }
          
          if (!isValid) {
            alerts.push({
              id: 'invalid_session',
              type: 'error',
              message: 'Session validation failed',
              timestamp: now
            });
          }

          setSessionInfo({
            sessionId,
            timeRemaining,
            idleTime,
            isValid,
            activeSessions: userSessions.length,
            securityAlerts: alerts
          });
        }
      } catch (error) {
        SecureLogger.error('Session monitor update failed', {
          type: 'session',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    // Update immediately
    updateSessionInfo();

    // Update every 30 seconds
    const interval = setInterval(updateSessionInfo, 30000);

    return () => clearInterval(interval);
  }, [user, sessionId, lastActivity, validateSession]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const handleLogoutOtherSessions = () => {
    const { logoutAllSessions } = useAuthStore.getState();
    logoutAllSessions();
  };

  if (!user || !sessionInfo) {
    return null;
  }

  const criticalAlerts = sessionInfo.securityAlerts.filter(alert => alert.type === 'error');
  const hasAlerts = sessionInfo.securityAlerts.length > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${sessionInfo.isValid ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-sm font-medium text-gray-900">Session Monitor</span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">Security Alert</span>
            </div>
            {criticalAlerts.map(alert => (
              <p key={alert.id} className="text-xs text-red-600 mt-1">
                {alert.message}
              </p>
            ))}
          </div>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">
              {formatTime(sessionInfo.timeRemaining)} left
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">
              {sessionInfo.activeSessions} sessions
            </span>
          </div>
        </div>

        {/* Warning Alerts */}
        {hasAlerts && sessionInfo.securityAlerts.filter(alert => alert.type !== 'error').length > 0 && (
          <div className="mt-3 text-xs">
            {sessionInfo.securityAlerts
              .filter(alert => alert.type !== 'error')
              .map(alert => (
                <div key={alert.id} className={`flex items-center gap-1 mt-1 ${
                  alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  <AlertTriangle className="h-3 w-3" />
                  <span>{alert.message}</span>
                </div>
              ))}
          </div>
        )}

        {/* Detailed View */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Session ID:</span>
                <span className="text-gray-700 font-mono">
                  {sessionInfo.sessionId.substring(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Idle Time:</span>
                <span className="text-gray-700">
                  {formatTime(sessionInfo.idleTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${
                  sessionInfo.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {sessionInfo.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>

            {/* Actions */}
            {sessionInfo.activeSessions > 1 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <button
                  onClick={handleLogoutOtherSessions}
                  className="w-full text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded border border-red-200"
                >
                  Logout Other Sessions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionMonitor;