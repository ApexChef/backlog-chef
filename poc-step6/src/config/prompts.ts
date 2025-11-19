/**
 * AI Prompt Templates for Question Generation and Proposal Creation
 */

export const PROMPTS = {
  QUESTION_IDENTIFICATION: `You are an expert Scrum Product Owner and Business Analyst analyzing a Product Backlog Item (PBI) for unanswered questions and missing information.

Given the following risk-analyzed PBI, identify ALL unanswered questions that need to be addressed before or during implementation.

PBI Information:
{pbiContext}

Focus on identifying questions in these areas:
1. Missing business requirements or unclear acceptance criteria
2. Technical implementation details not specified
3. Security, compliance, or GDPR considerations
4. User experience and interface specifications
5. Data requirements and performance constraints
6. Integration points and dependencies
7. Testing requirements and edge cases
8. Budget, licensing, or resource constraints

For each question you identify:
- Write a clear, specific question
- Assign a category (Business, Technical, Security, UX, Data, Performance, Testing, Legal, Budget, Integration, etc.)
- Determine priority (CRITICAL: blocks start, HIGH: needed for sprint, MEDIUM: affects quality, LOW: nice to have)
- Explain why this question matters

Output your analysis as a JSON array of questions with this structure:
{
  "questions": [
    {
      "question": "The specific question that needs answering",
      "category": "Primary category (can use slash for dual categories like Business/Security)",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "rationale": "Why this question is important",
      "impact_if_unanswered": "What happens if we don't get an answer"
    }
  ]
}

Be thorough but practical. Focus on questions that genuinely impact implementation or quality.`,

  PROPOSAL_GENERATION: `You are an expert solution architect and consultant providing proposed answers to questions about a Product Backlog Item.

Question Information:
{questionContext}

PBI Context:
{pbiContext}

Generate a comprehensive proposed answer for this question including:

1. A suggested solution or answer with specific recommendations
2. Your confidence level (LOW: speculative, MEDIUM: based on patterns/experience, HIGH: based on clear evidence)
3. Clear rationale for your suggestion
4. Alternative approaches (if applicable)
5. Any legal or compliance considerations (if relevant)
6. Performance recommendations (if relevant)
7. Technical implementation notes (if relevant)
8. Potential risks of this approach

Output your proposal as JSON:
{
  "confidence": "LOW|MEDIUM|HIGH",
  "suggestion": "Your detailed proposed answer or solution",
  "rationale": "Why this is the recommended approach",
  "alternatives": ["Alternative approach 1", "Alternative approach 2"],
  "legal_considerations": ["Any legal or compliance notes"],
  "performance_recommendations": ["Performance considerations"],
  "technical_implementation": ["Technical notes or code patterns"],
  "risk": "Main risk or caveat of this approach"
}

Be specific and actionable in your suggestions. Reference industry best practices and common patterns where applicable.`,

  DOCUMENTATION_SEARCH: `You are simulating a documentation search system for a software development organization.

Search Query:
{searchQuery}

Question Context:
{questionContext}

Simulate finding relevant documentation that might help answer this question. Consider:
- Technical documentation (Confluence, SharePoint)
- API documentation
- Architecture decision records
- Policy documents
- Style guides
- Previous project learnings
- Meeting notes

Generate 0-3 relevant documentation sources that would realistically exist in an enterprise environment.

Output as JSON:
{
  "found": true/false,
  "sources": [
    {
      "title": "Document title",
      "excerpt": "Relevant excerpt from the document",
      "link": "https://example.com/path/to/doc",
      "relevance": 0-100,
      "note": "Any additional context"
    }
  ],
  "note": "Explanation if no docs found or search limitations"
}

Make the documentation sources realistic and relevant to the specific question. Use plausible enterprise URLs (Confluence, SharePoint, internal wikis).`,

  QUESTION_ENHANCEMENT: `You are reviewing a generated question to ensure it's clear, specific, and actionable.

Original Question:
{originalQuestion}

Context:
{context}

Enhance this question to be:
1. More specific and unambiguous
2. Actionable (clear what answer is needed)
3. Properly scoped (not too broad or narrow)
4. Business-value focused

Return the enhanced question as a single string.`
};

// Helper function to format PBI context for prompts
export function formatPBIContext(pbi: any): string {
  return `
PBI ID: ${pbi.id}
Title: ${pbi.title}
Complexity Score: ${pbi.complexity_score}

Risks Identified:
- Critical: ${pbi.risks.CRITICAL.length} risks
- High: ${pbi.risks.HIGH.length} risks
- Medium: ${pbi.risks.MEDIUM.length} risks
- Low: ${pbi.risks.LOW.length} risks

Key Risk Details:
${pbi.risks.CRITICAL.map((r: any) => `CRITICAL: ${r.description} - ${r.detail}`).join('\n')}
${pbi.risks.HIGH.map((r: any) => `HIGH: ${r.description} - ${r.detail}`).join('\n')}

Conflicts:
${pbi.conflicts.map((c: any) => `- ${c.description}: ${c.detail}`).join('\n')}

${pbi.recommended_split ? `Split Recommendation: ${pbi.split_suggestion}` : ''}
`;
}

// Helper function to format question context
export function formatQuestionContext(question: any): string {
  return `
Question: ${question.question}
Category: ${question.category}
Priority: ${question.priority}
Rationale: ${question.rationale || 'N/A'}
Impact: ${question.impact_if_unanswered || 'N/A'}
`;
}