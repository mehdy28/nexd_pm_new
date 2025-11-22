//lib/prompts/prompt-templates.ts
import { PromptVariable, Block } from "@/components/prompt-lab/store"

export type PromptTemplate = {
  name: string
  category: "Business" | "Marketing" | "Productivity" | "Development" | "Data Science"
  description: string
  model: string
  content: Block[] // Content now alternates between text and variable placeholder blocks
  context: string
  variables: Omit<PromptVariable, "id">[] // Separate variable definitions maintained
}

// NOTE: Blocks of type "variable" must include 'value', 'placeholder', and 'name'
// to satisfy client-side display and backend ContentBlock structure.
// The 'value' holds the placeholder string itself (e.g., "{{VARIABLE}}").

export const templates: PromptTemplate[] = [
  {
    name: "Draft Actionable Weekly Status Report",
    category: "Productivity",
    description:
      "Generate a structured weekly status report summarizing completed tasks, current blockers, and next week's priorities. Highly valuable for team and stakeholder communication within a project context.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Draft a professional weekly status report for Project:",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{PROJECT_NAME}}",
        name: "PROJECT_NAME",
        value: "{{PROJECT_NAME}}",
      },
      {
        type: "text",
        id: "t2",
        value: ". \n\nFocus on the following key areas:\n\n1. Accomplishments (Last Week)\n2. Blockers/Risks\n3. Priorities (Next Week)\n\nKey accomplishments from last week:\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{ACCOMPLISHMENTS}}",
        name: "ACCOMPLISHMENTS",
        value: "{{ACCOMPLISHMENTS}}",
      },
      {
        type: "text",
        id: "t3",
        value: "\n\nMajor blockers or risks:\n",
      },
      {
        type: "variable",
        id: "p3",
        placeholder: "{{BLOCKERS}}",
        name: "BLOCKERS",
        value: "{{BLOCKERS}}",
      },
      {
        type: "text",
        id: "t4",
        value: "\n\nPriorities for next week:\n",
      },
      {
        type: "variable",
        id: "p4",
        placeholder: "{{PRIORITIES}}",
        name: "PRIORITIES",
        value: "{{PRIORITIES}}",
      },
    ],
    context: "Ensure the tone is professional and concise. Structure the report using clear Markdown headings and bullet points. Clearly state the business impact of the accomplishments and risks.",
    variables: [
      {
        name: "Project Name",
        placeholder: "{{PROJECT_NAME}}",
        type: "STRING",
        description: "The name of the project or initiative.",
        defaultValue: "Q3 Feature Launch",
      },
      {
        name: "Accomplishments",
        placeholder: "{{ACCOMPLISHMENTS}}",
        type: "RICH_TEXT",
        description: "Detailed list of tasks completed and goals achieved in the last reporting period.",
        defaultValue: "Completed API migration; Finalized design review.",
      },
      {
        name: "Blockers",
        placeholder: "{{BLOCKERS}}",
        type: "RICH_TEXT",
        description: "Any issues currently preventing progress or posing a risk to the timeline.",
        defaultValue: "Awaiting final approval on legal documents.",
      },
      {
        name: "Priorities",
        placeholder: "{{PRIORITIES}}",
        type: "RICH_TEXT",
        description: "The 3-5 most critical tasks scheduled for the upcoming week.",
        defaultValue: "Start beta testing; Prepare launch communication.",
      },
    ],
  },
  {
    name: "Summarize Meeting Notes into Action Items",
    category: "Productivity",
    description:
      "Condense long meeting notes or transcripts into a prioritized list of clear, accountable action items with defined owners and due dates.",
    model: "gpt-4o-mini",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Analyze the following text (meeting notes, email, or report) and extract a maximum of",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{COUNT}}",
        name: "COUNT",
        value: "{{COUNT}}",
      },
      {
        type: "text",
        id: "t2",
        value: "prioritized action items. Each item must include the action, the responsible owner (if discernible), and a suggested due date. Prioritize the list by urgency.\n\nSource Text:\n\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{SOURCE_TEXT}}",
        name: "SOURCE_TEXT",
        value: "{{SOURCE_TEXT}}",
      },
    ],
    context: "Generate the output as a numbered list in Markdown. If the owner or due date is not mentioned, use 'Owner: TBD' or 'Due: TBD'.",
    variables: [
      {
        name: "Max Items",
        placeholder: "{{COUNT}}",
        type: "NUMBER",
        description: "Maximum number of action items to extract.",
        defaultValue: "5",
      },
      {
        name: "Source Text",
        placeholder: "{{SOURCE_TEXT}}",
        type: "RICH_TEXT",
        description: "Paste the meeting notes, transcript, or document content here.",
        defaultValue: "Meeting notes from Monday: John needs to schedule the client demo by Wednesday. Sarah will update the project roadmap this week. The documentation draft is due next Friday.",
      },
    ],
  },
  {
    name: "Rewrite Technical Update for Stakeholders",
    category: "Business",
    description:
      "Transform technical status updates or incident reports into concise, high-level summaries for executive leadership, focusing on impact, status, and next steps.",
    model: "gpt-4o",
    content: [
      { 
        type: "text", 
        id: "t1", 
        value: "Rewrite the following original technical communication into a message suitable for a C-suite audience. The tone should be"
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{TONE}}",
        name: "TONE",
        value: "{{TONE}}",
      },
      {
        type: "text", 
        id: "t2", 
        value: ". Focus on business impact, current status (green/yellow/red), and necessary executive decisions, minimizing technical jargon.\n\nOriginal Text:\n\n" 
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{ORIGINAL_TEXT}}",
        name: "ORIGINAL_TEXT",
        value: "{{ORIGINAL_TEXT}}",
      },
    ],
    context:
      "Maintain the core facts but translate technical risks into business risks (e.g., 'API latency' becomes 'potential customer churn'). Include a brief summary headline.",
    variables: [
      {
        name: "Tone",
        placeholder: "{{TONE}}",
        type: "SELECT",
        description: "The desired tone (e.g., confident, cautious, urgent, informative).",
        defaultValue: "confident",
      },
      {
        name: "Original Text",
        placeholder: "{{ORIGINAL_TEXT}}",
        type: "RICH_TEXT",
        description: "The technical update, report, or chat snippet you want to elevate.",
        defaultValue: "Hey guys, the DB indexer failed overnight, leading to high query latency. We are restarting the service now, which will cause 10 minutes of downtime. ETA 1 hour until full recovery.",
      },
    ],
  },
  {
    name: "Generate Epic User Stories",
    category: "Development",
    description:
      "Create well-formed, complete user stories (with Acceptance Criteria) for a large feature (Epic). Follows the standard 'As a [user], I want [goal], so that [benefit]' format.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Generate 5 detailed user stories and corresponding Acceptance Criteria (AC) for the following large feature (Epic). The primary user role is the",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{USER_ROLE}}",
        name: "USER_ROLE",
        value: "{{USER_ROLE}}",
      },
      {
        type: "text",
        id: "t2",
        value: ".\n\nEpic Description:\n\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{FEATURE_DESCRIPTION}}",
        name: "FEATURE_DESCRIPTION",
        value: "{{FEATURE_DESCRIPTION}}",
      },
    ],
    context:
      "Each user story should clearly state the goal and benefit. Acceptance criteria must be specific, testable, and written in Gherkin format (Given/When/Then) where possible.",
    variables: [
      {
        name: "User Role",
        placeholder: "{{USER_ROLE}}",
        type: "STRING",
        description: "The primary type of user performing the action (e.g., authenticated customer, internal admin, anonymous visitor).",
        defaultValue: "Registered Customer",
      },
      {
        name: "Feature Description",
        placeholder: "{{FEATURE_DESCRIPTION}}",
        type: "RICH_TEXT",
        description: "A detailed description of the large software feature (Epic) to be developed.",
        defaultValue: "Implement a customizable dashboard where users can monitor key performance indicators (KPIs) related to their usage and goals.",
      },
    ],
  },
  // NEW TEMPLATE
  {
    name: "Explain Data Science Concept",
    category: "Data Science",
    description:
      "Provides a clear and concise explanation of a complex data science or machine learning concept, tailored to a specified level of expertise. Essential for cross-functional communication.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Explain the concept of",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{CONCEPT}}",
        name: "CONCEPT",
        value: "{{CONCEPT}}",
      },
      {
        type: "text",
        id: "t2",
        value: "to a person with a",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{EXPERIENCE_LEVEL}}",
        name: "EXPERIENCE_LEVEL",
        value: "{{EXPERIENCE_LEVEL}}",
      },
      {
        type: "text",
        id: "t3",
        value: "level of expertise. Use simple analogies where possible, and summarize the practical application of the concept in a business setting.",
      },
    ],
    context: "Ensure the explanation is technically accurate but focuses on clarity and practical application for the specified audience. Format the output using clear Markdown headings and lists.",
    variables: [
      {
        name: "Concept",
        placeholder: "{{CONCEPT}}",
        type: "STRING",
        description: "The specific data science or machine learning concept (e.g., Random Forest, Dropout, Backpropagation, AUC-ROC).",
        defaultValue: "Gradient Descent",
      },
      {
        name: "Experience Level",
        placeholder: "{{EXPERIENCE_LEVEL}}",
        type: "SELECT",
        description: "The technical background of the audience (e.g., beginner, mid-level engineer, executive).",
        defaultValue: "beginner",
      },
    ],
  },
]

export const promptTemplateCategories = [...new Set(templates.map(t => t.category))].sort()




