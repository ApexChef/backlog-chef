# CLI Authentication - Code Examples

This document shows practical TypeScript code for implementing authentication in the Backlog Chef CLI.

---

## Project Structure

```
backlog-chef-cli/
├── src/
│   ├── commands/
│   │   ├── login.ts       # Login command
│   │   ├── register.ts    # Registration
│   │   ├── analyze.ts     # Main analysis command
│   │   └── logout.ts      # Logout
│   ├── api/
│   │   └── client.ts      # API client with auth
│   ├── auth/
│   │   ├── storage.ts     # Token storage
│   │   └── validator.ts   # Token validation
│   └── index.ts           # CLI entry point
└── package.json
```

---

## 1. Token Storage (Local)

```typescript
// src/auth/storage.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Credentials {
  apiToken: string;
  refreshToken: string;
  expiresAt: string;
  email: string;
}

const CREDENTIALS_PATH = path.join(os.homedir(), '.backlog-chef', 'credentials.json');

export class CredentialStorage {

  static ensureDir(): void {
    const dir = path.dirname(CREDENTIALS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); // Private directory
    }
  }

  static save(credentials: Credentials): void {
    this.ensureDir();

    // Write with restricted permissions (owner only)
    fs.writeFileSync(
      CREDENTIALS_PATH,
      JSON.stringify(credentials, null, 2),
      { mode: 0o600 } // Only owner can read/write
    );
  }

  static load(): Credentials | null {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      return null;
    }

    try {
      const data = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return null;
    }
  }

  static delete(): void {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      fs.unlinkSync(CREDENTIALS_PATH);
    }
  }

  static isExpired(credentials: Credentials): boolean {
    return new Date(credentials.expiresAt) < new Date();
  }
}
```

---

## 2. API Client (With Authentication)

```typescript
// src/api/client.ts
import axios, { AxiosInstance } from 'axios';
import { CredentialStorage } from '../auth/storage';

export class BacklogChefApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.BACKLOG_CHEF_API_URL || 'https://api.backlog-chef.com';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'backlog-chef-cli/1.0.0'
      }
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      response => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry original request
            return this.client.request(error.config);
          } else {
            throw new Error('Authentication expired. Please run: backlog-chef login');
          }
        }

        if (error.response?.status === 402) {
          throw new Error(
            `Subscription required.\n` +
            `Visit: https://backlog-chef.com/pricing`
          );
        }

        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          throw new Error(
            `Rate limit exceeded. Try again in ${retryAfter} seconds.\n` +
            `Upgrade for higher limits: https://backlog-chef.com/pricing`
          );
        }

        throw error;
      }
    );
  }

  /**
   * Get a valid token (refresh if needed)
   */
  private async getValidToken(): Promise<string | null> {
    const credentials = CredentialStorage.load();

    if (!credentials) {
      return null;
    }

    // Check if expired
    if (CredentialStorage.isExpired(credentials)) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        return null;
      }
      return CredentialStorage.load()?.apiToken || null;
    }

    return credentials.apiToken;
  }

  /**
   * Refresh token
   */
  private async refreshToken(): Promise<boolean> {
    const credentials = CredentialStorage.load();
    if (!credentials?.refreshToken) {
      return false;
    }

    try {
      const response = await axios.post(`${this.baseURL}/v1/auth/refresh`, {
        refreshToken: credentials.refreshToken
      });

      const newCredentials = {
        apiToken: response.data.apiToken,
        refreshToken: response.data.refreshToken,
        expiresAt: response.data.expiresAt,
        email: credentials.email
      };

      CredentialStorage.save(newCredentials);
      return true;
    } catch (error) {
      // Refresh failed, user needs to login again
      CredentialStorage.delete();
      return false;
    }
  }

  /**
   * Login
   */
  async login(email: string, password: string): Promise<void> {
    const response = await this.client.post('/v1/auth/login', {
      email,
      password
    });

    const credentials = {
      apiToken: response.data.apiToken,
      refreshToken: response.data.refreshToken,
      expiresAt: response.data.expiresAt,
      email: email
    };

    CredentialStorage.save(credentials);
  }

  /**
   * Register
   */
  async register(email: string, password: string, organizationName: string): Promise<void> {
    await this.client.post('/v1/auth/register', {
      email,
      password,
      organizationName
    });
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.client.post('/v1/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    } finally {
      CredentialStorage.delete();
    }
  }

  /**
   * Analyze transcript (main feature)
   */
  async analyzeTranscript(transcript: string, workflow: string = 'refinement'): Promise<any> {
    const response = await this.client.post('/v1/analyze', {
      transcript,
      workflow
    });

    return response.data;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    const response = await this.client.get(`/v1/jobs/${jobId}`);
    return response.data;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/v1/auth/me');
    return response.data;
  }

  /**
   * Get subscription info
   */
  async getSubscription(): Promise<any> {
    const response = await this.client.get('/v1/subscription');
    return response.data;
  }
}
```

---

## 3. Login Command

```typescript
// src/commands/login.ts
import * as readline from 'readline';
import { BacklogChefApiClient } from '../api/client';

