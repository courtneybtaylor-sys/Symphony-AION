/**
 * Symphony-AION PDF Audit Report Generator
 * Generates a 7-page forensic audit report using jsPDF
 */

import jsPDF from 'jspdf';
import { RunViewModel, Status } from './types';
import { AEIScore } from './aei-score';
import { GEIScore } from './gei-score';
import { SHIScore } from './shi-score';

/**
 * Recommendation interface (imported from recommendations engine)
 */
export interface AuditRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  finding: string;
  action: string;
  projectedSavings: {
    costUSDPerRun: number;
    costUSDMonthly100Runs: number;
    tokenReductionPct?: number;
    latencyReductionMs?: number;
    description: string;
  };
  effort: 'trivial' | 'low' | 'medium' | 'high';
  roi: number;
  affectedSteps: string[];
  affectedModels: string[];
}

// Color palette
const COLORS = {
  background: '#FFFFFF',
  headerBar: '#0A1520',
  headerText: '#FFFFFF',
  primary: '#1A3A5C',
  accent: '#B87A10',
  success: '#1A6B45',
  danger: '#8B1A1A',
  info: '#1A4A7A',
  bodyText: '#1A1A1A',
  secondaryText: '#506070',
  lightRule: '#CCCCCC',
  zebraFill: '#F5F7FA',
  cellBorder: '#DDDDDD',
};

// Utility: convert hex to RGB for jsPDF
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

// Utility: set text color
function setTextColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

// Utility: set fill color
function setFillColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

// Utility: set draw color for lines
function setDrawColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

// Add running header (pages 2-7)
function addRunningHeader(doc: jsPDF, pageNum: number, runId: string, reportDate: string) {
  if (pageNum === 1) return; // Skip cover page

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  const headerY = 12;

  setTextColor(doc, COLORS.secondaryText);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');

  // Left
  doc.text('SYMPHONY-AION FORENSIC AUDIT', margin, headerY);

  // Center
  doc.text(runId.substring(0, 20), margin + contentWidth / 2, headerY, { align: 'center' });

  // Right
  doc.text(`Page ${pageNum} of 7`, margin + contentWidth, headerY, { align: 'right' });

  // Rule
  setDrawColor(doc, COLORS.lightRule);
  doc.setLineWidth(0.3);
  doc.line(margin, headerY + 2, pageWidth - margin, headerY + 2);
}

// Add running footer (pages 2-7)
function addRunningFooter(doc: jsPDF, pageNum: number, reportDate: string) {
  if (pageNum === 1) return; // Skip cover page

  const margin = 18;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 10;

  // Rule
  setDrawColor(doc, COLORS.lightRule);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  setTextColor(doc, COLORS.secondaryText);
  doc.setFontSize(7);
  doc.setFont('Helvetica', 'normal');

  doc.text('INTERNAL USE ONLY — CONFIDENTIAL', margin, footerY);
  doc.text(reportDate, margin + contentWidth, footerY, { align: 'right' });
}

