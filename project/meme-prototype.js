const rankingData = {
  meme: [
    {
      id: "meme-1",
      title: "1위 · 고양이 리액션 짤",
      summary: "댓글 반응짤로 재사용",
      reason: "감정 표현이 직관적",
      origin: "국내 커뮤니티",
      format: "이미지/짤",
      usage: "댓글 반응, 캡션",
      people: "커뮤니티 밈",
      links: [
        { label: "원본 이미지", url: "#" },
        { label: "사용 예시", url: "#" },
        { label: "영상 보기", url: "#" }
      ]
    },
    {
      id: "meme-2",
      title: "2위 · 짧은 문구 밈",
      summary: "캡션 밈으로 확산",
      reason: "일상 공감 요소",
      origin: "SNS 캡션",
      format: "문구/텍스트",
      usage: "스토리/댓글",
      people: "SNS 밈",
      links: [
        { label: "원본 출처", url: "#" },
        { label: "영상 보기", url: "#" }
      ]
    },
    {
      id: "meme-3",
      title: "3위 · 비교 짤 템플릿",
      summary: "템플릿 기반 재생산",
      reason: "쉽게 커스터마이징 가능",
      origin: "밈 커뮤니티",
      format: "템플릿",
      usage: "비교/패러디",
      people: "밈 커뮤니티",
      links: [
        { label: "템플릿", url: "#" },
        { label: "원본", url: "#" },
        { label: "영상 모음", url: "#" }
      ]
    }
  ],
  trend: [
    {
      id: "trend-1",
      title: "1위 · 미니 실루엣 자켓",
      summary: "셀럽 착용 후 스냅 사진이 급상승",
      reason: "인플루언서 3명이 동시에 착용",
      price: "12~18만원대",
      where: "편집숍/브랜드몰",
      people: "A 배우 · B 아이돌",
      links: [
        { label: "구매 링크", url: "#" },
        { label: "착용 사진", url: "#" },
        { label: "리뷰 영상", url: "#" }
      ]
    },
    {
      id: "trend-2",
      title: "2위 · 두바이 쫀득쿠키",
      summary: "먹방 영상에서 급상승",
      reason: "리뷰 콘텐츠 확산",
      price: "2.5~4.0만원",
      where: "베이커리/팝업",
      people: "푸드 크리에이터",
      links: [
        { label: "구매 링크", url: "#" },
        { label: "리뷰 요약", url: "#" },
        { label: "후기 영상", url: "#" }
      ]
    },
    {
      id: "trend-3",
      title: "3위 · 빈티지 스니커즈",
      summary: "한정판 재출시 후 검색량 상승",
      reason: "리셀 커뮤니티에서 화제",
      price: "24~32만원",
      where: "리셀/공식몰",
      people: "스트릿 브랜드",
      links: [
        { label: "판매처", url: "#" },
        { label: "출처", url: "#" },
        { label: "리뷰 영상", url: "#" }
      ]
    }
  ],
  challenge: [
    {
      id: "challenge-1",
      title: "1위 · 5초 손동작 챌린지",
      summary: "쇼츠/릴스에서 반복 노출",
      reason: "간단한 동작이 따라 하기 쉬움",
      sound: "리믹스 사운드",
      how: "손동작 3단계",
      difficulty: "쉬움",
      people: "크리에이터 A",
      links: [
        { label: "원본 챌린지", url: "#" },
        { label: "사용 음원", url: "#" },
        { label: "영상 예시", url: "#" }
      ]
    },
    {
      id: "challenge-2",
      title: "2위 · 리믹스 댄스 챌린지",
      summary: "댄스 영상에서 급상승",
      reason: "리믹스 음원과 세트로 확산",
      sound: "90s 리믹스",
      how: "8카운트 루틴",
      difficulty: "보통",
      people: "댄서 팀 B",
      links: [
        { label: "챌린지 영상", url: "#" },
        { label: "원곡 정보", url: "#" },
        { label: "영상 모음", url: "#" }
      ]
    },
    {
      id: "challenge-3",
      title: "3위 · 사운드 밈 챌린지",
      summary: "짧은 리액션 사운드 재사용",
      reason: "짤과 결합되어 확산",
      sound: "3초 리액션 사운드",
      how: "표정/대사 싱크",
      difficulty: "쉬움",
      people: "유튜버 C",
      links: [
        { label: "원본 사운드", url: "#" },
        { label: "사용 예시", url: "#" },
        { label: "클립 보기", url: "#" }
      ]
    }
  ]
};

const $slides = $(".slides");
const $slider = $(".slider");
const $dots = $(".dot");
const $rankingList = $("#ranking-list");
const $sheet = $("#detail-sheet");
const $sheetTitle = $("#sheet-title");
const $sheetBody = $("#sheet-body");
const $sheetLinks = $("#sheet-links");
const $linkModal = $("#link-modal");
const $modalConfirm = $("#modal-confirm");
const $modalCancel = $("#modal-cancel");
const $selectTrigger = $(".select-trigger");
const $selectMenu = $(".select-menu");
const $selectOptions = $(".select-option");
const $selectValue = $(".select-value");
const $nativeSelect = $("#ranking-criteria");
let pendingLink = null;

