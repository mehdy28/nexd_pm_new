export default function BillingLoading() {
  return (
    <div className="p-6 space-y-8">
      {/* Current Subscription Loading */}
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-64 animate-pulse" />
        <div className="h-48 bg-slate-200 rounded-lg animate-pulse" />
      </div>

      {/* Plans Loading */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
          <div className="h-10 bg-slate-200 rounded w-64 animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Billing History Loading */}
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
