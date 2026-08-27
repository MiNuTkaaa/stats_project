"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/game-log", label: "Game Log" },
  { href: "/period-breakdown", label: "Period Breakdown" },
  { href: "/incremental", label: "Incremental Stats" },
  { href: "/about", label: "About" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Don't show nav on admin pages
  if (pathname?.startsWith("/admin")) return null;

  // Body scroll lock when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header style={{ background: "var(--bg)" }} className="sticky top-0 z-50">
      <div className="wrap" style={{ paddingBottom: 0 }}>
        <nav className="nav">
          {/* Left — brand */}
          <Link
            href="/"
            className="nav-left"
            style={{ textDecoration: "none" }}
          >
            <span className="nav-num">#40</span>
            <span className="nav-brand">Mikhail Yegorov</span>
          </Link>

          {/* Center — links (desktop) */}
          <div className="nav-links">
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${active ? "active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right — season tag + mobile toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              justifySelf: "end",
            }}
          >
            <span className="season-tag">2026-27</span>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile backdrop */}
        <div
          className={`mobile-backdrop ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Mobile dropdown — always in DOM for CSS transitions */}
        <div className={`mobile-dropdown ${mobileOpen ? "open" : ""}`}>
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${active ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
