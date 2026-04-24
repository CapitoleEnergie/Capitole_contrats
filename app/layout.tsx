import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { frFR } from '@clerk/localizations'
import './globals.css'

export const metadata: Metadata = {
  title: 'Générateur de Contrats — Capitole Énergie',
  description: 'Génération automatique des contrats MINT à partir de Salesforce',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={frFR}
      appearance={{
        variables: {
          colorPrimary:       '#5020EA',
          colorBackground:    '#FFFFFF',
          colorText:          '#232323',
          colorInputBackground: '#F3F3F3',
          borderRadius:       '10px',
          fontFamily:         'Poppins, sans-serif',
        },
        elements: {
          card:           'clerk-card',
          headerTitle:    'clerk-header-title',
          headerSubtitle: 'clerk-header-subtitle',
          formButtonPrimary: 'clerk-btn-primary',
          footerActionLink:  'clerk-footer-link',
        },
      }}
    >
      <html lang="fr">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Poppins:wght@300;400;500;600&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
            rel="stylesheet"
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
