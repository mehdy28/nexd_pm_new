// components/documents/Editor.tsx

"use client" // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import type { Block } from "@blocknote/core"

import "@blocknote/mantine/style.css"

// Define props for the Editor component
interface EditorProps {
  initialContent: Block[] | null
  onChange: (document: Block[]) => void
}

// Our <Editor> component we can reuse later
export default function Editor({ initialContent, onChange }: EditorProps) {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // FIX: Blocknote throws an error if initialContent is an empty array.
    // This logic ensures that if initialContent is null or an empty array,
    // we pass `undefined` to the hook, which correctly initializes
    // the editor with a default empty paragraph block.
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
  })

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      theme="light"
      editor={editor}
      onChange={() => {
        onChange?.(editor.document)
      }} // editor.document already returns Block[]
    />
  )
}