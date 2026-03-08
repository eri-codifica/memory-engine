import { generateEmbedding } from './gemini.js';
import logger from './logger.js';

async function test() {
  console.log("--- STARTING GEMINI ISOLATION TEST ---");
  try {
    const text = "Testing the embedding connection.";
    console.log(`Attempting to embed: "${text}"`);
    
    const vector = await generateEmbedding(text);
    
    console.log("✅ SUCCESS!");
    console.log(`Vector length: ${vector.length}`);
    console.log(`First 3 values: ${vector.slice(0, 3)}`);
  } catch (error) {
    console.log("❌ FAILURE");
    console.error("Full Error Object:", error);
    if (error.response) {
        console.error("API Response:", await error.response.json());
    }
  }
}

test();
