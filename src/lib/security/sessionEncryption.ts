/**
 * Session Encryption - Secure session data storage
 * Implements AES-GCM encryption for session data
 */

import { config } from '../../config/environment';

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  timestamp: number;
}

export class SessionEncryption {
  private static instance: SessionEncryption;
  private cryptoKey: CryptoKey | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  static getInstance(): SessionEncryption {
    if (!SessionEncryption.instance) {
      SessionEncryption.instance = new SessionEncryption();
    }
    return SessionEncryption.instance;
  }

  /**
   * Initialize encryption key
   */
  async initialize(): Promise<void> {
    try {
      // Use environment-specific key or generate one
      const keyMaterial = config.security.sessionEncryptionKey || 
        await this.generateKeyMaterial();
      
      this.cryptoKey = await this.importKey(keyMaterial);
    } catch (error) {
      console.error('Failed to initialize session encryption:', error);
      throw new Error('Session encryption initialization failed');
    }
  }

  /**
   * Encrypt session data
   */
  async encrypt(data: string): Promise<string> {
    if (!this.cryptoKey) {
      await this.initialize();
    }

    try {
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt data
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        this.cryptoKey!,
        this.encoder.encode(data)
      );

      // Extract encrypted data and authentication tag
      const encryptedArray = new Uint8Array(encrypted);
      const encryptedData = encryptedArray.slice(0, -16);
      const tag = encryptedArray.slice(-16);

      const result: EncryptedData = {
        encrypted: this.arrayBufferToBase64(encryptedData),
        iv: this.arrayBufferToBase64(iv),
        tag: this.arrayBufferToBase64(tag),
        timestamp: Date.now()
      };

      return btoa(JSON.stringify(result));
    } catch (error) {
      console.error('Session encryption failed:', error);
      throw new Error('Failed to encrypt session data');
    }
  }

  /**
   * Decrypt session data
   */
  async decrypt(encryptedData: string): Promise<string> {
    if (!this.cryptoKey) {
      await this.initialize();
    }

    try {
      const data: EncryptedData = JSON.parse(atob(encryptedData));
      
      // Check if data is too old (24 hours)
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        throw new Error('Session data expired');
      }

      // Reconstruct encrypted data with tag
      const encrypted = this.base64ToArrayBuffer(data.encrypted);
      const iv = this.base64ToArrayBuffer(data.iv);
      const tag = this.base64ToArrayBuffer(data.tag);
      
      const encryptedWithTag = new Uint8Array(encrypted.byteLength + tag.byteLength);
      encryptedWithTag.set(new Uint8Array(encrypted));
      encryptedWithTag.set(new Uint8Array(tag), encrypted.byteLength);

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        this.cryptoKey!,
        encryptedWithTag
      );

      return this.decoder.decode(decrypted);
    } catch (error) {
      console.error('Session decryption failed:', error);
      throw new Error('Failed to decrypt session data');
    }
  }

  /**
   * Securely store encrypted session data
   */
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.encrypt(value);
      sessionStorage.setItem(`secure_${key}`, encrypted);
    } catch (error) {
      console.error('Failed to store secure session item:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt session data
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      const encrypted = sessionStorage.getItem(`secure_${key}`);
      if (!encrypted) return null;
      
      return await this.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to retrieve secure session item:', error);
      // Clean up corrupted data
      sessionStorage.removeItem(`secure_${key}`);
      return null;
    }
  }

  /**
   * Remove secure session item
   */
  removeSecureItem(key: string): void {
    sessionStorage.removeItem(`secure_${key}`);
  }

  /**
   * Clear all secure session data
   */
  clearAllSecureItems(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  /**
   * Generate key material for encryption
   */
  private async generateKeyMaterial(): Promise<string> {
    const key = crypto.getRandomValues(new Uint8Array(32));
    return this.arrayBufferToBase64(key);
  }

  /**
   * Import encryption key
   */
  private async importKey(keyMaterial: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(keyMaterial);
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const sessionEncryption = SessionEncryption.getInstance();