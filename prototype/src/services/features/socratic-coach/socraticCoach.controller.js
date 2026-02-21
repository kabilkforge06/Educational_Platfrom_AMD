/**
 * FEATURE 1: Socratic Scaffolding Coach
 * 
 * Purpose: Prevent answer dumping. Enforce deep learning and academic integrity.
 * 
 * Behavior:
 * - NEVER provide full solutions
 * - Detect exact step where student is stuck
 * - Provide Knowledge Bridges, not answers
 * - Use leading questions and conceptual hints
 */

import { groqClient } from '../../inference/groqClient';
import { vectorStore } from '../../orchestration/vectorStore';

class SocraticCoachController {
  constructor() {
    this.sessionMemory = new Map(); // Track student progress per session
    this.forbiddenPatterns = [
      /give me the (answer|solution|code)/i,
      /what is the (answer|solution)/i,
      /solve this for me/i,
      /write the code/i
    ];
  }

  /**
   * Main entry point: Process student question with Socratic method
   */
  async processQuestion(studentId, question, context = {}) {
    // Detect if student is trying to get full answers
    if (this._detectAnswerDumping(question)) {
      return this._refuseAnswerDumping();
    }

    // Analyze student's current understanding
    const analysis = await this._analyzeStudentState(studentId, question, context);

    // Retrieve relevant knowledge from student's materials
    const relevantContext = await vectorStore.getContext(studentId, question, 1500);

    // Generate Socratic response
    const response = await this._generateSocraticResponse(
      question,
      analysis,
      relevantContext.context,
      context
    );

    // Track interaction for adaptive learning
    this._updateSessionMemory(studentId, {
      question,
      analysis,
      response,
      timestamp: new Date().toISOString()
    });

    return {
      type: 'socratic_guidance',
      content: response.guidance,
      hints: response.hints,
      leadingQuestions: response.leadingQuestions,
      conceptualGaps: analysis.gaps,
      nextStep: response.nextStep,
      prohibitedAnswer: false
    };
  }

