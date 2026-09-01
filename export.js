document.getElementById("export-data").addEventListener("click", () => {
  const saved = JSON.parse(localStorage.getItem("mis-gastos-v1") || '{"expenses":[],"incomes":[]}');
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const movements = [
    ...(saved.incomes || []).map((item) => ["Ingreso", item.date, item.type, item.amount, item.currency || "ARS", item.comment]),
    ...(saved.expenses || []).map((item) => ["Gasto", item.date, item.category, item.amount, item.currency || "ARS", item.comment]),
  ].sort((a, b) => b[1].localeCompare(a[1]));
  const rows = [["Tipo", "Fecha", "Categoría / entrada", "Importe", "Moneda", "Comentario"], ...movements];
  const blob = new Blob(["\ufeff" + rows.map((row) => row.map(quote).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gastito-de-blas-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});
