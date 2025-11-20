export type Template = {
  name: string
  category: "Business" | "Strategy" | "Diagrams" | "User Research" | "Software Design"
  path: string
  description: string
  previewImage: string
}

export const templates: Template[] = [
  {
    name: "Business Model Canvas",
    category: "Business",
    path: "/excalidraw-templates/BMC.excalidraw",
    description:
      "A comprehensive strategic management tool for developing new business models or documenting existing ones. It allows you to map out your business on a single page, covering key partners, activities, value propositions, customer relationships, customer segments, channels, and revenue streams.",
    previewImage: "/excalidraw-templates/Business Model Canvas.png",
  },
  {
    name: "Competitor Analysis Matrix",
    category: "Strategy",
    path: "/excalidraw-templates/CompetitorAnalysis.excalidraw",
    description:
      "Systematically evaluate and compare your competitors' strengths and weaknesses against your own. This matrix helps you identify market gaps and strategic opportunities by analyzing key attributes like features, pricing, market share, and customer satisfaction.",
    previewImage: "/excalidraw-templates/Competitor Analysis Matrix.png",
  },
  {
    name: "Eisenhower Matrix",
    category: "Strategy",
    path: "/excalidraw-templates/EisenhowerMatrix.excalidraw",
    description:
      "A powerful time-management and productivity tool for prioritizing tasks. Organize your to-do list into four quadrants based on urgency and importance: Do, Decide, Delegate, and Delete. This helps you focus on what's truly important, not just what's urgent.",
    previewImage: "/excalidraw-templates/Eisenhower Matrix.png",
  },
  {
    name: "Empathy Map Canvas",
    category: "User Research",
    path: "/excalidraw-templates/EmpathyMap.excalidraw",
    description:
      "A collaborative tool for gaining a deeper understanding of your users. Visualize user attitudes and behaviors by mapping what they say, think, feel, and do. It's essential for building user-centric products and services by putting the team in the user's shoes.",
    previewImage: "/excalidraw-templates/Empathy Map Canvas.png",
  },
  {
    name: "Feature Request Funnel",
    category: "Business",
    path: "/excalidraw-templates/FeatureRequestFunnel.excalidraw",
    description:
      "Visualize and manage the entire lifecycle of incoming feature requests. This funnel helps product teams track ideas from initial submission and backlog, through consideration and development, all the way to a successful release, ensuring transparency and strategic alignment.",
    previewImage: "/excalidraw-templates/Feature Request Funnel.png",
  },
  {
    name: "Fishbone Diagram",
    category: "Diagrams",
    path: "/excalidraw-templates/FishboneDiagram.excalidraw",
    description:
      "Also known as an Ishikawa or cause-and-effect diagram, this tool is perfect for brainstorming and identifying the potential root causes of a problem. Organize potential causes into categories to systematically uncover the source of an issue.",
    previewImage: "/excalidraw-templates/Fishbone Diagram.png",
  },
  {
    name: "Flowchart Template",
    category: "Diagrams",
    path: "/excalidraw-templates/Flowchart.excalidraw",
    description:
      "A versatile template for mapping out processes, workflows, and systems in a clear, step-by-step manner. Use standard symbols to represent different actions or decisions, making it easy to document, analyze, and communicate complex procedures.",
    previewImage: "/excalidraw-templates/Flowchart.png",
  },
  {
    name: "Mind Map Template",
    category: "Strategy",
    path: "/excalidraw-templates/MindMap.excalidraw",
    description:
      "An excellent tool for brainstorming and organizing ideas visually. Start with a central concept and branch out to related thoughts, helping you see connections, generate new insights, and structure information in a non-linear, creative way.",
    previewImage: "/excalidraw-templates/Mind Map.png",
  },
  {
    name: "Product Roadmap",
    category: "Business",
    path: "/excalidraw-templates/ProductRoadmap.excalidraw",
    description:
      "Create a high-level visual summary that communicates your product's strategic direction and development priorities over time. This roadmap is key for aligning stakeholders, managing expectations, and guiding the development team on what to build and when.",
    previewImage: "/excalidraw-templates/Product Roadmap.png",
  },
  {
    name: "Project Kickoff",
    category: "Business",
    path: "/excalidraw-templates/ProjectKickoff.excalidraw",
    description:
      "Structure your first project meeting to ensure a successful start. This template helps you align your team on critical information such as project goals, scope, deliverables, timeline, key stakeholders, and team roles, setting the stage for effective collaboration.",
    previewImage: "/excalidraw-templates/Project Kickoff.png",
  },
  {
    name: "Release Pipeline (CI/CD)",
    category: "Software Design",
    path: "/excalidraw-templates/ReleasePipeline.excalidraw",
    description:
      "Diagram your automated software delivery process from code commit to production deployment. Visualizing the CI/CD (Continuous Integration/Continuous Delivery) pipeline helps teams understand and optimize the stages of building, testing, and releasing software.",
    previewImage: "/excalidraw-templates/Release Pipeline.png",
  },
  {
    name: "Retrospective Template",
    category: "Strategy",
    path: "/excalidraw-templates/Retrospective.excalidraw",
    description:
      "A framework for agile teams to reflect on their work cycle. Guide your team in a discussion about what went well, what could be improved, and what to commit to for the next sprint. This fosters a culture of continuous learning and improvement.",
    previewImage: "/excalidraw-templates/Retrospective.png",
  },
  {
    name: "Sequence Diagram Template",
    category: "Software Design",
    path: "/excalidraw-templates/SequenceDiagram.excalidraw",
    description:
      "A UML diagram that models the interactions between objects in a system in a sequential order. Use it to detail how different components of a system communicate with each other over time, making it invaluable for understanding dynamic system behavior.",
    previewImage: "/excalidraw-templates/Sequence Diagram.png",
  },
  {
    name: "Service Blueprint Template",
    category: "User Research",
    path: "/excalidraw-templates/ServiceBlueprint.excalidraw",
    description:
      "Visualize your entire service delivery process from both the customer's perspective and the organization's. This blueprint maps out customer actions, frontstage (visible) interactions, backstage (invisible) actions, and the support processes needed to deliver a seamless experience.",
    previewImage: "/excalidraw-templates/Service Blueprint.png",
  },
  {
    name: "SWOT Analysis",
    category: "Strategy",
    path: "/excalidraw-templates/SWOT.excalidraw",
    description:
      "A foundational strategic planning framework to analyze your project or business. Identify internal Strengths and Weaknesses, as well as external Opportunities and Threats. This analysis provides a clear basis for strategic decision-making.",
    previewImage: "/excalidraw-templates/SWOT Analysis.png",
  },
  {
    name: "UML Class Diagram",
    category: "Software Design",
    path: "/excalidraw-templates/UMLClassDiagram.excalidraw",
    description:
      "A core component of object-oriented modeling that illustrates the static structure of a system. This diagram shows the system's classes, their attributes, methods, and the relationships between them, providing a blueprint for software architecture.",
    previewImage: "/excalidraw-templates/UML Class Diagram.png",
  },
  {
    name: "User Journey Map",
    category: "User Research",
    path: "/excalidraw-templates/userJourney.excalidraw",
    description:
      "Map out the end-to-end experience a user has with your product or service. This narrative visualizes their steps, touchpoints, thoughts, and emotions, helping you identify pain points and opportunities to create a better, more intuitive user experience.",
    previewImage: "/excalidraw-templates/User Journey Map.png",
  },
  {
    name: "User Persona",
    category: "User Research",
    path: "/excalidraw-templates/UserPersona.excalidraw",
    description:
      "Create detailed, fictional character profiles that represent your key user segments. Personas bring your users to life with goals, needs, motivations, and frustrations, helping your team maintain focus on designing for a specific audience.",
    previewImage: "/excalidraw-templates/User Persona.png",
  },
  {
    name: "User Story Map",
    category: "User Research",
    path: "/excalidraw-templates/UserStoryMap.excalidraw",
    description:
      "A powerful tool for organizing and prioritizing user stories in a more holistic way than a flat backlog. Arrange user activities and tasks into a visual model to understand the user's journey, see the big picture, and plan releases effectively.",
    previewImage: "/excalidraw-templates/User Story Map.png",
  },
  {
    name: "Value Proposition Canvas",
    category: "Business",
    path: "/excalidraw-templates/ValuePropositionCanvas.excalidraw",
    description:
      "A strategic tool to ensure your product or service is positioned around what the customer values and needs. Systematically map out customer jobs, pains, and gains against your product's pain relievers and gain creators to achieve product-market fit.",
    previewImage: "/excalidraw-templates/Value Proposition Canvas.png",
  },
]

export const templateCategories = [...new Set(templates.map(t => t.category))]