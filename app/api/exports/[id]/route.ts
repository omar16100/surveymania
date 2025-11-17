import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const exp = await prisma.export.findUnique({ where: { id: params.id } })
    if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(exp)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

