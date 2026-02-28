/**
 * PDF Report Generation
 * Task 3: Generate audit reports in PDF format
 */

import { jsPDF } from 'jspdf'
import fs from 'fs/promises'
import path from 'path'

export interface PDFGenerationResult {
  filePath: string
  sizeBytes: number
}

export interface AuditReportData {
  workflowName: string
  framework: string
  aeiScore: number
  aeiGrade: string
  totalTokens: number
  totalCostUSD: number
  recommendations: Array<{
    title: string
    finding: string
    savings: number
  }>
  generatedAt: string
}

/**
 * Generate audit report PDF
 */
export async function generateAuditReport(
  data: AuditReportData,
  outputDir: string = '/tmp/reports'
): Promise<PDFGenerationResult> {
  await fs.mkdir(outputDir, { recursive: true })

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // ── COVER PAGE ────────────────────────────────────────────────────
  doc.setFillColor(8, 8, 15) // Dark background
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Title
  doc.setTextColor(201, 168, 76) // Gold
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text('Symphony-AION', pageWidth / 2, 60, { align: 'center' })

  // Subtitle
  doc.setTextColor(42, 184, 196) // Teal
  doc.setFontSize(16)
  doc.text('AI Efficiency Intelligence Report', pageWidth / 2, 80, {
    align: 'center',
  })

  // Workflow info
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  y = 110
  doc.text(`Workflow: ${data.workflowName || 'Audit Report'}`, pageWidth / 2, y, {
    align: 'center',
  })
  y += 10
  doc.text(`Generated: ${data.generatedAt}`, pageWidth / 2, y, {
    align: 'center',
  })
  y += 10
  doc.text(`Framework: ${data.framework}`, pageWidth / 2, y, {
    align: 'center',
  })

  // AEI Grade circle
  const gradeColor =
    data.aeiGrade === 'A'
      ? [76, 175, 130]
      : data.aeiGrade === 'B'
        ? [201, 168, 76]
        : [200, 68, 90]
  doc.setFillColor(...(gradeColor as [number, number, number]))
  doc.circle(pageWidth / 2, 160, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text(data.aeiGrade, pageWidth / 2, 167, { align: 'center' })

  // AEI score
  doc.setTextColor(204, 204, 238)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `AEI Score: ${data.aeiScore.toFixed(0)}/100`,
    pageWidth / 2,
    190,
    { align: 'center' }
  )

  // ── EXECUTIVE SUMMARY PAGE ────────────────────────────────────────
  doc.addPage()
  y = margin
  doc.setTextColor(8, 8, 15)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Executive Summary', margin, y)
  y += 12

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 80)

  const summaryLines = [
    ['Total Tokens:', data.totalTokens.toLocaleString()],
    ['Total Cost:', `$${data.totalCostUSD.toFixed(4)}`],
    ['Framework:', data.framework],
    ['AEI Score:', `${data.aeiScore.toFixed(0)}/100 (Grade ${data.aeiGrade})`],
    ['Recommendations:', `${data.recommendations.length} opportunities`],
  ]

  for (const [label, value] of summaryLines) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, margin + 60, y)
    y += 8
  }

  // ── RECOMMENDATIONS PAGE ──────────────────────────────────────────
  y += 10
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(8, 8, 15)
  doc.text('Optimization Recommendations', margin, y)
  y += 12

  for (let i = 0; i < Math.min(data.recommendations.length, 8); i++) {
    const rec = data.recommendations[i]

    if (y > 250) {
      doc.addPage()
      y = margin
    }

    // Recommendation box
    const priorityColor =
      rec.savings > 50 ? [200, 68, 90] : rec.savings > 20 ? [232, 160, 32] : [42, 184, 196]
    doc.setFillColor(...(priorityColor as [number, number, number]))
    doc.rect(margin, y, 4, 12, 'F')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(8, 8, 15)
    doc.text(`${i + 1}. ${rec.title}`, margin + 8, y + 5)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 110)
    const findingLines = doc.splitTextToSize(rec.finding, contentWidth - 8)
    doc.text(findingLines, margin + 8, y + 12)
    y += 12 + findingLines.length * 5

    doc.setTextColor(76, 175, 130)
    doc.setFont('helvetica', 'bold')
    doc.text(`Est. savings: $${rec.savings.toFixed(2)}/month`, margin + 8, y)
    y += 10
  }

  // ── FOOTER ────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 180)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Symphony-AION · Confidential · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Save PDF
  const fileName = `report-${Date.now()}.pdf`
  const filePath = path.join(outputDir, fileName)
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  await fs.writeFile(filePath, pdfBuffer)

  const stat = await fs.stat(filePath)
  console.log(`[PDFGenerator] Report generated: ${filePath} (${stat.size} bytes)`)

  return { filePath, sizeBytes: stat.size }
}
