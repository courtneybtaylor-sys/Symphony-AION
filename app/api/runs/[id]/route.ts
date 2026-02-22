/**
 * GET /api/runs/[id]
 * Fetch a specific run by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { MOCK_RUNS } from '@/lib/mock-data';
import { ApiResponse, Run } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<Run>>> {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'Run ID is required',
          },
          timestamp: Date.now(),
        } as ApiResponse<Run>,
        { status: 400 },
      );
    }

    // Simulate lookup from mock data
    const run = MOCK_RUNS.find((r) => r.id === id);

    if (!run) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Run with ID "${id}" not found`,
          },
          timestamp: Date.now(),
        } as ApiResponse<Run>,
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: run,
        timestamp: Date.now(),
      } as ApiResponse<Run>,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
        timestamp: Date.now(),
      } as ApiResponse<Run>,
      { status: 500 },
    );
  }
}
