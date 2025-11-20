/**
 * HTML Formatter
 *
 * Generates beautiful, interactive HTML preview of pipeline output
 * with expandable sections, color-coded status, and responsive design
 */

import fs from 'fs';
import path from 'path';
import { PipelineOutput } from '../types/pipeline-types';

export class HTMLFormatter {
  private outputDir: string;
  private runId: string;

  constructor(outputDir: string, runId: string) {
    this.outputDir = outputDir;
    this.runId = runId;
  }

  /**
   * Generate HTML preview file
   */
  generate(output: PipelineOutput): string {
    const html = this.buildHTML(output);
    const fileName = `preview-${this.runId}.html`;
    const filePath = path.join(this.outputDir, fileName);

    fs.writeFileSync(filePath, html, 'utf-8');

    return filePath;
  }

  /**
   * Build complete HTML document
   */
  private buildHTML(output: PipelineOutput): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backlog Chef - Pipeline Output</title>
    ${this.getStyles()}
</head>
<body>
    <div class="container">
        ${this.buildHeader(output)}
        ${this.buildSummary(output)}
        ${this.buildPBIList(output)}
    </div>
    ${this.getScripts()}
</body>
</html>`;
  }

  /**
   * Build header section
   */
  private buildHeader(output: PipelineOutput): string {
    return `
    <header class="header">
        <div class="header-content">
            <h1>🍴 Backlog Chef</h1>
            <p class="subtitle">AI-Powered Product Backlog Intelligence</p>
        </div>
        <div class="header-meta">
            <span class="badge badge-${output.event_type}">${output.event_type.toUpperCase()}</span>
            <span class="meta-item">📅 ${new Date(output.metadata.processed_at).toLocaleString()}</span>
            <span class="meta-item">💰 $${output.metadata.total_cost_usd.toFixed(4)}</span>
            <span class="meta-item">⏱️ ${(output.metadata.total_duration_ms / 1000).toFixed(1)}s</span>
        </div>
    </header>`;
  }

  /**
   * Build summary statistics
   */
  private buildSummary(output: PipelineOutput): string {
    return `
    <section class="summary">
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-value">${output.metadata.total_pbis}</div>
                <div class="summary-label">Total PBIs</div>
            </div>
            <div class="summary-card summary-ready">
                <div class="summary-value">${output.metadata.ready_count}</div>
                <div class="summary-label">✅ Ready for Sprint</div>
            </div>
            <div class="summary-card summary-refinement">
                <div class="summary-value">${output.metadata.needs_refinement_count}</div>
                <div class="summary-label">⚠️ Needs Refinement</div>
            </div>
            <div class="summary-card summary-not-ready">
                <div class="summary-value">${output.metadata.not_ready_count}</div>
                <div class="summary-label">🔴 Not Ready</div>
            </div>
        </div>
    </section>`;
  }

  /**
   * Build PBI list with expandable cards
   */
  private buildPBIList(output: PipelineOutput): string {
    const pbiCards = output.pbis.map((pbi, index) => this.buildPBICard(pbi, index)).join('\n');

    return `
    <section class="pbi-list">
        <h2>Product Backlog Items</h2>
        ${pbiCards}
    </section>`;
  }

  /**
   * Build individual PBI card
   */
  private buildPBICard(pbi: any, index: number): string {
    const statusClass = this.getStatusClass(pbi.readiness.readiness_status);
    const riskClass = this.getRiskClass(pbi.risks.overall_risk_level);

    return `
    <div class="pbi-card">
        <div class="pbi-header" onclick="togglePBI(${index})">
            <div class="pbi-title-row">
                <span class="pbi-id">${pbi.pbi.id}</span>
                <h3 class="pbi-title">${this.escapeHtml(pbi.pbi.title)}</h3>
                <span class="expand-icon" id="icon-${index}">▼</span>
            </div>
            <div class="pbi-badges">
                <span class="badge ${statusClass}">${this.getStatusEmoji(pbi.readiness.readiness_status)} ${this.getReadinessText(pbi.readiness.readiness_status)}</span>
                <span class="badge ${riskClass}">⚠️ ${pbi.risks.overall_risk_level.toUpperCase()} RISK</span>
                <span class="badge badge-score">📊 ${pbi.scores.overall_score}/100</span>
            </div>
        </div>

