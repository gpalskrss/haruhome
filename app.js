import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEdG4qnNe-4ovgq832iKqscBfpdeO06qQ",
  authDomain: "haruhome-7a6e4.firebaseapp.com",
  projectId: "haruhome-7a6e4",
  storageBucket: "haruhome-7a6e4.firebasestorage.app",
  messagingSenderId: "308620007934",
  appId: "1:308620007934:web:6c995dfa3e2465cd6548af",
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);

(function () {
  "use strict";

  const STORAGE_KEY = "haruhome.transactions.v1";
  const HOLDINGS_KEY = "haruhome.holdings.v1";
  const HISTORY_KEY = "haruhome.netWorthHistory.v1";
  const GOALS_KEY = "haruhome.goals.v1";
  const EVENTS_KEY = "haruhome.events.v1";
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
    monthlyChart: $("monthlyChart"),
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
    signInBtn: $("signInBtn"),
    signOutBtn: $("signOutBtn"),
    authSignedIn: $("authSignedIn"),
    userAvatar: $("userAvatar"),
    userEmail: $("userEmail"),
    syncStatus: $("syncStatus"),
    calPrev: $("calPrev"),
    calNext: $("calNext"),
    calToday: $("calToday"),
    calTitle: $("calTitle"),
    calendarGrid: $("calendarGrid"),
    eventListTitle: $("eventListTitle"),
    eventForm: $("eventForm"),
    eventDate: $("eventDate"),
    eventCategory: $("eventCategory"),
    eventTitle: $("eventTitle"),
    eventTime: $("eventTime"),
    eventMemo: $("eventMemo"),
    eventRepeat: $("eventRepeat"),
    eventList: $("eventList"),
    eventEmpty: $("eventEmpty"),
  };

  let currentUser = null;
  let unsubscribeSnapshot = null;
  let pushTimer = null;
  let applyingRemote = false;

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
    schedulePush();
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
    schedulePush();
  }

  function loadHistory() {
    return loadArray(HISTORY_KEY);
  }

  function saveHistory(items) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    schedulePush();
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
    schedulePush();
  }

  function loadEvents() {
    return loadArray(EVENTS_KEY);
  }

  function saveEvents(items) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(items));
    schedulePush();
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
  let events = loadEvents();
  let uiState = loadUIState();
  let calendarViewMonth = null; // "YYYY-MM"
  let selectedDate = null; // "YYYY-MM-DD"

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
    renderCalendar();
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
    els.monthlyChart.innerHTML = "";
    if (transactions.length === 0) {
      els.monthlyOverviewEmpty.classList.remove("hidden");
      els.monthlyChart.setAttribute("viewBox", "0 0 100 100");
      return;
    }
    els.monthlyOverviewEmpty.classList.add("hidden");

    const byMonth = computeMonthlyTotals();
    const rows = Array.from(byMonth.entries())
      .map(([month, v]) => ({
        month,
        income: v.income,
        expense: v.expense,
        savings: v.income - v.expense,
      }))
      .sort((a, b) => (a.month < b.month ? -1 : 1))
      .slice(-12);

    drawMonthlyChart(rows);
  }

  function drawMonthlyChart(rows) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = els.monthlyChart;
    svg.innerHTML = "";

    const marginLeft = 60;
    const marginRight = 16;
    const marginTop = 16;
    const marginBottom = 36;
    const groupWidth = 64;
    const barWidth = 16;
    const barGap = 4;

    const chartHeight = 260;
    const chartWidth = Math.max(360, marginLeft + marginRight + groupWidth * rows.length);

    svg.setAttribute("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.width = `${chartWidth}px`;

    const plotWidth = chartWidth - marginLeft - marginRight;
    const plotHeight = chartHeight - marginTop - marginBottom;

    const maxPositive = Math.max(
      1,
      ...rows.map((r) => Math.max(r.income, r.expense, Math.max(0, r.savings)))
    );
    const minNegative = Math.min(0, ...rows.map((r) => r.savings));
    const domainTop = niceMax(maxPositive);
    const domainBottom = minNegative < 0 ? -niceMax(Math.abs(minNegative)) : 0;
    const domainRange = domainTop - domainBottom;

    const yFromValue = (v) =>
      marginTop + ((domainTop - v) / domainRange) * plotHeight;

    // Gridlines + labels (5 ticks)
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const v = domainTop - (domainRange * i) / ticks;
      const y = yFromValue(v);
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("class", "grid-line");
      line.setAttribute("x1", marginLeft);
      line.setAttribute("x2", chartWidth - marginRight);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
      svg.appendChild(line);

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("class", "axis-label");
      text.setAttribute("x", marginLeft - 8);
      text.setAttribute("y", y + 4);
      text.setAttribute("text-anchor", "end");
      text.textContent = shortWon(v);
      svg.appendChild(text);
    }

    // Zero line (if negative values exist)
    if (domainBottom < 0) {
      const zeroY = yFromValue(0);
      const zeroLine = document.createElementNS(svgNS, "line");
      zeroLine.setAttribute("x1", marginLeft);
      zeroLine.setAttribute("x2", chartWidth - marginRight);
      zeroLine.setAttribute("y1", zeroY);
      zeroLine.setAttribute("y2", zeroY);
      zeroLine.setAttribute("stroke", "#94a3b8");
      zeroLine.setAttribute("stroke-width", "1.5");
      svg.appendChild(zeroLine);
    }

    rows.forEach((r, idx) => {
      const groupX = marginLeft + idx * groupWidth + (groupWidth - (3 * barWidth + 2 * barGap)) / 2;

      const bars = [
        { cls: "bar-income", value: r.income, label: `${r.month} 수입\n${formatWon(r.income)}` },
        { cls: "bar-expense", value: r.expense, label: `${r.month} 지출\n${formatWon(r.expense)}` },
        {
          cls: `bar-savings${r.savings < 0 ? " negative" : ""}`,
          value: r.savings,
          label: `${r.month} 저축\n${formatWon(r.savings)}`,
        },
      ];

      bars.forEach((b, bi) => {
        const x = groupX + bi * (barWidth + barGap);
        const zeroY = yFromValue(0);
        const topY = yFromValue(Math.max(b.value, 0));
        const bottomY = yFromValue(Math.min(b.value, 0));
        const y = b.value >= 0 ? topY : zeroY;
        const h = Math.max(1, b.value >= 0 ? zeroY - topY : bottomY - zeroY);

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("class", `bar ${b.cls}`);
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", barWidth);
        rect.setAttribute("height", h);
        rect.setAttribute("rx", 2);

        const title = document.createElementNS(svgNS, "title");
        title.textContent = b.label;
        rect.appendChild(title);

        rect.addEventListener("click", () => {
          els.monthFilter.value = r.month;
          render();
          els.list.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        svg.appendChild(rect);
      });

      // Month label
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("class", "month-label");
      label.setAttribute("x", groupX + (3 * barWidth + 2 * barGap) / 2);
      label.setAttribute("y", chartHeight - marginBottom + 18);
      label.setAttribute("text-anchor", "middle");
      label.textContent = r.month.slice(2); // "YY-MM" 형식으로 축약
      svg.appendChild(label);
    });
  }

  function niceMax(value) {
    if (value <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / pow;
    let nice;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 2.5) nice = 2.5;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  }

  function shortWon(n) {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}억`;
    if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString("ko-KR")}만`;
    if (abs === 0) return "0";
    return `${sign}${abs.toLocaleString("ko-KR")}`;
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
    if (!confirm("거래 · 자산 · 추이 · 목표 · 일정 데이터를 모두 영구 삭제합니다. 계속할까요?")) return;
    transactions = [];
    holdings = [];
    history = [];
    goals = {};
    events = [];
    saveTransactions(transactions);
    saveHoldings(holdings);
    saveHistory(history);
    saveGoals(goals);
    saveEvents(events);
    render();
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      transactions,
      holdings,
      netWorthHistory: history,
      goals,
      events,
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

  function setSyncStatus(text, state) {
    els.syncStatus.textContent = text;
    els.syncStatus.classList.remove("synced", "syncing", "error");
    if (state) els.syncStatus.classList.add(state);
  }

  function applyRemoteData(data) {
    applyingRemote = true;
    try {
      transactions = Array.isArray(data.transactions) ? data.transactions : [];
      holdings = Array.isArray(data.holdings) ? data.holdings : [];
      history = Array.isArray(data.netWorthHistory) ? data.netWorthHistory : [];
      goals = data.goals && typeof data.goals === "object" ? data.goals : {};
      events = Array.isArray(data.events) ? data.events : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
      render();
    } finally {
      applyingRemote = false;
    }
  }

  function schedulePush() {
    if (!currentUser || applyingRemote) return;
    if (pushTimer) clearTimeout(pushTimer);
    setSyncStatus("저장 중…", "syncing");
    pushTimer = setTimeout(() => pushNow(currentUser.uid), 400);
  }

  async function pushNow(uid) {
    try {
      await setDoc(doc(firebaseDb, "userData", uid), {
        transactions,
        holdings,
        netWorthHistory: history,
        goals,
        events,
        updatedAt: new Date().toISOString(),
      });
      setSyncStatus("동기화됨", "synced");
    } catch (e) {
      console.error("Cloud sync failed:", e);
      setSyncStatus("저장 실패", "error");
    }
  }

  async function subscribeUserData(uid) {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    setSyncStatus("동기화 중…", "syncing");
    const ref = doc(firebaseDb, "userData", uid);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await pushNow(uid);
      } else {
        applyRemoteData(snap.data());
        setSyncStatus("동기화됨", "synced");
      }
    } catch (e) {
      console.error(e);
      setSyncStatus("동기화 실패", "error");
      return;
    }
    unsubscribeSnapshot = onSnapshot(
      ref,
      (s) => {
        if (!s.exists()) return;
        if (s.metadata.hasPendingWrites) return;
        applyRemoteData(s.data());
        setSyncStatus("동기화됨", "synced");
      },
      (err) => {
        console.error(err);
        setSyncStatus("연결 오류", "error");
      }
    );
  }

  function handleAuthChange(user) {
    currentUser = user;
    if (user) {
      els.signInBtn.hidden = true;
      els.authSignedIn.hidden = false;
      els.userEmail.textContent = user.displayName || user.email || "사용자";
      if (user.photoURL) els.userAvatar.src = user.photoURL;
      else els.userAvatar.removeAttribute("src");
      subscribeUserData(user.uid);
    } else {
      els.signInBtn.hidden = false;
      els.authSignedIn.hidden = true;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      setSyncStatus("", null);
    }
  }

  async function handleSignIn() {
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
      alert("로그인 실패: " + (e.message || e.code || ""));
    }
  }

  async function handleSignOut() {
    try {
      await signOut(firebaseAuth);
    } catch (e) {
      console.error(e);
    }
  }

  // ========== 일정 / 캘린더 ==========

  function getEventsForDate(dateISO) {
    const [y, m, d] = dateISO.split("-");
    const mmdd = `${m}-${d}`;
    return events.filter((e) => {
      if (!e || !e.date) return false;
      if (e.date === dateISO) return true;
      if (e.repeat === "yearly" && e.date.slice(5) === mmdd && e.date <= dateISO) {
        return true;
      }
      return false;
    });
  }

  function renderCalendar() {
    if (!calendarViewMonth) calendarViewMonth = currentMonth();
    const [yearStr, monthStr] = calendarViewMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr); // 1-12

    els.calTitle.textContent = `${year}년 ${month}월`;

    const firstDay = new Date(year, month - 1, 1);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    els.calendarGrid.innerHTML = "";

    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const today = todayISO();

    for (let i = 0; i < totalCells; i++) {
      const cellDayOffset = i - startWeekday;
      let cellYear = year;
      let cellMonth = month;
      let cellDay;
      let otherMonth = false;

      if (cellDayOffset < 0) {
        cellDay = daysInPrevMonth + cellDayOffset + 1;
        cellMonth = month - 1;
        if (cellMonth < 1) {
          cellMonth = 12;
          cellYear = year - 1;
        }
        otherMonth = true;
      } else if (cellDayOffset >= daysInMonth) {
        cellDay = cellDayOffset - daysInMonth + 1;
        cellMonth = month + 1;
        if (cellMonth > 12) {
          cellMonth = 1;
          cellYear = year + 1;
        }
        otherMonth = true;
      } else {
        cellDay = cellDayOffset + 1;
      }

      const cellDate = `${cellYear}-${String(cellMonth).padStart(2, "0")}-${String(cellDay).padStart(2, "0")}`;
      const weekday = i % 7;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day";
      if (otherMonth) cell.classList.add("other-month");
      if (weekday === 0) cell.classList.add("sunday");
      if (weekday === 6) cell.classList.add("saturday");
      if (cellDate === today) cell.classList.add("today");
      if (cellDate === selectedDate) cell.classList.add("selected");
      cell.dataset.date = cellDate;

      const num = document.createElement("span");
      num.className = "day-num";
      num.textContent = String(cellDay);
      cell.appendChild(num);

      const evs = getEventsForDate(cellDate);
      if (evs.length > 0) {
        const evContainer = document.createElement("div");
        evContainer.className = "day-events";
        const shown = evs.slice(0, 2);
        shown.forEach((e) => {
          const chip = document.createElement("span");
          chip.className = `cal-chip ${e.category || "기타"}`;
          chip.textContent = e.title;
          evContainer.appendChild(chip);
        });
        if (evs.length > shown.length) {
          const more = document.createElement("span");
          more.className = "cal-more";
          more.textContent = `+${evs.length - shown.length}`;
          evContainer.appendChild(more);
        }
        cell.appendChild(evContainer);
      }

      cell.addEventListener("click", () => selectDate(cellDate));
      els.calendarGrid.appendChild(cell);
    }

    renderEventList();
  }

  function selectDate(dateISO) {
    selectedDate = dateISO;
    els.eventDate.value = dateISO;
    // If clicked date is in a different month, switch the view
    const clickedMonth = dateISO.slice(0, 7);
    if (clickedMonth !== calendarViewMonth) {
      calendarViewMonth = clickedMonth;
    }
    renderCalendar();
  }

  function renderEventList() {
    els.eventList.innerHTML = "";
    if (!selectedDate) {
      els.eventListTitle.textContent = "날짜를 선택하세요";
      els.eventEmpty.classList.add("hidden");
      return;
    }

    const [y, m, d] = selectedDate.split("-");
    els.eventListTitle.textContent = `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;

    const evs = getEventsForDate(selectedDate)
      .slice()
      .sort((a, b) => {
        if (a.time && b.time) return a.time < b.time ? -1 : 1;
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
      });

    if (evs.length === 0) {
      els.eventEmpty.classList.remove("hidden");
      return;
    }
    els.eventEmpty.classList.add("hidden");

    const currentYear = Number(selectedDate.slice(0, 4));

    evs.forEach((e) => {
      const li = document.createElement("li");
      li.className = "tx-item";

      const info = document.createElement("div");
      info.className = "tx-info";

      const title = document.createElement("span");
      title.className = "tx-title";
      const tag = document.createElement("span");
      tag.className = `event-category-tag ${e.category || "기타"}`;
      tag.textContent = e.category || "기타";
      title.appendChild(tag);
      title.append(e.title);
      if (e.repeat === "yearly") {
        const originalYear = Number(e.date.slice(0, 4));
        const diff = currentYear - originalYear;
        const badge = document.createElement("span");
        badge.className = "event-repeat-badge";
        badge.textContent = diff > 0 ? `${diff}주년 · 매년` : "매년";
        title.appendChild(badge);
      }

      const meta = document.createElement("span");
      meta.className = "tx-meta";
      const parts = [];
      if (e.time) parts.push(e.time);
      if (e.memo) parts.push(e.memo);
      meta.textContent = parts.join(" · ") || "—";

      info.appendChild(title);
      info.appendChild(meta);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "tx-delete";
      del.setAttribute("aria-label", "삭제");
      del.textContent = "✕";
      del.addEventListener("click", () => deleteEvent(e.id));

      li.appendChild(info);
      li.appendChild(document.createElement("span")); // spacer
      li.appendChild(del);
      els.eventList.appendChild(li);
    });
  }

  function addEvent(e) {
    e.preventDefault();
    const date = els.eventDate.value;
    const title = els.eventTitle.value.trim();
    const category = els.eventCategory.value;
    const time = els.eventTime.value || "";
    const memo = els.eventMemo.value.trim();
    const repeat = els.eventRepeat.checked ? "yearly" : "none";

    if (!date || !title) {
      alert("날짜와 제목을 입력해 주세요.");
      return;
    }

    events.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      title,
      category,
      time,
      memo,
      repeat,
      createdAt: Date.now(),
    });
    saveEvents(events);

    els.eventTitle.value = "";
    els.eventTime.value = "";
    els.eventMemo.value = "";
    els.eventRepeat.checked = false;

    selectedDate = date;
    calendarViewMonth = date.slice(0, 7);
    renderCalendar();
  }

  function deleteEvent(id) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    if (!confirm(`"${ev.title}" 일정을 삭제할까요?`)) return;
    events = events.filter((e) => e.id !== id);
    saveEvents(events);
    renderCalendar();
  }

  function shiftMonth(delta) {
    if (!calendarViewMonth) calendarViewMonth = currentMonth();
    const [y, m] = calendarViewMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    calendarViewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    renderCalendar();
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

    els.signInBtn.addEventListener("click", handleSignIn);
    els.signOutBtn.addEventListener("click", handleSignOut);
    onAuthStateChanged(firebaseAuth, handleAuthChange);

    els.calPrev.addEventListener("click", () => shiftMonth(-1));
    els.calNext.addEventListener("click", () => shiftMonth(1));
    els.calToday.addEventListener("click", () => {
      calendarViewMonth = currentMonth();
      selectDate(todayISO());
    });
    els.eventForm.addEventListener("submit", addEvent);

    calendarViewMonth = currentMonth();
    selectedDate = todayISO();
    els.eventDate.value = selectedDate;

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
