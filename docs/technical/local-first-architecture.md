# Local-First Architecture (User-Provided API Keys)

## Overview

Backlog Chef is a **local-first CLI tool** where users provide their own AI API keys and all processing happens on their computer. There is **no backend service** for processing - just a lightweight license validation server.

---

## Architecture Model: Local Processing + User Keys

```
User's Computer (Everything happens here)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────┐
│      Backlog Chef CLI              │
│                                    │
│  • User provides API keys          │
│  • Reads meeting transcripts       │
│  • Orchestrates 8-step pipeline    │
│  • Calls AI APIs directly          │
│  • Generates output locally        │
└───────────┬────────────────────────┘
            │
            │ User's API Keys
            ▼
┌─────────────────────────────────────┐
│   AI Providers (User's Account)     │
│                                     │
│  • Anthropic Claude API             │
│  • OpenAI GPT-4 API                 │
│  • Other AI services                │
│                                     │
│  User pays AI provider directly     │
└─────────────────────────────────────┘


Optional (for license validation only):
┌────────────────────────────┐
│  License Server            │
│  (backlog-chef.com)        │
│                            │
│  • Validates license key   │
│  • Checks for updates      │
│  • No data processing      │
└────────────────────────────┘
```

---

## Why This Model?

### ✅ Advantages

**For Users:**
- 🔒 **Privacy** - Data never leaves their computer
- 💰 **Cost Control** - They control AI spending with their own quotas
- ⚡ **Performance** - Direct API calls, no proxy overhead
- 🎯 **Flexibility** - Choose which AI model to use
- 📊 **Transparency** - See exactly what's being sent to AI
- 🚫 **No Vendor Lock-in** - Not dependent on your servers

**For You:**
- 🎁 **No Infrastructure Costs** - No expensive Claude API bills
- 📈 **Scales Easily** - Users scale with their own resources
- 🔧 **Focus on Product** - Build features, not manage servers
- 🌍 **Global** - No latency issues, works anywhere
- 💼 **B2B Friendly** - Enterprises love data staying local

### ⚠️ Challenges

- **Code Protection** - Harder to protect (but not impossible)
- **License Enforcement** - Relies on honor system + light checks
- **Support Complexity** - Users debug their own API issues

---

## User Configuration

### Setup Flow

```bash
# 1. Install CLI
npm install -g backlog-chef

# 2. Initialize (one-time setup)
backlog-chef init

# This prompts for:
# - License key (if paid version)
# - API keys (Anthropic, OpenAI, etc.)
# - Preferences (default model, output format)

# 3. Use the tool
backlog-chef analyze meeting-transcript.txt
```

### Configuration File

```yaml
# ~/.backlog-chef/config.yaml

license:
  key: "BKC-PRO-ABC123-XYZ789"
  email: "user@company.com"
  tier: "pro"

apiKeys:
  anthropic: "sk-ant-api03-abc123..."  # User's key
  openai: "sk-proj-xyz789..."          # User's key (optional)

preferences:
  defaultModel: "claude-sonnet-4"
  provider: "anthropic"
  outputFormat: "devops"

features:
  enableRealTime: true    # Pro+ feature
  customWorkflows: false  # Enterprise feature
  confluenceExport: true  # Business+ feature
```

---

## Monetization Strategy

### Model: Open Core + License Tiers

**Free/Basic Version:**
- ✅ Core 8-step pipeline
- ✅ Basic output formats (JSON, Markdown)
- ✅ Azure DevOps export
- ✅ Single AI provider (Anthropic)
- ⛔ No real-time features
- ⛔ No custom workflows

**Pro Version ($49/year):**
- ✅ All Free features
- ✅ Multiple AI providers (OpenAI, Anthropic, local models)
- ✅ Advanced output formats (Confluence, Obsidian)
- ✅ Real-time meeting feedback
- ✅ Custom prompt templates
- ✅ Priority support

**Business Version ($149/year):**
- ✅ All Pro features
- ✅ Team license (5 users)
- ✅ Custom workflow definitions
- ✅ Advanced integrations
- ✅ Batch processing
- ✅ SSO support (license validation)

**Enterprise Version (Custom):**
- ✅ All Business features
- ✅ Unlimited users
- ✅ On-premise license server
- ✅ Source code access (escrow)
- ✅ Custom development
- ✅ SLA support

---

## License Protection Strategies

### Strategy 1: License Key Validation (Lightweight)

