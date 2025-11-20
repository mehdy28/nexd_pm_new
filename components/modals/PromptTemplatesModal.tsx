"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { templates, PromptTemplate, promptTemplateCategories } from "@/lib/prompts/prompt-templates"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PromptTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: PromptTemplate) => void
  isCreating: boolean
}

// Renders a preview of the prompt, highlighting variables.
const TemplatePreview = ({ template }: { template: PromptTemplate }) => {
  const fullText =
    template.content.map(block => (block.type === "text" ? block.value : "")).join("") +
    (template.context ? `\n\nContext:\n${template.context}` : "")

  const parts = fullText.split(/({{.*?}})/g).filter(part => part)

  return (
    <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-xs text-slate-700">
      {parts.map((part, i) =>
        part.startsWith("{{") && part.endsWith("}}") ? (
          <strong key={i} className="font-bold text-[#4ab5ae]">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </pre>
  )
}

export const PromptTemplatesModal = ({
  isOpen,
  onClose,
  onSelectTemplate,
  isCreating,
}: PromptTemplatesModalProps) => {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesCategory = category === "all" || template.category === category
      const matchesSearch =
        template.name.toLowerCase().includes(search.toLowerCase()) ||
        template.description.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [search, category])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col bg-white">
        <DialogHeader>
          <DialogTitle>Select a Prompt Template</DialogTitle>
        </DialogHeader>
        <div className="mb-4 flex gap-4 border-b pb-4">
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-grow"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {promptTemplateCategories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-grow overflow-y-auto pr-4">
          {filteredTemplates.length > 0 ? (
            <div className="space-y-6">
              {filteredTemplates.map(template => (
                <div key={template.name} className="flex flex-col gap-4 border-b pb-6 last:border-b-0">
                  <div>
                    <h4 className="font-semibold">{template.name}</h4>
                    <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                  </div>
                  <div className="w-full">
                    <TemplatePreview template={template} />
                  </div>
                  <Button
                    onClick={() => onSelectTemplate(template)}
                    disabled={isCreating}
                    className="self-end bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                  >
                    Use this template
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500">
              <p className="font-semibold">No templates found.</p>
              <p className="mt-1 text-sm">Try adjusting your search or filter.</p>
            </div>
          )}
        </div>
        {isCreating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#4ab5ae]" />
            <span className="ml-3 text-lg font-medium">Creating prompt...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}