import type { Context } from "@/lib/apollo-server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const authResolvers = {
  Mutation: {
    signUp: async (_: any, { input }: { input: any }, { prisma }: Context) => {
      const { email, password, name } = input

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new Error("User already exists with this email")
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      })

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" })

      return {
        user,
        token,
      }
    },

    signIn: async (_: any, { input }: { input: any }, { prisma }: Context) => {
      const { email, password } = input

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        throw new Error("Invalid email or password")
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
        throw new Error("Invalid email or password")
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" })

      return {
        user,
        token,
      }
    },
  },
}
