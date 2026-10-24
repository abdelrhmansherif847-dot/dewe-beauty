export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = "in" | "low" | "out";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

export function stockLabel(stock: number): string {
  const level = stockLevel(stock);
  if (level === "out") return "Sold out";
  if (level === "low") return `Only ${stock} left`;
  return "In stock";
}
