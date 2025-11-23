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


export const templates: PromptTemplate[] = [
  // 1. Prioritization and Focus
  {
    name: "Define 3 Key Personal Objectives (OKR Style)",
    category: "Productivity",
    description:
      "Establish clear, measurable objectives for the next period, focusing on professional growth or personal development, independent of any current project mandate.",
    model: "gpt-4o-mini",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Based on my current role and desired professional growth, help me define 3 measurable Objectives (O) for the next",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{TIMEFRAME}}",
        name: "TIMEFRAME",
        value: "{{TIMEFRAME}}",
      },
      {
        type: "text",
        id: "t2",
        value: ". For each objective, propose 2-3 specific and quantifiable Key Results (KRs) that track progress. My core areas of focus are:\n\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{FOCUS_AREAS}}",
        name: "FOCUS_AREAS",
        value: "{{FOCUS_AREAS}}",
      },
    ],
    context: "Format the output clearly using the OKR structure (Objective 1 -> Key Results). Ensure KRs are challenging yet achievable and quantifiable. Do not reference specific project tasks.",
    variables: [
      {
        name: "Timeframe",
        placeholder: "{{TIMEFRAME}}",
        type: "SELECT",
        description: "The time horizon for these objectives.",
        defaultValue: "Quarter",
      },
      {
        name: "Focus Areas",
        placeholder: "{{FOCUS_AREAS}}",
        type: "RICH_TEXT",
        description: "General areas for personal improvement (e.g., leadership, technical depth, communication, process efficiency).",
        defaultValue: "Improving team mentorship skills, reducing time spent on administrative tasks, learning advanced Python features.",
      },
    ],
  },
  // 2. Decision Making Framework
  {
    name: "Apply Pro/Con Analysis (Decision Matrix)",
    category: "Business",
    description:
      "Use a structured decision framework to evaluate a non-project related choice (e.g., career move, tool adoption, learning path).",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Analyze the following decision scenario using a weighted Pro/Con Matrix. The two primary options are Option A and Option B. The most important criteria for evaluation, in order of importance, are:\n\n",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{CRITERIA}}",
        name: "CRITERIA",
        value: "{{CRITERIA}}",
      },
      {
        type: "text",
        id: "t2",
        value: "\n\nDecision Scenario and Options:\n\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{SCENARIO}}",
        name: "SCENARIO",
        value: "{{SCENARIO}}",
      },
      {
        type: "text",
        id: "t3",
        value: "\n\nBased on a qualitative assessment against the criteria, which option is tentatively recommended?",
      },
    ],
    context: "Generate the analysis in a table format showing the criteria, weights, pros/cons for each option, and a final recommendation based on the combined qualitative score.",
    variables: [
      {
        name: "Criteria",
        placeholder: "{{CRITERIA}}",
        type: "RICH_TEXT",
        description: "The key factors for evaluation (e.g., long-term growth, cost, time investment, job satisfaction).",
        defaultValue: "Job Satisfaction, Salary Potential, Skill Acquisition Relevance.",
      },
      {
        name: "Scenario",
        placeholder: "{{SCENARIO}}",
        type: "RICH_TEXT",
        description: "Describe the decision (e.g., Should I move from Development to Product Management? Option A: Dev, Option B: PM).",
        defaultValue: "I am considering two new job offers. Option A is a smaller startup with high risk/high reward. Option B is a stable, established corporation.",
      },
    ],
  },
  // 3. Time Management and Blocking Analysis
  {
    name: "Identify Time Sinks and Efficiency Gains",
    category: "Productivity",
    description:
      "Analyze a typical work week to pinpoint non-essential tasks or major distractions, and suggest concrete strategies for blocking and focused work.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Analyze my typical weekly routine and activities listed below. Identify the 3 largest 'time sinks' or inefficiencies. Then, propose a structured time-blocking schedule for a maximum of 3 hours per day focused work, centered around the",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{TIME_OF_DAY}}",
        name: "TIME_OF_DAY",
        value: "{{TIME_OF_DAY}}",
      },
      {
        type: "text",
        id: "t2",
        value: ".\n\nMy Weekly Activities Summary:\n\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{WEEKLY_SUMMARY}}",
        name: "WEEKLY_SUMMARY",
        value: "{{WEEKLY_SUMMARY}}",
      },
    ],
    context: "The output must be structured into two sections: 1) Identified Time Sinks and Recommended Fixes, and 2) A Sample 'Deep Work' Time-Blocking Schedule (Monday to Friday).",
    variables: [
      {
        name: "Time of Day",
        placeholder: "{{TIME_OF_DAY}}",
        type: "SELECT",
        description: "When are you most productive?",
        defaultValue: "Morning (8:00 AM - 11:00 AM)",
      },
      {
        name: "Weekly Summary",
        placeholder: "{{WEEKLY_SUMMARY}}",
        type: "RICH_TEXT",
        description: "Briefly list how your time is spent (e.g., 10 meetings, 5 hours on email, 15 hours coding, 3 hours context switching).",
        defaultValue: "Too many unnecessary Slack notifications. Four hours of mandatory check-in meetings. Two hours spent searching for documents daily. 1 hour of procrastination after lunch.",
      },
    ],
  },
  // 4. Learning Path/Skill Development
  {
    name: "Create a Structured Learning Path for a New Skill",
    category: "Development",
    description:
      "Generate a step-by-step roadmap for acquiring a new, non-project specific professional skill, including resources and milestones.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "I want to learn the professional skill:",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{NEW_SKILL}}",
        name: "NEW_SKILL",
        value: "{{NEW_SKILL}}",
      },
      {
        type: "text",
        id: "t2",
        value: ". Assume I have a current proficiency level of",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{CURRENT_LEVEL}}",
        name: "CURRENT_LEVEL",
        value: "{{CURRENT_LEVEL}}",
      },
      {
        type: "text",
        id: "t3",
        value: ". Create a 4-stage learning path (Foundational, Intermediate, Advanced, Mastery) detailing specific learning objectives, suggested resources (e.g., book topics, course type), and a measurable deliverable for each stage.",
      },
    ],
    context: "Focus on creating actionable, self-directed learning goals. Do not suggest specific course names, but rather the type of resource needed (e.g., 'A university-level textbook on concurrency').",
    variables: [
      {
        name: "New Skill",
        placeholder: "{{NEW_SKILL}}",
        type: "STRING",
        description: "The skill to acquire (e.g., Advanced SQL Optimization, Public Speaking, Terraform).",
        defaultValue: "Advanced Data Visualization with D3.js",
      },
      {
        name: "Current Level",
        placeholder: "{{CURRENT_LEVEL}}",
        type: "SELECT",
        description: "Your current familiarity with the skill.",
        defaultValue: "Beginner",
      },
    ],
  },
  // 5. General Communication Prep
  {
    name: "Structure a Difficult Professional Conversation",
    category: "Business",
    description:
      "Prepare talking points and a structured outline for a sensitive or challenging non-project related discussion (e.g., asking for a raise, giving negative feedback, discussing boundaries).",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Prepare a structured script and talking points for a difficult conversation with a",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{AUDIENCE_ROLE}}",
        name: "AUDIENCE_ROLE",
        value: "{{AUDIENCE_ROLE}}",
      },
      {
        type: "text",
        id: "t2",
        value: ". The main goal of the conversation is to",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{CONVERSATION_GOAL}}",
        name: "CONVERSATION_GOAL",
        value: "{{CONVERSATION_GOAL}}",
      },
      {
        type: "text",
        id: "t3",
        value: ". The specific context and challenges are:\n\n",
      },
      {
        type: "variable",
        id: "p3",
        placeholder: "{{CONTEXT_DETAILS}}",
        name: "CONTEXT_DETAILS",
        value: "{{CONTEXT_DETAILS}}",
      },
    ],
    context: "Use a non-confrontational, professional tone. Structure the response using the following steps: 1) Opening (Set the stage), 2) Facts/Observations (Evidence), 3) Impact (Why it matters), 4) Proposed Solution/Request, and 5) Next Steps/Commitment.",
    variables: [
      {
        name: "Audience Role",
        placeholder: "{{AUDIENCE_ROLE}}",
        type: "STRING",
        description: "The person you are speaking to (e.g., Manager, Direct Report, Colleague).",
        defaultValue: "Direct Manager",
      },
      {
        name: "Conversation Goal",
        placeholder: "{{CONVERSATION_GOAL}}",
        type: "STRING",
        description: "The desired outcome (e.g., Negotiate a higher salary band, delegate a long-standing responsibility, discuss recurring behavioral issue).",
        defaultValue: "Request higher compensation based on market data and increased responsibilities.",
      },
      {
        name: "Context Details",
        placeholder: "{{CONTEXT_DETAILS}}",
        type: "RICH_TEXT",
        description: "Any relevant background information or history.",
        defaultValue: "I have taken on 50% more workload since January, and my compensation review is scheduled for next month. I want to initiate the conversation early.",
      },
    ],
  },
  // 6. Problem Solving / Root Cause Analysis (Personal/Process)
  {
    name: "Perform 5 Whys Root Cause Analysis (Process)",
    category: "Productivity",
    description:
      "Apply the 5 Whys technique to identify the non-technical, human-error, or process-related root cause of a recurring professional setback or failure.",
    model: "gpt-4o-mini",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Apply the '5 Whys' root cause analysis methodology to the following recurring issue or failure in my professional life:\n\n",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{PROBLEM_STATEMENT}}",
        name: "PROBLEM_STATEMENT",
        value: "{{PROBLEM_STATEMENT}}",
      },
      {
        type: "text",
        id: "t2",
        value: "\n\nStructure the output clearly showing the chain of cause-and-effect (Why 1 through Why 5), and propose a final, systemic corrective action.",
      },
    ],
    context: "Ensure each subsequent 'Why' digs deeper into the cause of the previous answer. The final answer should address a system, process, or personal habit, not just a symptom.",
    variables: [
      {
        name: "Problem Statement",
        placeholder: "{{PROBLEM_STATEMENT}}",
        type: "RICH_TEXT",
        description: "The recurring issue you want to solve (e.g., 'I consistently miss minor details in final reviews' or 'Team handoffs frequently break due to forgotten context').",
        defaultValue: "I constantly feel stressed and overworked by Friday afternoon.",
      },
    ],
  },
  // 7. Reframing Negative Feedback
  {
    name: "Convert Critical Feedback into Actionable Goals",
    category: "Productivity",
    description:
      "Take vague or critical professional feedback and transform it into three clear, positive, and measurable development goals.",
    model: "gpt-4o-mini",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Analyze the following professional performance feedback I received. This feedback is currently negative and vague. Convert it into three distinct, measurable, and positive action items or development goals. \n\nOriginal Feedback:\n\n",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{FEEDBACK_TEXT}}",
        name: "FEEDBACK_TEXT",
        value: "{{FEEDBACK_TEXT}}",
      },
      {
        type: "text",
        id: "t2",
        value: "\n\nMy professional role is:\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{ROLE}}",
        name: "ROLE",
        value: "{{ROLE}}",
      },
    ],
    context: "The output should be a numbered list of goals, each starting with a clear verb (e.g., 'Initiate...', 'Document...', 'Seek...'). The focus must shift from past failure to future action.",
    variables: [
      {
        name: "Feedback Text",
        placeholder: "{{FEEDBACK_TEXT}}",
        type: "RICH_TEXT",
        description: "The specific, raw feedback you received.",
        defaultValue: "You need to be more proactive in meetings and your communication style is too technical for non-engineering stakeholders.",
      },
      {
        name: "Role",
        placeholder: "{{ROLE}}",
        type: "STRING",
        description: "Your professional title (e.g., Senior Software Engineer, Marketing Lead).",
        defaultValue: "Product Manager",
      },
    ],
  },
  // 8. Content Repurposing (General thought leadership)
  {
    name: "Brainstorm 5 Thought Leadership Topics",
    category: "Marketing",
    description:
      "Generate topics and titles for personal professional content (blog, presentation, talk) based on expertise, aiming to establish user authority.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Generate five compelling thought leadership topics and corresponding titles suitable for a technical blog or conference presentation. The content should leverage my core expertise in:\n\n",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{EXPERTISE}}",
        name: "EXPERTISE",
        value: "{{EXPERTISE}}",
      },
      {
        type: "text",
        id: "t2",
        value: "\n\nFocus on topics that are forward-looking and appeal to an audience of",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{AUDIENCE}}",
        name: "AUDIENCE",
        value: "{{AUDIENCE}}",
      },
      {
        type: "text",
        id: "t3",
        value: ".",
      },
    ],
    context: "Each topic must include a snappy, catchy title and a 2-3 sentence abstract explaining the value proposition to the audience. Ensure the topics are high-level and not tied to internal company tools or projects.",
    variables: [
      {
        name: "Expertise",
        placeholder: "{{EXPERTISE}}",
        type: "RICH_TEXT",
        description: "Your professional niche (e.g., cloud security, design thinking, scaling distributed databases, B2B SaaS sales).",
        defaultValue: "Automated testing strategies for microservices and CI/CD pipeline efficiency.",
      },
      {
        name: "Audience",
        placeholder: "{{AUDIENCE}}",
        type: "SELECT",
        description: "The primary audience for the content.",
        defaultValue: "Mid-level Engineers and Technical Leaders",
      },
    ],
  },
  // 9. Simplified Technical Explanation
  {
    name: "Summarize a Technical Paper for Executives",
    category: "Development",
    description:
      "Condense dense technical or theoretical documentation into a high-level summary suitable for non-technical leadership or non-specialists.",
    model: "gpt-4o-mini",
    content: [
      {
        type: "text",
        id: "t1",
        value: "Summarize the key takeaways, potential business impact, and next steps from the following technical or academic text, focusing on clarity for an executive or business audience. The summary should be a maximum of",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{WORD_COUNT}}",
        name: "WORD_COUNT",
        value: "{{WORD_COUNT}}",
      },
      {
        type: "text",
        id: "t2",
        value: "words. Avoid all unnecessary jargon.\n\nSource Text:\n\n",
      },
      {
        type: "variable",
        id: "p2",
        placeholder: "{{SOURCE_TEXT}}",
        name: "SOURCE_TEXT",
        value: "{{SOURCE_TEXT}}",
      },
    ],
    context: "Structure the output into three sections: 1) Core Concept, 2) Business Relevance (Opportunity/Risk), and 3) Recommended Action/Next Steps. Focus purely on translating the provided text.",
    variables: [
      {
        name: "Max Word Count",
        placeholder: "{{WORD_COUNT}}",
        type: "NUMBER",
        description: "Maximum length of the final summary.",
        defaultValue: "150",
      },
      {
        name: "Source Text",
        placeholder: "{{SOURCE_TEXT}}",
        type: "RICH_TEXT",
        description: "Paste the content of the technical paper, standard draft, or complex documentation.",
        defaultValue: "The implementation of the new RPC protocol, leveraging gRPC with Protobuf schema validation, promises a 40% reduction in inter-service latency, provided we successfully integrate the Kubernetes sidecar architecture which is pending a security review of the network mesh policy deployment.",
      },
    ],
  },
  // 10. General Brainstorming / Idea Expansion
  {
    name: "Generate Creative Solutions to a Block",
    category: "Productivity",
    description:
      "Use brainstorming techniques (like SCAMPER) to break through a general professional or creative block by forcing alternative perspectives.",
    model: "gpt-4o",
    content: [
      {
        type: "text",
        id: "t1",
        value: "I am facing a creative block or challenge related to my work process, described below. Apply the SCAMPER method (Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse) to generate 7 distinct, non-obvious solutions or alternatives. \n\nMy professional challenge is:\n\n",
      },
      {
        type: "variable",
        id: "p1",
        placeholder: "{{CHALLENGE}}",
        name: "CHALLENGE",
        value: "{{CHALLENGE}}",
      },
    ],
    context: "Output must be a numbered list of solutions, with each solution explicitly linked to one of the SCAMPER actions (e.g., 'S - Substitute: Replace X with Y'). Focus on process or conceptual challenges.",
    variables: [
      {
        name: "Challenge",
        placeholder: "{{CHALLENGE}}",
        type: "RICH_TEXT",
        description: "The process or conceptual problem you are stuck on (e.g., 'I cannot find a way to make daily reports engaging' or 'My new design concept feels stale').",
        defaultValue: "My workflow for creating proposals is too linear and takes too long to gather initial data, resulting in missed deadlines.",
      },
    ],
  },
]

export const promptTemplateCategories = [...new Set(templates.map(t => t.category))].sort()