/**
 * FEATURE 5: Spaced-Repetition Readiness Engine
 * 
 * Purpose: Move from reactive tutoring to proactive mastery building.
 * 
 * Behavior:
 * - Track weak concepts, mistakes, time since last interaction
 * - Use Dynamic Forgetting Curve
 * - Auto-reinsert topics into daily feed, practice queue
 * - Strategic concept resurfacing before forgetting
 * 
 * Example: IoT protocols reappear just before forgetting
 */

class ReadinessScheduler {
  constructor() {
    this.studentProfiles = new Map(); // studentId -> profile
    this.forgettingCurve = {
      // Days until likely forgotten (based on Ebbinghaus curve)
      excellent: 30,    // 100% mastery
      good: 14,         // 80-99% mastery
      moderate: 7,      // 60-79% mastery
      weak: 3,          // 40-59% mastery
      poor: 1           // <40% mastery
    };
  }

  /**
   * Initialize student learning profile
   */
  initializeStudent(studentId) {
    if (!this.studentProfiles.has(studentId)) {
      this.studentProfiles.set(studentId, {
        studentId,
        concepts: new Map(), // conceptId -> mastery data
        weakAreas: [],
        streakData: {
          current: 0,
          longest: 0,
          lastActivity: null
        },
        preferences: {
          dailyPracticeTime: 30, // minutes
          preferredDifficulty: 'adaptive'
        }
      });
    }
    return this.studentProfiles.get(studentId);
  }

  /**
   * Record concept interaction (practice, test, question)
   */
  recordInteraction(studentId, conceptId, interaction) {
    const profile = this.initializeStudent(studentId);
    const { type, success, difficulty, timeSpent } = interaction;

    // Get or create concept entry
    if (!profile.concepts.has(conceptId)) {
      profile.concepts.set(conceptId, {
        conceptId,
        masteryLevel: 0,
        interactions: [],
        lastReviewed: null,
        nextReview: null,
        repetitionCount: 0,
        mistakePatterns: []
      });
    }

    const concept = profile.concepts.get(conceptId);

    // Record interaction
    concept.interactions.push({
      timestamp: new Date().toISOString(),
      type,
      success,
      difficulty,
      timeSpent
    });

    // Update mastery level
    concept.masteryLevel = this._calculateMastery(concept.interactions);
    concept.lastReviewed = new Date().toISOString();
    concept.repetitionCount++;

    // Calculate next review time using spaced repetition
    concept.nextReview = this._calculateNextReview(
      concept.masteryLevel,
      concept.repetitionCount,
      success
    );

    // Track mistakes
    if (!success) {
      concept.mistakePatterns.push({
        timestamp: new Date().toISOString(),
        difficulty,
        type
      });
    }

    // Update weak areas
    this._updateWeakAreas(profile);

    // Update streak
    this._updateStreak(profile);

    return {
      conceptId,
      newMasteryLevel: concept.masteryLevel,
      nextReviewDate: concept.nextReview,
      streakContinues: profile.streakData.current > 0
    };
  }

  /**
   * Get concepts due for review today
   */
  getDailyReviewQueue(studentId) {
    const profile = this.studentProfiles.get(studentId);
    if (!profile) return { queue: [], totalDue: 0 };

    const now = new Date();
    const dueForReview = [];

    for (const [conceptId, concept] of profile.concepts) {
      if (!concept.nextReview) continue;

      const reviewDate = new Date(concept.nextReview);
      if (reviewDate <= now) {
        dueForReview.push({
          conceptId,
          masteryLevel: concept.masteryLevel,
          daysSinceReview: this._daysBetween(new Date(concept.lastReviewed), now),
          priority: this._calculatePriority(concept),
          estimatedTime: this._estimateReviewTime(concept)
        });
      }
    }

    // Sort by priority (weakest first)
    dueForReview.sort((a, b) => b.priority - a.priority);

    return {
      queue: dueForReview,
      totalDue: dueForReview.length,
      estimatedTotalTime: dueForReview.reduce((sum, item) => sum + item.estimatedTime, 0),
      recommendations: this._generateDailyRecommendations(dueForReview, profile)
    };
  }

