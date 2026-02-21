/**
 * FEATURE 2: Process-Aware Anti-Cheat (Mini-Viva System)
 * 
 * Purpose: Make cheating impossible by validating understanding, not output.
 * 
 * Behavior:
 * - Triggered on code/essay/project submission
 * - AI conducts a Mini-Viva (oral defense)
 * - Student must defend design choices
 * - Explanation quality determines acceptance/rejection
 */

import { groqClient } from '../../inference/groqClient';

class MiniVivaValidator {
  constructor() {
    this.vivaCache = new Map(); // submissionId -> viva session
    this.suspicionThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 0.85
    };
  }

  /**
   * Main entry: Validate submission through Mini-Viva
   */
  async validateSubmission(studentId, submission) {
    const { type, content, metadata = {} } = submission;

    // Step 1: Analyze submission for complexity indicators
    const complexity = await this._analyzeSubmissionComplexity(content, type);

    // Step 2: Generate targeted viva questions
    const vivaQuestions = await this._generateVivaQuestions(content, type, complexity);

    // Step 3: Create viva session
    const sessionId = `viva_${studentId}_${Date.now()}`;
    this.vivaCache.set(sessionId, {
      studentId,
      submission,
      questions: vivaQuestions,
      answers: [],
      startTime: new Date().toISOString(),
      status: 'pending'
    });

    return {
      sessionId,
      requiresViva: true,
      questions: vivaQuestions.questions,
      totalQuestions: vivaQuestions.questions.length,
      estimatedTime: '5-10 minutes',
      message: 'To verify your understanding, please answer these questions about your submission.'
    };
  }

  /**
   * Process student's answer to viva question
   */
  async processVivaAnswer(sessionId, questionIndex, answer) {
    const session = this.vivaCache.get(sessionId);
    
    if (!session) {
      throw new Error('Invalid viva session');
    }

    const question = session.questions.questions[questionIndex];
    
    // Evaluate answer quality
    const evaluation = await this._evaluateAnswer(
      question,
      answer,
      session.submission.content,
      session.submission.type
    );

    // Store answer and evaluation
    session.answers.push({
      questionIndex,
      question: question.question,
      answer,
      evaluation,
      timestamp: new Date().toISOString()
    });

    // Check if all questions answered
    const isComplete = session.answers.length === session.questions.questions.length;

    if (isComplete) {
      return await this._finalizeViva(sessionId);
    }

    return {
      accepted: evaluation.passed,
      feedback: evaluation.feedback,
      score: evaluation.score,
      nextQuestion: questionIndex + 1 < session.questions.questions.length 
        ? session.questions.questions[questionIndex + 1] 
        : null,
      progress: {
        answered: session.answers.length,
        total: session.questions.questions.length
      }
    };
  }

  /**
   * Analyze submission complexity
   */
  async _analyzeSubmissionComplexity(content, type) {
    let analysisPrompt = '';

    switch (type) {
      case 'code':
        analysisPrompt = `Analyze this code submission:

\`\`\`
${content}
\`\`\`

Determine:
1. Complexity level (beginner/intermediate/advanced)
2. Key algorithmic concepts used
3. Design patterns present
4. Critical decision points
5. Potential areas of confusion

Return JSON.`;
        break;

      case 'essay':
        analysisPrompt = `Analyze this essay submission:

"${content}"

Determine:
1. Argument structure quality
2. Technical depth
3. Key claims made
4. Evidence usage
5. Critical thinking indicators

Return JSON.`;
        break;

      case 'project':
        analysisPrompt = `Analyze this project submission:

${content}

Determine:
1. Architecture complexity
2. Key technical decisions
3. Integration points
4. Performance considerations
5. Critical components

Return JSON.`;
        break;

      default:
        analysisPrompt = `Analyze this submission and identify key technical concepts and decision points. Return JSON.`;
    }

    try {
      return await groqClient.generateStructured(analysisPrompt, {
        complexityLevel: 'string',
        keyConcepts: ['string'],
        designPatterns: ['string'],
        criticalDecisions: ['string'],
        potentialConfusion: ['string']
      }, {
        systemPrompt: 'You are an expert technical evaluator specializing in academic integrity.',
        temperature: 0.3
      });
    } catch (error) {
      console.error('Complexity analysis error:', error);
      return {
        complexityLevel: 'intermediate',
        keyConcepts: ['Unknown'],
        designPatterns: [],
        criticalDecisions: ['General approach'],
        potentialConfusion: []
      };
    }
  }

  /**
   * Generate viva questions based on submission
   */
  async _generateVivaQuestions(content, type, complexity) {
    const prompt = `You are conducting a Mini-Viva (oral defense) for a student submission.

Submission Type: ${type}
Complexity: ${complexity.complexityLevel}
Key Concepts: ${complexity.keyConcepts.join(', ')}

Submission:
${content.substring(0, 2000)}

Generate 4-6 targeted questions that:
1. Test UNDERSTANDING, not memorization
2. Focus on "WHY" decisions were made
3. Cannot be answered by someone who just copied code
4. Probe specific design choices
5. Reveal true comprehension

Example questions:
- "Why did you choose this I2C address for the MPU6050 sensor?"
- "Explain why you used a HashMap instead of an ArrayList here"
- "What would happen if you removed this if-condition?"
- "Why is this variable declared as volatile?"

Return JSON with:
{
  "questions": [
    {
      "question": "string",
      "focusArea": "string",
      "expectedDepth": "surface | detailed | expert"
    }
  ],
  "rationale": "Why these specific questions"
}`;

    try {
      return await groqClient.generateStructured(prompt, {
        questions: [{
          question: 'string',
          focusArea: 'string',
          expectedDepth: 'string'
        }],
        rationale: 'string'
      }, {
        systemPrompt: 'You are an academic integrity specialist. Generate questions that expose cheating.',
        temperature: 0.7
      });
    } catch (error) {
      console.error('Question generation error:', error);
      return {
        questions: [
          {
            question: 'Explain the main approach you took in this submission.',
            focusArea: 'Overall understanding',
            expectedDepth: 'detailed'
          },
          {
            question: 'What was the most challenging part and how did you solve it?',
            focusArea: 'Problem-solving',
            expectedDepth: 'detailed'
          }
        ],
        rationale: 'Default questions for comprehension check'
      };
    }
  }

  /**
   * Evaluate student's viva answer
   */
  async _evaluateAnswer(question, answer, originalSubmission, submissionType) {
    const evaluationPrompt = `Evaluate this student's answer in a Mini-Viva:

Question: "${question.question}"
Expected Depth: ${question.expectedDepth}
Focus Area: ${question.focusArea}

Student Answer: "${answer}"

Original Submission (context):
${originalSubmission.substring(0, 1000)}

Determine:
1. Does the answer demonstrate genuine understanding? (yes/no)
2. Quality score (0-100)
3. Red flags (if any)
4. Feedback for student

A PASSING answer must:
- Show process understanding, not just result
- Explain "WHY", not just "WHAT"
- Reference specific parts of submission
- Demonstrate decision-making reasoning

A FAILING answer:
- Generic/vague responses
- Cannot explain specific choices
- Contradicts submission
- Copy-paste from internet

Return JSON.`;

    try {
      const evaluation = await groqClient.generateStructured(evaluationPrompt, {
        understandingDemonstrated: 'boolean',
        score: 'number',
        redFlags: ['string'],
        feedback: 'string',
        passed: 'boolean'
      }, {
        systemPrompt: 'You are a strict academic integrity evaluator. Be thorough but fair.',
        temperature: 0.2
      });

      return evaluation;
    } catch (error) {
      console.error('Answer evaluation error:', error);
      return {
        understandingDemonstrated: false,
        score: 0,
        redFlags: ['Evaluation error'],
        feedback: 'Unable to evaluate answer. Please try again.',
        passed: false
      };
    }
  }

  /**
   * Finalize viva and determine overall result
   */
  async _finalizeViva(sessionId) {
    const session = this.vivaCache.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const scores = session.answers.map(a => a.evaluation.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passedCount = session.answers.filter(a => a.evaluation.passed).length;
    const passRate = passedCount / session.answers.length;

    // Determine final verdict
    const passed = passRate >= 0.7 && averageScore >= 60; // 70% pass rate + 60% avg score

    const allRedFlags = session.answers
      .flatMap(a => a.evaluation.redFlags)
      .filter(f => f && f.length > 0);

    session.status = passed ? 'approved' : 'flagged';
    session.endTime = new Date().toISOString();
    session.finalResult = {
      passed,
      averageScore: Math.round(averageScore),
      passRate: Math.round(passRate * 100),
      redFlags: allRedFlags
    };

    return {
      sessionId,
      status: session.status,
      submissionApproved: passed,
      result: {
        overallScore: Math.round(averageScore),
        questionsAnswered: session.answers.length,
        passingAnswers: passedCount,
        failingAnswers: session.answers.length - passedCount,
        passRate: `${Math.round(passRate * 100)}%`
      },
      verdict: passed 
        ? 'Submission approved. Your answers demonstrate genuine understanding.' 
        : 'Submission flagged. Your answers suggest insufficient understanding of the submitted work.',
      redFlags: allRedFlags,
      detailedFeedback: session.answers.map(a => ({
        question: a.question,
        score: a.evaluation.score,
        feedback: a.evaluation.feedback
      })),
      nextSteps: passed 
        ? 'Your submission has been accepted.'
        : 'Please review the feedback and resubmit after addressing the gaps in understanding.'
    };
  }

  /**
   * Get viva session details
   */
  getVivaSession(sessionId) {
    return this.vivaCache.get(sessionId);
  }

  /**
   * Get student's viva history
   */
  getStudentVivaHistory(studentId) {
    const history = [];
    
    for (const [sessionId, session] of this.vivaCache.entries()) {
      if (session.studentId === studentId) {
        history.push({
          sessionId,
          submissionType: session.submission.type,
          status: session.status,
          score: session.finalResult?.averageScore || null,
          timestamp: session.startTime
        });
      }
    }

    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Clear viva cache (for testing/cleanup)
   */
  clearCache() {
    this.vivaCache.clear();
  }
}

// Singleton export
export const miniVivaValidator = new MiniVivaValidator();
export default MiniVivaValidator;