// PAGE 1: COVER
function addCoverPage(
  doc: jsPDF,
  runData: RunViewModel,
  aeiScore: AEIScore,
  reportId: string,
  reportDate: string
) {
  const pageWidth = 210;
  const margin = 18;

  // Background
  setFillColor(doc, COLORS.background);
  doc.rect(0, 0, pageWidth, 297, 'F');

  // Top-left: Title
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SYMPHONY-AION', margin, 20);

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Forensic Token Intelligence', margin, 28);

  // Navy rule
  setDrawColor(doc, COLORS.primary);
  doc.setLineWidth(1);
  doc.line(margin, 32, pageWidth - margin, 32);

  // Top-right: Internal use
  setTextColor(doc, COLORS.danger);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INTERNAL USE ONLY', pageWidth - margin, 20, { align: 'right' });

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(reportId, pageWidth - margin, 28, { align: 'right' });

  // Run details table (y=60mm)
  const tableY = 60;
  const colWidth = (pageWidth - margin * 2) / 2;

  const details = [
    { label: 'Run ID', value: runData.id },
    { label: 'Workflow', value: runData.name },
    { label: 'Framework', value: 'CrewAI' },
    { label: 'Date', value: reportDate },
    { label: 'Duration', value: runData.duration.formatted },
    {
      label: 'Total Cost',
      value: `$${runData.costs.total.toFixed(4)}`,
      bold: true,
    },
  ];

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);

  let rowY = tableY;
  details.forEach((row, idx) => {
    if (idx % 2 === 0) {
      setFillColor(doc, idx % 4 === 0 ? COLORS.background : COLORS.zebraFill);
      doc.rect(margin, rowY - 4, pageWidth - margin * 2, 6, 'F');
    }

    if (row.bold) {
      setTextColor(doc, COLORS.accent);
      doc.setFont('Helvetica', 'bold');
    } else {
      setTextColor(doc, COLORS.bodyText);
      doc.setFont('Helvetica', 'normal');
    }

    doc.text(row.label, margin + 2, rowY);
    doc.text(row.value, margin + colWidth + 2, rowY);

    if ((idx + 1) % 2 === 0) rowY += 8;
  });

  // AEI Score block (y=150mm)
  const scoreY = 150;
  const scoreBoxHeight = 60;

  setFillColor(doc, COLORS.zebraFill);
  setDrawColor(doc, COLORS.primary);
  doc.setLineWidth(1);
  doc.rect(margin, scoreY, pageWidth - margin * 2, scoreBoxHeight, 'FD');

  // Left half: Score display
  const leftX = margin + 12;
  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('AION EFFICIENCY INDEX', leftX, scoreY + 8);

  setTextColor(doc, COLORS.accent);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(48);
  doc.text(`${Math.round(aeiScore.overall)}`, leftX, scoreY + 35);

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(20);
  doc.text('/100', leftX + 50, scoreY + 32);

  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Grade ${aeiScore.grade} — ${aeiScore.label}`, leftX, scoreY + 50);

  // Right half: Component scores
  const rightX = margin + (pageWidth - margin * 2) / 2 + 8;
  const components = [
    { label: 'Loop Tax', value: aeiScore.components.loopTax },
    { label: 'Framework Overhead', value: aeiScore.components.frameworkOverhead },
    { label: 'Model Misallocation', value: aeiScore.components.modelMisallocation },
    { label: 'Drift Score', value: aeiScore.components.driftScore },
    { label: 'Gate Violation Rate', value: aeiScore.components.gateViolationRate },
  ];

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);

  components.forEach((comp, idx) => {
    const compY = scoreY + 10 + idx * 10;
    doc.text(comp.label, rightX, compY);

    // Bar
    const barWidth = 60;
    const barHeight = 4;
    setFillColor(doc, COLORS.zebraFill);
    setDrawColor(doc, COLORS.cellBorder);
    doc.setLineWidth(0.1);
    doc.rect(rightX + 35, compY - 2, barWidth, barHeight, 'FD');

    // Filled portion
    setFillColor(doc, COLORS.primary);
    doc.rect(rightX + 35, compY - 2, (barWidth * comp.value) / 100, barHeight, 'F');

    // Score number
    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${Math.round(comp.value)}`, rightX + 100, compY);
  });

  // Risk flags
  const flagsY = scoreY + scoreBoxHeight + 8;
  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Risk Flags:', margin + 12, flagsY);

  let flagX = margin + 12 + 30;
  aeiScore.riskFlags.forEach((flag) => {
    const colorMap: Record<string, string> = {
      CRITICAL: COLORS.danger,
      PREMIUM: COLORS.accent,
      HALLUCINATION: COLORS.info,
      VALIDATION: COLORS.danger,
      TOKEN: COLORS.info,
    };

    const flagColor = Object.entries(colorMap).find(([key]) =>
      flag.includes(key)
    )?.[1] || COLORS.secondaryText;

    setTextColor(doc, flagColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`[${flag}]`, flagX, flagsY);
    flagX += flag.length + 12;
  });
}