  /**
   * Get deep research suggestions (proactive learning)
   */
  getDeepResearchSuggestions(studentId, count = 5) {
    const profile = this.studentProfiles.get(studentId);
    if (!profile) return [];

    const suggestions = [];

    // 1. Weak areas that need reinforcement
    profile.weakAreas.slice(0, 2).forEach(area => {
      suggestions.push({
        type: 'weakness_reinforcement',
        conceptId: area.conceptId,
        reason: `Mastery at ${area.masteryLevel}% - needs strengthening`,
        priority: 'high',
        estimatedTime: 45
      });
    });

    // 2. Concepts approaching forgetting threshold
    const aboutToForget = this._getApproachingForgetting(profile);
    aboutToForget.slice(0, 2).forEach(concept => {
      suggestions.push({
        type: 'forgetting_prevention',
        conceptId: concept.conceptId,
        reason: `Last reviewed ${concept.daysSince} days ago - review soon`,
        priority: 'medium',
        estimatedTime: 20
      });
    });

    // 3. Related concepts for deeper understanding
    if (suggestions.length < count) {
      const related = this._suggestRelatedConcepts(profile);
      suggestions.push(...related.slice(0, count - suggestions.length));
    }

    return suggestions.slice(0, count);
  }

  /**
   * Calculate mastery level from interaction history
   */
  _calculateMastery(interactions) {
    if (interactions.length === 0) return 0;

    // Weight recent interactions more heavily
    const weights = interactions.map((_, idx) => Math.pow(1.2, idx));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let weightedScore = 0;
    interactions.forEach((interaction, idx) => {
      const score = interaction.success ? 100 : 0;
      weightedScore += score * (weights[idx] / totalWeight);
    });

    return Math.round(weightedScore);
  }

  /**
   * Calculate next review date using spaced repetition algorithm
   */
  _calculateNextReview(masteryLevel, repetitionCount, lastSuccess) {
    // Determine mastery category
    let category;
    if (masteryLevel >= 100) category = 'excellent';
    else if (masteryLevel >= 80) category = 'good';
    else if (masteryLevel >= 60) category = 'moderate';
    else if (masteryLevel >= 40) category = 'weak';
    else category = 'poor';

    // Base interval from forgetting curve
    let baseInterval = this.forgettingCurve[category];

    // Adjust based on repetition count (spaced repetition)
    const intervalMultiplier = Math.min(repetitionCount * 0.3, 2); // Max 2x increase
    let interval = baseInterval * (1 + intervalMultiplier);

    // If last attempt failed, reduce interval
    if (!lastSuccess) {
      interval = Math.max(1, interval * 0.5);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.round(interval));

    return nextReview.toISOString();
  }

  /**
   * Calculate priority score for review
   */
  _calculatePriority(concept) {
    // Lower mastery = higher priority
    const masteryFactor = (100 - concept.masteryLevel) / 100;

    // More recent mistakes = higher priority
    const recentMistakes = concept.mistakePatterns.filter(m => {
      const mistakeDate = new Date(m.timestamp);
      const daysSince = this._daysBetween(mistakeDate, new Date());
      return daysSince <= 7;
    }).length;
    const mistakeFactor = Math.min(recentMistakes / 3, 1);

    // Time overdue factor
    const now = new Date();
    const reviewDate = new Date(concept.nextReview);
    const daysOverdue = Math.max(0, this._daysBetween(reviewDate, now));
    const overdueFactor = Math.min(daysOverdue / 7, 1);

    return Math.round((masteryFactor * 40 + mistakeFactor * 30 + overdueFactor * 30) * 100);
  }

  /**
   * Update weak areas list
   */
  _updateWeakAreas(profile) {
    const weakConcepts = [];

    for (const [conceptId, concept] of profile.concepts) {
      if (concept.masteryLevel < 70) {
        weakConcepts.push({
          conceptId,
          masteryLevel: concept.masteryLevel,
          recentMistakes: concept.mistakePatterns.length
        });
      }
    }

    // Sort by mastery level (lowest first)
    weakConcepts.sort((a, b) => a.masteryLevel - b.masteryLevel);

    profile.weakAreas = weakConcepts.slice(0, 10); // Keep top 10 weak areas
  }

