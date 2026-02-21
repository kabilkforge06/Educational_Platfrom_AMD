/**
 * Educational Intelligence Hook
 * 
 * React hook that provides access to all advanced features via Python backend
 * 
 * Usage in components:
 * const { sendMessage, submitWork, getDailyReview } = useEducationalIntelligence(studentId);
 */

import { useState, useCallback, useEffect } from 'react';
import { pythonServerClient } from '../services/pythonServerClient';

export const useEducationalIntelligence = (studentId = 'student_001') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dailyQueue, setDailyQueue] = useState([]);
  const [studentStats, setStudentStats] = useState(null);

  /**
   * FEATURE 1: Socratic Coach - Send question and get guidance (NOT answers)
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
   * FEATURE 2: Mini-Viva - Submit work and go through validation
   */
  const submitWork = useCallback(async (submission, submissionType = 'code') => {
    setLoading(true);
    setError(null);

    try {
      const response = await orchestrator.process({
        type: 'submission',
        studentId,
        content: submission,
        metadata: {
          submissionType,
          timestamp: new Date().toISOString()
        }
      });

      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 2 (continued): Answer viva question
   */
  const answerVivaQuestion = useCallback(async (sessionId, questionIndex, answer) => {
    setLoading(true);
    setError(null);

    try {
      const response = await orchestrator.process({
        type: 'submission',
        action: 'viva',
        studentId,
        content: answer,
        metadata: {
          vivaSessionId: sessionId,
          questionIndex,
          timestamp: new Date().toISOString()
        }
      });

      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 3: Rubric-Based Evaluation
   */
  const evaluateWork = useCallback(async (work, mode = 'academic', metadata = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await orchestrator.process({
        type: 'evaluate',
        studentId,
        content: work,
        metadata: {
          evaluationMode: mode,
          submissionType: metadata.type || 'code',
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 4: Multilingual Translation
   */
  const translateConcept = useCallback(async (concept, targetLanguage = 'ta', options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await orchestrator.process({
        type: 'translate',
        studentId,
        content: concept,
        metadata: {
          targetLanguage,
          ...options,
          timestamp: new Date().toISOString()
        }
      });

      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 5: Get daily review queue
   */
  const getDailyReview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await orchestrator.process({
        type: 'schedule',
        action: 'getDailyQueue',
        studentId,
        content: '',
        metadata: {}
      });

      setDailyQueue(response.queue || []);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * FEATURE 5: Get deep research suggestions
   */
  const getResearchSuggestions = useCallback(async (count = 5) => {
    try {
      const response = await orchestrator.process({
        type: 'schedule',
        action: 'getResearch',
        studentId,
        content: '',
        metadata: { count }
      });

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [studentId]);

  /**
   * Upload syllabus/notes to personalized vector store
   */
  const uploadMaterials = useCallback(async (document, documentType = 'syllabus') => {
    setLoading(true);
    setError(null);

    try {
      const result = await vectorStore.ingestDocument(studentId, {
        content: document,
        type: documentType,
        source: 'user_upload',
        uploadedAt: new Date().toISOString()
      });

      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [studentId]);

  /**
   * Get student progress and stats
   */
  const getProgress = useCallback(async () => {
    try {
      const response = await orchestrator.process({
        type: 'schedule',
        action: 'getStats',
        studentId,
        content: '',
        metadata: {}
      });

      setStudentStats(response);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [studentId]);

  /**
   * Record practice interaction for spaced repetition
   */
  const recordPractice = useCallback((conceptId, success, timeSpent) => {
    readinessScheduler.recordInteraction(studentId, conceptId, {
      type: 'practice',
      success,
      difficulty: 'medium',
      timeSpent
    });
  }, [studentId]);

  /**
   * Initialize student on component mount
   */
  useEffect(() => {
    // Initialize student profile
    readinessScheduler.initializeStudent(studentId);

    // Load student's documents from IndexedDB
    vectorStore.loadStudentDocuments(studentId).catch(err => {
      console.error('Failed to load student documents:', err);
    });

    // Load initial stats and queue
    getDailyReview().catch(err => {
      console.error('Failed to load daily review:', err);
    });
    
    getProgress().catch(err => {
      console.error('Failed to load progress:', err);
    });
  }, [studentId, getDailyReview, getProgress]);

  return {
    // Core features
    askQuestion,           // FEATURE 1: Socratic Coach
    submitWork,           // FEATURE 2: Mini-Viva
    answerVivaQuestion,   // FEATURE 2: Answer viva
    evaluateWork,         // FEATURE 3: Rubric evaluation
    translateConcept,     // FEATURE 4: Multilingual translation
    getDailyReview,       // FEATURE 5: Daily review queue
    getResearchSuggestions, // FEATURE 5: Research suggestions
    
    // Supporting features
    uploadMaterials,      // Upload syllabus/notes
    getProgress,          // Get progress stats
    recordPractice,       // Record practice for spaced repetition
    
    // State
    loading,
    error,
    dailyQueue,
    studentStats
  };
};

export default useEducationalIntelligence;
