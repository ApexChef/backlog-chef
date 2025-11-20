# Implementation: User-Provided API Keys

This document shows how to implement Backlog Chef with users providing their own API keys and local processing.

---

## Configuration System

### User Config File

```yaml
# ~/.backlog-chef/config.yaml

# License (optional - free version works without)
license:
  key: "BKC-PRO-ABC123-XYZ789"
  email: "user@company.com"

# User's API Keys (required)
apiKeys:
  # Anthropic (primary)
  anthropic:
    apiKey: "sk-ant-api03-..."
    defaultModel: "claude-sonnet-4"
    maxTokens: 100000

  # OpenAI (optional, Pro+ only)
  openai:
    apiKey: "sk-proj-..."
    defaultModel: "gpt-4"
    organization: "org-..."

  # Local models (optional, Pro+ only)
  ollama:
    baseUrl: "http://localhost:11434"
    defaultModel: "llama2"

# Preferences
preferences:
  defaultProvider: "anthropic"
  outputFormat: "devops"
  saveHistory: true
  historyPath: "~/.backlog-chef/history"

# Feature toggles (based on license)
features:
  realTime: false        # Pro+
  customWorkflows: false # Business+
  batchProcessing: false # Business+
```

---

## TypeScript Implementation

### 1. Config Manager

```typescript
// src/config/manager.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

interface Config {
  license?: {
    key: string;
    email: string;
  };
  apiKeys: {
    anthropic?: {
      apiKey: string;
      defaultModel: string;
      maxTokens: number;
    };
    openai?: {
      apiKey: string;
      defaultModel: string;
      organization?: string;
    };
    ollama?: {
      baseUrl: string;
      defaultModel: string;
    };
  };
  preferences: {
    defaultProvider: 'anthropic' | 'openai' | 'ollama';
    outputFormat: string;
    saveHistory: boolean;
    historyPath: string;
  };
  features: {
    realTime: boolean;
    customWorkflows: boolean;
    batchProcessing: boolean;
  };
}

export class ConfigManager {
  private static CONFIG_PATH = path.join(os.homedir(), '.backlog-chef', 'config.yaml');
  private static CONFIG_DIR = path.dirname(ConfigManager.CONFIG_PATH);

  static ensureConfigDir(): void {
    if (!fs.existsSync(this.CONFIG_DIR)) {
      fs.mkdirSync(this.CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
  }

  static load(): Config | null {
    if (!fs.existsSync(this.CONFIG_PATH)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.CONFIG_PATH, 'utf-8');
      return yaml.load(content) as Config;
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  static save(config: Config): void {
    this.ensureConfigDir();

    const content = yaml.dump(config, {
      indent: 2,
      lineWidth: 120
    });

    fs.writeFileSync(this.CONFIG_PATH, content, { mode: 0o600 });
  }

  static getApiKey(provider: 'anthropic' | 'openai' | 'ollama'): string | null {
    const config = this.load();
    if (!config) return null;

    switch (provider) {
      case 'anthropic':
        return config.apiKeys.anthropic?.apiKey || null;
      case 'openai':
        return config.apiKeys.openai?.apiKey || null;
      case 'ollama':
        return config.apiKeys.ollama?.baseUrl || null;
      default:
        return null;
    }
  }

  static getDefaultProvider(): string {
    const config = this.load();
    return config?.preferences.defaultProvider || 'anthropic';
  }
}
```

---

### 2. License Validator

