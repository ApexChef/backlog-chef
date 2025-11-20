# Authentication & Monetization Architecture

## Overview

Backlog Chef uses a **SaaS model** with a free CLI client and paid backend API service. This document outlines the authentication system that protects revenue while maintaining a good user experience.

---

## Architecture Model: Free CLI + Paid API

```
┌─────────────────┐
│   User's PC     │
│                 │
│  backlog-chef   │  ← Free, open source CLI (npm package)
│     (CLI)       │
└────────┬────────┘
         │
         │ HTTPS + API Key
         │
         ▼
┌─────────────────────────────────────────┐
│      YOUR BACKEND (Protected)           │
├─────────────────────────────────────────┤
│  • Authentication Service                │
│  • Subscription Management               │
│  • Usage Tracking & Billing              │
│  • Rate Limiting                         │
│  • Claude API Integration (your keys)   │
│  • Meeting Processing Pipeline           │
└─────────────────────────────────────────┘
         │
         │ Your API Keys
         │
         ▼
┌─────────────────┐
│  Anthropic API  │
│  (Claude)       │
└─────────────────┘
```

---

## Why This Model?

### ✅ Advantages

1. **Revenue Protection**
   - All valuable processing on your servers
   - No way to bypass subscription without hacking your backend
   - API keys can be revoked instantly

2. **Cost Control**
   - You control Claude API usage (expensive!)
   - Users can't abuse your API keys
   - Rate limiting per subscription tier

3. **Feature Control**
   - Enable/disable features per subscription
   - A/B testing
   - Gradual rollouts

4. **Legal Protection**
   - CLI code can be MIT licensed (builds trust)
   - Backend code stays proprietary
   - Service Terms of Service protects you

5. **Analytics & Improvements**
   - Track feature usage
   - Identify bottlenecks
   - Improve based on real usage data

### ❌ What NOT to Do

**Don't bundle Claude API keys in npm package** - Users will extract and abuse them

**Don't rely only on code obfuscation** - Can be reversed

**Don't sell "license keys" for local execution** - Users will share keys

---

## Authentication Flow

### 1. User Registration & Login

```bash
# First time setup
$ backlog-chef register
Email: user@company.com
Password: ********
→ Verify email sent to user@company.com

# Login (stores token locally)
$ backlog-chef login
Email: user@company.com
Password: ********
→ ✓ Logged in successfully
→ Token saved to ~/.backlog-chef/credentials.json

# Or use API key directly (for CI/CD)
$ backlog-chef --api-key sk_live_abc123xyz
```

### 2. Token Storage (Local)

```json
// ~/.backlog-chef/credentials.json
{
  "apiToken": "bkc_usr_1234567890abcdef",
  "refreshToken": "bkc_refresh_xyz789",
  "expiresAt": "2025-12-31T23:59:59Z",
  "email": "user@company.com"
}
```

### 3. Every CLI Request

```typescript
// CLI makes authenticated request
POST https://api.backlog-chef.com/v1/analyze
Headers:
  Authorization: Bearer bkc_usr_1234567890abcdef
  Content-Type: application/json

Body:
{
  "transcriptUrl": "https://...",
  "workflow": "refinement"
}

// Backend validates and processes
Response:
{
  "jobId": "job_abc123",
  "status": "processing",
  "estimatedTime": 45
}
```

---

## Backend Authentication Service

### Required Components

1. **User Management**
   - User registration with email verification
   - Password hashing (bcrypt)
   - JWT token generation
   - Refresh token rotation

2. **Subscription Management**
   - Plan tiers (Starter, Pro, Business, Enterprise)
   - Payment processing (Stripe integration)
   - Usage quotas (meetings/month)
   - Feature flags per tier

3. **API Key Management**
   - Generate long-lived API keys for CI/CD
   - Key rotation
   - Scope permissions

4. **Rate Limiting**
   - Per user/org rate limits
   - Different limits per subscription tier
   - Quota tracking (meetings processed this month)

5. **Audit Logging**
   - All API requests logged
   - Usage analytics
   - Abuse detection

---

## Subscription Tiers & Quotas

