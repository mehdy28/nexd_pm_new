'use client'

import type { Version } from "./store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GitCommit, History, FileDiff } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface PromptVersionsProps {
  versions: Version[]
  activeVersionId: string
  onSelectVersion: (id: string) => void
  onCompareVersion: (version: Version) => void
}

export function PromptVersions({
  versions,
  activeVersionId,
  onSelectVersion,
  onCompareVersion,
}: PromptVersionsProps) {
  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <History className="h-10 w-10 text-slate-400 mb-4" />
        <h3 className="font-semibold text-slate-700">No Version History</h3>
        <p className="text-sm text-slate-500">
          Make changes to the prompt and save a snapshot to create a version.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-1">
        <h3 className="font-semibold text-sm text-slate-800 px-3 pt-2 pb-1">Version History</h3>
        <div className="flex flex-col gap-1">
          {versions.map((v) => (
            <div
              key={v.id}
              className={cn(
                "rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50 p-2 cursor-pointer group",
                v.id === activeVersionId && "bg-blue-50 border-blue-200 hover:bg-blue-50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3" onClick={() => onSelectVersion(v.id)}>
                  <GitCommit className="h-4 w-4 mt-1 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                    </p>
                    <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{v.notes || "(No notes)"}</p> {/* Use notes here */}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Compare with current version"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCompareVersion(v)
                    }}
                  >
                    <FileDiff className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}