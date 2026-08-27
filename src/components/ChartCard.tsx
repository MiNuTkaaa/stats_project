"use client";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  small?: boolean;
}

export default function ChartCard({
  title,
  children,
  className = "",
  small = false,
}: ChartCardProps) {
  return (
    <div className={`card ${className}`}>
      <h3
        className="card-title"
        style={small ? { fontSize: "13px" } : undefined}
      >
        {title}
      </h3>
      <div className="card-underline" />
      <div style={{ width: "100%", minHeight: 0 }}>{children}</div>
    </div>
  );
}
