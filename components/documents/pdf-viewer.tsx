"use client"

export function PdfViewer({ dataUrl }: { dataUrl: string }) {
  return (
    <div className="h-full min-h-[500px]">
      <object data={dataUrl} type="application/pdf" width="100%" height="100%">
        <iframe title="PDF" src={dataUrl} className="h-full w-full" />
      </object>
      {/* Fallback link if the browser can't render PDFs */}
      <div className="mt-2 text-xs text-slate-500">
        If the PDF failed to load,{" "}
        <a href={dataUrl} download className="text-emerald-700 underline">
          download it
        </a>
        .
      </div>
    </div>
  )
}
