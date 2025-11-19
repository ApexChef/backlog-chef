/**
 * Represents a Product Backlog Item candidate extracted from a meeting transcript
 */
export interface PBICandidate {
  /** Unique identifier for the PBI (format: PBI-XXX) */
  id: string;

  /** Concise, user-facing title */
  title: string;

  /** Description of what problem it solves */
  description: string;

  /** Specific, testable conditions for completion */
  acceptance_criteria: string[];

  /** Technical constraints and implementation notes */
  technical_notes: string[];

  /** Scope boundaries */
  scope: {
    /** What is included in this PBI */
    in_scope: string[];
    /** What is explicitly excluded from this PBI */
    out_of_scope: string[];
  };

  /** External dependencies that must be resolved */
  dependencies: string[];

  /** List of people who mentioned or discussed this item */
  mentioned_by: string[];

  /** Optional: Implementation phase (e.g., "phase_2") */
  phase?: string;

  /** Optional: Current status (e.g., "deferred") */
  status?: string;

  /** Optional: Type of story (e.g., "enabling_story") */
  type?: string;

  /** Optional: For status-related PBIs, list current status values */
  current_statuses?: string[];
}

/**
 * Container for extracted PBI candidates
 */
export interface ExtractionResult {
  /** List of extracted PBI candidates */
  candidates: PBICandidate[];

  /** Metadata about the extraction process */
  metadata?: {
    /** Timestamp of extraction */
    extracted_at: string;
    /** Source transcript file */
    source_file?: string;
    /** Number of candidates extracted */
    total_candidates: number;
  };
}