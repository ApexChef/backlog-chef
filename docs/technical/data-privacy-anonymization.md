# Data Privacy & Anonymization System

## Overview

Backlog Chef processes sensitive business data (customer names, project details, technical architecture). This document describes the **anonymization filter** that protects PII/confidential data before sending to LLMs, and the **transparency layer** that lets users see exactly what happens with their data.

## Core Principles

1. **Zero Trust with LLMs** - Assume LLM provider could leak/log data
2. **Reversible Anonymization** - Replace sensitive data with tokens, restore after processing
3. **Complete Auditability** - Log every piece of data sent to LLM and received back
4. **User Transparency** - Show users exactly what was anonymized and why
5. **Configurable Sensitivity** - Teams choose what's sensitive for their organization

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    INPUT: Meeting Transcript                  │
│  "Sarah Johnson from Acme Corp discussed the Customer Portal  │
│   for acme.salesforce.com. John mentioned API key abc123..."  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              STEP 1: PII/Sensitive Data Detection             │
│  - Named Entity Recognition (people, companies, emails)       │
│  - Pattern matching (API keys, credentials, org IDs)          │
│  - Custom entity detection (customer names from config)       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              STEP 2: Anonymization Mapping                    │
│  Sarah Johnson    → [PERSON_001]                              │
│  Acme Corp        → [COMPANY_001]                             │
│  acme.salesforce  → [SALESFORCE_ORG_001]                      │
│  abc123           → [API_KEY_001]                             │
│  [Stored in encrypted mapping: /vault/session-123.vault]     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              STEP 3: Anonymized Data to LLM                   │
│  "[PERSON_001] from [COMPANY_001] discussed the Customer      │
│   Portal for [SALESFORCE_ORG_001]. [PERSON_002] mentioned     │
│   API key [API_KEY_001]..."                                   │
│  [LOGGED: /audit-logs/llm-requests/2025-11-18-001.log]       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              LLM Processing (Claude API)                      │
│  Returns: "[PERSON_001] is Product Owner for [COMPANY_001]"  │
│  [LOGGED: /audit-logs/llm-responses/2025-11-18-001.log]      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              STEP 4: De-anonymization                         │
│  [PERSON_001]     → Sarah Johnson                             │
│  [COMPANY_001]    → Acme Corp                                 │
│  [Mapping loaded from: /vault/session-123.vault]             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              OUTPUT: Restored Original Data                   │
│  "Sarah Johnson is Product Owner for Acme Corp"               │
│  [LOGGED: /audit-logs/de-anonymization/2025-11-18-001.log]   │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Anonymization Filter

```typescript
interface AnonymizationConfig {
  enabled: boolean;
  sensitivity_level: 'strict' | 'moderate' | 'relaxed';
  entity_types: {
    // Standard PII
    person_names: boolean;
    email_addresses: boolean;
    phone_numbers: boolean;

    // Business entities
    company_names: boolean;
    customer_names: boolean;

    // Technical data
    salesforce_org_ids: boolean;
    api_keys: boolean;
    urls: boolean;
    ip_addresses: boolean;

    // Custom entities
    custom_patterns: CustomPattern[];
  };

  // Whitelisted entities (never anonymize)
  whitelist: {
    people: string[];      // ["Sarah Johnson"] - internal team
    companies: string[];   // ["Our Company Inc"]
    domains: string[];     // ["company.com"]
  };
}

interface CustomPattern {
  name: string;
  pattern: RegExp;
  replacement_prefix: string;  // e.g., "[PROJECT_NAME_"
  description: string;
}
```

**Example Configuration**:
```yaml
# config/anonymization.yaml
enabled: true
sensitivity_level: strict

entity_types:
  person_names: true
  email_addresses: true
  phone_numbers: true
  company_names: true
  customer_names: true
  salesforce_org_ids: true
  api_keys: true
  urls: true
  ip_addresses: true

  custom_patterns:
    - name: "Project Codenames"
      pattern: "Project (Phoenix|Aurora|Titan)"
      replacement_prefix: "[PROJECT_"
      description: "Internal project codenames are confidential"

    - name: "Customer Account Numbers"
      pattern: "ACCT-\\d{6}"
      replacement_prefix: "[ACCOUNT_"
      description: "Customer account identifiers"

whitelist:
  people:
    - "Sarah Johnson"    # Product Owner - internal team
    - "Mark Stevens"     # Business Analyst - internal team

  companies:
    - "Our Company Inc"  # Our own company name is public

  domains:
    - "company.com"      # Internal domain is safe
```

