import client from './memory/db.js';
import logger from './utils/logger.js';

const COLLECTION_NAME = 'BotMemory';

async function initializeDatabase() {
  try {
    const response = await client.getCollections();
    const collectionExists = response.collections.some(c => c.name === COLLECTION_NAME);

    // 1. DELETE EXISTING MALFORMED COLLECTION
    // Since we are in dev/setup phase and the dimensions were wrong, we must wipe it.
    if (collectionExists) {
      logger.warn(`Collection '${COLLECTION_NAME}' exists but might have wrong dimensions. Deleting to reset...`);
      await client.deleteCollection(COLLECTION_NAME);
      logger.info(`Deleted old '${COLLECTION_NAME}'.`);
    }

    logger.info(`Creating '${COLLECTION_NAME}' with correct dimensions...`);

    // 2. CREATE WITH 3072 DIMENSIONS
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 3072, // MATCHING THE DEBUG OUTPUT EXACTLY
        distance: 'Cosine',
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });

    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'user_id',
      field_schema: 'keyword',
    });

    logger.info(`✅ Collection '${COLLECTION_NAME}' created successfully with 3072 dimensions!`);
  } catch (error) {
    logger.fatal({ error: error.message }, 'Failed to initialize Qdrant database.');
    process.exit(1);
  }
}

initializeDatabase();