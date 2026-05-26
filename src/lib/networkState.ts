export const VISNOVA_NETWORK_ERROR_EVENT = 'visnova:network-error';

function stringifyError(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name} ${value.message} ${value.stack || ''}`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [
      record.name,
      record.message,
      record.details,
      record.hint,
      record.code,
      record.statusText
    ].filter(Boolean).join(' ');
  }
  return '';
}

export function isLikelyNetworkError(value: unknown) {
  const text = stringifyError(value).toLowerCase();
  if (!text) return false;

  return [
    'failed to fetch',
    'fetch failed',
    'networkerror',
    'network error',
    'load failed',
    'err_network',
    'err_internet_disconnected',
    'err_connection',
    'internet connection',
    'offline',
    'temporarily unavailable',
    'failed to fetch dynamically imported module',
    'importing a module script failed'
  ].some((needle) => text.includes(needle));
}

export function notifyNetworkIssue(reason?: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VISNOVA_NETWORK_ERROR_EVENT, { detail: reason }));
}
