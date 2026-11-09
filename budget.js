export const categories = [
  { id: "food", label: "Food", icon: "🍽️" },
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "coffee", label: "Coffee", icon: "☕" },
  { id: "movies", label: "Movies", icon: "🎬" }
];

export function toCents(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 100000000 ? cents : null;
}

export function totals(expenses) {
  const result = Object.fromEntries(categories.map(({ id }) => [id, 0]));
  for (const expense of expenses) {
    if (Object.hasOwn(result, expense.category) && Number.isSafeInteger(expense.amount) && expense.amount > 0) {
      result[expense.category] += expense.amount;
    }
  }
  return result;
}

export function budgetStatus(spent, budget) {
  if (budget == null) return { text: "No budget set", state: "unset" };
  if (spent > budget) return { text: `${money(spent - budget)} over budget`, state: "over" };
  return { text: `${money(budget - spent)} remaining`, state: "within" };
}

export function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
