import { daysUntil, formatDateShort } from "@/lib/format";
import { Badge } from "./badge";

interface ExpirationBadgeProps {
  date: string | Date | null | undefined;
  showDate?: boolean;
  className?: string;
}

export function ExpirationBadge({
  date,
  showDate = false,
  className,
}: ExpirationBadgeProps) {
  if (!date) {
    return (
      <Badge variant="muted" className={className}>
        —
      </Badge>
    );
  }

  const days = daysUntil(date);
  const variant =
    days < 0
      ? "danger"
      : days <= 14
        ? "danger"
        : days <= 30
          ? "warning"
          : days <= 60
            ? "warning"
            : "success";

  const label =
    days < 0
      ? `Expired ${Math.abs(days)}d ago`
      : days === 0
        ? "Expires today"
        : `${days}d`;

  return (
    <Badge variant={variant} className={className}>
      {showDate ? `${formatDateShort(date)} · ${label}` : label}
    </Badge>
  );
}
