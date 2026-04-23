# Capitole Énergie — Générateur de Contrats

Interface web Next.js déployée sur Vercel pour la génération automatique des contrats MINT à partir de Salesforce.

---

## 🚀 Déploiement sur Vercel

### 1. Prérequis
- Compte Vercel
- Repository Git (GitHub / GitLab)

### 2. Structure du projet
```
capitole-contrats/
├── app/
│   ├── layout.tsx         # Layout global + fonts
│   ├── page.tsx           # Interface utilisateur
│   ├── page.module.css    # Styles Capitole brand
│   ├── globals.css        # Variables CSS globales
│   └── api/generate/
│       └── route.ts       # API route de génération
├── lib/
│   └── generate.ts        # Logique SF + docxtemplater
├── public/
│   └── templates/         # ← COPIER ICI les 4 templates
│       ├── template_C2.docx
│       ├── template_C4.docx
│       ├── template_C5.docx
│       └── template_MULTI.docx
├── .env.example
├── next.config.js
└── package.json
```

### 3. Copier les templates
Avant de déployer, placer les 4 fichiers `.docx` dans `public/templates/` :
```bash
cp templates/template_C2.docx    public/templates/
cp templates/template_C4.docx    public/templates/
cp templates/template_C5.docx    public/templates/
cp templates/template_MULTI.docx public/templates/
```

### 4. Variables d'environnement sur Vercel
Dans **Vercel > Settings > Environment Variables**, ajouter :

| Variable             | Valeur                              |
|----------------------|-------------------------------------|
| `SF_LOGIN_URL`       | `https://login.salesforce.com`      |
| `SF_USERNAME`        | `dlauger@capitole-energie.com`      |
| `SF_PASSWORD`        | `votre_mot_de_passe`                |
| `SF_SECURITY_TOKEN`  | `votre_token_sf`                    |

### 5. Déployer
```bash
# Installer Vercel CLI
npm i -g vercel

# Dans le dossier du projet
vercel --prod
```

Ou connecter le repo GitHub dans le dashboard Vercel pour un déploiement automatique à chaque push.

---

## 🖥️ Utilisation

1. Ouvrir l'URL Vercel de l'application
2. Saisir l'**ID Opportunity Salesforce** (commence par `006`)
3. Cliquer **Générer le contrat**
4. Télécharger le `.docx` généré

Le segment (C2, C4, C5, Multi) est **détecté automatiquement** depuis Salesforce.

---

## 🔧 Développement local

```bash
npm install
cp .env.example .env.local
# Remplir .env.local avec vos credentials SF
npm run dev
# → http://localhost:3000
```
