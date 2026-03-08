import logger from './logger.js';

/**
 * PrivacyGuard: A lightweight filter to prevent PII from entering the Vector DB.
 * 
 * If a memory matches these patterns, it is rejected before an API call is ever made.
 */
const SENSITIVE_PATTERNS =[
  // US Social Security Number (Simple format: 000-00-0000)
  /\b\d{3}-\d{2}-\d{4}\b/,
  // Standard Credit Card Numbers (13-16 digits, with potential spaces/dashes)
  /\b(?:\d[ -]*?){13,16}\b/
  // You can add more Regex patterns here later (e.g., emails, phone numbers)
];

export function isCompliant(text) {
  const hasSensitiveData = SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
  
  if (hasSensitiveData) {
    logger.warn({ 
      action: 'privacy_guard', 
      status: 'rejected',
      text_length: text.length
    }, 'Memory rejected due to sensitive content detection.');
    return false;
  }
  
  return true;
}