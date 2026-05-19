import type { CurrencyCode } from '../types';

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, { code: CurrencyCode; symbol: string; label: string; locale: string }> = {
  INR: { code: 'INR', symbol: '₹', label: 'Indian Rupee', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', label: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', label: 'British Pound', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', label: 'Japanese Yen', locale: 'ja-JP' },
  AUD: { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', locale: 'en-CA' },
  SGD: { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', locale: 'en-SG' },
  AED: { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', locale: 'en-AE' },
};

export const CURRENCY_OPTIONS = Object.values(SUPPORTED_CURRENCIES).map(currency => ({
  value: currency.code,
  label: `${currency.code} - ${currency.symbol} ${currency.label}`,
}));

export function normalizeCurrencyCode(value?: string | null): CurrencyCode {
  const code = String(value || 'INR').trim().toUpperCase();
  return code in SUPPORTED_CURRENCIES ? (code as CurrencyCode) : 'INR';
}

export function formatCurrency(amount?: number | null, currencyCode?: string | null) {
  const currency = normalizeCurrencyCode(currencyCode);
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  try {
    return new Intl.NumberFormat(SUPPORTED_CURRENCIES[currency].locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 0,
    }).format(safeAmount);
  } catch {
    return `${SUPPORTED_CURRENCIES[currency].symbol}${Math.round(safeAmount).toLocaleString('en-IN')}`;
  }
}
