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
 */
export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;
  
  const url = new URL(
    endpoint.startsWith('/api') ? endpoint : `/api/proxy${endpoint}`,
    typeof window !== 'undefined' ? window.location.origin : ''
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
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session_expired=true';
        }
        throw new Error('Unauthorized access. Session terminated.');
      }

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
        message: data.detail || data.message || 'An unexpected systemic error occurred.',
      };
      return Promise.reject(error);
    }

    return data as T;
  } catch (error) {
    console.error('API Client Execution Error:', error);
    throw error;
  }
}