import { auth, currentUser } from '@clerk/nextjs/server'
import { getDB } from './db'

export type SessionUser = {
  id: string
  email?: string
}

export async function requireUser(): Promise<SessionUser> {
  const prisma = getDB()
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')
    // Ensure user exists in DB
    const cu = await currentUser()
    if (cu) {
      await prisma.user.upsert({
        where: { clerkId: cu.id },
        update: {
          email: cu.emailAddresses?.[0]?.emailAddress ?? '',
          firstName: cu.firstName ?? '',
          lastName: cu.lastName ?? '',
          avatar: cu.imageUrl ?? ''
        },
        create: {
          clerkId: cu.id,
          email: cu.emailAddresses?.[0]?.emailAddress ?? '',
          firstName: cu.firstName ?? '',
          lastName: cu.lastName ?? '',
          avatar: cu.imageUrl ?? '',
          organizationId: null
        }
      })
    }
    return { id: userId, email: cu?.emailAddresses?.[0]?.emailAddress }
  } catch {
    // Dev fallback when Clerk is not configured
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('your_')) {
      return { id: 'dev-user' }
    }
    throw new Error('Unauthorized')
  }
}

export async function optionalUser(): Promise<SessionUser | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null
    return { id: userId }
  } catch {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('your_')) {
      return { id: 'dev-user' }
    }
    return null
  }
}
