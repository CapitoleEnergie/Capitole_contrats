import { NextRequest, NextResponse } from 'next/server'
import { generateContractFromOpportunity } from '@/lib/generate'

export async function POST(req: NextRequest) {
  try {
    const { opportunityId } = await req.json()

    if (!opportunityId?.trim()) {
      return NextResponse.json({ error: 'opportunityId manquant' }, { status: 400 })
    }

    const result = await generateContractFromOpportunity(opportunityId.trim())

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'x-filename': result.filename,
        'x-segment': result.segment,
        'x-client': encodeURIComponent(result.clientName),
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    console.error('[generate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
