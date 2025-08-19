"use client"

export function DueSoon() {
  const tasks = [
    { id: "1", title: "Fix the auth system", due: "Tomorrow", points: 7 },
    { id: "2", title: "Random task", due: "May 22", points: 12 },
    { id: "3", title: "Create wireframe system", due: "May 23", points: 13 },
  ]
  return (
    <div className="rounded-lg border p-4 bg-white">
      <h3 className="font-semibold mb-3">Due soon</h3>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between text-sm">
            <span>{t.title}</span>
            <span className="text-slate-500">{t.due}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
