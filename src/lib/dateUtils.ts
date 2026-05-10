import { format } from 'date-fns';

export const safeTime = (
  value?: string | number | Date | null,
  fallback: number = Date.now()
): number => {
  if (value === null || value === undefined || value === '') return fallback;

  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();

  return Number.isFinite(time) ? time : fallback;
};

export const safeDate = (
  value?: string | number | Date | null,
  fallback: Date = new Date()
): Date => {
  if (value === null || value === undefined || value === '') return fallback;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : fallback;
};

export const safeFormat = (
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback: string = 'Unknown date'
): string => {
  if (value === null || value === undefined || value === '') return fallback;

  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) return fallback;

  try {
    return format(date, pattern);
  } catch {
    return fallback;
  }
};
