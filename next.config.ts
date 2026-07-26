import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 商品サムネイルは任意の外部サイト由来のため、Next の画像最適化は使わず
  // 素の <img> で表示する（remotePatterns 設定・最適化プロキシ不要で堅牢）。
  // postgres.js / cheerio はサーバー専用モジュール。サーバーコンポーネントと
  // Server Actions からのみ import しているためクライアントバンドルには入らない。
  serverExternalPackages: ["postgres", "cheerio"],
};

export default nextConfig;
