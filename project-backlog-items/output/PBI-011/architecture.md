# PBI-011: Template-Based Formatter Architecture

## Executive Summary

Replace hard-coded TypeScript formatters with a flexible, template-based architecture that gives users full control over output formats and enables infinite extensibility without code changes.

---

## Current State (PBI-010)

**Problems:**
1. **Hard-coded formatters** - All formatting logic in TypeScript classes
2. **No user control** - Clients can't customize output without modifying code
3. **File extension mismatch** - DevOps formatter generates text with `.json` extension
4. **Limited extensibility** - Adding new formats requires code changes
5. **Tight coupling** - Format logic mixed with data transformation

**Current Architecture:**
```
src/formatters/
├── types.ts
├── devops-formatter.ts        # TypeScript class with hard-coded strings
├── obsidian-formatter.ts      # TypeScript class with hard-coded strings
├── confluence-formatter.ts    # TypeScript class with hard-coded strings
└── format-service.ts          # Manages formatter instances
```

---

## Proposed Architecture

### 1. Template-Based System

**Technology Choice: Handlebars (`.hbs`)**
- **Logic-less templating** - Keeps templates simple and maintainable
- **Industry standard** - Widely used in Node.js ecosystem
- **Helper support** - Custom functions for complex logic
- **Partial support** - Reusable template components
- **Easy for non-developers** - Simple syntax, no programming required

**Benefits:**
- Users edit `.hbs` files, not TypeScript
- Templates are human-readable
- No compilation needed to test changes
- Community can contribute formats
- Future-proof for new tools (Jira, Linear, Notion, etc.)

---

### 2. Directory Structure

```
backlog-chef/
├── templates/                           # Built-in templates (shipped with CLI)
│   ├── devops/
│   │   ├── config.yaml                 # Format configuration
│   │   ├── pbi.hbs                     # Template for individual PBI
│   │   ├── summary.hbs                 # Template for summary/list view
│   │   └── helpers.js                  # Optional custom helpers
│   │
│   ├── obsidian/
│   │   ├── config.yaml
│   │   ├── pbi.hbs
│   │   ├── summary.hbs
│   │   └── partials/                   # Reusable template fragments
│   │       ├── quality-scores.hbs
│   │       ├── tasks-section.hbs
│   │       └── metadata.hbs
│   │
│   ├── confluence/
│   │   ├── config.yaml
│   │   ├── pbi.hbs
│   │   └── summary.hbs
│   │
│   └── markdown/                        # Generic markdown (example/base)
│       ├── config.yaml
│       ├── pbi.hbs
│       └── summary.hbs
│
├── .backlog-chef/                      # User customization (git-ignored)
│   └── templates/
│       ├── devops/                     # Override built-in DevOps
│       │   └── pbi.hbs                 # Custom template
│       │
│       └── jira/                       # Brand new format
│           ├── config.yaml
│           ├── pbi.hbs
│           └── summary.hbs
│
└── src/
    └── formatters/
        ├── engine/
        │   ├── template-engine.ts      # Core Handlebars engine
        │   ├── template-resolver.ts    # Template discovery & resolution
        │   ├── helper-registry.ts      # Built-in helpers
        │   └── config-loader.ts        # Load format configs
        │
        └── format-service.ts           # Refactored to use templates
```

---

### 3. Template Resolution Hierarchy

**Search Order (first match wins):**

```
1. Project-level:    ./.backlog-chef/templates/{format}/
2. User-level:       ~/.backlog-chef/templates/{format}/
3. Built-in:         <install-dir>/templates/{format}/
```

**Example:**
```bash
# User wants to generate DevOps format
backlog-chef format output/summary.json --to devops

# System checks:
1. ./backlog-chef/templates/devops/pbi.hbs     # Project override
2. ~/.backlog-chef/templates/devops/pbi.hbs    # User override
3. /usr/local/lib/node_modules/backlog-chef/templates/devops/pbi.hbs  # Built-in

# First found template is used
```

