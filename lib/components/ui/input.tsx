import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
