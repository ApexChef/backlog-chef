/**
 * Chef-Themed Tips Database
 *
 * Provides helpful tips combining chef wisdom with CLI guidance
 * Contextual tips shown during long operations
 */

export type TipCategory = 'chef_wisdom' | 'cli_usage' | 'chef_quote';
export type TipContext =
  | 'detect_event_type'
  | 'extract_candidates'
  | 'score_confidence'
  | 'enrich_context'
  | 'check_risks'
  | 'generate_proposals'
  | 'readiness_checker'
  | 'format_output'
  | 'general';

export interface Tip {
  id: string;
  category: TipCategory;
  context: TipContext;
  chef_metaphor?: string;
  cli_tip: string;
  emoji: string;
}

/**
 * Complete tips database
 */
export const TIPS: Tip[] = [
  // CHEF WISDOM TIPS - General
  {
    id: 'sharp-knife',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'A sharp knife makes clean cuts',
    cli_tip: 'Clear requirements save implementation time',
    emoji: '🔪',
  },
  {
    id: 'mise-en-place',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Mise en place - everything in its place',
    cli_tip: 'Organize your inputs before processing',
    emoji: '📋',
  },
  {
    id: 'taste-as-you-go',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Taste as you cook',
    cli_tip: 'Test your code frequently during development',
    emoji: '👨‍🍳',
  },
  {
    id: 'low-and-slow',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Low and slow wins the race',
    cli_tip: 'Thorough refinement prevents rework',
    emoji: '🥘',
  },
  {
    id: 'season-in-layers',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Season in layers',
    cli_tip: 'Add details incrementally during refinement',
    emoji: '🧂',
  },
  {
    id: 'let-it-rest',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Let it rest before serving',
    cli_tip: 'Review PBIs before starting implementation',
    emoji: '⏰',
  },
  {
    id: 'hot-pan-cold-oil',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Hot pan, cold oil',
    cli_tip: 'Prepare your environment before starting work',
    emoji: '🍳',
  },
  {
    id: 'right-tool',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Use the right tool for the job',
    cli_tip: 'Choose the right output format for your workflow',
    emoji: '🔧',
  },
  {
    id: 'fresh-ingredients',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Fresh ingredients make the best dishes',
    cli_tip: 'Use recent context for better results',
    emoji: '🥬',
  },
  {
    id: 'balance-flavors',
    category: 'chef_wisdom',
    context: 'general',
    chef_metaphor: 'Balance your flavors',
    cli_tip: 'Balance detail with clarity in your PBIs',
    emoji: '⚖️',
  },

  // CHEF WISDOM - Step 4 (Enrich Context)
  {
    id: 'marinating-time',
    category: 'chef_wisdom',
    context: 'enrich_context',
    chef_metaphor: 'Give it time to marinate',
    cli_tip: 'Enrichment takes time but adds depth to your PBIs',
    emoji: '🧂',
  },
  {
    id: 'aromatics-stock',
    category: 'chef_wisdom',
    context: 'enrich_context',
    chef_metaphor: 'Aromatics build the foundation of good stock',
    cli_tip: 'Context from docs/ adds foundational knowledge',
    emoji: '🌿',
  },

  // CHEF WISDOM - Format Output
  {
    id: 'presentation-matters',
    category: 'chef_wisdom',
    context: 'format_output',
    chef_metaphor: 'We eat with our eyes first',
    cli_tip: 'Well-formatted PBIs are easier to understand',
    emoji: '🍽️',
  },

  // CLI USAGE TIPS - General
  {
    id: 'verbose-flag',
    category: 'cli_usage',
    context: 'general',
    cli_tip: 'Use --verbose to see detailed pipeline logs',
    emoji: '💡',
  },
  {
    id: 'formats-all',
    category: 'cli_usage',
    context: 'general',
    cli_tip: 'Try --formats all to generate multiple outputs',
    emoji: '💡',
  },
  {
    id: 'setup-wizard',
    category: 'cli_usage',
    context: 'general',
    cli_tip: 'Run backlog-chef setup for first-time configuration',
    emoji: '💡',
  },
  {
    id: 'help-flag',
    category: 'cli_usage',
    context: 'general',
    cli_tip: 'Add --help to any command for options',
    emoji: '💡',
  },
  {
    id: 'global-config',
    category: 'cli_usage',
    context: 'general',
    cli_tip: 'Global config: ~/.backlog-chef/config.yaml',
    emoji: '💡',
  },

  // CLI USAGE - Format specific
  {
    id: 'json-mise',
    category: 'cli_usage',
    context: 'format_output',
    chef_metaphor: 'JSON is the mise en place',
    cli_tip: 'All formats start from JSON - no API calls needed!',
    emoji: '💡',
  },
  {
    id: 'format-command',
    category: 'cli_usage',
    context: 'format_output',
    cli_tip: 'Use backlog-chef format to convert without re-cooking',
    emoji: '💡',
  },

  // CHEF QUOTES
  {
    id: 'bourdain-mise',
    category: 'chef_quote',
    context: 'general',
    cli_tip: '"Mise en place is the religion of all good cooks" - Anthony Bourdain',
    emoji: '📖',
  },
  {
    id: 'mfk-fisher',
    category: 'chef_quote',
    context: 'general',
    cli_tip: '"First we eat, then we do everything else" - M.F.K. Fisher',
    emoji: '📖',
  },
  {
    id: 'van-horne',
    category: 'chef_quote',
    context: 'general',
    cli_tip: '"Cooking is like love - enter with abandon" - Harriet van Horne',
    emoji: '📖',
  },
  {
    id: 'julia-child-fear',
    category: 'chef_quote',
    context: 'general',
    cli_tip: '"The only real stumbling block is fear of failure" - Julia Child',
    emoji: '📖',
  },
  {
    id: 'chef-gusteau',
    category: 'chef_quote',
    context: 'general',
    cli_tip: '"Anyone can cook, but only the fearless can be great" - Chef Gusteau',
    emoji: '📖',
  },
];

/**
 * Get a random tip for a specific context
 */
export function getRandomTip(context?: TipContext): Tip {
  const contextualTips = TIPS.filter(
    (t) => !context || t.context === context || t.context === 'general'
  );

  if (contextualTips.length === 0) {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  return contextualTips[Math.floor(Math.random() * contextualTips.length)];
}

/**
 * Format a tip for display
 */
export function formatTip(
  tip: Tip,
  style: 'metaphor' | 'cli' | 'both' = 'both'
): string {
  if (style === 'both' && tip.chef_metaphor) {
    return `${tip.emoji} "${tip.chef_metaphor}" → ${tip.cli_tip}`;
  }

  if (style === 'metaphor' && tip.chef_metaphor) {
    return `${tip.emoji} Chef wisdom: ${tip.chef_metaphor}`;
  }

  return `${tip.emoji} Tip: ${tip.cli_tip}`;
}

/**
 * Get tips by category
 */
export function getTipsByCategory(category: TipCategory): Tip[] {
  return TIPS.filter((t) => t.category === category);
}

/**
 * Get tips by context
 */
export function getTipsByContext(context: TipContext): Tip[] {
  return TIPS.filter((t) => t.context === context || t.context === 'general');
}
