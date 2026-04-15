"use client";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  type?: "line" | "area";
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = "#6C5CE7",
  height = 20,
  width = 60,
  type = "line",
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pad = strokeWidth / 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L${width.toFixed(2)},${height.toFixed(
    2
  )} L0,${height.toFixed(2)} Z`;

  const gradId = `sparkgrad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      {type === "area" ? (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      ) : null}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
