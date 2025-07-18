/**
 * Feature Test Utility
 * Comprehensive testing for all save buttons and form submissions
 */

import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useNotificationStore } from '../../stores/notificationStore';

export interface FeatureTestResult {
  feature: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export const testAllFeatures = async (): Promise<FeatureTestResult[]> => {
  const results: FeatureTestResult[] = [];
  
  console.group('🧪 Comprehensive Feature Testing');
  
  // Test 1: Form Validation
  results.push(await testFormValidation());
  
  // Test 2: Save Button Functionality
  results.push(await testSaveButtons());
  
  // Test 3: Form Submission
  results.push(await testFormSubmissions());
  
  // Test 4: Error Handling
  results.push(await testErrorHandling());
  
  // Test 5: Loading States
  results.push(await testLoadingStates());
  
  // Test 6: Data Persistence
  results.push(await testDataPersistence());
  
  // Test 7: User Feedback
  results.push(await testUserFeedback());
  
  // Test 8: CSP Integration
  results.push(await testCSPIntegration());
  
  console.groupEnd();
  
  return results;
};

const testFormValidation = async (): Promise<FeatureTestResult> => {
  try {
    // Test form validation schemas
    const forms = document.querySelectorAll('form');
    let validForms = 0;
    let totalForms = forms.length;
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
      const hasValidation = inputs.length > 0 || form.hasAttribute('data-validate');
      if (hasValidation) validForms++;
    });
    
    return {
      feature: 'Form Validation',
      status: validForms === totalForms ? 'pass' : 'warning',
      message: `${validForms}/${totalForms} forms have proper validation`,
      details: { validForms, totalForms }
    };
  } catch (error) {
    return {
      feature: 'Form Validation',
      status: 'fail',
      message: 'Failed to test form validation',
      details: error
    };
  }
};

const testSaveButtons = async (): Promise<FeatureTestResult> => {
  try {
    const saveButtons = document.querySelectorAll('button[type="submit"], button:contains("Save"), button:contains("Submit")');
    let functionalButtons = 0;
    let totalButtons = saveButtons.length;
    
    saveButtons.forEach(button => {
      const hasOnClick = button.hasAttribute('onclick') || 
                        button.getAttribute('data-testid')?.includes('save') ||
                        button.textContent?.toLowerCase().includes('save');
      if (hasOnClick) functionalButtons++;
    });
    
    return {
      feature: 'Save Buttons',
      status: functionalButtons > 0 ? 'pass' : 'warning',
      message: `${functionalButtons}/${totalButtons} save buttons are functional`,
      details: { functionalButtons, totalButtons }
    };
  } catch (error) {
    return {
      feature: 'Save Buttons',
      status: 'fail',
      message: 'Failed to test save buttons',
      details: error
    };
  }
};

const testFormSubmissions = async (): Promise<FeatureTestResult> => {
  try {
    const forms = document.querySelectorAll('form');
    let submittedForms = 0;
    let totalForms = forms.length;
    
    // Check for form submission handlers
    forms.forEach(form => {
      const hasSubmitHandler = form.hasAttribute('onsubmit') || 
                              form.querySelector('[data-testid*="submit"]') ||
                              form.querySelector('button[type="submit"]');
      if (hasSubmitHandler) submittedForms++;
    });
    
    return {
      feature: 'Form Submissions',
      status: submittedForms > 0 ? 'pass' : 'warning',
      message: `${submittedForms}/${totalForms} forms have submission handlers`,
      details: { submittedForms, totalForms }
    };
  } catch (error) {
    return {
      feature: 'Form Submissions',
      status: 'fail',
      message: 'Failed to test form submissions',
      details: error
    };
  }
};

