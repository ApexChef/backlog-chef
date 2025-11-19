# Step 6: Technical Flow Diagram

## High-Level Overview

```mermaid
graph TB
    Start([Start Step 6]) --> LoadInput[Load Risk Analysis<br/>from Step 5]
    LoadInput --> LoadRegistry[Load Stakeholder<br/>Registry YAML]
    LoadRegistry --> ProcessLoop{For Each PBI}

    ProcessLoop -->|PBI| GenQ[Generate Questions]
    GenQ --> RouteS[Route to Stakeholders]
    RouteS --> GenP[Generate Proposals]
    GenP --> SearchDocs[Search Documentation]
    SearchDocs --> AddPBI[Add to Results]

    AddPBI --> ProcessLoop
    ProcessLoop -->|Done| GenerateOutput[Generate Output JSON]
    GenerateOutput --> SaveOutput[Save to File]
    SaveOutput --> CostSummary[Display Cost Summary]
    CostSummary --> SaveCost[Save Cost to CSV]
    SaveCost --> End([End])

    style Start fill:#90EE90
    style End fill:#FFB6C1
    style GenQ fill:#87CEEB
    style RouteS fill:#87CEEB
    style GenP fill:#87CEEB
    style SearchDocs fill:#87CEEB
```

## Detailed Component Flow

```mermaid
graph TB
    subgraph "Main Orchestrator"
        Init[Initialize Services] --> Validate[Validate Config]
        Validate --> TestAPI[Test Claude API<br/>Connection]
        TestAPI --> LoadRA[Load Risk Analysis<br/>JSON from Step 5]
    end

    subgraph "Per-PBI Processing Loop"
        LoadRA --> QGen[Question Generator]

        QGen -->|Claude API| IdentifyQ[Identify Unanswered<br/>Questions via AI]
        IdentifyQ --> EnhanceQ[Enhance & Validate<br/>Questions]
        EnhanceQ --> AdjustP[Adjust Priority<br/>Based on Risks]

        AdjustP --> SRouter[Stakeholder Router]
        SRouter --> MapDomain[Map Question Category<br/>to Stakeholder Role]
        MapDomain --> AssignStake[Assign Stakeholders<br/>from Registry]

        AssignStake --> PGen[Proposal Generator]
        PGen -->|Claude API| GenAnswer[Generate Proposed<br/>Answer]
        GenAnswer --> AddAlternatives[Add Alternatives &<br/>Considerations]

        AddAlternatives --> DocSearch[Documentation Search]
        DocSearch -->|Claude API| SimSearch[Simulate Doc Search<br/>via AI]
        SimSearch --> AddSources[Add Supporting<br/>Sources]

        AddSources --> Combine[Combine into<br/>Final Question Object]
    end

    subgraph "Output Generation"
        Combine --> Aggregate[Aggregate All PBIs]
        Aggregate --> CalcMeta[Calculate Metadata<br/>& Statistics]
        CalcMeta --> AddCost[Add Cost Tracking<br/>Data]
        AddCost --> FormatJSON[Format Output JSON]
    end

    subgraph "Finalization"
        FormatJSON --> SaveFile[Save to<br/>questions-proposals.json]
        SaveFile --> LogCost[Log Cost Summary<br/>to Console & Logs]
        LogCost --> SaveCSV[Save Cost to<br/>cost-history.csv]
    end

    style Init fill:#FFE4B5
    style QGen fill:#B0E0E6
    style SRouter fill:#DDA0DD
    style PGen fill:#F0E68C
    style DocSearch fill:#98FB98
    style SaveFile fill:#FFB6C1
```

## Service-Level Architecture

```mermaid
graph LR
    subgraph "Orchestrator (index.ts)"
        Main[Main Execute Loop]
    end

    subgraph "Core Services"
        ClaudeAPI[Claude API Client<br/>+ Cost Tracker]
        QuestGen[Question Generator]
        StakeRoute[Stakeholder Router]
        PropGen[Proposal Generator]
        DocSrch[Documentation Search]
    end

    subgraph "Utilities"
        Logger[Winston Logger<br/>logs/poc-step6.log]
        Validator[Input Validators]
        CostTrack[Cost Tracker<br/>+ CSV Writer]
    end

    subgraph "External Resources"
        Step5[Step 5 Output<br/>risk-analysis.json]
        Registry[Stakeholder Registry<br/>stakeholders.yaml]
        ClaudeAI[Claude 3.5 Haiku<br/>Anthropic API]
    end

    subgraph "Outputs"
        OutJSON[questions-proposals.json]
        LogFile[logs/poc-step6.log]
        ErrorLog[logs/poc-step6-error.log]
        CostCSV[output/costs/<br/>cost-history.csv]
    end

    Main --> ClaudeAPI
    Main --> QuestGen
    Main --> StakeRoute
    Main --> PropGen
    Main --> DocSrch

    QuestGen --> ClaudeAPI
    PropGen --> ClaudeAPI
    DocSrch --> ClaudeAPI

    ClaudeAPI --> ClaudeAI
    ClaudeAPI --> CostTrack

    StakeRoute --> Registry
    Main --> Step5

    Main --> OutJSON
    Logger --> LogFile
    Logger --> ErrorLog
    CostTrack --> CostCSV

    style Main fill:#FFE4B5
    style ClaudeAPI fill:#87CEEB
    style ClaudeAI fill:#FF6B6B
    style OutJSON fill:#90EE90
```

