const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = "127.0.0.1";
const PORT = 8787;
const ROOT = __dirname;

const CATEGORY_SUBREDDITS = {
  meme: ["memes", "dankmemes", "MemeEconomy"],
  trend: ["streetwear", "fashion", "food", "sneakers"],
  challenge: ["challenges", "dance", "TikTokCringe"]
};

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

const CONTENT_TYPE = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function text(v) {
  return typeof v === "string" ? v : "";
}

function formatPostedAt(createdUtc) {
  if (!createdUtc) return "";
  return new Date(createdUtc * 1000).toISOString();
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = CONTENT_TYPE[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
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

function sanitizePath(urlPathname) {
  const normalized = path.normalize(urlPathname).replace(/^(\.\.[\/\\])+/, "");
  return path.join(ROOT, normalized === "/" ? "meme-prototype.html" : normalized);
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

function buildDetail(category, post) {
  const mediaType = post.is_video
    ? "video"
    : post.post_hint === "image"
      ? "image"
      : "text_or_link";

  const base = {
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

  if (category === "meme") return base;
  if (category === "trend") return base;
  return {
    ...base
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

async function fetchSubredditHot(subreddit, limit = 20) {
  const endpoint = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`;
  const data = await fetchJson(endpoint, {
    "User-Agent": "meme-radar/0.1 (free-source-prototype)"
  });
  return data.data.children.map((c) => c.data);
}

async function fetchWikipediaSummary(query) {
  const openSearchUrl = `https://ko.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`;
  const openSearch = await fetchJson(openSearchUrl, {
    "User-Agent": "meme-radar/0.1 (free-source-prototype)"
  }).catch(() => null);
  if (!openSearch) return null;
  const bestTitle = openSearch?.[1]?.[0];
  if (!bestTitle) return null;

  const summaryUrl = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
  const summary = await fetchJson(summaryUrl, {
    "User-Agent": "meme-radar/0.1 (free-source-prototype)"
  }).catch(() => null);
  if (!summary) return null;
  return {
    source: "Wikipedia",
    title: text(summary.title) || bestTitle,
    summary: text(summary.extract),
    url: text(summary.content_urls?.desktop?.page)
  };
}

async function fetchRedditRelated(query, limit = 5) {
  const endpoint = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=top&t=week&raw_json=1`;
  const data = await fetchJson(endpoint, {
    "User-Agent": "meme-radar/0.1 (free-source-prototype)"
  }).catch(() => null);
  if (!data) return null;
  const items = (data?.data?.children || []).map((c) => c.data).filter(Boolean);
  return {
    source: "Reddit",
    count: items.length,
    references: items.slice(0, 3).map((item) => ({
      title: text(item.title),
      url: `https://www.reddit.com${text(item.permalink)}`
    }))
  };
}

async function collectDetailEnrichment(title, category) {
  const safeTitle = text(title).trim();
  const safeCategory = text(category).trim();
  if (!safeTitle) {
    return {
      summary: "",
      references: [],
      meta: { category: safeCategory, fetchedAt: Date.now(), providers: [] }
    };
  }

  const [wiki, related] = await Promise.all([
    fetchWikipediaSummary(safeTitle),
    fetchRedditRelated(`${safeTitle} ${safeCategory}`)
  ]);

  const refs = [];
  if (wiki?.url) refs.push({ label: "위키 요약", url: wiki.url });
  if (related?.references?.length) {
    related.references.forEach((r, idx) => {
      refs.push({ label: `관련 글 ${idx + 1}`, url: r.url });
    });
  }

  let summary = "";
  if (wiki?.summary) {
    summary = wiki.summary;
  } else if (related?.count) {
    summary = `최근 1주 내 관련 게시글 ${related.count}건이 확인되었습니다.`;
  } else {
    summary = "외부 공개 소스에서 요약 정보를 찾지 못했습니다.";
  }

  return {
    summary,
    references: refs,
    meta: {
      category: safeCategory,
      fetchedAt: Date.now(),
      providers: [wiki ? "wikipedia" : null, related ? "reddit" : null].filter(Boolean)
    }
  };
}

async function collectCategory(category, period) {
  const subs = CATEGORY_SUBREDDITS[category] || [];
  const settled = await Promise.allSettled(subs.map((s) => fetchSubredditHot(s)));
  const posts = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  const ranked = posts
    .filter((p) => !p.stickied && p.title)
    .map((post) => {
      const raw = (post.ups || 0) + (post.num_comments || 0) * 2;
      return {
        id: `${category}-${post.id}`,
        category,
        title: post.title,
        reason: `좋아요 ${post.ups || 0}, 댓글 ${post.num_comments || 0}`,
        score: {
          today: scoreByPeriod(raw, post.created_utc, "today"),
          week: scoreByPeriod(raw, post.created_utc, "week"),
          month: scoreByPeriod(raw, post.created_utc, "month"),
          quarter: scoreByPeriod(raw, post.created_utc, "quarter")
        },
        detail: buildDetail(category, post),
        links: linksFromPost(post)
      };
    })
    .sort((a, b) => b.score[period] - a.score[period])
    .slice(0, 12)
    .map((item, index) => ({ ...item, badge: toBadge(index) }));

  return ranked;
}

async function collectSnapshot(period) {
  const categories = ["meme", "trend", "challenge"];
  const collected = await Promise.all(categories.map((c) => collectCategory(c, period)));
  const items = collected.flat();
  if (!items.length) {
    throw new Error("no_external_sources_available");
  }
  return {
    updatedAt: Date.now(),
    items
  };
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "bad request" });
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api/snapshot") {
    const period = ["today", "week", "month", "quarter"].includes(url.searchParams.get("period"))
      ? url.searchParams.get("period")
      : "today";
    try {
      const snapshot = await collectSnapshot(period);
      sendJson(res, 200, snapshot);
    } catch (error) {
      sendJson(res, 500, {
        error: "snapshot_failed",
        message: String(error.message || error)
      });
    }
    return;
  }

  if (pathname === "/api/detail-enrich") {
    const title = url.searchParams.get("title") || "";
    const category = url.searchParams.get("category") || "";
    try {
      const enriched = await collectDetailEnrichment(title, category);
      sendJson(res, 200, enriched);
    } catch (error) {
      sendJson(res, 500, {
        error: "detail_enrich_failed",
        message: String(error.message || error)
      });
    }
    return;
  }

  const filePath = sanitizePath(pathname);
  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }
  sendFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Meme radar server: http://${HOST}:${PORT}/meme-prototype.html`);
});
