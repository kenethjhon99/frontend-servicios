export const CURRENCY_SYMBOL = "$";

export const formatCurrency = (value) => {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${CURRENCY_SYMBOL}${safeAmount.toFixed(2)}`;
};