```typescript
// src/license/validator.ts
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface LicenseInfo {
  tier: 'free' | 'pro' | 'business' | 'enterprise';
  email: string | null;
  expiresAt: string | null;
  features: string[];
  lastValidated: string;
}

export class LicenseValidator {
  private static CACHE_PATH = path.join(os.homedir(), '.backlog-chef', 'license-cache.json');
  private static LICENSE_SERVER = 'https://license.backlog-chef.com';
  private static CACHE_DURATION_DAYS = 7;
  private static GRACE_PERIOD_DAYS = 30;

  /**
   * Get feature list for tier
   */
  private static getFeaturesForTier(tier: string): string[] {
    const features: Record<string, string[]> = {
      free: [
        'basic-pipeline',
        'json-output',
        'markdown-output',
        'devops-export',
        'anthropic-provider'
      ],
      pro: [
        'basic-pipeline',
        'json-output',
        'markdown-output',
        'devops-export',
        'anthropic-provider',
        'openai-provider',
        'ollama-provider',
        'real-time-feedback',
        'confluence-export',
        'obsidian-export',
        'custom-prompts'
      ],
      business: [
        'basic-pipeline',
        'json-output',
        'markdown-output',
        'devops-export',
        'anthropic-provider',
        'openai-provider',
        'ollama-provider',
        'real-time-feedback',
        'confluence-export',
        'obsidian-export',
        'custom-prompts',
        'custom-workflows',
        'batch-processing',
        'team-sharing',
        'advanced-analytics'
      ],
      enterprise: [
        // All Business features +
        'basic-pipeline',
        'json-output',
        'markdown-output',
        'devops-export',
        'anthropic-provider',
        'openai-provider',
        'ollama-provider',
        'real-time-feedback',
        'confluence-export',
        'obsidian-export',
        'custom-prompts',
        'custom-workflows',
        'batch-processing',
        'team-sharing',
        'advanced-analytics',
        'sso',
        'on-premise',
        'priority-support',
        'source-access'
      ]
    };

    return features[tier] || features.free;
  }

  /**
   * Get license info (with caching and offline support)
   */
  static async getLicenseInfo(licenseKey?: string): Promise<LicenseInfo> {
    // No license? Check for trial or return free
    if (!licenseKey) {
      return this.getTrialOrFreeInfo();
    }

    // Check cache first
    const cached = this.loadCache(licenseKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached;
    }

    // Try online validation
    try {
      const validated = await this.validateOnline(licenseKey);
      this.saveCache(licenseKey, validated);
      return validated;
    } catch (error) {
      // If offline and cache exists (within grace period), use it
      if (cached && this.isWithinGracePeriod(cached)) {
        console.warn('⚠️  Using cached license (offline mode)');
        return cached;
      }

      // Otherwise fail
      throw new Error('License validation failed. Please check your internet connection.');
    }
  }

  /**
   * Check if user has access to a feature
   */
  static async hasFeature(feature: string, licenseKey?: string): Promise<boolean> {
    try {
      const license = await this.getLicenseInfo(licenseKey);
      return license.features.includes(feature);
    } catch (error) {
      // On error, assume free tier
      return this.getFeaturesForTier('free').includes(feature);
    }
  }

  /**
   * Get trial or free info
   */
  private static getTrialOrFreeInfo(): LicenseInfo {
    const installDate = this.getInstallDate();
    const daysSinceInstall = this.daysSince(installDate);

    // First 30 days = Pro trial
    if (daysSinceInstall <= 30) {
      return {
        tier: 'pro',
        email: null,
        expiresAt: this.addDays(installDate, 30).toISOString(),
        features: this.getFeaturesForTier('pro'),
        lastValidated: new Date().toISOString()
      };
    }

    // After trial = Free tier
    return {
      tier: 'free',
      email: null,
      expiresAt: null,
      features: this.getFeaturesForTier('free'),
      lastValidated: new Date().toISOString()
    };
  }

  /**
   * Validate license online
   */
  private static async validateOnline(licenseKey: string): Promise<LicenseInfo> {
    const response = await axios.post(
      `${this.LICENSE_SERVER}/validate`,
      {
        licenseKey,
        version: this.getVersion(),
        machineId: this.getMachineId()
      },
      { timeout: 5000 }
    );

    return {
      tier: response.data.tier,
      email: response.data.email,
      expiresAt: response.data.expiresAt,
      features: response.data.features,
      lastValidated: new Date().toISOString()
    };
  }

  /**
   * Machine ID (for seat limiting)
   */
  private static getMachineId(): string {
    const fingerprint = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 16);
  }

  /**
   * Get app version
   */
  private static getVersion(): string {
    try {
      const packagePath = path.join(__dirname, '../../package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return pkg.version;
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Get install date
   */
  private static getInstallDate(): Date {
    const installFile = path.join(os.homedir(), '.backlog-chef', '.installed');

    if (fs.existsSync(installFile)) {
      const stats = fs.statSync(installFile);
      return stats.birthtime;
    } else {
      // Create install marker
      const dir = path.dirname(installFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      fs.writeFileSync(installFile, new Date().toISOString());
      return new Date();
    }
  }

  /**
   * Cache management
   */
  private static loadCache(licenseKey: string): LicenseInfo | null {
    if (!fs.existsSync(this.CACHE_PATH)) return null;

    try {
      const cache = JSON.parse(fs.readFileSync(this.CACHE_PATH, 'utf-8'));
      return cache[licenseKey] || null;
    } catch {
      return null;
    }
  }

  private static saveCache(licenseKey: string, info: LicenseInfo): void {
    let cache: Record<string, LicenseInfo> = {};

    if (fs.existsSync(this.CACHE_PATH)) {
      try {
        cache = JSON.parse(fs.readFileSync(this.CACHE_PATH, 'utf-8'));
      } catch {
        // Ignore, start fresh
      }
    }

    cache[licenseKey] = info;

    const dir = path.dirname(this.CACHE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    fs.writeFileSync(this.CACHE_PATH, JSON.stringify(cache, null, 2), { mode: 0o600 });
  }

  private static isCacheExpired(info: LicenseInfo): boolean {
    const lastValidated = new Date(info.lastValidated);
    const expiryDate = new Date(lastValidated);
    expiryDate.setDate(expiryDate.getDate() + this.CACHE_DURATION_DAYS);
    return new Date() > expiryDate;
  }

  private static isWithinGracePeriod(info: LicenseInfo): boolean {
    const lastValidated = new Date(info.lastValidated);
    const graceEnd = new Date(lastValidated);
    graceEnd.setDate(graceEnd.getDate() + this.GRACE_PERIOD_DAYS);
    return new Date() <= graceEnd;
  }

  private static daysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
```