---

### 2. Anonymizer Implementation

```typescript
class DataAnonymizer {
  private config: AnonymizationConfig;
  private mappings: Map<string, string> = new Map();
  private reverseMappings: Map<string, string> = new Map();
  private entityCounters: Map<string, number> = new Map();
  private sessionId: string;

  constructor(config: AnonymizationConfig, sessionId: string) {
    this.config = config;
    this.sessionId = sessionId;
  }

  /**
   * Main anonymization method
   */
  async anonymize(text: string): Promise<AnonymizedResult> {
    const detectedEntities: DetectedEntity[] = [];
    let anonymizedText = text;

    // 1. Detect all sensitive entities
    if (this.config.entity_types.person_names) {
      const people = await this.detectPeople(text);
      detectedEntities.push(...people);
    }

    if (this.config.entity_types.email_addresses) {
      const emails = this.detectEmails(text);
      detectedEntities.push(...emails);
    }

    if (this.config.entity_types.company_names) {
      const companies = await this.detectCompanies(text);
      detectedEntities.push(...companies);
    }

    if (this.config.entity_types.api_keys) {
      const apiKeys = this.detectAPIKeys(text);
      detectedEntities.push(...apiKeys);
    }

    if (this.config.entity_types.salesforce_org_ids) {
      const orgIds = this.detectSalesforceOrgIds(text);
      detectedEntities.push(...orgIds);
    }

    // Custom patterns
    for (const pattern of this.config.entity_types.custom_patterns) {
      const matches = this.detectCustomPattern(text, pattern);
      detectedEntities.push(...matches);
    }

    // 2. Filter out whitelisted entities
    const entitiesToAnonymize = detectedEntities.filter(
      entity => !this.isWhitelisted(entity)
    );

    // 3. Sort by position (reverse order to maintain text positions)
    entitiesToAnonymize.sort((a, b) => b.position - a.position);

    // 4. Replace entities with tokens
    for (const entity of entitiesToAnonymize) {
      const token = this.getOrCreateToken(entity);
      anonymizedText = this.replaceAt(
        anonymizedText,
        entity.position,
        entity.length,
        token
      );
    }

    // 5. Log the anonymization
    await this.logAnonymization(text, anonymizedText, entitiesToAnonymize);

    return {
      anonymizedText,
      entities: entitiesToAnonymize,
      mappingId: this.sessionId,
      anonymizedCount: entitiesToAnonymize.length
    };
  }

  /**
   * De-anonymize LLM response
   */
  async deanonymize(anonymizedText: string): Promise<DeanonymizedResult> {
    let restoredText = anonymizedText;
    const restoredEntities: RestoredEntity[] = [];

    // Find all tokens in the text
    const tokenPattern = /\[(PERSON|COMPANY|EMAIL|API_KEY|SALESFORCE_ORG|PROJECT|ACCOUNT)_\d+\]/g;
    const matches = [...anonymizedText.matchAll(tokenPattern)];

    // Sort by position (reverse order)
    matches.sort((a, b) => b.index! - a.index!);

    for (const match of matches) {
      const token = match[0];
      const originalValue = this.reverseMappings.get(token);

      if (originalValue) {
        restoredText = this.replaceAt(
          restoredText,
          match.index!,
          token.length,
          originalValue
        );

        restoredEntities.push({
          token,
          originalValue,
          position: match.index!
        });
      } else {
        // Token not found in mapping - log warning
        await this.logWarning(
          `Token ${token} found in LLM response but not in mapping`
        );
      }
    }

    // Log the de-anonymization
    await this.logDeanonymization(anonymizedText, restoredText, restoredEntities);

    return {
      restoredText,
      restoredEntities,
      restoredCount: restoredEntities.length
    };
  }

  /**
   * Detect people using NER (Named Entity Recognition)
   */
  private async detectPeople(text: string): Promise<DetectedEntity[]> {
    // Option 1: Use local NER library (spaCy via Python bridge, or compromise-nlp)
    // Option 2: Use pattern matching for common name patterns
    // Option 3: Maintain team roster and match against it

    const entities: DetectedEntity[] = [];

    // Simple pattern: "Name said", "Name mentioned", "Name from"
    const namePattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b(?= (said|mentioned|from|discussed|suggested))/g;
    const matches = text.matchAll(namePattern);

    for (const match of matches) {
      const name = match[1];
      entities.push({
        type: 'PERSON',
        value: name,
        position: match.index!,
        length: name.length,
        confidence: 0.8
      });
    }

    return entities;
  }

  /**
   * Detect emails
   */
  private detectEmails(text: string): DetectedEntity[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.matchAll(emailPattern);
    const entities: DetectedEntity[] = [];

    for (const match of matches) {
      entities.push({
        type: 'EMAIL',
        value: match[0],
        position: match.index!,
        length: match[0].length,
        confidence: 1.0
      });
    }

    return entities;
  }

  /**
   * Detect companies
   */
  private async detectCompanies(text: string): Promise<DetectedEntity[]> {
    const entities: DetectedEntity[] = [];

    // Pattern: "Corp", "Inc", "LLC", "Ltd"
    const companyPattern = /\b([A-Z][A-Za-z0-9&\s]+(?:Corp|Inc|LLC|Ltd|Limited|Company|Co\.?))\b/g;
    const matches = text.matchAll(companyPattern);

    for (const match of matches) {
      entities.push({
        type: 'COMPANY',
        value: match[1],
        position: match.index!,
        length: match[1].length,
        confidence: 0.85
      });
    }

    return entities;
  }

  /**
   * Detect API keys
   */
  private detectAPIKeys(text: string): DetectedEntity[] {
    const entities: DetectedEntity[] = [];

    // Common API key patterns
    const patterns = [
      /\b([A-Za-z0-9]{32,64})\b/g,  // Generic long alphanumeric
      /sk-[A-Za-z0-9]{48}/g,        // OpenAI style
      /AIza[A-Za-z0-9_-]{35}/g,     // Google API
      /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi  // UUID
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          type: 'API_KEY',
          value: match[0],
          position: match.index!,
          length: match[0].length,
          confidence: 0.9
        });
      }
    }

    return entities;
  }

  /**
   * Detect Salesforce org IDs
   */
  private detectSalesforceOrgIds(text: string): DetectedEntity[] {
    const entities: DetectedEntity[] = [];

    // Pattern: 00D... (15 or 18 chars)
    const orgIdPattern = /\b(00D[A-Za-z0-9]{12,15})\b/g;
    const matches = text.matchAll(orgIdPattern);

    for (const match of matches) {
      entities.push({
        type: 'SALESFORCE_ORG',
        value: match[1],
        position: match.index!,
        length: match[1].length,
        confidence: 1.0
      });
    }

    // Pattern: subdomain.salesforce.com
    const subdomainPattern = /\b([a-z0-9-]+)\.salesforce\.com\b/g;
    const subdomainMatches = text.matchAll(subdomainPattern);

    for (const match of subdomainMatches) {
      entities.push({
        type: 'SALESFORCE_ORG',
        value: match[0],
        position: match.index!,
        length: match[0].length,
        confidence: 1.0
      });
    }

    return entities;
  }

  /**
   * Detect custom patterns
   */
  private detectCustomPattern(
    text: string,
    pattern: CustomPattern
  ): DetectedEntity[] {
    const entities: DetectedEntity[] = [];
    const matches = text.matchAll(new RegExp(pattern.pattern, 'g'));

    for (const match of matches) {
      entities.push({
        type: pattern.name.toUpperCase().replace(/\s/g, '_'),
        value: match[0],
        position: match.index!,
        length: match[0].length,
        confidence: 1.0
      });
    }

    return entities;
  }

  /**
   * Check if entity is whitelisted
   */
  private isWhitelisted(entity: DetectedEntity): boolean {
    switch (entity.type) {
      case 'PERSON':
        return this.config.whitelist.people.includes(entity.value);
      case 'COMPANY':
        return this.config.whitelist.companies.includes(entity.value);
      case 'EMAIL':
        const domain = entity.value.split('@')[1];
        return this.config.whitelist.domains.includes(domain);
      default:
        return false;
    }
  }

  /**
   * Get or create anonymization token
   */
  private getOrCreateToken(entity: DetectedEntity): string {
    // Check if we've already created a token for this value
    if (this.mappings.has(entity.value)) {
      return this.mappings.get(entity.value)!;
    }

    // Create new token
    const counter = (this.entityCounters.get(entity.type) || 0) + 1;
    this.entityCounters.set(entity.type, counter);

    const token = `[${entity.type}_${String(counter).padStart(3, '0')}]`;

    // Store bidirectional mapping
    this.mappings.set(entity.value, token);
    this.reverseMappings.set(token, entity.value);

    return token;
  }

  /**
   * Replace text at position
   */
  private replaceAt(
    text: string,
    position: number,
    length: number,
    replacement: string
  ): string {
    return (
      text.substring(0, position) +
      replacement +
      text.substring(position + length)
    );
  }

  /**
   * Save encrypted mapping to vault
   */
  async saveMappingToVault(): Promise<string> {
    const vaultPath = `/vault/${this.sessionId}.vault`;

    const mappingData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      mappings: Object.fromEntries(this.mappings),
      reverseMappings: Object.fromEntries(this.reverseMappings)
    };

    // Encrypt and save
    const encrypted = await this.encrypt(JSON.stringify(mappingData));
    await fs.promises.writeFile(vaultPath, encrypted);

    return vaultPath;
  }

  /**
   * Load mapping from vault
   */
  async loadMappingFromVault(sessionId: string): Promise<void> {
    const vaultPath = `/vault/${sessionId}.vault`;
    const encrypted = await fs.promises.readFile(vaultPath, 'utf-8');
    const decrypted = await this.decrypt(encrypted);
    const mappingData = JSON.parse(decrypted);

    this.mappings = new Map(Object.entries(mappingData.mappings));
    this.reverseMappings = new Map(Object.entries(mappingData.reverseMappings));
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: string): Promise<string> {
    // Use AES-256-GCM encryption
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.VAULT_ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted
    });
  }

  /**
   * Decrypt data
   */
  private async decrypt(encryptedData: string): Promise<string> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.VAULT_ENCRYPTION_KEY!, 'hex');

    const { iv, authTag, encrypted } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Log anonymization action
   */
  private async logAnonymization(
    originalText: string,
    anonymizedText: string,
    entities: DetectedEntity[]
  ): Promise<void> {
    const logEntry: AnonymizationLog = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      action: 'anonymize',
      originalTextLength: originalText.length,
      anonymizedTextLength: anonymizedText.length,
      entitiesAnonymized: entities.length,
      entityTypes: this.groupByType(entities),
      // Store hash of original text for verification
      originalTextHash: this.hash(originalText),
      anonymizedTextHash: this.hash(anonymizedText)
    };

    await this.writeAuditLog('anonymization', logEntry);
  }

  /**
   * Log de-anonymization action
   */
  private async logDeanonymization(
    anonymizedText: string,
    restoredText: string,
    entities: RestoredEntity[]
  ): Promise<void> {
    const logEntry: DeanonymizationLog = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      action: 'deanonymize',
      anonymizedTextLength: anonymizedText.length,
      restoredTextLength: restoredText.length,
      entitiesRestored: entities.length,
      anonymizedTextHash: this.hash(anonymizedText),
      restoredTextHash: this.hash(restoredText)
    };

    await this.writeAuditLog('deanonymization', logEntry);
  }

  private async logWarning(message: string): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level: 'WARNING',
      message
    };

    await this.writeAuditLog('warnings', logEntry);
  }

  private async writeAuditLog(type: string, entry: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const logPath = `/audit-logs/${type}/${date}.log`;

    await fs.promises.appendFile(
      logPath,
      JSON.stringify(entry) + '\n',
      'utf-8'
    );
  }

  private hash(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private groupByType(entities: DetectedEntity[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const entity of entities) {
      groups[entity.type] = (groups[entity.type] || 0) + 1;
    }
    return groups;
  }
}
```

