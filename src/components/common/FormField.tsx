import { AlertCircle } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  /** Short guidance shown below the label. */
  hint?: ReactNode;
  /** Inline error. When present the field is visually marked invalid. */
  error?: string | null;
  /** Tiny optional meta on the right of the label (e.g. "Optional"). */
  meta?: ReactNode;
  /** Force the required asterisk even if the underlying input isn't. */
  required?: boolean;
  /** The input element — Input, Select, Textarea, etc. */
  children: ReactNode;
  className?: string;
  /** Render hint+error area compactly (no reserved space). */
  dense?: boolean;
}

/**
 * Consistent labeled field for all forms. Wires up:
 *  - Visible <Label> linked via htmlFor/id
 *  - aria-invalid + aria-describedby on the input for screen readers
 *  - Error text rendered below, with an icon, in the danger color
 *  - Optional hint text when no error is present
 *
 * The child is cloned, not wrapped, so focus/ref behaviour is preserved.
 */
export function FormField({
  label,
  hint,
  error,
  meta,
  required,
  children,
  className,
  dense = false,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = `field-${autoId}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const child = Children.only(children) as ReactElement<{
    id?: string;
    "aria-invalid"?: boolean | "true" | "false";
    "aria-describedby"?: string;
    required?: boolean;
  }>;

  const describedBy =
    [error ? errorId : null, !error && hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const input = isValidElement(child)
    ? cloneElement(child, {
        id: child.props.id ?? fieldId,
        "aria-invalid": error ? true : child.props["aria-invalid"],
        "aria-describedby":
          [child.props["aria-describedby"], describedBy]
            .filter(Boolean)
            .join(" ") || undefined,
        required: child.props.required ?? required,
      })
    : child;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label
          htmlFor={fieldId}
          className="text-[13px] font-medium text-[var(--foreground)]"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-[var(--danger)]">
              *
            </span>
          )}
        </Label>
        {meta && (
          <span className="text-[11px] text-[var(--muted-foreground)]">
            {meta}
          </span>
        )}
      </div>
      {input}
      {!dense && (
        <div className="min-h-[1.125rem]">
          {error ? (
            <p
              id={errorId}
              className="flex items-center gap-1 text-xs text-[var(--danger)]"
            >
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-xs text-[var(--muted-foreground)]">
              {hint}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
