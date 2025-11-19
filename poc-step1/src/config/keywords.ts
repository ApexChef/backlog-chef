/**
 * Keyword configurations for different meeting types
 */

import { EventType, KeywordConfig } from '../types';

export const keywordConfigs: KeywordConfig[] = [
  {
    eventType: EventType.REFINEMENT,
    keywords: [
      // English keywords
      'refinement', 'backlog refinement', 'grooming', 'story', 'user story',
      'acceptance criteria', 'pbi', 'product backlog', 'story points',
      'estimation', 'definition of done', 'dod', 'requirements',
      'clarification', 'scope', 'feature', 'epic', 'breakdown',
      // Dutch keywords (from transcript)
      'verfijning', 'verhaal', 'acceptatiecriteria', 'inschatting',
      'requirements', 'scope', 'functionaliteit'
    ],
    weight: 1.0,
    minMatches: 2,
    confidenceBoost: 0.1
  },
  {
    eventType: EventType.PLANNING,
    keywords: [
      // English keywords
      'sprint planning', 'planning', 'capacity', 'velocity', 'sprint goal',
      'commitment', 'forecast', 'sprint backlog', 'availability',
      'iteration', 'timebox', 'sprint length', 'planning poker',
      // Dutch keywords
      'planning', 'capaciteit', 'snelheid', 'sprint doel', 'commitment',
      'beschikbaarheid', 'iteratie'
    ],
    weight: 1.0,
    minMatches: 2,
    confidenceBoost: 0.1
  },
  {
    eventType: EventType.RETROSPECTIVE,
    keywords: [
      // English keywords
      'retrospective', 'retro', 'what went well', 'what didn\'t work',
      'action items', 'improve', 'improvement', 'lessons learned',
      'feedback', 'reflection', 'celebration', 'kudos', 'delta',
      'plus delta', 'start stop continue', 'mad sad glad',
      // Dutch keywords
      'retrospectief', 'retro', 'wat ging goed', 'wat ging niet goed',
      'actie punten', 'verbeteren', 'verbetering', 'feedback', 'reflectie'
    ],
    weight: 1.0,
    minMatches: 2,
    confidenceBoost: 0.15
  },
  {
    eventType: EventType.DAILY,
    keywords: [
      // English keywords
      'daily', 'standup', 'stand-up', 'daily scrum', 'yesterday',
      'today', 'blockers', 'impediments', 'progress', 'synchronization',
      'daily sync', 'morning meeting', 'daily huddle',
      // Dutch keywords
      'dagelijks', 'standup', 'gisteren', 'vandaag', 'blokkades',
      'voortgang', 'synchronisatie', 'ochtend meeting'
    ],
    weight: 1.0,
    minMatches: 2,
    confidenceBoost: 0.1
  }
];