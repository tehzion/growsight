/**
 * Security validation tests for XSS protection and CSP implementation
 * Run these tests to verify security measures are working correctly
 */

import { XSSProtection } from './xssProtection';
import { ContentSecurityPolicy } from './contentSecurityPolicy';

export class SecurityTests {
  /**
   * Test XSS protection functionality
   */
  static testXSSProtection(): { passed: number; failed: number; results: string[] } {
    const results: string[] = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Basic script tag removal
    const scriptTest = '<script>alert("XSS")</script>Hello World';
    const scriptResult = XSSProtection.sanitizeHtml(scriptTest);
    if (scriptResult === 'Hello World') {
      results.push('✅ Script tag removal: PASSED');
      passed++;
    } else {
      results.push(`❌ Script tag removal: FAILED (got: "${scriptResult}")`);
      failed++;
    }

    // Test 2: Event handler removal
    const eventTest = '<img src="x" onerror="alert(\'XSS\')" alt="test">Safe content';
    const eventResult = XSSProtection.sanitizeHtml(eventTest);
    if (!eventResult.includes('onerror')) {
      results.push('✅ Event handler removal: PASSED');
      passed++;
    } else {
      results.push(`❌ Event handler removal: FAILED (got: "${eventResult}")`);
      failed++;
    }

    // Test 3: JavaScript URL sanitization
    const jsUrlTest = 'javascript:alert("XSS")';
    const jsUrlResult = XSSProtection.sanitizeUrl(jsUrlTest);
    if (jsUrlResult === '') {
      results.push('✅ JavaScript URL blocking: PASSED');
      passed++;
    } else {
      results.push(`❌ JavaScript URL blocking: FAILED (got: "${jsUrlResult}")`);
      failed++;
    }

    // Test 4: Data URL blocking
    const dataUrlTest = 'data:text/html,<script>alert("XSS")</script>';
    const dataUrlResult = XSSProtection.sanitizeUrl(dataUrlTest);
    if (dataUrlResult === '') {
      results.push('✅ Data URL blocking: PASSED');
      passed++;
    } else {
      results.push(`❌ Data URL blocking: FAILED (got: "${dataUrlResult}")`);
      failed++;
    }

    // Test 5: Safe URL preservation
    const safeUrlTest = 'https://example.com/safe-url';
    const safeUrlResult = XSSProtection.sanitizeUrl(safeUrlTest);
    if (safeUrlResult === safeUrlTest) {
      results.push('✅ Safe URL preservation: PASSED');
      passed++;
    } else {
      results.push(`❌ Safe URL preservation: FAILED (got: "${safeUrlResult}")`);
      failed++;
    }

    // Test 6: Rich text sanitization
    const richTextTest = '<p>Safe <b>content</b></p><script>alert("XSS")</script>';
    const richTextResult = XSSProtection.sanitizeRichText(richTextTest);
    if (richTextResult.includes('<p>') && richTextResult.includes('<b>') && !richTextResult.includes('<script>')) {
      results.push('✅ Rich text sanitization: PASSED');
      passed++;
    } else {
      results.push(`❌ Rich text sanitization: FAILED (got: "${richTextResult}")`);
      failed++;
    }

    // Test 7: Input sanitization with nested objects
    const inputTest = {
      name: '<script>alert("XSS")</script>John',
      bio: '<p>Safe content</p><script>alert("XSS")</script>',
      tags: ['<script>alert("XSS")</script>tag1', 'safe-tag']
    };
    const inputResult = XSSProtection.sanitizeInput(inputTest);
    if (
      inputResult.name === 'John' &&
      !inputResult.bio.includes('<script>') &&
      inputResult.tags[0] === 'tag1' &&
      inputResult.tags[1] === 'safe-tag'
    ) {
      results.push('✅ Input object sanitization: PASSED');
      passed++;
    } else {
      results.push(`❌ Input object sanitization: FAILED (got: ${JSON.stringify(inputResult)})`);
      failed++;
    }

    return { passed, failed, results };
  }

