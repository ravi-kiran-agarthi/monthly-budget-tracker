import { firebaseConfig } from "./config.js";
import { categories, toCents, totals, budgetStatus, money, localDate } from "./budget.js";

const $ = id => document.getElementById(id);
const message = (text, error = false) => {
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
};
const theme = $("theme");
try { theme.value = localStorage.getItem("theme") || "system"; } catch {}
theme.addEventListener("change", () => {
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
  try { localStorage.setItem("theme", theme.value); } catch {}
});

for (const category of categories) {
  const label = document.createElement("label");
  label.textContent = `${category.icon} ${category.label} (USD)`;
  const input = document.createElement("input");
  input.type = "number"; input.min = "0"; input.max = "1000000"; input.step = "0.01";
  input.inputMode = "decimal"; input.id = `budget-${category.id}`;
  label.append(input); $("budget-inputs").append(label);
  const option = document.createElement("option");
  option.value = category.id; option.textContent = category.label;
  $("category").append(option);
}

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  $("setup").hidden = false;
} else {
  start().catch(error => message(`Could not initialize the site: ${error.message}`, true));
}

async function start() {
  const [{ initializeApp }, authApi, dbApi] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authApi.getAuth(app);
  const db = dbApi.getFirestore(app);
  let user = null, budgets = {}, expenses = [], unsubscribe = [], generation = 0;
  let budgetLoaded = false, expensesLoaded = false;
  const today = localDate();
  $("month").value = today.slice(0, 7);
  $("date").value = today;

  function report(error) {
    console.error(error);
    message(error.message || "An unexpected error occurred.", true);
  }
  async function run(button, action) {
    button.disabled = true;
    message("");
    try { await action(); } catch (error) { report(error); }
    finally { button.disabled = false; }
  }
  function refs() {
    const month = $("month").value;
    return {
      month,
      doc: dbApi.doc(db, "users", user.uid, "months", month),
      expenses: dbApi.collection(db, "users", user.uid, "months", month, "expenses")
    };
  }
  function render() {
    if (!budgetLoaded || !expensesLoaded) return;
    const spent = totals(expenses);
    $("cards").replaceChildren();
    let totalSpent = 0, totalBudget = 0, configured = 0;
    for (const { id, label, icon } of categories) {
      const amount = spent[id], budget = budgets[id] ?? null;
      totalSpent += amount;
      if (budget !== null) { totalBudget += budget; configured++; }
      const status = budgetStatus(amount, budget);
      const card = document.createElement("article"); card.className = "card";
      const title = document.createElement("h3"); title.textContent = `${icon} ${label}`;
      const numbers = document.createElement("p"); numbers.className = "numbers";
      numbers.textContent = `${money(amount)} / ${budget === null ? "Not set" : money(budget)}`;
      const progress = document.createElement("progress");
      progress.max = budget > 0 ? budget : 1;
      progress.value = budget > 0 ? Math.min(amount, budget) : (amount > 0 && budget === 0 ? 1 : 0);
      progress.setAttribute("aria-label", `${label}: ${money(amount)} spent${budget === null ? ", no budget set" : ` of ${money(budget)} budget`}`);
      if (status.state === "over") progress.className = "over";
      if (budget === null) progress.hidden = true;
      const detail = document.createElement("p");
      detail.className = status.state === "over" ? "bad" : status.state === "within" ? "good" : "muted";
      detail.textContent = status.text;
      card.append(title, numbers, progress, detail); $("cards").append(card);
    }
    $("summary").textContent = `${money(totalSpent)} spent${configured === categories.length ? ` of ${money(totalBudget)} allocated` : ` · ${configured} of ${categories.length} budgets set`}`;
    $("expenses").replaceChildren();
    if (!expenses.length) {
      const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "No expenses for this month yet.";
      $("expenses").append(empty);
    }
    for (const expense of [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))) {
      const row = document.createElement("div"); row.className = "expense";
      const details = document.createElement("div");
      const title = document.createElement("p");
      const category = categories.find(item => item.id === expense.category);
      title.textContent = `${category?.icon || ""} ${category?.label || "Unknown"}${expense.note ? ` · ${expense.note}` : ""}`;
      const date = document.createElement("p"); date.className = "muted"; date.textContent = expense.date;
      details.append(title, date);
      const amount = document.createElement("span"); amount.className = "amount"; amount.textContent = money(expense.amount);
      const remove = document.createElement("button"); remove.className = "text"; remove.textContent = "Delete";
      remove.setAttribute("aria-label", `Delete ${category?.label || "expense"} on ${expense.date} for ${money(expense.amount)}`);
      remove.addEventListener("click", () => {
        if (confirm("Delete this expense?")) run(remove, () => dbApi.deleteDoc(dbApi.doc(refs().expenses, expense.id)));
      });
      row.append(details, amount, remove); $("expenses").append(row);
    }
  }
  function loadMonth() {
    generation++;
    const current = generation;
    unsubscribe.forEach(stop => stop()); unsubscribe = [];
    budgetLoaded = false; expensesLoaded = false; budgets = {}; expenses = [];
    $("cards").replaceChildren(); $("expenses").replaceChildren();
    $("summary").textContent = "Loading month…";
    for (const { id } of categories) $(`budget-${id}`).value = "";
    const selected = $("month").value;
    $("date").value = selected === today.slice(0, 7) ? today : `${selected}-01`;
    const currentRefs = refs();
    unsubscribe.push(dbApi.onSnapshot(currentRefs.doc, snapshot => {
      if (current !== generation) return;
      budgets = snapshot.exists() ? snapshot.data().budgets || {} : {};
      for (const { id } of categories) $(`budget-${id}`).value = budgets[id] == null ? "" : (budgets[id] / 100).toFixed(2);
      budgetLoaded = true; render();
    }, error => { if (current === generation) { $("summary").textContent = "Could not load budgets."; report(error); } }));
    unsubscribe.push(dbApi.onSnapshot(currentRefs.expenses, snapshot => {
      if (current !== generation) return;
      expenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      expensesLoaded = true; render();
    }, error => { if (current === generation) { $("summary").textContent = "Could not load expenses."; report(error); } }));
  }
  authApi.onAuthStateChanged(auth, next => {
    generation++; unsubscribe.forEach(stop => stop()); unsubscribe = [];
    user = next; $("app").hidden = !user; $("auth").hidden = !!user;
    message("");
    if (user) { $("user-email").textContent = user.email; loadMonth(); }
  }, report);
  $("auth-form").addEventListener("submit", event => {
    event.preventDefault();
    run(event.submitter, () => authApi.signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value));
  });
  $("signup").addEventListener("click", event => {
    if (!$("email").reportValidity() || !$("password").reportValidity()) return;
    run(event.currentTarget, () => authApi.createUserWithEmailAndPassword(auth, $("email").value.trim(), $("password").value));
  });
  $("reset").addEventListener("click", event => {
    if (!$("email").reportValidity()) return;
    run(event.currentTarget, async () => {
      await authApi.sendPasswordResetEmail(auth, $("email").value.trim());
      message("If an account exists for this email, a password reset email has been sent.");
    });
  });
  $("signout").addEventListener("click", event => run(event.currentTarget, () => authApi.signOut(auth)));
  $("month").addEventListener("change", () => { if ($("month").value && user) { message(""); loadMonth(); } });
  $("budget-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!budgetLoaded || !expensesLoaded) { message("Wait for the month to finish loading.", true); return; }
    const next = {};
    for (const { id, label } of categories) {
      const value = $(`budget-${id}`).value;
      if (value === "") continue;
      const cents = toCents(value);
      if (cents === null) { message(`Enter a valid ${label} budget from $0 to $1,000,000 with at most two decimal places.`, true); return; }
      next[id] = cents;
    }
    const target = refs().doc;
    run(event.submitter, async () => { await dbApi.setDoc(target, { budgets: next }); message("Budgets saved."); });
  });
  $("expense-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!budgetLoaded || !expensesLoaded) { message("Wait for the month to finish loading.", true); return; }
    const amount = toCents($("amount").value);
    const target = refs();
    if (amount === null || amount <= 0) { message("Enter an amount from $0.01 to $1,000,000 with at most two decimal places.", true); return; }
    if (!$("date").value.startsWith(`${target.month}-`)) { message("The expense date must be in the selected month.", true); return; }
    const expense = { category: $("category").value, amount, date: $("date").value, note: $("note").value.trim() };
    run(event.submitter, async () => {
      await dbApi.addDoc(target.expenses, expense);
      $("amount").value = ""; $("note").value = ""; message("Expense added.");
    });
  });
}
