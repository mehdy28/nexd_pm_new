// lib/prompts/project-prompt-templates.ts

// --- Standalone Type Definitions ---

// Enums required for defining dynamic variables.
export enum PromptVariableType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  DATE = "DATE",
  RICH_TEXT = "RICH_TEXT",
  LIST_OF_STRINGS = "LIST_OF_STRINGS",
  SELECT = "SELECT",
  DYNAMIC = "DYNAMIC",
}

export enum AggregationType {
  COUNT = "COUNT",
  SUM = "SUM",
  AVERAGE = "AVERAGE",
  LIST_FIELD_VALUES = "LIST_FIELD_VALUES",
  LAST_UPDATED_FIELD_VALUE = "LAST_UPDATED_FIELD_VALUE",
  FIRST_CREATED_FIELD_VALUE = "FIRST_CREATED_FIELD_VALUE",
  MOST_COMMON_FIELD_VALUE = "MOST_COMMON_FIELD_VALUE",
}

export enum FormatType {
  BULLET_POINTS = "BULLET_POINTS",
  COMMA_SEPARATED = "COMMA_SEPARATED",
  NUMBERED_LIST = "NUMBERED_LIST",
  PLAIN_TEXT = "PLAIN_TEXT",
  JSON_ARRAY = "JSON_ARRAY",
}

export enum FilterOperator {
  EQ = "EQ",
  NEQ = "NEQ",
  GT = "GT",
  GTE = "GTE",
  LT = "LT",
  LTE = "LTE",
  CONTAINS = "CONTAINS",
  IN_LIST = "IN_LIST",
  NOT_IN = "NOT_IN",
}

// Interfaces defining the structure of templates and their components.
export type Block =
  | { type: "text"; id: string; value: string }
  | { type: "variable"; id: string; varId?: string; placeholder: string; name: string };

export interface FilterCondition {
  field: string;
  operator: FilterOperator | string; // Allow string for special values
  value?: any;
  specialValue?: "ACTIVE_SPRINT" | "CURRENT_USER" | "TODAY" | null;
}

export interface PromptVariableSource {
  entityType: "PROJECT" | "TASK" | "SPRINT" | "DOCUMENT" | "MEMBER" | "USER";
  field?: string;
  filters?: FilterCondition[];
  aggregation?: AggregationType;
  aggregationField?: string;
  format?: FormatType;
}

export type PromptVariable = {
  name: string;
  placeholder: string;
  type: PromptVariableType;
  description?: string;
  defaultValue?: string;
  source?: PromptVariableSource;
};

export type PromptTemplate = {
  name: string;
  category: "Reporting" | "Planning" | "Task Management" | "Analysis" | "Documentation" | "Communication";
  description: string;
  model: string;
  content: Block[];
  context: string;
  variables: Omit<PromptVariable, "id">[];
};

// --- Project Templates Array ---