---

### 3. AI Provider Client

```typescript
// src/ai/provider.ts
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import axios from 'axios';
import { ConfigManager } from '../config/manager';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

export abstract class AIProvider {
  abstract sendMessage(messages: AIMessage[], model?: string): Promise<AIResponse>;

  protected calculateCost(inputTokens: number, outputTokens: number, provider: string): number {
    // Approximate costs (as of 2025)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-sonnet-4': { input: 3.0, output: 15.0 },    // per 1M tokens
      'claude-opus-4': { input: 15.0, output: 75.0 },
      'gpt-4': { input: 30.0, output: 60.0 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 }
    };

    const rates = pricing[provider] || { input: 3.0, output: 15.0 };

    const inputCost = (inputTokens / 1_000_000) * rates.input;
    const outputCost = (outputTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }
}

/**
 * Anthropic Claude Provider
 */
export class AnthropicProvider extends AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async sendMessage(messages: AIMessage[], model?: string): Promise<AIResponse> {
    const response = await this.client.messages.create({
      model: model || this.model,
      max_tokens: 100000,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      }))
    });

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost: this.calculateCost(
          response.usage.input_tokens,
          response.usage.output_tokens,
          model || this.model
        )
      }
    };
  }
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider extends AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, organization?: string, model: string = 'gpt-4-turbo') {
    super();
    this.client = new OpenAI({ apiKey, organization });
    this.model = model;
  }

  async sendMessage(messages: AIMessage[], model?: string): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: model || this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
      content,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cost: this.calculateCost(
          usage.prompt_tokens,
          usage.completion_tokens,
          model || this.model
        )
      }
    };
  }
}

/**
 * Ollama Provider (local models)
 */
export class OllamaProvider extends AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
    super();
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async sendMessage(messages: AIMessage[], model?: string): Promise<AIResponse> {
    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model: model || this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    return {
      content: response.data.message.content,
      usage: {
        inputTokens: 0,  // Ollama doesn't report token usage
        outputTokens: 0,
        cost: 0  // Local models are free
      }
    };
  }
}

/**
 * Factory to create appropriate provider
 */
export class AIProviderFactory {
  static create(providerName?: string): AIProvider {
    const config = ConfigManager.load();

    if (!config) {
      throw new Error('Configuration not found. Run: backlog-chef init');
    }

    const provider = providerName || config.preferences.defaultProvider;

    switch (provider) {
      case 'anthropic': {
        const apiKey = config.apiKeys.anthropic?.apiKey;
        if (!apiKey) {
          throw new Error('Anthropic API key not configured. Run: backlog-chef init');
        }
        return new AnthropicProvider(
          apiKey,
          config.apiKeys.anthropic.defaultModel
        );
      }

      case 'openai': {
        const apiKey = config.apiKeys.openai?.apiKey;
        if (!apiKey) {
          throw new Error('OpenAI API key not configured.');
        }
        return new OpenAIProvider(
          apiKey,
          config.apiKeys.openai.organization,
          config.apiKeys.openai.defaultModel
        );
      }

      case 'ollama': {
        const baseUrl = config.apiKeys.ollama?.baseUrl || 'http://localhost:11434';
        return new OllamaProvider(
          baseUrl,
          config.apiKeys.ollama?.defaultModel
        );
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

---

### 4. Init Command (Setup)

```typescript
// src/commands/init.ts
import * as readline from 'readline';
import { ConfigManager } from '../config/manager';
import { LicenseValidator } from '../license/validator';