```typescript
// src/license/validator.ts

interface LicenseInfo {
  key: string;
  tier: 'free' | 'pro' | 'business' | 'enterprise';
  email: string;
  expiresAt: string;
  features: string[];
}

export class LicenseValidator {

  /**
   * Validate license (checks local cache first)
   */
  static async validate(licenseKey: string): Promise<LicenseInfo> {

    // 1. Check local cache (valid for 7 days)
    const cached = this.getCachedValidation(licenseKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached;
    }

    // 2. Online validation (lightweight, no data sent)
    try {
      const response = await fetch('https://license.backlog-chef.com/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          version: '1.0.0',
          machineId: this.getMachineId() // For seat limiting
        }),
        timeout: 5000 // Quick timeout
      });

      if (!response.ok) {
        throw new Error('License validation failed');
      }

      const licenseInfo = await response.json();

      // Cache for 7 days
      this.cacheValidation(licenseKey, licenseInfo);

      return licenseInfo;

    } catch (error) {
      // If offline or server down, use cached (grace period)
      if (cached && this.isWithinGracePeriod(cached)) {
        console.warn('Using cached license (offline mode)');
        return cached;
      }

      throw new Error('License validation failed. Please check your internet connection.');
    }
  }

  /**
   * Check if user has access to a feature
   */
  static async hasFeature(feature: string): Promise<boolean> {
    const config = this.loadConfig();

    // Free users don't need license
    if (!config.license?.key) {
      return this.freeFeatures.includes(feature);
    }

    const license = await this.validate(config.license.key);
    return license.features.includes(feature);
  }

  private static freeFeatures = [
    'basic-pipeline',
    'devops-export',
    'json-output',
    'anthropic-provider'
  ];

  private static getMachineId(): string {
    // Simple machine fingerprint (not foolproof, but adds friction)
    const os = require('os');
    return require('crypto')
      .createHash('sha256')
      .update(os.hostname() + os.platform() + os.arch())
      .digest('hex')
      .substring(0, 16);
  }
}
```

### Strategy 2: Feature Gating

```typescript
// src/commands/analyze.ts

export async function analyzeCommand(transcript: string, options: any) {

  // Check license for advanced features
  if (options.realTime) {
    const hasAccess = await LicenseValidator.hasFeature('real-time-feedback');
    if (!hasAccess) {
      console.error('❌ Real-time feedback requires Pro license');
      console.error('   Upgrade at: https://backlog-chef.com/pricing');
      process.exit(1);
    }
  }

  if (options.format === 'confluence') {
    const hasAccess = await LicenseValidator.hasFeature('confluence-export');
    if (!hasAccess) {
      console.error('❌ Confluence export requires Business license');
      console.error('   Upgrade at: https://backlog-chef.com/pricing');
      process.exit(1);
    }
  }

  // Proceed with analysis...
}
```

### Strategy 3: Private NPM Package

```bash
# Package available on npm but requires authentication

# Install (requires npm login)
npm login --scope=@backlog-chef
npm install -g @backlog-chef/cli

# Or use registry token
echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > ~/.npmrc
npm install -g @backlog-chef/cli
```

**Pricing:**
- Public free version: `backlog-chef` (basic features)
- Private paid version: `@backlog-chef/pro` (all features)

### Strategy 4: Compiled Binaries (Advanced Protection)

```bash
# Instead of distributing source, compile to native binaries

# Using pkg (compiles Node.js to executable)
pkg src/index.js --targets node18-linux-x64,node18-macos-x64,node18-win-x64

# Users download executable
curl -o backlog-chef https://downloads.backlog-chef.com/v1.0.0/backlog-chef-linux
chmod +x backlog-chef
./backlog-chef analyze meeting.txt
```

