export default function ProjectLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-64 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-full max-w-2xl animate-pulse" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-48 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
