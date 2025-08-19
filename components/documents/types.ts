export type BaseDoc = {
  id: string
  title: string
  updatedAt: number
}

export type RichTextDoc = BaseDoc & {
  type: "doc"
  // BlockNote JSON (stringified array of blocks)
  content: string
}

export type PdfDoc = BaseDoc & {
  type: "pdf"
  dataUrl: string // base64 data URL stored for preview/persistence
  fileName?: string
}

export type Doc = RichTextDoc | PdfDoc