**Verbose Mode:**
```bash
backlog-chef format output/summary.json --to devops --verbose

# Output:
📄 Using DevOps format
   Template: ~/.backlog-chef/templates/devops/pbi.hbs (user override)
   Config:   /usr/local/lib/.../templates/devops/config.yaml (built-in)
```

---

### 4. Format Configuration Schema

**`config.yaml` Structure:**

```yaml
# Format Metadata
format:
  id: devops                                    # Unique identifier (lowercase, alphanumeric + dash)
  name: Azure DevOps Work Item                  # Display name
  description: Azure DevOps-compatible work item format with JSON structure
  version: 1.0.0                                # Template version
  author: Backlog Chef Team

# Output Configuration
output:
  file_extension: .json                         # File extension for generated files
  mime_type: application/json                   # MIME type (optional)

# Template Files
templates:
  pbi: pbi.hbs                                  # PBI template filename
  summary: summary.hbs                          # Summary template filename

# Partials (optional)
partials:
  - name: quality-scores
    file: partials/quality-scores.hbs
  - name: tasks-section
    file: partials/tasks-section.hbs
  - name: metadata
    file: partials/metadata.hbs

# Custom Helpers (optional)
helpers:
  file: helpers.js                              # JavaScript file with helper functions

# Metadata (optional)
tags:
  - azure-devops
  - work-items
  - json

documentation:
  url: https://docs.backlog-chef.dev/formats/devops
  examples: examples/
```

---

### 5. Template Context Structure

**Data Available to Templates:**

```javascript
{
  // Individual PBI context (for pbi.hbs)
  pbi: {
    id: "PBI-001",
    title: "As a user, I want...",
    description: "Detailed description...",
    acceptance_criteria: ["criterion 1", "criterion 2"],
    notes: ["note 1", "note 2"],
    mentioned_by: ["John Doe", "Jane Smith"]
  },

  scores: {
    overall_score: 85,
    completeness: 90,
    clarity: 80,
    actionability: 85,
    testability: 85,
    missing_elements: ["element 1"],
    strengths: ["strength 1"],
    concerns: ["concern 1"]
  },

  context: {
    similar_work: [...],
    past_decisions: [...],
    technical_docs: [...],
    risk_flags: [...],
    suggestions: [...]
  },

  risks: {
    risks: [...],
    overall_risk_level: "medium"
  },

  questions: [...],

  readiness: {
    readiness_status: "🟡 NEEDS REFINEMENT",
    readiness_score: 75,
    blocking_issues: [...],
    warnings: [...],
    recommendations: [...],
    sprint_ready: false,
    estimated_refinement_time: "2-4 hours"
  },

  tasks: {
    tasks: {
      pre_work: [...],
      implementation: [...],
      verification: [...]
    },
    summary: {
      total_tasks: 12,
      estimated_total_effort: "5-8 hours"
    }
  },

  // Metadata
  metadata: {
    run_id: "2025-11-20T12-17-20",
    generated_at: "2025-11-21T08:30:00.000Z",
    event_type: "refinement",
    format_id: "devops",
    format_name: "Azure DevOps Work Item"
  }
}
```

**Summary Context (for summary.hbs):**

```javascript
{
  event_type: "refinement",

  pbis: [
    { pbi: {...}, scores: {...}, ... },  // Array of all PBIs
    { pbi: {...}, scores: {...}, ... }
  ],

  metadata: {
    processed_at: "2025-11-21T08:30:00.000Z",
    total_pbis: 5,
    ready_count: 2,
    needs_refinement_count: 2,
    not_ready_count: 1,
    total_cost_usd: 0.15,
    total_duration_ms: 45000,
    models_used: ["claude-3-5-sonnet-20241022"]
  }
}
```

---

### 6. Built-in Helper Functions

**Helpers Available in All Templates:**

