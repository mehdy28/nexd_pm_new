"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

interface EditorProps {
  initialContent?: any; // BlockNote JSON blocks
  onChange?: (content: any) => void;
  selected?: { content?: any[] }; // Optional selected document
}

export default function Editor({
  initialContent,
  onChange,
  selected,
}: EditorProps) {
  // --- Default initial content: single empty paragraph ---
  const defaultContent = [
    { type: "paragraph", content: [] }
  ];

  // --- Determine content to load ---
  const contentToLoad = initialContent?.length
    ? initialContent
    : selected?.content?.length
    ? selected.content
    : defaultContent;

  // --- Create BlockNote editor instance ---
  const editor = useCreateBlockNote({
    initialContent: contentToLoad,
  });

  // --- Attach onChange handler ---
  editor?.onChange((blocks) => {
    onChange?.(blocks);
  });

  if (!editor) return null;

  return (
    <div className="h-full w-full">
      <BlockNoteView   theme="light" editor={editor} />
    </div>
  );
}