  /**
   * Test Content Security Policy functionality
   */
  static testCSPImplementation(): { passed: number; failed: number; results: string[] } {
    const results: string[] = [];
    let passed = 0;
    let failed = 0;

    // Test 1: CSP header generation
    const config = ContentSecurityPolicy.getConfig();
    const cspHeader = ContentSecurityPolicy.generateCSPHeader(config);
    if (cspHeader.includes("default-src 'self'") && cspHeader.includes("object-src 'none'")) {
      results.push('✅ CSP header generation: PASSED');
      passed++;
    } else {
      results.push(`❌ CSP header generation: FAILED (got: "${cspHeader.substring(0, 100)}...")`);
      failed++;
    }

    // Test 2: URL validation against CSP
    const selfUrl = `${window.location.origin}/safe-resource`;
    const selfUrlTest = ContentSecurityPolicy.isUrlAllowed(selfUrl, 'scriptSrc');
    if (selfUrlTest) {
      results.push('✅ Self URL validation: PASSED');
      passed++;
    } else {
      results.push('❌ Self URL validation: FAILED');
      failed++;
    }

    // Test 3: Dangerous URL blocking
    const dangerousUrl = 'javascript:alert("XSS")';
    const dangerousUrlTest = ContentSecurityPolicy.isUrlAllowed(dangerousUrl, 'scriptSrc');
    if (!dangerousUrlTest) {
      results.push('✅ Dangerous URL blocking: PASSED');
      passed++;
    } else {
      results.push('❌ Dangerous URL blocking: FAILED');
      failed++;
    }

    // Test 4: Font URL validation
    const fontUrl = 'https://fonts.googleapis.com/css2?family=Inter';
    const fontUrlTest = ContentSecurityPolicy.isUrlAllowed(fontUrl, 'fontSrc');
    if (fontUrlTest) {
      results.push('✅ Font URL validation: PASSED');
      passed++;
    } else {
      results.push('❌ Font URL validation: FAILED');
      failed++;
    }

    // Test 5: Nonce generation
    const nonce = ContentSecurityPolicy.generateNonce();
    if (nonce && nonce.length > 10 && !nonce.includes('<') && !nonce.includes('>')) {
      results.push('✅ Nonce generation: PASSED');
      passed++;
    } else {
      results.push(`❌ Nonce generation: FAILED (got: "${nonce}")`);
      failed++;
    }

    return { passed, failed, results };
  }

  /**
   * Test DOM protection measures
   */
  static testDOMProtection(): { passed: number; failed: number; results: string[] } {
    const results: string[] = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Check for CSP meta tag in document
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      results.push('✅ CSP meta tag present: PASSED');
      passed++;
    } else {
      results.push('❌ CSP meta tag present: FAILED');
      failed++;
    }

    // Test 2: Verify no inline scripts without nonce
    const inlineScripts = document.querySelectorAll('script:not([src]):not([nonce])');
    const hasInlineWithoutNonce = Array.from(inlineScripts).some(script => 
      script.textContent && script.textContent.trim().length > 0
    );
    if (!hasInlineWithoutNonce) {
      results.push('✅ No unsafe inline scripts: PASSED');
      passed++;
    } else {
      results.push('❌ No unsafe inline scripts: FAILED');
      failed++;
    }

    // Test 3: Check that external scripts are from allowed sources
    const externalScripts = document.querySelectorAll('script[src]');
    let allScriptsAllowed = true;
    Array.from(externalScripts).forEach(script => {
      const src = script.getAttribute('src');
      if (src && !ContentSecurityPolicy.isUrlAllowed(src, 'scriptSrc')) {
        allScriptsAllowed = false;
      }
    });
    if (allScriptsAllowed) {
      results.push('✅ External scripts from allowed sources: PASSED');
      passed++;
    } else {
      results.push('❌ External scripts from allowed sources: FAILED');
      failed++;
    }

    return { passed, failed, results };
  }

  /**
   * Run all security tests
   */
  static runAllTests(): {
    xss: { passed: number; failed: number; results: string[] };
    csp: { passed: number; failed: number; results: string[] };
    dom: { passed: number; failed: number; results: string[] };
    overall: { passed: number; failed: number; percentage: number };
  } {
    const xss = this.testXSSProtection();
    const csp = this.testCSPImplementation();
    const dom = this.testDOMProtection();

    const totalPassed = xss.passed + csp.passed + dom.passed;
    const totalFailed = xss.failed + csp.failed + dom.failed;
    const percentage = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);

    return {
      xss,
      csp,
      dom,
      overall: {
        passed: totalPassed,
        failed: totalFailed,
        percentage
      }
    };
  }

  /**
   * Generate security test report
   */
  static generateReport(): string {
    const results = this.runAllTests();
    
    let report = '\n=== SECURITY TEST REPORT ===\n\n';
    
    report += `Overall Score: ${results.overall.passed}/${results.overall.passed + results.overall.failed} (${results.overall.percentage}%)\n\n`;
    
    report += 'XSS Protection Tests:\n';
    results.xss.results.forEach(result => report += `  ${result}\n`);
    report += '\n';
    
    report += 'Content Security Policy Tests:\n';
    results.csp.results.forEach(result => report += `  ${result}\n`);
    report += '\n';
    
    report += 'DOM Protection Tests:\n';
    results.dom.results.forEach(result => report += `  ${result}\n`);
    report += '\n';
    
    if (results.overall.percentage >= 90) {
      report += '✅ SECURITY STATUS: EXCELLENT\n';
    } else if (results.overall.percentage >= 80) {
      report += '⚠️  SECURITY STATUS: GOOD (Some improvements needed)\n';
    } else if (results.overall.percentage >= 70) {
      report += '⚠️  SECURITY STATUS: FAIR (Multiple improvements needed)\n';
    } else {
      report += '❌ SECURITY STATUS: POOR (Immediate attention required)\n';
    }
    
    return report;
  }
}

export default SecurityTests;