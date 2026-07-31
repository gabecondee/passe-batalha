import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um número grande em forma abreviada (ex: 1.230 → 1,2k, 1.250.000 → 1,2M).
 * Usar apenas para exibição visual; manter o valor real para cálculos.
 */
export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const scaled = abs / 1_000_000;
    return sign + formatCompactDecimal(scaled) + 'M';
  }

  if (abs >= 1_000) {
    const scaled = abs / 1_000;
    return sign + formatCompactDecimal(scaled) + 'k';
  }

  return sign + abs.toLocaleString('pt-BR');
}

function formatCompactDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Formata um valor monetário grande em forma abreviada (ex: R$ 1,2k, R$ 1,2M).
 * Usar apenas para exibição visual; manter o valor real para cálculos.
 */
export function formatCompactCurrency(value: number): string {
  return `R$ ${formatCompactNumber(value)}`;
}
