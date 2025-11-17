import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { z } from 'zod'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const list = await prisma.organizationMember.findMany({ where: { organizationId: params.id }, include: { user: true }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(list)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const addSchema = z.object({ userId: z.string(), role: z.enum(['admin','member','viewer'] as const).default('member') })

export async function POST(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const body = addSchema.parse(await req.json())
    const allowed = await isOrgAdmin(user.id, params.id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const created = await prisma.organizationMember.upsert({
      where: { uniq_org_member: { organizationId: params.id, userId: body.userId } },
      update: { role: body.role },
      create: { organizationId: params.id, userId: body.userId, role: body.role }
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

