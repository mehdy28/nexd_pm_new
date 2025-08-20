export default function ActivityLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-96 animate-pulse" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
