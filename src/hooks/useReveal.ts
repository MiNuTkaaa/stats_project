"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight scroll-reveal hook using Intersection Observer.
 * Returns a ref to attach to the element, and a boolean `visible` that
 * becomes true once the element enters the viewport (and stays true).
 */
export function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}