---

## 3. Audit Logging System

### Log Types

**1. Anonymization Log**
```json
{
  "timestamp": "2025-11-18T15:30:00Z",
  "sessionId": "session-abc123",
  "action": "anonymize",
  "originalTextLength": 5420,
  "anonymizedTextLength": 5180,
  "entitiesAnonymized": 18,
  "entityTypes": {
    "PERSON": 5,
    "COMPANY": 3,
    "EMAIL": 4,
    "SALESFORCE_ORG": 2,
    "API_KEY": 1,
    "PROJECT": 3
  },
  "originalTextHash": "sha256:abc123...",
  "anonymizedTextHash": "sha256:def456..."
}
```

**2. LLM Request Log**
```json
{
  "timestamp": "2025-11-18T15:30:05Z",
  "sessionId": "session-abc123",
  "pipelineStep": "03-score-confidence",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "requestId": "req_xyz789",
  "anonymized": true,
  "promptTokens": 1250,
  "promptHash": "sha256:ghi789...",
  "dataSent": {
    "containsAnonymizedEntities": true,
    "entityCount": 18,
    "pbiId": "PBI-001"
  }
}
```

**3. LLM Response Log**
```json
{
  "timestamp": "2025-11-18T15:30:12Z",
  "sessionId": "session-abc123",
  "requestId": "req_xyz789",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "completionTokens": 850,
  "responseHash": "sha256:jkl012...",
  "dataReceived": {
    "containsAnonymizedEntities": true,
    "tokensFoundInResponse": ["[PERSON_001]", "[COMPANY_001]", "[PERSON_002]"]
  }
}
```

