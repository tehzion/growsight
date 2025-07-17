/**
 * Session Security Manager
 * Provides enhanced security features for user session management
 */

import { XSSProtection } from './xssProtection';
import SecureLogger from '../secureLogger';

export interface SessionConfig {
  idleTimeout: number;          // Time before idle logout (ms)
  maxSessionAge: number;        // Maximum session duration (ms)
  maxConcurrentSessions: number; // Maximum concurrent sessions per user
  secureStorage: boolean;       // Use encrypted storage
  crossTabSync: boolean;        // Enable cross-tab synchronization
  sessionFingerprinting: boolean; // Enable session fingerprinting
}

export interface SessionFingerprint {
  userAgent: string;
  screen: string;
  timezone: number;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  hash: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  fingerprint: SessionFingerprint;
  lastActivity: number;
  createdAt: number;
  isActive: boolean;
}

export class SessionSecurity {
  private static instance: SessionSecurity | null = null;
  private config: SessionConfig;
  private broadcastChannel: BroadcastChannel | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private activeSessions: Map<string, SessionData> = new Map();
  private currentSessionId: string | null = null;
  private lastActivity: number = Date.now();

  private readonly DEFAULT_CONFIG: SessionConfig = {
    idleTimeout: 30 * 60 * 1000,      // 30 minutes
    maxSessionAge: 8 * 60 * 60 * 1000, // 8 hours
    maxConcurrentSessions: 3,
    secureStorage: true,
    crossTabSync: true,
    sessionFingerprinting: true
  };