```yaml
# config/subscription-tiers.yaml

starter:
  price: €49/month
  limits:
    meetingsPerMonth: 50
    teamsCount: 1
    storageGB: 5
    realtimeSupport: false
  rateLimit:
    requestsPerMinute: 10
    concurrentJobs: 2

pro:
  price: €149/month
  limits:
    meetingsPerMonth: 200
    teamsCount: 3
    storageGB: 20
    realtimeSupport: true
  rateLimit:
    requestsPerMinute: 30
    concurrentJobs: 5

business:
  price: €499/month
  limits:
    meetingsPerMonth: -1  # Unlimited
    teamsCount: -1
    storageGB: 100
    realtimeSupport: true
  rateLimit:
    requestsPerMinute: 100
    concurrentJobs: 20

enterprise:
  price: "Custom"
  limits:
    # Custom per contract
  features:
    - On-premise deployment option
    - SSO integration
    - Custom SLA
    - Dedicated support
```

---

## Code Protection Strategies

### Layer 1: Legal Protection

```text
LICENSE.txt (for CLI - MIT)
---
The CLI client is open source (builds trust)

TERMS_OF_SERVICE.txt (for API)
---
- API access requires paid subscription
- Reverse engineering prohibited
- Abuse results in account termination
- GDPR compliant data handling
```

### Layer 2: Technical Protection

**A) Authentication Checks (Cannot be bypassed)**

```typescript
// CLI src/api/client.ts
export async function analyzeTranscript(transcript: string) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated. Run: backlog-chef login');
  }

  // All processing happens on YOUR backend
  const response = await fetch('https://api.backlog-chef.com/v1/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ transcript })
  });

  if (response.status === 401) {
    throw new Error('Authentication failed. Please login again.');
  }

  if (response.status === 402) {
    throw new Error('Subscription required. Visit: https://backlog-chef.com/pricing');
  }

  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Upgrade your plan for higher limits.');
  }

  return response.json();
}
```

**B) Server-Side Validation (Your backend)**

```typescript
// Backend API endpoint
app.post('/v1/analyze', async (req, res) => {
  // 1. Validate token
  const user = await validateToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 2. Check subscription status
  const subscription = await getSubscription(user.id);
  if (!subscription.isActive) {
    return res.status(402).json({
      error: 'Subscription required',
      upgradeUrl: 'https://backlog-chef.com/pricing'
    });
  }

  // 3. Check usage quota
  const usage = await getMonthlyUsage(user.id);
  if (usage.meetingsProcessed >= subscription.limits.meetingsPerMonth) {
    return res.status(429).json({
      error: 'Monthly quota exceeded',
      current: usage.meetingsProcessed,
      limit: subscription.limits.meetingsPerMonth,
      upgradeUrl: 'https://backlog-chef.com/pricing'
    });
  }

  // 4. Rate limiting
  const rateLimit = await checkRateLimit(user.id, subscription.tier);
  if (rateLimit.exceeded) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Try again in 60 seconds.',
      retryAfter: 60
    });
  }

  // 5. Process the request (YOUR Claude API keys)
  const result = await processTranscript(req.body.transcript);

  // 6. Track usage for billing
  await trackUsage(user.id, {
    operation: 'analyze',
    tokensUsed: result.usage.tokens,
    cost: result.usage.cost
  });

  // 7. Return results
  res.json(result);
});
```

**C) Preventing Code Tampering**

The CLI code can be modified, but it **doesn't matter** because:
- Authentication happens server-side
- Claude API keys are on YOUR server
- Users can't bypass your subscription checks
- If they remove auth code, API returns 401

---

## What Users CAN'T Do (Even If They Try)

### ❌ Can't Steal Your Claude API Keys
- Keys never leave your backend
- Not in npm package
- Not in CLI code
- Not in API responses

### ❌ Can't Bypass Subscription
- All processing on your servers
- Token validation server-side
- Even if they modify CLI code, API rejects invalid tokens

### ❌ Can't Share One Account
- Track concurrent sessions
- Detect unusual usage patterns
- Enforce team limits

### ❌ Can't Extract Processing Logic
- AI prompts on your backend
- Proprietary algorithms server-side
- CLI is just a thin client

---

## Additional Revenue Protection

### 1. Usage-Based Billing (Add-On)

```typescript
// Charge for actual usage beyond quota
const pricing = {
  starter: {
    base: 49,
    overagePer10Meetings: 15
  }
};

// User processed 55 meetings on Starter (50 included)
// Bill: €49 + (5 extra meetings → €15) = €64
```

### 2. Watermark Free Tier

