import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
  /** Show a small end-dot at the latest point. */
  showEndDot?: boolean;
}

/**
 * Tiny inline-SVG sparkline. ~10× lighter than spinning up a Recharts
 * instance per row in a table/list. No animation (by request).
 */
export function Sparkline({
  values,
  width = 64,
  height = 20,
  stroke = "var(--primary)",
  fill,
  strokeWidth = 1.5,
  className,
  showEndDot,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        role="img"
        aria-label="No data"
        width={width}
        height={height}
        className={className}
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });

  const pathD = points
    .map(
      ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`,
    )
    .join(" ");

  const areaD = fill
    ? `${pathD} L ${width} ${height} L 0 ${height} Z`
    : undefined;

  const endPoint = points[points.length - 1] ?? ([0, 0] as const);
  const [endX, endY] = endPoint;

  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
    >
      {areaD && <path d={areaD} fill={fill} />}
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showEndDot && <circle cx={endX} cy={endY} r={2} fill={stroke} />}
    </svg>
  );
}
