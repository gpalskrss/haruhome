(function () {
  "use strict";

  const STORAGE_KEY = "haruhome.transactions.v1";
  const HOLDINGS_KEY = "haruhome.holdings.v1";
  const HISTORY_KEY = "haruhome.netWorthHistory.v1";
  const GOALS_KEY = "haruhome.goals.v1";
  const UI_KEY = "haruhome.ui.v1";

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
      "육아",
      "기타",
    ],
    income: [
      "급여(노현준)",
      "급여(김혜민)",
      "용돈",
      "보너스",
      "이자/투자",
      "환급",
      "기타",
    ],
  };

  const HOLDING_CATEGORIES = {
    asset: ["현금", "예금/적금", "주식/펀드", "부동산", "자동차", "기타"],
    liability: ["주택담보대출", "신용대출", "카드빚", "기타"],
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
    monthlyOverviewEmpty: $("monthlyOverviewEmpty"),
    monthlyTable: $("monthlyTable"),
    monthlyTableBody: $("monthlyTableBody"),
    monthlyTableFoot: $("monthlyTableFoot"),
    monthlyTotalIncome: $("monthlyTotalIncome"),
    monthlyTotalExpense: $("monthlyTotalExpense"),
    monthlyTotalSavings: $("monthlyTotalSavings"),
    monthlyTotalRate: $("monthlyTotalRate"),
    exportBtn: $("exportBtn"),
    resetBtn: $("resetBtn"),
    holdingForm: $("holdingForm"),
    holdingKind: $("holdingKind"),
    holdingCategory: $("holdingCategory"),
    holdingName: $("holdingName"),
    holdingAmount: $("holdingAmount"),
    holdingList: $("holdingList"),
    holdingEmpty: $("holdingEmpty"),
    totalAssets: $("totalAssets"),
    totalLiabilities: $("totalLiabilities"),
    netWorth: $("netWorth"),
    saveSnapshotBtn: $("saveSnapshotBtn"),
    deleteSnapshotBtn: $("deleteSnapshotBtn"),
    historyList: $("historyList"),
    historyEmpty: $("historyEmpty"),
    savingsRate: $("savingsRate"),
    goalYear: $("goalYear"),
    goalForm: $("goalForm"),
    goalAmount: $("goalAmount"),
    goalAccumulated: $("goalAccumulated"),
    goalTarget: $("goalTarget"),
    goalRemaining: $("goalRemaining"),
    goalPercent: $("goalPercent"),
    goalBarFill: $("goalBarFill"),
    goalHint: $("goalHint"),
    savingsRateList: $("savingsRateList"),
    savingsRateEmpty: $("savingsRateEmpty"),
    tabs: document.querySelectorAll(".tab-btn"),
    tabPanels: document.querySelectorAll(".tab-panel"),
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

  function loadArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function loadHoldings() {
    return loadArray(HOLDINGS_KEY);
  }

  function saveHoldings(items) {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(items));
  }

  function loadHistory() {
    return loadArray(HISTORY_KEY);
  }

  function saveHistory(items) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }

  function loadGoals() {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveGoals(obj) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(obj));
  }

  function loadUIState() {
    try {
      const raw = localStorage.getItem(UI_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveUIState(obj) {
    localStorage.setItem(UI_KEY, JSON.stringify(obj));
  }

  let transactions = loadTransactions();
  let holdings = loadHoldings();
  let history = loadHistory();
  let goals = loadGoals();
  let uiState = loadUIState();

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
    els.savingsRate.textContent = formatSavingsRate(income, expense);

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
    renderMonthlyOverview();
    renderHoldings();
    renderNetWorthHistory();
    renderGoalProgress();
    renderSavingsRateList();
  }

  function formatSavingsRate(income, expense) {
    if (income <= 0) return "--";
    const rate = ((income - expense) / income) * 100;
    return `${rate.toFixed(1)}%`;
  }

  function computeMonthlyTotals() {
    const byMonth = new Map();
    transactions.forEach((t) => {
      const m = t.date.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, { income: 0, expense: 0 });
      const row = byMonth.get(m);
      if (t.type === "income") row.income += t.amount;
      else if (t.type === "expense") row.expense += t.amount;
    });
    return byMonth;
  }

  function renderGoalProgress() {
    populateGoalYearOptions();
    const year = String(currentGoalYear());
    const target = Number(goals[year] || 0);

    const byMonth = computeMonthlyTotals();
    let accumulated = 0;
    byMonth.forEach((v, month) => {
      if (month.startsWith(`${year}-`)) {
        accumulated += v.income - v.expense;
      }
    });

    els.goalAmount.value = target > 0 ? String(target) : "";
    els.goalAccumulated.textContent = formatWon(accumulated);
    els.goalTarget.textContent = target > 0 ? formatWon(target) : "미설정";
    const remaining = target > 0 ? target - accumulated : 0;
    els.goalRemaining.textContent = target > 0 ? formatWon(Math.max(0, remaining)) : "--";

    if (target > 0) {
      const pct = Math.max(0, (accumulated / target) * 100);
      const capped = Math.min(100, pct);
      els.goalPercent.textContent = `${pct.toFixed(1)}%`;
      els.goalBarFill.style.width = `${capped}%`;
      els.goalBarFill.classList.toggle("complete", pct >= 100);
      if (pct >= 100) {
        els.goalHint.textContent = `🎉 ${year}년 목표 달성! 초과 저축: ${formatWon(accumulated - target)}`;
      } else {
        els.goalHint.textContent = `${year}년 목표까지 ${formatWon(target - accumulated)} 남았어요.`;
      }
    } else {
      els.goalPercent.textContent = "--";
      els.goalBarFill.style.width = "0%";
      els.goalBarFill.classList.remove("complete");
      els.goalHint.textContent = `${year}년 목표 금액을 입력하면 달성률이 표시됩니다.`;
    }
  }

  function currentGoalYear() {
    const saved = uiState.goalYear;
    if (saved) return Number(saved);
    return new Date().getFullYear();
  }

  function populateGoalYearOptions() {
    const now = new Date().getFullYear();
    const years = new Set();
    years.add(now);
    years.add(2026);
    transactions.forEach((t) => years.add(Number(t.date.slice(0, 4))));
    Object.keys(goals).forEach((y) => years.add(Number(y)));
    const sorted = Array.from(years).filter(Number.isFinite).sort((a, b) => b - a);

    const selected = String(currentGoalYear());
    els.goalYear.innerHTML = "";
    sorted.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = `${y}년`;
      if (String(y) === selected) opt.selected = true;
      els.goalYear.appendChild(opt);
    });
  }

  function renderSavingsRateList() {
    els.savingsRateList.innerHTML = "";
    const byMonth = computeMonthlyTotals();
    if (byMonth.size === 0) {
      els.savingsRateEmpty.classList.remove("hidden");
      return;
    }
    els.savingsRateEmpty.classList.add("hidden");

    const rows = Array.from(byMonth.entries())
      .map(([month, v]) => ({
        month,
        income: v.income,
        expense: v.expense,
        balance: v.income - v.expense,
      }))
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .slice(0, 12);

    rows.forEach((r) => {
      const li = document.createElement("li");

      const month = document.createElement("span");
      month.className = "mo-month";
      month.textContent = r.month;

      const rate = document.createElement("span");
      rate.className = "mo-income";
      rate.textContent = `저축률 ${formatSavingsRate(r.income, r.expense)}`;

      const savings = document.createElement("span");
      savings.className = "mo-expense";
      savings.textContent = `저축 ${formatWon(r.balance)}`;
      savings.style.color = r.balance < 0 ? "var(--expense)" : "var(--income)";

      const balance = document.createElement("span");
      balance.className = `mo-balance ${r.balance < 0 ? "negative" : "positive"}`;
      balance.textContent = `수입 ${formatWon(r.income)}`;

      li.appendChild(month);
      li.appendChild(rate);
      li.appendChild(savings);
      li.appendChild(balance);
      els.savingsRateList.appendChild(li);
    });
  }

  function saveGoal(e) {
    e.preventDefault();
    const year = String(currentGoalYear());
    const amount = Number(els.goalAmount.value);
    if (!Number.isFinite(amount) || amount < 0) {
      alert("0 이상의 금액을 입력해 주세요.");
      return;
    }
    if (amount === 0) {
      delete goals[year];
    } else {
      goals[year] = amount;
    }
    saveGoals(goals);
    renderGoalProgress();
  }

  function switchTab(tabName) {
    els.tabs.forEach((btn) => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.tabPanels.forEach((panel) => {
      const match = panel.dataset.tabPanel === tabName;
      panel.hidden = !match;
    });
    uiState.activeTab = tabName;
    saveUIState(uiState);
  }

  function renderMonthlyOverview() {
    els.monthlyTableBody.innerHTML = "";
    els.monthlyTableFoot.hidden = true;
    if (transactions.length === 0) {
      els.monthlyOverviewEmpty.classList.remove("hidden");
      els.monthlyTable.hidden = true;
      return;
    }
    els.monthlyOverviewEmpty.classList.add("hidden");
    els.monthlyTable.hidden = false;

    const byMonth = computeMonthlyTotals();
    const rows = Array.from(byMonth.entries())
      .map(([month, v]) => ({
        month,
        income: v.income,
        expense: v.expense,
        savings: v.income - v.expense,
      }))
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .slice(0, 12);

    let totalIncome = 0;
    let totalExpense = 0;

    rows.forEach((r) => {
      totalIncome += r.income;
      totalExpense += r.expense;

      const tr = document.createElement("tr");
      tr.title = "클릭하면 해당 월로 필터링합니다";

      const monthCell = document.createElement("td");
      monthCell.textContent = r.month;
      tr.appendChild(monthCell);

      const incomeCell = document.createElement("td");
      incomeCell.className = "num col-income";
      incomeCell.textContent = formatWon(r.income);
      tr.appendChild(incomeCell);

      const expenseCell = document.createElement("td");
      expenseCell.className = "num col-expense";
      expenseCell.textContent = formatWon(r.expense);
      tr.appendChild(expenseCell);

      const savingsCell = document.createElement("td");
      savingsCell.className = `num col-savings ${r.savings < 0 ? "negative" : "positive"}`;
      savingsCell.textContent = formatWon(r.savings);
      tr.appendChild(savingsCell);

      const rateCell = document.createElement("td");
      rateCell.className = `num col-rate${r.savings < 0 ? " negative" : ""}`;
      rateCell.textContent = formatSavingsRate(r.income, r.expense);
      tr.appendChild(rateCell);

      tr.addEventListener("click", () => {
        els.monthFilter.value = r.month;
        render();
        els.list.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      els.monthlyTableBody.appendChild(tr);
    });

    const totalSavings = totalIncome - totalExpense;
    els.monthlyTotalIncome.textContent = formatWon(totalIncome);
    els.monthlyTotalExpense.textContent = formatWon(totalExpense);
    els.monthlyTotalSavings.textContent = formatWon(totalSavings);
    els.monthlyTotalSavings.className = `num col-savings ${totalSavings < 0 ? "negative" : "positive"}`;
    els.monthlyTotalRate.textContent = formatSavingsRate(totalIncome, totalExpense);
    els.monthlyTableFoot.hidden = false;
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

  function populateHoldingCategories() {
    const kind = els.holdingKind.value;
    els.holdingCategory.innerHTML = "";
    HOLDING_CATEGORIES[kind].forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      els.holdingCategory.appendChild(opt);
    });
  }

  function computeHoldingTotals() {
    let assets = 0;
    let liabilities = 0;
    holdings.forEach((h) => {
      if (h.kind === "asset") assets += h.amount;
      else if (h.kind === "liability") liabilities += h.amount;
    });
    return { assets, liabilities, netWorth: assets - liabilities };
  }

  function renderHoldings() {
    const { assets, liabilities, netWorth } = computeHoldingTotals();
    els.totalAssets.textContent = formatWon(assets);
    els.totalLiabilities.textContent = formatWon(liabilities);
    els.netWorth.textContent = formatWon(netWorth);

    els.holdingList.innerHTML = "";
    if (holdings.length === 0) {
      els.holdingEmpty.classList.remove("hidden");
      return;
    }
    els.holdingEmpty.classList.add("hidden");

    const sorted = holdings.slice().sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "asset" ? -1 : 1;
      return b.amount - a.amount;
    });

    sorted.forEach((h) => {
      const li = document.createElement("li");
      li.className = "tx-item";

      const info = document.createElement("div");
      info.className = "tx-info";
      const title = document.createElement("span");
      title.className = "tx-title";
      title.textContent = h.name;
      const meta = document.createElement("span");
      meta.className = "tx-meta";
      meta.textContent = `${h.kind === "asset" ? "자산" : "부채"} · ${h.category}`;
      info.appendChild(title);
      info.appendChild(meta);

      const amount = document.createElement("span");
      amount.className = `tx-amount ${h.kind}`;
      amount.textContent = `${h.kind === "liability" ? "-" : ""}${formatWon(h.amount)}`;

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "tx-edit";
      edit.textContent = "수정";
      edit.addEventListener("click", () => toggleEditHolding(li, h, amount, edit));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "tx-delete";
      del.setAttribute("aria-label", "삭제");
      del.textContent = "✕";
      del.addEventListener("click", () => deleteHolding(h.id));

      li.appendChild(info);
      li.appendChild(amount);
      li.appendChild(edit);
      li.appendChild(del);
      els.holdingList.appendChild(li);
    });
  }

  function toggleEditHolding(li, holding, amountEl, editBtn) {
    if (editBtn.dataset.editing === "1") return;
    editBtn.dataset.editing = "1";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = String(holding.amount);
    input.className = "holding-amount-input";

    amountEl.replaceWith(input);
    editBtn.textContent = "저장";
    input.focus();
    input.select();

    const commit = () => {
      const next = Number(input.value);
      if (!Number.isFinite(next) || next < 0) {
        alert("올바른 금액을 입력해 주세요.");
        input.focus();
        return;
      }
      updateHoldingAmount(holding.id, next);
    };

    editBtn.onclick = commit;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        renderHoldings();
      }
    });
  }

  function renderNetWorthHistory() {
    els.historyList.innerHTML = "";
    if (history.length === 0) {
      els.historyEmpty.classList.remove("hidden");
      return;
    }
    els.historyEmpty.classList.add("hidden");

    const sorted = history.slice().sort((a, b) => (a.month < b.month ? -1 : 1));
    const recent = sorted.slice(-12);
    const maxAbs = Math.max(1, ...recent.map((r) => Math.abs(r.netWorth)));

    recent.forEach((row) => {
      const li = document.createElement("li");

      const month = document.createElement("span");
      month.className = "history-month";
      month.textContent = row.month;

      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("span");
      const pct = Math.round((Math.abs(row.netWorth) / maxAbs) * 100);
      fill.style.width = `${pct}%`;
      fill.className = row.netWorth < 0 ? "negative" : "positive";
      bar.appendChild(fill);

      const value = document.createElement("span");
      value.className = `history-value${row.netWorth < 0 ? " negative" : ""}`;
      value.textContent = formatWon(row.netWorth);

      li.appendChild(month);
      li.appendChild(bar);
      li.appendChild(value);
      els.historyList.appendChild(li);
    });
  }

  function addHolding(e) {
    e.preventDefault();
    const kind = els.holdingKind.value;
    const category = els.holdingCategory.value;
    const name = els.holdingName.value.trim();
    const amount = Number(els.holdingAmount.value);

    if (!category || !name || !Number.isFinite(amount) || amount < 0) {
      alert("카테고리, 이름, 금액을 확인해 주세요.");
      return;
    }

    holdings.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      category,
      name,
      amount,
      updatedAt: Date.now(),
    });
    saveHoldings(holdings);

    els.holdingName.value = "";
    els.holdingAmount.value = "";
    renderHoldings();
  }

  function updateHoldingAmount(id, next) {
    const h = holdings.find((x) => x.id === id);
    if (!h) return;
    h.amount = next;
    h.updatedAt = Date.now();
    saveHoldings(holdings);
    renderHoldings();
  }

  function deleteHolding(id) {
    const h = holdings.find((x) => x.id === id);
    if (!h) return;
    if (!confirm(`"${h.name}" 항목을 삭제할까요?`)) return;
    holdings = holdings.filter((x) => x.id !== id);
    saveHoldings(holdings);
    renderHoldings();
  }

  function saveMonthlySnapshot() {
    const month = currentMonth();
    const { assets, liabilities, netWorth } = computeHoldingTotals();
    const existingIdx = history.findIndex((r) => r.month === month);
    const record = { month, assets, liabilities, netWorth, savedAt: Date.now() };
    if (existingIdx >= 0) history[existingIdx] = record;
    else history.push(record);
    saveHistory(history);
    renderNetWorthHistory();
  }

  function deleteMonthlySnapshot() {
    const month = currentMonth();
    const idx = history.findIndex((r) => r.month === month);
    if (idx < 0) {
      alert("이번 달 스냅샷이 없어요.");
      return;
    }
    if (!confirm(`${month} 스냅샷을 삭제할까요?`)) return;
    history.splice(idx, 1);
    saveHistory(history);
    renderNetWorthHistory();
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
    if (!confirm("거래 · 자산 · 추이 · 목표 데이터를 모두 영구 삭제합니다. 계속할까요?")) return;
    transactions = [];
    holdings = [];
    history = [];
    goals = {};
    saveTransactions(transactions);
    saveHoldings(holdings);
    saveHistory(history);
    saveGoals(goals);
    render();
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      transactions,
      holdings,
      netWorthHistory: history,
      goals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
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

    populateHoldingCategories();
    els.holdingKind.addEventListener("change", populateHoldingCategories);
    els.holdingForm.addEventListener("submit", addHolding);
    els.saveSnapshotBtn.addEventListener("click", saveMonthlySnapshot);
    els.deleteSnapshotBtn.addEventListener("click", deleteMonthlySnapshot);

    els.tabs.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    switchTab(uiState.activeTab || "transactions");

    els.goalYear.addEventListener("change", () => {
      uiState.goalYear = els.goalYear.value;
      saveUIState(uiState);
      renderGoalProgress();
    });
    els.goalForm.addEventListener("submit", saveGoal);

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
