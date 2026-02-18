const http = require("http");
const https = require("https");
const { URL } = require("url");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const REFRESH_MS = Number(process.env.REFRESH_MS || 10 * 60 * 1000);

const PERIODS = ["today", "week", "month", "quarter"];
const CATEGORY_ORDER = ["meme", "trend", "challenge"];

const CATEGORY_SUBREDDITS = {
  meme: ["hanguk", "korea", "memes", "dankmemes", "MemeEconomy"],
  trend: ["korea", "hanguk", "koreanfood", "kbeauty", "sneakers", "food"],
  challenge: ["kpop", "koreanvariety", "TikTokCringe", "dance"]
};

const KOREAN_SOURCE_HINTS = ["korea", "hanguk", "korean", "kpop", "kbeauty"];

const PERIOD_WEIGHT = {
  today: 1.0,
  week: 0.92,
  month: 0.85,
  quarter: 0.78
};

const PERIOD_DECAY = {
  today: 1,
  week: 3,
  month: 7,
  quarter: 15
};

const runtime = {
  snapshots: {
    today: null,
    week: null,
    month: null,
    quarter: null
  },
  refreshing: false,
  lastRefreshAt: 0,
  lastSuccessAt: 0,
  lastError: ""
};

function text(v) {
  return typeof v === "string" ? v : "";
}

function toPeriod(value) {
  return PERIODS.includes(value) ? value : "today";
}

function hasHangul(value) {
  return /[가-힣]/.test(text(value));
}

