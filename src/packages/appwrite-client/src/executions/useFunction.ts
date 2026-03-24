import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAppwrite } from '../AppwriteProvider';
import { ExecutionMethod } from 'appwrite';
import { useRef } from 'react';

// Enhanced error type for better error handling in React Query
export interface AppwriteFunctionError extends Error {
  statusCode?: number;
  responseBody?: any;
  executionId?: string;
  functionId?: string;
  executionStatus?: string;
}

/**
 * Helper function to handle auto-redirect when location header is present
 */
const handleRedirectIfNeeded = async (responseHeaders: any[]) => {
  if (!responseHeaders || !Array.isArray(responseHeaders)) return;

  const locationHeader = responseHeaders.find(
    (header) => header.name && header.name.toLowerCase() === 'location'
  );

  if (locationHeader && locationHeader.value) {
    if (__DEV__) {
      console.log('Auto-redirecting to:', locationHeader.value);
    }

    try {
      if (typeof window !== 'undefined') {
        window.open(locationHeader.value, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open redirect URL:', error);
    }
  }
};

/**
 * Hook for executing Appwrite functions with proper React Query error handling
 * 
 * @param functionId The ID of the function to execute
 * @param options Additional options for the function execution
 * @param props Additional props to pass to React Query's useMutation
 * @returns A React Query mutation with enhanced error handling
 * 
 * @example
 * ```tsx
 * const generateImage = useFunction<{ prompt: string }, { imageUrl: string }>({
 *   functionId: 'image-generator'
 * });
 * 
 * const handleGenerate = () => {
 *   generateImage.mutate({ prompt: 'A beautiful landscape' }, {
 *     onError: (error) => {
 *       console.log('Status Code:', error.statusCode);
 *       console.log('Error Body:', error.responseBody);
 *       console.log('Execution ID:', error.executionId);
 *     }
 *   });
 * };
 * ```
 */
export function useFunction<TRequest, TResponse>({
  functionId,
  options = {},
  ...props
}: {
  functionId: string
  options?: {
    async?: boolean
    xpath?: string
    method?: ExecutionMethod
    headers?: Record<string, string>
  }
} & Omit<Parameters<typeof useMutation<TResponse, AppwriteFunctionError, TRequest, unknown>>[0], 'mutationFn'>): UseMutationResult<TResponse, AppwriteFunctionError, TRequest, unknown> {
  const params = {
    async: false, // IMPORTANT DO NOT CHANGE DEFAULT VALUE
    xpath: undefined,
    method: ExecutionMethod.POST,
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };
  const { functions } = useAppwrite();
  const { async, xpath, method, headers } = params;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mutation = useMutation<TResponse, AppwriteFunctionError, TRequest, unknown>({
    ...props,
    mutationFn: async (request: TRequest) => {
      const body = `${JSON.stringify(request)}`;
      const execution = await functions.createExecution({
        functionId,
        body,
        async,
        xpath,
        method,
        headers
      });

      if (execution.status === 'completed') {
        // handle responseHeaders if contains location
        await handleRedirectIfNeeded(execution.responseHeaders);
        const requestBody = JSON.parse(execution.responseBody || '{}');

        // Check for HTTP error status codes
        if (execution.responseStatusCode >= 400) {
          const errorMessage = requestBody?.message || requestBody?.error || 'Function execution failed';
          const error = new Error(errorMessage) as AppwriteFunctionError;
          // Add additional error context for React Query
          error.statusCode = execution.responseStatusCode;
          error.responseBody = requestBody;
          error.executionId = execution.$id;
          error.functionId = functionId;
          throw error;
        }

        // Return the already parsed response body
        return requestBody;
      } else if (execution.status === 'failed') {
        const error = new Error(execution.responseBody || 'Function execution failed') as AppwriteFunctionError;
        error.executionId = execution.$id;
        error.functionId = functionId;
        error.executionStatus = 'failed';
        throw error;
      }

      const response = await new Promise<TResponse>((resolve, reject) => {
        // Set a timeout to prevent indefinite waiting
        const timeout = setTimeout(
          () => {
            if (unsubscribeRef.current) {
              try {
                unsubscribeRef.current();
              } catch (error) {
                console.error('Failed to cleanup subscription on timeout:', error);
              }
            }
            const timeoutError = new Error(`Function execution timeout after 5 minutes`) as AppwriteFunctionError;
            timeoutError.executionId = execution.$id;
            timeoutError.functionId = functionId;
            reject(timeoutError);
          },
          1000 * 60 * 5
        ); // 5 minute timeout

        try {
          unsubscribeRef.current = functions.client.subscribe(
            `executions.${execution.$id}`,
            (event: any) => {
              try {
                const payload = event.payload as any;

                if (__DEV__) {
                  console.log('Execution event received:', payload.status);
                }

                switch (payload.status) {
                  case 'completed':
                    clearTimeout(timeout);
                    // Handle redirect if location header is present (non-blocking)
                    handleRedirectIfNeeded(payload.responseHeaders).catch((error) => {
                      console.error('Failed to handle redirect:', error);
                    });

                    try {
                      const parsedResponse = JSON.parse(payload.response);
                      
                      // Check for HTTP error status codes in async execution
                      if (payload.responseStatusCode >= 400) {
                        const errorMessage = parsedResponse?.message || parsedResponse?.error || 'Function execution failed';
                        const error = new Error(errorMessage) as AppwriteFunctionError;
                        error.statusCode = payload.responseStatusCode;
                        error.responseBody = parsedResponse;
                        error.executionId = execution.$id;
                        error.functionId = functionId;
                        reject(error);
                        return;
                      }
                      
                      resolve(parsedResponse);
                    } catch (error) {
                      reject(new Error('Invalid response format'));
                    }
                    break;
                  case 'failed':
                    clearTimeout(timeout);
                    const error = new Error(payload.response || 'Function execution failed') as AppwriteFunctionError;
                    error.executionStatus = 'failed';
                    error.executionId = execution.$id;
                    error.functionId = functionId;
                    reject(error);
                    break;
                }
              } catch (error) {
                clearTimeout(timeout);
                reject(error);
              }
            }
          );
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Cleanup subscription
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        } catch (error) {
          console.error('Failed to cleanup function execution subscription:', error);
        }
      }

      return response;
    },
  });

  return mutation;
}