  /**
   * Update learning streak
   */
  _updateStreak(profile) {
    const now = new Date();
    const lastActivity = profile.streakData.lastActivity 
      ? new Date(profile.streakData.lastActivity)
      : null;

    if (!lastActivity) {
      profile.streakData.current = 1;
      profile.streakData.longest = 1;
    } else {
      const hoursSince = (now - lastActivity) / (1000 * 60 * 60);
      
      if (hoursSince <= 24) {
        // Same day or next day - continue streak
        profile.streakData.current++;
        profile.streakData.longest = Math.max(
          profile.streakData.longest,
          profile.streakData.current
        );
      } else if (hoursSince > 48) {
        // Missed a day - reset streak
        profile.streakData.current = 1;
      }
    }

    profile.streakData.lastActivity = now.toISOString();
  }

  /**
   * Get concepts approaching forgetting threshold
   */
  _getApproachingForgetting(profile) {
    const approaching = [];
    const now = new Date();

    for (const [conceptId, concept] of profile.concepts) {
      if (!concept.lastReviewed) continue;

      const daysSince = this._daysBetween(new Date(concept.lastReviewed), now);
      const reviewDate = new Date(concept.nextReview);
      const daysUntilForgetting = this._daysBetween(now, reviewDate);

      // Alert if within 2 days of forgetting
      if (daysUntilForgetting >= -2 && daysUntilForgetting <= 2) {
        approaching.push({
          conceptId,
          daysSince,
          daysUntilForgetting,
          masteryLevel: concept.masteryLevel
        });
      }
    }

    return approaching.sort((a, b) => a.daysUntilForgetting - b.daysUntilForgetting);
  }

  /**
   * Suggest related concepts for deeper learning
   */
  _suggestRelatedConcepts(profile) {
    // Placeholder: In production, use concept graph/taxonomy
    const strongConcepts = [];
    
    for (const [conceptId, concept] of profile.concepts) {
      if (concept.masteryLevel >= 80) {
        strongConcepts.push({
          type: 'advanced_exploration',
          conceptId: `${conceptId}_advanced`,
          reason: `Strong foundation in ${conceptId} - ready for advanced topics`,
          priority: 'low',
          estimatedTime: 60
        });
      }
    }

    return strongConcepts;
  }

  /**
   * Generate daily recommendations
   */
  _generateDailyRecommendations(dueQueue, profile) {
    const recommendations = [];
    const timeAvailable = profile.preferences.dailyPracticeTime;
    let timeAllocated = 0;

    for (const item of dueQueue) {
      if (timeAllocated + item.estimatedTime <= timeAvailable) {
        recommendations.push(item.conceptId);
        timeAllocated += item.estimatedTime;
      }
    }

    return {
      concepts: recommendations,
      totalTime: timeAllocated,
      message: recommendations.length > 0
        ? `Focus on ${recommendations.length} concepts today (${timeAllocated} min)`
        : 'All caught up! No reviews due today.'
    };
  }

  /**
   * Estimate review time based on concept complexity
   */
  _estimateReviewTime(concept) {
    // Base time: 10 minutes
    // Add time for low mastery (more practice needed)
    const masteryPenalty = Math.max(0, (70 - concept.masteryLevel) / 2);
    // Add time for recent mistakes
    const mistakePenalty = Math.min(concept.mistakePatterns.length * 2, 10);

    return Math.round(10 + masteryPenalty + mistakePenalty);
  }

  /**
   * Calculate days between dates
   */
  _daysBetween(date1, date2) {
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.round((date2 - date1) / oneDay);
  }

  /**
   * Get student statistics
   */
  getStudentStats(studentId) {
    const profile = this.studentProfiles.get(studentId);
    if (!profile) return null;

    const totalConcepts = profile.concepts.size;
    const masteryLevels = Array.from(profile.concepts.values()).map(c => c.masteryLevel);
    const averageMastery = masteryLevels.length > 0
      ? Math.round(masteryLevels.reduce((a, b) => a + b, 0) / masteryLevels.length)
      : 0;

    return {
      totalConcepts,
      averageMastery,
      weakAreas: profile.weakAreas.length,
      currentStreak: profile.streakData.current,
      longestStreak: profile.streakData.longest,
      conceptsExcellent: masteryLevels.filter(m => m >= 80).length,
      conceptsNeedWork: masteryLevels.filter(m => m < 60).length
    };
  }

  /**
   * Clear student data (for testing)
   */
  clearStudent(studentId) {
    this.studentProfiles.delete(studentId);
  }
}

// Singleton export
export const readinessScheduler = new ReadinessScheduler();
export default ReadinessScheduler;