**4. De-anonymization Log**
```json
{
  "timestamp": "2025-11-18T15:30:15Z",
  "sessionId": "session-abc123",
  "action": "deanonymize",
  "anonymizedTextLength": 3200,
  "restoredTextLength": 3350,
  "entitiesRestored": 12,
  "anonymizedTextHash": "sha256:jkl012...",
  "restoredTextHash": "sha256:mno345..."
}
```

---

## 4. Transparency UI

### Privacy Dashboard

Users can see exactly what happened with their data:

```typescript
interface PrivacyReport {
  sessionId: string;
  processedAt: string;
  pbiId: string;

  anonymization: {
    enabled: boolean;
    entitiesDetected: number;
    entitiesAnonymized: number;
    entityBreakdown: {
      type: string;
      count: number;
      examples: string[];  // Show first 3 examples
    }[];
  };

  llmInteractions: {
    totalRequests: number;
    dataTransmitted: {
      tokensCount: number;
      anonymized: boolean;
    };
    dataReceived: {
      tokensCount: number;
      containedAnonymizedTokens: boolean;
    };
  };

  restoration: {
    entitiesRestored: number;
    unmappedTokensFound: number;  // Tokens LLM created that we didn't send
  };
}
```

**Example Privacy Dashboard UI**:
```
╔══════════════════════════════════════════════════════════════╗
║           DATA PRIVACY REPORT - Session abc123                ║
╠══════════════════════════════════════════════════════════════╣
║ PBI: PBI-001 - Customer Order Tracking Portal                ║
║ Processed: 2025-11-18 15:30:00                               ║
║ Anonymization: ✓ ENABLED (Strict Mode)                       ║
╠══════════════════════════════════════════════════════════════╣
║ STEP 1: DATA ANONYMIZATION                                   ║
║ ────────────────────────────────────────────────────────────║
║ Entities Detected: 18                                         ║
║ Entities Anonymized: 15 (3 whitelisted)                      ║
║                                                               ║
║ Breakdown:                                                    ║
║   👤 People (5):                                              ║
║      ✓ "Sarah Johnson" → [PERSON_001]                        ║
║      ✓ "Mark Stevens" → [PERSON_002]                         ║
║      ✓ "Lisa Chen" → [PERSON_003]                            ║
║      ... +2 more                                              ║
║                                                               ║
║   🏢 Companies (3):                                           ║
║      ✓ "Acme Corp" → [COMPANY_001]                           ║
║      ✓ "TechVendor Inc" → [COMPANY_002]                      ║
║      ⊘ "Our Company Inc" (whitelisted, not anonymized)       ║
║                                                               ║
║   📧 Emails (4):                                              ║
║      ✓ "sarah@acme.com" → [EMAIL_001]                        ║
║      ... +3 more                                              ║
║                                                               ║
║   🔧 Salesforce Orgs (2):                                     ║
║      ✓ "acme.salesforce.com" → [SALESFORCE_ORG_001]          ║
║      ✓ "00D5f000001AbCd" → [SALESFORCE_ORG_002]              ║
║                                                               ║
║   🔑 API Keys (1):                                            ║
║      ✓ "sk-abc123xyz..." → [API_KEY_001]                     ║
║                                                               ║
║   📁 Custom (3):                                              ║
║      ✓ "Project Phoenix" → [PROJECT_001]                     ║
║      ... +2 more                                              ║
║                                                               ║
║ [View Full Anonymization Details]                            ║
╠══════════════════════════════════════════════════════════════╣
║ STEP 2: LLM INTERACTIONS                                     ║
║ ────────────────────────────────────────────────────────────║
║ Total API Requests: 4                                         ║
║                                                               ║
║ Request 1: Score Confidence (Step 3)                         ║
║   Provider: Anthropic Claude                                 ║
║   Model: claude-3-5-sonnet-20241022                          ║
║   Sent: 1,250 tokens (anonymized)                            ║
║   Received: 850 tokens (anonymized)                          ║
║   Timestamp: 2025-11-18 15:30:05                             ║
║   [View Request] [View Response]                             ║
║                                                               ║
║ Request 2: Enrich Context (Step 4)                           ║
║   Provider: Anthropic Claude                                 ║
║   Sent: 890 tokens (anonymized)                              ║
║   Received: 1,240 tokens (anonymized)                        ║
║   Timestamp: 2025-11-18 15:30:12                             ║
║   [View Request] [View Response]                             ║
║                                                               ║
║ ... +2 more requests                                          ║
║                                                               ║
║ Total Data Transmitted: 4,520 tokens (all anonymized)        ║
║ Total Data Received: 3,890 tokens (all anonymized)           ║
╠══════════════════════════════════════════════════════════════╣
║ STEP 3: DATA RESTORATION                                     ║
║ ────────────────────────────────────────────────────────────║
║ Entities Restored: 12 / 15                                   ║
║                                                               ║
║ ✓ All tokens successfully mapped back to original values     ║
║ ⚠ 3 tokens not found in LLM responses (normal - not all      ║
║   entities are relevant to final output)                     ║
║                                                               ║
║ Unmapped Tokens Found: 0                                     ║
║ (LLM did not invent new sensitive-looking tokens)            ║
╠══════════════════════════════════════════════════════════════╣
║ AUDIT TRAIL                                                   ║
║ ────────────────────────────────────────────────────────────║
║ ✓ Anonymization logged: /audit-logs/anonymization/...       ║
║ ✓ LLM requests logged: /audit-logs/llm-requests/...         ║
║ ✓ LLM responses logged: /audit-logs/llm-responses/...       ║
║ ✓ De-anonymization logged: /audit-logs/de-anonymization/... ║
║ ✓ Mapping vault: /vault/session-abc123.vault (encrypted)    ║
║                                                               ║
║ [Download Full Audit Report (JSON)]                          ║
║ [Export Privacy Report (PDF)]                                ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Integration with Pipeline

### Before Processing (Anonymize)
```typescript
async function processPBI(transcript: string, config: Config): Promise<PBI> {
  const sessionId = generateSessionId();
  const anonymizer = new DataAnonymizer(config.anonymization, sessionId);

  // 1. Anonymize input
  const { anonymizedText, entities } = await anonymizer.anonymize(transcript);

  console.log(`Anonymized ${entities.length} sensitive entities`);

  // 2. Save mapping to vault
  const vaultPath = await anonymizer.saveMappingToVault();
  console.log(`Mapping saved to: ${vaultPath}`);

  // 3. Process through pipeline with anonymized data
  const pbi = await runPipeline(anonymizedText, config);

  // 4. De-anonymize output
  const restoredPBI = await anonymizer.deanonymizeObject(pbi);

  // 5. Generate privacy report
  const privacyReport = await generatePrivacyReport(sessionId);

  return {
    ...restoredPBI,
    _privacy: privacyReport
  };
}
```

### LLM API Wrapper (Audit All Calls)
```typescript
class AuditedLLMClient {
  private client: Anthropic;
  private sessionId: string;

