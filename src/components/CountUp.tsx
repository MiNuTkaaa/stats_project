"use client";

import { useEffect, useState, useRef } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Animated number counter. Counts from previous value to `end` over
 * `duration` ms using an ease-out curve for natural deceleration.
 * Re-animates whenever `end` changes (e.g. after applying filters).
 */
export default function CountUp({
  end,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const [value, setValue] = useState(0);
  const prevEnd = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const from = prevEnd.current;
    prevEnd.current = end;

    // Cancel any in-progress animation
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (end - from) * eased);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        setValue(end);
      }
    }

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [end, duration]);

  const display = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toString();

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
