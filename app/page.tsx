'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './page.module.css'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface Result {
  filename: string
  blob: Blob
  segment: string
  client: string
  opportunityId: string
}

interface HistoryEntry {
  id: string
  opportunityId: string
  filename: string
  client: string
  segment: string
  date: string
  dataBase64: string
}

const HISTORY_KEY = 'contrats_history'
const MAX_HISTORY = 10

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }
  catch { return [] }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function base64ToObjectUrl(base64: string): string {
  const binary = atob(base64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  return URL.createObjectURL(blob)
}

export default function Home() {
  const [opportunityId, setOpportunityId] = useState('')
  const [status, setStatus]               = useState<Status>('idle')
  const [result, setResult]               = useState<Result | null>(null)
  const [error, setError]                 = useState('')
  const [downloadUrl, setDownloadUrl]     = useState<string | null>(null)
  const [history, setHistory]             = useState<HistoryEntry[]>([])
  const [showSfHelp, setShowSfHelp]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setHistory(loadHistory()) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = opportunityId.trim()
    if (!id) { inputRef.current?.focus(); return }

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
      const client   = decodeURIComponent(res.headers.get('x-client') || '')
      const url      = URL.createObjectURL(blob)

      setDownloadUrl(url)
      setResult({ filename, blob, segment, client, opportunityId: id })
      setStatus('success')

      const dataBase64 = await blobToBase64(blob)
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        opportunityId: id,
        filename,
        client,
        segment,
        date: new Date().toISOString(),
        dataBase64,
      }
      const updated = [entry, ...loadHistory()].slice(0, MAX_HISTORY)
      saveHistory(updated)
      setHistory(updated)
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

  const handleHistoryDownload = (entry: HistoryEntry) => {
    const url = base64ToObjectUrl(entry.dataBase64)
    const a   = document.createElement('a')
    a.href     = url
    a.download = entry.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
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

  const handleClearHistory = () => {
    saveHistory([])
    setHistory([])
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoText}>
            <div className={styles.logoName}>Capitole Énergie</div>
            <div className={styles.logoSub}>Générateur de contrats</div>
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
            <div className={styles.heroNotice}>
              <span className="material-symbols-rounded">edit_note</span>
              <span>
                Les parties <mark>surlignées en jaune</mark> sont à compléter manuellement —
                pensez notamment à renseigner les sections <strong>Flexibilité</strong> et <strong>GO</strong>.
              </span>
            </div>
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

                  {/* SF Help */}
                  <button
                    type="button"
                    className={styles.sfHelpToggle}
                    onClick={() => setShowSfHelp(v => !v)}
                  >
                    <span className="material-symbols-rounded">help_outline</span>
                    Où trouver cet identifiant ?
                    <span className="material-symbols-rounded" style={{marginLeft:'auto', fontSize:16}}>
                      {showSfHelp ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {showSfHelp && (
                    <div className={styles.sfHelp}>
                      <p className={styles.sfHelpText}>
                        Ouvrez l&apos;opportunité dans Salesforce. L&apos;identifiant se trouve dans l&apos;URL,
                        entre <code>/Opportunity/</code> et <code>/view</code> :
                      </p>
                      <div className={styles.sfUrlBar}>
                        <span className={styles.sfUrlDomain}>
                          capitoleenergie.lightning.force.com
                        </span>
                        <span className={styles.sfUrlSep}>/lightning/r/Opportunity/</span>
                        <span className={styles.sfUrlId}>006SZ00001bsVM1YAM</span>
                        <span className={styles.sfUrlSep}>/view</span>
                      </div>
                      <p className={styles.sfHelpHint}>
                        <span className="material-symbols-rounded" style={{fontSize:14, verticalAlign:'middle'}}>arrow_upward</span>
                        Copiez uniquement la partie encadrée ci-dessus.
                      </p>
                    </div>
                  )}

                  <p className={styles.inputHint}>
                    L&apos;identifiant commence par <code>006</code> et se trouve dans l&apos;URL Salesforce
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

          {/* Historique */}
          {history.length > 0 && (
            <div className={styles.historySection}>
              <div className={styles.historyHeader}>
                <div className={styles.historyTitle}>
                  <span className="material-symbols-rounded">history</span>
                  Historique des générations
                </div>
                <button className={styles.historyClear} onClick={handleClearHistory}>
                  <span className="material-symbols-rounded">delete_sweep</span>
                  Effacer
                </button>
              </div>
              <div className={styles.historyList}>
                {history.map(entry => (
                  <div key={entry.id} className={styles.historyItem}>
                    <div className={styles.historyItemIcon}>
                      <span className="material-symbols-rounded">description</span>
                    </div>
                    <div className={styles.historyItemInfo}>
                      <div className={styles.historyItemClient}>
                        {entry.client || entry.opportunityId}
                      </div>
                      <div className={styles.historyItemMeta}>
                        {entry.segment && <span>Segment {entry.segment}</span>}
                        <span>
                          {new Date(entry.date).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      className={styles.historyDownload}
                      onClick={() => handleHistoryDownload(entry)}
                      title="Télécharger"
                    >
                      <span className="material-symbols-rounded">download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segments */}
          <div className={styles.segments}>
            {[
              { label: 'C2',    icon: 'electric_meter', desc: 'Haute tension A' },
              { label: 'C4',    icon: 'bolt',           desc: 'Basse tension ≥ 36 kVA' },
              { label: 'C5',    icon: 'home_work',      desc: 'Basse tension < 36 kVA' },
              { label: 'Multi', icon: 'hub',            desc: 'Multi-segments C2/C4/C5' },
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
