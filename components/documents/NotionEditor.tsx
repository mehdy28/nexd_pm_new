// 'use client'

// import { useEditor, EditorContent } from '@tiptap/react'
// import StarterKit from '@tiptap/starter-kit'
// import TaskList from '@tiptap/extension-task-list'
// import TaskItem from '@tiptap/extension-task-item'
// import { TextStyle } from '@tiptap/extension-text-style'
// import { Color } from '@tiptap/extension-color'

// interface NotionEditorProps {
//   initialContent?: string
//   onChange?: (content: any) => void
// }

// export default function NotionEditor({
//   initialContent = '',
//   onChange,
// }: NotionEditorProps) {
//   const editor = useEditor({
//     extensions: [
//       StarterKit,
//       TextStyle,
//       Color,
//       TaskList.configure({ HTMLAttributes: { class: 'not-prose pl-2' } }),
//       TaskItem.configure({ HTMLAttributes: { class: 'flex items-start my-2' }, nested: true }),
//     ],
//     content: initialContent,
//     onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
//     immediatelyRender: false,
//     editorProps: {
//       attributes: {
//         class: 'prose dark:prose-invert m-2 focus:outline-none',
//       },
//     },
//   })

//   if (!editor) return null

//   return (
//     <div className="h-full w-full">
//       <EditorContent editor={editor} className="h-full w-full" />
//     </div>
//   )
// }


'use client'

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import dynamic from "next/dynamic";
import { useCreateBlockNote } from "@blocknote/react";

// Dynamically import the BlockNoteView for client-side only
const BlockNoteView = dynamic(
  () => import("@blocknote/mantine").then((mod) => mod.BlockNoteView),
  { ssr: false }
);

interface NotionEditorProps {
  initialContent?: any; // BlockNote uses a block JSON structure
  onChange?: (content: any) => void;
}

export default function NotionEditor({
  initialContent = { type: "doc", content: [] },
  onChange,
}: NotionEditorProps) {
  // Create an editor instance
  const editor = useCreateBlockNote();

  if (!editor) return null;

  return (
    <div className="h-full w-full">
      <BlockNoteView
        editor={editor}
        initialContent={initialContent}
        onChange={() => onChange?.(editor.document)}
      />
    </div>
  );
}
