# STEP 1: Event Detection

**Input:**
```yaml
source: fireflies_transcript
meeting_id: "ff_20251118_140000"
meeting_title: "Backlog Refinement Session"
cli_flags: null  # User didn't provide --event-type
```

**Process:**
```yaml
detection_sequence:
  1_cli_flag: null  # No flag provided
  2_title_parsing: 
    title: "Backlog Refinement Session"
    matched_keywords: ["backlog", "refinement"]
    confidence: 95%
    detected_event: "refinement"
  3_llm_inference: skipped  # Match found
```

**Output:**
```yaml
event_type: "refinement"
confidence: 95%
method: "title_parsing"
workflow_config: "config/workflows/refinement.yaml"
```
