export function getInternalBackendUrl(): string {
  if (process.env.INTERNAL_BACKEND_URL) {
    return process.env.INTERNAL_BACKEND_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'http://backend:8000';
  }
  return 'http://127.0.0.1:8000';
}
