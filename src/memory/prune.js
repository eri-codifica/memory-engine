import client from './db.js';
import logger from '../utils/logger.js';

const COLLECTION_NAME = 'BotMemory';

/**
 * Sweeps the database and deletes any memories where 'expires_at' is in the past.
 * Designed to be triggered by a free Google Cloud Scheduler cron job.
 */
export async function pruneExpiredMemories() {
  const now = new Date().toISOString();
  logger.info('Initiating Memory Pruning Cycle...');

  try {
    // Qdrant Native Delete: Find all points where expires_at < NOW
    const response = await client.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must:[
          {
            key: 'expires_at',
            range: {
              lt: now // Less than current ISO string
            }
          }
        ]
      }
    });

    logger.info({ 
      action: 'prune_memories', 
      status: response.status 
    }, 'Memory Pruning Cycle Complete');
    
    return { success: true, status: response.status };
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to prune expired memories');
    throw error;
  }
}