```handlebars
{{!-- Date/Time Formatting --}}
{{formatDate metadata.generated_at format="YYYY-MM-DD HH:mm"}}
{{timeAgo metadata.generated_at}}
{{formatDuration metadata.total_duration_ms}}

{{!-- Number Formatting --}}
{{formatCurrency metadata.total_cost_usd}}
{{formatPercent 0.85}}
{{round scores.overall_score decimals=1}}

{{!-- Score Helpers --}}
{{scoreLevel scores.overall_score}}          <!-- Returns: "excellent" | "good" | "fair" | "poor" -->
{{scoreColor scores.overall_score}}          <!-- Returns: "green" | "yellow" | "red" -->
{{scoreIcon scores.overall_score}}           <!-- Returns: "✅" | "⚠️" | "❌" -->

{{!-- Priority Helpers --}}
{{priorityLevel readiness.readiness_score}}  <!-- Returns: 1 | 2 | 3 -->
{{priorityLabel readiness.readiness_score}}  <!-- Returns: "High" | "Medium" | "Low" -->

{{!-- Status Helpers --}}
{{readinessIcon readiness.readiness_status}} <!-- Returns: "🟢" | "🟡" | "🔴" -->
{{mapToDevOpsState readiness}}               <!-- Returns: "New" | "Approved" | "Committed" -->

{{!-- String Helpers --}}
{{truncate pbi.description length=100}}
{{capitalize pbi.title}}
{{kebabCase pbi.title}}
{{stripMarkdown pbi.description}}

{{!-- Array Helpers --}}
{{join pbi.mentioned_by separator=", "}}
{{length pbi.acceptance_criteria}}
{{first pbi.acceptance_criteria}}
{{last pbi.notes}}

{{!-- Conditional Helpers --}}
{{#if (gt scores.overall_score 80)}}High quality{{/if}}
{{#unless readiness.sprint_ready}}Not ready{{/unless}}
{{#eq readiness.readiness_status "🟢 READY"}}Ready!{{/eq}}

{{!-- Comparison Helpers --}}
{{gt value 10}}          <!-- Greater than -->
{{gte value 10}}         <!-- Greater than or equal -->
{{lt value 10}}          <!-- Less than -->
{{lte value 10}}         <!-- Less than or equal -->
{{eq value "test"}}      <!-- Equal -->
```

---

### 7. Example Templates

**DevOps PBI Template (`templates/devops/pbi.hbs`):**

```handlebars
{
  "id": "{{pbi.id}}",
  "workItemType": "Product Backlog Item",
  "title": "{{pbi.title}}",
  "state": "{{mapToDevOpsState readiness}}",
  "priority": {{priorityLevel readiness.readiness_score}},

  "description": "{{pbi.description}}",

  "acceptanceCriteria": [
    {{#each pbi.acceptance_criteria}}
    "{{this}}"{{#unless @last}},{{/unless}}
    {{/each}}
  ],

  "tags": [
    {{#if readiness.sprint_ready}}"ready-for-sprint",{{/if}}
    "{{readiness.readiness_status}}",
    "score-{{scores.overall_score}}"
  ],

  "customFields": {
    "ReadinessScore": {{readiness.readiness_score}},
    "OverallQuality": {{scores.overall_score}},
    "SprintReady": {{readiness.sprint_ready}},
    "GeneratedAt": "{{metadata.generated_at}}",
    "RunId": "{{metadata.run_id}}"
  },

  {{#if tasks}}
  "tasks": [
    {{#each tasks.tasks.pre_work}}
    {
      "title": "{{this.title}}",
      "type": "Pre-Work",
      "priority": "{{this.priority}}",
      "estimatedEffort": "{{this.estimated_effort}}"
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ],
  {{/if}}

  {{#if (gt (length readiness.blocking_issues) 0)}}
  "blockingIssues": [
    {{#each readiness.blocking_issues}}
    "{{this}}"{{#unless @last}},{{/unless}}
    {{/each}}
  ],
  {{/if}}

  "metadata": {
    "generatedBy": "Backlog Chef",
    "version": "1.0.0",
    "cost": {{metadata.total_cost_usd}}
  }
}
```

