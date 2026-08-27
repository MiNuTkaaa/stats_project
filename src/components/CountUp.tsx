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
 * Animated number counter. Counts from 0 to `end` over `duration` ms
 * using an ease-out curve for a natural deceleration feel.
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
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * end);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setValue(end);
      }
    }

    requestAnimationFrame(tick);
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