export const projectTemplates: PromptTemplate[] = [
  // --- Category: Reporting ---
  {
    name: "Generate Weekly Project Status Report",
    category: "Reporting",
    description: "Create a comprehensive weekly status report for stakeholders, summarizing progress, upcoming tasks, and potential risks using live project data.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Generate a weekly status report for the project: " },
      { type: "variable", id: "p1", name: "Project Name", placeholder: "{{PROJECT_NAME}}" },
      { type: "text", id: "t2", value: ". The report should cover the past 7 days and be addressed to project stakeholders.\n\n**1. Overall Summary:**\nWrite a 3-4 sentence executive summary of the project's health, key achievements, and general outlook for the next week.\n\n**2. Key Accomplishments (Tasks Completed):**\n" },
      { type: "variable", id: "p2", name: "Completed Tasks", placeholder: "{{COMPLETED_TASKS}}" },
      { type: "text", id: "t3", value: "\n\n**3. Current Priorities (Tasks In Progress):**\n" },
      { type: "variable", id: "p3", name: "In-Progress Tasks", placeholder: "{{IN_PROGRESS_TASKS}}" },
      { type: "text", id: "t4", value: "\n\n**4. Potential Blockers & Risks (based on overdue tasks):**\n" },
      { type: "variable", id: "p4", name: "Overdue Tasks", placeholder: "{{OVERDUE_TASKS}}" },
      { type: "text", id: "t5", value: "\n\n**5. Next Steps:**\nBriefly outline the main focus for the upcoming week." },
    ],
    context: "Format the output as a clean, professional email using markdown. The summary must be concise, positive, and forward-looking, even when presenting risks. Ensure each section is clearly titled.",
    variables: [
      { name: "Project Name", placeholder: "{{PROJECT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "PROJECT", field: "name" } },
      { name: "Completed Tasks", placeholder: "{{COMPLETED_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "status", operator: FilterOperator.EQ, value: "DONE" }] } },
      { name: "In-Progress Tasks", placeholder: "{{IN_PROGRESS_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "status", operator: FilterOperator.EQ, value: "TODO" }] } },
      { name: "Overdue Tasks", placeholder: "{{OVERDUE_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "dueDate", operator: FilterOperator.LT, specialValue: "TODAY" }, { field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
    ],
  },
  {
    name: "Draft Sprint Retrospective Summary",
    category: "Reporting",
    description: "Analyze the completed and incomplete tasks from the active sprint to generate key talking points for a retrospective meeting.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Analyze the performance of the current sprint: " },
      { type: "variable", id: "p1", name: "Active Sprint Name", placeholder: "{{ACTIVE_SPRINT_NAME}}" },
      { type: "text", id: "t2", value: ".\n\n**Tasks Completed:**\n" },
      { type: "variable", id: "p2", name: "Completed Sprint Tasks", placeholder: "{{COMPLETED_SPRINT_TASKS}}" },
      { type: "text", id: "t3", value: "\n\n**Tasks Not Completed:**\n" },
      { type: "variable", id: "p3", name: "Incomplete Sprint Tasks", placeholder: "{{INCOMPLETE_SPRINT_TASKS}}" },
      { type: "text", id: "t4", value: "\n\nBased on this data, generate a retrospective summary with three sections:\n1.  **What went well?** (Analyze the completed tasks for patterns, e.g., 'Completed several related backend tasks, indicating strong focus.')\n2.  **What could be improved?** (Analyze the incomplete tasks for potential root causes, e.g., 'Multiple UI tasks were incomplete, suggesting possible scope creep or underestimation.')\n3.  **Proposed Action Items:** Propose 2-3 concrete, measurable action items for the next sprint." },
    ],
    context: "Structure the output into three distinct sections: 'Celebrations (What Went Well)', 'Opportunities (Areas for Improvement)', and 'Action Items'. Be objective and data-driven in the analysis. Frame improvements constructively.",
    variables: [
      { name: "Active Sprint Name", placeholder: "{{ACTIVE_SPRINT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "SPRINT", field: "name", filters: [{ field: "status", operator: FilterOperator.EQ, value: "ACTIVE" }] } },
      { name: "Completed Sprint Tasks", placeholder: "{{COMPLETED_SPRINT_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "sprintId", operator: FilterOperator.EQ, specialValue: "ACTIVE_SPRINT" }, { field: "status", operator: FilterOperator.EQ, value: "DONE" }] } },
      { name: "Incomplete Sprint Tasks", placeholder: "{{INCOMPLETE_SPRINT_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "sprintId", operator: FilterOperator.EQ, specialValue: "ACTIVE_SPRINT" }, { field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
    ],
  },
  {
    name: "End-of-Project Performance Review",
    category: "Reporting",
    description: "Generate a post-mortem report summarizing the project's overall performance, key metrics, and links to final documentation.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Generate a final project performance review (post-mortem) for **" },
      { type: "variable", id: "p1", name: "Project Name", placeholder: "{{PROJECT_NAME}}" },
      { type: "text", id: "t2", value: "**.\n\n**1. Project Summary:**\n- Original Goal: " },
      { type: "variable", id: "p2", name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}" },
      { type: "text", id: "t3", value: "\n\n**2. Key Performance Metrics:**\n- Total Tasks Created: " },
      { type: "variable", id: "p3", name: "Total Tasks", placeholder: "{{TOTAL_TASKS}}" },
      { type: "text", id: "t4", value: "\n- Total Tasks Completed: " },
      { type: "variable", id: "p4", name: "Completed Tasks", placeholder: "{{COMPLETED_TASKS_COUNT}}" },
      { type: "text", id: "t5", value: "\n- Planned End Date: " },
      { type: "variable", id: "p5", name: "End Date", placeholder: "{{PROJECT_END_DATE}}" },
      { type: "text", id: "t6", value: "\n- Final Team: " },
      { type: "variable", id: "p6", name: "Team Members", placeholder: "{{TEAM_MEMBERS}}" },
      { type: "text", id: "t7", value: "\n\n**3. Key Learnings & Takeaways:**\nBased on the project data, analyze what the key successes and challenges were. Propose three major takeaways for future projects.\n\n**4. Final Documentation:**\n" },
      { type: "variable", id: "p7", name: "Project Documents", placeholder: "{{PROJECT_DOCUMENTS}}" },
    ],
    context: "The output should be a formal document. The 'Key Learnings' section should be insightful, going beyond the raw data to infer process strengths and weaknesses.",
    variables: [
      { name: "Project Name", placeholder: "{{PROJECT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "PROJECT", field: "name" } },
      { name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}", type: PromptVariableType.RICH_TEXT, source: { entityType: "PROJECT", field: "description" } },
      { name: "Total Tasks", placeholder: "{{TOTAL_TASKS}}", type: PromptVariableType.NUMBER, source: { entityType: "TASK", aggregation: AggregationType.COUNT } },
      { name: "Completed Tasks Count", placeholder: "{{COMPLETED_TASKS_COUNT}}", type: PromptVariableType.NUMBER, source: { entityType: "TASK", aggregation: AggregationType.COUNT, filters: [{ field: "status", operator: FilterOperator.EQ, value: "DONE" }] } },
      { name: "Project End Date", placeholder: "{{PROJECT_END_DATE}}", type: PromptVariableType.DATE, source: { entityType: "PROJECT", field: "endDate" } },
      { name: "Team Members", placeholder: "{{TEAM_MEMBERS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "MEMBER", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "user.firstName", format: FormatType.COMMA_SEPARATED } },
      { name: "Project Documents", placeholder: "{{PROJECT_DOCUMENTS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "DOCUMENT", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS } },
    ],
  },
  // --- Category: Planning ---
  {
    name: "Generate User Stories from a Feature Brief",
    category: "Planning",
    description: "Convert a high-level feature description from a document into a set of well-defined user stories with acceptance criteria.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Based on the feature brief from the document titled '" },
      { type: "variable", id: "p1", name: "Source Document Title", placeholder: "{{SOURCE_DOC_TITLE}}" },
      { type: "text", id: "t2", value: "', which contains the following content:\n\n---\n" },
      { type: "variable", id: "p2", name: "Source Document Content", placeholder: "{{SOURCE_DOC_CONTENT}}" },
      { type: "text", id: "t3", value: "\n---\n\nGenerate a set of detailed user stories. For each user story, provide:\n1.  **Title:** A concise, descriptive title.\n2.  **Narrative:** 'As a [user type], I want [action], so that [benefit]'.\n3.  **Acceptance Criteria:** A list of 3-5 specific, testable criteria (e.g., 'Given I am on the login page, when I enter valid credentials, then I am redirected to the dashboard.')." },
    ],
    context: "Format the output clearly, with each user story as a distinct section using markdown H3s. Acceptance criteria should be specific and unambiguous.",
    variables: [
      { name: "Source Document Title", placeholder: "{{SOURCE_DOC_TITLE}}", type: PromptVariableType.STRING, source: { entityType: "DOCUMENT", aggregation: AggregationType.LAST_UPDATED_FIELD_VALUE, aggregationField: "title" } },
      { name: "Source Document Content", placeholder: "{{SOURCE_DOC_CONTENT}}", type: PromptVariableType.RICH_TEXT, source: { entityType: "DOCUMENT", aggregation: AggregationType.LAST_UPDATED_FIELD_VALUE, aggregationField: "content" } },
    ],
  },
  {
    name: "Draft a Sprint Plan",
    category: "Planning",
    description: "Propose a sprint plan by selecting high-priority tasks from the backlog and aligning them with a clear sprint goal.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Draft a 2-week sprint plan for the project: " },
      { type: "variable", id: "p1", name: "Project Name", placeholder: "{{PROJECT_NAME}}" },
      { type: "text", id: "t2", value: ". The primary goal for this sprint is:\n**" },
      { type: "variable", id: "p2", name: "Sprint Goal", placeholder: "{{SPRINT_GOAL}}" },
      { type: "text", id: "t3", value: "**\n\nBased on this goal, review the following high-priority tasks from the backlog and select a realistic scope for the sprint:\n\n**High-Priority Backlog:**\n" },
      { type: "variable", id: "p3", name: "High-Priority Tasks", placeholder: "{{HIGH_PRIORITY_TASKS}}" },
      { type: "text", id: "t4", value: "\n\nPropose a final list of tasks for the sprint backlog and provide a brief justification for why this scope is achievable and aligns with the sprint goal." },
    ],
    context: "Output should have two sections: 'Proposed Sprint Goal' and 'Proposed Sprint Backlog'. The justification should consider potential team capacity and task complexity.",
    variables: [
      { name: "Project Name", placeholder: "{{PROJECT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "PROJECT", field: "name" } },
      { name: "Sprint Goal", placeholder: "{{SPRINT_GOAL}}", type: PromptVariableType.STRING, description: "Define the single, primary objective for this sprint.", defaultValue: "Launch the user authentication and profile page feature." },
      { name: "High-Priority Tasks", placeholder: "{{HIGH_PRIORITY_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.NUMBERED_LIST, filters: [{ field: "priority", operator: FilterOperator.EQ, value: "HIGH" }, { field: "sprintId", operator: FilterOperator.EQ, value: null }] } },
    ],
  },
  {
    name: "Create a Risk Assessment Matrix",
    category: "Planning",
    description: "Identify potential project risks from descriptions and tasks, then categorize them by likelihood and impact in a formal matrix.",
    model: "gpt-4o",
    content: [
        { type: "text", id: "t1", value: "Analyze the project description and the list of upcoming tasks to identify potential risks. \n\n**Project Description:**\n" },
        { type: "variable", id: "p1", name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}" },
        { type: "text", id: "t2", value: "\n\n**Upcoming Tasks:**\n" },
        { type: "variable", id: "p2", name: "Upcoming Tasks", placeholder: "{{UPCOMING_TASKS}}" },
        { type: "text", id: "t3", value: "\n\nFor each identified risk, create a row in a markdown table with the following columns: 'Risk Description', 'Category (Technical, Schedule, Resource, Scope)', 'Likelihood (Low, Medium, High)', 'Impact (Low, Medium, High)', and 'Proposed Mitigation'." },
    ],
    context: "The output must be a markdown table. Be thorough in identifying risks, including dependencies between tasks, reliance on new technology, or potential for scope creep.",
    variables: [
      { name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}", type: PromptVariableType.RICH_TEXT, source: { entityType: "PROJECT", field: "description" } },
      { name: "Upcoming Tasks", placeholder: "{{UPCOMING_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
    ],
  },
  // --- Category: Task Management ---
  {
    name: "Break Down an Epic into Sub-Tasks",
    category: "Task Management",
    description: "Decompose a large, high-level task (an epic) into smaller, actionable sub-tasks suitable for assignment.",
    model: "gpt-4o-mini",
    content: [
      { type: "text", id: "t1", value: "I need to break down the following epic into smaller, manageable sub-tasks.\n\n**Epic Title:** " },
      { type: "variable", id: "p1", name: "Epic Title", placeholder: "{{EPIC_TITLE}}" },
      { type: "text", id: "t2", value: "\n**Epic Description:** " },
      { type: "variable", id: "p2", name: "Epic Description", placeholder: "{{EPIC_DESCRIPTION}}" },
      { type: "text", id: "t3", value: "\n\nGenerate a list of descriptive sub-task titles. For each sub-task, provide a brief, one-sentence description of the work to be done. Group the sub-tasks by logical phases (e.g., 'Backend API', 'Frontend UI', 'Database', 'Testing & QA')." },
    ],
    context: "The output must be a markdown list, with H3 headings for each phase. Sub-task titles should be imperative and clear (e.g., 'Create user model', 'Design login UI').",
    variables: [
      { name: "Epic Title", placeholder: "{{EPIC_TITLE}}", type: PromptVariableType.STRING, description: "The title of the large task or feature you want to break down.", defaultValue: "Implement New User Dashboard" },
      { name: "Epic Description", placeholder: "{{EPIC_DESCRIPTION}}", type: PromptVariableType.RICH_TEXT, description: "A detailed description of the epic's requirements and goals.", defaultValue: "The new dashboard will show user statistics, recent activity, and account settings. It needs to be responsive and load data asynchronously from three different API endpoints." },
    ],
  },
  {
    name: "Generate Daily Stand-up Talking Points",
    category: "Task Management",
    description: "Prepare concise talking points for the current user's daily stand-up meeting, based on their assigned tasks.",
    model: "gpt-4o-mini",
    content: [
        { type: "text", id: "t1", value: "Generate my daily stand-up talking points based on my assigned tasks.\n\n**1. What I accomplished yesterday (Completed Tasks):**\n" },
        { type: "variable", id: "p1", name: "My Completed Tasks", placeholder: "{{MY_COMPLETED_TASKS}}" },
        { type: "text", id: "t2", value: "\n\n**2. What I will work on today (In-Progress Tasks):**\n" },
        { type: "variable", id: "p2", name: "My In-Progress Tasks", placeholder: "{{MY_IN_PROGRESS_TASKS}}" },
        { type: "text", id: "t3", value: "\n\n**3. Any blockers?**\nAnalyze my overdue tasks and identify if any could be considered blockers. List them here.\n" },
        { type: "variable", id: "p3", name: "My Overdue Tasks", placeholder: "{{MY_OVERDUE_TASKS}}" },
    ],
    context: "The output should be extremely concise and formatted as a simple bulleted list under each heading. If no tasks fit a category, state 'None'.",
    variables: [
      { name: "My Completed Tasks", placeholder: "{{MY_COMPLETED_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "assigneeId", operator: FilterOperator.EQ, specialValue: "CURRENT_USER" }, { field: "status", operator: FilterOperator.EQ, value: "DONE" }] } },
      { name: "My In-Progress Tasks", placeholder: "{{MY_IN_PROGRESS_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "assigneeId", operator: FilterOperator.EQ, specialValue: "CURRENT_USER" }, { field: "status", operator: FilterOperator.EQ, value: "TODO" }] } },
      { name: "My Overdue Tasks", placeholder: "{{MY_OVERDUE_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "assigneeId", operator: FilterOperator.EQ, specialValue: "CURRENT_USER" }, { field: "dueDate", operator: FilterOperator.LT, specialValue: "TODAY" }, { field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
    ],
  },
  {
    name: "Prioritize Backlog with Eisenhower Matrix",
    category: "Task Management",
    description: "Categorize high-priority tasks into an Eisenhower Matrix (Urgent/Important) to help with strategic decision-making.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Analyze the following high-priority tasks from the backlog and categorize them into a 2x2 Eisenhower Matrix.\n\n**High-Priority Backlog:**\n" },
      { type: "variable", id: "p1", name: "High-Priority Tasks", placeholder: "{{HIGH_PRIORITY_TASKS}}" },
      { type: "text", id: "t2", value: "\n\nProvide the output in four sections:\n1.  **Urgent & Important (Do First):** Tasks that are critical and time-sensitive.\n2.  **Important, Not Urgent (Schedule):** Tasks that are strategic but can be planned.\n3.  **Urgent, Not Important (Delegate):** Tasks that need to be done now but are low-impact.\n4.  **Neither Urgent nor Important (Eliminate/Re-evaluate):** Tasks that can be de-prioritized." },
    ],
    context: "For each task, provide a brief (1-sentence) justification for its placement in the matrix. Be decisive in the categorization.",
    variables: [
      { name: "High-Priority Tasks", placeholder: "{{HIGH_PRIORITY_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "priority", operator: FilterOperator.EQ, value: "HIGH" }, { field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
    ],
  },
  // --- Category: Analysis ---
  {
    name: "Identify Project Bottlenecks",
    category: "Analysis",
    description: "Analyze project data to find potential bottlenecks, such as unassigned tasks, overdue items, or overloaded team members.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Analyze the current state of project '" },
      { type: "variable", id: "p1", name: "Project Name", placeholder: "{{PROJECT_NAME}}" },
      { type: "text", id: "t2", value: "' for potential bottlenecks. Consider the following data points:\n\n**Tasks with No Assignee (" },
      { type: "variable", id: "p2", name: "Unassigned Task Count", placeholder: "{{UNASSIGNED_COUNT}}" },
      { type: "text", id: "t3", value: " total):\n" },
      { type: "variable", id: "p3", name: "Unassigned Tasks", placeholder: "{{UNASSIGNED_TASKS}}" },
      { type: "text", id: "t4", value: "\n\n**Overdue Tasks (" },
      { type: "variable", id: "p4", name: "Overdue Task Count", placeholder: "{{OVERDUE_COUNT}}" },
      { type: "text", id: "t5", value: " total):\n" },
      { type: "variable", id: "p5", name: "Overdue Tasks", placeholder: "{{OVERDUE_TASKS}}" },
      { type: "text", id: "t6", value: "\n\nBased on this information, identify the top 3 potential bottlenecks and suggest a specific, actionable mitigation for each." },
    ],
    context: "Present the analysis in a structured format: 'Potential Bottleneck 1', followed by 'Suggested Mitigation'. The mitigations should be practical and project-specific.",
    variables: [
      { name: "Project Name", placeholder: "{{PROJECT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "PROJECT", field: "name" } },
      { name: "Unassigned Task Count", placeholder: "{{UNASSIGNED_COUNT}}", type: PromptVariableType.NUMBER, source: { entityType: "TASK", aggregation: AggregationType.COUNT, filters: [{ field: "assigneeId", operator: FilterOperator.EQ, value: null }] } },
      { name: "Unassigned Tasks", placeholder: "{{UNASSIGNED_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "assigneeId", operator: FilterOperator.EQ, value: null }] } },
      { name: "Overdue Task Count", placeholder: "{{OVERDUE_COUNT}}", type: PromptVariableType.NUMBER, source: { entityType: "TASK", aggregation: AggregationType.COUNT, filters: [{ field: "dueDate", operator: FilterOperator.LT, specialValue: "TODAY" }, { field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
      { name: "Overdue Tasks", placeholder: "{{OVERDUE_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "dueDate", operator: FilterOperator.LT, specialValue: "TODAY" }, { field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
    ],
  },
  {
    name: "Analyze Team Workload Distribution",
    category: "Analysis",
    description: "Generate a report showing the number of open tasks assigned to each team member to identify potential workload imbalances.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Analyze the current workload distribution for the project team. The team consists of: " },
      { type: "variable", id: "p1", name: "Team Members", placeholder: "{{TEAM_MEMBERS}}" },
      { type: "text", id: "t2", value: ".\n\nFor each team member, I need a count of their currently open (not 'Done') tasks. Present this information in a markdown table with two columns: 'Team Member' and 'Open Task Count'.\n\nAfter the table, provide a brief analysis identifying any members who appear significantly over or under-allocated and suggest re-assigning one or two tasks to balance the load." },
    ],
    context: "The analysis should be diplomatic and focus on team efficiency. The core of the prompt is to process a list of members and associate a task count with each, which requires advanced reasoning.",
    variables: [
      // This template is more conceptual as it requires the AI to perform a join/group-by operation.
      // We feed it the list of members and the list of all tasks, and ask it to perform the analysis.
      { name: "Team Members", placeholder: "{{TEAM_MEMBERS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "MEMBER", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "user.firstName", format: FormatType.COMMA_SEPARATED } },
    ],
  },
  // --- Category: Documentation ---
  {
    name: "Create Technical Specification from Tasks",
    category: "Documentation",
    description: "Consolidate a list of related tasks into a formal technical specification document, outlining requirements and implementation details.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Generate a technical specification document for the feature '" },
      { type: "variable", id: "p1", name: "Feature Name", placeholder: "{{FEATURE_NAME}}" },
      { type: "text", id: "t2", value: "'. The specification should be based on the following list of development tasks:\n\n" },
      { type: "variable", id: "p2", name: "Task List", placeholder: "{{TASK_LIST}}" },
      { type: "text", id: "t3", value: "\n\nThe document must include these sections:\n1.  **Overview**: A high-level summary of the feature's purpose.\n2.  **Functional Requirements**: A numbered list derived from the tasks.\n3.  **Data Model / API Endpoints** (Inferred): Propose a simple JSON data structure or API endpoints needed to support these requirements.\n4.  **Out of Scope**: Clearly state what is not included." },
    ],
    context: "The output should be a well-structured markdown document suitable for a developer audience. Infer logical connections between tasks to create a coherent narrative.",
    variables: [
      { name: "Feature Name", placeholder: "{{FEATURE_NAME}}", type: PromptVariableType.STRING, description: "The name of the feature or epic this spec is for.", defaultValue: "User Profile Management API" },
      { name: "Task List", placeholder: "{{TASK_LIST}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "sprintId", operator: FilterOperator.EQ, specialValue: "ACTIVE_SPRINT" }] } },
    ],
  },
  {
    name: "Generate Project Onboarding Guide",
    category: "Documentation",
    description: "Create a welcoming onboarding guide for new team members, pulling key project information automatically.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Create an onboarding document for new members joining the **" },
      { type: "variable", id: "p1", name: "Project Name", placeholder: "{{PROJECT_NAME}}" },
      { type: "text", id: "t2", value: "** project.\n\n**1. Welcome & Project Vision**\n- Project Goal: " },
      { type: "variable", id: "p2", name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}" },
      { type: "text", id: "t3", value: "\n\n**2. Key People**\n- Your new team members are: " },
      { type: "variable", id: "p3", name: "Team Members", placeholder: "{{TEAM_MEMBERS}}" },
      { type: "text", id: "t4", value: "\n\n**3. Essential Reading**\nHere are some important documents to get you started:\n" },
      { type: "variable", id: "p4", name: "Project Documents", placeholder: "{{PROJECT_DOCUMENTS}}" },
      { type: "text", id: "t5", value: "\n\n**4. Your First Tasks**\nTo help you get started, we suggest looking at these introductory tasks:\n" },
      { type: "variable", id: "p5", name: "Introductory Tasks", placeholder: "{{INTRODUCTORY_TASKS}}" },
      { type: "text", id: "t6", value: "\n\nAdd a concluding paragraph wishing the new member success on the project." },
    ],
    context: "The tone should be welcoming and encouraging. The output should be a single, easy-to-read markdown document.",
    variables: [
      { name: "Project Name", placeholder: "{{PROJECT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "PROJECT", field: "name" } },
      { name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}", type: PromptVariableType.RICH_TEXT, source: { entityType: "PROJECT", field: "description" } },
      { name: "Team Members", placeholder: "{{TEAM_MEMBERS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "MEMBER", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "user.firstName", format: FormatType.COMMA_SEPARATED } },
      { name: "Project Documents", placeholder: "{{PROJECT_DOCUMENTS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "DOCUMENT", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS } },
      { name: "Introductory Tasks", placeholder: "{{INTRODUCTORY_TASKS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "priority", operator: FilterOperator.EQ, value: "LOW" }, { field: "status", operator: FilterOperator.NEQ, value: "DONE" }] } },
    ],
  },
  // --- Category: Communication ---
  {
    name: "Draft Feature Launch Announcement",
    category: "Communication",
    description: "Create an announcement for an internal or external audience about a new feature, based on the completed tasks in a sprint.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Draft a launch announcement for the new feature set completed in sprint: **" },
      { type: "variable", id: "p1", name: "Sprint Name", placeholder: "{{SPRINT_NAME}}" },
      { type: "text", id: "t2", value: "**. The announcement is for **" },
      { type: "variable", id: "p2", name: "Audience", placeholder: "{{AUDIENCE}}" },
      { type: "text", id: "t3", value: "**.\n\nThe key completed tasks that represent the new features are:\n" },
      { type: "variable", id: "p3", name: "Completed Features", placeholder: "{{COMPLETED_FEATURES}}" },
      { type: "text", id: "t4", value: "\n\nStructure the announcement with:\n1.  A catchy subject line.\n2.  A brief, exciting introduction to what's new.\n3.  A bulleted list of the key new features/benefits, derived from the task list.\n4.  A call to action (e.g., 'Try it out now!', 'Read the full documentation here')." },
    ],
    context: "The tone should be enthusiastic and benefit-oriented. Translate technical task titles into user-friendly feature descriptions.",
    variables: [
      { name: "Sprint Name", placeholder: "{{SPRINT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "SPRINT", field: "name", filters: [{ field: "status", operator: FilterOperator.EQ, value: "COMPLETED" }] } },
      { name: "Audience", placeholder: "{{AUDIENCE}}", type: PromptVariableType.SELECT, defaultValue: "Internal Team", description: "Who is this announcement for?" },
      { name: "Completed Features", placeholder: "{{COMPLETED_FEATURES}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "TASK", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "title", format: FormatType.BULLET_POINTS, filters: [{ field: "sprintId", operator: FilterOperator.EQ, specialValue: "ACTIVE_SPRINT" }, { field: "status", operator: FilterOperator.EQ, value: "DONE" }] } },
    ],
  },
  {
    name: "Explain Technical Issue to Stakeholders",
    category: "Communication",
    description: "Translate a technical bug report or outage description into a clear, business-focused summary for non-technical stakeholders.",
    model: "gpt-4o",
    content: [
      { type: "text", id: "t1", value: "Translate the following technical issue description into a clear, concise summary for a non-technical business stakeholder.\n\n**Technical Details:**\n" },
      { type: "variable", id: "p1", name: "Technical Description", placeholder: "{{TECHNICAL_DESCRIPTION}}" },
      { type: "text", id: "t2", value: "\n\nYour summary should include three parts:\n1.  **What Happened:** A simple, jargon-free explanation of the problem.\n2.  **Business Impact:** How this affects users or business goals (e.g., 'Users were unable to log in for 15 minutes.').\n3.  **Resolution & Next Steps:** What has been done to fix it and what is being done to prevent it from happening again." },
    ],
    context: "Avoid all technical jargon (e.g., 'database replication lag', 'API timeout', 'null pointer exception'). Focus entirely on user experience and business outcomes. The tone should be calm, confident, and accountable.",
    variables: [
      { name: "Technical Description", placeholder: "{{TECHNICAL_DESCRIPTION}}", type: PromptVariableType.RICH_TEXT, description: "Paste the raw bug report, error log, or technical explanation.", defaultValue: "A cascading failure occurred in the authentication service due to a Redis cache timeout, causing a 503 error on the login endpoint. The pod was restarted to clear the connection pool." },
    ],
  },
  {
    name: "Draft a Project Kickoff Meeting Agenda",
    category: "Communication",
    description: "Generate a structured agenda for a project kickoff meeting using key project details.",
    model: "gpt-4o-mini",
    content: [
        { type: "text", id: "t1", value: "Create a detailed meeting agenda for the kickoff of project: " },
        { type: "variable", id: "p1", name: "Project Name", placeholder: "{{PROJECT_NAME}}" },
        { type: "text", id: "t2", value: ".\n\nThe agenda should be for a 60-minute meeting and include the following sections with estimated timings:\n1.  **Introductions (5 min):** List of attendees: " },
        { type: "variable", id: "p2", name: "Team Members", placeholder: "{{TEAM_MEMBERS}}" },
        { type: "text", id: "t3", value: "\n2.  **Project Vision & Goals (15 min):** Summarize the project's purpose based on its description: " },
        { type: "variable", id: "p3", name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}" },
        { type: "text", id: "t4", value: "\n3.  **Scope & Key Deliverables (20 min):** Outline the initial high-level tasks.\n4.  **Roles & Responsibilities (10 min):** Briefly mention the roles of the key members.\n5.  **Next Steps & Q&A (10 min):**" },
    ],
    context: "The output should be a well-formatted agenda that can be copied directly into an email or calendar invitation. Ensure timings add up to 60 minutes.",
    variables: [
      { name: "Project Name", placeholder: "{{PROJECT_NAME}}", type: PromptVariableType.STRING, source: { entityType: "PROJECT", field: "name" } },
      { name: "Team Members", placeholder: "{{TEAM_MEMBERS}}", type: PromptVariableType.LIST_OF_STRINGS, source: { entityType: "MEMBER", aggregation: AggregationType.LIST_FIELD_VALUES, aggregationField: "user.firstName", format: FormatType.COMMA_SEPARATED } },
      { name: "Project Description", placeholder: "{{PROJECT_DESCRIPTION}}", type: PromptVariableType.RICH_TEXT, source: { entityType: "PROJECT", field: "description" } },
    ],
  },
];

export const projectPromptTemplateCategories = [...new Set(projectTemplates.map(t => t.category))].sort();

