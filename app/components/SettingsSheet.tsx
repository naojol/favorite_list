"use client";

import { useEffect, useRef, useState } from "react";
import { saveMonthlyBudget } from "@/app/actions";
import { Button } from "./ui/Button";
import { Sheet } from "./ui/Sheet";

export function SettingsSheet({
  open,
  monthlyBudget,
  onOpenChange,
}: {
  open: boolean;
  monthlyBudget: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [session, setSession] = useState(0);
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) setSession((s) => s + 1);
    prevOpen.current = open;
  }, [open]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="設定"
      description="月あたりの予算を設定します"
    >
      <SettingsForm
        key={session}
        monthlyBudget={monthlyBudget}
        onDone={() => onOpenChange(false)}
      />
    </Sheet>
  );
}

function SettingsForm({
  monthlyBudget,
  onDone,
}: {
  monthlyBudget: number | null;
  onDone: () => void;
}) {
  const [value, setValue] = useState(
    monthlyBudget != null ? String(monthlyBudget) : ""
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const num =
      value.trim() === "" ? null : Number(value.replace(/[^\d.]/g, ""));
    try {
      await saveMonthlyBudget(Number.isFinite(num as number) ? num : null);
      onDone();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-2">
      <div className="space-y-2">
        <label htmlFor="wl-budget" className="t-subhead block font-[620]">
          月あたりの予算
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary">
            ¥
          </span>
          <input
            id="wl-budget"
            type="text"
            inputMode="numeric"
            placeholder="例：30000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="field pl-9 tabnum"
          />
        </div>
        <p className="t-caption text-tertiary">
          「全部買うのに何ヶ月かかるか」の目安に使います。空欄にすると非表示になります。
        </p>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          onClick={save}
          disabled={saving}
          className="flex-1"
        >
          {saving ? "保存中…" : "保存"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={saving}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