**Obsidian PBI Template (`templates/obsidian/pbi.hbs`):**

```handlebars
# {{pbi.id}}: {{pbi.title}}

---
tags: [pbi, backlog-chef, {{kebabCase readiness.readiness_status}}]
run-id: {{metadata.run_id}}
created: {{metadata.generated_at}}
status: {{readiness.readiness_status}}
sprint-ready: {{readiness.sprint_ready}}
---

## 📊 Status & Readiness

**Readiness**: {{readiness.readiness_status}}
**Ready for Sprint**: {{#if readiness.sprint_ready}}✅ Yes{{else}}❌ No{{/if}}
**Readiness Score**: {{readiness.readiness_score}}/100

## 📝 Description

{{pbi.description}}

## ✅ Acceptance Criteria

{{#each pbi.acceptance_criteria}}
- [ ] {{this}}
{{/each}}

## 📈 Quality Scores

{{> quality-scores scores=scores}}

{{#if readiness.blocking_issues}}
## 🚨 Blocking Issues

{{#each readiness.blocking_issues}}
- ❌ {{this}}
{{/each}}
{{/if}}

{{#if readiness.warnings}}
## ⚠️ Warnings

{{#each readiness.warnings}}
- {{this}}
{{/each}}
{{/if}}

{{#if tasks}}
{{> tasks-section tasks=tasks}}
{{/if}}

{{#if risks}}
## 🎲 Risks ({{risks.overall_risk_level}})

{{#each risks.risks}}
- [{{scoreIcon this.severity}}] **{{this.type}}**: {{this.description}}
  {{#if this.mitigation}}→ Mitigation: {{this.mitigation}}{{/if}}
{{/each}}
{{/if}}

{{> metadata metadata=metadata}}
```

**Partial: Quality Scores (`templates/obsidian/partials/quality-scores.hbs`):**

```handlebars
| Metric | Score |
|--------|-------|
| Overall | {{scores.overall_score}}/100 |
| Completeness | {{scores.completeness}}/100 |
| Clarity | {{scores.clarity}}/100 |
| Actionability | {{scores.actionability}}/100 |
| Testability | {{scores.testability}}/100 |
```

---

### 8. Core Classes

**Template Engine (`src/formatters/engine/template-engine.ts`):**

