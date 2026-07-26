"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";

/**
 * 数値をスプリングでカウントアップ表示（§4）。マウント時に 0→値。
 * reduced-motion では即座に確定値を表示（§14）。
 */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const spring = useSpring(0, { bounce: 0, duration: 0.7 });
  const text = useTransform(spring, (v) => format(Math.round(v)));

  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);

  return <motion.span className={className}>{text}</motion.span>;
}
