/**
 * Email delivery module
 * Sends audit reports via email with secure download links
 * Uses Resend (or configurable mail service)
 */

export interface SendReportEmailParams {
  to: string;
  jobId: string;
  reportToken: string;
  aeiScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  projectedSavingsMonthly?: number;
  frameworkDetected?: string;
  expiresAt: string;
}

/**
 * Send audit report email with download link
 * In production: uses Resend or nodemailer
 * For test mode: logs to console
 */
export async function sendReportEmail(params: SendReportEmailParams): Promise<void> {
  const {
    to,
    jobId,
    reportToken,
    aeiScore,
    grade,
    projectedSavingsMonthly,
    frameworkDetected,
    expiresAt,
  } = params;

  const downloadUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/download-report?token=${reportToken}`;
  const expiresDate = new Date(expiresAt).toLocaleString();

  const emailBody = `
SYMPHONY-AION FORENSIC AUDIT
────────────────────────────

Your AI workflow forensic audit is complete.

AUDIT SUMMARY
─────────────
AEI Score: ${aeiScore}/100 [Grade ${grade}]
Framework: ${frameworkDetected || 'generic'}
Projected Monthly Savings: $${projectedSavingsMonthly?.toLocaleString() || 'N/A'}
Report ID: ${jobId}

DOWNLOAD YOUR REPORT
────────────────────
🔐 Secure Download (expires: ${expiresDate})
${downloadUrl}

WHAT'S INCLUDED
───────────────
• Executive Summary with AEI score breakdown
• Cost Forensics — by model, by step, avoidable costs
• Performance Diagnostics — latency analysis
• Failure & Risk Analysis — validation and retry logs
• Optimization Recommendations — dollar-quantified
• Financial Exposure — 12-month cost projections

NEXT STEPS
──────────
1. Download your PDF report
2. Review optimization recommendations
3. Implement high-ROI changes (savings typically realized in first week)
4. Contact us for implementation support

QUESTIONS?
──────────
Email: hello@symphony-aion.com
Docs: docs.symphony-aion.com

────────────────────────────
INTERNAL USE ONLY — CONFIDENTIAL
Report ID: ${jobId}
  `;

  // Log email (in production: send via Resend/nodemailer)
  console.log(`[Email] Sending audit report to ${to}`);
  console.log(`[Email] Job ID: ${jobId}`);
  console.log(`[Email] Download URL: ${downloadUrl}`);
  console.log(`[Email] Expires: ${expiresDate}`);

  // In production:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'audits@symphony-aion.com',
  //   to,
  //   subject: `Your Symphony-AION Forensic Audit — Grade ${grade} (AEI: ${aeiScore}/100)`,
  //   html: emailHtml,
  //   text: emailBody,
  // });
}

/**
 * Send payment failure notification
 */
export async function sendPaymentFailureEmail(
  email: string,
  reason: string
): Promise<void> {
  console.log(`[Email] Payment failed for ${email}: ${reason}`);
  // In production: send via mail service
}

/**
 * Send payment receipt (optional)
 */
export async function sendPaymentReceiptEmail(
  email: string,
  jobId: string,
  amount: number
): Promise<void> {
  console.log(`[Email] Payment receipt to ${email} for $${(amount / 100).toFixed(2)}`);
  // In production: send via mail service
}
