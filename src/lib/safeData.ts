import { safeDate, safeFormat, safeTime } from './dateUtils';

export { safeDate, safeFormat, safeTime };

export const safeArray = <T = any>(value: unknown): T[] => {
  return Array.isArray(value) ? value as T[] : [];
};

export const safeString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

export const safeNumber = (value: unknown, fallback = 0): number => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const safeBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return fallback;
  return Boolean(value);
};

export const safeObject = <T extends Record<string, any> = Record<string, any>>(value: unknown, fallback: T = {} as T): T => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as T : fallback;
};
