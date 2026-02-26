/**
 * GET /api/download-report?token=XXX
 * Secure download endpoint for audit PDFs
 * Tokens expire after 24 hours
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // In production: lookup token in DB, check expiry, fetch PDF from storage
    // For test mode: return a mock PDF

    // Simulate token validation
    if (token.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate mock PDF
    const pdfContent = '%PDF-1.4\n' + 'x'.repeat(200000);
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    const buffer = await pdfBlob.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="aion-audit-${token.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
