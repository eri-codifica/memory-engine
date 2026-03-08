import { v5 as uuidv5 } from 'uuid';
import client from './db.js';
import { generateEmbedding } from '../utils/gemini.js';
import { isCompliant } from '../utils/privacyGuard.js';
import logger from '../utils/logger.js';

// A static namespace UUID for our memory engine deduplication
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
const COLLECTION_NAME = 'BotMemory';

/**
 * Saves a memory to Qdrant after passing compliance and deduplication checks.
 */
export async function saveMemory(text, metadata = {}) {
  // 1. Privacy Guard (Edge Firewall)
  if (!isCompliant(text)) {
    return { status: 'rejected', reason: 'privacy_violation' };
  }

  // 2. Strict Tenancy Check
  if (!metadata.user_id) {
    logger.error('Attempted to save memory without a user_id.');
    throw new Error('user_id is required in metadata');
  }

  try {
    // 3. Deduplication: Hash the UserID + Text to prevent storing identical memories
    const uniqueId = uuidv5(`${metadata.user_id}_${text.trim().toLowerCase()}`, NAMESPACE);

    // 4. Lifecycle Calculation
    const importance = metadata.importance || 5;
    let expiresAt = new Date();
    if (importance <= 3) expiresAt.setDate(expiresAt.getDate() + 7); // Trivial: 7 days
    else if (importance <= 8) expiresAt.setDate(expiresAt.getDate() + 30); // Normal: 30 days
    else expiresAt = null; // Critical (9-10): Keep forever

    // 5. Vectorization (Calls Gemini via our Retry Wrapper)
    const vector = await generateEmbedding(text);

    // 6. Prepare Payload (Stored as JSON, NOT vectorized)
    const payload = {
      content_snippet: text,
      user_id: metadata.user_id,
      session_id: metadata.session_id || 'global',
      source_type: metadata.source_type || 'user_chat',
      importance: importance,
      timestamp: new Date().toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null
    };

    // 7. Execute Database Write
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: uniqueId,
          vector: vector,
          payload: payload
        }
      ]
    });

    logger.info({ action: 'save_memory', user_id: metadata.user_id, importance }, 'Memory successfully ingested');
    return { status: 'success', id: uniqueId };

  } catch (error) {
    // Serverless DLQ Concept: Log CRITICAL so it alerts GCP Cloud Logging
    logger.fatal({ 
      action: 'save_memory_failed', 
      text: text,
      user_id: metadata.user_id,
      error: error.message 
    }, 'Memory write failed. Payload captured in logs for DLQ recovery.');
    
    return { status: 'error', reason: error.message };
  }
}