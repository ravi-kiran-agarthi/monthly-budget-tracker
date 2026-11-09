import test from "node:test";
import assert from "node:assert/strict";
import { toCents, totals, budgetStatus, localDate } from "./budget.js";

test("amounts are converted exactly and invalid values are rejected", () => {
  assert.equal(toCents("0.29"), 29);
  assert.equal(toCents("1000000"), 100000000);
  for (const value of ["", "-1", "1.001", "1e2", "1000000.01"]) assert.equal(toCents(value), null);
});
test("totals are separated by category and invalid records ignored", () => {
  assert.deepEqual(totals([{ category: "food", amount: 125 }, { category: "coffee", amount: 300 }, { category: "food", amount: 75 }, { category: "other", amount: 400 }]), { food: 200, groceries: 0, coffee: 300, movies: 0 });
});
test("budget status distinguishes unset, exact, zero, and overspent", () => {
  assert.equal(budgetStatus(0, null).state, "unset");
  assert.equal(budgetStatus(100, 100).text, "$0.00 remaining");
  assert.equal(budgetStatus(0, 0).state, "within");
  assert.equal(budgetStatus(125, 100).text, "$0.25 over budget");
});
test("dates use local calendar components", () => {
  assert.equal(localDate(new Date(2026, 0, 2, 1)), "2026-01-02");
});
