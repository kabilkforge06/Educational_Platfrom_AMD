/**
 * FEATURE 3: Rubric-Aware Expert Agents
 * 
 * Purpose: Deliver professional-grade feedback, not generic comments.
 * 
 * Modes:
 * - Academic Mode: College rubrics, marks distribution, theory + correctness
 * - Industry Mode: Real-world standards, optimization, maintainability (AMD mindset)
 * 
 * Behavior:
 * - Same submission → Different evaluation based on mode
 * - Structured feedback mapped to rubric criteria
 * - Actionable improvement guidance
 */

import { groqClient } from '../../inference/groqClient';

class RubricAgentService {
  constructor() {
    this.modes = {
      academic: 'academic',
      industry: 'industry'
    };

    this.academicRubrics = {
      correctness: { weight: 40, description: 'Functional accuracy and error-free execution' },
      theory: { weight: 25, description: 'Understanding of underlying concepts' },
      documentation: { weight: 15, description: 'Code comments and explanation quality' },
      style: { weight: 10, description: 'Coding conventions and readability' },
      testing: { weight: 10, description: 'Test coverage and edge cases' }
    };

    this.industryRubrics = {
      performance: { weight: 30, description: 'Execution efficiency and optimization' },
      scalability: { weight: 25, description: 'Ability to handle growth and load' },
      maintainability: { weight: 20, description: 'Code quality and future extensibility' },
      security: { weight: 15, description: 'Vulnerability prevention and best practices' },
      production_ready: { weight: 10, description: 'Deployment readiness and robustness' }
    };
  }

  /**
   * Main entry: Evaluate submission with rubric-based feedback
   */
  async evaluateSubmission(submission, mode = 'academic', context = {}) {
    const { content, type, studentLevel = 'undergraduate' } = submission;

    // Select rubric based on mode
    const rubric = mode === 'academic' ? this.academicRubrics : this.industryRubrics;

    // Generate expert evaluation
    const evaluation = await this._generateExpertEvaluation(
      content,
      type,
      rubric,
      mode,
      context
    );

    // Calculate overall score
    const overallScore = this._calculateOverallScore(evaluation.criteria, rubric);

    // Generate improvement roadmap
    const improvements = await this._generateImprovementPlan(
      evaluation,
      rubric,
      mode
    );

    return {
      mode,
      overallScore: Math.round(overallScore),
      grade: this._scoreToGrade(overallScore, mode),
      criteria: evaluation.criteria,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      detailedFeedback: evaluation.feedback,
      improvementPlan: improvements,
      rubricBreakdown: this._formatRubricBreakdown(evaluation.criteria, rubric),
      expertCommentary: evaluation.commentary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate expert-level evaluation
   */
  async _generateExpertEvaluation(content, type, rubric, mode, context) {
    const criteriaList = Object.keys(rubric).map(key => ({
      name: key,
      ...rubric[key]
    }));

    const prompt = `You are a ${mode === 'academic' ? 'Senior Academic Evaluator' : 'Principal Software Architect at AMD'}.

Evaluate this ${type} submission:

\`\`\`
${content.substring(0, 3000)}
\`\`\`

${mode === 'academic' ? `
ACADEMIC EVALUATION CRITERIA:
- Correctness: Does it work? Are results accurate?
- Theory: Does student understand WHY it works?
- Documentation: Clear explanations and comments?
- Style: Follows conventions and best practices?
- Testing: Edge cases and validation?
` : `
INDUSTRY EVALUATION CRITERIA (AMD Hardware Optimization Mindset):
- Performance: Execution efficiency, algorithmic complexity
- Scalability: Can it handle 10x, 100x load?
- Maintainability: Clean architecture, SOLID principles
- Security: Input validation, vulnerability prevention
- Production-Ready: Error handling, logging, monitoring
`}

Evaluate against these criteria:
${criteriaList.map(c => `- ${c.name} (${c.weight}%): ${c.description}`).join('\n')}

For EACH criterion, provide:
1. Score (0-100)
2. Justification
3. Specific examples from submission

Also identify:
- Top 3 strengths
- Top 3 weaknesses
- Expert commentary on overall quality

Return JSON:
{
  "criteria": {
    "${criteriaList[0].name}": { "score": number, "justification": "string", "examples": ["string"] },
    ...
  },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "feedback": "Overall detailed feedback",
  "commentary": "Expert-level insights"
}`;

    try {
      const schema = {};
      criteriaList.forEach(c => {
        schema[c.name] = {
          score: 'number',
          justification: 'string',
          examples: ['string']
        };
      });

      const result = await groqClient.generateStructured(prompt, {
        criteria: schema,
        strengths: ['string'],
        weaknesses: ['string'],
        feedback: 'string',
        commentary: 'string'
      }, {
        systemPrompt: mode === 'academic' 
          ? 'You are a distinguished computer science professor with 20 years of teaching experience.'
          : 'You are a Principal Engineer at AMD with expertise in high-performance computing and hardware optimization.',
        temperature: 0.4
      });

      return result;
    } catch (error) {
      console.error('Expert evaluation error:', error);
      // Return fallback evaluation
      return this._getFallbackEvaluation(criteriaList);
    }
  }

  /**
   * Calculate weighted overall score
   */
  _calculateOverallScore(criteriaScores, rubric) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [criterion, data] of Object.entries(criteriaScores)) {
      const weight = rubric[criterion]?.weight || 0;
      totalScore += data.score * (weight / 100);
      totalWeight += weight;
    }

    return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  }

