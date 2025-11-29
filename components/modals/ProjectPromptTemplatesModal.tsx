"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { projectTemplates, PromptTemplate, projectPromptTemplateCategories } from "@/lib/prompts/project-prompt-templates"
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
  // Combine text blocks and placeholders for a realistic preview
  // Logic preserved from original file to match data shape
  const previewContent = template.content
    .map(block => {
      if (block.type === "text") {
        return block.value
      }
      // For variable blocks, we use the placeholder
      return block.placeholder
    })
    .join("")

  const fullText = previewContent + (template.context ? `\n\nContext:\n${template.context}` : "")

  const parts = fullText.split(/({{.*?}})/g).filter(part => part)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-slate-800">
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
    </div>
  )
}

export const ProjectPromptTemplatesModal = ({
  isOpen,
  onClose,
  onSelectTemplate,
  isCreating,
}: PromptTemplatesModalProps) => {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

  const filteredTemplates = useMemo(() => {
    return projectTemplates.filter(template => {
      const matchesCategory = category === "all" || template.category === category
      const matchesSearch =
        template.name.toLowerCase().includes(search.toLowerCase()) ||
        template.description.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [search, category])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col bg-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">Select a Project Prompt Template</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6 border-b bg-slate-50/50">
          <div className="flex gap-4">
            <Input
              placeholder="Search project templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-grow bg-white"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {projectPromptTemplateCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-6 py-4">
          {filteredTemplates.length > 0 ? (
            <div className="space-y-8">
              {filteredTemplates.map(template => (
                <div key={template.name} className="flex flex-col gap-4 border-b pb-8 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{template.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">{template.description}</p>
                    </div>
                    <Button
                      onClick={() => onSelectTemplate(template)}
                      disabled={isCreating}
                      className="bg-[#4ab5ae] text-white hover:bg-[#419d97] shrink-0"
                    >
                      Use Template
                    </Button>
                  </div>
                  
                  <div className="w-full">
                    <TemplatePreview template={template} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <p className="text-lg font-medium">No templates found</p>
              <p className="mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </div>

        {isCreating && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-[#4ab5ae]" />
            <span className="mt-4 text-lg font-medium text-slate-700">Creating prompt...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
