/**
 * Standalone Groq Client Test
 * Tests groqClient.js directly with proper environment variable loading
 */

import { config } from 'dotenv';
import { groqClient } from './groqClient.js';

// Load environment variables from project root
config({ path: '../../../.env' });

console.log('🔍 Testing GroqClient directly...\n');

// Test the groqClient singleton
async function testGroqClient() {
  try {
    console.log('1. GroqClient Instance:');
    console.log(`   API Key loaded: ${groqClient.apiKey ? `${groqClient.apiKey.substring(0, 10)}...` : 'undefined'}`);
    console.log(`   Demo Mode: ${groqClient.demoMode}`);
    console.log(`   Model: ${groqClient.model}`);
    console.log();

    if (groqClient.demoMode) {
      console.log('⚠️  Still in demo mode. Environment variable not loaded properly.');
      console.log('   Trying manual API key setup...');
      
      // Try to manually set the API key
      const manualKey = process.env.REACT_APP_GROQ_API_KEY;
      console.log(`   Manual key check: ${manualKey ? `${manualKey.substring(0, 10)}...` : 'still undefined'}`);
      
      if (manualKey) {
        groqClient.apiKey = manualKey;
        groqClient.demoMode = false;
        console.log('   ✅ API key manually set, demo mode disabled');
      }
    }

    console.log('2. Testing AI Generation:');
    
    const response = await groqClient.generateCompletion(
      'What is binary search?',
      {
        systemPrompt: 'You are an expert educational AI that uses Socratic teaching methods. Never give direct answers, always ask guiding questions.',
        temperature: 0.7
      }
    );

    console.log('✅ Response received:');
    console.log(`Content: ${response.content}`);
    console.log(`Model: ${response.model}`);
    console.log(`Tokens: ${response.usage?.total_tokens || 'N/A'}`);
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testGroqClient();