        <div class="pbi-content" id="content-${index}">
            ${this.buildPBIDetails(pbi)}
        </div>
    </div>`;
  }

  /**
   * Build PBI details section
   */
  private buildPBIDetails(pbi: any): string {
    return `
            <div class="pbi-section">
                <h4>📋 Description</h4>
                <p>${this.escapeHtml(pbi.pbi.description)}</p>
            </div>

            ${this.buildAcceptanceCriteria(pbi.pbi.acceptance_criteria)}
            ${this.buildQualityScores(pbi.scores)}
            ${this.buildContext(pbi.context)}
            ${this.buildRisks(pbi.risks)}
            ${this.buildQuestions(pbi.questions)}
            ${this.buildReadiness(pbi.readiness)}
            ${this.buildNotes(pbi.pbi.notes, pbi.pbi.mentioned_by)}
    `;
  }

  /**
   * Build acceptance criteria section
   */
  private buildAcceptanceCriteria(criteria: string[]): string {
    if (!criteria || criteria.length === 0) return '';

    const items = criteria.map(c => `<li>${this.escapeHtml(c)}</li>`).join('');

    return `
            <div class="pbi-section">
                <h4>✅ Acceptance Criteria</h4>
                <ul class="criteria-list">${items}</ul>
            </div>`;
  }

  /**
   * Build quality scores section
   */
  private buildQualityScores(scores: any): string {
    return `
            <div class="pbi-section">
                <h4>📊 Quality Scores</h4>
                <div class="scores-grid">
                    ${this.buildScoreBar('Overall', scores.overall_score)}
                    ${this.buildScoreBar('Completeness', scores.completeness)}
                    ${this.buildScoreBar('Clarity', scores.clarity)}
                    ${this.buildScoreBar('Actionability', scores.actionability)}
                    ${this.buildScoreBar('Testability', scores.testability)}
                </div>
                ${this.buildScoreLists(scores)}
            </div>`;
  }

  /**
   * Build score bar
   */
  private buildScoreBar(label: string, score: number): string {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    return `
                    <div class="score-item">
                        <div class="score-label">${label}</div>
                        <div class="score-bar-container">
                            <div class="score-bar" style="width: ${score}%; background-color: ${color};"></div>
                        </div>
                        <div class="score-value">${score}</div>
                    </div>`;
  }

  /**
   * Build score strengths/concerns/missing
   */
  private buildScoreLists(scores: any): string {
    let html = '';

    if (scores.strengths && scores.strengths.length > 0) {
      html += `<div class="score-list"><strong>💪 Strengths:</strong><ul>`;
      scores.strengths.forEach((s: string) => {
        html += `<li>${this.escapeHtml(s)}</li>`;
      });
      html += `</ul></div>`;
    }

    if (scores.concerns && scores.concerns.length > 0) {
      html += `<div class="score-list"><strong>⚠️ Concerns:</strong><ul>`;
      scores.concerns.forEach((c: string) => {
        html += `<li>${this.escapeHtml(c)}</li>`;
      });
      html += `</ul></div>`;
    }

    if (scores.missing_elements && scores.missing_elements.length > 0) {
      html += `<div class="score-list"><strong>❌ Missing:</strong><ul>`;
      scores.missing_elements.forEach((m: string) => {
        html += `<li>${this.escapeHtml(m)}</li>`;
      });
      html += `</ul></div>`;
    }

    return html;
  }

  /**
   * Build context section
   */
  private buildContext(context: any): string {
    if (!context) return '';

    return `
            <div class="pbi-section">
                <h4>🔍 Historical Context</h4>
                ${this.buildSimilarWork(context.similar_work)}
                ${this.buildPastDecisions(context.past_decisions)}
                ${this.buildTechnicalDocs(context.technical_docs)}
            </div>`;
  }

  /**
   * Build similar work section
   */
  private buildSimilarWork(similarWork: any[]): string {
    if (!similarWork || similarWork.length === 0) return '';

    const items = similarWork
      .map(
        (work) => `
                <div class="context-item">
                    <strong>${work.ref}</strong>: ${this.escapeHtml(work.title)}
                    <span class="similarity">${work.similarity}% match</span>
                    ${work.learnings ? `<ul>${work.learnings.map((l: string) => `<li>${this.escapeHtml(l)}</li>`).join('')}</ul>` : ''}
                </div>`
      )
      .join('');

    return `<div class="context-group"><strong>Similar Work:</strong>${items}</div>`;
  }

  /**
   * Build past decisions section
   */
  private buildPastDecisions(decisions: any[]): string {
    if (!decisions || decisions.length === 0) return '';

    const items = decisions
      .map(
        (dec) => `
                <div class="context-item">
                    <strong>${dec.ref}</strong>: ${this.escapeHtml(dec.title)}
                    <p><em>${this.escapeHtml(dec.decision)}</em></p>
                    ${dec.assigned_architect ? `<small>Architect: ${dec.assigned_architect}</small>` : ''}
                </div>`
      )
      .join('');

    return `<div class="context-group"><strong>Past Decisions:</strong>${items}</div>`;
  }

  /**
   * Build technical docs section
   */
  private buildTechnicalDocs(docs: any[]): string {
    if (!docs || docs.length === 0) return '';

    const items = docs
      .map(
        (doc) => `
                <div class="context-item">
                    <strong>${doc.ref}</strong>: ${this.escapeHtml(doc.title)}
                    ${doc.note ? `<p>${this.escapeHtml(doc.note)}</p>` : ''}
                </div>`
      )
      .join('');

    return `<div class="context-group"><strong>Technical Documentation:</strong>${items}</div>`;
  }

  /**
   * Build risks section
   */
  private buildRisks(risks: any): string {
    if (!risks || !risks.risks || risks.risks.length === 0) return '';

    const riskItems = risks.risks
      .map(
        (risk: any) => `
                <div class="risk-item risk-${risk.severity.toLowerCase()}">
                    <div class="risk-header">
                        <span class="risk-type">${this.escapeHtml(risk.type)}</span>
                        <span class="risk-severity">${risk.severity}</span>
                    </div>
                    <p>${this.escapeHtml(risk.description)}</p>
                    ${risk.mitigation ? `<div class="risk-mitigation"><strong>Mitigation:</strong> ${this.escapeHtml(risk.mitigation)}</div>` : ''}
                </div>`
      )
      .join('');

    return `
            <div class="pbi-section">
                <h4>⚠️ Risks (${risks.overall_risk_level.toUpperCase()})</h4>
                ${riskItems}
            </div>`;
  }

  /**
   * Build questions section
   */
  private buildQuestions(questions: any[]): string {
    if (!questions || questions.length === 0) return '';

    const questionItems = questions
      .map(
        (q: any) => `
                <div class="question-item">
                    <div class="question-header">
                        <span class="question-priority priority-${q.priority.toLowerCase()}">${q.priority}</span>
                        <span class="question-category">${q.category}</span>
                    </div>
                    <p class="question-text">${this.escapeHtml(q.question)}</p>
                    ${q.proposed_answer ? `
                    <div class="proposed-answer">
                        <strong>💡 Suggested Answer (${q.proposed_answer.confidence}):</strong>
                        <p>${this.escapeHtml(q.proposed_answer.suggestion)}</p>
                    </div>` : ''}
                </div>`
      )
      .join('');

    return `
            <div class="pbi-section">
                <h4>❓ Questions (${questions.length})</h4>
                ${questionItems}
            </div>`;
  }

  /**
   * Build readiness section
   */
  private buildReadiness(readiness: any): string {
    const statusClass = this.getStatusClass(readiness.readiness_status);

    return `
            <div class="pbi-section">
                <h4>🎯 Readiness Assessment</h4>
                <div class="readiness-card ${statusClass}">
                    <div class="readiness-status">${readiness.readiness_status}</div>
                    <div class="readiness-score">Score: ${readiness.readiness_score}/100</div>
                </div>
                ${this.buildReadinessLists(readiness)}
            </div>`;
  }

  /**
   * Build readiness lists
   */
  private buildReadinessLists(readiness: any): string {
    let html = '';

    if (readiness.blocking_issues && readiness.blocking_issues.length > 0) {
      html += `<div class="readiness-list readiness-blocking"><strong>🔴 Blocking Issues:</strong><ul>`;
      readiness.blocking_issues.forEach((issue: string) => {
        html += `<li>${this.escapeHtml(issue)}</li>`;
      });
      html += `</ul></div>`;
    }

    if (readiness.warnings && readiness.warnings.length > 0) {
      html += `<div class="readiness-list readiness-warning"><strong>⚠️ Warnings:</strong><ul>`;
      readiness.warnings.forEach((warning: string) => {
        html += `<li>${this.escapeHtml(warning)}</li>`;
      });
      html += `</ul></div>`;
    }

    if (readiness.recommendations && readiness.recommendations.length > 0) {
      html += `<div class="readiness-list readiness-recommendations"><strong>💡 Recommendations:</strong><ul>`;
      readiness.recommendations.forEach((rec: string) => {
        html += `<li>${this.escapeHtml(rec)}</li>`;
      });
      html += `</ul></div>`;
    }

    return html;
  }

  /**
   * Build notes section
   */
  private buildNotes(notes: string[], mentionedBy: string[]): string {
    if ((!notes || notes.length === 0) && (!mentionedBy || mentionedBy.length === 0)) return '';

    let html = '<div class="pbi-section"><h4>📝 Additional Notes</h4>';

    if (notes && notes.length > 0) {
      html += '<ul>';
      notes.forEach((note) => {
        html += `<li>${this.escapeHtml(note)}</li>`;
      });
      html += '</ul>';
    }

    if (mentionedBy && mentionedBy.length > 0) {
      html += `<p><strong>Mentioned by:</strong> ${mentionedBy.join(', ')}</p>`;
    }

    html += '</div>';
    return html;
  }

  /**
   * Helper: Get status class
   */
  private getStatusClass(status: string): string {
    if (status.includes('READY')) return 'status-ready';
    if (status.includes('NEEDS REFINEMENT')) return 'status-refinement';
    if (status.includes('NOT READY')) return 'status-not-ready';
    return '';
  }

  /**
   * Helper: Get risk class
   */
  private getRiskClass(risk: string): string {
    const r = risk.toLowerCase();
    if (r === 'high') return 'risk-high';
    if (r === 'medium') return 'risk-medium';
    if (r === 'low') return 'risk-low';
    return '';
  }

  /**
   * Helper: Get status emoji
   */
  private getStatusEmoji(status: string): string {
    if (status.includes('READY')) return '✅';
    if (status.includes('NEEDS REFINEMENT')) return '⚠️';
    if (status.includes('NOT READY')) return '🔴';
    return '❓';
  }

  /**
   * Helper: Get readiness text
   */
  private getReadinessText(status: string): string {
    if (status.includes('READY')) return 'Ready';
    if (status.includes('NEEDS REFINEMENT')) return 'Needs Refinement';
    if (status.includes('NOT READY')) return 'Not Ready';
    return 'Unknown';
  }

  /**
   * Helper: Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = { textContent: text };
    return (div as any).textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get CSS styles
   */
  private getStyles(): string {
    return `
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #1f2937;
            line-height: 1.6;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
        }

        .header-content h1 {
            font-size: 2.5rem;
            margin-bottom: 8px;
        }

        .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .header-meta {
            margin-top: 20px;
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }

        .meta-item {
            background: rgba(255, 255, 255, 0.2);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge-refinement {
            background: #dbeafe;
            color: #1e40af;
        }

        .summary {
            padding: 40px;
            background: #f9fafb;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .summary-card {
            background: white;
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .summary-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #1f2937;
        }

        .summary-label {
            font-size: 0.9rem;
            color: #6b7280;
            margin-top: 8px;
        }

        .summary-ready .summary-value {
            color: #10b981;
        }

        .summary-refinement .summary-value {
            color: #f59e0b;
        }

        .summary-not-ready .summary-value {
            color: #ef4444;
        }

        .pbi-list {
            padding: 40px;
        }

        .pbi-list h2 {
            font-size: 1.8rem;
            margin-bottom: 24px;
            color: #1f2937;
        }

        .pbi-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .pbi-card:hover {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .pbi-header {
            padding: 20px;
            cursor: pointer;
            background: #f9fafb;
            transition: background 0.2s;
        }

        .pbi-header:hover {
            background: #f3f4f6;
        }

        .pbi-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .pbi-id {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .pbi-title {
            flex: 1;
            font-size: 1.2rem;
            color: #1f2937;
        }

        .expand-icon {
            font-size: 1.2rem;
            transition: transform 0.3s;
        }

        .expand-icon.expanded {
            transform: rotate(180deg);
        }

        .pbi-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .status-ready {
            background: #d1fae5;
            color: #065f46;
        }

        .status-refinement {
            background: #fef3c7;
            color: #92400e;
        }

        .status-not-ready {
            background: #fee2e2;
            color: #991b1b;
        }

        .risk-high {
            background: #fee2e2;
            color: #991b1b;
        }

        .risk-medium {
            background: #fef3c7;
            color: #92400e;
        }

        .risk-low {
            background: #d1fae5;
            color: #065f46;
        }

        .badge-score {
            background: #dbeafe;
            color: #1e40af;
        }

        .pbi-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.5s ease;
        }

        .pbi-content.expanded {
            max-height: 10000px;
        }

        .pbi-section {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
        }

        .pbi-section h4 {
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: #374151;
        }

        .criteria-list {
            list-style: none;
            padding-left: 0;
        }

        .criteria-list li {
            padding: 8px 12px;
            margin-bottom: 6px;
            background: #f9fafb;
            border-left: 3px solid #10b981;
            border-radius: 4px;
        }

        .scores-grid {
            display: grid;
            gap: 12px;
            margin-bottom: 16px;
        }

        .score-item {
            display: grid;
            grid-template-columns: 120px 1fr 50px;
            align-items: center;
            gap: 12px;
        }

        .score-label {
            font-weight: 500;
            color: #4b5563;
        }

        .score-bar-container {
            background: #e5e7eb;
            height: 24px;
            border-radius: 12px;
            overflow: hidden;
        }

        .score-bar {
            height: 100%;
            transition: width 0.3s;
        }

        .score-value {
            text-align: right;
            font-weight: 600;
            color: #1f2937;
        }

        .score-list {
            margin-top: 12px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
        }

        .score-list ul {
            margin-top: 8px;
            margin-left: 20px;
        }

        .context-group {
            margin-bottom: 16px;
        }

        .context-item {
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
            margin-top: 8px;
        }

        .similarity {
            background: #667eea;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
            margin-left: 8px;
        }

        .risk-item {
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 4px solid;
        }

        .risk-item.risk-high {
            background: #fef2f2;
            border-color: #ef4444;
        }

        .risk-item.risk-medium {
            background: #fffbeb;
            border-color: #f59e0b;
        }

        .risk-item.risk-low {
            background: #f0fdf4;
            border-color: #10b981;
        }

        .risk-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .risk-type {
            font-weight: 600;
        }

        .risk-severity {
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .risk-mitigation {
            margin-top: 8px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 4px;
            font-size: 0.9rem;
        }

        .question-item {
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 12px;
        }

        .question-header {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .question-priority {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .priority-critical {
            background: #fee2e2;
            color: #991b1b;
        }

        .priority-high {
            background: #fed7aa;
            color: #92400e;
        }

        .priority-medium {
            background: #fef3c7;
            color: #78350f;
        }

        .priority-low {
            background: #dbeafe;
            color: #1e40af;
        }

        .question-category {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
            background: #e5e7eb;
            color: #374151;
        }

        .question-text {
            font-weight: 500;
            margin: 8px 0;
        }

        .proposed-answer {
            margin-top: 12px;
            padding: 12px;
            background: #eff6ff;
            border-radius: 6px;
            border-left: 3px solid #3b82f6;
        }

        .readiness-card {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 16px;
        }

        .readiness-card.status-ready {
            background: #d1fae5;
        }

        .readiness-card.status-refinement {
            background: #fef3c7;
        }

        .readiness-card.status-not-ready {
            background: #fee2e2;
        }

        .readiness-status {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .readiness-score {
            font-size: 1.2rem;
        }

        .readiness-list {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 12px;
        }

        .readiness-blocking {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
        }

        .readiness-warning {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
        }

        .readiness-recommendations {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
        }

        .readiness-list ul {
            margin-top: 8px;
            margin-left: 20px;
        }

        @media (max-width: 768px) {
            .header-content h1 {
                font-size: 2rem;
            }

            .summary-grid {
                grid-template-columns: 1fr 1fr;
            }

            .score-item {
                grid-template-columns: 1fr;
                gap: 8px;
            }

            .pbi-title-row {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>`;
  }

  /**
   * Get JavaScript
   */
  private getScripts(): string {
    return `
    <script>
        function togglePBI(index) {
            const content = document.getElementById('content-' + index);
            const icon = document.getElementById('icon-' + index);

            content.classList.toggle('expanded');
            icon.classList.toggle('expanded');
        }
    </script>`;
  }
}