function renderRanking(category) {
  const items = rankingData[category];
  const tagMap = {
    meme: ["원본", "유행 이유", "사용 예시"],
    trend: ["가격", "구매처", "유행 이유"],
    challenge: ["음원", "루틴", "난이도"]
  };
  const badgeMap = {
    meme: ["NEW", "급상승", "유지"],
    trend: ["급상승", "NEW", "하락"],
    challenge: ["NEW", "급상승", "유지"]
  };
  const html = items.map((item, index) => `
    <div class="rank-card" data-id="${item.id}" data-category="${category}">
      <div class="rank-title">
        <div class="rank-left">
          <span>${index + 1}위 · ${item.title.split("·")[1].trim()}</span>
          <span class="badge ${badgeMap[category][index] === "NEW" ? "new" : badgeMap[category][index] === "급상승" ? "up" : badgeMap[category][index] === "하락" ? "down" : ""}">${badgeMap[category][index]}</span>
        </div>
        <span>${index === 0 ? "🔥" : index === 1 ? "↗" : "↔"}</span>
      </div>
      <div class="rank-meta">유행 이유: ${item.reason}</div>
      <div class="rank-tags">
        ${tagMap[category].map((label) => `<span class="tag">${label}</span>`).join("")}
      </div>
    </div>
  `).join("");
  $rankingList.html(html);
}

function setSlide(index) {
  const clamped = (index + 3) % 3;
  $slider.attr("data-index", clamped);
  $slides.css("transform", `translateX(-${clamped * 100}%)`);
  $dots.removeClass("active");
  $dots.filter(`[data-index='${clamped}']`).addClass("active");
  const category = ["meme", "trend", "challenge"][clamped];
  renderRanking(category);
}

function openSheet(item) {
  const category = item.id.split("-")[0];
  $sheetTitle.text(item.title);
  if (category === "meme") {
    $sheetBody.html(`
      <div>요약: ${item.summary}</div>
      <div>유행 이유: ${item.reason}</div>
      <div>형식: ${item.format}</div>
      <div>출처: ${item.origin}</div>
      <div>사용 맥락: ${item.usage}</div>
    `);
  } else if (category === "trend") {
    $sheetBody.html(`
      <div>요약: ${item.summary}</div>
      <div>유행 이유: ${item.reason}</div>
      <div>가격대: ${item.price}</div>
      <div>구매/접근: ${item.where}</div>
      <div>관련 인물: ${item.people}</div>
    `);
  } else {
    $sheetBody.html(`
      <div>요약: ${item.summary}</div>
      <div>유행 이유: ${item.reason}</div>
      <div>사용 음원: ${item.sound}</div>
      <div>루틴: ${item.how}</div>
      <div>난이도: ${item.difficulty}</div>
    `);
  }
  $sheetLinks.html(item.links.map((link) => `
    <a href="${link.url}" target="_blank" rel="noopener">${link.label}</a>
  `).join(""));
  $sheet.addClass("active").attr("aria-hidden", "false");
}

$(document).on("click", ".nav-btn", function () {
  const dir = $(this).data("dir");
  const current = parseInt($slider.attr("data-index"), 10);
  setSlide(dir === "next" ? current + 1 : current - 1);
});

$(document).on("click", ".dot", function () {
  setSlide(parseInt($(this).data("index"), 10));
});

$(document).on("click", ".rank-card", function () {
  const category = $(this).data("category") || ["meme", "trend", "challenge"][parseInt($slider.attr("data-index"), 10)];
  const id = $(this).data("id");
  const item = rankingData[category].find((entry) => entry.id === id);
  if (item) {
    openSheet(item);
  }
});

$("#sheet-close").on("click", function () {
  $sheet.removeClass("active").attr("aria-hidden", "true");
});

$(document).on("click", "#sheet-links a", function (event) {
  event.preventDefault();
  pendingLink = $(this).attr("href");
  $linkModal.removeClass("is-hidden").attr("aria-hidden", "false");
});

function closeModal() {
  $linkModal.addClass("is-hidden").attr("aria-hidden", "true");
  pendingLink = null;
}

$modalCancel.on("click", closeModal);

$modalConfirm.on("click", function () {
  if (pendingLink) {
    window.open(pendingLink, "_blank", "noopener");
  }
  closeModal();
});

$linkModal.on("click", function (event) {
  if (event.target === this) {
    closeModal();
  }
});


$(document).on("click", ".select-trigger", function () {
  const isOpen = $(this).hasClass("is-open");
  $selectTrigger.toggleClass("is-open", !isOpen).attr("aria-expanded", String(!isOpen));
  $selectMenu.toggleClass("is-hidden", isOpen);
});

$(document).on("click", ".select-option", function () {
  const value = $(this).data("value");
  const label = $(this).text();
  $selectOptions.removeClass("selected");
  $(this).addClass("selected");
  $selectValue.text(label);
  $nativeSelect.val(value);
  $selectTrigger.removeClass("is-open").attr("aria-expanded", "false");
  $selectMenu.addClass("is-hidden");
});

$(document).on("click", function (event) {
  if (!$(event.target).closest(".select-wrap").length) {
    $selectTrigger.removeClass("is-open").attr("aria-expanded", "false");
    $selectMenu.addClass("is-hidden");
  }
});

setSlide(0);
