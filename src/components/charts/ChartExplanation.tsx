import { Info } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ChartExplanationContent {
  /** Matches the chart title so the popover is self-labeling. */
  title: string;
  /** One or two plain-language sentences — no jargon. Gary is non-technical. */
  what: string;
  /** Short bulleted guide to reading the chart. Keep each line ≤12 words. */
  howToRead?: string[];
  /** Optional "watch for" callout — money-moving signal. */
  watchFor?: string;
}

interface ChartExplanationProps {
  content: ChartExplanationContent;
  /** Size tweak for the info button. Defaults to small. */
  size?: "sm" | "xs";
  className?: string;
}

/**
 * Small info icon → popover with a plain-language explanation. Attaches
 * inside the chart card's header. For non-technical users who want to
 * know "what is this and how do I read it?" without leaving the page.
 */
export function ChartExplanation({
  content,
  size = "sm",
  className,
}: ChartExplanationProps) {
  const btnSize = size === "xs" ? "size-5" : "size-6";
  const iconSize = size === "xs" ? "size-3" : "size-3.5";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What is “${content.title}”?`}
          title="What is this?"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full",
            "text-muted-foreground hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            "transition-colors",
            btnSize,
            className,
          )}
        >
          <Info aria-hidden="true" className={iconSize} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-4 text-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
              What is this?
            </span>
            <h4 className="text-sm font-semibold leading-tight">
              {content.title}
            </h4>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {content.what}
          </p>

          {content.howToRead && content.howToRead.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                How to read it
              </span>
              <ul className="flex flex-col gap-1 text-xs text-foreground">
                {content.howToRead.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--primary)]"
                    />
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.watchFor && (
            <div
              className={cn(
                "rounded-[var(--radius-sm)] px-3 py-2",
                "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]",
                "text-xs leading-relaxed",
              )}
            >
              <span className="font-semibold text-[var(--primary)]">
                Watch for:{" "}
              </span>
              <span>{content.watchFor}</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