## Question Generation Deep Dive

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant QG as Question Generator
    participant CA as Claude API Client
    participant AI as Claude AI
    participant CT as Cost Tracker

    O->>QG: generateQuestions(pbi)
    QG->>QG: Build context from<br/>PBI, risks, conflicts
    QG->>CA: sendJSONRequest(prompt)
    CA->>AI: POST /messages
    AI-->>CA: Response with questions JSON
    CA->>CT: trackUsage(tokens)
    CT-->>CT: Update totals
    CA-->>QG: Parsed questions array

    loop For each question
        QG->>QG: Validate category
        QG->>QG: Validate priority
        QG->>QG: Adjust priority based on<br/>risk alignment
    end

    QG->>QG: Convert to Question objects
    QG-->>O: Return questions[]

    Note over QG,AI: Typical response:<br/>5-10 questions per PBI
```

## Stakeholder Routing Flow

```mermaid
graph TB
    Start[Question with Category] --> LoadReg{Registry<br/>Loaded?}
    LoadReg -->|No| ParseYAML[Parse stakeholders.yaml]
    ParseYAML --> CacheReg[Cache Registry]
    LoadReg -->|Yes| MapCat[Map Category to Domain]
    CacheReg --> MapCat

    MapCat --> FindRole[Find Role(s)<br/>for Domain]
    FindRole --> GetDefault[Get Default Assignee<br/>for Role]
    GetDefault --> AddStake[Add Stakeholder(s)<br/>to Question]

    AddStake --> CheckPriority{Priority =<br/>CRITICAL?}
    CheckPriority -->|Yes| AddEscalation[Add Escalation<br/>Stakeholders]
    CheckPriority -->|No| Done[Return Question<br/>with Stakeholders]
    AddEscalation --> Done

    style Start fill:#FFE4B5
    style Done fill:#90EE90
    style AddStake fill:#87CEEB
```

## Proposal Generation Flow

```mermaid
graph TB
    Start[Question Object] --> BuildPrompt[Build Proposal Prompt<br/>with Context]
    BuildPrompt --> CallClaude[Call Claude API]

    CallClaude --> Parse{JSON Parse<br/>Success?}
    Parse -->|Strategy 1| DirectParse[JSON.parse]
    DirectParse -->|Fail| ExtractBounds
    Parse -->|Strategy 2| ExtractBounds[Extract JSON Bounds<br/>& Parse]
    ExtractBounds -->|Fail| CleanChars
    Parse -->|Strategy 3| CleanChars[Clean Control Chars<br/>& Parse]
    CleanChars -->|Fail| Error[Throw Error]

    DirectParse -->|Success| BuildProposal
    ExtractBounds -->|Success| BuildProposal
    CleanChars -->|Success| BuildProposal

    BuildProposal[Build Proposal Object] --> AddFields[Add:<br/>- confidence<br/>- suggestion<br/>- rationale<br/>- alternatives]

    AddFields --> CheckCategory{Category?}
    CheckCategory -->|Security/Legal| AddLegal[Add Legal<br/>Considerations]
    CheckCategory -->|Technical/Performance| AddPerf[Add Performance<br/>Recommendations]
    CheckCategory -->|Business| AddRisk[Add Risk<br/>Assessment]

    AddLegal --> Return[Return Proposal]
    AddPerf --> Return
    AddRisk --> Return
    CheckCategory -->|Other| Return

    style Start fill:#FFE4B5
    style Return fill:#90EE90
    style Error fill:#FF6B6B
