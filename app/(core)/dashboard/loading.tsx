export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Loading */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Loading */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-48 bg-slate-200 rounded-lg animate-pulse" />
        </div>

        {/* Sidebar Loading */}
        <div className="space-y-6">
          <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
