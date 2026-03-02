/**
 * POST /api/analyze
 * Bridges Next.js frontend to FastAPI IR-Parser backend
 * Accepts telemetry data and returns parsed IR analysis
 * Task 7: IR Parser microservice integration
 */

import { NextResponse } from 'next/server';
import { checkPayloadSize } from '@/lib/payload-limits';

export async function POST(request: Request) {
  try {
    // Check payload size limits
    const contentLength = request.headers.get('content-length');
    const sizeCheck = checkPayloadSize(contentLength, '/api/analyze');
    if (!sizeCheck.allowed) {
      return NextResponse.json(
        { error: sizeCheck.error || 'Payload too large' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { telemetry, workflowId, modelProviders, code } = body;

    if (!telemetry || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: telemetry, workflowId' },
        { status: 400 }
      );
    }

    // Get IR-Parser URL from environment
    const irParserUrl = process.env.IR_PARSER_URL;
    if (!irParserUrl) {
      console.warn('[API/Analyze] IR_PARSER_URL not configured, returning mock analysis');
      
      // Return mock analysis response for development
      return NextResponse.json({
        success: true,
        workflowId,
        analysis: {
          workflowComplexity: 'medium',
          criticalPaths: ['main_task', 'validation_loop'],
          parallelizationOpportunities: ['data_preparation', 'model_evaluation'],
          redundantOperations: [
            {
              operation: 'duplicate_validation',
              occurrences: 2,
              estimatedSavings: '10-15%',
            },
          ],
          memoryHotspots: [
            {
              location: 'data_aggregation',
              estimatedUsage: '512MB',
              recommendation: 'Stream data instead of loading in memory',
            },
          ],
        },
        latencyMs: 245,
      });
    }

    try {
      // Forward request to IR-Parser backend with timeout
      const startTime = Date.now();
      
      const response = await fetch(`${irParserUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Symphony-AION/1.0',
        },
        body: JSON.stringify({
          workflowId,
          code,
          telemetry,
          modelProviders: modelProviders || [],
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        console.error(
          `[API/Analyze] IR-Parser returned ${response.status}: ${response.statusText}`
        );
        return NextResponse.json(
          {
            error: `IR-Parser service error: ${response.statusText}`,
            latencyMs,
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json(
        {
          ...data,
          latencyMs,
        },
        { status: 200 }
      );
    } catch (irError) {
      const message =
        irError instanceof Error ? irError.message : 'Unknown IR-Parser error';
      console.error('[API/Analyze] IR-Parser request failed:', message);

      return NextResponse.json(
        {
          error: `Failed to connect to IR-Parser: ${message}`,
          success: false,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API/Analyze] Request processing failed:', message);

    return NextResponse.json(
      { error: `Failed to process analysis request: ${message}` },
      { status: 400 }
    );
  }
}

/**
 * GET /api/analyze/health
 * Health check for IR-Parser connectivity
 */
export async function GET(request: Request) {
  const irParserUrl = process.env.IR_PARSER_URL;

  if (!irParserUrl) {
    return NextResponse.json(
      {
        status: 'degraded',
        message: 'IR_PARSER_URL not configured',
      },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(`${irParserUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return NextResponse.json({ status: 'healthy' }, { status: 200 });
    } else {
      return NextResponse.json(
        { status: 'unhealthy', statusCode: response.status },
        { status: 200 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { status: 'unreachable', error: message },
      { status: 200 }
    );
  }
}
