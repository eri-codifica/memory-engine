import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from './retry.js';
import logger from './logger.js';
import 'dotenv/config';

if (!process.env.GEMINI_API_KEY) {
  logger.fatal('Missing GEMINI_API_KEY in environment variables.');
  process.exit(1);
}

// Initialize the Google SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates a vector embedding for a given text string.
 * Wrapped in our retry logic to handle rate limits automatically.
 */
export async function generateEmbedding(text) {
  return await withRetry('gemini_embed', async () => {
    // FIX: Switched to 'embedding-001' which is the stable, widely available 768-dim model
    // If 'text-embedding-004' works for you later, you can swap it back, but this is safer for now.
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values; // Returns the raw array of floats
  });
}