```typescript
import Handlebars from 'handlebars';
import { TemplateResolver } from './template-resolver';
import { HelperRegistry } from './helper-registry';
import { ConfigLoader } from './config-loader';

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private resolver: TemplateResolver;
  private helperRegistry: HelperRegistry;
  private configLoader: ConfigLoader;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate>;

  constructor() {
    this.handlebars = Handlebars.create();
    this.resolver = new TemplateResolver();
    this.helperRegistry = new HelperRegistry();
    this.configLoader = new ConfigLoader();
    this.compiledTemplates = new Map();

    this.registerBuiltInHelpers();
  }

  /**
   * Render a PBI using the specified format
   */
  async renderPBI(
    formatId: string,
    context: PBIContext
  ): Promise<string> {
    const template = await this.getTemplate(formatId, 'pbi');
    return template(context);
  }

  /**
   * Render a summary using the specified format
   */
  async renderSummary(
    formatId: string,
    context: SummaryContext
  ): Promise<string> {
    const template = await this.getTemplate(formatId, 'summary');
    return template(context);
  }

  /**
   * Get compiled template (with caching)
   */
  private async getTemplate(
    formatId: string,
    type: 'pbi' | 'summary'
  ): Promise<HandlebarsTemplateDelegate> {
    const cacheKey = `${formatId}:${type}`;

    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey)!;
    }

    // Resolve template path
    const templatePath = await this.resolver.resolve(formatId, type);

    // Load config and register partials/helpers
    const config = await this.configLoader.load(formatId);
    await this.registerPartials(formatId, config);
    await this.registerCustomHelpers(formatId, config);

    // Read and compile template
    const source = await fs.promises.readFile(templatePath, 'utf-8');
    const compiled = this.handlebars.compile(source);

    // Cache compiled template
    this.compiledTemplates.set(cacheKey, compiled);

    return compiled;
  }

  /**
   * Register built-in helpers
   */
  private registerBuiltInHelpers(): void {
    for (const [name, fn] of this.helperRegistry.getAll()) {
      this.handlebars.registerHelper(name, fn);
    }
  }

  /**
   * Register partials for a format
   */
  private async registerPartials(
    formatId: string,
    config: FormatConfig
  ): Promise<void> {
    if (!config.partials) return;

    for (const partial of config.partials) {
      const partialPath = await this.resolver.resolvePartial(formatId, partial.file);
      const source = await fs.promises.readFile(partialPath, 'utf-8');
      this.handlebars.registerPartial(partial.name, source);
    }
  }

  /**
   * Register custom helpers for a format
   */
  private async registerCustomHelpers(
    formatId: string,
    config: FormatConfig
  ): Promise<void> {
    if (!config.helpers?.file) return;

    const helpersPath = await this.resolver.resolveHelper(formatId, config.helpers.file);
    const helpers = await import(helpersPath);

    for (const [name, fn] of Object.entries(helpers)) {
      if (typeof fn === 'function') {
        this.handlebars.registerHelper(name, fn as HelperDelegate);
      }
    }
  }

  /**
   * List all available formats
   */
  async listFormats(): Promise<FormatInfo[]> {
    return this.resolver.discoverFormats();
  }

  /**
   * Validate templates for a format
   */
  async validateFormat(formatId: string): Promise<ValidationResult> {
    try {
      const config = await this.configLoader.load(formatId);
      const pbiPath = await this.resolver.resolve(formatId, 'pbi');
      const summaryPath = await this.resolver.resolve(formatId, 'summary');

      // Try to compile both templates
      const pbiSource = await fs.promises.readFile(pbiPath, 'utf-8');
      const summarySource = await fs.promises.readFile(summaryPath, 'utf-8');

      this.handlebars.compile(pbiSource);
      this.handlebars.compile(summarySource);

      return {
        valid: true,
        formatId,
        config,
        templates: { pbi: pbiPath, summary: summaryPath }
      };
    } catch (error) {
      return {
        valid: false,
        formatId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
```

**Template Resolver (`src/formatters/engine/template-resolver.ts`):**

```typescript
export class TemplateResolver {
  private searchPaths: string[];

  constructor() {
    this.searchPaths = [
      path.join(process.cwd(), '.backlog-chef', 'templates'),  // Project
      path.join(os.homedir(), '.backlog-chef', 'templates'),   // User
      path.join(__dirname, '../../../templates')                // Built-in
    ];
  }

  /**
   * Resolve template path using hierarchy
   */
  async resolve(
    formatId: string,
    type: 'pbi' | 'summary'
  ): Promise<string> {
    for (const searchPath of this.searchPaths) {
      const templatePath = path.join(searchPath, formatId, `${type}.hbs`);

      if (await this.exists(templatePath)) {
        return templatePath;
      }
    }

    throw new Error(`Template not found: ${formatId}/${type}.hbs`);
  }

  /**
   * Discover all available formats
   */
  async discoverFormats(): Promise<FormatInfo[]> {
    const formats = new Map<string, FormatInfo>();

    for (const searchPath of this.searchPaths) {
      if (!await this.exists(searchPath)) continue;

      const entries = await fs.promises.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const formatId = entry.name;
        const configPath = path.join(searchPath, formatId, 'config.yaml');

        if (await this.exists(configPath)) {
          const config = yaml.load(await fs.promises.readFile(configPath, 'utf-8'));

          formats.set(formatId, {
            id: formatId,
            name: config.format.name,
            description: config.format.description,
            source: this.getSourceType(searchPath),
            path: path.join(searchPath, formatId)
          });
        }
      }
    }

    return Array.from(formats.values());
  }

  private getSourceType(searchPath: string): 'built-in' | 'user' | 'project' {
    if (searchPath.includes('.backlog-chef')) {
      return searchPath.includes(os.homedir()) ? 'user' : 'project';
    }
    return 'built-in';
  }
}
```

