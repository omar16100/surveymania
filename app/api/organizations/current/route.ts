import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'


export const dynamic = 'force-dynamic'

export async function GET() {
  const prisma = getDB();
try {
    const user = await requireUser()
    const me = await prisma.user.findUnique({ where: { clerkId: user.id }, select: { organization: true } })
    return NextResponse.json({ organization: me?.organization ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const switchSchema = z.object({ id: z.string().uuid() })

export async function POST(req: Request) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const body = switchSchema.parse(await req.json())
    // Only allow switching to orgs the user owns (until membership model exists)
    const owns = await prisma.organization.findFirst({ where: { id: body.id, ownerId: user.id }, select: { id: true } })
    if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await prisma.user.update({ where: { clerkId: user.id }, data: { organizationId: body.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