  private constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.initializeSecurityFeatures();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<SessionConfig>): SessionSecurity {
    if (!SessionSecurity.instance) {
      SessionSecurity.instance = new SessionSecurity(config);
    }
    return SessionSecurity.instance;
  }

  /**
   * Initialize security features
   */
  private initializeSecurityFeatures(): void {
    if (typeof window === 'undefined') return;

    // Initialize cross-tab communication
    if (this.config.crossTabSync) {
      this.initializeBroadcastChannel();
    }

    // Set up activity monitoring
    this.setupActivityMonitoring();

    // Set up session timers
    this.setupSessionTimers();

    SecureLogger.info('Session security initialized', {
      type: 'session',
      context: 'security_init',
      config: {
        idleTimeout: this.config.idleTimeout,
        maxSessionAge: this.config.maxSessionAge,
        maxConcurrentSessions: this.config.maxConcurrentSessions
      }
    });
  }

  /**
   * Initialize broadcast channel for cross-tab communication
   */
  private initializeBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel('session-security');
      
      this.broadcastChannel.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'session_created':
            this.handleRemoteSessionCreated(data);
            break;
          case 'session_destroyed':
            this.handleRemoteSessionDestroyed(data);
            break;
          case 'logout_all':
            this.handleRemoteLogoutAll();
            break;
          case 'activity_update':
            this.handleRemoteActivityUpdate(data);
            break;
        }
      });
    } catch (error) {
      SecureLogger.warn('Failed to initialize broadcast channel', {
        type: 'session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate session fingerprint
   */
  generateFingerprint(): SessionFingerprint {
    const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = new Date().getTimezoneOffset();
    const language = navigator.language || 'unknown';
    const platform = navigator.platform || 'unknown';
    const userAgent = navigator.userAgent || 'unknown';
    const cookieEnabled = navigator.cookieEnabled;

    // Create hash of fingerprint components
    const components = [userAgent, screen, timezone.toString(), language, platform, cookieEnabled.toString()];
    const hash = this.hashFingerprint(components.join('|'));

    return {
      userAgent: XSSProtection.sanitizeText(userAgent),
      screen: XSSProtection.sanitizeText(screen),
      timezone,
      language: XSSProtection.sanitizeText(language),
      platform: XSSProtection.sanitizeText(platform),
      cookieEnabled,
      hash
    };
  }

  /**
   * Create hash from fingerprint data
   */
  private hashFingerprint(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Create new session
   */
  createSession(userId: string): string {
    const sessionId = this.generateSessionId();
    const fingerprint = this.config.sessionFingerprinting ? this.generateFingerprint() : null;
    
    const sessionData: SessionData = {
      sessionId,
      userId,
      fingerprint: fingerprint!,
      lastActivity: Date.now(),
      createdAt: Date.now(),
      isActive: true
    };

    // Check concurrent session limit
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive);
    
    if (userSessions.length >= this.config.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = userSessions
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      this.destroySession(oldestSession.sessionId, 'concurrent_limit');
    }

    this.activeSessions.set(sessionId, sessionData);
    this.currentSessionId = sessionId;
    this.lastActivity = Date.now();

    // Store session data securely
    this.storeSessionData(sessionData);

    // Broadcast session creation
    this.broadcastMessage('session_created', sessionData);

    // Reset timers
    this.resetSessionTimers();

    SecureLogger.info('Session created', {
      type: 'session',
      context: 'session_created',
      sessionId,
      userId,
      fingerprintHash: fingerprint?.hash
    });

    return sessionId;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string, reason: string = 'manual'): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    this.activeSessions.delete(sessionId);

    // Clear storage
    this.clearSessionData(sessionId);

    // Broadcast session destruction
    this.broadcastMessage('session_destroyed', { sessionId, reason });

    // Clear timers if this is current session
    if (sessionId === this.currentSessionId) {
      this.clearSessionTimers();
      this.currentSessionId = null;
    }

    SecureLogger.info('Session destroyed', {
      type: 'session',
      context: 'session_destroyed',
      sessionId,
      reason,
      userId: session.userId
    });
  }

  /**
   * Validate session
   */
  validateSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    const now = Date.now();

    // Check session age
    if (now - session.createdAt > this.config.maxSessionAge) {
      this.destroySession(sessionId, 'max_age_exceeded');
      return false;
    }

    // Check idle timeout
    if (now - session.lastActivity > this.config.idleTimeout) {
      this.destroySession(sessionId, 'idle_timeout');
      return false;
    }

    // Validate fingerprint if enabled
    if (this.config.sessionFingerprinting && session.fingerprint) {
      const currentFingerprint = this.generateFingerprint();
      if (currentFingerprint.hash !== session.fingerprint.hash) {
        SecureLogger.warn('Session fingerprint mismatch detected', {
          type: 'security',
          context: 'fingerprint_mismatch',
          sessionId,
          originalHash: session.fingerprint.hash,
          currentHash: currentFingerprint.hash
        });
        this.destroySession(sessionId, 'fingerprint_mismatch');
        return false;
      }
    }

    return true;
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId?: string): void {
    const id = sessionId || this.currentSessionId;
    if (!id) return;

    const session = this.activeSessions.get(id);
    if (!session) return;

    session.lastActivity = Date.now();
    this.lastActivity = Date.now();

    // Update stored data
    this.storeSessionData(session);

    // Broadcast activity update
    this.broadcastMessage('activity_update', { sessionId: id, lastActivity: session.lastActivity });

    // Reset idle timer
    this.resetIdleTimer();
  }

  /**
   * Logout all sessions for user
   */
  logoutAllSessions(userId: string): void {
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);

    userSessions.forEach(session => {
      this.destroySession(session.sessionId, 'logout_all');
    });

    // Broadcast logout all
    this.broadcastMessage('logout_all', { userId });

    SecureLogger.info('All sessions logged out', {
      type: 'session',
      context: 'logout_all',
      userId,
      sessionCount: userSessions.length
    });
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId?: string): SessionData | null {
    const id = sessionId || this.currentSessionId;
    if (!id) return null;

    return this.activeSessions.get(id) || null;
  }

  /**
   * Get all active sessions for user
   */
  getUserSessions(userId: string): SessionData[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }

  /**
   * Private helper methods
   */
  private generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private setupActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity();
      }, { passive: true });
    });
  }

  private setupSessionTimers(): void {
    this.resetSessionTimers();
  }

  private resetSessionTimers(): void {
    this.resetIdleTimer();
    this.resetSessionTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      if (this.currentSessionId) {
        this.destroySession(this.currentSessionId, 'idle_timeout');
        this.onSessionExpired('idle_timeout');
      }
    }, this.config.idleTimeout);
  }

  private resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(() => {
      if (this.currentSessionId) {
        this.destroySession(this.currentSessionId, 'max_age_exceeded');
        this.onSessionExpired('max_age_exceeded');
      }
    }, this.config.maxSessionAge);
  }

  private clearSessionTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private onSessionExpired(reason: string): void {
    // Emit custom event for session expiration
    const event = new CustomEvent('sessionExpired', { detail: { reason } });
    window.dispatchEvent(event);
  }

  private storeSessionData(session: SessionData): void {
    if (!this.config.secureStorage) return;

    try {
      const data = JSON.stringify(session);
      // In a real implementation, you'd encrypt this data
      sessionStorage.setItem(`session_${session.sessionId}`, data);
    } catch (error) {
      SecureLogger.warn('Failed to store session data', {
        type: 'session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private clearSessionData(sessionId: string): void {
    try {
      sessionStorage.removeItem(`session_${sessionId}`);
      localStorage.removeItem(`session_${sessionId}`);
    } catch (error) {
      SecureLogger.warn('Failed to clear session data', {
        type: 'session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private broadcastMessage(type: string, data: any): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, data });
      } catch (error) {
        SecureLogger.warn('Failed to broadcast message', {
          type: 'session',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private handleRemoteSessionCreated(data: SessionData): void {
    this.activeSessions.set(data.sessionId, data);
  }

  private handleRemoteSessionDestroyed(data: { sessionId: string; reason: string }): void {
    this.activeSessions.delete(data.sessionId);
    
    if (data.sessionId === this.currentSessionId) {
      this.onSessionExpired(data.reason);
    }
  }

  private handleRemoteLogoutAll(): void {
    if (this.currentSessionId) {
      this.clearSessionTimers();
      this.currentSessionId = null;
      this.onSessionExpired('remote_logout_all');
    }
  }

  private handleRemoteActivityUpdate(data: { sessionId: string; lastActivity: number }): void {
    const session = this.activeSessions.get(data.sessionId);
    if (session) {
      session.lastActivity = data.lastActivity;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearSessionTimers();
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.activeSessions.clear();
    SessionSecurity.instance = null;
  }
}

export default SessionSecurity;