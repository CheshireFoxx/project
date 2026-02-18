const REFRESH_MS = 10 * 60 * 1000;
const API_BASE = "http://127.0.0.1:8787";
const THEME_STORAGE_KEY = "meme_theme_mode";

const CATEGORY_ORDER = ["meme", "trend", "challenge"];

const TAGS_BY_CATEGORY = {
  meme: ["원본", "재사용", "파생"],
  trend: ["가격", "구매처", "이유"],
  challenge: ["음원", "루틴", "난이도"]
};

const appState = {
  period: "today",
  category: "meme",
  search: "",
  snapshot: { updatedAt: Date.now(), items: [] },
  pendingLink: null,
  themeMode: "light"
};

const $statusTime = $("#status-time");
const $statusUpdated = $("#status-updated");
const $searchInput = $("#search-input");
const $slider = $(".slider");
const $slides = $(".slides");
const $dots = $(".dot");
const $rankingList = $("#ranking-list");
const $emptyState = $("#empty-state");
const $themeToggle = $("#theme-toggle");
const $sheet = $("#detail-sheet");
const $sheetTitle = $("#sheet-title");
const $sheetBody = $("#sheet-body");
const $sheetLinks = $("#sheet-links");
const $linkModal = $("#link-modal");
const $modalCancel = $("#modal-cancel");
const $modalConfirm = $("#modal-confirm");
const $selectTrigger = $(".select-trigger");
const $selectMenu = $(".select-menu");
const $selectOptions = $(".select-option");
const $selectValue = $(".select-value");
const $nativeSelect = $("#ranking-criteria");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatClock(ts) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatStamp(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function updateThemeLabel(mode) {
  $themeToggle.text(mode === "dark" ? "테마: 다크" : "테마: 라이트");
}

function applyTheme(mode) {
  appState.themeMode = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", appState.themeMode);
  localStorage.setItem(THEME_STORAGE_KEY, appState.themeMode);
  updateThemeLabel(appState.themeMode);
}

function nextThemeMode(mode) {
  return mode === "dark" ? "light" : "dark";
}

const DataSource = {
  async fetchSnapshot(period) {
    const response = await fetch(`${API_BASE}/api/snapshot?period=${encodeURIComponent(period)}`);
    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json();
        detail = payload?.message ? `: ${payload.message}` : "";
      } catch (_) {
        detail = "";
      }
      throw new Error(`HTTP ${response.status}${detail}`);
    }
    return await response.json();
  }
};

function badgeClass(value) {
  if (value === "new") return "new";
  if (value === "up") return "up";
  if (value === "down") return "down";
  return "keep";
}

function badgeText(value) {
  if (value === "new") return "NEW";
  if (value === "up") return "급상승";
  if (value === "down") return "하락";
  return "유지";
}

function getFilteredItems() {
  const query = appState.search.trim().toLowerCase();
  return appState.snapshot.items
    .filter((item) => item.category === appState.category)
    .filter((item) => {
      if (!query) return true;
      return `${item.title} ${item.reason}`.toLowerCase().includes(query);
    })
    .sort((a, b) => (Number(b?.score?.[appState.period]) || 0) - (Number(a?.score?.[appState.period]) || 0));
}

function renderRanking() {
  const list = getFilteredItems();
  const tags = TAGS_BY_CATEGORY[appState.category] || [];

  if (!list.length) {
    $rankingList.empty();
    $emptyState.removeClass("is-hidden");
    return;
  }

  $emptyState.addClass("is-hidden");
  $rankingList.html(
    list.map((item, idx) => `
      <article class="rank-card" data-id="${escapeHtml(item.id)}">
        <div class="rank-title">
          <div class="rank-left">
            <strong>${idx + 1}위 · ${escapeHtml(item.title)}</strong>
            <span class="badge ${badgeClass(item.badge)}">${badgeText(item.badge)}</span>
          </div>
        </div>
        <p class="rank-meta">이유: ${escapeHtml(item.reason)}</p>
        <div class="rank-tags">
          ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </article>
    `).join("")
  );
}

function setCategory(index) {
  const normalized = (index + CATEGORY_ORDER.length) % CATEGORY_ORDER.length;
  appState.category = CATEGORY_ORDER[normalized];
  $slider.attr("data-index", normalized);
  $slides.css("transform", `translateX(-${normalized * 100}%)`);
  $dots.removeClass("active");
  $dots.filter(`[data-index="${normalized}"]`).addClass("active");
  renderRanking();
}

