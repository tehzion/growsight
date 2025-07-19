/**
 * Authentication Mutex - Prevents race conditions in authentication flows
 * Ensures only one authentication operation runs at a time
 */

export class AuthMutex {
  private static instance: AuthMutex;
  private mutex: Promise<void> = Promise.resolve();
  private isLocked = false;
  private lockId: string | null = null;

  static getInstance(): AuthMutex {
    if (!AuthMutex.instance) {
      AuthMutex.instance = new AuthMutex();
    }
    return AuthMutex.instance;
  }

  /**
   * Acquire lock for authentication operation
   * Returns a unique lock ID and release function
   */
  async acquire(operationName: string): Promise<{ lockId: string; release: () => void }> {
    const lockId = `${operationName}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Wait for current operation to complete
    await this.mutex;
    
    // If already locked by a different operation, wait
    if (this.isLocked && this.lockId !== lockId) {
      await this.waitForRelease();
    }
    
    this.isLocked = true;
    this.lockId = lockId;
    
    console.debug(`Auth mutex acquired: ${operationName} (${lockId})`);
    
    let released = false;
    const release = () => {
      if (!released && this.lockId === lockId) {
        this.isLocked = false;
        this.lockId = null;
        released = true;
        console.debug(`Auth mutex released: ${operationName} (${lockId})`);
      }
    };
    
    // Auto-release after 30 seconds to prevent deadlocks
    setTimeout(() => {
      if (!released) {
        console.warn(`Auth mutex auto-released after timeout: ${operationName} (${lockId})`);
        release();
      }
    }, 30000);
    
    return { lockId, release };
  }

  /**
   * Check if mutex is currently locked
   */
  isCurrentlyLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Get current lock ID
   */
  getCurrentLockId(): string | null {
    return this.lockId;
  }

  /**
   * Wait for current lock to be released
   */
  private async waitForRelease(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isLocked) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  /**
   * Force release all locks (emergency use only)
   */
  forceReleaseAll(): void {
    console.warn('Force releasing all auth mutex locks');
    this.isLocked = false;
    this.lockId = null;
    this.mutex = Promise.resolve();
  }
}

/**
 * Utility function to wrap authentication operations with mutex
 */
export async function withAuthMutex<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const mutex = AuthMutex.getInstance();
  const { release } = await mutex.acquire(operationName);
  
  try {
    return await operation();
  } finally {
    release();
  }
}

export const authMutex = AuthMutex.getInstance();