  /**
   * Analyze where student is stuck
   */
  async _analyzeStudentState(studentId, question, context) {
    const analysisPrompt = `Analyze this student's learning state:

Question: "${question}"
Topic: ${context.topic || 'Unknown'}
Difficulty: ${context.difficulty || 'Medium'}
Previous Attempts: ${context.attempts || 0}

Identify:
1. Exact conceptual gap or confusion point
2. Missing foundational knowledge
3. Type of misconception (if any)
4. Student's current comprehension level (0-100%)

Respond in JSON format.`;

    const schema = {
      confusionPoint: 'string',
      missingFoundation: 'string',
      misconceptionType: 'string | null',
      comprehensionLevel: 'number',
      gaps: ['string']
    };

    try {
      return await groqClient.generateStructured(analysisPrompt, schema, {
        systemPrompt: 'You are an expert learning diagnostician. Never provide solutions, only diagnose learning gaps.',
        temperature: 0.3
      });
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        confusionPoint: 'Unable to determine',
        missingFoundation: 'Needs clarification',
        misconceptionType: null,
        comprehensionLevel: 50,
        gaps: ['Requires more context']
      };
    }
  }

  /**
   * Generate Socratic response (no direct answers)
   */
  async _generateSocraticResponse(question, analysis, knowledgeContext, metadata) {
    const socraticPrompt = `You are a Socratic tutor. A student is stuck on: "${question}"

Diagnostic Analysis:
- Confusion Point: ${analysis.confusionPoint}
- Missing Foundation: ${analysis.missingFoundation}
- Comprehension Level: ${analysis.comprehensionLevel}%

Relevant Course Material:
${knowledgeContext || 'No specific materials available'}

STRICT RULES:
1. NEVER give the full solution or answer
2. NEVER write complete code
3. NEVER solve the problem directly

INSTEAD:
1. Ask 2-3 leading questions that guide discovery
2. Provide conceptual hints (not implementation)
3. Suggest what to think about, not what to do
4. Use analogies and Socratic reasoning

FORMAT YOUR RESPONSE WITH CLEAR STRUCTURE:
- Use short paragraphs (2-3 sentences max)
- Add blank lines between sections
- Use bullet points with * for lists
- Use **bold** for key concepts
- Keep it organized and scannable

Example (for Java recursion):
❌ "Here's the recursive function..."
✅ "What happens when a function calls itself? 

Think about it this way:
* What condition would stop it from calling forever?
* What happens to the **call stack** with each recursive call?

Try tracing through just 2-3 iterations manually. What patterns emerge?"

Respond in JSON:
{
  "guidance": "Your main Socratic response (with proper formatting)",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "leadingQuestions": ["Question to ponder 1", "Question 2"],
  "nextStep": "What the student should explore next (not the answer)"
}`;

    try {
      const result = await groqClient.generateStructured(socraticPrompt, {
        guidance: 'string',
        hints: ['string'],
        leadingQuestions: ['string'],
        nextStep: 'string'
      }, {
        systemPrompt: 'You are a Socratic educational AI. You teach by asking, never by telling answers.',
        temperature: 0.8 // Higher creativity for diverse questioning
      });

      return result;
    } catch (error) {
      console.error('❌ Socratic generation error:', error);
      // Force error visibility - don't hide API issues
      return {
        guidance: `🚨 API Error: ${error.message}. Please check your Groq API connection and try again.`,
        hints: [
          'Check browser console for detailed error logs',
          'Verify API key is correctly configured',
          'Ensure internet connection is stable'
        ],
        leadingQuestions: [
          'What is the core challenge you\'re facing?',
          'What happens if you simplify the problem?'
        ],
        nextStep: 'Try to explain the problem in your own words'
      };
    }
  }

  /**
   * Detect if student is trying to get answers dumped
   */
  _detectAnswerDumping(question) {
    return this.forbiddenPatterns.some(pattern => pattern.test(question));
  }

  /**
   * Refuse answer dumping attempts
   */
  _refuseAnswerDumping() {
    return {
      type: 'academic_integrity_warning',
      content: 'I\'m here to help you learn, not to provide ready-made answers. Let\'s work through this together.',
      guidance: 'Instead of asking for the solution, try explaining:\n1. What you\'ve tried so far\n2. Where exactly you\'re stuck\n3. What specific concept is unclear',
      prohibitedAnswer: true,
      suggestions: [
        'Describe your current approach',
        'Identify the specific step that\'s confusing',
        'Share your thought process so far'
      ]
    };
  }

  /**
   * Update session memory for adaptive tracking
   */
  _updateSessionMemory(studentId, interaction) {
    if (!this.sessionMemory.has(studentId)) {
      this.sessionMemory.set(studentId, []);
    }

    const history = this.sessionMemory.get(studentId);
    history.push(interaction);

    // Keep last 50 interactions
    if (history.length > 50) {
      this.sessionMemory.set(studentId, history.slice(-50));
    }
  }

  /**
   * Get student's learning trajectory
   */
  getStudentProgress(studentId) {
    const history = this.sessionMemory.get(studentId) || [];
    
    if (history.length === 0) {
      return { sessions: 0, averageComprehension: 0, trends: [] };
    }

    const comprehensionLevels = history.map(h => h.analysis.comprehensionLevel);
    const averageComprehension = comprehensionLevels.reduce((a, b) => a + b, 0) / comprehensionLevels.length;

    return {
      sessions: history.length,
      averageComprehension: Math.round(averageComprehension),
      trends: this._analyzeTrends(comprehensionLevels),
      recentTopics: history.slice(-5).map(h => h.analysis.confusionPoint)
    };
  }

  /**
   * Analyze learning trends
   */
  _analyzeTrends(levels) {
    if (levels.length < 3) return ['Insufficient data'];

    const recent = levels.slice(-5);
    const older = levels.slice(0, levels.length - 5);

    if (older.length === 0) return ['Building foundation'];

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const trends = [];
    if (recentAvg > olderAvg + 10) trends.push('Improving significantly');
    else if (recentAvg > olderAvg) trends.push('Steady progress');
    else if (recentAvg < olderAvg - 10) trends.push('Needs intervention');
    else trends.push('Consistent performance');

    return trends;
  }

  /**
   * Clear session data
   */
  clearSession(studentId) {
    this.sessionMemory.delete(studentId);
  }
}

// Singleton export
export const socraticCoach = new SocraticCoachController();
export default SocraticCoachController;