---

### 9. CLI Commands

**Template Management Commands:**

```bash
# List all available formats
backlog-chef template list
# Output:
# Available Formats:
#   devops      Azure DevOps Work Item          (built-in)
#   obsidian    Obsidian Markdown with YAML     (user override)
#   confluence  Confluence Wiki Markup          (built-in)
#   jira        Jira Issue Format               (project custom)

# Show detailed info about a format
backlog-chef template show devops
# Output:
# Format: Azure DevOps Work Item (devops)
# Version: 1.0.0
# Description: Azure DevOps-compatible work item format
# File Extension: .json
#
# Templates:
#   PBI:     /usr/local/lib/.../templates/devops/pbi.hbs
#   Summary: /usr/local/lib/.../templates/devops/summary.hbs
#
# Partials: None
# Custom Helpers: Yes (helpers.js)

# Initialize custom template (copies built-in to user directory)
backlog-chef template init devops
# Output:
# ✅ Copied built-in devops templates to ~/.backlog-chef/templates/devops/
# You can now customize:
#   - ~/.backlog-chef/templates/devops/pbi.hbs
#   - ~/.backlog-chef/templates/devops/summary.hbs
#   - ~/.backlog-chef/templates/devops/config.yaml

# Create new custom format from scratch
backlog-chef template create my-format
# Output:
# ✅ Created template scaffold at ~/.backlog-chef/templates/my-format/
#
# Edit the following files:
#   - config.yaml    (format configuration)
#   - pbi.hbs        (PBI template)
#   - summary.hbs    (summary template)
#
# See documentation: https://docs.backlog-chef.dev/templates/creating

# Validate templates
backlog-chef template validate
# Output:
# Validating templates...
#   ✅ devops     (built-in)
#   ✅ obsidian   (user override)
#   ✅ confluence (built-in)
#   ❌ jira       (project custom)
#      Error: Template compilation failed: pbi.hbs:15 - Unexpected token

# Validate specific format
backlog-chef template validate jira
# Output:
# ❌ jira template validation failed
#
# Error in pbi.hbs at line 15:
#   {{#each tasks.tasks.pre_work}
#                               ^
# Missing closing tag for {{#each}}
```

**Enhanced Format Command:**

```bash
# List formats with template info
backlog-chef format --list
# Output:
# Available Output Formats:
#
# Built-in:
#   devops      - Azure DevOps Work Item (.json)
#   obsidian    - Obsidian Markdown (.md)
#   confluence  - Confluence Wiki Markup (.md)
#   markdown    - Generic Markdown (.md)
#
# User Overrides:
#   obsidian    - ~/.backlog-chef/templates/obsidian/
#
# Project Custom:
#   jira        - ./.backlog-chef/templates/jira/
#
# Use --verbose to see template paths

# Show which template will be used
backlog-chef format --show devops
# Output:
# Format: devops (Azure DevOps Work Item)
#
# Templates (resolution order):
#   PBI:
#     ⏭️  ./.backlog-chef/templates/devops/pbi.hbs (not found)
#     ⏭️  ~/.backlog-chef/templates/devops/pbi.hbs (not found)
#     ✅ /usr/local/lib/.../templates/devops/pbi.hbs (using)
#
#   Summary:
#     ⏭️  ./.backlog-chef/templates/devops/summary.hbs (not found)
#     ⏭️  ~/.backlog-chef/templates/devops/summary.hbs (not found)
#     ✅ /usr/local/lib/.../templates/devops/summary.hbs (using)
```

---

### 10. Migration Strategy

