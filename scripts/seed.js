const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash("password123", 12)

  // Create users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@nexd.pm" },
      update: {},
      create: {
        id: "user_1",
        email: "admin@nexd.pm",
        name: "Admin User",
        password: hashedPassword,
        role: "ADMIN",
      },
    }),
    prisma.user.upsert({
      where: { email: "john@nexd.pm" },
      update: {},
      create: {
        id: "user_2",
        email: "john@nexd.pm",
        name: "John Doe",
        password: hashedPassword,
        role: "MEMBER",
      },
    }),
    prisma.user.upsert({
      where: { email: "jane@nexd.pm" },
      update: {},
      create: {
        id: "user_3",
        email: "jane@nexd.pm",
        name: "Jane Smith",
        password: hashedPassword,
        role: "MEMBER",
      },
    }),
  ])

  console.log("✅ Created users")

  // Create workspaces
  const workspace1 = await prisma.workspace.upsert({
    where: { slug: "nexd-team" },
    update: {},
    create: {
      id: "workspace_1",
      name: "NEXD Team",
      slug: "nexd-team",
      description: "Main workspace for NEXD.PM development",
      plan: "PRO",
      ownerId: "user_1",
      settings: {
        create: {
          allowGuestAccess: false,
          defaultProjectPrivacy: "PRIVATE",
          timeZone: "UTC",
        },
      },
    },
  })

  const workspace2 = await prisma.workspace.upsert({
    where: { slug: "client-projects" },
    update: {},
    create: {
      id: "workspace_2",
      name: "Client Projects",
      slug: "client-projects",
      description: "Workspace for client work",
      plan: "FREE",
      ownerId: "user_2",
      settings: {
        create: {
          allowGuestAccess: true,
          defaultProjectPrivacy: "PUBLIC",
          timeZone: "UTC",
        },
      },
    },
  })

  console.log("✅ Created workspaces")

  // Create workspace members
  await Promise.all([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: "workspace_1", userId: "user_1" } },
      update: {},
      create: {
        workspaceId: "workspace_1",
        userId: "user_1",
        role: "OWNER",
      },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: "workspace_1", userId: "user_2" } },
      update: {},
      create: {
        workspaceId: "workspace_1",
        userId: "user_2",
        role: "ADMIN",
      },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: "workspace_1", userId: "user_3" } },
      update: {},
      create: {
        workspaceId: "workspace_1",
        userId: "user_3",
        role: "MEMBER",
      },
    }),
  ])

  console.log("✅ Created workspace members")

  // Create projects
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { id: "project_1" },
      update: {},
      create: {
        id: "project_1",
        name: "NEXD.PM Platform",
        description: "Main platform development",
        color: "#4ECDC4",
        privacy: "PRIVATE",
        status: "ACTIVE",
        workspaceId: "workspace_1",
      },
    }),
    prisma.project.upsert({
      where: { id: "project_2" },
      update: {},
      create: {
        id: "project_2",
        name: "Mobile App",
        description: "iOS and Android mobile application",
        color: "#FF6B6B",
        privacy: "PRIVATE",
        status: "ACTIVE",
        workspaceId: "workspace_1",
      },
    }),
  ])

  console.log("✅ Created projects")

  // Create project members
  await Promise.all([
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: "project_1", userId: "user_1" } },
      update: {},
      create: {
        projectId: "project_1",
        userId: "user_1",
        role: "OWNER",
      },
    }),
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: "project_1", userId: "user_2" } },
      update: {},
      create: {
        projectId: "project_1",
        userId: "user_2",
        role: "ADMIN",
      },
    }),
  ])

  console.log("✅ Created project members")

  // Create sample tasks
  await Promise.all([
    prisma.task.upsert({
      where: { id: "task_1" },
      update: {},
      create: {
        id: "task_1",
        title: "Setup Authentication System",
        description: "Implement user authentication with NextAuth.js",
        status: "IN_PROGRESS",
        priority: "HIGH",
        projectId: "project_1",
        assigneeId: "user_2",
        creatorId: "user_1",
      },
    }),
    prisma.task.upsert({
      where: { id: "task_2" },
      update: {},
      create: {
        id: "task_2",
        title: "Design Database Schema",
        description: "Create comprehensive Prisma schema",
        status: "DONE",
        priority: "HIGH",
        projectId: "project_1",
        assigneeId: "user_1",
        creatorId: "user_1",
      },
    }),
  ])

  console.log("✅ Created sample tasks")

  console.log("🎉 Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
