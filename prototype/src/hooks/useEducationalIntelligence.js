/**
 * Educational Intelligence Hook - Python Backend Version
 * Provides access to all AI features through secure Python backend
 */

import { useState, useCallback, useEffect } from 'react';
import { pythonServerClient } from '../services/pythonServerClient';

export const useEducationalIntelligence = (studentId = 'student_001') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dailyQueue, setDailyQueue] = useState([]);
  const [isServerHealthy, setIsServerHealthy] = useState(false);

  // Check Python server health on mount
  useEffect(() => {
    const checkHealth = async () => {
      setIsServerHealthy(pythonServerClient.isHealthy);
    };
    checkHealth();
  }, []);

  /**
   * Universal sendMessage method that routes to appropriate service
   */
  const sendMessage = useCallback(async (message, panel = 'mentor') => {
    setLoading(true);
    setError(null);

    try {
      let response;
      
      switch (panel) {
        case 'mentor':
          // Socratic coaching
          response = await pythonServerClient.socraticQuestion(message, studentId);
          break;
          
        case 'lab':
          // Viva validation
          response = await pythonServerClient.vivaValidation(message, studentId);
          break;
          
        case 'analytics': 
          // Rubric evaluation
          response = await pythonServerClient.evaluateWithRubric(message, 'academic');
          break;
          
        case 'goals':
          // Daily review
          response = await pythonServerClient.getDailyReview(studentId);
          break;
          
        case 'learn':
          // Basic translation (default to cultural context)
          response = await pythonServerClient.translateConcept(message, 'en', true);
          break;
          
        default:
          // Default to socratic coaching
          response = await pythonServerClient.socraticQuestion(message, studentId);
      }
      
      setLoading(false);
      return response;
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 1: Socratic Coach - Ask questions and get guidance (NOT answers)
   */
  const askQuestion = useCallback(async (question, metadata = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.socraticQuestion(question, studentId, metadata);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 2: Mini-Viva - Submit work for validation
   */
  const submitWork = useCallback(async (content, metadata = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.vivaValidation(content, studentId);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 3: Concept Translation
   */
  const translateConcept = useCallback(async (conceptOrOptions, targetLanguage = 'en', culturalContext = false) => {
    setLoading(true);
    setError(null);

    try {
      // Handle both object parameter and separate parameters
      let concept, lang, context;
      if (typeof conceptOrOptions === 'object' && conceptOrOptions !== null) {
        // Object parameter format: { concept, targetLanguage, culturalContext, ... }
        concept = conceptOrOptions.concept;
        lang = conceptOrOptions.targetLanguage || 'en';
        context = conceptOrOptions.culturalContext || false;
      } else {
        // Separate parameters format
        concept = conceptOrOptions;
        lang = targetLanguage;
        context = culturalContext;
      }

      const response = await pythonServerClient.translateConcept(concept, lang, context);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * FEATURE 4: Rubric Evaluation
   */
  const evaluateWork = useCallback(async (content, mode = 'academic') => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.evaluateWithRubric(content, mode);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * FEATURE 5: Daily Review - Spaced repetition scheduler
   */
  const getDailyReview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.getDailyReview(studentId);
      setDailyQueue(response.highPriority || []);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * Clear session data
   */
  const clearSession = useCallback(async () => {
    try {
      await pythonServerClient.clearSession(studentId);
      setDailyQueue([]);
      setError(null);
    } catch (err) {
      console.error('Clear session error:', err);
    }
  }, [studentId]);

  /**
   * FEATURE 6: Upload Study Materials
   */
  const uploadDocument = useCallback(async (file) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.uploadDocument(file, studentId);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 7: Ask Questions About Documents
   */
  const askDocumentQuestion = useCallback(async (question) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.askDocumentQuestion(question, studentId);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * Get Upload Summary
   */
  const getUploadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.getUploadSummary(studentId);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 8: Generate AI Curriculum for Custom Courses
   */
  const generateCurriculum = useCallback(async (title, objective = '') => {
    setLoading(true);
    setError(null);

    try {
      const response = await pythonServerClient.generateCurriculum(title, objective);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return {
    // Core methods
    sendMessage,
    askQuestion, 
    submitWork,
    translateConcept,
    evaluateWork,
    getDailyReview,
    clearSession,
    uploadDocument,
    askDocumentQuestion,
    getUploadSummary,
    generateCurriculum,
    
    // State
    loading,
    error,
    dailyQueue,
    isServerHealthy,
    
    // Legacy compatibility
    answerVivaQuestion: submitWork,
    scheduleReview: getDailyReview
  };
};