```

## Documentation Search Flow

```mermaid
graph TB
    Start[Question + Context] --> BuildQuery[Build Search Query<br/>from Question]
    BuildQuery --> CallClaude[Call Claude API to<br/>Simulate Doc Search]

    CallClaude --> ParseResp[Parse Response]
    ParseResp --> CheckFound{Docs<br/>Found?}

    CheckFound -->|Yes| BuildSources[Build Sources Array]
    BuildSources --> AddRelevance[Add Relevance Scores<br/>95%, 85%, etc.]
    AddRelevance --> AddExcerpts[Add Doc Excerpts<br/>& Links]

    CheckFound -->|No| AddNote[Add Note:<br/>'No documentation found']

    AddExcerpts --> Return[Return DocumentationSearch]
    AddNote --> Return

    style Start fill:#FFE4B5
    style Return fill:#90EE90
```

## Cost Tracking Flow

```mermaid
graph TB
    Start[Claude API Response] --> Extract[Extract Token Usage<br/>from Response]
    Extract --> Track[costTracker.trackUsage]
    Track --> Update[Update Running Totals:<br/>- input_tokens<br/>- output_tokens<br/>- api_calls]

    Update --> Continue[Continue Processing]

    Continue --> EndRun{Run<br/>Complete?}
    EndRun -->|No| MoreCalls[More API Calls]
    MoreCalls --> Extract

    EndRun -->|Yes| Calculate[Calculate Cost Breakdown]
    Calculate --> GetPricing[Get Model Pricing:<br/>Haiku: $0.80/$4.00<br/>Sonnet: $3.00/$15.00]
    GetPricing --> Multiply[Multiply Tokens × Price]

    Multiply --> Display[Display in Console]
    Display --> LogFile[Log to<br/>logs/poc-step6.log]
    LogFile --> SaveCSV[Append to<br/>cost-history.csv]
    SaveCSV --> AddMeta[Add to Output<br/>Metadata]

    style Start fill:#FFE4B5
    style AddMeta fill:#90EE90
    style Display fill:#87CEEB
```

## Data Flow: Input to Output

```mermaid
graph LR
    subgraph "Input"
        I1[risk-analysis.json<br/>from Step 5]
        I2[stakeholders.yaml<br/>registry]
    end

    subgraph "Processing"
        P1[3 PBIs]
        P2[Question Generation<br/>~8 questions/PBI]
        P3[Stakeholder Routing<br/>~9 unique roles]
        P4[Proposal Generation<br/>~24 API calls]
        P5[Doc Search<br/>~24 API calls]
    end

    subgraph "Output"
        O1[questions-proposals.json<br/>~24 questions total]
        O2[cost-history.csv<br/>$0.08 estimated]
        O3[logs/poc-step6.log<br/>detailed execution log]
    end

    I1 --> P1
    I2 --> P3
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> O1
    P5 --> O2
    P5 --> O3

    style I1 fill:#FFE4B5
    style O1 fill:#90EE90
    style O2 fill:#90EE90
    style O3 fill:#90EE90
```

## Error Handling & Fallback Strategy

```mermaid
graph TB
    Start[API Call or Processing] --> Try{Try<br/>Operation}

    Try -->|Success| Continue[Continue Processing]
    Try -->|Error| CheckType{Error<br/>Type?}

    CheckType -->|Auth Error 401| Fatal[Log Error<br/>Exit Process]
    CheckType -->|Rate Limit 429| Retry[Exponential Backoff<br/>Retry]
    CheckType -->|Server Error 5xx| Retry
    CheckType -->|Network Error| Retry

    Retry --> CheckAttempts{Attempts <<br/>Max Retries?}
    CheckAttempts -->|Yes| Try
    CheckAttempts -->|No| Fallback{Fallback<br/>Available?}

    Fallback -->|Questions| GenFromRisks[Generate from<br/>Risk Data]
    Fallback -->|Proposals| BasicProposal[Generate Basic<br/>Proposal]
    Fallback -->|Docs| NoDocsFound[Return 'Not Found']
    Fallback -->|None| Fatal

    GenFromRisks --> Continue
    BasicProposal --> Continue
    NoDocsFound --> Continue

    Continue --> Next[Next Step]

    style Start fill:#FFE4B5
    style Continue fill:#90EE90
    style Fatal fill:#FF6B6B
    style Retry fill:#FFD700
```

## Summary Statistics

**Typical Run Metrics:**
- Input: 3 PBIs from Step 5
- Questions Generated: ~24 total (8 per PBI)
- API Calls: ~48 total (questions + proposals + doc searches)
- Stakeholders Identified: ~9 unique roles
- Processing Time: ~2-3 minutes
- Token Usage: ~50-60K total tokens
- Estimated Cost: $0.08-0.10 USD (using Haiku model)

**Output Files:**
1. `output/questions-proposals.json` (~80KB)
2. `output/costs/cost-history.csv` (1 row per run)
3. `logs/poc-step6.log` (all logs)
4. `logs/poc-step6-error.log` (errors only)
