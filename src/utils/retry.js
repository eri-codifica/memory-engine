import logger from './logger.js';

/**
 * Executes an async function with exponential backoff and jitter.
 */
export async function withRetry(operationName, operation, maxRetries = 3, baseDelayMs = 1000) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      // If it's a hard error (like a 400 Bad Request), don't bother retrying
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        logger.error({ operation: operationName, error: error.message }, 'Deterministic error. Failing fast.');
        throw error;
      }
      
      if (attempt >= maxRetries) {
        logger.error({ operation: operationName, error: error.message, attempts: attempt }, 'Operation completely failed after max retries.');
        throw error;
      }
      
      // Calculate exponential backoff: baseDelay * 2^(attempt-1)
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      // Add Jitter: random delay between 0 and 200ms to prevent thundering herd
      const jitter = Math.random() * 200;
      const delayMs = exponentialDelay + jitter;
      
      logger.warn({ 
        operation: operationName, 
        attempt: attempt, 
        delay_ms: Math.round(delayMs),
        error: error.message
      }, 'Transient failure. Retrying...');
      
      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}