import { PromptVariable, Block } from "@/components/prompt-lab/store"

export type PromptTemplate = {
  name: string
  category: "Business" | "Marketing" | "Productivity" | "Development"
  description: string
  model: string
  content: Block[]
  context: string
  variables: Omit<PromptVariable, "id">[]
}

export const templates: PromptTemplate[] = [
  {
    name: "Brainstorm Blog Post Ideas",
    category: "Marketing",
    description:
      "Generate a list of compelling blog post titles and brief outlines based on a specific topic and target audience. Helps kickstart your content creation process.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value:
          "Generate 10 blog post ideas for the topic of {{TOPIC}}. Each idea should include a catchy title and a brief 2-sentence outline. The target audience is {{AUDIENCE}}.",
      },
    ],
    context: "Focus on creating titles that are engaging, unique, and SEO-friendly.",
    variables: [
      {
        name: "Topic",
        placeholder: "{{TOPIC}}",
        type: "STRING",
        description: "The main subject for the blog posts.",
        defaultValue: "AI in Project Management",
      },
      {
        name: "Audience",
        placeholder: "{{AUDIENCE}}",
        type: "STRING",
        description: "The intended readers for the blog posts.",
        defaultValue: "Tech-savvy Project Managers",
      },
    ],
  },
  {
    name: "Summarize Text",
    category: "Productivity",
    description:
      "Condense a long piece of text into a specific number of key bullet points. Ideal for quickly understanding articles, reports, or documents.",
    model: "gpt-4o-mini",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Summarize the following text into {{COUNT}} key bullet points:\n\n{{TEXT_TO_SUMMARIZE}}",
      },
    ],
    context: "Each bullet point should be a complete sentence and capture a main idea from the text.",
    variables: [
      {
        name: "Number of Points",
        placeholder: "{{COUNT}}",
        type: "NUMBER",
        description: "How many bullet points to summarize the text into.",
        defaultValue: "3",
      },
      {
        name: "Text to Summarize",
        placeholder: "{{TEXT_TO_SUMMARIZE}}",
        type: "RICH_TEXT",
        description: "The full text content that you want to be summarized.",
        defaultValue: "Paste your long article or report here...",
      },
    ],
  },
  {
    name: "Rewrite in a Different Tone",
    category: "Business",
    description:
      "Adapt existing text to a different tone of voice, such as professional, casual, or enthusiastic. Useful for tailoring messages to different audiences.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Rewrite the following text in a {{TONE}} tone:\n\n{{ORIGINAL_TEXT}}" },
    ],
    context:
      "Maintain the core message and meaning of the original text while fully adopting the new specified tone.",
    variables: [
      {
        name: "Tone",
        placeholder: "{{TONE}}",
        type: "SELECT",
        description: "The desired tone of voice for the rewritten text.",
        defaultValue: "more professional",
      },
      {
        name: "Original Text",
        placeholder: "{{ORIGINAL_TEXT}}",
        type: "RICH_TEXT",
        description: "The text you want to rewrite.",
        defaultValue: "Hey guys, we need to get this done ASAP.",
      },
    ],
  },
  {
    name: "Generate User Stories",
    category: "Development",
    description:
      "Create well-formed user stories for a software feature. Follows the standard 'As a [user], I want [goal], so that [benefit]' format.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Generate 5 user stories for the following feature: {{FEATURE_DESCRIPTION}}.",
      },
    ],
    context:
      "Each user story should be from the perspective of an end-user and clearly state their goal and the benefit they receive. Include acceptance criteria for each story.",
    variables: [
      {
        name: "Feature Description",
        placeholder: "{{FEATURE_DESCRIPTION}}",
        type: "RICH_TEXT",
        description: "A detailed description of the software feature to be developed.",
        defaultValue: "A user profile page where users can update their name, email, and avatar.",
      },
    ],
  },
]

export const promptTemplateCategories = [...new Set(templates.map(t => t.category))].sort()
