import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted",
      "transition-colors duration-150 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
      "aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
))
Input.displayName = "Input"

export { Input }
