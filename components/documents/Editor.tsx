"use client"; // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

import "@blocknote/mantine/style.css";

// Our <Editor> component we can reuse later
export default function Editor({ initialContent, onChange }) {
  let parsedContent: any[] | undefined = undefined;
  try {
    if (initialContent) {
      const parsed = JSON.parse(initialContent);
      // Check if the parsed content is an array of blocks and if it's not just an empty paragraph
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        !(
          parsed.length === 1 &&
          parsed[0].type === "paragraph" &&
          parsed[0].content &&
          parsed[0].content.length === 0
        )
      ) {
        parsedContent = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse initialContent for BlockNote:", e);
    parsedContent = undefined;
  }

  // Creates a new editor instance.
  const editor = useCreateBlockNote({ initialContent: parsedContent });

  // Renders the editor instance using a React component.
  return <BlockNoteView 
  theme='light'
  editor={editor} onChange={() => onChange?.(editor.document)} />;
}