const REFRESH_MS = 10 * 60 * 1000;
const USE_MOCK_DATA = true;

const CATEGORY_ORDER = ["meme", "trend", "challenge"];
const CATEGORY_LABEL = {
  meme: "밈",
  trend: "유행",
  challenge: "챌린지"
};

const TAGS_BY_CATEGORY = {
  meme: ["원본", "재사용", "파생"],
  trend: ["가격", "구매처", "이유"],
  challenge: ["음원", "루틴", "난이도"]
};

const MOCK_TRAFFIC_SNAPSHOT = {
  updatedAt: Date.now(),
  items: [
    { id: "meme-1", category: "meme", title: "고양이 리액션 짤", reason: "감정 표현이 직관적", score: { today: 93, week: 84, month: 72, quarter: 65 }, badge: "new", detail: { summary: "댓글 반응짤로 재사용", origin: "국내 커뮤니티", format: "이미지/짤", usage: "댓글, 캡션" }, links: [{ label: "원본 이미지", url: "#" }, { label: "영상 보기", url: "#" }] },
    { id: "meme-2", category: "meme", title: "짧은 문구 밈", reason: "일상 공감 요소", score: { today: 88, week: 79, month: 76, quarter: 68 }, badge: "up", detail: { summary: "캡션 밈으로 확산", origin: "SNS", format: "텍스트", usage: "스토리, 댓글" }, links: [{ label: "원본 출처", url: "#" }, { label: "영상 보기", url: "#" }] },
    { id: "meme-3", category: "meme", title: "비교 짤 템플릿", reason: "커스터마이징이 쉬움", score: { today: 75, week: 78, month: 81, quarter: 79 }, badge: "keep", detail: { summary: "템플릿 기반 재생산", origin: "밈 커뮤니티", format: "템플릿", usage: "비교 패러디" }, links: [{ label: "템플릿", url: "#" }, { label: "영상 모음", url: "#" }] },

    { id: "trend-1", category: "trend", title: "미니 실루엣 자켓", reason: "셀럽 착용 반복 노출", score: { today: 92, week: 91, month: 86, quarter: 73 }, badge: "up", detail: { summary: "착용 스냅으로 급상승", price: "12~18만원", where: "브랜드몰/편집숍", people: "A 배우, B 아이돌" }, links: [{ label: "구매 링크", url: "#" }, { label: "리뷰 영상", url: "#" }] },
    { id: "trend-2", category: "trend", title: "두바이 쫀득쿠키", reason: "푸드 숏폼 확산", score: { today: 90, week: 88, month: 82, quarter: 70 }, badge: "new", detail: { summary: "먹방 후기 중심 확산", price: "2.5~4.0만원", where: "팝업/베이커리", people: "푸드 크리에이터" }, links: [{ label: "구매 링크", url: "#" }, { label: "후기 영상", url: "#" }] },
    { id: "trend-3", category: "trend", title: "빈티지 스니커즈", reason: "리셀 커뮤니티 재점화", score: { today: 70, week: 74, month: 85, quarter: 90 }, badge: "down", detail: { summary: "재출시 후 검색량 상승", price: "24~32만원", where: "리셀/공식몰", people: "스트릿 브랜드" }, links: [{ label: "판매처", url: "#" }, { label: "리뷰 영상", url: "#" }] },

    { id: "challenge-1", category: "challenge", title: "5초 손동작 챌린지", reason: "진입 난이도가 낮음", score: { today: 95, week: 90, month: 80, quarter: 66 }, badge: "new", detail: { summary: "숏폼 반복 노출", sound: "리믹스 사운드", how: "손동작 3단계", difficulty: "쉬움" }, links: [{ label: "원본 챌린지", url: "#" }, { label: "영상 예시", url: "#" }] },
    { id: "challenge-2", category: "challenge", title: "리믹스 댄스 챌린지", reason: "음원과 동작 결합", score: { today: 87, week: 89, month: 84, quarter: 77 }, badge: "up", detail: { summary: "댄스 릴스 중심 확산", sound: "90s 리믹스", how: "8카운트 루틴", difficulty: "보통" }, links: [{ label: "챌린지 영상", url: "#" }, { label: "원곡 정보", url: "#" }] },
    { id: "challenge-3", category: "challenge", title: "사운드 밈 챌린지", reason: "짤과 결합 확산", score: { today: 72, week: 76, month: 79, quarter: 81 }, badge: "keep", detail: { summary: "짧은 리액션 사운드 재사용", sound: "3초 클립", how: "표정/대사 싱크", difficulty: "쉬움" }, links: [{ label: "원본 사운드", url: "#" }, { label: "클립 보기", url: "#" }] }
  ]
};

const appState = {
  period: "today",
  category: "meme",
  search: "",
  snapshot: { updatedAt: Date.now(), items: [] },
  pendingLink: null
};

