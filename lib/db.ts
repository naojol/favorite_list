import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import {
  type AppSettings,
  type NewItemInput,
  type UpdateItemInput,
  type WishlistItem,
} from "./types";

/**
 * ストレージ層。DATABASE_URL があれば Postgres(Supabase)、なければ
 * ローカルの JSON ファイル(.data/wishlist.json)にフォールバックする。
 * DB アクセスはサーバー(Server Actions / Server Components)からのみ。
 */
export interface Store {
  listItems(): Promise<WishlistItem[]>;
  getItem(id: string): Promise<WishlistItem | null>;
  createItem(input: NewItemInput): Promise<WishlistItem>;
  updateItem(id: string, patch: UpdateItemInput): Promise<WishlistItem | null>;
  deleteItem(id: string): Promise<void>;
  getSettings(): Promise<AppSettings>;
  setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void>;
}

const nowIso = () => new Date().toISOString();

function newItem(input: NewItemInput): WishlistItem {
  const ts = nowIso();
  return {
    id: crypto.randomUUID(),
    url: input.url,
    title: input.title ?? "",
    price: input.price ?? null,
    currency: input.currency ?? "JPY",
    imageUrl: input.imageUrl ?? null,
    siteName: input.siteName ?? null,
    necessity: clampNecessity(input.necessity),
    wantBy: input.wantBy ?? null,
    note: input.note ?? null,
    status: "active",
    createdAt: ts,
    updatedAt: ts,
    purchasedAt: null,
  };
}

function clampNecessity(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/* ============================================================
   Postgres backend (Supabase)
   ============================================================ */

type Sql = ReturnType<typeof postgres>;

const g = globalThis as unknown as {
  __wlSql?: Sql;
  __wlSchema?: Promise<void>;
};

function getSql(): Sql {
  if (!g.__wlSql) {
    g.__wlSql = postgres(process.env.DATABASE_URL as string, {
      // Supabase の Transaction pooler(6543)ではプリペアドステートメント非対応
      prepare: false,
      idle_timeout: 20,
      max: 3,
      onnotice: () => {},
    });
  }
  return g.__wlSql;
}

function ensureSchema(): Promise<void> {
  if (!g.__wlSchema) {
    const sql = getSql();
    g.__wlSchema = (async () => {
      await sql`
        create table if not exists wishlist_items (
          id           uuid primary key default gen_random_uuid(),
          url          text not null,
          title        text not null default '',
          price        numeric,
          currency     text not null default 'JPY',
          image_url    text,
          site_name    text,
          necessity    smallint not null default 3,
          want_by      date,
          note         text,
          status       text not null default 'active',
          created_at   timestamptz not null default now(),
          updated_at   timestamptz not null default now(),
          purchased_at timestamptz
        )`;
      await sql`create index if not exists wishlist_items_status_idx on wishlist_items (status)`;
      await sql`create index if not exists wishlist_items_created_idx on wishlist_items (created_at desc)`;
      await sql`
        create table if not exists app_settings (
          key   text primary key,
          value jsonb
        )`;
    })().catch((err) => {
      // 次回リトライできるようにキャッシュをクリア
      g.__wlSchema = undefined;
      throw err;
    });
  }
  return g.__wlSchema;
}

type Row = Record<string, unknown>;

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return new Date(v as string).toISOString();
}

function mapRow(r: Row): WishlistItem {
  return {
    id: r.id as string,
    url: r.url as string,
    title: (r.title as string) ?? "",
    price: r.price == null ? null : Number(r.price),
    currency: (r.currency as string) ?? "JPY",
    imageUrl: (r.image_url as string) ?? null,
    siteName: (r.site_name as string) ?? null,
    necessity: Number(r.necessity),
    wantBy: (r.want_by as string) ?? null,
    note: (r.note as string) ?? null,
    status: r.status as WishlistItem["status"],
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
    purchasedAt: r.purchased_at ? toIso(r.purchased_at) : null,
  };
}

const SELECT_COLS = (sql: Sql) => sql`
  id, url, title, price::float8 as price, currency, image_url, site_name,
  necessity, to_char(want_by, 'YYYY-MM-DD') as want_by, note, status,
  created_at, updated_at, purchased_at`;

// camelCase パッチ → snake_case カラムへのマッピング
const COL_MAP: Record<string, string> = {
  url: "url",
  title: "title",
  price: "price",
  currency: "currency",
  imageUrl: "image_url",
  siteName: "site_name",
  necessity: "necessity",
  wantBy: "want_by",
  note: "note",
  status: "status",
  purchasedAt: "purchased_at",
};

