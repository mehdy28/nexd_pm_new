"use client"

export function ProjectsList() {
  const projects = [
    { id: "nexd", name: "NEXD.PM" },
    { id: "alpha", name: "Alpha Website" },
    { id: "mobile", name: "Mobile App" },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-soft p-6">
      <h3 className="font-semibold text-lg text-foreground mb-4">Projects</h3>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <li key={p.id} className="group">
            <a
              href={`/project/${p.id}`}
              className="block rounded-xl border bg-card p-4 shadow-soft hover:shadow-medium hover:scale-[1.02] hover:border-primary/20 transition-all duration-200"
            >
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                {p.name}
              </div>
              <p className="text-xs text-muted-foreground font-medium">Open project →</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
