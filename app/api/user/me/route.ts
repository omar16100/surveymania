import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDB } from '@/lib/db'


export const dynamic = 'force-dynamic'

export async function GET() {
  const prisma = getDB();
try {
    const clerkUser = await requireUser()
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      include: {
        organization: true
      }
    })

    if (!user) {
      // Create user if doesn't exist
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: clerkUser.fullName || null
        }
      })
      return NextResponse.json(newUser)
    }

    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
