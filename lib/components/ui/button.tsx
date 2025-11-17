import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-purple text-white shadow-elevation-1 hover:bg-purple-dark hover:shadow-elevation-2",
        destructive:
          "bg-error text-white shadow-elevation-1 hover:bg-error/90 hover:shadow-elevation-2",
        outline:
          "border-[1.5px] border-[var(--gform-color-border)] bg-surface text-[var(--gform-color-text)] hover:bg-surface-alt hover:border-[var(--gform-color-text-tertiary)]",
        secondary:
          "bg-surface-alt text-[var(--gform-color-text)] hover:bg-surface-elevated",
        ghost: "bg-transparent text-[var(--gform-color-text-secondary)] hover:bg-surface-alt hover:text-[var(--gform-color-text)]",
        link: "bg-transparent text-purple underline-offset-4 hover:underline hover:bg-purple-5",
      },
      size: {
        default: "min-h-[48px] px-6 py-3",
        sm: "min-h-[40px] px-4 py-2 text-xs",
        lg: "min-h-[56px] px-8 py-4 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
