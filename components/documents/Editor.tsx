"use client"; // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, BlockNoteEditor } from "@blocknote/react"; // ADDED BlockNoteEditor type
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core"; // NEW IMPORT: Block type from BlockNote core

import "@blocknote/mantine/style.css";



// Define props for the Editor component
interface EditorProps {
  initialContent: Block[] | null; // UPDATED: Explicitly type as Block[] | null
  onChange: (document: Block[]) => void; // UPDATED: onChange expects Block[]
}

// Our <Editor> component we can reuse later
export default function Editor({ initialContent, onChange }: EditorProps) { // Added types to props
  // The initialContent is already a Block[] | null from the GraphQL query.
  // No need for JSON.parse or complex parsing logic here.
  // We can pass it directly to useCreateBlockNote.

  // If initialContent is null or empty array, BlockNote will start with a default empty paragraph.
  // The `useCreateBlockNote` hook internally handles default content if `initialContent` is undefined or empty.
  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined // Pass null as undefined to let BlockNote handle defaults
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      theme='light'
      editor={editor}
      onChange={() => onChange?.(editor.document)} // editor.document already returns Block[]
    />
  );
}