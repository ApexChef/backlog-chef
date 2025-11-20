# Backlog Chef Configuration Index

Complete index of all configuration files and their purposes.

## 📁 Directory Structure

```
config/
├── workflows/              # Pipeline workflow definitions
│   ├── refinement-full.yaml
│   ├── refinement-minimal.yaml
│   ├── refinement-no-step7.yaml
│   ├── refinement-binary-readiness.yaml
│   ├── refinement-with-enrichment-only.yaml
│   ├── refinement-questions-only.yaml
│   ├── refinement-risk-focused.yaml
│   ├── refinement.yaml (original)
│   ├── README.md
│   └── WORKFLOWS-COMPARISON.md
│
├── steps/                  # Individual step configurations
│   ├── step-07-readiness-checker.yaml
│   ├── step-07-readiness-checker-no-scoring.yaml
│   └── step-07-readiness-checker-actions-only.yaml
│
├── stakeholders.yaml       # Team member registry
└── INDEX.md (this file)

```

---

## 🔧 Workflow Configurations (`config/workflows/`)

### Production Workflows

| File | Description | Speed | Complexity | Use Case |
|------|-------------|-------|------------|----------|
| **refinement-full.yaml** | Complete 8-step pipeline | Medium | Full | Production processing |
| **refinement-binary-readiness.yaml** | Full pipeline with binary readiness | Medium | Full | Teams avoiding score debates |
| **refinement-risk-focused.yaml** | Enhanced risk analysis | Slow | Enhanced | High-risk features |

### Development & Testing Workflows

| File | Description | Speed | Complexity | Use Case |
|------|-------------|-------|------------|----------|
| **refinement-minimal.yaml** | Fast basic processing | Fast | Minimal | Demos, quick tests |
| **refinement.yaml** | Original simple workflow | Fast | Basic | Legacy/reference |

### Specialized Workflows

| File | Description | Speed | Complexity | Use Case |
|------|-------------|-------|------------|----------|
| **refinement-no-step7.yaml** | Skip readiness checking | Medium | High | Manual readiness teams |
| **refinement-with-enrichment-only.yaml** | Focus on historical context | Medium | High | Learning from past work |
| **refinement-questions-only.yaml** | Question generation focus | Fast | Medium | Pre-refinement prep |

### Documentation

| File | Description |
|------|-------------|
| **README.md** | Complete workflow guide with usage examples |
| **WORKFLOWS-COMPARISON.md** | Visual comparison matrix and decision tree |

---

## 📋 Step Configurations (`config/steps/`)

### Step 7 Variants (Readiness Checker)

| File | Description | Subtasks | Output |
|------|-------------|----------|--------|
| **step-07-readiness-checker.yaml** | Default with scoring | 4 (all) | Status + Score + Actions |
| **step-07-readiness-checker-no-scoring.yaml** | Binary ready/not ready | 3 (no scoring) | Status + Actions |
| **step-07-readiness-checker-actions-only.yaml** | Action generation only | 2 (minimal) | Actions only |

### Other Steps (To Be Created)

```
Future configurations:
- step-01-event-detection.yaml
- step-02-extract-candidates.yaml
- step-03-score-confidence.yaml
- step-04-enrich-context.yaml
- step-05-check-risks.yaml
- step-06-generate-questions.yaml
- step-08-final-output.yaml
```

---

## 👥 Team Configuration

### stakeholders.yaml

Defines team member roles and contact information for question routing.

**Example structure:**
```yaml
stakeholders:
  - role: ProductOwner
    name: Sarah van der Berg
    email: sarah.vdberg@company.nl
  - role: Developer
    name: Lisa de Jong
    email: lisa.dejong@company.nl
```

**Usage:** Referenced by Step 6 (Generate Questions) to route questions to appropriate team members.

---

## 🔍 Quick Reference: Which Config Do I Need?

### I want to...

**Run the complete pipeline in production**
→ `config/workflows/refinement-full.yaml`

**Test quickly during development**
→ `config/workflows/refinement-minimal.yaml`