function isKoreanLeaningSubreddit(name) {
  const safe = text(name).toLowerCase();
  return KOREAN_SOURCE_HINTS.some((hint) => safe.includes(hint));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function formatPostedAt(createdUtc) {
  if (!createdUtc) return "";
  return new Date(createdUtc * 1000).toISOString();
}

function fetchJson(rawUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(rawUrl);
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      {
        method: "GET",
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (_) {
            reject(new Error("invalid_json_response"));
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(10000, () => req.destroy(new Error("request_timeout")));
    req.end();
  });
}

function scoreByPeriod(rawScore, createdUtc, period) {
  const ageHours = (Date.now() / 1000 - createdUtc) / 3600;
  const decay = PERIOD_DECAY[period] || 1;
  const weight = PERIOD_WEIGHT[period] || 1;
  return Math.max(1, Math.round((rawScore / (1 + ageHours / decay)) * weight));
}

function toBadge(index) {
  if (index === 0) return "new";
  if (index === 1) return "up";
  if (index === 2) return "keep";
  return "down";
}

function buildDetail(post) {
  const mediaType = post.is_video
    ? "video"
    : post.post_hint === "image"
      ? "image"
      : "text_or_link";

  return {
    summary: text(post.selftext).trim() || text(post.title),
    source: `r/${text(post.subreddit)}`,
    author: text(post.author) ? `u/${text(post.author)}` : "",
    postedAt: formatPostedAt(post.created_utc),
    domain: text(post.domain),
    mediaType,
    stats: {
      ups: post.ups || 0,
      comments: post.num_comments || 0
    }
  };
}

function linksFromPost(post) {
  const permalink = `https://www.reddit.com${post.permalink}`;
  return [
    { label: "원문 보기", url: permalink },
    { label: "원본 링크", url: post.url || permalink },
    { label: "서브레딧", url: `https://www.reddit.com/r/${post.subreddit}/` }
  ];
}

async function fetchSubredditHot(subreddit, limit = 25) {
  const endpoint = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`;
  const data = await fetchJson(endpoint, {
    "User-Agent": "meme-radar/0.2 (mobile-backend)"
  });
  return (data?.data?.children || []).map((c) => c.data).filter(Boolean);
}

async function collectCategory(category, period) {
  const subs = CATEGORY_SUBREDDITS[category] || [];
  const settled = await Promise.allSettled(subs.map((s) => fetchSubredditHot(s)));
  const posts = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  const dedupe = new Set();
  const ranked = posts
    .filter((p) => p && !p.stickied && p.title && p.id)
    .filter((post) => {
      const key = `${post.subreddit}_${post.id}`;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    })
    .map((post) => {
      const raw = (post.ups || 0) + (post.num_comments || 0) * 2;
      const periodScore = scoreByPeriod(raw, post.created_utc, period);
      const localeBoost = (hasHangul(post.title) ? 1.35 : 1) * (isKoreanLeaningSubreddit(post.subreddit) ? 1.2 : 1);
      return {
        id: `${category}-${post.id}`,
        category,
        title: post.title,
        reason: `좋아요 ${post.ups || 0}, 댓글 ${post.num_comments || 0}`,
        localeScore: Math.round(periodScore * localeBoost),
        score: {
          today: scoreByPeriod(raw, post.created_utc, "today"),
          week: scoreByPeriod(raw, post.created_utc, "week"),
          month: scoreByPeriod(raw, post.created_utc, "month"),
          quarter: scoreByPeriod(raw, post.created_utc, "quarter")
        },
        detail: buildDetail(post),
        links: linksFromPost(post)
      };
    })
    .sort((a, b) => b.localeScore - a.localeScore)
    .slice(0, 12)
    .map((item, index) => ({
      ...item,
      badge: toBadge(index)
    }))
    .map(({ localeScore, ...item }) => item);

  return ranked;
}

async function collectSnapshot(period) {
  const collected = await Promise.all(CATEGORY_ORDER.map((c) => collectCategory(c, period)));
  const items = collected.flat();
  if (!items.length) {
    throw new Error("no_external_sources_available");
  }
  return {
    updatedAt: Date.now(),
    period,
    items
  };
}

async function refreshPeriod(period) {
  const snapshot = await collectSnapshot(period);
  runtime.snapshots[period] = snapshot;
  runtime.lastSuccessAt = Date.now();
  return snapshot;
}

async function refreshAllPeriods() {
  if (runtime.refreshing) return;
  runtime.refreshing = true;
  runtime.lastRefreshAt = Date.now();

  try {
    const results = await Promise.allSettled(PERIODS.map((period) => refreshPeriod(period)));
    const rejected = results.filter((r) => r.status === "rejected");
    runtime.lastError = rejected.length ? rejected[0].reason?.message || "refresh_failed" : "";
  } catch (error) {
    runtime.lastError = String(error?.message || error);
  } finally {
    runtime.refreshing = false;
  }
}

function getHealth() {
  const periods = {};
  PERIODS.forEach((period) => {
    const snapshot = runtime.snapshots[period];
    periods[period] = {
      updatedAt: snapshot?.updatedAt || 0,
      itemCount: snapshot?.items?.length || 0
    };
  });

  return {
    ok: Boolean(runtime.lastSuccessAt),
    refreshing: runtime.refreshing,
    refreshMs: REFRESH_MS,
    lastRefreshAt: runtime.lastRefreshAt,
    lastSuccessAt: runtime.lastSuccessAt,
    lastError: runtime.lastError,
    periods
  };
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "bad_request" });
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (pathname === "/api/health") {
    sendJson(res, 200, getHealth());
    return;
  }

  if (pathname === "/api/snapshot" || pathname === "/api/v1/snapshot") {
    const period = toPeriod(url.searchParams.get("period"));
    const force = url.searchParams.get("force") === "1";

    try {
      if (force || !runtime.snapshots[period]) {
        await refreshPeriod(period);
      }
      const snapshot = runtime.snapshots[period];
      if (!snapshot) {
        sendJson(res, 503, { error: "snapshot_unavailable", period });
        return;
      }
      sendJson(res, 200, snapshot);
      return;
    } catch (error) {
      const fallback = runtime.snapshots[period];
      if (fallback) {
        sendJson(res, 200, fallback);
        return;
      }
      sendJson(res, 500, {
        error: "snapshot_failed",
        message: String(error?.message || error),
        period
      });
      return;
    }
  }

  sendJson(res, 404, {
    error: "not_found",
    message: "API endpoint only",
    endpoints: ["/api/health", "/api/snapshot", "/api/v1/snapshot"]
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Meme API server: http://${HOST}:${PORT}`);
  refreshAllPeriods().catch((error) => {
    runtime.lastError = String(error?.message || error);
  });
  setInterval(() => {
    refreshAllPeriods().catch((error) => {
      runtime.lastError = String(error?.message || error);
    });
  }, REFRESH_MS);
});

