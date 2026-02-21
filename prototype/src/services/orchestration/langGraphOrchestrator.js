/**
 * LangGraph Orchestrator
 * 
 * Central intelligence router that dynamically dispatches requests to appropriate feature agents
 * Implements graph-based workflow for complex educational interactions
 */

import { socraticCoach } from '../features/socratic-coach/socraticCoach.controller';
import { miniVivaValidator } from '../features/process-aware-viva/miniViva.validator';
import { rubricAgent } from '../features/rubric-experts/rubricAgent.service';
import { conceptBridge } from '../features/concept-translation/conceptBridge.engine';
import { readinessScheduler } from '../features/spaced-repetition/readinessScheduler';
import { groqClient } from '../inference/groqClient';
import { vectorStore } from './vectorStore';

class LangGraphOrchestrator {
  constructor() {
    this.nodes = {
      router: this._routeRequest.bind(this),
      socratic: this._handleSocratic.bind(this),
      viva: this._handleViva.bind(this),
      evaluation: this._handleEvaluation.bind(this),
      translation: this._handleTranslation.bind(this),
      schedule: this._handleScheduling.bind(this),
      context: this._enrichContext.bind(this)
    };

    this.executionHistory = new Map(); // Track workflow execution
  }

  /**
   * Main entry point: Process any educational interaction
   */
  async process(request) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution = {
      id: executionId,
      request,
      startTime: new Date().toISOString(),
      steps: [],
      currentNode: 'router'
    };

    this.executionHistory.set(executionId, execution);