**Phase 1: Build Template Engine** (Week 1)
- Install Handlebars: `npm install handlebars`
- Create `TemplateEngine` class
- Create `TemplateResolver` class
- Create `HelperRegistry` class
- Create `ConfigLoader` class
- Add built-in helpers

**Phase 2: Create Templates** (Week 2)
- Convert DevOps formatter to template (fix JSON output)
- Convert Obsidian formatter to template
- Convert Confluence formatter to template
- Create generic Markdown template
- Write config.yaml for each format

**Phase 3: CLI Commands** (Week 3)
- Implement `template list` command
- Implement `template show` command
- Implement `template init` command
- Implement `template create` command
- Implement `template validate` command
- Update `format --list` with template info

**Phase 4: Refactor Format Service** (Week 4)
- Update `FormatService` to use `TemplateEngine`
- Remove old formatter classes
- Update tests
- Add integration tests

**Phase 5: Documentation** (Week 5)
- Template development guide
- Available helpers reference
- Context structure documentation
- Migration guide for early adopters
- Example custom templates

---

### 11. Testing Strategy

**Unit Tests:**
```typescript
describe('TemplateEngine', () => {
  it('should render PBI with DevOps template', async () => {
    const engine = new TemplateEngine();
    const result = await engine.renderPBI('devops', mockPBIContext);

    expect(result).toContain('"workItemType": "Product Backlog Item"');
    expect(JSON.parse(result)).toHaveProperty('id', 'PBI-001');
  });

  it('should resolve templates in correct order', async () => {
    // Create user override
    await createUserTemplate('devops', 'pbi.hbs', 'USER TEMPLATE');

    const engine = new TemplateEngine();
    const result = await engine.renderPBI('devops', mockPBIContext);

    expect(result).toContain('USER TEMPLATE');
  });

  it('should register custom helpers', async () => {
    const engine = new TemplateEngine();

    // Custom helper in templates/devops/helpers.js
    const result = await engine.renderPBI('devops', mockPBIContext);

    expect(result).toContain('custom helper output');
  });

  it('should validate templates', async () => {
    const engine = new TemplateEngine();
    const result = await engine.validateFormat('devops');

    expect(result.valid).toBe(true);
  });
});
```

**Integration Tests:**
```typescript
describe('Template Format Command', () => {
  it('should generate output using templates', async () => {
    await exec('backlog-chef format output/summary.json --to devops');

    const output = await fs.promises.readFile('output/PBI-001.json', 'utf-8');
    const json = JSON.parse(output);

    expect(json.workItemType).toBe('Product Backlog Item');
  });

  it('should list all formats', async () => {
    const result = await exec('backlog-chef template list');

    expect(result.stdout).toContain('devops');
    expect(result.stdout).toContain('obsidian');
    expect(result.stdout).toContain('confluence');
  });
});
```

---

### 12. Success Metrics

**Acceptance Criteria:**
1. ✅ All existing formats migrated to templates
2. ✅ Template resolution hierarchy working
3. ✅ Built-in helpers available in templates
4. ✅ Custom templates can be created
5. ✅ CLI commands for template management
6. ✅ DevOps format generates valid JSON
7. ✅ Documentation complete

**Quality Metrics:**
- Template compilation < 50ms (cached)
- Template rendering < 100ms per PBI
- 100% backward compatibility with existing formats
- Zero code changes required for new formats

**User Impact:**
- Users can customize outputs without coding
- New formats can be added in minutes
- Community can share templates
- Enterprise teams can standardize formats

---

## Conclusion

This template-based architecture transforms Backlog Chef from a rigid formatter into a flexible platform that users can fully customize and extend. By separating data transformation from presentation, we enable:

1. **User Ownership** - Templates belong to users, not developers
2. **Infinite Extensibility** - New formats without code changes
3. **Community Growth** - Share and discover templates
4. **Future-Proof** - Adapt to any tool (Jira, Linear, Notion, etc.)

The investment in this architecture will pay dividends as the product scales and as teams demand customization for their specific workflows and tools.
