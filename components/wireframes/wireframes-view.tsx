// components/wireframes/WireframesView.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, PencilLine, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WireframeEditorComponent from "@/components/wireframes/wireframe-editor";
import { useProjectWireframes } from "@/hooks/useWireframes";
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";

export function WireframesView({ projectId }: { projectId?: string }) {
  const {
    wireframes: pageItems,
    totalCount,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    refetch,
    createWireframe,
    updateWireframe,
    deleteWireframe,
  } = useProjectWireframes(projectId || "");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editingWireframeId, setEditingWireframeId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null);
  const [renamingWireframeId, setRenamingWireframeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Clear selection when page or data changes
  useEffect(() => {
    setSelected({});
  }, [page, pageSize, search, pageItems]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(startItem + pageSize - 1, totalCount);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }));
  }, []);

  const handleCreateNew = useCallback(async () => {
    if (!projectId) return;
    try {
      const newWireframe = await createWireframe("Untitled Wireframe", { nodes: [], edges: [] });
      if (newWireframe) {
        setEditingWireframeId(newWireframe.id);
      }
    } catch (err) {
      console.error("Failed to create new wireframe:", err);
    }
  }, [projectId, createWireframe]);

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setRenamingWireframeId(id);
    setEditingTitle(currentTitle);
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!renamingWireframeId) return;

    const originalWireframe = pageItems.find(w => w.id === renamingWireframeId);
    const newTitle = editingTitle.trim();

    if (originalWireframe && newTitle && newTitle !== originalWireframe.title) {
      try {
        await updateWireframe(renamingWireframeId, { title: newTitle });
      } catch (err) {
        console.error("Failed to rename wireframe:", err);
      }
    }
    setRenamingWireframeId(null);
    setEditingTitle("");
  }, [renamingWireframeId, editingTitle, updateWireframe, pageItems]);

  const handleRenameInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleConfirmRename();
      } else if (e.key === "Escape") {
        setRenamingWireframeId(null);
        setEditingTitle("");
      }
    },
    [handleConfirmRename]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const idsToDelete = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget];
      await Promise.all(idsToDelete.map(id => deleteWireframe(id)));
      setSelected({});
      if (editingWireframeId && idsToDelete.includes(editingWireframeId)) {
        setEditingWireframeId(null);
      }
    } catch (err) {
      console.error("Failed to delete wireframe(s):", err);
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteWireframe, editingWireframeId]);

  const handleBulkDelete = useCallback(() => {
    const idsToDelete = Object.keys(selected).filter(id => selected[id]);
    if (idsToDelete.length > 0) {
      setDeleteTarget(idsToDelete);
    }
  }, [selected]);

  const handleExportSelected = useCallback(() => {
    const idsToExport = Object.keys(selected).filter(id => selected[id]);
    const dataToExport = pageItems.filter(w => idsToExport.includes(w.id));
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wireframes-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selected, pageItems]);

  if (editingWireframeId) {
    return (
      <WireframeEditorComponent wireframeId={editingWireframeId} onBack={() => { setEditingWireframeId(null); refetch(); }} />
    );
  }

  if (loading && pageItems.length === 0) {
    return <LoadingPlaceholder message="Loading wireframes..." />;
  }

  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetch} />;
  }

  const deleteModalDescription =
    deleteTarget && Array.isArray(deleteTarget)
      ? `You are about to permanently delete ${deleteTarget.length} wireframes. This action cannot be undone.`
      : "You are about to permanently delete this wireframe. This action cannot be undone.";

  return (
    <>
      <div className="flex h-full flex-col p-4">
        <div className="saas-card flex flex-1 flex-col overflow-hidden p-4">
          <div className="mb-4 shrink-0 border-b pb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 sm:w-[280px]"
                placeholder="Search wireframes..."
              />
              <div className="flex items-center justify-start gap-2 md:justify-end">
                {selectedCount > 0 && (
                  <>
                    <Button variant="outline" className="h-9 bg-transparent" onClick={handleExportSelected}>
                      Export ({selectedCount})
                    </Button>
                    <Button variant="destructive" className="h-9" onClick={handleBulkDelete}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete selected
                    </Button>
                  </>
                )}
                <Button className="h-9 btn-primary bg-[#4ab5ae] text-white hover:bg-[#419d97]" onClick={handleCreateNew}>
                  <Plus className="mr-1 h-4 w-4" />
                  New wireframe
                </Button>
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto">
            {loading && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-white/50">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            {pageItems.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pageItems.map(w => (
                  <article key={w.id} className="group relative overflow-hidden rounded-lg border">
                    <div className="absolute left-2 top-2 z-10">
                      <Checkbox
                        checked={!!selected[w.id]}
                        onCheckedChange={v => toggleSelect(w.id, !!v)}
                        aria-label="Select wireframe"
                      />
                    </div>
                    <div onClick={() => setEditingWireframeId(w.id)} title="Open wireframe" className="block cursor-pointer">
                      <div className="aspect-[16/10] w-full bg-slate-50">
                        <img
                          src={w.thumbnail || "/placeholder.svg"}
                          alt={`${w.title} preview`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="min-w-0 flex-1">
                        {renamingWireframeId === w.id ? (
                          <Input
                            autoFocus
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onBlur={handleConfirmRename}
                            onKeyDown={handleRenameInputKeyDown}
                            className="h-7 text-sm"
                          />
                        ) : (
                          <div className="truncate text-sm font-medium">{w.title}</div>
                        )}
                        <div className="text-xs text-slate-500">Updated {timeAgo(new Date(w.updatedAt).getTime())}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => handleStartRename(w.id, w.title)}
                          title="Rename"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(w.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : !loading ? (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
                <div>
                  <p>No wireframes found.</p>
                  <p className="mt-1">Click “New wireframe” to get started.</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 shrink-0 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Showing {startItem}–{endItem} of {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">8</SelectItem>
                    <SelectItem value="12" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">12</SelectItem>
                    <SelectItem value="20" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">20</SelectItem>
                    <SelectItem value="40" className="data-[state=checked]:bg-[#4ab5ae] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#419d97]">40</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="h-8 bg-transparent"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  title="Previous"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[80px] text-center text-sm">
                  Page {page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  className="h-8 bg-transparent"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  title="Next"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>{deleteModalDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