export async function initCommand(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log('🧑‍🍳 Welcome to Backlog Chef!\n');
  console.log('Let\'s set up your AI-powered Scrum assistant.\n');

  // Check for existing config
  const existing = ConfigManager.load();
  if (existing) {
    const overwrite = await question('Configuration already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  // License setup
  console.log('\n📋 License Setup\n');
  console.log('Options:');
  console.log('  1. Free Trial (30 days, all Pro features)');
  console.log('  2. Enter License Key (already purchased)');
  console.log('  3. Continue with Free Version (limited features)\n');

  const licenseChoice = await question('Choice (1-3): ');

  let licenseKey: string | undefined;
  let email: string | undefined;

  if (licenseChoice === '2') {
    licenseKey = await question('License Key: ');
    email = await question('Email: ');

    // Validate license
    try {
      const license = await LicenseValidator.getLicenseInfo(licenseKey);
      console.log(`✅ License validated: ${license.tier}`);
    } catch (error) {
      console.error('❌ License validation failed:', error.message);
      console.log('Continuing with free version...');
      licenseKey = undefined;
      email = undefined;
    }
  } else if (licenseChoice === '1') {
    console.log('\n✨ Starting your 30-day Pro trial!');
  } else {
    console.log('\n📦 Using Free version');
  }

  // API Key setup
  console.log('\n🔑 API Configuration\n');
  console.log('We need your AI provider API keys (stored locally only).\n');

  const anthropicKey = await question('Anthropic Claude API Key: ');
  const anthropicModel = await question('Default Model (claude-sonnet-4): ') || 'claude-sonnet-4';

  // Optional providers (Pro+)
  let openaiKey: string | undefined;
  let openaiModel: string | undefined;

  const hasProFeatures = licenseChoice === '1' || licenseChoice === '2';
  if (hasProFeatures) {
    const addOpenAI = await question('\nAdd OpenAI provider? (y/N): ');
    if (addOpenAI.toLowerCase() === 'y') {
      openaiKey = await question('OpenAI API Key: ');
      openaiModel = await question('Default Model (gpt-4-turbo): ') || 'gpt-4-turbo';
    }
  }

  // Build config
  const config = {
    license: licenseKey ? { key: licenseKey, email: email! } : undefined,
    apiKeys: {
      anthropic: {
        apiKey: anthropicKey,
        defaultModel: anthropicModel,
        maxTokens: 100000
      },
      ...(openaiKey && {
        openai: {
          apiKey: openaiKey,
          defaultModel: openaiModel!
        }
      })
    },
    preferences: {
      defaultProvider: 'anthropic' as const,
      outputFormat: 'devops',
      saveHistory: true,
      historyPath: '~/.backlog-chef/history'
    },
    features: {
      realTime: hasProFeatures,
      customWorkflows: false,
      batchProcessing: false
    }
  };

  // Save config
  ConfigManager.save(config);

  console.log('\n✅ Configuration saved to ~/.backlog-chef/config.yaml\n');

  // Show trial/license info
  const license = await LicenseValidator.getLicenseInfo(licenseKey);
  console.log('📊 Your Plan:', license.tier);
  if (license.expiresAt) {
    console.log('⏰ Expires:', new Date(license.expiresAt).toLocaleDateString());
  }

  console.log('\n🚀 You\'re all set! Try:\n');
  console.log('  backlog-chef analyze meeting-transcript.txt\n');

  if (!licenseKey && licenseChoice !== '1') {
    console.log('💡 Upgrade to Pro: https://backlog-chef.com/pricing\n');
  }

  rl.close();
}
```

---

### 5. Analyze Command (Using User's API)

```typescript
// src/commands/analyze.ts
import * as fs from 'fs';
import { AIProviderFactory } from '../ai/provider';
import { LicenseValidator } from '../license/validator';
import { ConfigManager } from '../config/manager';

export async function analyzeCommand(
  transcriptPath: string,
  options: { provider?: string; model?: string; realtime?: boolean }
): Promise<void> {

  // Load config
  const config = ConfigManager.load();
  if (!config) {
    console.error('❌ Not configured. Run: backlog-chef init');
    process.exit(1);
  }

  // Check license for advanced features
  if (options.realtime) {
    const hasAccess = await LicenseValidator.hasFeature('real-time-feedback', config.license?.key);
    if (!hasAccess) {
      console.error('❌ Real-time feedback requires Pro license');
      console.error('   Upgrade at: https://backlog-chef.com/pricing');
      process.exit(1);
    }
  }

  // Read transcript
  if (!fs.existsSync(transcriptPath)) {
    console.error(`❌ File not found: ${transcriptPath}`);
    process.exit(1);
  }

  const transcript = fs.readFileSync(transcriptPath, 'utf-8');

  try {
    console.log('📊 Analyzing meeting transcript...\n');

    // Create AI provider (using user's API key)
    const provider = AIProviderFactory.create(options.provider);

    // Build prompt (your secret sauce!)
    const prompt = buildAnalysisPrompt(transcript);

    // Call AI (user's key, user's cost)
    console.log('🤖 Calling AI provider...');
    const response = await provider.sendMessage([
      { role: 'user', content: prompt }
    ], options.model);

    // Parse response
    const results = JSON.parse(response.content);

    console.log('\n✅ Analysis complete!\n');
    console.log('📋 PBIs Found:', results.pbis.length);
    console.log('❓ Questions Generated:', results.questions.length);
    console.log('💡 Proposals Made:', results.proposals.length);

    // Show cost (transparency!)
    console.log('\n💰 API Usage (charged to your account):');
    console.log(`   Input tokens: ${response.usage.inputTokens.toLocaleString()}`);
    console.log(`   Output tokens: ${response.usage.outputTokens.toLocaleString()}`);
    console.log(`   Estimated cost: $${response.usage.cost.toFixed(4)}`);

    // Show trial/license status
    const license = await LicenseValidator.getLicenseInfo(config.license?.key);
    if (license.tier === 'pro' && license.expiresAt) {
      const daysRemaining = Math.floor(
        (new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      console.log(`\n⏰ Trial: ${daysRemaining} days remaining`);
      console.log('   Upgrade: https://backlog-chef.com/pricing');
    } else if (license.tier === 'free') {
      console.log('\n💡 Upgrade to Pro for more features:');
      console.log('   • Real-time feedback');
      console.log('   • Multiple AI providers');
      console.log('   • Custom workflows');
      console.log('   https://backlog-chef.com/pricing');
    }

    // Save results
    const outputPath = transcriptPath.replace(/\.(txt|md)$/, '-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function buildAnalysisPrompt(transcript: string): string {
  // This is your SECRET SAUCE - the prompt engineering!
  return `You are an expert Scrum Master and Business Analyst...

[Your detailed, carefully crafted prompt here]

Transcript:
${transcript}

Return a JSON response with...`;
}
```

---

## Summary

**Key Points:**

1. ✅ **Users provide their own API keys** - stored locally in `~/.backlog-chef/config.yaml`
2. ✅ **All processing happens locally** - direct API calls from user's machine
3. ✅ **License validation is lightweight** - only checks features, doesn't process data
4. ✅ **Cost transparency** - show users exactly what they're paying AI providers
5. ✅ **Trial period** - 30 days of Pro features for free
6. ✅ **Offline support** - cached license validation for 7+ days

**Your Value Proposition:**
- 🎯 **Prompt engineering** - expertly crafted prompts (your secret sauce)
- 🔄 **Orchestration** - complex 8-step pipeline automated
- 📦 **Integration** - DevOps, Confluence, Obsidian exports
- 🎓 **Domain expertise** - Scrum/Agile best practices built-in
- 🔧 **Continuous updates** - new features, improved prompts

**User Benefits:**
- 🔒 Privacy (data stays local)
- 💰 Cost control (their API keys, their quotas)
- ⚡ Performance (direct API calls)
- 🎯 Flexibility (choose AI provider/model)

This model is **win-win**: Users get privacy and control, you get to focus on building great features instead of managing infrastructure.