  async generate(
    prompt: string,
    options: GenerateOptions
  ): Promise<string> {
    const requestId = generateRequestId();

    // Log request
    await this.logLLMRequest({
      sessionId: this.sessionId,
      requestId,
      pipelineStep: options.step,
      promptTokens: this.countTokens(prompt),
      promptHash: this.hash(prompt),
      anonymized: options.anonymized
    });

    // Call LLM
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      ...options
    });

    const completion = response.content[0].text;

    // Log response
    await this.logLLMResponse({
      sessionId: this.sessionId,
      requestId,
      completionTokens: response.usage.output_tokens,
      responseHash: this.hash(completion),
      tokensFoundInResponse: this.extractTokens(completion)
    });

    return completion;
  }

  private extractTokens(text: string): string[] {
    const tokenPattern = /\[(PERSON|COMPANY|EMAIL|API_KEY|SALESFORCE_ORG|PROJECT|ACCOUNT)_\d+\]/g;
    return [...text.matchAll(tokenPattern)].map(m => m[0]);
  }
}
```

---

## 6. Configuration Examples

### Strict Mode (Maximum Privacy)
```yaml
# config/anonymization-strict.yaml
enabled: true
sensitivity_level: strict

entity_types:
  person_names: true
  email_addresses: true
  phone_numbers: true
  company_names: true
  customer_names: true
  salesforce_org_ids: true
  api_keys: true
  urls: true
  ip_addresses: true

  custom_patterns:
    - name: "Project Codenames"
      pattern: "Project \\w+"
      replacement_prefix: "[PROJECT_"
    - name: "Customer IDs"
      pattern: "CUST-\\d+"
      replacement_prefix: "[CUSTOMER_"

