/**
 * Secure Storage Utility
 * Provides encrypted storage for sensitive data in localStorage/sessionStorage
 */

import SecureLogger from '../secureLogger';

export interface StorageConfig {
  encryptionKey?: string;
  useSessionStorage?: boolean;
  compressionEnabled?: boolean;
  expirationEnabled?: boolean;
}

export interface StoredData {
  data: string;
  timestamp: number;
  expiration?: number;
  checksum: string;
}

export class SecureStorage {
  private config: Required<StorageConfig>;
  private encryptionKey: string;

  constructor(config: StorageConfig = {}) {
    this.config = {
      encryptionKey: config.encryptionKey || this.generateEncryptionKey(),
      useSessionStorage: config.useSessionStorage || false,
      compressionEnabled: config.compressionEnabled || true,
      expirationEnabled: config.expirationEnabled || true
    };
    
    this.encryptionKey = this.config.encryptionKey;
  }

  /**
   * Store data securely
   */
  setItem(key: string, value: any, expirationMs?: number): boolean {
    try {
      // Sanitize key
      const sanitizedKey = this.sanitizeKey(key);
      
      // Serialize data
      const serializedData = JSON.stringify(value);
      
      // Compress if enabled
      const processedData = this.config.compressionEnabled 
        ? this.compress(serializedData)
        : serializedData;
      
      // Encrypt data
      const encryptedData = this.encrypt(processedData);
      
      // Create storage object
      const storageObject: StoredData = {
        data: encryptedData,
        timestamp: Date.now(),
        checksum: this.generateChecksum(encryptedData)
      };
      
      // Add expiration if enabled
      if (this.config.expirationEnabled && expirationMs) {
        storageObject.expiration = Date.now() + expirationMs;
      }
      
      // Store data
      const storage = this.getStorage();
      storage.setItem(sanitizedKey, JSON.stringify(storageObject));
      
      SecureLogger.info('Secure data stored', {
        type: 'storage',
        context: 'store_data',
        key: sanitizedKey,
        dataSize: encryptedData.length,
        hasExpiration: !!storageObject.expiration
      });
      
      return true;
    } catch (error) {
      SecureLogger.error('Failed to store secure data', {
        type: 'storage',
        context: 'store_error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Retrieve data securely
   */
  getItem<T = any>(key: string): T | null {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      const storage = this.getStorage();
      const storedData = storage.getItem(sanitizedKey);
      
      if (!storedData) {
        return null;
      }
      
      // Parse stored object
      const storageObject: StoredData = JSON.parse(storedData);
      
      // Check expiration
      if (this.config.expirationEnabled && storageObject.expiration) {
        if (Date.now() > storageObject.expiration) {
          this.removeItem(key);
          SecureLogger.info('Expired data removed', {
            type: 'storage',
            context: 'data_expired',
            key: sanitizedKey
          });
          return null;
        }
      }
      
      // Verify checksum
      const expectedChecksum = this.generateChecksum(storageObject.data);
      if (storageObject.checksum !== expectedChecksum) {
        SecureLogger.warn('Data integrity check failed', {
          type: 'security',
          context: 'checksum_mismatch',
          key: sanitizedKey
        });
        this.removeItem(key);
        return null;
      }
      
      // Decrypt data
      const decryptedData = this.decrypt(storageObject.data);
      
      // Decompress if needed
      const processedData = this.config.compressionEnabled 
        ? this.decompress(decryptedData)
        : decryptedData;
      
      // Parse and return
      return JSON.parse(processedData) as T;
    } catch (error) {
      SecureLogger.error('Failed to retrieve secure data', {
        type: 'storage',
        context: 'retrieve_error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Remove item
   */
  removeItem(key: string): boolean {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      const storage = this.getStorage();
      storage.removeItem(sanitizedKey);
      return true;
    } catch (error) {
      SecureLogger.error('Failed to remove secure data', {
        type: 'storage',
        context: 'remove_error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Clear all data
   */
  clear(): boolean {
    try {
      const storage = this.getStorage();
      storage.clear();
      return true;
    } catch (error) {
      SecureLogger.error('Failed to clear secure storage', {
        type: 'storage',
        context: 'clear_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    try {
      const storage = this.getStorage();
      const keys: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      
      return keys;
    } catch (error) {
      SecureLogger.error('Failed to get storage keys', {
        type: 'storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Check if key exists
   */
  hasItem(key: string): boolean {
    const sanitizedKey = this.sanitizeKey(key);
    const storage = this.getStorage();
    return storage.getItem(sanitizedKey) !== null;
  }

  /**
   * Get storage size in bytes (approximate)
   */
  getStorageSize(): number {
    try {
      const storage = this.getStorage();
      let totalSize = 0;
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean expired items
   */
  cleanExpired(): number {
    if (!this.config.expirationEnabled) return 0;
    
    let cleanedCount = 0;
    const keys = this.keys();
    
    keys.forEach(key => {
      try {
        const storage = this.getStorage();
        const storedData = storage.getItem(key);
        
        if (storedData) {
          const storageObject: StoredData = JSON.parse(storedData);
          
          if (storageObject.expiration && Date.now() > storageObject.expiration) {
            storage.removeItem(key);
            cleanedCount++;
          }
        }
      } catch (error) {
        // Remove corrupted data
        this.getStorage().removeItem(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      SecureLogger.info('Expired items cleaned', {
        type: 'storage',
        context: 'cleanup',
        cleanedCount
      });
    }
    
    return cleanedCount;
  }

  /**
   * Private helper methods
   */
  private getStorage(): Storage {
    return this.config.useSessionStorage ? sessionStorage : localStorage;
  }

  private sanitizeKey(key: string): string {
    // Remove dangerous characters and limit length
    return key.replace(/[<>"/\\&]/g, '').substring(0, 50);
  }

  private generateEncryptionKey(): string {
    // Generate a simple key based on browser fingerprint
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage
    ].join('|');
    
    return this.simpleHash(fingerprint);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private encrypt(data: string): string {
    // Simple XOR encryption (in production, use proper encryption)
    let encrypted = '';
    const keyLength = this.encryptionKey.length;
    
    for (let i = 0; i < data.length; i++) {
      const keyChar = this.encryptionKey.charCodeAt(i % keyLength);
      const dataChar = data.charCodeAt(i);
      encrypted += String.fromCharCode(dataChar ^ keyChar);
    }
    
    return btoa(encrypted); // Base64 encode
  }

  private decrypt(encryptedData: string): string {
    try {
      const encrypted = atob(encryptedData); // Base64 decode
      let decrypted = '';
      const keyLength = this.encryptionKey.length;
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = this.encryptionKey.charCodeAt(i % keyLength);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  private compress(data: string): string {
    if (!this.config.compressionEnabled) return data;
    
    // Simple compression (in production, use proper compression)
    try {
      return btoa(unescape(encodeURIComponent(data)));
    } catch (error) {
      return data;
    }
  }

  private decompress(compressedData: string): string {
    if (!this.config.compressionEnabled) return compressedData;
    
    try {
      return decodeURIComponent(escape(atob(compressedData)));
    } catch (error) {
      return compressedData;
    }
  }

  private generateChecksum(data: string): string {
    return this.simpleHash(data + this.encryptionKey);
  }

  /**
   * Static utility methods
   */
  static createSecureSession(expirationMs?: number): SecureStorage {
    return new SecureStorage({
      useSessionStorage: true,
      expirationEnabled: true
    });
  }

  static createSecureLocal(): SecureStorage {
    return new SecureStorage({
      useSessionStorage: false,
      expirationEnabled: true
    });
  }
}

export default SecureStorage;