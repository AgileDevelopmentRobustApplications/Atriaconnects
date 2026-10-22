// Indian digit grouping, e.g. 3999 → "3,999" · 850000 → "8,50,000"
export const inr = (n) => Math.round(n).toLocaleString('en-IN')