function pgStore(): Store {
  return {
    async listItems() {
      await ensureSchema();
      const sql = getSql();
      const rows = await sql`
        select ${SELECT_COLS(sql)} from wishlist_items
        order by created_at desc`;
      return rows.map((r) => mapRow(r as Row));
    },

    async getItem(id) {
      await ensureSchema();
      const sql = getSql();
      const rows = await sql`
        select ${SELECT_COLS(sql)} from wishlist_items where id = ${id} limit 1`;
      return rows[0] ? mapRow(rows[0] as Row) : null;
    },

    async createItem(input) {
      await ensureSchema();
      const sql = getSql();
      const item = newItem(input);
      await sql`
        insert into wishlist_items
          (id, url, title, price, currency, image_url, site_name,
           necessity, want_by, note, status, created_at, updated_at)
        values
          (${item.id}, ${item.url}, ${item.title}, ${item.price},
           ${item.currency}, ${item.imageUrl}, ${item.siteName},
           ${item.necessity}, ${item.wantBy}, ${item.note}, ${item.status},
           ${item.createdAt}, ${item.updatedAt})`;
      return item;
    },

    async updateItem(id, patch) {
      await ensureSchema();
      const sql = getSql();
      const set: Record<string, unknown> = {};
      for (const [k, col] of Object.entries(COL_MAP)) {
        const val = (patch as Record<string, unknown>)[k];
        if (val !== undefined) {
          set[col] = k === "necessity" ? clampNecessity(val as number) : val;
        }
      }
      set.updated_at = new Date();
      await sql`update wishlist_items set ${sql(set)} where id = ${id}`;
      return this.getItem(id);
    },

    async deleteItem(id) {
      await ensureSchema();
      const sql = getSql();
      await sql`delete from wishlist_items where id = ${id}`;
    },

    async getSettings() {
      await ensureSchema();
      const sql = getSql();
      const rows = await sql`select key, value from app_settings`;
      const map: Record<string, unknown> = {};
      for (const r of rows) map[r.key as string] = r.value;
      return {
        monthlyBudget:
          typeof map.monthlyBudget === "number" ? map.monthlyBudget : null,
      };
    },

    async setSetting(key, value) {
      await ensureSchema();
      const sql = getSql();
      await sql`
        insert into app_settings (key, value)
        values (${key}, ${sql.json(value as never)})
        on conflict (key) do update set value = ${sql.json(value as never)}`;
    },
  };
}

/* ============================================================
   JSON file backend (local dev fallback)
   ============================================================ */

interface FileShape {
  items: WishlistItem[];
  settings: AppSettings;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "wishlist.json");

let writeQueue: Promise<unknown> = Promise.resolve();

async function readData(): Promise<FileShape> {
  try {
    const txt = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(txt) as Partial<FileShape>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      settings: {
        monthlyBudget:
          typeof parsed.settings?.monthlyBudget === "number"
            ? parsed.settings.monthlyBudget
            : null,
      },
    };
  } catch {
    return { items: [], settings: { monthlyBudget: null } };
  }
}

async function writeData(data: FileShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

/** 書き込みを直列化して競合を防ぐ */
function mutate<T>(fn: (data: FileShape) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const data = await readData();
    const result = fn(data);
    await writeData(data);
    return result;
  });
  writeQueue = run.catch(() => {});
  return run;
}

function jsonStore(): Store {
  return {
    async listItems() {
      const data = await readData();
      return [...data.items].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
    },

    async getItem(id) {
      const data = await readData();
      return data.items.find((i) => i.id === id) ?? null;
    },

    async createItem(input) {
      const item = newItem(input);
      return mutate((data) => {
        data.items.unshift(item);
        return item;
      });
    },

    async updateItem(id, patch) {
      return mutate((data) => {
        const item = data.items.find((i) => i.id === id);
        if (!item) return null;
        Object.assign(item, patch);
        if (patch.necessity !== undefined)
          item.necessity = clampNecessity(patch.necessity);
        item.updatedAt = nowIso();
        return { ...item };
      });
    },

    async deleteItem(id) {
      await mutate((data) => {
        data.items = data.items.filter((i) => i.id !== id);
      });
    },

    async getSettings() {
      const data = await readData();
      return data.settings;
    },

    async setSetting(key, value) {
      await mutate((data) => {
        data.settings[key] = value;
      });
    },
  };
}

/* ============================================================
   Store 選択
   ============================================================ */

let store: Store | null = null;

export function getStore(): Store {
  if (!store) {
    store = process.env.DATABASE_URL ? pgStore() : jsonStore();
  }
  return store;
}

/** JSON フォールバック(=DATABASE_URL 未設定)で動作中かどうか */
export function isUsingLocalStore(): boolean {
  return !process.env.DATABASE_URL;
}
