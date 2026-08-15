// lib/api/client.ts
export interface AppError {
  status: number;
  message: string;
  details?: any;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Core API Client for Frontend-to-BFF communication.
 *
 * All requests route through the Next.js BFF proxy at /api/proxy/*
 * The BFF proxy attaches the HttpOnly session cookie automatically.
 *
 * On 401: We throw an AppError and let the caller (auth-guard, component)
 * decide what to do. We do NOT do a global window.location redirect here
 * because that causes infinite loops when auth-guard itself calls this function.
 */
export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;

  // Route through BFF proxy unless the endpoint already starts with /api
  const url = new URL(
    endpoint.startsWith('/api') ? endpoint : `/api/proxy${endpoint}`,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const isFormData = customConfig.body instanceof FormData;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      ...headers,
    },
  };

  try {
    const response = await fetch(url.toString(), config);

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 422) {
        const error: AppError = {
          status: 422,
          message: 'Data Validation Error',
          details: data.detail,
        };
        return Promise.reject(error);
      }

      const error: AppError = {
        status: response.status,
        message: data.detail || data.message || 'An unexpected error occurred.',
      };
      return Promise.reject(error);
    }

    return data as T;
  } catch (error) {
    // Re-throw AppErrors as-is; wrap network errors
    if ((error as AppError).status !== undefined) {
      throw error;
    }
    console.error('API Client Execution Error:', error);
    throw error;
  }
}