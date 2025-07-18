/**
 * CSP Test Utility
 * Use this to verify that the Content Security Policy is working correctly
 */

import ContentSecurityPolicy from './contentSecurityPolicy';
import { config } from '../../config/environment';

export const testCSPConfiguration = () => {
  console.group('🧪 CSP Configuration Test');
  
  // Test 1: Check if CSP is applied
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') || 
                  document.querySelector('meta[http-equiv="Content-Security-Policy-Report-Only"]');
  
  if (cspMeta) {
    console.log('✅ CSP Meta Tag Found:', cspMeta.getAttribute('content'));
  } else {
    console.log('❌ CSP Meta Tag Not Found');
  }
  
  // Test 2: Check domain configuration
  const currentDomain = ContentSecurityPolicy.getCurrentDomain();
  const domainSources = ContentSecurityPolicy.getDomainSources();
  
  console.log('Current Domain:', currentDomain);
  console.log('Domain Sources:', domainSources);
  
  // Test 3: Check environment variables
  console.log('Environment Variables:');
  console.log('- VITE_APP_URL:', import.meta.env.VITE_APP_URL);
  console.log('- VITE_CSP_REPORT_ONLY:', import.meta.env.VITE_CSP_REPORT_ONLY);
  console.log('- VITE_CSP_ADDITIONAL_CONNECT_SRC:', import.meta.env.VITE_CSP_ADDITIONAL_CONNECT_SRC);
  
  // Test 4: Check config
  console.log('App Config URL:', config.app.url);
  console.log('App Environment:', config.app.environment);
  
  // Test 5: Generate and show CSP header
  const cspConfig = ContentSecurityPolicy.getConfig();
  const cspHeader = ContentSecurityPolicy.generateCSPHeader(cspConfig);
  console.log('Generated CSP Header:', cspHeader);
  
  console.groupEnd();
  
  return {
    cspApplied: !!cspMeta,
    currentDomain,
    domainSources,
    cspHeader,
    environment: config.app.environment,
    appUrl: config.app.url
  };
};

// Auto-run test if this file is imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testCSPConfiguration);
  } else {
    testCSPConfiguration();
  }
} 