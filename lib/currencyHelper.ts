export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateVsINR: number;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateVsINR: 1.0 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateVsINR: 83.5 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateVsINR: 90.5 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateVsINR: 106.0 },
};

/**
 * Format an invoice or client monetary amount in its assigned currency
 */
export function formatCurrency(amount: number, currencyStr?: string): string {
  const code = (currencyStr || 'INR').toUpperCase() as CurrencyCode;
  const cfg = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.INR;
  const formattedNumber = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${cfg.symbol}${formattedNumber}`;
}

export function formatInvoiceCurrency(amount: number, currencyStr?: string): string {
  return formatCurrency(amount, currencyStr);
}

export function getCurrencySymbol(currencyStr?: string): string {
  const code = (currencyStr || 'INR').toUpperCase() as CurrencyCode;
  const cfg = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.INR;
  return cfg.symbol;
}
