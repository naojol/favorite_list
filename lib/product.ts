import "server-only";
import * as cheerio from "cheerio";
import type { ProductMeta } from "./types";

/**
 * 商品ページの HTML から名前・価格・通貨・画像・サイト名を抽出する。
 * 優先順位: JSON-LD(Product) → OpenGraph/Twitter/product:* → itemprop → <title>/<h1>。
 * 純粋関数なのでフィクスチャでユニットテスト可能。
 */
export function parseProduct(html: string, url: string): ProductMeta {
  const $ = cheerio.load(html);

  const attr = (selector: string, attribute = "content"): string | null => {
    const v = $(selector).first().attr(attribute);
    return v ? v.trim() : null;
  };
  const metaTag = (key: string): string | null =>
    attr(`meta[property="${key}"]`) ?? attr(`meta[name="${key}"]`);

  const ld = extractJsonLd($);

  const title =
    firstNonEmpty(
      ld.name,
      metaTag("og:title"),
      metaTag("twitter:title"),
      cleanText($('[itemprop="name"]').first().text()),
      cleanText($("title").first().text()),
      cleanText($("h1").first().text())
    ) ?? null;

  const image = firstNonEmpty(
    ld.image,
    metaTag("og:image"),
    metaTag("og:image:url"),
    metaTag("twitter:image"),
    metaTag("twitter:image:src")
  );

  const siteName = firstNonEmpty(metaTag("og:site_name"), hostname(url));

  const priceRaw = firstNonEmpty(
    ld.price,
    metaTag("product:price:amount"),
    metaTag("og:price:amount"),
    metaTag("og:product:price:amount"),
    attr('meta[itemprop="price"]'),
    attr('[itemprop="price"]'),
    attr('[itemprop="price"]', "value")
  );
  const price = parsePrice(priceRaw);

  const currency =
    firstNonEmpty(
      ld.currency,
      metaTag("product:price:currency"),
      metaTag("og:price:currency"),
      attr('meta[itemprop="priceCurrency"]'),
      attr('[itemprop="priceCurrency"]')
    ) ?? "JPY";

  const ok = Boolean((title && title.length > 0) || price != null);

  return {
    url,
    title,
    price,
    currency,
    imageUrl: absoluteUrl(image, url),
    siteName,
    ok,
  };
}

/* ---------- JSON-LD ---------- */

interface LdResult {
  name: string | null;
  image: string | null;
  price: string | null;
  currency: string | null;
}

function extractJsonLd($: cheerio.CheerioAPI): LdResult {
  const result: LdResult = {
    name: null,
    image: null,
    price: null,
    currency: null,
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    if (result.name && result.price) return;
    const txt = $(el).text();
    if (!txt) return;
    let data: unknown;
    try {
      data = JSON.parse(txt);
    } catch {
      return;
    }
    for (const node of flatten(data)) {
      if (!isProduct(node)) continue;
      if (!result.name && typeof node.name === "string")
        result.name = node.name;
      if (!result.image) result.image = pickImage(node.image);
      const offer = pickOffer(node.offers);
      if (offer) {
        if (result.price == null && offer.price != null)
          result.price = String(offer.price);
        if (!result.currency && offer.currency) result.currency = offer.currency;
      }
    }
  });
  return result;
}

type LdNode = Record<string, unknown>;

function flatten(data: unknown, acc: LdNode[] = []): LdNode[] {
  if (Array.isArray(data)) {
    for (const d of data) flatten(d, acc);
    return acc;
  }
  if (data && typeof data === "object") {
    const node = data as LdNode;
    acc.push(node);
    if (Array.isArray(node["@graph"])) flatten(node["@graph"], acc);
  }
  return acc;
}

function isProduct(node: LdNode): boolean {
  const t = node["@type"];
  if (!t) return false;
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /product/i.test(x));
}

function pickImage(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return pickImage(img[0]);
  if (typeof img === "object") {
    const o = img as LdNode;
    return (o.url as string) ?? (o["@id"] as string) ?? null;
  }
  return null;
}

function pickOffer(
  offers: unknown
): { price: unknown; currency: string | null } | null {
  if (!offers) return null;
  if (Array.isArray(offers)) {
    for (const o of offers) {
      const r = pickOffer(o);
      if (r) return r;
    }
    return null;
  }
  if (typeof offers === "object") {
    const o = offers as LdNode;
    const spec = o.priceSpecification as LdNode | undefined;
    const price =
      o.price ??
      o.lowPrice ??
      o.highPrice ??
      (spec ? spec.price : undefined);
    const currency =
      (o.priceCurrency as string) ??
      (spec ? (spec.priceCurrency as string) : null) ??
      null;
    if (price != null) return { price, currency };
    if (o.offers) return pickOffer(o.offers);
  }
  return null;
}

/* ---------- 汎用ヘルパー ---------- */

function firstNonEmpty(
  ...vals: (string | null | undefined)[]
): string | null {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function cleanText(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length ? t : null;
}

export function parsePrice(raw: string | number | null): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (!s) return null;
  // 全角数字を半角へ
  s = s.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30)
  );
  // 数字・区切りだけ残す
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    // 1,234.56 → カンマは桁区切り
    s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    // 桁区切りとみなす（JPY 想定）
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function absoluteUrl(u: string | null, base: string): string | null {
  if (!u) return null;
  try {
    return new URL(u, base).toString();
  } catch {
    return u;
  }
}

export function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** localhost や内部 IP への SSRF を軽く防ぐ */
function isBlockedHost(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return true;
  }
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true; // link-local / metadata
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

function emptyMeta(url: string, error?: string): ProductMeta {
  return {
    url,
    title: null,
    price: null,
    currency: "JPY",
    imageUrl: null,
    siteName: hostname(url),
    ok: false,
    error,
  };
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/**
 * URL を取得して商品メタを返す。失敗してもホスト名等の部分結果を返し、
 * 呼び出し側で手動入力にフォールバックできるようにする。
 */
export async function fetchProduct(url: string): Promise<ProductMeta> {
  const normalized = normalizeUrl(url);
  if (!normalized) return emptyMeta(url, "URL の形式が正しくありません");
  if (isBlockedHost(normalized))
    return emptyMeta(normalized, "このアドレスは取得できません");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(normalized, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.8,en;q=0.6",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });
    if (!res.ok) {
      return emptyMeta(
        normalized,
        `ページを取得できませんでした (HTTP ${res.status})`
      );
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!/html|xml/i.test(ct)) {
      return emptyMeta(normalized, "HTML ページではないため読み取れません");
    }
    const html = await res.text();
    const meta = parseProduct(html, normalized);
    if (!meta.ok && !meta.error) {
      meta.error = "商品名・価格を自動取得できませんでした";
    }
    return meta;
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return emptyMeta(
      normalized,
      aborted ? "タイムアウトしました" : "ページを取得できませんでした"
    );
  } finally {
    clearTimeout(timer);
  }
}
