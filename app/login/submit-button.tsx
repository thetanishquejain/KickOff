"use client"

import { type ComponentProps } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

type Props = Omit<ComponentProps<"button">, "ref"> & { pendingText?: string }

export function SubmitButton({ children, pendingText, formAction, ...props }: Props) {
  const { pending, action } = useFormStatus()
  const isPending = pending && action === formAction
  return (
    <Button {...props} formAction={formAction} type="submit" aria-disabled={pending} disabled={pending}>
      {isPending ? pendingText : children}
    </Button>
  )
}