function openDetail(item) {
  $sheetTitle.text(item.title);
  const detail = item.detail || {};
  const body = `
    <div>요약: ${escapeHtml(detail.summary || "")}</div>
    <div>출처: ${escapeHtml(detail.source || "")}</div>
    <div>작성자: ${escapeHtml(detail.author || "")}</div>
    <div>게시시각: ${escapeHtml(detail.postedAt || "")}</div>
    <div>도메인: ${escapeHtml(detail.domain || "")}</div>
    <div>형식: ${escapeHtml(detail.mediaType || "")}</div>
    <div>지표: 좋아요 ${escapeHtml(detail.stats?.ups ?? 0)}, 댓글 ${escapeHtml(detail.stats?.comments ?? 0)}</div>
  `;

  $sheetBody.html(body);
  $sheetLinks.html(item.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join(""));
  $sheet.addClass("active").attr("aria-hidden", "false");
}

function closeDetail() {
  $sheet.removeClass("active").attr("aria-hidden", "true");
}

function openModal(url) {
  appState.pendingLink = url;
  $linkModal.removeClass("is-hidden").attr("aria-hidden", "false");
}

function closeModal() {
  appState.pendingLink = null;
  $linkModal.addClass("is-hidden").attr("aria-hidden", "true");
}

function syncClock() {
  $statusTime.text(formatClock(Date.now()));
}

function syncUpdatedAt(prefix = "마지막 갱신") {
  $statusUpdated.text(`${prefix} ${formatStamp(appState.snapshot.updatedAt)}`);
}

async function refreshSnapshot() {
  try {
    appState.snapshot = await DataSource.fetchSnapshot(appState.period);
    syncUpdatedAt("마지막 갱신");
    renderRanking();
  } catch (_) {
    appState.snapshot = { updatedAt: Date.now(), items: [] };
    const msg = String(_.message || "");
    $statusUpdated.text(`외부 데이터 실패 (${msg || "unknown"})`);
    renderRanking();
  }
}

function bindEvents() {
  $(document).on("click", ".nav-btn", function () {
    const dir = $(this).data("dir");
    const current = Number($slider.attr("data-index"));
    setCategory(dir === "next" ? current + 1 : current - 1);
  });

  $(document).on("click", ".dot", function () {
    setCategory(Number($(this).data("index")));
  });

  $(document).on("click", ".rank-card", function () {
    const id = $(this).data("id");
    const item = appState.snapshot.items.find((x) => x.id === id);
    if (item) openDetail(item);
  });

  $("#sheet-close").on("click", closeDetail);

  $(document).on("click", "#sheet-links a", function (event) {
    event.preventDefault();
    openModal($(this).attr("href"));
  });

  $modalCancel.on("click", closeModal);
  $modalConfirm.on("click", function () {
    if (appState.pendingLink) window.open(appState.pendingLink, "_blank", "noopener");
    closeModal();
  });
  $linkModal.on("click", function (event) {
    if (event.target === this) closeModal();
  });

  $searchInput.on("input", function () {
    appState.search = $(this).val();
    renderRanking();
  });

  $(document).on("click", ".select-trigger", function () {
    const isOpen = $(this).hasClass("is-open");
    $selectTrigger.toggleClass("is-open", !isOpen).attr("aria-expanded", String(!isOpen));
    $selectMenu.toggleClass("is-hidden", isOpen);
  });

  $(document).on("click", ".select-option", async function () {
    const value = $(this).data("value");
    const label = $(this).text();
    appState.period = value;
    $selectOptions.removeClass("selected");
    $(this).addClass("selected");
    $selectValue.text(label);
    $nativeSelect.val(value);
    $selectTrigger.removeClass("is-open").attr("aria-expanded", "false");
    $selectMenu.addClass("is-hidden");
    await refreshSnapshot();
  });

  $(document).on("click", function (event) {
    if (!$(event.target).closest(".select-wrap").length) {
      $selectTrigger.removeClass("is-open").attr("aria-expanded", "false");
      $selectMenu.addClass("is-hidden");
    }
  });

  $themeToggle.on("click", function () {
    applyTheme(nextThemeMode(appState.themeMode));
  });
}

async function boot() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(savedTheme === "dark" ? "dark" : "light");
  bindEvents();
  syncClock();
  setCategory(0);
  await refreshSnapshot();
  setInterval(syncClock, 1000);
  setInterval(refreshSnapshot, REFRESH_MS);
}

boot();
