import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/apiClient';
import { parseApiError, type ParsedApiError } from '../lib/apiErrors';

interface UseFetchOptions {
  /**
   * Whether to fetch immediately on mount. Default: true
   */
  immediate?: boolean;
  /**
   * Dependencies that trigger a refetch when changed
   */
  deps?: unknown[];
}

interface UseFetchResult<T> {
  /** The fetched data, or null if not yet loaded */
  data: T | null;
  /** Whether the request is in progress */
  loading: boolean;
  /** The error, if any occurred */
  error: ParsedApiError | null;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Custom hook for data fetching with consistent error handling.
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useFetch<User[]>('/users');
 * 
 * if (loading) return <SkeletonList />;
 * if (error) return <ApiStateCard type="error" message={error.message} onRetry={refetch} />;
 * return <UserList users={data} />;
 * ```
 */
export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { immediate = true, deps = [] } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate && !!url);
  const [error, setError] = useState<ParsedApiError | null>(null);
  
  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);
  // AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(url, {
        signal: abortControllerRef.current.signal,
      });
      
      if (mountedRef.current) {
        // Handle both { data: [...] } and direct array responses
        const responseData = response.data?.data ?? response.data;
        setData(responseData as T);
        setError(null);
      }
    } catch (err) {
      // Don't set error state for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (err instanceof Error && err.name === 'CanceledError') {
        return;
      }
      
      if (mountedRef.current) {
        setError(parseApiError(err));
        setData(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [url]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, url, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearError,
  };
}

/**
 * Hook for fetching data with POST method (useful for search/filter APIs)
 */
export function usePostFetch<T, P = unknown>(
  url: string | null,
  payload: P | null,
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { immediate = true, deps = [] } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate && !!url);
  const [error, setError] = useState<ParsedApiError | null>(null);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post(url, payload, {
        signal: abortControllerRef.current.signal,
      });
      
      if (mountedRef.current) {
        const responseData = response.data?.data ?? response.data;
        setData(responseData as T);
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError')) {
        return;
      }
      
      if (mountedRef.current) {
        setError(parseApiError(err));
        setData(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, payload]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, url, JSON.stringify(payload), ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearError,
  };
}
