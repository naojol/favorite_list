import { describe, expect, it } from "vitest";
import { parsePrice, parseProduct } from "./product";

const BASE = "https://shop.example.com/p/1";

describe("parseProduct - JSON-LD", () => {
  it("Product + Offer から名前・価格・通貨・画像を取得", () => {
    const html = `<html><head>
      <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Product","name":"ワイヤレスヘッドホン",
       "image":"https://ex.com/img.jpg",
       "offers":{"@type":"Offer","price":"29800","priceCurrency":"JPY"}}
      </script></head><body></body></html>`;
    const m = parseProduct(html, BASE);
    expect(m.title).toBe("ワイヤレスヘッドホン");
    expect(m.price).toBe(29800);
    expect(m.currency).toBe("JPY");
    expect(m.imageUrl).toBe("https://ex.com/img.jpg");
    expect(m.ok).toBe(true);
  });

  it("@graph 内 Product + AggregateOffer(lowPrice) を取得", () => {
    const html = `<html><head>
      <script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"WebPage"},
        {"@type":"Product","name":"コーヒーメーカー",
         "offers":{"@type":"AggregateOffer","lowPrice":"8980","highPrice":"12000","priceCurrency":"JPY"}}
      ]}
      </script></head><body></body></html>`;
    const m = parseProduct(html, BASE);
    expect(m.title).toBe("コーヒーメーカー");
    expect(m.price).toBe(8980);
  });
});

describe("parseProduct - meta tags", () => {
  it("OpenGraph / product:price から取得し、相対画像URLを絶対化", () => {
    const html = `<html><head>
      <meta property="og:title" content="スニーカー A" />
      <meta property="og:image" content="/shoes.png" />
      <meta property="og:site_name" content="ShopX" />
      <meta property="product:price:amount" content="14300" />
      <meta property="product:price:currency" content="JPY" />
    </head><body></body></html>`;
    const m = parseProduct(html, BASE);
    expect(m.title).toBe("スニーカー A");
    expect(m.price).toBe(14300);
    expect(m.siteName).toBe("ShopX");
    expect(m.imageUrl).toBe("https://shop.example.com/shoes.png");
  });

  it("microdata(itemprop) の名前と価格を取得", () => {
    const html = `<html><body>
      <div itemscope itemtype="http://schema.org/Product">
        <span itemprop="name">USB ケーブル</span>
        <meta itemprop="price" content="1280">
        <meta itemprop="priceCurrency" content="JPY">
      </div></body></html>`;
    const m = parseProduct(html, BASE);
    expect(m.title).toBe("USB ケーブル");
    expect(m.price).toBe(1280);
  });

  it("<title> しか無い場合は名前だけ取得し price は null（ok=true）", () => {
    const html = `<html><head><title>Great Gadget - MyStore</title></head><body></body></html>`;
    const m = parseProduct(html, BASE);
    expect(m.title).toBe("Great Gadget - MyStore");
    expect(m.price).toBeNull();
    expect(m.ok).toBe(true);
  });

  it("有用な情報が無ければ ok=false（siteName はホスト名）", () => {
    const html = `<html><body><p>hello</p></body></html>`;
    const m = parseProduct(html, BASE);
    expect(m.ok).toBe(false);
    expect(m.price).toBeNull();
    expect(m.siteName).toBe("shop.example.com");
  });
});

describe("parsePrice", () => {
  it.each([
    ["¥12,345", 12345],
    ["12,345円", 12345],
    ["1,234.56", 1234.56],
    ["12345", 12345],
    ["US $1,299.00", 1299],
    ["１２３４", 1234], // 全角
  ])("%s → %d", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });

  it("空・不正は null", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("お問い合わせ")).toBeNull();
    expect(parsePrice(null)).toBeNull();
  });
});