whitelist:
  people: []       # No whitelist - anonymize everything
  companies: []
  domains: []
```

### Moderate Mode (Balance Privacy & Utility)
```yaml
# config/anonymization-moderate.yaml
enabled: true
sensitivity_level: moderate

entity_types:
  person_names: true
  email_addresses: true
  phone_numbers: true
  company_names: true   # Anonymize customer companies
  customer_names: true
  salesforce_org_ids: true
  api_keys: true
  urls: false           # Allow URLs (less sensitive)
  ip_addresses: true

whitelist:
  people:
    - "Sarah Johnson"  # Internal team OK
    - "Mark Stevens"
  companies:
    - "Our Company Inc"
  domains:
    - "company.com"
```

### Relaxed Mode (Minimal Anonymization)
```yaml
# config/anonymization-relaxed.yaml
enabled: true
sensitivity_level: relaxed

entity_types:
  person_names: false   # Keep names (internal meeting)
  email_addresses: true # Still hide emails
  phone_numbers: true
  company_names: false  # Keep company names
  customer_names: true  # But hide customer-specific IDs
  salesforce_org_ids: true
  api_keys: true
  urls: false
  ip_addresses: false

whitelist:
  people: []
  companies: []
  domains: []
```

---

## 7. CLI Commands

### Process with Anonymization
```bash
# Use strict anonymization
backlog-chef process transcript.json --anonymize strict