  /**
   * Convert score to letter grade
   */
  _scoreToGrade(score, mode) {
    if (mode === 'academic') {
      if (score >= 93) return 'A';
      if (score >= 90) return 'A-';
      if (score >= 87) return 'B+';
      if (score >= 83) return 'B';
      if (score >= 80) return 'B-';
      if (score >= 77) return 'C+';
      if (score >= 73) return 'C';
      if (score >= 70) return 'C-';
      if (score >= 67) return 'D+';
      if (score >= 60) return 'D';
      return 'F';
    } else {
      // Industry scale: Excellence / Good / Acceptable / Needs Work / Unacceptable
      if (score >= 85) return 'Excellence - Production Ready';
      if (score >= 70) return 'Good - Minor Revisions';
      if (score >= 55) return 'Acceptable - Major Revisions';
      if (score >= 40) return 'Needs Work - Significant Issues';
      return 'Unacceptable - Complete Rework';
    }
  }

  /**
   * Generate improvement plan
   */
  async _generateImprovementPlan(evaluation, rubric, mode) {
    // Find lowest-scoring criteria
    const sortedCriteria = Object.entries(evaluation.criteria)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3); // Top 3 areas needing improvement

    const prompt = `Based on this evaluation, create an actionable improvement plan:

Mode: ${mode.toUpperCase()}

Weakest Areas:
${sortedCriteria.map(([name, data]) => `- ${name}: ${data.score}/100 - ${data.justification}`).join('\n')}

General Weaknesses:
${evaluation.weaknesses.join('\n')}

Create a step-by-step improvement plan with:
1. Immediate fixes (can do in 1 hour)
2. Short-term improvements (1-2 days)
3. Long-term mastery goals (1-2 weeks)

For each step, provide:
- Specific action
- Expected outcome
- Resources (concepts to study)

Return JSON with structure:
{
  "immediate": [{ "action": "string", "outcome": "string", "resources": ["string"] }],
  "shortTerm": [{ "action": "string", "outcome": "string", "resources": ["string"] }],
  "longTerm": [{ "action": "string", "outcome": "string", "resources": ["string"] }]
}`;

    try {
      return await groqClient.generateStructured(prompt, {
        immediate: [{ action: 'string', outcome: 'string', resources: ['string'] }],
        shortTerm: [{ action: 'string', outcome: 'string', resources: ['string'] }],
        longTerm: [{ action: 'string', outcome: 'string', resources: ['string'] }]
      }, {
        systemPrompt: 'You are a learning optimization specialist. Create concrete, actionable plans.',
        temperature: 0.6
      });
    } catch (error) {
      console.error('Improvement plan error:', error);
      return {
        immediate: [{ 
          action: 'Review feedback and identify specific errors', 
          outcome: 'Clear understanding of issues',
          resources: ['Rubric criteria', 'Example solutions']
        }],
        shortTerm: [{ 
          action: 'Address major weaknesses identified', 
          outcome: 'Improved overall quality',
          resources: ['Course materials', 'Practice problems']
        }],
        longTerm: [{ 
          action: 'Master fundamental concepts', 
          outcome: 'Strong foundational understanding',
          resources: ['Advanced tutorials', 'Real-world projects']
        }]
      };
    }
  }

  /**
   * Format rubric breakdown for display
   */
  _formatRubricBreakdown(criteriaScores, rubric) {
    return Object.entries(criteriaScores).map(([name, data]) => ({
      criterion: name,
      weight: rubric[name].weight,
      description: rubric[name].description,
      score: data.score,
      weightedScore: Math.round((data.score * rubric[name].weight) / 100),
      justification: data.justification,
      examples: data.examples
    }));
  }

  /**
   * Fallback evaluation if API fails
   */
  _getFallbackEvaluation(criteriaList) {
    const criteria = {};
    criteriaList.forEach(c => {
      criteria[c.name] = {
        score: 70,
        justification: 'Evaluation service temporarily unavailable. Default score provided.',
        examples: ['Unable to analyze at this time']
      };
    });

    return {
      criteria,
      strengths: ['Submission received successfully'],
      weaknesses: ['Unable to perform detailed evaluation'],
      feedback: 'Please try again later for detailed feedback.',
      commentary: 'Evaluation service is experiencing issues.'
    };
  }

  /**
   * Compare academic vs industry evaluation for same submission
   */
  async compareModes(submission, context = {}) {
    const [academicResult, industryResult] = await Promise.all([
      this.evaluateSubmission(submission, 'academic', context),
      this.evaluateSubmission(submission, 'industry', context)
    ]);

    return {
      academic: academicResult,
      industry: industryResult,
      scoreDelta: Math.round(industryResult.overallScore - academicResult.overallScore),
      insights: this._generateModeComparison(academicResult, industryResult)
    };
  }

  /**
   * Generate insights from mode comparison
   */
  _generateModeComparison(academic, industry) {
    const insights = [];

    if (academic.overallScore > industry.overallScore + 10) {
      insights.push('Strong theoretical understanding, but needs production optimization.');
    } else if (industry.overallScore > academic.overallScore + 10) {
      insights.push('Production-ready code, but may lack theoretical rigor.');
    } else {
      insights.push('Well-balanced submission suitable for both academic and industry standards.');
    }

    return insights;
  }
}

// Singleton export
export const rubricAgent = new RubricAgentService();
export default RubricAgentService;
