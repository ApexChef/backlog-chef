/**
 * Chef-Themed Cooking Verbs Database
 *
 * Maps pipeline steps to cooking-related action phrases
 * Adds personality and fun to loading indicators
 */

export interface CookingVerb {
  emoji: string;
  text: string;
}

/**
 * Cooking verbs organized by pipeline step
 * Each step has multiple verbs that rotate randomly
 */
export const COOKING_VERBS: Record<string, CookingVerb[]> = {
  // STEP 1: Event Detection
  detect_event_type: [
    { emoji: '👨‍🍳', text: 'Reading the recipe' },
    { emoji: '📋', text: 'Reviewing the menu' },
    { emoji: '🔍', text: "Checking today's special" },
    { emoji: '📖', text: 'Consulting the cookbook' },
    { emoji: '🎯', text: 'Planning the service' },
    { emoji: '🗂️', text: 'Organizing the menu' },
  ],

  // STEP 2: Extract Candidates
  extract_candidates: [
    { emoji: '🔪', text: 'Chopping ingredients' },
    { emoji: '🔪', text: 'Dicing requirements' },
    { emoji: '🔪', text: 'Mincing the details' },
    { emoji: '📋', text: 'Prepping mise en place' },
    { emoji: '🔪', text: 'Julienning user stories' },
    { emoji: '🔪', text: 'Brunoise-ing acceptance criteria' },
    { emoji: '📋', text: 'Organizing ingredients' },
    { emoji: '🥕', text: 'Washing the produce' },
  ],

  // STEP 3: Score Confidence
  score_confidence: [
    { emoji: '👨‍🍳', text: 'Tasting for quality' },
    { emoji: '⚖️', text: 'Weighing portions' },
    { emoji: '🧂', text: 'Checking seasoning levels' },
    { emoji: '🔍', text: 'Inspecting ingredients' },
    { emoji: '👃', text: 'Testing for freshness' },
    { emoji: '✨', text: 'Quality control check' },
    { emoji: '🌡️', text: 'Taking the temperature' },
  ],

  // STEP 4: Enrich Context
  enrich_context: [
    { emoji: '🧂', text: 'Marinating with context' },
    { emoji: '🥘', text: 'Simmering the details' },
    { emoji: '🍯', text: 'Adding depth of flavor' },
    { emoji: '🧈', text: 'Enriching the sauce' },
    { emoji: '🌿', text: 'Adding aromatics' },
    { emoji: '🍷', text: 'Deglazing with knowledge' },
    { emoji: '🥄', text: 'Stirring in context' },
    { emoji: '⏰', text: 'Letting it develop' },
  ],

  // STEP 5: Check Risks
  check_risks: [
    { emoji: '🌡️', text: 'Checking temperature' },
    { emoji: '👃', text: 'Running smell test' },
    { emoji: '🔍', text: 'Inspecting for issues' },
    { emoji: '⚠️', text: 'Checking for allergens' },
    { emoji: '🧪', text: 'Testing consistency' },
    { emoji: '🔬', text: 'Analyzing composition' },
    { emoji: '⚡', text: 'Checking for hazards' },
  ],

  // STEP 6: Generate Proposals
  generate_proposals: [
    { emoji: '🍳', text: 'Crafting the dish' },
    { emoji: '👨‍🍳', text: 'Developing the recipe' },
    { emoji: '📝', text: 'Writing the menu' },
    { emoji: '🎨', text: 'Designing the plate' },
    { emoji: '✨', text: 'Adding special touches' },
    { emoji: '🧑‍🍳', text: 'Perfecting the technique' },
    { emoji: '💡', text: 'Creating innovative pairings' },
  ],

  // STEP 7: Readiness Checker
  readiness_checker: [
    { emoji: '👨‍🍳', text: 'Final taste test' },
    { emoji: '✨', text: 'Quality control' },
    { emoji: '🍽️', text: 'Preparing for service' },
    { emoji: '🔔', text: 'Checking station readiness' },
    { emoji: '📋', text: 'Verifying the checklist' },
    { emoji: '🎯', text: 'Ensuring perfection' },
    { emoji: '👌', text: 'Final approval' },
  ],

  // STEP 8: Format Output
  format_output: [
    { emoji: '🍽️', text: 'Plating the presentation' },
    { emoji: '🎨', text: 'Garnishing artfully' },
    { emoji: '📸', text: 'Making it Instagram-worthy' },
    { emoji: '✨', text: 'Adding finishing touches' },
    { emoji: '🧑‍🍳', text: 'Wiping the rim' },
    { emoji: '🌿', text: 'Adding fresh herbs' },
    { emoji: '🔔', text: 'Ready for service' },
  ],

  // Generic/Default
  default: [
    { emoji: '🔥', text: 'Cooking with precision' },
    { emoji: '🥘', text: 'Preparing your order' },
    { emoji: '👨‍🍳', text: 'Working the station' },
    { emoji: '📋', text: 'Following the recipe' },
  ],
};

/**
 * Get a random cooking verb for a specific step
 */
export function getRandomVerb(stepName: string): CookingVerb {
  const verbs = COOKING_VERBS[stepName] || COOKING_VERBS.default;
  return verbs[Math.floor(Math.random() * verbs.length)];
}

/**
 * Get all verbs for a specific step
 */
export function getStepVerbs(stepName: string): CookingVerb[] {
  return COOKING_VERBS[stepName] || COOKING_VERBS.default;
}
