export function PageHeader({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 pt-10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children ? <div className="mt-1 max-w-2xl text-sm text-ink-muted">{children}</div> : null}
      </div>
      {actions}
    </div>
  )
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="flex max-w-2xl flex-col gap-4 text-sm leading-6 text-ink [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold">{children}</div>
}