**Protection level:**
- ✅ Harder to read source code
- ✅ Harder to modify
- ✅ License checks compiled in
- ⚠️ Not impossible to reverse engineer
- ⚠️ Less transparent (some users won't trust it)

---

## License Server (Lightweight)

### What It Does

**NOT for processing** - only validates licenses:

```typescript
// Lightweight license server (license.backlog-chef.com)

app.post('/validate', async (req, res) => {
  const { licenseKey, version, machineId } = req.body;

  // 1. Check license in database
  const license = await db.licenses.findOne({ key: licenseKey });

  if (!license) {
    return res.status(404).json({ error: 'Invalid license key' });
  }

  // 2. Check expiration
  if (new Date(license.expiresAt) < new Date()) {
    return res.status(403).json({ error: 'License expired' });
  }

  // 3. Check seat limit (for team licenses)
  if (license.tier === 'business') {
    const activeMachines = await db.activations.count({ licenseKey });
    if (activeMachines >= license.seatLimit) {
      const isKnownMachine = await db.activations.exists({
        licenseKey,
        machineId
      });

      if (!isKnownMachine) {
        return res.status(403).json({
          error: 'Seat limit reached',
          limit: license.seatLimit
        });
      }
    }
  }

  // 4. Record activation (for analytics)
  await db.activations.upsert({
    licenseKey,
    machineId,
    lastSeen: new Date(),
    version
  });

  // 5. Return license info
  res.json({
    tier: license.tier,
    email: license.email,
    expiresAt: license.expiresAt,
    features: getFeatures(license.tier)
  });
});

function getFeatures(tier: string): string[] {
  const features = {
    free: [
      'basic-pipeline',
      'devops-export',
      'json-output',
      'anthropic-provider'
    ],
    pro: [
      ...features.free,
      'real-time-feedback',
      'confluence-export',
      'custom-prompts',
      'multi-provider'
    ],
    business: [
      ...features.pro,
      'custom-workflows',
      'batch-processing',
      'team-sharing'
    ],
    enterprise: [
      ...features.business,
      'on-premise',
      'source-access',
      'sso'
    ]
  };
  return features[tier] || features.free;
}
```

**Key points:**
- ⚡ Fast (< 100ms response)
- 🔒 No meeting data sent
- 📊 Only validates license + tracks activations
- 💰 Very cheap to run (simple database queries)
- 🌍 Can cache response for 7 days

---

## Distribution Strategy

### Option A: Open Core on GitHub + NPM

```yaml
Repository Structure:
  github.com/backlog-chef/cli      # Public repo

  Branches:
    - main (free version)           # MIT License
    - pro (paid features)           # Commercial License

  NPM Packages:
    - backlog-chef                  # Free (npm install -g backlog-chef)
    - @backlog-chef/pro             # Paid (private package)
```

### Option B: Single Package with License Gates

```typescript
// All features in one package, but gated

export async function analyzeWithRealtime(transcript: string) {
  // Check license before enabling feature
  if (!await LicenseValidator.hasFeature('real-time-feedback')) {
    throw new Error('This feature requires Pro license');
  }

  // Feature implementation...
}
```

**Users see the features but can't use them without license:**
```bash
$ backlog-chef analyze --realtime meeting.txt
❌ Real-time feedback requires Pro license
   Upgrade at: https://backlog-chef.com/pricing

   Pro features you're missing:
   • Real-time meeting feedback
   • Confluence export
   • Custom prompt templates
   • Multi-provider support

   Price: $49/year (save with annual billing)
```

### Option C: Time-Limited Trial

```typescript
// Everyone gets Pro features for 30 days

export class LicenseValidator {
  static async validate(licenseKey?: string): Promise<LicenseInfo> {

    // No license? Check if within trial period
    if (!licenseKey) {
      const installDate = this.getInstallDate();
      const daysSinceInstall = this.daysSince(installDate);

      if (daysSinceInstall <= 30) {
        return {
          tier: 'pro-trial',
          email: null,
          expiresAt: this.addDays(installDate, 30),
          features: this.getFeatures('pro')
        };
      } else {
        return {
          tier: 'free',
          email: null,
          expiresAt: null,
          features: this.getFeatures('free')
        };
      }
    }

    // Has license? Validate it...
  }
}
```

---

## Preventing Abuse (Realistically)

### What You CAN Prevent

✅ **Casual Sharing** - License keys tied to machines (seat limits)
✅ **Expired Licenses** - Regular validation checks
✅ **Feature Access** - Code gates require valid license
✅ **Commercial Piracy** - Legal terms + DMCA

### What You CAN'T Fully Prevent

❌ **Determined Hackers** - They can always patch binaries
❌ **License Sharing** - Friends sharing keys (accept some loss)
❌ **Code Copying** - Someone could fork and rebrand

### Accept Reality: "Good Enough" Protection

```
Protection Goal: Make piracy harder than buying

✅ Honest users will pay ($49/year is reasonable)
✅ Businesses will pay (legal risk not worth it)
✅ Hackers will hack (accept 5-10% piracy)
✅ Focus on value, not perfect DRM

Like Sublime Text:
- Shows "unregistered" nag
- Full features still work
- Most people pay anyway (it's good software)
```

---

## Pricing Psychology

### Make It a No-Brainer

**Pro: $49/year** ($4/month)
- Cost of 1 lunch
- vs. Manual PBI refinement (hours of team time)
- vs. Bad requirements causing sprint failures ($$$$)

**Business: $149/year** ($12/month per team)
- Cost of 1 hour of developer time
- Saves 10+ hours/month
- ROI: 10x minimum

**Why Annual Pricing?**
- ✅ Reduces churn
- ✅ Predictable revenue
- ✅ Less license management overhead
- ✅ Users commit (more likely to use it)

---

## User Experience Flow

### First-Time Setup

```bash
$ npm install -g backlog-chef

$ backlog-chef init

Welcome to Backlog Chef! 🧑‍🍳

Let's set up your AI-powered Scrum assistant.

License Options:
1. Free Trial (30 days, all Pro features)
2. Enter License Key (already purchased)
3. Continue with Free Version (limited features)

Choice: 1

✨ Starting your 30-day Pro trial!

API Configuration:
We need your AI provider API keys (stored locally only).

Anthropic Claude API Key: sk-ant-api03-...
(Get your key at: https://console.anthropic.com)

✅ Configuration saved to ~/.backlog-chef/config.yaml

You're all set! Try:
  backlog-chef analyze meeting-transcript.txt

Trial expires: 2025-12-20
Purchase Pro: https://backlog-chef.com/pricing
```

### Daily Usage (No Friction)

```bash
$ backlog-chef analyze meeting.txt

📊 Analyzing meeting transcript...
   Model: claude-sonnet-4 (your API key)
   Workflow: refinement

✅ Analysis complete!
   PBIs: 5 found
   Questions: 12 generated
   Readiness: 3 ready, 2 need refinement

💾 Output saved to:
   - output.json
   - output-devops.xml
   - output-confluence.html

💰 API Usage:
   Tokens: 15,234 input + 3,421 output
   Cost: ~$0.08 (charged to your Anthropic account)

⏰ Trial: 22 days remaining
   Upgrade: https://backlog-chef.com/pricing
```

---

## Revenue Projections

### Conservative Estimates

**Year 1 (Focus on Product-Market Fit):**
- 1,000 GitHub stars
- 500 active users
- 50 Pro subscribers ($49/yr) = $2,450/yr
- 5 Business subscribers ($149/yr) = $745/yr
- **Total: ~$3,200/yr**
- Goal: Learn, iterate, build community

**Year 2 (Growth):**
- 5,000 users
- 250 Pro = $12,250/yr
- 25 Business = $3,725/yr
- 3 Enterprise ($5k/yr) = $15,000/yr
- **Total: ~$31,000/yr**

**Year 3 (Scale):**
- 20,000 users
- 1,000 Pro = $49,000/yr
- 100 Business = $14,900/yr
- 20 Enterprise = $100,000/yr
- **Total: ~$164,000/yr**

---

## Technology Stack

```yaml
CLI:
  - TypeScript + Node.js
  - Commander.js (CLI framework)
  - Anthropic SDK
  - OpenAI SDK (optional)
  - Local file storage

License Server:
  - Node.js + Express (lightweight)
  - PostgreSQL (license database)
  - Hosted on: Railway / Render ($5-20/mo)

Distribution:
  - NPM (public + private packages)
  - GitHub Releases (binaries)

Payment:
  - Paddle / Gumroad (handles VAT, invoices)
  - Generates license keys automatically

Analytics:
  - PostHog / Mixpanel (usage tracking)
  - Sentry (error monitoring)
```

---

## Comparison to Similar Tools

### Similar Models That Work

**1. Sublime Text**
- Unlimited trial
- Shows nag occasionally
- $99 one-time
- Honor system
- **Result: Profitable for 15+ years**

**2. Cursor IDE**
- Free with your API keys
- Pro version ($20/mo) includes AI quota
- **Why different?** They DO provide API infrastructure

**3. Continue.dev**
- Free, open source
- Use your own keys
- **Monetization?** Enterprise support + hosting

**Your Best Match: Sublime Text Model**
- Free trial (full features)
- Gentle nag after trial
- Paid license removes nag + gets updates
- Good enough protection
- Focus on being excellent

---

## Summary: Recommended Approach

### Phase 1: MVP (First 6 Months)

✅ Release free version on NPM (basic features)
✅ Open source on GitHub (builds trust)
✅ 30-day trial of Pro features (hook users)
✅ License validation (lightweight)
✅ $49/year Pro, $149/year Business
✅ Focus: Product-market fit, not protection

### Phase 2: Growth (6-18 Months)

✅ Add compiled binaries (better UX)
✅ Private npm package for Pro
✅ Enterprise tier with custom features
✅ Team licenses with seat management
✅ Focus: Revenue + retention

### Phase 3: Scale (18+ Months)

✅ Marketplace for custom workflows
✅ Plugin ecosystem
✅ Optional hosted service (for users who want it)
✅ Focus: Platform play

---

## Key Insight

**Your moat is NOT code protection.**

**Your moat is:**
1. 🎯 **Deep domain expertise** (Scrum/Agile workflows)
2. 🤖 **Prompt engineering** (your prompts are the secret sauce)
3. 🔄 **Continuous improvement** (updates, new features)
4. 👥 **Community** (GitHub stars, word of mouth)
5. 🏢 **Enterprise features** (SSO, team mgmt, support)

Make it cheap enough that piracy isn't worth it.
Make it good enough that people want to pay.
Make it trusted enough that enterprises adopt it.

---

## Next Steps

1. ✅ Build MVP with local-first architecture
2. ✅ Add simple license validation
3. ✅ Launch on Product Hunt / Hacker News
4. ✅ Iterate based on feedback
5. ✅ Add paid tiers once PMF is clear

**The best protection is a great product with fair pricing.**