**Get simple READY/NOT READY without scores**
→ `config/workflows/refinement-binary-readiness.yaml`

**Skip readiness checking entirely**
→ `config/workflows/refinement-no-step7.yaml`

**Focus on learning from past work**
→ `config/workflows/refinement-with-enrichment-only.yaml`

**Generate questions for async refinement**
→ `config/workflows/refinement-questions-only.yaml`

**Analyze high-risk or complex features**
→ `config/workflows/refinement-risk-focused.yaml`

**Customize Step 7 to not calculate scores**
→ `config/steps/step-07-readiness-checker-no-scoring.yaml`

---

## 📚 Related Documentation

### Architecture & Design

| Document | Location | Purpose |
|----------|----------|---------|
| **Pipeline Architecture** | `docs/technical/pipeline-configuration-architecture.md` | How the configuration system works |
| **YAML-to-Code Mapping** | `docs/technical/yaml-to-code-mapping.md` | How config maps to implementation files |
| **Configuration Examples** | `docs/technical/configuration-examples-summary.md` | Usage examples and best practices |

### Pipeline Steps

| Document | Location |
|----------|----------|
| Step 1 | `docs/features/processing-pipeline/01-event-detection.md` |
| Step 2 | `docs/features/processing-pipeline/02-extract-candidate-pbis.md` |
| Step 3 | `docs/features/processing-pipeline/03-score-confidence.md` |
| Step 4 | `docs/features/processing-pipeline/04-enrich-with-context.md` |
| Step 5 | `docs/features/processing-pipeline/05-check-risks-conflicts.md` |
| Step 6 | `docs/features/processing-pipeline/06-generate-questions-proposals.md` |
| Step 7 | `docs/features/processing-pipeline/07-run-readiness-checker.md` |
| Step 8 | `docs/features/processing-pipeline/08-final-output.md` |

---

## 🛠️ Configuration Validation

Validate any configuration file:

```bash
# Validate a workflow
npm run validate-config -- config/workflows/refinement-full.yaml

# Validate a step configuration
npm run validate-config -- config/steps/step-07-readiness-checker.yaml

# Validate all configurations
npm run validate-config -- config/**/*.yaml
```

---

## 📝 Configuration File Format

All configuration files follow this general structure:

```yaml
# Metadata
name: "Configuration Name"
description: "What this config does"
version: "1.0.0"

# Configuration content
# (varies by file type)

# Global settings (workflows only)
global:
  llm:
    provider: "anthropic"
    model: "claude-3-5-sonnet-20241022"
  logging:
    level: "info"
```

---

## 🔄 Configuration Precedence

When multiple configurations are specified:

1. **CLI overrides** (highest priority)
   ```bash
   --disable-step 07-readiness-checker
   ```

2. **Workflow-level subtask overrides**
   ```yaml
   subtasks:
     - name: "calculate_readiness_score"
       enabled: false
   ```

3. **Step config file** (referenced via `config_file`)
   ```yaml
   config_file: "config/steps/step-07-readiness-checker.yaml"
   ```

4. **Default values** (lowest priority)

---

## ✅ Configuration Checklist

Before using a new configuration:

- [ ] YAML syntax is valid
- [ ] All referenced files exist
- [ ] Step IDs match implementation
- [ ] Subtask paths are correct
- [ ] Run validation: `npm run validate-config`
- [ ] Test with sample data
- [ ] Document any custom behavior

---

## 🆘 Troubleshooting

### Configuration not loading?
→ Check YAML syntax and file paths

### Step not executing?
→ Verify `enabled: true` and check logs

### Subtask implementation not found?
→ Check `implementation` path in config

### Unexpected behavior?
→ Check configuration precedence (see above)

---

## 📞 Support

- **Documentation**: `docs/technical/`
- **Examples**: `config/workflows/WORKFLOWS-COMPARISON.md`
- **Pipeline Steps**: `docs/features/processing-pipeline/`
- **Project Overview**: `CLAUDE.md` (root directory)

---

**Last Updated**: 2024-01-19
**Configuration Version**: 1.0.0
