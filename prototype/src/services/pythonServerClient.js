/**
 * Python Server Client
 * Connects React frontend to Python Groq backend server
 */

class PythonServerClient {
  constructor() {
    this.baseUrl = 'http://localhost:5000/api';
    this.isHealthy = false;
    this.checkServerHealth();
  }

  async checkServerHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      this.isHealthy = response.ok;
      console.log(`🔋 Python server health: ${this.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    } catch (error) {
      this.isHealthy = false;
      console.log('🔋 Python server health: ❌ Not running');
    }
  }

  async socraticQuestion(question, studentId = 'student_001', metadata = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/socratic/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question,
          studentId,
          metadata
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'socratic',
        content: data.guidance,
        model: data.model
      };
    } catch (error) {
      throw new Error(`Socratic service error: ${error.message}`);
    }
  }

  async vivaValidation(content, studentId = 'student_001') {
    try {
      const response = await fetch(`${this.baseUrl}/viva/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content, 
          studentId
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'viva',
        requiresViva: data.data.requiresViva,
        questions: data.data.questions,
        complexity: data.data.complexity
      };
    } catch (error) {
      throw new Error(`Viva service error: ${error.message}`);
    }
  }

  async translateConcept(concept, targetLanguage = 'en', culturalContext = false) {
    try {
      const response = await fetch(`${this.baseUrl}/translate/concept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concept,
          targetLanguage,
          culturalContext
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'translation',
        translation: data.translation,
        targetLanguage: data.targetLanguage
      };
    } catch (error) {
      throw new Error(`Translation service error: ${error.message}`);
    }
  }

  async evaluateWithRubric(content, mode = 'academic') {
    try {
      const response = await fetch(`${this.baseUrl}/rubric/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          mode
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'rubric',
        evaluation: data.evaluation,
        mode: data.mode
      };
    } catch (error) {
      throw new Error(`Rubric service error: ${error.message}`);
    }
  }

  async getDailyReview(studentId = 'student_001') {
    try {
      const response = await fetch(`${this.baseUrl}/schedule/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'daily_review',
        ...data.data
      };
    } catch (error) {
      throw new Error(`Daily review service error: ${error.message}`);
    }
  }

  async clearSession(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/session/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Clear session error:', error);
      return false;
    }
  }

  async uploadDocument(file, studentId = 'student_001') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', studentId);

      const response = await fetch(`${this.baseUrl}/upload/document`, {
        method: 'POST',
        body: formData
        // Don't set Content-Type header - browser will set it with boundary
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'upload',
        ...data.data
      };
    } catch (error) {
      throw new Error(`Upload error: ${error.message}`);
    }
  }

  async askDocumentQuestion(question, studentId = 'student_001') {
    try {
      const response = await fetch(`${this.baseUrl}/rag/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question,
          studentId
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'document_qa',
        answer: data.answer,
        sources: data.sources,
        num_sources: data.num_sources
      };
    } catch (error) {
      throw new Error(`Document Q&A error: ${error.message}`);
    }
  }

  async getUploadSummary(studentId = 'student_001') {
    try {
      const response = await fetch(`${this.baseUrl}/rag/summary?studentId=${studentId}`, {
        method: 'GET'
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'summary',
        ...data.data
      };
    } catch (error) {
      throw new Error(`Get summary error: ${error.message}`);
    }
  }

  async generateCurriculum(title, objective = '') {
    try {
      const response = await fetch(`${this.baseUrl}/course/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          objective
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        type: 'curriculum',
        ...data.data
      };
    } catch (error) {
      throw new Error(`Curriculum generation error: ${error.message}`);
    }
  }
}

// Export singleton instance
export const pythonServerClient = new PythonServerClient();
export default PythonServerClient;