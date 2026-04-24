import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { generateContractFromOpportunity } from '@/lib/generate'
import { logActivity } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  const user = await currentUser()
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? ''
  const userName  = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || userEmail

  const start = Date.now()

  try {
    const { opportunityId } = await req.json()

    if (!opportunityId?.trim()) {
      return NextResponse.json({ error: 'opportunityId manquant' }, { status: 400 })
    }

    const result = await generateContractFromOpportunity(opportunityId.trim())

    await logActivity({
      project:        'mint-contrats',
      user_id:        userId ?? 'anonymous',
      user_email:     userEmail,
      user_name:      userName,
      action:         'generate_contract',
      opportunity_id: opportunityId.trim(),
      segment:        result.segment,
      client_name:    result.clientName,
      filename:       result.filename,
      status:         'success',
      duration_ms:    Date.now() - start,
    })

    return new NextResponse(new Uint8Array(result.buffer), {
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

    await logActivity({
      project:    'mint-contrats',
      user_id:    userId ?? 'anonymous',
      user_email: userEmail,
      user_name:  userName,
      action:     'generate_contract',
      status:     'error',
      error_msg:  msg,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
