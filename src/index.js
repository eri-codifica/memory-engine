import express from 'express';
import logger from './utils/logger.js';
import { saveMemory } from './memory/save.js';
import { searchMemory } from './memory/search.js';
import { pruneExpiredMemories } from './memory/prune.js';

const app = express();
app.use(express.json());

// --- SECURITY MIDDLEWARE ---
const ENGINE_API_KEY = process.env.ENGINE_API_KEY;

app.use((req, res, next) => {
  // Allow unauthenticated pings to the health endpoint
  if (req.path === '/health') {
    return next();
  }

  const providedKey = req.headers['x-api-key'];

  // Safety check: Ensure the server admin actually configured the secret
  if (!ENGINE_API_KEY) {
    logger.error('CRITICAL: ENGINE_API_KEY is not configured on the server.');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // Auth check
  if (!providedKey || providedKey !== ENGINE_API_KEY) {
    logger.warn({ path: req.path, ip: req.ip }, 'Unauthorized access attempt rejected.');
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing x-api-key header' });
  }

  next(); // Passed! Continue to the requested route.
});
// ---------------------------

// Basic health check for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'memory-engine' });
});

// Endpoint: Save a Memory
app.post('/memory/save', async (req, res) => {
  try {
    const { text, metadata } = req.body;
    if (!text || !metadata || !metadata.user_id) {
      return res.status(400).json({ error: 'Missing required fields: text, metadata.user_id' });
    }

    const result = await saveMemory(text, metadata);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Endpoint: Search Memories
app.post('/memory/search', async (req, res) => {
  try {
    const { query, user_id, session_id } = req.body;
    if (!query || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: query, user_id' });
    }

    const contextString = await searchMemory(query, user_id, session_id);
    res.status(200).json({ context: contextString });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Endpoint: Trigger Garbage Collection (Cron)
app.post('/system/prune', async (req, res) => {
  try {
    const result = await pruneExpiredMemories();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Pruning Failed' });
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`🚀 Memory Engine is running and listening on port ${PORT}`);
});