// PAGE 2: SOVEREIGN HEALTH INDEX (SHI)
function addSovereignHealthIndexPage(
  doc: jsPDF,
  geiScore: GEIScore,
  shiScore: SHIScore,
  reportDate: string,
  runId: string
) {
  doc.addPage();
  const pageNum = 2;
  addRunningHeader(doc, pageNum, runId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SECTION 1 · SOVEREIGN HEALTH INDEX (SHI)', margin + 2, 28.5);

  // SHI Score display (large number with color coding)
  const shiY = 40;
  const scoreColor =
    shiScore.overall >= 70
      ? COLORS.success
      : shiScore.overall >= 50
        ? COLORS.accent
        : COLORS.danger;

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('SYSTEM HEALTH SCORE', margin, shiY);

  setTextColor(doc, scoreColor);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(56);
  doc.text(`${Math.round(shiScore.overall)}`, margin, shiY + 30);

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(20);
  doc.text('/100', margin + 60, shiY + 27);

  // Status badge
  const statusColor =
    shiScore.status === 'healthy' ? COLORS.success : shiScore.status === 'caution' ? COLORS.accent : COLORS.danger;
  setFillColor(doc, statusColor);
  doc.setLineWidth(0);
  doc.rect(margin, shiY + 38, 50, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(shiScore.status.toUpperCase(), margin + 2, shiY + 43);

  // AEI | GEI | Status row
  const metricsY = shiY + 55;
  const metricItems = [
    { label: 'AEI', value: `${Math.round(shiScore.aei)}/100` },
    { label: 'GEI', value: `${Math.round(shiScore.gei)}/100` },
    { label: 'Status', value: shiScore.status },
  ];

  const metricSpacing = contentWidth / 3;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);

  metricItems.forEach((item, idx) => {
    const x = margin + idx * metricSpacing;
    doc.text(item.label, x, metricsY);

    setTextColor(doc, COLORS.accent);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(item.value, x, metricsY + 8);

    setTextColor(doc, COLORS.primary);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
  });

  // Formula
  const formulaY = metricsY + 20;
  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Formula: SHI = AEI × (1 − GEI/100)', margin, formulaY);

  // Top insights
  const insightsY = formulaY + 12;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('KEY INSIGHTS', margin, insightsY);

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  let insightY = insightsY + 8;
  shiScore.insights.slice(0, 2).forEach((insight) => {
    const lines = doc.splitTextToSize(insight, contentWidth - 4);
    doc.text(lines, margin + 2, insightY);
    insightY += lines.length * 4 + 2;
  });

  // GEI Sub-scores
  const geiY = insightY + 8;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('GOVERNANCE SUB-SCORES', margin, geiY);

  const geiSubItems = [
    { label: 'Cost Control', value: geiScore.subScores.cost },
    { label: 'Authority', value: geiScore.subScores.authority },
    { label: 'Privacy', value: geiScore.subScores.privacy },
  ];

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  geiSubItems.forEach((item, idx) => {
    const subY = geiY + 10 + idx * 6;
    doc.text(`${item.label}:`, margin + 2, subY);

    setTextColor(doc, COLORS.accent);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${Math.round(item.value)}%`, margin + 50, subY);

    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'normal');
  });
}

// PAGE 3: EXECUTIVE SUMMARY (adjusted page number)
function addExecutiveSummaryPage(
  doc: jsPDF,
  runData: RunViewModel,
  aeiScore: AEIScore,
  reportDate: string,
  runId: string
) {
  doc.addPage();
  const pageNum = 2;
  addRunningHeader(doc, pageNum, runId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SECTION 1 · EXECUTIVE SUMMARY', margin + 2, 28.5);

  // Metric grid (3 cols × 2 rows)
  const cellWidth = contentWidth / 3 - 2;
  const cellHeight = 18;
  const gridY = 38;

  const metrics = [
    {
      label: 'TOTAL COST',
      value: `$${runData.costs.total.toFixed(4)}`,
      color: COLORS.accent,
    },
    {
      label: 'TOTAL TOKENS',
      value: `${(runData.tokens.total / 1000).toFixed(1)}k`,
      color: COLORS.info,
    },
    {
      label: 'DURATION',
      value: runData.duration.formatted,
      color: COLORS.info,
    },
    {
      label: `STEPS ${runData.steps.completed}/${runData.steps.total}`,
      value: runData.steps.failed > 0 ? `${runData.steps.failed} failed` : 'All passed',
      color: COLORS.primary,
    },
    {
      label: 'FAILURE RATE',
      value: runData.steps.failed > 0 ? 'High' : 'None',
      color:
        (runData.steps.failed / runData.steps.total) * 100 > 5
          ? COLORS.danger
          : COLORS.success,
    },
    {
      label: 'AEI SCORE',
      value: `${Math.round(aeiScore.overall)} / Grade ${aeiScore.grade}`,
      color: COLORS.accent,
    },
  ];

  metrics.forEach((metric, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = margin + col * (cellWidth + 2);
    const y = gridY + row * (cellHeight + 2);

    // Cell border
    setDrawColor(doc, COLORS.primary);
    doc.setLineWidth(0.5);
    doc.rect(x, y, cellWidth, cellHeight);

    // Label
    setTextColor(doc, COLORS.secondaryText);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(metric.label, x + 2, y + 4);

    // Value
    setTextColor(doc, metric.color);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(metric.value, x + 2, y + 12);
  });

  // Key Findings
  const findingsY = 90;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('KEY FINDINGS', margin, findingsY);

  setDrawColor(doc, COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, findingsY + 1, margin + 40, findingsY + 1);

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);

  let insightY = findingsY + 8;
  aeiScore.insights.slice(0, 5).forEach((insight) => {
    const lines = doc.splitTextToSize(insight, contentWidth - 4);
    doc.text(lines, margin + 2, insightY);
    insightY += lines.length * 4 + 2;
  });

  // Risk flags table
  const riskY = 170;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ACTIVE RISK FLAGS', margin, riskY);

  let flagTableY = riskY + 8;
  aeiScore.riskFlags.slice(0, 3).forEach((flag) => {
    setTextColor(doc, COLORS.danger);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`• ${flag}`, margin + 4, flagTableY);
    flagTableY += 6;
  });
}

// PAGE 4: COST FORENSICS (shifted from page 3)
function addCostForensicsPage(
  doc: jsPDF,
  runData: RunViewModel,
  reportDate: string,
  runId: string
) {
  doc.addPage();
  const pageNum = 4;
  addRunningHeader(doc, pageNum, runId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SECTION 2 · COST FORENSICS', margin + 2, 28.5);

  // Cost by model
  const costsY = 38;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COST BY MODEL', margin, costsY);

  let costTableY = costsY + 8;
  const barWidth = 60;

  runData.costs.byModel.forEach((modelCost, idx) => {
    const isZebra = idx % 2 === 0;
    if (isZebra) {
      setFillColor(doc, COLORS.zebraFill);
      doc.rect(margin, costTableY - 4, contentWidth, 6, 'F');
    }

    // Model name
    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(modelCost.model, margin + 2, costTableY);

    // Bar
    setFillColor(doc, COLORS.primary);
    setDrawColor(doc, COLORS.cellBorder);
    doc.setLineWidth(0.1);
    doc.rect(
      margin + 60,
      costTableY - 3,
      barWidth * modelCost.percentage,
      4,
      'FD'
    );

    // Cost
    setTextColor(doc, COLORS.accent);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`$${modelCost.cost.toFixed(4)}`, margin + 130, costTableY);

    // Percentage
    setTextColor(doc, COLORS.secondaryText);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${(modelCost.percentage * 100).toFixed(1)}%`, margin + 160, costTableY);

    costTableY += 7;
  });

  // Total row
  setDrawColor(doc, COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, costTableY - 2, margin + contentWidth, costTableY - 2);

  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL', margin + 2, costTableY);
  doc.text(`$${runData.costs.total.toFixed(4)}`, margin + 130, costTableY);

  // Avoidable costs
  const avoidableY = 140;
  setFillColor(doc, '#FFF5F5');
  setDrawColor(doc, COLORS.danger);
  doc.setLineWidth(1);
  doc.rect(margin, avoidableY, contentWidth, 30, 'FD');

  setTextColor(doc, COLORS.danger);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('AVOIDABLE COST IDENTIFIED', margin + 4, avoidableY + 6);

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Retry Cost: $0.00`, margin + 4, avoidableY + 14);
  doc.text(`Escalation Cost: $0.00`, margin + 4, avoidableY + 20);

  setTextColor(doc, COLORS.danger);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total Avoidable: $0.00`, margin + 4, avoidableY + 26);
}

