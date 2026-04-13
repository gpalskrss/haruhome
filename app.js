(function () {
  "use strict";

  const STORAGE_KEY = "haruhome.transactions.v1";

  const CATEGORIES = {
    expense: [
      "식비",
      "카페/간식",
      "교통",
      "주거/통신",
      "생활용품",
      "의료/건강",
      "문화/여가",
      "쇼핑",
      "경조사",
      "기타",
    ],
    income: ["급여", "용돈", "보너스", "이자/투자", "환급", "기타"],
  };

  const formatter = new Intl.NumberFormat("ko-KR");
  const formatWon = (n) => `${formatter.format(n)}원`;

  const $ = (id) => document.getElementById(id);

  const els = {
    form: $("txForm"),
    type: $("type"),
    date: $("date"),
    category: $("category"),
    amount: $("amount"),
    memo: $("memo"),
    list: $("txList"),
    emptyMsg: $("emptyMsg"),
    totalIncome: $("totalIncome"),
    totalExpense: $("totalExpense"),
    balance: $("balance"),
    monthFilter: $("monthFilter"),
    clearMonth: $("clearMonth"),
    breakdown: $("categoryBreakdown"),
    breakdownEmpty: $("breakdownEmpty"),
    exportBtn: $("exportBtn"),
    resetBtn: $("resetBtn"),
  };

  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTransactions(txs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  }

  let transactions = loadTransactions();

  function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function currentMonth() {
    return todayISO().slice(0, 7);
  }

  function populateCategories() {
    const type = els.type.value;
    els.category.innerHTML = "";
    CATEGORIES[type].forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      els.category.appendChild(opt);
    });
  }

  function getFilteredTransactions() {
    const month = els.monthFilter.value;
    const filtered = month
      ? transactions.filter((t) => t.date.startsWith(month))
      : transactions.slice();
    filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    return filtered;
  }

  function render() {
    const monthForSummary = els.monthFilter.value || currentMonth();
    const monthTxs = transactions.filter((t) => t.date.startsWith(monthForSummary));

    const income = monthTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    els.totalIncome.textContent = formatWon(income);
    els.totalExpense.textContent = formatWon(expense);
    els.balance.textContent = formatWon(income - expense);

    const list = getFilteredTransactions();
    els.list.innerHTML = "";
    if (list.length === 0) {
      els.emptyMsg.classList.remove("hidden");
    } else {
      els.emptyMsg.classList.add("hidden");
      list.forEach((tx) => {
        const li = document.createElement("li");
        li.className = "tx-item";

        const info = document.createElement("div");
        info.className = "tx-info";
        const title = document.createElement("span");
        title.className = "tx-title";
        title.textContent = tx.memo
          ? `${tx.category} · ${tx.memo}`
          : tx.category;
        const meta = document.createElement("span");
        meta.className = "tx-meta";
        meta.textContent = `${tx.date} · ${tx.type === "income" ? "수입" : "지출"}`;
        info.appendChild(title);
        info.appendChild(meta);

        const amount = document.createElement("span");
        amount.className = `tx-amount ${tx.type}`;
        amount.textContent = `${tx.type === "income" ? "+" : "-"}${formatWon(tx.amount)}`;

        const del = document.createElement("button");
        del.type = "button";
        del.className = "tx-delete";
        del.setAttribute("aria-label", "삭제");
        del.textContent = "✕";
        del.addEventListener("click", () => deleteTx(tx.id));

        li.appendChild(info);
        li.appendChild(amount);
        li.appendChild(del);
        els.list.appendChild(li);
      });
    }

    renderBreakdown(monthTxs);
  }

  function renderBreakdown(monthTxs) {
    const expenses = monthTxs.filter((t) => t.type === "expense");
    els.breakdown.innerHTML = "";
    if (expenses.length === 0) {
      els.breakdownEmpty.classList.remove("hidden");
      return;
    }
    els.breakdownEmpty.classList.add("hidden");

    const totals = {};
    expenses.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    const grand = Object.values(totals).reduce((s, n) => s + n, 0);
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    rows.forEach(([cat, amt]) => {
      const pct = grand > 0 ? Math.round((amt / grand) * 100) : 0;
      const li = document.createElement("li");

      const row = document.createElement("div");
      row.className = "row";
      const name = document.createElement("span");
      name.textContent = `${cat} (${pct}%)`;
      const value = document.createElement("span");
      value.textContent = formatWon(amt);
      row.appendChild(name);
      row.appendChild(value);

      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("span");
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);

      li.appendChild(row);
      li.appendChild(bar);
      els.breakdown.appendChild(li);
    });
  }

  function addTx(e) {
    e.preventDefault();
    const type = els.type.value;
    const date = els.date.value;
    const category = els.category.value;
    const amount = Number(els.amount.value);
    const memo = els.memo.value.trim();

    if (!date || !category || !Number.isFinite(amount) || amount <= 0) {
      alert("날짜, 카테고리, 금액을 확인해 주세요.");
      return;
    }

    const tx = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      date,
      category,
      amount,
      memo,
      createdAt: Date.now(),
    };
    transactions.push(tx);
    saveTransactions(transactions);

    els.amount.value = "";
    els.memo.value = "";
    render();
  }

  function deleteTx(id) {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    if (!confirm("이 거래를 삭제할까요?")) return;
    transactions = transactions.filter((t) => t.id !== id);
    saveTransactions(transactions);
    render();
  }

  function resetAll() {
    if (!confirm("모든 데이터를 영구 삭제합니다. 계속할까요?")) return;
    transactions = [];
    saveTransactions(transactions);
    render();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(transactions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haruhome-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function init() {
    els.date.value = todayISO();
    els.monthFilter.value = currentMonth();
    populateCategories();

    els.type.addEventListener("change", populateCategories);
    els.form.addEventListener("submit", addTx);
    els.monthFilter.addEventListener("change", render);
    els.clearMonth.addEventListener("click", () => {
      els.monthFilter.value = "";
      render();
    });
    els.resetBtn.addEventListener("click", resetAll);
    els.exportBtn.addEventListener("click", exportJson);

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
