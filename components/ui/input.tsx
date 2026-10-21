import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-line bg-bg px-3 text-sm text-ink placeholder:text-ink-muted",
      "transition-colors duration-150 focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron",
      "aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
))
Input.displayName = "Input"

export { Input }
