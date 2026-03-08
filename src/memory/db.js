import { QdrantClient } from '@qdrant/js-client-rest';
import 'dotenv/config'; // Loads the .env file locally

// Verify critical environment variables exist before attempting to connect
if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
  console.error(JSON.stringify({
    severity: 'CRITICAL',
    service: 'memory-engine',
    message: 'Missing QDRANT_URL or QDRANT_API_KEY in environment variables.'
  }));
  process.exit(1);
}

// Initialize the Qdrant Client
const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export default client;