import { Extension } from '@tiptap/core'

export const SlashCommand = Extension.create({
  name: 'slash-command',

  addOptions() {
    return {
      commands: [
        { name: 'Heading 1', command: 'toggleHeading', level: 1 },
        { name: 'Heading 2', command: 'toggleHeading', level: 2 },
        { name: 'Bullet List', command: 'toggleBulletList' },
        { name: 'Numbered List', command: 'toggleOrderedList' },
      ],
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-/': () => true,
    }
  },

  addProseMirrorPlugins() {
    return []
  },
})
