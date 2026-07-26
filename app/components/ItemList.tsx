"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ItemStatus, WishlistItem } from "@/lib/types";
import { ItemCard } from "./ItemCard";

// 既定 UI スプリング：critically damped（bounce 0） / response ~0.4（§4）
const spring = { type: "spring", bounce: 0, duration: 0.4 } as const;

export function ItemList({
  items,
  onEdit,
  onStatus,
  onDelete,
}: {
  items: WishlistItem[];
  onEdit: (item: WishlistItem) => void;
  onStatus: (item: WishlistItem, status: ItemStatus) => void;
  onDelete: (item: WishlistItem) => void;
}) {
  return (
    <motion.ul layout className="flex flex-col gap-3">
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={spring}
          >
            <ItemCard
              item={item}
              onEdit={onEdit}
              onStatus={onStatus}
              onDelete={onDelete}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
