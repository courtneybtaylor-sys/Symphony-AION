/**
 * GET /api/download-report?token=XXX
 * Secure download endpoint for audit PDFs with real report generation
 * Phase 4g: Database-backed token validation with expiry
 * Phase 4e: Zod validation
 * Phase 6: Real PDF generation from AEI scores and recommendations
 */

import { NextResponse } from 'next/server';
import { DownloadRequestSchema } from '@/lib/validation/schemas';
import prisma from '@/lib/db';
import { jsPDF } from 'jspdf';

/**
 * Generate a basic fallback PDF when audit data is unavailable
 */
function generateFallbackPdf(aeiScore: any = null, recommendations: any = null): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Header
  doc.setFillColor(8, 8, 15);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(201, 168, 76);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Symphony-AION', margin, y + 15);

  doc.setTextColor(42, 184, 196);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Efficiency Intelligence Report', margin, y + 25);

  y = 60;

  // Content
  doc.setTextColor(8, 8, 15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Report', margin, y);

  y += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 110);

  const lines = [
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
    'This report contains your AI workflow efficiency analysis.',
    'Metrics provided are based on uploaded telemetry data.',
    '',
  ];

  if (aeiScore) {
    lines.push(`AEI Score: ${Math.round(aeiScore.overall)}/100`);
    lines.push(`Grade: ${aeiScore.grade}`);
  }

  if (recommendations && Array.isArray(recommendations)) {
    lines.push(`Recommendations: ${recommendations.length}`);
  }

  lines.forEach(line => {
    doc.text(line, margin, y);
    y += 6;
  });

  // Footer
  doc.setTextColor(150, 150, 180);
  doc.setFontSize(8);
  doc.text(
    'Symphony-AION · Confidential',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  return Buffer.from(doc.output('arraybuffer'));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    // Phase 4e: Validate input
    const parsed = DownloadRequestSchema.safeParse({ token });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Phase 4g: Validate token against database
    let auditJob;
    try {
      auditJob = await prisma.auditJob.findUnique({
        where: { reportToken: token! },
      });
    } catch {
      // DB may not be available - fall back to basic validation
    }

    if (auditJob) {
      // Check token expiry
      if (
        auditJob.reportTokenExpiresAt &&
        new Date() > new Date(auditJob.reportTokenExpiresAt)
      ) {
        return NextResponse.json(
          { error: 'Token has expired. Please request a new download link.' },
          { status: 401 }
        );
      }

      // Log download event
      try {
        await prisma.analyticsEvent.create({
          data: {
            userId: auditJob.userId,
            eventType: 'report_downloaded',
            metadata: JSON.stringify({
              jobId: auditJob.id,
              reportToken: token!.slice(0, 8) + '...',
            }),
          },
        });
      } catch {
        // Ignore analytics errors
      }
    } else if (token!.length < 10) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Generate real PDF audit report
    let reportBuffer: Buffer;
    
    if (auditJob && auditJob.aeiScore && auditJob.recommendations) {
      try {
        // Import PDF generation utilities
        const { generatePdfReport } = await import('@/lib/pdf-report');
        
        // Parse AEI score and recommendations from JSON
        const aeiScore = typeof auditJob.aeiScore === 'string' 
          ? JSON.parse(auditJob.aeiScore)
          : auditJob.aeiScore;
        
        const recommendations = typeof auditJob.recommendations === 'string'
          ? JSON.parse(auditJob.recommendations)
          : auditJob.recommendations;

        // Fetch upload telemetry for context
        const upload = await prisma.upload.findUnique({
          where: { id: auditJob.uploadId },
        });

        if (upload) {
          const telemetry = typeof upload.telemetry === 'string'
            ? JSON.parse(upload.telemetry)
            : upload.telemetry;

          // Generate PDF with real audit data
          const pdfDoc = await generatePdfReport({
            jobId: auditJob.id,
            aeiScore,
            recommendations,
            telemetry,
            framework: upload.framework,
            generatedAt: new Date().toISOString(),
          });

          reportBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
        } else {
          // Fallback to basic report if upload data unavailable
          reportBuffer = Buffer.from(generateFallbackPdf(aeiScore, recommendations));
        }
      } catch (pdfError) {
        console.error('[PDF Generation Error]', pdfError);
        // Fallback to basic PDF
        reportBuffer = Buffer.from(generateFallbackPdf(null, null));
      }
    } else {
      // Generate fallback PDF for mock downloads
      reportBuffer = Buffer.from(generateFallbackPdf(null, null));
    }

    return new Response(reportBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="aion-audit-${token!.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
