import client from './db.js';
import { generateEmbedding } from '../utils/gemini.js';
import logger from '../utils/logger.js';
import { performance } from 'perf_hooks';

const COLLECTION_NAME = 'BotMemory';
// App-Side Limits
const MAX_MEMORY_CHARS = 6000; // ~1500 tokens
const NOISE_THRESHOLD = 0.25; // Minimum vector similarity score

/**
 * Retrieves, reranks, and concatenates memories within a strict budget.
 */
export async function searchMemory(query, userId, sessionId = null) {
  const start = performance.now();

  try {
    // 1. Embed the search query
    const queryVector = await generateEmbedding(query);

    // 2. Build the filter (Strict Tenancy)
    const filterConditions = [{ key: 'user_id', match: { value: userId } }];
    // Optional: Boost results from the current session if provided
    if (sessionId) {
       // We don't strictly filter by session, but we could. For now, we search all user history.
    }

    // 3. Fetch Top Candidates (Oversampling for our reranker)
    const searchResults = await client.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: 10,
      filter: { must: filterConditions },
      with_payload: true,
      with_vector: false // Save network bandwidth
    });

    if (searchResults.length === 0) return "";

    // 4. App-Side Reranking (Recency + Importance + Semantic Match)
    const now = Date.now();
    const reranked = searchResults.map(hit => {
      const vectorScore = hit.score;
      const importance = (hit.payload.importance || 5) / 10;
      
      const memoryTime = new Date(hit.payload.timestamp).getTime();
      const daysOld = (now - memoryTime) / (1000 * 60 * 60 * 24);
      
      // Time Decay: Max penalty caps at 0.5 (so old but highly relevant facts survive)
      const decayFactor = Math.max(0.5, 1 - (daysOld * 0.05)); 
      
      const finalScore = (vectorScore * 0.7 + importance * 0.3) * decayFactor;

      return {
        text: hit.payload.content_snippet,
        timestamp: hit.payload.timestamp,
        score: finalScore
      };
    })
    .filter(mem => mem.score >= NOISE_THRESHOLD) // Drop garbage
    .sort((a, b) => b.score - a.score); // Sort Descending

    // 5. Token Budget Enforcer
    let accumulatedContext = "";
    let memoryCount = 0;

    for (const mem of reranked) {
      const entry = `[${mem.timestamp}]: ${mem.text}\n`;
      if ((accumulatedContext.length + entry.length) > MAX_MEMORY_CHARS) {
        logger.debug({ action: 'budget_enforced', limit: MAX_MEMORY_CHARS }, 'Memory context budget hit.');
        break;
      }
      accumulatedContext += entry;
      memoryCount++;
    }

    // 6. Telemetry Logging
    logger.info({
      event: 'rag_retrieval_metric',
      user_id: userId,
      query_length: query.length,
      latency_ms: Math.round(performance.now() - start),
      results_found: memoryCount,
      top_score: reranked[0]?.score?.toFixed(4) || 0
    }, 'Memory retrieved successfully');

    return accumulatedContext.trim();

  } catch (error) {
    logger.error({ action: 'search_memory', error: error.message }, 'Read operation failed');
    return ""; // Fail gracefully, return empty context
  }
}