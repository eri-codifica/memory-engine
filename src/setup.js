import client from './memory/db.js';
import logger from './utils/logger.js';

const COLLECTION_NAME = 'BotMemory';

async function initializeDatabase() {
  try {
    const response = await client.getCollections();
    const collectionExists = response.collections.some(c => c.name === COLLECTION_NAME);

    if (collectionExists) {
      logger.info(`Collection '${COLLECTION_NAME}' already exists. Setup complete.`);
      return;
    }

    logger.info(`Collection '${COLLECTION_NAME}' not found. Creating...`);

    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 768, // Exact dimension size for Gemini text-embedding-004
        distance: 'Cosine',
      },
      // Optimizations for Free Tier limits
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });

    // Create an index on user_id to make tenant filtering O(1) fast
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'user_id',
      field_schema: 'keyword',
    });

    logger.info(`✅ Collection '${COLLECTION_NAME}' created successfully with user_id index!`);
  } catch (error) {
    logger.fatal({ error: error.message }, 'Failed to initialize Qdrant database.');
    process.exit(1);
  }
}

initializeDatabase();