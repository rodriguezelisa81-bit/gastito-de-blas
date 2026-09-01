const CATEGORIES = [
  "Bar",
  "Comida laburo",
  "Popi",
  "Gastos fijos",
  "Supermercado",
  "Otros",
];

const CURRENCIES = ["ARS", "USD"];
const KEY = "mis-gastos-v1";
const $ = (id) => document.getElementById(id);
let period = "week";

let data;
try {
  data = JSON.parse(localStorage.getItem(KEY) || '{"expenses":[],"incomes":[]}');
} catch {
  data = { expenses: [], incomes: [] };
}

data.expenses ??= [];
data.incomes ??= [];

// Conserva los datos de versiones anteriores y los adapta a las nuevas opciones.
data.expenses.forEach((item) => {
  item.currency ??= "ARS";
  if (item.category === "Comida del laburo") item.category = "Comida laburo";
  if (item.category === "Salidas") item.category = "Otros";
});
data.incomes.forEach((item) => { item.currency ??= "ARS"; });

const save = () => localStorage.setItem(KEY, JSON.stringify(data));
save();

function localToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function asDate(value) {
  return new Date(`${value}T00:00:00`);
}

function money(amount, currency) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(amount);
}

function matchesPeriod(item) {
  const itemDate = asDate(item.date);
  const now = new Date();
  if (period === "day") return itemDate.toDateString() === now.toDateString();
  if (period === "month") return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();

  const start = new Date(now);
  start.setDate(now.getDate() - (now.getDay() + 6) % 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return itemDate >= start && itemDate < end;
}

function sumByCurrency(items, predicate, currency) {
  return items
    .filter((item) => predicate(item) && item.currency === currency)
    .reduce((total, item) => total + Number(item.amount), 0);
}

function totals(items, predicate) {
  const values = CURRENCIES.map((currency) => ({
    currency,
    amount: sumByCurrency(items, predicate, currency),
  }));
  const present = values.filter((item) => item.amount !== 0);
  return (present.length ? present : [{ currency: "ARS", amount: 0 }])
    .map((item) => money(item.amount, item.currency))
    .join(" · ");
}

function balances() {
  return CURRENCIES.map((currency) => ({
    currency,
    amount:
      sumByCurrency(data.incomes, matchesPeriod, currency) -
      sumByCurrency(data.expenses, matchesPeriod, currency),
  }));
}

function renderDayMeter() {
  const today = new Date();
  const labels = ["L", "M", "X", "J", "V", "S", "D"];
  $("day-meter").innerHTML = labels.map((label, index) => {
    const currentIndex = (today.getDay() + 6) % 7;
    return `<div class="${index === currentIndex ? "active" : ""}"><i></i><span>${label}</span></div>`;
  }).join("");
}

function render() {
  const incomeTotal = totals(data.incomes, matchesPeriod);
  const expenseTotal = totals(data.expenses, matchesPeriod);
  const balanceText = balances()
    .filter((item) => item.amount !== 0)
    .map((item) => money(item.amount, item.currency))
    .join(" · ") || money(0, "ARS");

  $("income-total").textContent = incomeTotal;
  $("expense-total").textContent = expenseTotal;
  $("commission-total").textContent = totals(data.incomes, (item) => matchesPeriod(item) && item.type === "Comisión");
  $("balance-total").textContent = balanceText;
  $("period-total").textContent = expenseTotal;
  $("hero-label").textContent = { day: "Hoy", week: "Esta semana", month: "Este mes" }[period];

  const categoryRows = CATEGORIES.map((category) => {
    const text = totals(data.expenses, (item) => matchesPeriod(item) && item.category === category);
    const hasExpenses = data.expenses.some((item) => matchesPeriod(item) && item.category === category);
    return hasExpenses ? `<div class="category-row"><span>${category}</span><b>${text}</b></div>` : "";
  }).join("");
  $("category-summary").innerHTML = categoryRows || '<div class="empty-summary">Todavía no registraste gastos.</div>';

  const selectedFilter = $("filter-category").value;
  const movements = [
    ...data.expenses.map((item, index) => ({ ...item, label: item.category, sign: "−", kind: "expense", index })),
    ...data.incomes.map((item, index) => ({ ...item, label: item.type, sign: "+", kind: "income", index })),
  ]
    .filter((item) => selectedFilter === "Todas" || item.label === selectedFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  $("expenses-list").innerHTML = movements.map((item) => `
    <article class="movement ${item.kind === "income" ? "income" : ""}">
      <div class="movement-icon">${item.kind === "income" ? "↗" : "↘"}</div>
      <div class="movement-main"><strong>${item.sign} ${item.label}</strong><small>${item.date}${item.comment ? ` · ${item.comment}` : ""}</small></div>
      <b>${money(item.amount, item.currency)}</b>
      <button class="delete" type="button" data-kind="${item.kind}" data-index="${item.index}" aria-label="Eliminar movimiento">×</button>
    </article>
  `).join("") || '<p class="empty">Aún no hay movimientos.</p>';

  document.querySelectorAll(".delete").forEach((button) => {
    button.addEventListener("click", () => {
      const collection = button.dataset.kind === "income" ? data.incomes : data.expenses;
      collection.splice(Number(button.dataset.index), 1);
      save();
      render();
    });
  });
}

function updateCurrencySymbol(selectId, symbolId) {
  $(symbolId).textContent = $(selectId).value === "USD" ? "US$" : "$";
}

$("date").value = localToday();
$("income-date").value = localToday();
$("category").innerHTML = CATEGORIES.map((category) => `<option>${category}</option>`).join("");
$("filter-category").innerHTML = '<option>Todas</option><option>Sueldo</option><option>Comisión</option>' + CATEGORIES.map((category) => `<option>${category}</option>`).join("");

$("expense-currency").addEventListener("change", () => updateCurrencySymbol("expense-currency", "expense-symbol"));
$("income-currency").addEventListener("change", () => updateCurrencySymbol("income-currency", "income-symbol"));
$("filter-category").addEventListener("change", render);

$("expense-form").addEventListener("submit", (event) => {
  event.preventDefault();
  data.expenses.unshift({
    amount: Number($("amount").value),
    currency: $("expense-currency").value,
    category: $("category").value,
    date: $("date").value,
    comment: $("comment").value.trim(),
  });
  save();
  $("amount").value = "";
  $("comment").value = "";
  render();
});

$("income-form").addEventListener("submit", (event) => {
  event.preventDefault();
  data.incomes.unshift({
    amount: Number($("income-amount").value),
    currency: $("income-currency").value,
    type: $("income-type").value,
    date: $("income-date").value,
    comment: $("income-comment").value.trim(),
  });
  save();
  $("income-amount").value = "";
  $("income-comment").value = "";
  $("income-form").hidden = true;
  render();
});

document.querySelectorAll(".open-form").forEach((button) => {
  button.addEventListener("click", () => {
    const salary = button.dataset.form === "salary";
    $("income-type").value = salary ? "Sueldo" : "Comisión";
    $("income-form-title").textContent = salary ? "Cargar sueldo fijo" : "Cargar comisión";
    $("income-form").hidden = false;
    $("income-amount").focus();
  });
});

$("close-income").addEventListener("click", () => { $("income-form").hidden = true; });
document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    period = button.dataset.period;
    document.querySelectorAll("[data-period]").forEach((item) => item.classList.toggle("selected", item === button));
    render();
  });
});

renderDayMeter();
render();