    try {
      // Step 1: Route to appropriate workflow
      const route = await this.nodes.router(request);
      execution.steps.push({ node: 'router', output: route });

      // Step 2: Enrich with context from vector store
      const enriched = await this.nodes.context(request, route);
      execution.steps.push({ node: 'context', output: enriched });

      // Step 3: Execute primary workflow
      let result;
      switch (route.primaryAgent) {
        case 'socratic':
          result = await this.nodes.socratic(enriched);
          break;
        case 'viva':
          result = await this.nodes.viva(enriched);
          break;
        case 'evaluation':
          result = await this.nodes.evaluation(enriched);
          break;
        case 'translation':
          result = await this.nodes.translation(enriched);
          break;
        case 'schedule':
          result = await this.nodes.schedule(enriched);
          break;
        default:
          throw new Error(`Unknown agent: ${route.primaryAgent}`);
      }

      execution.steps.push({ node: route.primaryAgent, output: result });

      // Step 4: Post-processing (if needed)
      if (route.postProcess) {
        const enhanced = await this._postProcess(result, route, enriched);
        execution.steps.push({ node: 'postProcess', output: enhanced });
        result = enhanced;
      }

      execution.endTime = new Date().toISOString();
      execution.result = result;
      execution.status = 'success';

      return result;

    } catch (error) {
      console.error('Orchestration error:', error);
      execution.status = 'error';
      execution.error = error.message;
      execution.endTime = new Date().toISOString();

      return {
        error: true,
        message: 'An error occurred processing your request',
        details: error.message
      };
    }
  }

  /**
   * Router Node: Determine which agent(s) to invoke
   */
  async _routeRequest(request) {
    const { type, action, content, studentId, metadata = {} } = request;

    // Rule-based routing logic
    const routes = {
      // Questions/chat → Socratic Coach
      question: { primaryAgent: 'socratic', postProcess: true },
      chat: { primaryAgent: 'socratic', postProcess: true },
      
      // Submissions → Mini-Viva
      submission: { primaryAgent: 'viva', postProcess: false },
      upload: { primaryAgent: 'viva', postProcess: false },
      
      // Evaluation requests → Rubric Agent
      evaluate: { primaryAgent: 'evaluation', postProcess: false },
      grade: { primaryAgent: 'evaluation', postProcess: false },
      
      // Translation → Concept Bridge
      translate: { primaryAgent: 'translation', postProcess: false },
      explain: { primaryAgent: 'translation', postProcess: false },
      
      // Scheduling → Readiness Engine
      schedule: { primaryAgent: 'schedule', postProcess: false },
      review: { primaryAgent: 'schedule', postProcess: false },
      progress: { primaryAgent: 'schedule', postProcess: false }
    };

    const route = routes[type] || routes[action];

    if (!route) {
      // Use AI to determine routing for ambiguous cases
      return await this._aiRoute(request);
    }

    return {
      ...route,
      requestType: type || action,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * AI-powered routing for ambiguous requests
   */
  async _aiRoute(request) {
    const prompt = `Analyze this educational request and route it to the appropriate agent:

Request: ${JSON.stringify(request)}

Available Agents:
1. socratic - For questions, learning guidance, conceptual help
2. viva - For submission validation and understanding verification
3. evaluation - For grading and rubric-based feedback
4. translation - For multilingual concept explanation
5. schedule - For learning scheduling and progress tracking

Return JSON: { "agent": "string", "reasoning": "string" }`;

    try {
      const result = await groqClient.generateStructured(prompt, {
        agent: 'string',
        reasoning: 'string'
      }, {
        systemPrompt: 'You are an intelligent routing system for educational AI.',
        temperature: 0.2
      });

      return {
        primaryAgent: result.agent,
        postProcess: result.agent === 'socratic',
        aiRouted: true,
        reasoning: result.reasoning
      };
    } catch (error) {
      console.error('AI routing error:', error);
      return {
        primaryAgent: 'socratic', // Default fallback
        postProcess: true,
        aiRouted: false,
        reasoning: 'Fallback to Socratic agent'
      };
    }
  }

  /**
   * Context Enrichment Node: Add relevant context from vector store
   */
  async _enrichContext(request, route) {
    const { studentId, content } = request;

    if (!studentId || !content) {
      return { ...request, context: null };
    }

    try {
      const contextData = await vectorStore.getContext(studentId, content, 1500);
      return {
        ...request,
        enrichedContext: contextData.context,
        sources: contextData.sources
      };
    } catch (error) {
      console.error('Context enrichment error:', error);
      return { ...request, enrichedContext: null };
    }
  }

  /**
   * Socratic Handler Node
   */
  async _handleSocratic(enrichedRequest) {
    const { studentId, content, metadata = {} } = enrichedRequest;

    const response = await socraticCoach.processQuestion(
      studentId,
      content,
      {
        topic: metadata.topic,
        difficulty: metadata.difficulty,
        attempts: metadata.attempts || 0
      }
    );

    // Log interaction for spaced repetition
    if (metadata.conceptId) {
      readinessScheduler.recordInteraction(studentId, metadata.conceptId, {
        type: 'question',
        success: response.type !== 'academic_integrity_warning',
        difficulty: metadata.difficulty || 'medium',
        timeSpent: metadata.timeSpent || 0
      });
    }

    return response;
  }

  /**
   * Viva Handler Node
   */
  async _handleViva(enrichedRequest) {
    const { studentId, content, type, metadata = {} } = enrichedRequest;

    if (metadata.vivaSessionId && metadata.questionIndex !== undefined) {
      // Continuing existing viva
      return await miniVivaValidator.processVivaAnswer(
        metadata.vivaSessionId,
        metadata.questionIndex,
        content
      );
    } else {
      // Starting new viva
      return await miniVivaValidator.validateSubmission(studentId, {
        type: metadata.submissionType || 'code',
        content,
        metadata
      });
    }
  }

  /**
   * Evaluation Handler Node
   */
  async _handleEvaluation(enrichedRequest) {
    const { studentId, content, metadata = {} } = enrichedRequest;

    const result = await rubricAgent.evaluateSubmission(
      {
        content,
        type: metadata.submissionType || 'code',
        studentLevel: metadata.level || 'undergraduate'
      },
      metadata.evaluationMode || 'academic',
      {
        course: metadata.course,
        assignment: metadata.assignment
      }
    );

    // Record for spaced repetition
    if (metadata.conceptId) {
      readinessScheduler.recordInteraction(studentId, metadata.conceptId, {
        type: 'evaluation',
        success: result.overallScore >= 70,
        difficulty: metadata.difficulty || 'medium',
        timeSpent: metadata.timeSpent || 0
      });
    }

    return result;
  }

  /**
   * Translation Handler Node
   */
  async _handleTranslation(enrichedRequest) {
    const { content, metadata = {} } = enrichedRequest;

    return await conceptBridge.translateConcept(
      content,
      metadata.targetLanguage || 'en',
      {
        studentLevel: metadata.level || 'intermediate',
        includeAnalogy: metadata.includeAnalogy !== false,
        culturalContext: metadata.culturalContext !== false
      }
    );
  }

  /**
   * Schedule Handler Node
   */
  async _handleScheduling(enrichedRequest) {
    const { studentId, action, metadata = {} } = enrichedRequest;

    switch (action) {
      case 'getDailyQueue':
        return readinessScheduler.getDailyReviewQueue(studentId);
      
      case 'getResearch':
        return readinessScheduler.getDeepResearchSuggestions(studentId, metadata.count || 5);
      
      case 'getStats':
        return readinessScheduler.getStudentStats(studentId);
      
      default:
        return readinessScheduler.getDailyReviewQueue(studentId);
    }
  }

  /**
   * Post-processing Node: Enhance response with additional features
   */
  async _postProcess(result, route, enrichedRequest) {
    // Example: Add translation if needed
    if (enrichedRequest.metadata?.preferredLanguage && enrichedRequest.metadata.preferredLanguage !== 'en') {
      try {
        const translated = await conceptBridge.translateConcept(
          result.content || JSON.stringify(result),
          enrichedRequest.metadata.preferredLanguage
        );
        result.translation = translated;
      } catch (error) {
        console.error('Translation post-processing error:', error);
      }
    }

    return result;
  }

  /**
   * Get execution history for debugging/monitoring
   */
  getExecutionHistory(executionId) {
    return this.executionHistory.get(executionId);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const executions = Array.from(this.executionHistory.values());
    
    return {
      totalExecutions: executions.length,
      successRate: executions.filter(e => e.status === 'success').length / executions.length,
      averageSteps: executions.reduce((sum, e) => sum + e.steps.length, 0) / executions.length,
      agentUsage: this._calculateAgentUsage(executions)
    };
  }

  _calculateAgentUsage(executions) {
    const usage = {};
    executions.forEach(exec => {
      exec.steps.forEach(step => {
        usage[step.node] = (usage[step.node] || 0) + 1;
      });
    });
    return usage;
  }

  /**
   * Clear execution history (for memory management)
   */
  clearHistory() {
    this.executionHistory.clear();
  }
}

// Singleton export
export const orchestrator = new LangGraphOrchestrator();
export default LangGraphOrchestrator;