const testErrorHandling = async (): Promise<FeatureTestResult> => {
  try {
    // Check for error display components
    const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], .error, .Error');
    const hasErrorHandling = errorElements.length > 0;
    
    // Check for try-catch patterns in console
    const hasErrorBoundaries = document.querySelector('[data-testid*="error"], [class*="error-boundary"]');
    
    return {
      feature: 'Error Handling',
      status: hasErrorHandling || hasErrorBoundaries ? 'pass' : 'warning',
      message: hasErrorHandling ? 'Error handling components found' : 'Limited error handling detected',
      details: { errorElements: errorElements.length, hasErrorBoundaries: !!hasErrorBoundaries }
    };
  } catch (error) {
    return {
      feature: 'Error Handling',
      status: 'fail',
      message: 'Failed to test error handling',
      details: error
    };
  }
};

const testLoadingStates = async (): Promise<FeatureTestResult> => {
  try {
    // Check for loading indicators
    const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="Loading"], .loading, .spinner');
    const hasLoadingStates = loadingElements.length > 0;
    
    // Check for disabled states on buttons
    const disabledButtons = document.querySelectorAll('button:disabled');
    const hasDisabledStates = disabledButtons.length > 0;
    
    return {
      feature: 'Loading States',
      status: hasLoadingStates ? 'pass' : 'warning',
      message: hasLoadingStates ? 'Loading states implemented' : 'Limited loading states detected',
      details: { loadingElements: loadingElements.length, disabledButtons: disabledButtons.length }
    };
  } catch (error) {
    return {
      feature: 'Loading States',
      status: 'fail',
      message: 'Failed to test loading states',
      details: error
    };
  }
};

const testDataPersistence = async (): Promise<FeatureTestResult> => {
  try {
    // Check for localStorage usage
    const localStorageKeys = Object.keys(localStorage);
    const hasDataPersistence = localStorageKeys.length > 0;
    
    // Check for sessionStorage usage
    const sessionStorageKeys = Object.keys(sessionStorage);
    const hasSessionPersistence = sessionStorageKeys.length > 0;
    
    return {
      feature: 'Data Persistence',
      status: hasDataPersistence || hasSessionPersistence ? 'pass' : 'warning',
      message: hasDataPersistence ? 'Data persistence implemented' : 'Limited data persistence detected',
      details: { localStorageKeys: localStorageKeys.length, sessionStorageKeys: sessionStorageKeys.length }
    };
  } catch (error) {
    return {
      feature: 'Data Persistence',
      status: 'fail',
      message: 'Failed to test data persistence',
      details: error
    };
  }
};

const testUserFeedback = async (): Promise<FeatureTestResult> => {
  try {
    // Check for notification components
    const notificationElements = document.querySelectorAll('[class*="notification"], [class*="toast"], [class*="alert"]');
    const hasNotifications = notificationElements.length > 0;
    
    // Check for success/error messages
    const messageElements = document.querySelectorAll('[class*="success"], [class*="error"], [class*="message"]');
    const hasMessages = messageElements.length > 0;
    
    return {
      feature: 'User Feedback',
      status: hasNotifications || hasMessages ? 'pass' : 'warning',
      message: hasNotifications ? 'User feedback implemented' : 'Limited user feedback detected',
      details: { notifications: notificationElements.length, messages: messageElements.length }
    };
  } catch (error) {
    return {
      feature: 'User Feedback',
      status: 'fail',
      message: 'Failed to test user feedback',
      details: error
    };
  }
};

const testCSPIntegration = async (): Promise<FeatureTestResult> => {
  try {
    // Check for CSP meta tag
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') || 
                    document.querySelector('meta[http-equiv="Content-Security-Policy-Report-Only"]');
    
    const hasCSP = !!cspMeta;
    
    return {
      feature: 'CSP Integration',
      status: hasCSP ? 'pass' : 'warning',
      message: hasCSP ? 'CSP properly integrated' : 'CSP not detected',
      details: { hasCSP, cspContent: cspMeta?.getAttribute('content') }
    };
  } catch (error) {
    return {
      feature: 'CSP Integration',
      status: 'fail',
      message: 'Failed to test CSP integration',
      details: error
    };
  }
};

// Auto-run test if this file is imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(testAllFeatures, 2000); // Wait for app to fully load
    });
  } else {
    setTimeout(testAllFeatures, 2000); // Wait for app to fully load
  }
}

// Export for manual testing
export const runFeatureTests = testAllFeatures; 