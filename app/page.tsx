'use client'

import { useState, useRef } from 'react'
import styles from './page.module.css'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface Result {
  filename: string
  blob: Blob
  segment: string
  client: string
}

export default function Home() {
  const [opportunityId, setOpportunityId] = useState('')
  const [status, setStatus]               = useState<Status>('idle')
  const [result, setResult]               = useState<Result | null>(null)
  const [error, setError]                 = useState('')
  const [downloadUrl, setDownloadUrl]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = opportunityId.trim()
    if (!id) {
      inputRef.current?.focus()
      return
    }

    setStatus('loading')
    setResult(null)
    setError('')
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      const blob     = await res.blob()
      const filename = res.headers.get('x-filename') || `contrat_${id}.docx`
      const segment  = res.headers.get('x-segment') || ''
      const client   = res.headers.get('x-client') || ''
      const url      = URL.createObjectURL(blob)

      setDownloadUrl(url)
      setResult({ filename, blob, segment, client })
      setStatus('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
      setStatus('error')
    }
  }

  const handleDownload = () => {
    if (!downloadUrl || !result) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = result.filename
    a.click()
  }

  const handleReset = () => {
    setOpportunityId('')
    setStatus('idle')
    setResult(null)
    setError('')
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="url(#logoGrad)"/>
                <path d="M7 14L12 9L17 14L22 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 19L12 14L17 19L22 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                    <stop stopColor="#0C32FF"/>
                    <stop offset="0.5" stopColor="#E543DC"/>
                    <stop offset="1" stopColor="#FFC14F"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div className={styles.logoName}>Capitole Énergie</div>
              <div className={styles.logoSub}>Générateur de contrats</div>
            </div>
          </div>
          <div className={styles.headerBadge}>
            <span className="material-symbols-rounded" style={{fontSize:14}}>bolt</span>
            MINT Maîtrise
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.container}>

          {/* Hero */}
          <div className={styles.hero}>
            <div className={styles.heroEyebrow}>
              <span className="material-symbols-rounded">description</span>
              Génération automatique
            </div>
            <h1 className={styles.heroTitle}>
              Générez votre contrat<br/>
              <span className={styles.heroGradient}>en quelques secondes</span>
            </h1>
            <p className={styles.heroSub}>
              Saisissez l&apos;identifiant Salesforce de l&apos;opportunité.<br/>
              Le contrat adapté au segment est généré et prêt au téléchargement.
            </p>
          </div>

          {/* Card principale */}
          <div className={styles.card}>

            {status === 'idle' || status === 'loading' || status === 'error' ? (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel} htmlFor="oppId">
                    <span className="material-symbols-rounded">tag</span>
                    Identifiant Opportunity Salesforce
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      ref={inputRef}
                      id="oppId"
                      type="text"
                      className={styles.input}
                      placeholder="006Xx000001234ABC"
                      value={opportunityId}
                      onChange={e => setOpportunityId(e.target.value)}
                      disabled={status === 'loading'}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {opportunityId && (
                      <button
                        type="button"
                        className={styles.inputClear}
                        onClick={() => { setOpportunityId(''); setError(''); inputRef.current?.focus() }}
                      >
                        <span className="material-symbols-rounded">close</span>
                      </button>
                    )}
                  </div>
                  <p className={styles.inputHint}>
                    L&apos;identifiant commence par <code>006</code> et se trouve dans l&apos;URL de l&apos;opportunité SF
                  </p>
                </div>

                {error && (
                  <div className={styles.errorBox}>
                    <span className="material-symbols-rounded">error</span>
                    <div>
                      <div className={styles.errorTitle}>Erreur de génération</div>
                      <div className={styles.errorMsg}>{error}</div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={status === 'loading' || !opportunityId.trim()}
                >
                  {status === 'loading' ? (
                    <>
                      <div className={styles.spinner} />
                      Connexion à Salesforce…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded">auto_awesome</span>
                      Générer le contrat
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Success state */
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <span className="material-symbols-rounded">check_circle</span>
                </div>
                <div className={styles.successTitle}>Contrat généré !</div>
                <div className={styles.successMeta}>
                  {result?.client && (
                    <div className={styles.successMetaItem}>
                      <span className="material-symbols-rounded">business</span>
                      {result.client}
                    </div>
                  )}
                  {result?.segment && (
                    <div className={styles.successMetaItem}>
                      <span className="material-symbols-rounded">category</span>
                      Segment {result.segment}
                    </div>
                  )}
                </div>

                <div className={styles.fileCard}>
                  <div className={styles.fileIcon}>
                    <span className="material-symbols-rounded">draft</span>
                  </div>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{result?.filename}</div>
                    <div className={styles.fileSize}>
                      {result?.blob ? `${(result.blob.size / 1024).toFixed(0)} Ko · Word (.docx)` : ''}
                    </div>
                  </div>
                </div>

                <div className={styles.successActions}>
                  <button className={styles.btnPrimary} onClick={handleDownload}>
                    <span className="material-symbols-rounded">download</span>
                    Télécharger le contrat
                  </button>
                  <button className={styles.btnSecondary} onClick={handleReset}>
                    <span className="material-symbols-rounded">add</span>
                    Nouveau contrat
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Segments info */}
          <div className={styles.segments}>
            {[
              { label: 'C2', icon: 'electric_meter', desc: 'Haute tension A' },
              { label: 'C4', icon: 'bolt', desc: 'Basse tension ≥ 36 kVA' },
              { label: 'C5', icon: 'home_work', desc: 'Basse tension < 36 kVA' },
              { label: 'Multi', icon: 'hub', desc: 'Multi-segments C2/C4/C5' },
            ].map(seg => (
              <div key={seg.label} className={styles.segmentChip}>
                <span className="material-symbols-rounded" style={{fontSize:16}}>{seg.icon}</span>
                <span className={styles.segmentLabel}>{seg.label}</span>
                <span className={styles.segmentDesc}>{seg.desc}</span>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBar} />
        <div className={styles.footerInner}>
          <span>© 2026 Capitole Énergie by epsa</span>
          <span>Outil interne — Usage réservé aux équipes commerciales</span>
        </div>
      </footer>
    </div>
  )
}