```typescript
// Free trial outputs include watermark
if (subscription.tier === 'free') {
  output.footer = '---\n✨ Generated by Backlog Chef Free Trial\n' +
                  'Upgrade for watermark-free outputs: https://backlog-chef.com/pricing';
}
```

### 3. Feature Gating

```typescript
// Premium features only for paid tiers
const features = {
  'real-time-feedback': ['pro', 'business', 'enterprise'],
  'confluence-export': ['business', 'enterprise'],
  'custom-workflows': ['enterprise'],
  'sso': ['enterprise']
};

if (!hasFeatureAccess(user.subscription.tier, 'real-time-feedback')) {
  return res.status(403).json({
    error: 'Feature not available in your plan',
    feature: 'real-time-feedback',
    requiredTier: 'pro',
    upgradeUrl: 'https://backlog-chef.com/pricing'
  });
}
```

---

## Preventing Abuse

### 1. Detect Account Sharing

```typescript
// Backend abuse detection
const sessions = await getActiveSessions(user.id);

if (sessions.length > subscription.limits.concurrentSessions) {
  // Multiple IPs using same account simultaneously
  await flagForReview(user.id, 'possible_account_sharing');
}

if (sessions.ips.length > 10) {
  // Account used from many different locations
  await flagForReview(user.id, 'suspicious_activity');
}
```

### 2. API Key Rotation

```typescript
// Force rotation every 90 days
if (apiKey.createdAt < Date.now() - 90 * 24 * 60 * 60 * 1000) {
  return res.status(401).json({
    error: 'API key expired. Generate a new one.',
    rotateUrl: 'https://app.backlog-chef.com/settings/api-keys'
  });
}
```

### 3. DMCA & Legal

```text
In your Terms of Service:
- "Reverse engineering is prohibited"
- "One account per organization"
- "API abuse results in termination"
- Report violations: abuse@backlog-chef.com
```

---

## Hybrid Model: Local + Cloud

For enterprise customers who want on-premise:

```bash
# Self-hosted version (Enterprise only)
$ npm install @backlog-chef/enterprise
$ backlog-chef-enterprise init --license-key ent_abc123

# Validates license with your licensing server
# Runs locally but checks license daily
# More expensive tier (€2000+/month)
```

---

## Technology Stack for Backend

**Recommended Stack:**

```yaml
Authentication:
  - Auth service: Auth0 / Supabase / Custom (Node.js + JWT)
  - Password hashing: bcrypt
  - Token storage: Redis (for fast validation)

Payment:
  - Stripe (subscriptions + usage billing)
  - Paddle (alternative, handles VAT)

Backend:
  - Runtime: Node.js / Python
  - Framework: Express / FastAPI
  - Database: PostgreSQL (users, subscriptions, usage)
  - Cache: Redis (rate limiting, sessions)

Infrastructure:
  - Hosting: Railway / Render / AWS
  - CDN: Cloudflare (DDoS protection)
  - Monitoring: Sentry (errors) + PostHog (analytics)

Deployment:
  - CLI: npm (public, free, open source)
  - Backend: Private deployment
```

---

## Migration Path

### Phase 1: MVP (Simple Authentication)
- Basic email/password auth
- Hardcoded subscription tiers
- Simple usage tracking
- Focus on product-market fit

### Phase 2: Scale (Robust System)
- Stripe integration
- Automated billing
- Usage-based overages
- Team management

### Phase 3: Enterprise (Advanced)
- SSO (SAML, OAuth)
- On-premise option
- Custom SLAs
- Dedicated support

---

## Key Takeaway

**Your moat is NOT code secrecy—it's the service you provide.**

- Give away the CLI (builds trust, GitHub stars)
- Charge for the infrastructure (API, Claude costs, support)
- Make it so valuable they don't want to clone it
- Focus on building a great product, not obfuscation

---

## Next Steps

1. ✅ Build MVP CLI (free, open source)
2. ✅ Create simple backend with authentication
3. ✅ Set up Stripe for payments
4. ✅ Launch with generous free tier
5. ✅ Monitor usage and iterate
6. ✅ Add enterprise features based on demand

---

## Questions?

- Authentication: Use JWT tokens, stored locally
- Payments: Stripe subscriptions
- Protection: Backend processing, not code obfuscation
- Model: Free CLI + Paid API (SaaS)