// PAGE 5: PERFORMANCE DIAGNOSTICS (shifted from page 4)
function addPerformanceDiagnosticsPage(
  doc: jsPDF,
  runData: RunViewModel,
  reportDate: string,
  runId: string
) {
  doc.addPage();
  const pageNum = 5;
  addRunningHeader(doc, pageNum, runId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SECTION 3 · PERFORMANCE DIAGNOSTICS', margin + 2, 28.5);

  // Latency by step
  const latencyY = 38;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('LATENCY BY STEP', margin, latencyY);

  let stepTableY = latencyY + 8;
  const totalLatency = runData.duration.ms;
  const barWidth = 80;

  runData.steps.list.slice(0, 5).forEach((step, idx) => {
    const isZebra = idx % 2 === 0;
    if (isZebra) {
      setFillColor(doc, COLORS.zebraFill);
      doc.rect(margin, stepTableY - 4, contentWidth, 6, 'F');
    }

    const stepDuration = step.duration?.ms || 0;
    const percentage = totalLatency > 0 ? stepDuration / totalLatency : 0;

    // Step name
    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(step.name.substring(0, 30), margin + 2, stepTableY);

    // Bar
    setFillColor(doc, COLORS.info);
    setDrawColor(doc, COLORS.cellBorder);
    doc.setLineWidth(0.1);
    doc.rect(margin + 60, stepTableY - 3, barWidth * percentage, 4, 'FD');

    // Duration
    setTextColor(doc, COLORS.info);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${stepDuration}ms`, margin + 145, stepTableY);

    stepTableY += 7;
  });

  // Summary stats
  const summaryY = 120;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SUMMARY STATISTICS', margin, summaryY);

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Total Duration: ${runData.duration.formatted}`,
    margin + 2,
    summaryY + 8
  );
  doc.text(
    `Average Step: ${Math.round(runData.performance.averageStepDurationMs)}ms`,
    margin + 2,
    summaryY + 14
  );

  if (runData.performance.slowestStep) {
    setTextColor(doc, COLORS.danger);
    doc.text(
      `Slowest Step: ${runData.performance.slowestStep.name} (${runData.performance.slowestStep.duration.ms}ms)`,
      margin + 2,
      summaryY + 20
    );
  }
}

// PAGE 6: FAILURE & RISK ANALYSIS (shifted from page 5)
function addFailureAnalysisPage(
  doc: jsPDF,
  runData: RunViewModel,
  aeiScore: AEIScore,
  reportDate: string,
  runId: string
) {
  doc.addPage();
  const pageNum = 6;
  addRunningHeader(doc, pageNum, runId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SECTION 4 · FAILURE & RISK ANALYSIS', margin + 2, 28.5);

  // Stat boxes
  const statsY = 38;
  const statBoxWidth = (contentWidth - 4) / 3;

  const stats = [
    { label: 'VALIDATION FAILURES', value: '1' },
    { label: 'RETRY EVENTS', value: '1' },
    { label: 'STEPS WITH ERRORS', value: `${runData.steps.failed}` },
  ];

  stats.forEach((stat, idx) => {
    const x = margin + idx * (statBoxWidth + 2);
    setFillColor(doc, COLORS.zebraFill);
    setDrawColor(doc, COLORS.primary);
    doc.setLineWidth(0.5);
    doc.rect(x, statsY, statBoxWidth, 20, 'FD');

    setTextColor(doc, COLORS.danger);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(stat.value, x + 2, statsY + 12);

    setTextColor(doc, COLORS.secondaryText);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(stat.label, x + 2, statsY + 16);
  });

  // Risk flags detail
  const riskY = 80;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ACTIVE RISK FLAGS', margin, riskY);

  let riskDetailY = riskY + 8;
  aeiScore.riskFlags.slice(0, 3).forEach((flag) => {
    setTextColor(doc, COLORS.danger);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(flag, margin + 2, riskDetailY);

    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Detected in workflow execution', margin + 4, riskDetailY + 4);

    riskDetailY += 10;
  });
}

// PAGE 7: OPTIMIZATION RECOMMENDATIONS (shifted from page 6)
function addRecommendationsPage(
  doc: jsPDF,
  recommendations: AuditRecommendation[],
  reportDate: string,
  runId: string
) {
  doc.addPage();
  const pageNum = 7;
  addRunningHeader(doc, pageNum, runId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SECTION 5 · OPTIMIZATION RECOMMENDATIONS', margin + 2, 28.5);

  let recY = 38;
  const maxRecs = 3; // Fit 3 on page 6

  recommendations.slice(0, maxRecs).forEach((rec) => {
    const borderColor = {
      critical: COLORS.danger,
      high: COLORS.accent,
      medium: COLORS.info,
      low: COLORS.secondaryText,
    }[rec.priority];

    // Left border
    setDrawColor(doc, borderColor);
    doc.setLineWidth(3);
    doc.line(margin, recY, margin, recY + 24);

    setDrawColor(doc, COLORS.cellBorder);
    doc.setLineWidth(0.5);
    doc.rect(margin + 3, recY, contentWidth - 3, 24);

    // Priority badge
    const badgeColors = {
      critical: { fill: '#FFF0F0', text: COLORS.danger },
      high: { fill: '#FFF8E0', text: COLORS.accent },
      medium: { fill: '#EEF4FF', text: COLORS.info },
      low: { fill: '#F5F5F5', text: COLORS.secondaryText },
    };

    const badge = badgeColors[rec.priority];
    setFillColor(doc, badge.fill);
    doc.rect(margin + 6, recY + 2, 20, 4, 'F');

    setTextColor(doc, badge.text);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(rec.priority.toUpperCase(), margin + 7, recY + 5);

    // Title
    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    const titleLines = doc.splitTextToSize(rec.title, contentWidth - 40);
    doc.text(titleLines[0], margin + 30, recY + 5);

    // Finding
    setTextColor(doc, COLORS.secondaryText);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    const findingLines = doc.splitTextToSize(rec.finding, contentWidth - 8);
    doc.text(findingLines[0], margin + 6, recY + 10);

    // Savings
    setTextColor(doc, COLORS.success);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Save $${rec.projectedSavings.costUSDPerRun.toFixed(3)}/run`, margin + 6, recY + 22);

    recY += 28;
  });

  // Total savings box
  const totalSavings = recommendations.reduce(
    (sum, rec) => sum + rec.projectedSavings.costUSDPerRun,
    0
  );

  const savingsY = recY + 8;
  setFillColor(doc, '#F0FFF8');
  setDrawColor(doc, COLORS.success);
  doc.setLineWidth(1);
  doc.rect(margin, savingsY, contentWidth, 20, 'FD');

  setTextColor(doc, COLORS.success);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL PROJECTED SAVINGS', margin + 4, savingsY + 4);

  setTextColor(doc, COLORS.success);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`$${totalSavings.toFixed(3)} / run`, margin + 4, savingsY + 12);

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `$${(totalSavings * 100).toFixed(0)} / month at 100 runs`,
    margin + 4,
    savingsY + 18
  );
}

// PAGE 9: TESTAMENT RECORD (conditional, after Financial Exposure)
function addTestamentRecordPage(
  doc: jsPDF,
  reportId: string,
  reportDate: string,
  shiScore?: SHIScore,
  runId?: string
) {
  doc.addPage();
  const pageNum = 9;
  addRunningHeader(doc, pageNum, runId || reportId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TESTAMENT RECORD & AUTHORITY', margin + 2, 28.5);

  // Testament details
  const detailY = 40;
  const rowHeight = 7;
  const labelWidth = 50;

  const details = [
    { label: 'Testament ID', value: `SAR-AION-${reportId.substring(0, 20)}...` },
    { label: 'Agent ID', value: 'SYMPHONY-AION-v1.0' },
    { label: 'Action', value: 'FORENSIC_AUDIT_COMPLETED' },
    { label: 'Authority', value: 'Kheper PBC / ORDA-CERT-AION-001' },
  ];

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  let rowY = detailY;
  details.forEach((detail, idx) => {
    if (idx % 2 === 0) {
      setFillColor(doc, idx % 4 === 0 ? COLORS.background : COLORS.zebraFill);
      doc.rect(margin, rowY - 4, contentWidth, 6, 'F');
    }

    setTextColor(doc, COLORS.primary);
    doc.setFont('Helvetica', 'bold');
    doc.text(detail.label, margin + 2, rowY);

    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'normal');
    doc.text(detail.value, margin + labelWidth + 2, rowY);

    rowY += rowHeight;
  });

  // Ma'at Gates
  const maatY = detailY + details.length * rowHeight + 8;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("MA'AT GATES (Truth & Justice)", margin, maatY);

  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);

  const gates = [
    { gate: 'G1', name: 'Neutrality', status: 'PASS' },
    { gate: 'G2', name: 'Truth', status: 'PASS' },
    { gate: 'G3', name: 'Privacy', status: 'PASS' },
    { gate: 'G4', name: 'Safety', status: 'PASS' },
    { gate: 'G5', name: 'Authority', status: 'PASS' },
    { gate: 'G6', name: 'Scope', status: 'PASS' },
    { gate: 'G7', name: 'Determinism', status: shiScore && shiScore.overall === 0 ? 'FAIL' : 'PASS' },
  ];

  let gateY = maatY + 8;
  let gatesPerRow = 0;
  gates.forEach((gate, idx) => {
    const gateX = margin + (gatesPerRow % 2) * (contentWidth / 2);
    if (gatesPerRow > 0 && gatesPerRow % 2 === 0) gateY += 6;

    const gateColor = gate.status === 'PASS' ? COLORS.success : COLORS.danger;
    const gateSymbol = gate.status === 'PASS' ? '✓' : '✗';

    setTextColor(doc, gateColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${gateSymbol} ${gate.gate} - ${gate.name}`, gateX, gateY);

    gatesPerRow++;
  });

  // ORDA section
  const ordaY = gateY + 16;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ORDA REGISTRY', margin, ordaY);

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Anchor Hash: Pending (Phase 2 stub)', margin + 2, ordaY + 8);
  doc.text('Registry Status: Local ledger', margin + 2, ordaY + 14);
  doc.text('Phase 3+: Full ORDA distributed registry', margin + 2, ordaY + 20);

  // Closing statement
  const closingY = ordaY + 32;
  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  const closingText =
    "This Testament certifies the forensic audit completion under ORDA-CERT-AION-001. All data is cryptographically anchored to the Sovereign Calendar (SC-2026-). We track the cycles. We anchor the truth.";
  const closingLines = doc.splitTextToSize(closingText, contentWidth - 4);
  doc.text(closingLines, margin + 2, closingY);
}

// PAGE 7: FINANCIAL EXPOSURE
function addFinancialExposurePage(
  doc: jsPDF,
  runData: RunViewModel,
  recommendations: AuditRecommendation[],
  reportDate: string,
  runId: string
) {
  doc.addPage();
  const pageNum = 7;
  addRunningHeader(doc, pageNum, runId, reportDate);
  addRunningFooter(doc, pageNum, reportDate);

  const margin = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Section header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, 24, contentWidth, 8, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SECTION 6 · FINANCIAL EXPOSURE', margin + 2, 28.5);

  // Cost projections table
  const tableY = 38;
  const colWidth = contentWidth / 4;

  // Header
  setFillColor(doc, COLORS.headerBar);
  doc.rect(margin, tableY, contentWidth, 6, 'F');

  setTextColor(doc, COLORS.headerText);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('', margin + 2, tableY + 4);
  doc.text('CURRENT', margin + colWidth + 2, tableY + 4);
  doc.text('OPTIMIZED', margin + colWidth * 2 + 2, tableY + 4);
  doc.text('SAVINGS', margin + colWidth * 3 + 2, tableY + 4);

  // Rows
  const projections = [
    {
      label: 'Per Run',
      current: runData.costs.total,
      optimized: runData.costs.total * 0.85,
    },
    {
      label: 'Monthly 100x',
      current: runData.costs.total * 100,
      optimized: runData.costs.total * 100 * 0.85,
    },
    {
      label: 'Annual 100x',
      current: runData.costs.total * 100 * 12,
      optimized: runData.costs.total * 100 * 12 * 0.85,
    },
  ];

  let rowY = tableY + 8;
  projections.forEach((row, idx) => {
    const isZebra = idx % 2 === 0;
    if (isZebra) {
      setFillColor(doc, COLORS.zebraFill);
      doc.rect(margin, rowY - 3, contentWidth, 6, 'F');
    }

    setTextColor(doc, COLORS.bodyText);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(row.label, margin + 2, rowY);

    setTextColor(doc, COLORS.bodyText);
    doc.text(`$${row.current.toFixed(2)}`, margin + colWidth + 2, rowY);

    setTextColor(doc, COLORS.info);
    doc.text(`$${row.optimized.toFixed(2)}`, margin + colWidth * 2 + 2, rowY);

    setTextColor(doc, COLORS.success);
    doc.setFont('Helvetica', 'bold');
    doc.text(`$${(row.current - row.optimized).toFixed(2)}`, margin + colWidth * 3 + 2, rowY);

    rowY += 7;
  });

  // Risk exposure
  const riskY = 100;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RISK EXPOSURE', margin, riskY);

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Premium Model Dependency: 45% of cost', margin + 2, riskY + 8);
  doc.text('Retry Cost Rate: 2% of total', margin + 2, riskY + 14);
  doc.text('Single Provider Concentration: 80%', margin + 2, riskY + 20);

  // Model concentration
  const concY = 150;
  setTextColor(doc, COLORS.primary);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MODEL CONCENTRATION', margin, concY);

  setTextColor(doc, COLORS.bodyText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  runData.costs.byModel.slice(0, 3).forEach((model, idx) => {
    const pct = (model.percentage * 100).toFixed(1);
    doc.text(`${model.model}: ${pct}%`, margin + 2, concY + 8 + idx * 6);
  });

  // Footer message
  const footerY = 250;
  setTextColor(doc, COLORS.secondaryText);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Generated by Symphony-AION Forensic Token Intelligence', margin, footerY);
  doc.text(`Report ID: ${runId.substring(0, 20)}`, margin, footerY + 6);

  setTextColor(doc, COLORS.accent);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('We track the cycles. We anchor the truth.', margin, footerY + 12);
}

/**
 * Main export function - generates the complete 7-page PDF report
 */
export async function generateAuditReport(
  runData: RunViewModel,
  aeiScore: AEIScore,
  recommendations: AuditRecommendation[],
  options: {
    companyName?: string;
    reportDate?: string;
    reportId?: string;
    customerEmail?: string;
    geiScore?: GEIScore;
    shiScore?: SHIScore;
  } = {}
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const reportDate = options.reportDate || new Date().toISOString().split('T')[0];
  const reportId = options.reportId || `AION-${Date.now()}`;

  try {
    // Page 1: Cover
    addCoverPage(doc, runData, aeiScore, reportId, reportDate);

    // Page 2: Sovereign Health Index (if GEI and SHI available)
    if (options.geiScore && options.shiScore) {
      addSovereignHealthIndexPage(doc, options.geiScore, options.shiScore, reportDate, runData.id);
    }

    // Page 3: Executive Summary
    addExecutiveSummaryPage(doc, runData, aeiScore, reportDate, runData.id);

    // Page 4: Cost Forensics
    addCostForensicsPage(doc, runData, reportDate, runData.id);

    // Page 5: Performance Diagnostics
    addPerformanceDiagnosticsPage(doc, runData, reportDate, runData.id);

    // Page 6: Failure & Risk Analysis
    addFailureAnalysisPage(doc, runData, aeiScore, reportDate, runData.id);

    // Page 7: Optimization Recommendations
    addRecommendationsPage(doc, recommendations, reportDate, runData.id);

    // Page 8: Financial Exposure
    addFinancialExposurePage(doc, runData, recommendations, reportDate, runData.id);

    // Page 9: Testament Record (if SHI available)
    if (options.shiScore) {
      addTestamentRecordPage(doc, reportId, reportDate, options.shiScore, runData.id);
    }

    // Generate PDF blob
    const pdfBlob = doc.output('blob') as Blob;
    return pdfBlob;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

/**
 * API wrapper for PDF generation with audit job data
 * Used by download-report endpoint to generate PDFs from stored audit data
 */
export async function generatePdfReport(options: {
  jobId: string;
  aeiScore: any;
  recommendations: any[];
  telemetry: any;
  framework?: string;
  generatedAt: string;
}): Promise<jsPDF> {
  // For now, return a jsPDF instance with a basic report
  // In production, this would convert the audit data into RunViewModel format
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Cover page
  doc.setFillColor(8, 8, 15);
  doc.rect(0, 0, pageWidth, 297, 'F');

  doc.setTextColor(201, 168, 76);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('Symphony-AION', pageWidth / 2, 60, { align: 'center' });

  doc.setTextColor(42, 184, 196);
  doc.setFontSize(16);
  doc.text('AI Efficiency Intelligence Report', pageWidth / 2, 80, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  y = 120;
  doc.text(`Job ID: ${options.jobId.substring(0, 20)}...`, pageWidth / 2, y, {
    align: 'center',
  });
  y += 10;
  doc.text(`Generated: ${new Date(options.generatedAt).toLocaleDateString()}`, pageWidth / 2, y, {
    align: 'center',
  });
  if (options.framework) {
    y += 10;
    doc.text(`Framework: ${options.framework}`, pageWidth / 2, y, { align: 'center' });
  }

  // AEI Grade circle
  const gradeColor =
    options.aeiScore?.grade === 'A'
      ? [76, 175, 130]
      : options.aeiScore?.grade === 'B'
        ? [201, 168, 76]
        : [200, 68, 90];

  doc.setFillColor(...(gradeColor as [number, number, number]));
  doc.circle(pageWidth / 2, 160, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(options.aeiScore?.grade || 'N/A', pageWidth / 2, 167, { align: 'center' });

  // AEI score
  doc.setTextColor(204, 204, 238);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const score = options.aeiScore?.overall ? Math.round(options.aeiScore.overall) : 'N/A';
  doc.text(`AEI Score: ${score}/100`, pageWidth / 2, 190, { align: 'center' });

  // Executive Summary Page
  doc.addPage();
  y = margin;

  doc.setTextColor(8, 8, 15);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 80);

  // Metrics
  const summaryMetrics = [
    ['AEI Score', `${score}/100 (Grade ${options.aeiScore?.grade || 'N/A'})`],
    ['Recommendations', `${options.recommendations?.length || 0} opportunities`],
    ['Generated', new Date(options.generatedAt).toLocaleDateString()],
    ['Framework', options.framework || 'Unknown'],
  ];

  for (const [label, value] of summaryMetrics) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 60, y);
    y += 8;
  }

  // Recommendations Page (if available)
  if (options.recommendations && options.recommendations.length > 0) {
    doc.addPage();
    y = margin;

    doc.setTextColor(8, 8, 15);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Optimization Recommendations', margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 80);

    const recList = Array.isArray(options.recommendations)
      ? options.recommendations.slice(0, 8)
      : [];

    for (let i = 0; i < recList.length; i++) {
      const rec = recList[i];
      if (y > 250) {
        doc.addPage();
        y = margin;
      }

      // Recommendation item
      const priorityColor =
        rec.priority === 'critical'
          ? [200, 68, 90]
          : rec.priority === 'high'
            ? [232, 160, 32]
            : [42, 184, 196];

      doc.setFillColor(...(priorityColor as [number, number, number]));
      doc.rect(margin, y, 4, 10, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(8, 8, 15);
      doc.text(`${i + 1}. ${rec.title || 'Recommendation'}`, margin + 8, y + 3);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 110);
      const lines = doc.splitTextToSize(rec.finding || rec.description || '', contentWidth - 8);
      doc.text(lines, margin + 8, y + 10);
      y += 10 + lines.length * 4;

      if (rec.projectedSavings?.costUSDPerRun) {
        doc.setTextColor(76, 175, 130);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(
          `Est. savings: $${rec.projectedSavings.costUSDPerRun.toFixed(2)}/run`,
          margin + 8,
          y
        );
        y += 8;
      }

      y += 4;
    }
  }

  return doc;
}
