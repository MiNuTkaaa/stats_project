"use client";

import { useReveal } from "@/hooks/useReveal";

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}

/**
 * Wrapper that fades up its children when they scroll into view.
 * Accepts a `delay` (in ms) for stagger effects.
 */
export default function RevealSection({
  children,
  className = "",
  delay = 0,
  style,
}: RevealSectionProps) {
  const { ref, visible } = useReveal(0.08);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "revealed" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms`, ...style } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