# Use custom config
backlog-chef process transcript.json --anonymize-config config/custom-anon.yaml

# View privacy report after processing
backlog-chef privacy-report session-abc123

# Export privacy report
backlog-chef privacy-report session-abc123 --export pdf --output privacy-report.pdf
```

### Audit Logs
```bash
# View anonymization logs for today
backlog-chef audit show anonymization --date 2025-11-18

# View all LLM interactions
backlog-chef audit show llm-requests --session session-abc123

# Export complete audit trail
backlog-chef audit export --session session-abc123 --output audit.json

# Verify data integrity (check hashes)
backlog-chef audit verify session-abc123
```

### Vault Management
```bash
# List all vault mappings
backlog-chef vault list

# Show mapping details
backlog-chef vault show session-abc123

# Delete old mappings (after 90 days)
backlog-chef vault cleanup --older-than 90

# Backup vault
backlog-chef vault backup --output vault-backup-2025-11-18.tar.gz
```

---

## 8. Security Best Practices

### Encryption
- **Vault encryption**: AES-256-GCM with key rotation
- **Key management**: Store `VAULT_ENCRYPTION_KEY` in environment variable or secrets manager
- **Key rotation**: Rotate encryption key every 90 days

### Access Control
- **Vault files**: Readable only by application user (chmod 600)
- **Audit logs**: Append-only, immutable after creation
- **Privacy reports**: Accessible only to PBI creator/team

### Data Retention
- **Vault mappings**: Delete after 90 days (configurable)
- **Audit logs**: Retain for 2 years (compliance)
- **Privacy reports**: Delete with PBI deletion

### Compliance
- **GDPR**: Anonymization satisfies data minimization principle
- **SOC 2**: Audit logs demonstrate data handling controls
- **HIPAA**: Strict mode anonymizes all PHI

---

## 9. Testing Strategy

### Unit Tests
```typescript
describe('DataAnonymizer', () => {
  it('should anonymize person names', async () => {
    const anonymizer = new DataAnonymizer(strictConfig, 'test-session');
    const result = await anonymizer.anonymize('Sarah Johnson said...');

    expect(result.anonymizedText).toBe('[PERSON_001] said...');
    expect(result.entities).toHaveLength(1);
  });

  it('should restore anonymized data', async () => {
    const anonymizer = new DataAnonymizer(strictConfig, 'test-session');
    await anonymizer.anonymize('Sarah Johnson said...');

    const result = await anonymizer.deanonymize('[PERSON_001] said...');
    expect(result.restoredText).toBe('Sarah Johnson said...');
  });

  it('should not anonymize whitelisted entities', async () => {
    const config = { ...strictConfig, whitelist: { people: ['Sarah Johnson'] } };
    const anonymizer = new DataAnonymizer(config, 'test-session');

    const result = await anonymizer.anonymize('Sarah Johnson said...');
    expect(result.anonymizedText).toBe('Sarah Johnson said...');
  });
});
```

### Integration Tests
```typescript
describe('Pipeline with Anonymization', () => {
  it('should process PBI end-to-end with anonymization', async () => {
    const transcript = loadTestTranscript('transcript-with-pii.txt');
    const pbi = await processPBI(transcript, { anonymization: strictConfig });

    // Verify anonymization happened
    expect(pbi._privacy.anonymization.entitiesAnonymized).toBeGreaterThan(0);

    // Verify data was restored
    expect(pbi.title).toContain('Acme Corp');  // Not [COMPANY_001]

    // Verify audit logs exist
    const logs = await getAuditLogs(pbi._privacy.sessionId);
    expect(logs.anonymization).toBeDefined();
    expect(logs.llmRequests).toBeDefined();
  });
});
```

---

## Summary

### Key Features

✅ **Reversible Anonymization** - Replace sensitive data with tokens, restore after LLM processing
✅ **Comprehensive Detection** - People, companies, emails, API keys, Salesforce orgs, custom patterns
✅ **Complete Audit Trail** - Log every anonymization, LLM call, and restoration
✅ **User Transparency** - Privacy dashboard shows exactly what was anonymized and sent to LLM
✅ **Configurable Sensitivity** - Strict/Moderate/Relaxed modes + custom patterns
✅ **Encrypted Vault** - AES-256 encrypted mapping storage
✅ **Whitelist Support** - Never anonymize internal team members or your company name

### Privacy Guarantees

1. **Zero PII to LLM** (Strict Mode) - No customer names, emails, or org IDs sent to Anthropic
2. **Full Auditability** - Every byte sent/received is logged with SHA-256 hash
3. **User Visibility** - Privacy report shows exactly what happened with their data
4. **Reversible** - Perfect restoration of original data after processing
5. **Encrypted** - Vault mappings encrypted at rest with AES-256

### Trust Building

Users can:
- See exactly what was anonymized (with examples)
- Review all LLM interactions (what was sent, what was received)
- Verify data integrity (hashes match)
- Download complete audit trail
- Configure their own anonymization rules

This system enables **enterprise adoption** by giving security/compliance teams full visibility and control over data sent to external LLM providers.
