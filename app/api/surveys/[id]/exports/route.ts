import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// GET /api/surveys/[id]/exports - List export history
export async function GET(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exports = await prisma.export.findMany({
      where: { surveyId: params.id },
      include: {
        creator: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 exports
    })

    return NextResponse.json({ exports })
  } catch (error: any) {
    console.error('List exports error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
