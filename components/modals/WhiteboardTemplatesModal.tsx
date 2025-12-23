"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { templates, Template, templateCategories } from "@/lib/whiteBoard/whiteBoard-templates"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WhiteboardTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: Template) => void
  isCreating: boolean
}

export const WhiteboardTemplatesModal = ({
  isOpen,
  onClose,
  onSelectTemplate,
  isCreating,
}: WhiteboardTemplatesModalProps) => {
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

  const groupedTemplates = useMemo(() => {
    return filteredTemplates.reduce(
      (acc, template) => {
        const category = template.category
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(template)
        return acc
      },
      {} as Record<string, Template[]>,
    )
  }, [filteredTemplates])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col bg-white">
        <DialogHeader>
          <DialogTitle>Select a Template</DialogTitle>
        </DialogHeader>
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
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
              {templateCategories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-grow overflow-y-auto pr-4">
          {Object.keys(groupedTemplates).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedTemplates).map(([category, templatesInCategory], index) => (
                <section
                  key={category}
                  className={index < Object.keys(groupedTemplates).length - 1 ? "border-b pb-8" : ""}
                >
                  <h3 className="mb-4 text-xl font-semibold text-slate-800">{category}</h3>
                  <div className="space-y-6">
                    {templatesInCategory.map(template => (
                      <div key={template.name} className="flex flex-col gap-6 sm:flex-row">
                        {/* Image container made wider */}
                        <div className="w-full sm:w-1/2">
                          <div className="aspect-video overflow-hidden rounded-md border bg-white">
                            <img
                              src={template.previewImage}
                              alt={`${template.name} preview`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </div>
                        {/* Text content container */}
                        <div className="flex w-full flex-col sm:w-1/2">
                          <h4 className="font-semibold">{template.name}</h4>
                          {/* Description font size increased */}
                          <p className="mt-1 flex-grow text-base text-slate-600">{template.description}</p>
                          <Button
                            onClick={() => onSelectTemplate(template)}
                            disabled={isCreating}
                            className="mt-4 self-end bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                          >
                            Use this template
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
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
            <span className="ml-3 text-lg font-medium">Creating Whiteboard...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}