import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function list() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const modelResponse = await genAI.getGenerativeModel({ model: "gemini-pro" }); 
    // We actually need to use the model manager to list, but the SDK doesn't expose listModels easily in all versions.
    // Let's try a direct fetch which is more reliable for debugging.
    
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    console.log("--- AVAILABLE MODELS ---");
    if (data.models) {
        const embeddings = data.models.filter(m => m.name.includes('embed'));
        embeddings.forEach(m => console.log(m.name));
        
        if (embeddings.length === 0) {
            console.log("No embedding models found! (This is the issue)");
            console.log("All models:", data.models.map(m => m.name));
        }
    } else {
        console.log("Error:", data);
    }
  } catch (e) {
    console.error(e);
  }
}
list();
