/**
 * Email delivery module
 * Task 4: Real Email Delivery with Resend
 * Sends audit reports, payment notifications via Resend API
 */

import { Resend } from 'resend'

export interface SendReportEmailParams {
  to: string
  jobId: string
  reportToken: string
  aeiScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  projectedSavingsMonthly?: number
  frameworkDetected?: string
  expiresAt: string
}

/**
 * Initialize Resend client
 */
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Generate HTML email template for audit report
 */
function generateAuditReportHTML(params: {
  downloadUrl: string
  aeiScore: number
  grade: string
  frameworkDetected?: string
  projectedSavingsMonthly?: number
  expiresDate: string
  jobId: string
}): string {
  const { downloadUrl, aeiScore, grade, frameworkDetected, projectedSavingsMonthly, expiresDate, jobId } = params

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c9a84c 0%, #2ab8c4 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .score-badge { font-size: 48px; font-weight: bold; margin: 20px 0; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .section { margin: 20px 0; }
        .section h2 { color: #2ab8c4; font-size: 16px; text-transform: uppercase; margin: 15px 0 10px 0; }
        .section p { margin: 8px 0; }
        .cta-button { display: inline-block; background: #2ab8c4; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 20px 0; }
        .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
        .metric { background: white; padding: 12px; border-radius: 4px; border-left: 3px solid #2ab8c4; }
        .metric-value { font-size: 18px; font-weight: bold; color: #2ab8c4; }
        .metric-label { font-size: 12px; color: #999; text-transform: uppercase; }
        .features { list-style: none; padding: 0; }
        .features li { padding: 8px 0; padding-left: 24px; position: relative; }
        .features li:before { content: "✓"; position: absolute; left: 0; color: #2ab8c4; font-weight: bold; }
        .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
        .expires-warning { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 10px; border-radius: 4px; margin: 15px 0; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Symphony-AION</h1>
        <p>AI Workflow Forensic Audit Complete</p>
    </div>

    <div class="container">
        <div class="section" style="text-align: center;">
            <p>Your AI workflow has been analyzed and optimized for cost and efficiency.</p>
        </div>

        <div class="section" style="text-align: center;">
            <div class="score-badge">
                <span style="color: #2ab8c4;">${aeiScore}</span>/100
                <div style="font-size: 24px; margin-top: 10px;">Grade <strong>${grade}</strong></div>
            </div>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-label">Framework</div>
                <div class="metric-value">${frameworkDetected || 'Generic'}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Monthly Savings</div>
                <div class="metric-value">${projectedSavingsMonthly ? `$${projectedSavingsMonthly.toLocaleString()}` : 'N/A'}</div>
            </div>
        </div>

        <div class="section" style="text-align: center;">
            <p><strong>Your secure audit report is ready to download.</strong></p>
            <a href="${downloadUrl}" class="cta-button">Download Audit Report</a>
            <div class="expires-warning">
                🔐 This link expires in 24 hours: ${expiresDate}
            </div>
        </div>

        <div class="section">
            <h2>What's Included</h2>
            <ul class="features">
                <li>Executive Summary with AEI score breakdown</li>
                <li>Cost Forensics — by model, by step, avoidable costs</li>
                <li>Performance Diagnostics — latency analysis</li>
                <li>Failure & Risk Analysis — validation and retry logs</li>
                <li>Optimization Recommendations — dollar-quantified</li>
                <li>Financial Exposure — 12-month cost projections</li>
            </ul>
        </div>

        <div class="section">
            <h2>Next Steps</h2>
            <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Download your PDF report</li>
                <li>Review optimization recommendations</li>
                <li>Implement high-ROI changes</li>
                <li>Contact us for implementation support</li>
            </ol>
        </div>

        <div class="section">
            <h2>Questions?</h2>
            <p>📧 Email: <a href="mailto:hello@symphony-aion.com">hello@symphony-aion.com</a></p>
            <p>📖 Docs: <a href="https://docs.symphony-aion.com">docs.symphony-aion.com</a></p>
        </div>
    </div>

    <div class="footer">
        <p>INTERNAL USE ONLY — CONFIDENTIAL</p>
        <p>Report ID: ${jobId}</p>
        <p>© 2024 Symphony-AION. All rights reserved.</p>
    </div>
</body>
</html>
  `
}

/**
 * Send audit report email with download link
 * Uses Resend in production, console logging in development/test
 */
export async function sendReportEmail(params: SendReportEmailParams): Promise<void> {
  const { to, jobId, reportToken, aeiScore, grade, projectedSavingsMonthly, frameworkDetected, expiresAt } = params

  const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/download-report?token=${reportToken}`
  const expiresDate = new Date(expiresAt).toLocaleString()

  const emailHtml = generateAuditReportHTML({
    downloadUrl,
    aeiScore,
    grade,
    frameworkDetected,
    projectedSavingsMonthly,
    expiresDate,
    jobId,
  })

  const emailText = `
Symphony-AION Forensic Audit Complete

Your AI workflow forensic audit is complete.

AEI Score: ${aeiScore}/100 [Grade ${grade}]
Framework: ${frameworkDetected || 'generic'}
Projected Monthly Savings: $${projectedSavingsMonthly?.toLocaleString() || 'N/A'}
Report ID: ${jobId}

Download your report (expires ${expiresDate}):
${downloadUrl}

Questions? Email: hello@symphony-aion.com
  `

  const resend = getResendClient()

  if (resend && process.env.RESEND_API_KEY) {
    // Production: Send via Resend
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'audits@symphony-aion.com',
        to,
        subject: `Your Symphony-AION Forensic Audit — Grade ${grade} (AEI: ${aeiScore}/100)`,
        html: emailHtml,
        text: emailText,
      })
      console.log(`[Email] ✓ Sent audit report to ${to} (job ${jobId})`)
    } catch (error) {
      console.warn(`[Email] Failed to send via Resend: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`[Email] Fallback: Logging email for ${to}`)
    }
  } else {
    // Development/Test: Log to console
    console.log(`[Email] Sending audit report to ${to}`)
    console.log(`[Email] Job ID: ${jobId}`)
    console.log(`[Email] Subject: Your Symphony-AION Forensic Audit — Grade ${grade} (AEI: ${aeiScore}/100)`)
    console.log(`[Email] Download URL: ${downloadUrl}`)
    console.log(`[Email] Expires: ${expiresDate}`)
  }
}

/**
 * Send payment failure notification
 */
export async function sendPaymentFailureEmail(email: string, reason: string): Promise<void> {
  const resend = getResendClient()

  const subject = 'Payment Failed — Symphony-AION Audit'
  const text = `Your payment for the Symphony-AION audit failed: ${reason}\n\nPlease retry or contact support.`
  const html = `
<!DOCTYPE html>
<html>
<head><style>body { font-family: system-ui, sans-serif; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .alert { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 4px; color: #c33; }</style></head>
<body>
<div class="container">
  <h2>Payment Failed</h2>
  <div class="alert">
    <p>Your payment for the Symphony-AION forensic audit failed:</p>
    <p><strong>${reason}</strong></p>
    <p>Please <a href="http://localhost:3000/checkout">retry your payment</a> or contact support.</p>
  </div>
</div>
</body>
</html>
  `

  if (resend && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'support@symphony-aion.com',
        to: email,
        subject,
        html,
        text,
      })
      console.log(`[Email] ✓ Sent payment failure notice to ${email}`)
    } catch (error) {
      console.warn(`[Email] Failed to send payment failure email: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`[Email] Payment failed for ${email}: ${reason}`)
  }
}

/**
 * Send payment receipt
 */
export async function sendPaymentReceiptEmail(email: string, jobId: string, amount: number): Promise<void> {
  const resend = getResendClient()

  const amountUSD = (amount / 100).toFixed(2)
  const subject = `Payment Receipt — Symphony-AION Audit ($${amountUSD})`
  const text = `Your payment of $${amountUSD} has been received. Your audit report is being generated.\n\nJob ID: ${jobId}`
  const html = `
<!DOCTYPE html>
<html>
<head><style>body { font-family: system-ui, sans-serif; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .receipt { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 4px; }</style></head>
<body>
<div class="container">
  <h2>Payment Received</h2>
  <div class="receipt">
    <p>Thank you for your payment!</p>
    <p><strong>Amount:</strong> $${amountUSD}</p>
    <p><strong>Job ID:</strong> ${jobId}</p>
    <p>Your audit report is being generated. You'll receive a download link shortly.</p>
  </div>
</div>
</body>
</html>
  `

  if (resend && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'billing@symphony-aion.com',
        to: email,
        subject,
        html,
        text,
      })
      console.log(`[Email] ✓ Sent payment receipt to ${email}`)
    } catch (error) {
      console.warn(`[Email] Failed to send payment receipt: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log(`[Email] Payment receipt to ${email} for $${amountUSD}`)
  }
}
