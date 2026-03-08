import express from 'express';
import logger from './utils/logger.js';
import { saveMemory } from './memory/save.js';
import { searchMemory } from './memory/search.js';
import { pruneExpiredMemories } from './memory/prune.js';

const app = express();
app.use(express.json());

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
    // In production, you would add a secret header check here so only GCP Scheduler can trigger this
    const result = await pruneExpiredMemories();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Pruning Failed' });
  }
});

// Start the server (Cloud Run injects the PORT env variable automatically)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`🚀 Memory Engine is running and listening on port ${PORT}`);
});