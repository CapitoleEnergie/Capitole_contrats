import { SignIn } from '@clerk/nextjs'
import styles from './page.module.css'

export default function SignInPage() {
  return (
    <div className={styles.signInPage}>
      {/* Background gradient décoratif */}
      <div className={styles.bgGradient} />

      <div className={styles.signInLayout}>
        {/* Panneau gauche — branding */}
        <div className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <div className={styles.brandLogo}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <rect width="52" height="52" rx="16" fill="url(#g)"/>
                <path d="M13 26L22 17L31 26L40 17" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 35L22 26L31 35L40 26" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="52" y2="52">
                    <stop stopColor="#0C32FF"/>
                    <stop offset="0.5" stopColor="#E543DC"/>
                    <stop offset="1" stopColor="#FFC14F"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className={styles.brandName}>Capitole Énergie</div>
            <div className={styles.brandTagline}>by epsa</div>

            <div className={styles.brandDivider} />

            <h1 className={styles.brandTitle}>
              Générateur de<br/>contrats MINT
            </h1>
            <p className={styles.brandDesc}>
              Générez automatiquement vos contrats Maîtrise depuis Salesforce en quelques secondes.
            </p>

            <div className={styles.brandFeatures}>
              {[
                { icon: 'bolt',        label: 'Génération instantanée' },
                { icon: 'hub',         label: 'Multi-segments C2 / C4 / C5' },
                { icon: 'cloud_sync',  label: 'Synchronisé avec Salesforce' },
              ].map(f => (
                <div key={f.icon} className={styles.brandFeature}>
                  <span className="material-symbols-rounded">{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau droit — formulaire Clerk */}
        <div className={styles.formPanel}>
          <SignIn
            appearance={{
              elements: {
                rootBox:    'clerk-root',
                card:       'clerk-signin-card',
                headerTitle:'clerk-signin-title',
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
