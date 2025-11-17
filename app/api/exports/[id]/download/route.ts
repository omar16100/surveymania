import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const exp = await prisma.export.findUnique({ where: { id: params.id } })
    if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!exp.fileUrl || exp.status !== 'completed') return NextResponse.json({ error: 'Not ready' }, { status: 409 })
    // In a real implementation, redirect to S3/R2 signed URL
    return NextResponse.json({ url: exp.fileUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