export async function loginCommand(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    console.log('🔐 Backlog Chef Login\n');

    const email = await question('Email: ');
    const password = await question('Password: '); // In production, hide password input

    console.log('\nAuthenticating...');

    const client = new BacklogChefApiClient();
    await client.login(email, password);

    console.log('✅ Login successful!\n');

    // Show user info
    const user = await client.getCurrentUser();
    const subscription = await client.getSubscription();

    console.log(`Welcome, ${user.name}!`);
    console.log(`Plan: ${subscription.tier} (${subscription.meetingsRemaining} meetings remaining this month)\n`);

  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}
```

---

## 4. Analyze Command (Protected)

```typescript
// src/commands/analyze.ts
import * as fs from 'fs';
import { BacklogChefApiClient } from '../api/client';
import { CredentialStorage } from '../auth/storage';

interface AnalyzeOptions {
  workflow?: string;
  output?: string;
  watch?: boolean;
}

export async function analyzeCommand(
  transcriptPath: string,
  options: AnalyzeOptions
): Promise<void> {

  // Check authentication
  const credentials = CredentialStorage.load();
  if (!credentials) {
    console.error('❌ Not authenticated. Please run: backlog-chef login');
    process.exit(1);
  }

  // Read transcript
  if (!fs.existsSync(transcriptPath)) {
    console.error(`❌ File not found: ${transcriptPath}`);
    process.exit(1);
  }

  const transcript = fs.readFileSync(transcriptPath, 'utf-8');

  try {
    console.log('📊 Analyzing transcript...\n');

    const client = new BacklogChefApiClient();

    // Submit for analysis
    const job = await client.analyzeTranscript(transcript, options.workflow);

    console.log(`✅ Job submitted: ${job.jobId}`);
    console.log(`⏱️  Estimated time: ${job.estimatedTime} seconds\n`);

    // Poll for results
    if (options.watch !== false) {
      await pollJobStatus(client, job.jobId, options.output);
    } else {
      console.log(`Check status with: backlog-chef status ${job.jobId}`);
    }

  } catch (error: any) {
    if (error.message.includes('Subscription required')) {
      console.error('\n❌ Subscription required');
      console.error('   Visit: https://backlog-chef.com/pricing');
      console.error('   Or start a free trial: backlog-chef trial');
    } else if (error.message.includes('Rate limit')) {
      console.error('\n❌ Rate limit exceeded');
      console.error('   Upgrade for higher limits: https://backlog-chef.com/pricing');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

async function pollJobStatus(
  client: BacklogChefApiClient,
  jobId: string,
  outputPath?: string
): Promise<void> {

  const startTime = Date.now();
  let dots = 0;

  while (true) {
    await sleep(2000); // Poll every 2 seconds

    const status = await client.getJobStatus(jobId);

    if (status.status === 'completed') {
      console.log('\n\n✅ Analysis complete!\n');

      // Display results
      displayResults(status.result);

      // Save to file if requested
      if (outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(status.result, null, 2));
        console.log(`\n💾 Results saved to: ${outputPath}`);
      }

      break;
    } else if (status.status === 'failed') {
      console.error('\n\n❌ Analysis failed:', status.error);
      process.exit(1);
    } else {
      // Still processing
      process.stdout.write(`\rProcessing${'.'.repeat(dots % 4)}   `);
      dots++;
    }

    // Timeout after 5 minutes
    if (Date.now() - startTime > 5 * 60 * 1000) {
      console.error('\n\n❌ Timeout: Analysis took too long');
      process.exit(1);
    }
  }
}

function displayResults(result: any): void {
  console.log('📋 PBIs Found:', result.pbis.length);
  console.log('❓ Questions Generated:', result.questions.length);
  console.log('💡 Proposals Made:', result.proposals.length);

  if (result.readiness) {
    console.log('\n🎯 Readiness Summary:');
    for (const [status, count] of Object.entries(result.readiness)) {
      console.log(`   ${status}: ${count}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 5. CLI Entry Point

```typescript
// src/index.ts
import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { registerCommand } from './commands/register';
import { analyzeCommand } from './commands/analyze';
import { logoutCommand } from './commands/logout';

const program = new Command();

program
  .name('backlog-chef')
  .description('AI-powered Scrum refinement assistant')
  .version('1.0.0');

// Login
program
  .command('login')
  .description('Login to your Backlog Chef account')
  .action(loginCommand);

// Register
program
  .command('register')
  .description('Create a new account')
  .action(registerCommand);

// Logout
program
  .command('logout')
  .description('Logout from your account')
  .action(logoutCommand);

// Analyze (main command)
program
  .command('analyze <transcript>')
  .description('Analyze a meeting transcript')
  .option('-w, --workflow <type>', 'Workflow type (refinement, planning, retrospective)', 'refinement')
  .option('-o, --output <file>', 'Save results to file')
  .option('--no-watch', 'Don\'t wait for results')
  .action(analyzeCommand);

// Status
program
  .command('status <jobId>')
  .description('Check job status')
  .action(async (jobId: string) => {
    const { BacklogChefApiClient } = await import('./api/client');
    const client = new BacklogChefApiClient();
    const status = await client.getJobStatus(jobId);
    console.log(JSON.stringify(status, null, 2));
  });

// Subscription info
program
  .command('subscription')
  .description('View your subscription details')
  .action(async () => {
    const { BacklogChefApiClient } = await import('./api/client');
    const client = new BacklogChefApiClient();
    const subscription = await client.getSubscription();

    console.log('\n📊 Subscription Details\n');
    console.log(`Plan: ${subscription.tier}`);
    console.log(`Meetings this month: ${subscription.meetingsUsed}/${subscription.meetingsLimit}`);
    console.log(`Renewal: ${subscription.renewalDate}`);
    console.log(`\nUpgrade: https://backlog-chef.com/pricing\n`);
  });

program.parse();
```

---

## 6. Package.json Configuration

```json
{
  "name": "backlog-chef",
  "version": "1.0.0",
  "description": "AI-powered Scrum refinement assistant",
  "main": "dist/index.js",
  "bin": {
    "backlog-chef": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "scrum",
    "agile",
    "backlog",
    "pbi",
    "refinement",
    "ai",
    "claude"
  ],
  "author": "Backlog Chef Team",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.6.2",
    "commander": "^11.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

---

## 7. Environment Variables

```bash
# .env (for development)
BACKLOG_CHEF_API_URL=http://localhost:3000

# .env.production
BACKLOG_CHEF_API_URL=https://api.backlog-chef.com
```

---

## Usage Examples

```bash
# Install globally
npm install -g backlog-chef

# First time setup
backlog-chef register
backlog-chef login

# Analyze a meeting
backlog-chef analyze meeting-transcript.txt

# Check subscription
backlog-chef subscription

# Logout
backlog-chef logout

# Use API key directly (CI/CD)
export BACKLOG_CHEF_API_KEY=sk_live_abc123
backlog-chef analyze meeting.txt
```

---

## Security Best Practices

### ✅ DO:
- Store credentials in user's home directory (`~/.backlog-chef/`)
- Use file permissions 0600 (owner read/write only)
- Implement token refresh
- Handle 401/402/429 errors gracefully
- Clear tokens on logout
- Use HTTPS for all API calls

### ❌ DON'T:
- Store credentials in git
- Bundle API keys in package
- Store passwords in plain text
- Hardcode API URLs
- Ignore token expiration

---

## Testing Authentication

```typescript
// src/__tests__/auth.test.ts
import { CredentialStorage } from '../auth/storage';

describe('CredentialStorage', () => {
  afterEach(() => {
    CredentialStorage.delete();
  });

  it('should save and load credentials', () => {
    const creds = {
      apiToken: 'token123',
      refreshToken: 'refresh456',
      expiresAt: '2025-12-31T23:59:59Z',
      email: 'test@example.com'
    };

    CredentialStorage.save(creds);
    const loaded = CredentialStorage.load();

    expect(loaded).toEqual(creds);
  });

  it('should detect expired tokens', () => {
    const creds = {
      apiToken: 'token123',
      refreshToken: 'refresh456',
      expiresAt: '2020-01-01T00:00:00Z', // Past date
      email: 'test@example.com'
    };

    CredentialStorage.save(creds);
    expect(CredentialStorage.isExpired(creds)).toBe(true);
  });
});
```

---

## Summary

This authentication system:
- ✅ Stores tokens securely locally
- ✅ Refreshes tokens automatically
- ✅ Handles auth errors gracefully
- ✅ Supports both login and API keys
- ✅ Easy to use for developers
- ✅ Secure by default
- ✅ CLI code can be open source (no secrets)

**Next:** Build the backend API service!
