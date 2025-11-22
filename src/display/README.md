# Chef-Themed Loading Indicators & Tips System

This module provides fun, personality-driven loading indicators and contextual tips for the Backlog Chef CLI.

## Features

### 🍳 Chef-Themed Loading Indicators

Each pipeline step shows cooking-related action phrases with appropriate emojis:

```
[1/8] 📋  Reviewing the menu...
[2/8] 🔪  Chopping ingredients...
[3/8] 🧂  Checking seasoning levels...
[4/8] 🥘  Simmering the details...
[5/8] 🌡️  Checking temperature...
[6/8] 🍳  Crafting the dish...
[7/8] ✨  Quality control...
[8/8] 🍽️  Plating the presentation...
```

### 💡 Contextual Tips

Tips are displayed during long operations, combining chef wisdom with CLI guidance:

```
🔪 "A sharp knife makes clean cuts" → Clear requirements save implementation time
💡 Tip: Use --verbose to see detailed pipeline logs
📖 "Mise en place is the religion of all good cooks" - Anthony Bourdain
```

### ⏱️ Duration Tracking

Each step shows elapsed time:

```
✔ [2/8] 🔪  Julienning user stories...
  🔧 "Use the right tool for the job" → Choose the right output format (9.4s)
```

## Usage

### Enabling/Disabling

The chef theme is enabled by default. To disable:

```bash
# Via environment variable
CHEF_THEME=false backlog-chef process meeting.txt

# Disable tips only
CHEF_SHOW_TIPS=false backlog-chef process meeting.txt
```

### Configuration

Create `~/.backlog-chef/display-config.yaml`:

```yaml
display:
  chef_theme: true              # Enable chef theme
  show_tips: true               # Show tips
  tip_style: "both"             # both, metaphor, cli
  tip_rotation_seconds: 8       # How often tips change
  tip_categories:
    - chef_wisdom
    - cli_usage
    - chef_quotes
```

## Architecture

### Components

- **`chef-verbs.ts`** - Database of cooking terms mapped to pipeline steps
- **`tips.ts`** - Database of helpful tips with chef metaphors
- **`chef-loader.ts`** - Main loading indicator class using ora spinner
- **`base-step.ts`** - Integration point for all pipeline steps

### How It Works

1. When a pipeline step starts, `BaseStep.execute()` creates a `ChefLoader`
2. ChefLoader selects a random cooking verb for the step
3. If tips are enabled, it rotates tips every N seconds
4. On completion, it shows success message with duration

### Adding New Tips

Add tips to `src/display/tips.ts`:

```typescript
{
  id: 'my-tip',
  category: 'chef_wisdom',
  context: 'enrich_context',
  chef_metaphor: 'Let it simmer',
  cli_tip: 'Patience yields better results',
  emoji: '🥘',
}
```

### Adding New Cooking Verbs

Add verbs to `src/display/chef-verbs.ts`:

```typescript
enrich_context: [
  { emoji: '🧂', text: 'Marinating with context' },
  { emoji: '🥘', text: 'Simmering the details' },
  // Add more here
],
```

## Examples

### Full Pipeline Output

```bash
$ backlog-chef process meeting.txt

🎯 Backlog Chef Pipeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/8] 📋  Reviewing the menu...
✔ [1/8] 📖  Consulting the cookbook... (3.2s)
  📄 Step output saved: step-1-detect_event_type.json

[2/8] 🔪  Chopping ingredients...
✔ [2/8] 🔪  Mincing the details...
  🔪 "A sharp knife makes clean cuts" → Clear requirements save time (5.1s)
  📄 Step output saved: step-2-extract_candidates.json

[3/8] 🧂  Checking seasoning levels...
✔ [3/8] ⚖️  Weighing portions... (4.8s)
  📄 Step output saved: step-3-score_confidence.json

[4/8] 🥘  Simmering the details...
✔ [4/8] 🧂  Marinating with context...
  🥘 "Low and slow wins the race" → Thorough refinement prevents rework (18.2s)
  📄 Step output saved: step-4-enrich_context.json

... (continues for all 8 steps)
```

### Professional Mode (No Chef Theme)

```bash
$ CHEF_THEME=false backlog-chef process meeting.txt

================================================================================
BACKLOG CHEF PIPELINE
================================================================================
Transcript length: 3799 characters
================================================================================

[detect_event_type] Starting...
[detect_event_type] ✓ Completed in 3.20s

[extract_candidates] Starting...
[extract_candidates] ✓ Completed in 5.10s

...
```

## Dependencies

- **ora** - Terminal spinner library
- **chalk** - Terminal color/styling library
- **cli-spinners** - Collection of spinner styles

## Future Enhancements

- Seasonal themes (grilling in summer, stews in winter)
- User-contributed tips database
- Achievement system ("Master Chef: 100 PBIs processed!")
- Sound effects (optional sizzle sounds)
- Different chef personalities (calm vs intense)
