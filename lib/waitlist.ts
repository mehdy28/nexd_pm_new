export interface WaitlistData {
  name: string
  email: string
  timestamp: Date
}

export interface WaitlistResponse {
  success: boolean
  message: string
  data?: WaitlistData
}

/**
 * Placeholder function for waitlist signup
 * Replace this with your actual backend integration
 */
export async function submitToWaitlist(data: {
  name: string
  email: string
}): Promise<WaitlistResponse> {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // TODO: Replace with actual backend call
    // Example:
    // const response = await fetch('/api/waitlist', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // })
    // return await response.json()

    // Placeholder success response
    const waitlistEntry: WaitlistData = {
      name: data.name,
      email: data.email,
      timestamp: new Date(),
    }

    // Log to console for now (remove in production)
    console.log("Waitlist submission:", waitlistEntry)

    return {
      success: true,
      message: `Welcome ${data.name}! You've been added to our waitlist.`,
      data: waitlistEntry,
    }
  } catch (error) {
    console.error("Waitlist submission error:", error)
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    }
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate name (basic validation)
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2
}
