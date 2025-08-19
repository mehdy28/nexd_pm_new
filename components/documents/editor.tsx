"use client"

import { Textarea } from "@/components/ui/textarea"
import { useEffect, useMemo } from "react"

type Props = {
  docId: string
  contentJSON: string // previously BlockNote JSON; we now treat it as plain text
  onChange: (json: string) => void
}

/**
 * Minimal document editor without external deps (avoids 'lib0' resolution errors).
 * It renders a textarea and persists changes via onChange.
 */
export function DocumentEditor({ docId, contentJSON, onChange }: Props) {
  // If the previous content was BlockNote JSON (array), show a readable fallback
  const initial = useMemo(() => {
    try {
      // If it's a valid JSON array from BlockNote, prettify for readability
      const parsed = JSON.parse(contentJSON)
      if (Array.isArray(parsed)) return JSON.stringify(parsed, null, 2)
    } catch {
      // not JSON; fall through
    }
    return contentJSON || ""
  }, [contentJSON])

  // Ensure the content is present when the editor mounts (no-op if already set by parent)
  useEffect(() => {
    if (!contentJSON) onChange(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  return (
    <div className="min-h-0 flex-1">
      <Textarea
        key={docId}
        className="min-h-[400px] font-mono"
        value={contentJSON ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Start writing..."}
      />
    </div>
  )
}
