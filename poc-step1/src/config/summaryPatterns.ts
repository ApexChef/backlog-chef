/**
 * Summary pattern configurations for different meeting types
 */

import { EventType, SummaryPattern } from '../types';

export const summaryPatterns: SummaryPattern[] = [
  {
    eventType: EventType.REFINEMENT,
    requiredSections: ['questions', 'decisions'],
    patterns: [
      'which.*types.*access',
      'permission.*model',
      'average.*per.*customer',
      'scope.*limited',
      'requirements',
      'acceptance criteria',
      'story points',
      'definition.*done',
      'business.*requirements',
      'technical.*constraints'
    ],
    confidence: 0.75
  },
  {
    eventType: EventType.PLANNING,
    requiredSections: ['decisions'],
    patterns: [
      'sprint.*goal',
      'capacity',
      'velocity',
      'commitment',
      'selected.*sprint',
      'sprint.*backlog',
      'team.*availability',
      'story.*points.*committed',
      'sprint.*forecast'
    ],
    confidence: 0.70
  },
  {
    eventType: EventType.RETROSPECTIVE,
    requiredSections: ['actionItems'],
    patterns: [
      'went.*well',
      'didn.*work',
      'improve',
      'action.*items',
      'team.*feedback',
      'process.*improvement',
      'lessons.*learned',
      'team.*morale',
      'celebration'
    ],
    confidence: 0.80
  },
  {
    eventType: EventType.DAILY,
    requiredSections: [],
    patterns: [
      'yesterday',
      'today',
      'blocker',
      'impediment',
      'progress',
      'completed.*yesterday',
      'working.*today',
      'help.*needed',
      'dependencies'
    ],
    confidence: 0.65
  }
];