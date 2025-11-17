import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'


export const dynamic = 'force-dynamic'

export async function GET() {
  const prisma = getDB();
try {
    const user = await requireUser()
    // Orgs the user owns or the one assigned to user
    const owned = await prisma.organization.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: 'desc' } })
    const me = await prisma.user.findUnique({ where: { clerkId: user.id }, select: { organizationId: true, organization: true } })
    const list = [...owned]
    if (me?.organization && !list.find((o) => o.id === me.organization.id)) list.push(me.organization)
    return NextResponse.json(list)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const createSchema = z.object({ name: z.string().min(1), slug: z.string().min(1) })

export async function POST(req: Request) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const body = createSchema.parse(await req.json())
    const created = await prisma.organization.create({ data: { ...body, ownerId: user.id, settings: '{}' } })
    await prisma.user.update({ where: { clerkId: user.id }, data: { organizationId: created.id } })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

