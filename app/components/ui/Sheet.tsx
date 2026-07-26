"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

/**
 * vaul ベースのボトムシート。ドラッグで閉じられ、velocity handoff /
 * rubber-banding は vaul 側で実装済み（apple-design §6/§9）。
 * モーダルタスクなのでスクリム(dim)で背景を落として集中させる（§12）。
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="sheet-content">
          <div className="sheet-grabber" aria-hidden />
          <div className="flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
            <Drawer.Title className="t-title mb-3">{title}</Drawer.Title>
            <Drawer.Description className="sr-only">
              {description ?? title}
            </Drawer.Description>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
