import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { z } from 'zod'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string; memberId: string } }

const updateSchema = z.object({ role: z.enum(['admin','member','viewer'] as const) })

export async function PATCH(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const body = updateSchema.parse(await req.json())
    const allowed = await isOrgAdmin(user.id, params.id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const updated = await prisma.organizationMember.update({ where: { id: params.memberId }, data: { role: body.role } })
    return NextResponse.json(updated)
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const allowed = await isOrgAdmin(user.id, params.id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await prisma.organizationMember.delete({ where: { id: params.memberId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

