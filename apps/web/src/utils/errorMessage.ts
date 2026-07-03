import type { AxiosError } from 'axios';

interface ApiErrorData {
  error?: string;
  code?: string;
  message?: string;
}

/**
 * Extract a user-friendly error message from an Axios error response.
 */
export function getErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiErrorData>;

  if (!axiosErr.response) {
    return 'Unable to connect. Please check your connection.';
  }

  const { status, data } = axiosErr.response;

  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return data?.error ?? 'A conflict occurred. Please try again.';

  return data?.error ?? data?.message ?? 'An unexpected error occurred.';
}
