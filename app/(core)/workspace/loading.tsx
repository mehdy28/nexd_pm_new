export default function WorkspaceLoading() {
  return (
    <div className="p-6 space-y-8">
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-64 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-full max-w-3xl animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
      </div>

      <div className="space-y-4">
        <div className="h-6 bg-slate-200 rounded w-32 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-6 bg-slate-200 rounded w-40 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
