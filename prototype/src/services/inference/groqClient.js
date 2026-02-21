/**
 * Groq Client - JavaScript interface for Groq AI inference
 * Works with Python backend server for actual API calls
 */

class GroqClient {
  constructor(apiKey = process.env.REACT_APP_GROQ_API_KEY) {
    this.apiKey = apiKey;
    this.model = 'llama3-70b-8192';
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.demoMode = !apiKey; // Automatic fallback to demo mode
    this.pythonServerUrl = 'http://localhost:5000/api';
    
    // Log initialization status
    console.log('🔧 GroqClient initialized:', {
      model: this.model,
      demoMode: this.demoMode,
      apiKeyLoaded: !!this.apiKey
    });
  }

  /**
   * Check if Python server is available
   */
  async checkServerHealth() {
    try {
      const response = await fetch(`${this.pythonServerUrl}/health`);
      return response.ok;
    } catch (error) {
      console.warn('🔋 Python server not available:', error.message);
      return false;
    }
  }

  /**
   * Generate completion via Python backend
   */
  async generateCompletion(prompt, options = {}) {
    const serverHealthy = await this.checkServerHealth();
    
    if (!serverHealthy && this.demoMode) {
      return this.getDemoResponse(prompt);
    }

    try {
      const response = await fetch(`${this.pythonServerUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          options: {
            model: this.model,
            ...options
          }
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        content: data.response,
        model: data.model,
        usage: data.usage
      };
    } catch (error) {
      console.error('❌ Groq generation error:', error);
      
      if (this.demoMode) {
        return this.getDemoResponse(prompt);
      }
      
      throw error;
    }
  }

  /**
   * Generate structured response via Python backend
   */
  async generateStructured(prompt, options = {}) {
    const serverHealthy = await this.checkServerHealth();
    
    if (!serverHealthy && this.demoMode) {
      return this.getDemoStructuredResponse(prompt);
    }

    try {
      const response = await fetch(`${this.pythonServerUrl}/generate-structured`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          options: {
            model: this.model,
            ...options
          }
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        content: data.response,
        structured: data.structured,
        model: data.model
      };
    } catch (error) {
      console.error('❌ Groq structured generation error:', error);
      
      if (this.demoMode) {
        return this.getDemoStructuredResponse(prompt);
      }
      
      throw error;
    }
  }

  /**
   * Demo fallback response
   */
  getDemoResponse(prompt) {
    console.log('🎭 Using demo mode response');
    return {
      content: `Demo response for: ${prompt.substring(0, 50)}...`,
      model: 'demo-mode',
      usage: { tokens: 0 }
    };
  }

  /**
   * Demo structured fallback response
   */
  getDemoStructuredResponse(prompt) {
    console.log('🎭 Using demo mode structured response');
    return {
      content: `Demo structured response for: ${prompt.substring(0, 50)}...`,
      structured: {
        summary: 'Demo response',
        confidence: 0.8
      },
      model: 'demo-mode'
    };
  }

  /**
   * Get client status
   */
  getStatus() {
    return {
      model: this.model,
      demoMode: this.demoMode,
      apiKeyLoaded: !!this.apiKey,
      baseURL: this.baseURL
    };
  }
}

// Create and export singleton instance
const groqClient = new GroqClient();

export { groqClient, GroqClient };