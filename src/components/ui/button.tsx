import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    // Structural
    "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "text-sm font-medium leading-none",
    "transition-[background-color,box-shadow,color,transform,border-color] duration-200 ease-out",
    // Focus
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-50",
    // Micro-interaction: tactile press
    "active:translate-y-[0.5px] active:scale-[0.985]",
    // Icons
    "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Brand CTA — copper, subtle sheen, warm glow on hover. */
        primary: [
          "bg-[var(--primary)] text-[var(--primary-foreground)]",
          "shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:bg-[var(--primary-hover)]",
          "hover:shadow-[0_8px_18px_-6px_color-mix(in_oklab,var(--primary)_50%,transparent),0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.18)]",
          "active:shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.10)]",
        ].join(" "),
        /** Neutral filled — stone chip with soft ring. */
        secondary: [
          "bg-[var(--surface-2)] text-[var(--foreground)]",
          "shadow-[inset_0_0_0_1px_var(--border-strong)]",
          "hover:bg-[var(--surface-3)]",
          "hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_22%,transparent),0_1px_2px_rgba(0,0,0,0.04)]",
        ].join(" "),
        /** Transparent default, surface on hover. */
        ghost: [
          "bg-transparent text-[var(--foreground)]",
          "hover:bg-[var(--surface-2)]",
        ].join(" "),
        /** Outlined — inset ring instead of a physical border so size/layout is stable. */
        outline: [
          "bg-transparent text-[var(--foreground)]",
          "shadow-[inset_0_0_0_1px_var(--border-strong)]",
          "hover:bg-[var(--surface-2)]",
          "hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_30%,transparent),0_1px_2px_rgba(0,0,0,0.04)]",
        ].join(" "),
        /** Destructive. Same polish as primary but red. */
        danger: [
          "bg-[var(--danger)] text-[var(--danger-foreground)]",
          "shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.14)]",
          "hover:bg-[color-mix(in_oklab,var(--danger)_92%,#000_8%)]",
          "hover:shadow-[0_8px_18px_-6px_color-mix(in_oklab,var(--danger)_50%,transparent),0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.16)]",
        ].join(" "),
        /** Inline text link. No padding, no height. */
        link: [
          "bg-transparent text-[var(--primary)] p-0 h-auto rounded-none",
          "hover:text-[var(--primary-hover)] hover:underline underline-offset-4",
          "active:translate-y-0 active:scale-100",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5 rounded-[8px]",
        md: "h-9 px-4 rounded-[10px]",
        lg: "h-11 px-6 text-base rounded-[12px]",
        /** Perfect circle — signature industrial polish. */
        icon: "h-9 w-9 p-0 rounded-full",
        "icon-sm": "h-8 w-8 p-0 rounded-full",
        "icon-lg": "h-11 w-11 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** When true, renders the child directly with button styles applied via Radix Slot. Use for links: `<Button asChild><Link to="…">…</Link></Button>`. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // Only apply type="button" default when rendering a real <button>.
    const typedProps = asChild ? props : { type: type ?? "button", ...props };
    return (
      <Comp
        ref={ref as never}
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...typedProps}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
