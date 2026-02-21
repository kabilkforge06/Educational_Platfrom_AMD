// Import and test groqClient status
import { groqClient } from './services/inference/groqClient.js';

console.log('🔧 Debug: Environment variables at startup');
console.log('API Key:', process.env.REACT_APP_GROQ_API_KEY ? 
  `${process.env.REACT_APP_GROQ_API_KEY.substring(0, 10)}...` : 'undefined');

console.log('🤖 GroqClient Status:');
console.log('- Demo Mode:', groqClient.demoMode);
console.log('- Model:', groqClient.model);
console.log('- API Key loaded:', groqClient.apiKey ? 'Yes' : 'No');

// Test direct API call
async function testDirectConnection() {
  try {
    console.log('🧪 Testing direct API connection...');
    const result = await groqClient.generateCompletion('Hello, can you help with programming?', {
      systemPrompt: 'You are an educational AI assistant using Socratic methods.'
    });
    console.log('✅ Direct API test successful:', result.content);
  } catch (error) {
    console.log('❌ Direct API test failed:', error.message);
  }
}

testDirectConnection();