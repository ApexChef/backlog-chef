/**
 * Currency conversion utility for AI cost estimation
 *
 * All AI provider pricing is in USD, so we convert to EUR and other currencies.
 * Exchange rates are approximate and should be updated periodically.
 */

import { Currency } from '../providers/base';

/**
 * Exchange rates relative to USD (1 USD = X currency)
 * Updated: January 2025
 *
 * Note: These are approximate rates. For production, consider using a live
 * exchange rate API like exchangerate-api.com or ECB API.
 */
const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92, // 1 USD ≈ 0.92 EUR
  GBP: 0.79, // 1 USD ≈ 0.79 GBP
};

/**
 * Convert USD amount to target currency
 * @param usdAmount Amount in USD
 * @param targetCurrency Target currency
 * @returns Converted amount
 */
export function convertFromUSD(usdAmount: number, targetCurrency: Currency): number {
  const rate = EXCHANGE_RATES[targetCurrency];
  if (!rate) {
    throw new Error(`Unsupported currency: ${targetCurrency}`);
  }
  return usdAmount * rate;
}

/**
 * Get exchange rate for a currency
 * @param currency Currency code
 * @returns Exchange rate (1 USD = X currency)
 */
export function getExchangeRate(currency: Currency): number {
  const rate = EXCHANGE_RATES[currency];
  if (!rate) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return rate;
}

/**
 * Get all supported currencies
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.keys(EXCHANGE_RATES) as Currency[];
}

/**
 * Format currency amount for display
 * @param amount Amount to format
 * @param currency Currency code
 * @returns Formatted string (e.g., "€0.0023" or "$0.0025")
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] || currency;

  // For very small amounts (API costs), show more decimal places
  if (amount < 0.01) {
    return `${symbol}${amount.toFixed(6)}`;
  }

  return `${symbol}${amount.toFixed(4)}`;
}

/**
 * Update exchange rates (for future use with live API)
 * @param rates New exchange rates
 */
export function updateExchangeRates(rates: Partial<Record<Currency, number>>): void {
  for (const [currency, rate] of Object.entries(rates)) {
    if (currency in EXCHANGE_RATES) {
      EXCHANGE_RATES[currency as Currency] = rate;
    }
  }
}
