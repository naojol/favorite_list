-- ウィッシュリスト予算マネージャー — Postgres スキーマ
-- アプリ起動時に同等の CREATE TABLE IF NOT EXISTS が自動実行されるため、
-- 通常このファイルを手動で流し込む必要はありません（バックアップ兼ドキュメント）。
-- Supabase の SQL Editor に貼り付けても実行できます。

create table if not exists wishlist_items (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  title        text not null default '',
  price        numeric,
  currency     text not null default 'JPY',
  image_url    text,
  site_name    text,
  necessity    smallint not null default 3 check (necessity between 1 and 5),
  want_by      date,
  note         text,
  status       text not null default 'active'
                 check (status in ('active', 'purchased', 'dropped')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  purchased_at timestamptz
);

create index if not exists wishlist_items_status_idx  on wishlist_items (status);
create index if not exists wishlist_items_created_idx on wishlist_items (created_at desc);

create table if not exists app_settings (
  key   text primary key,
  value jsonb
);
