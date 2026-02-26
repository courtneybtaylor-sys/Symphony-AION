/**
 * useRunData Hook
 * Fetches run data from API and transforms it using buildRunViewModel()
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Run, RunViewModel, ApiResponse } from '@/lib/types';
import { buildRunViewModel } from '@/lib/telemetry';

interface UseRunDataOptions {
  pollInterval?: number; // Auto-poll interval in ms, null to disable
  onError?: (error: Error) => void;
  onSuccess?: (data: RunViewModel) => void;
}

interface UseRunDataState {
  data: RunViewModel | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch run data and transform it to view model
 */
export function useRunData(runId: string, options?: UseRunDataOptions): UseRunDataState {
  const [data, setData] = useState<RunViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRunData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/runs/${runId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch run: ${response.statusText}`);
      }

      const json = (await response.json()) as ApiResponse<Run>;

      if (!json.success || !json.data) {
        throw new Error(json.error?.message || 'Failed to fetch run data');
      }

      const viewModel = buildRunViewModel(json.data);
      setData(viewModel);
      options?.onSuccess?.(viewModel);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options?.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [runId, options]);

  // Initial fetch
  useEffect(() => {
    fetchRunData();
  }, [fetchRunData]);

  // Auto-polling
  useEffect(() => {
    if (!options?.pollInterval) {
      return;
    }

    const interval = setInterval(fetchRunData, options.pollInterval);
    return () => clearInterval(interval);
  }, [fetchRunData, options?.pollInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchRunData,
  };
}

/**
 * Hook to fetch multiple runs
 */
export function useRunDataBatch(
  runIds: string[],
  options?: UseRunDataOptions,
): {
  data: RunViewModel[];
  loading: boolean;
  errors: Map<string, Error>;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<RunViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const fetchBatchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrors(new Map());

      const results = await Promise.allSettled(
        runIds.map(async (id) => {
          const response = await fetch(`/api/runs/${id}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch run ${id}`);
          }
          const json = (await response.json()) as ApiResponse<Run>;
          if (!json.success || !json.data) {
            throw new Error(json.error?.message || `Failed to fetch run ${id}`);
          }
          return buildRunViewModel(json.data);
        }),
      );

      const viewModels: RunViewModel[] = [];
      const newErrors = new Map<string, Error>();

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          viewModels.push(result.value);
        } else {
          newErrors.set(runIds[index], result.reason);
        }
      });

      setData(viewModels);
      setErrors(newErrors);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      options?.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [runIds, options]);

  useEffect(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  return {
    data,
    loading,
    errors,
    refetch: fetchBatchData,
  };
}
