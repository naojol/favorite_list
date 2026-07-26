// ドメイン型定義（サーバー/クライアント共通で使用可能）

export type ItemStatus = "active" | "purchased" | "dropped";

export interface WishlistItem {
  id: string;
  url: string;
  title: string;
  /** 価格（通貨の主要単位。JPYなら円）。未取得なら null */
  price: number | null;
  currency: string;
  imageUrl: string | null;
  siteName: string | null;
  /** 必要度 1〜5 */
  necessity: number;
  /** いつまでにほしいか（YYYY-MM-DD）。未設定なら null */
  wantBy: string | null;
  note: string | null;
  status: ItemStatus;
  /** ISO 8601 タイムスタンプ */
  createdAt: string;
  updatedAt: string;
  purchasedAt: string | null;
}

export interface NewItemInput {
  url: string;
  title: string;
  price: number | null;
  currency?: string;
  imageUrl?: string | null;
  siteName?: string | null;
  necessity: number;
  wantBy?: string | null;
  note?: string | null;
}

export type UpdateItemInput = Partial<
  Pick<
    WishlistItem,
    | "url"
    | "title"
    | "price"
    | "currency"
    | "imageUrl"
    | "siteName"
    | "necessity"
    | "wantBy"
    | "note"
    | "status"
    | "purchasedAt"
  >
>;

/** リンクから抽出した商品メタ情報 */
export interface ProductMeta {
  url: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  siteName: string | null;
  /** 意味のある情報（名前 or 価格）を取得できたか */
  ok: boolean;
  error?: string;
}

export interface AppSettings {
  /** 月あたりに使える予算（円）。未設定なら null */
  monthlyBudget: number | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  monthlyBudget: null,
};