const $statusTime = $("#status-time");
const $statusUpdated = $("#status-updated");
const $searchInput = $("#search-input");
const $slider = $(".slider");
const $slides = $(".slides");
const $dots = $(".dot");
const $metaSummary = $("#meta-summary");
const $metaCount = $("#meta-count");
const $rankingList = $("#ranking-list");
const $emptyState = $("#empty-state");

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

function formatClock(ts) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatStamp(ts) {
  const value = new Date(ts);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  const hh = String(value.getHours()).padStart(2, "0");
  const mm = String(value.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const DataSource = {
  async fetchSnapshot() {
    if (USE_MOCK_DATA) {
      return {
        updatedAt: Date.now(),
        items: MOCK_TRAFFIC_SNAPSHOT.items
      };
    }

    // TODO: 실제 API/트래픽 수집 연동 지점
    // 1) 서버 API 호출
    // 2) 응답 스키마를 { updatedAt, items }로 매핑
    // 3) 실패 시 재시도/에러 처리
    throw new Error("API 연동이 아직 구현되지 않았습니다.");
  }
};

function getFilteredItems() {
  const query = appState.search.trim().toLowerCase();
  return appState.snapshot.items
    .filter((item) => item.category === appState.category)
    .filter((item) => {
      if (!query) return true;
      const target = `${item.title} ${item.reason}`.toLowerCase();
      return target.includes(query);
    })
    .sort((a, b) => b.score[appState.period] - a.score[appState.period]);
}

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

function renderRanking() {
  const list = getFilteredItems();
  const tags = TAGS_BY_CATEGORY[appState.category];

  $metaSummary.text(`기준: ${$selectValue.text()} · ${CATEGORY_LABEL[appState.category]}`);
  $metaCount.text(`${list.length}개`);

  if (!list.length) {
    $rankingList.empty();
    $emptyState.removeClass("is-hidden");
    return;
  }

  $emptyState.addClass("is-hidden");
  const html = list.map((item, idx) => `
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
  `).join("");

  $rankingList.html(html);
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

  let body = "";
  if (item.category === "meme") {
    body = `
      <div>요약: ${escapeHtml(item.detail.summary)}</div>
      <div>출처: ${escapeHtml(item.detail.origin)}</div>
      <div>형식: ${escapeHtml(item.detail.format)}</div>
      <div>사용 맥락: ${escapeHtml(item.detail.usage)}</div>
    `;
  }
  if (item.category === "trend") {
    body = `
      <div>요약: ${escapeHtml(item.detail.summary)}</div>
      <div>가격대: ${escapeHtml(item.detail.price)}</div>
      <div>구매처: ${escapeHtml(item.detail.where)}</div>
      <div>관련 인물: ${escapeHtml(item.detail.people)}</div>
    `;
  }
  if (item.category === "challenge") {
    body = `
      <div>요약: ${escapeHtml(item.detail.summary)}</div>
      <div>음원: ${escapeHtml(item.detail.sound)}</div>
      <div>루틴: ${escapeHtml(item.detail.how)}</div>
      <div>난이도: ${escapeHtml(item.detail.difficulty)}</div>
    `;
  }

  $sheetBody.html(body);
  $sheetLinks.html(
    item.links
      .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`)
      .join("")
  );
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

function syncUpdatedAt() {
  $statusUpdated.text(`마지막 갱신 ${formatStamp(appState.snapshot.updatedAt)}`);
}

async function refreshSnapshot() {
  try {
    const snapshot = await DataSource.fetchSnapshot();
    appState.snapshot = snapshot;
    syncUpdatedAt();
    renderRanking();
  } catch (error) {
    $statusUpdated.text("갱신 실패");
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
    const item = appState.snapshot.items.find((value) => value.id === id);
    if (item) openDetail(item);
  });

  $("#sheet-close").on("click", closeDetail);

  $(document).on("click", "#sheet-links a", function (event) {
    event.preventDefault();
    openModal($(this).attr("href"));
  });

  $modalCancel.on("click", closeModal);
  $modalConfirm.on("click", function () {
    if (appState.pendingLink) {
      window.open(appState.pendingLink, "_blank", "noopener");
    }
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

  $(document).on("click", ".select-option", function () {
    const value = $(this).data("value");
    const label = $(this).text();
    appState.period = value;
    $selectOptions.removeClass("selected");
    $(this).addClass("selected");
    $selectValue.text(label);
    $nativeSelect.val(value);
    $selectTrigger.removeClass("is-open").attr("aria-expanded", "false");
    $selectMenu.addClass("is-hidden");
    renderRanking();
  });

  $(document).on("click", function (event) {
    if (!$(event.target).closest(".select-wrap").length) {
      $selectTrigger.removeClass("is-open").attr("aria-expanded", "false");
      $selectMenu.addClass("is-hidden");
    }
  });
}

async function boot() {
  bindEvents();
  syncClock();
  await refreshSnapshot();
  setInterval(syncClock, 1000);
  setInterval(refreshSnapshot, REFRESH_MS);
}

boot();
