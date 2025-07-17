import DOMPurify from 'dompurify';
import SecureLogger from '../secureLogger';

export class XSSProtection {
  private static readonly DEFAULT_CONFIG = {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class', 'id'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
  };

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(html: string, config?: DOMPurify.Config): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    try {
      const sanitized = DOMPurify.sanitize(html, {
        ...this.DEFAULT_CONFIG,
        ...config
      });

      // Log if content was modified (potential XSS attempt)
      if (sanitized !== html) {
        SecureLogger.warn('XSS attempt detected and blocked', {
          type: 'security',
          originalLength: html.length,
          sanitizedLength: sanitized.length,
          context: 'html_sanitization'
        });
      }

      return sanitized;
    } catch (error) {
      SecureLogger.error('HTML sanitization failed', {
        type: 'security',
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'html_sanitization'
      });
      return '';
    }
  }

  /**
   * Sanitize text content (no HTML allowed)
   */
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return DOMPurify.sanitize(text, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    });
  }

  /**
   * Sanitize URL to prevent javascript: and data: URLs
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Remove javascript: and data: URLs
    const cleaned = url.replace(/^(javascript|data|vbscript):/i, '');
    
    // Only allow http, https, mailto, and relative URLs
    const allowedProtocols = /^(https?:\/\/|mailto:|\/|\.\/|\.\.\/)/i;
    
    if (!allowedProtocols.test(cleaned) && cleaned.length > 0) {
      SecureLogger.warn('Potentially malicious URL blocked', {
        type: 'security',
        url: cleaned.substring(0, 100),
        context: 'url_sanitization'
      });
      return '';
    }

    return cleaned;
  }

  /**
   * Sanitize user input for database queries
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Validate and sanitize rich text content (for editors)
   */
  static sanitizeRichText(html: string): string {
    const richTextConfig = {
      ALLOWED_TAGS: [
        'b', 'i', 'u', 'strong', 'em', 'br', 'p', 'div', 'span',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
      ],
      ALLOWED_ATTR: {
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'table': ['class'],
        'td': ['colspan', 'rowspan'],
        'th': ['colspan', 'rowspan'],
        '*': ['class', 'id', 'style']
      },
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
    };

    return this.sanitizeHtml(html, richTextConfig);
  }
}

export default XSSProtection;