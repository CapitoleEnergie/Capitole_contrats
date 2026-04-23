/**
 * lib/generate.ts
 * Toute la logique Salesforce + génération de contrat
 * Portage de sf_generate.js vers TypeScript / Next.js
 */

import fs from 'fs'
import path from 'path'

// Les templates sont dans /public/templates/ (copiés au build)
const TEMPLATES_DIR = path.join(process.cwd(), 'public', 'templates')

const SF_CONFIG = {
  loginUrl:      process.env.SF_LOGIN_URL      || 'https://login.salesforce.com',
  username:      process.env.SF_USERNAME        || '',
  password:      process.env.SF_PASSWORD        || '',
  securityToken: process.env.SF_SECURITY_TOKEN  || '',
}

// ── SOQL Queries ──────────────────────────────────────────────────────────────

const Q_OPPORTUNITY = (id: string) => `
  SELECT Id, Name, NombreCompteur__c,
    Contact_Principal__r.Name, Contact_Principal__r.Title,
    Contact_Principal__r.Email, Contact_Principal__r.MobilePhone,
    Contact_Principal__r.Phone, Contact_Principal__r.MailingStreet,
    Contact_Principal__r.MailingPostalCode, Contact_Principal__r.MailingCity,
    Contact_Principal__r.MailingCountry,
    Account.Name, Account.ESCONNECT__FORMULA_capital__c,
    Account.ESCONNECT__SIREN__c, Account.ESCONNECT__legalForm__c,
    Account.BillingStreet, Account.BillingPostalCode,
    Account.BillingCity, Account.BillingCountry, Account.Ville_RCS__c
  FROM Opportunity WHERE Id = '${id}'`

const Q_OFFRES = (id: string, segment: string) => `
  SELECT Id, Name,
    Compteur__r.Name, Compteur__r.Segment__c,
    Compteur__r.Siret_Compteur__c, Compteur__r.Code_Acheminement__c,
    Compteur__r.Voie__c, Compteur__r.CodePostal__c,
    Compteur__r.Commune__c, Compteur__r.Batiment__c,
    Compteur__r.Batiment_Adresse__c, Compteur__r.CommentaireAdresseInstallation__c,
    Compteur__r.PuissanceHPTE__c, Compteur__r.PuissanceHPH__c,
    Compteur__r.PuissanceHCH__c, Compteur__r.PuissanceHPE__c,
    Compteur__r.PuissanceHCE__c, Compteur__r.PuissanceSouscrite__c,
    Compteur__r.ProfilCompteur__c, Compteur__r.VolumeTotalAnnuel__c,
    Compteur__r.Compte__r.TECH_APE_NAF__c, Compteur__r.Compte__r.Name,
    (SELECT Id, DateDebut__c, DateFin__c, DureeMois__c,
       Calcul_AboAnnuel__c, CAR_valid_e_fournisseur_MWh__c,
       PrixU__c, ATRD_fix__c, ATRT__c, PrixPartVarDistri__c,
       PrixHPHmarge__c, PrixHCHmarge__c, PrixHPEmarge__c, PrixHCEmarge__c,
       PrixHPTEmarge__c, PrixHPmarge__c, PrixHCmarge__c, PrixUmarge__c,
       CompteEligible_CEE__c
     FROM LignesOffre__r
     WHERE Statut__c = 'Retenue'
     ORDER BY DateDebut__c)
  FROM Offre__c
  WHERE Opportunity__c = '${id}' AND Compteur__r.Segment__c = '${segment}'
  ORDER BY Compteur__r.Name`

const Q_PRIX = (id: string, segment: string) => `
  SELECT LigneOffre__c, DateDebut__c, DateFin__c,
    PrixHPHmarge__c, PrixHCHmarge__c, PrixHPEmarge__c, PrixHCEmarge__c,
    PrixHPTEmarge__c, Calcul_AboAnnuel__c,
    LigneOffre__r.Offre__r.Compteur__r.Name
  FROM AnneeLigneOffre__c
  WHERE LigneOffre__r.Offre__r.Opportunity__c = '${id}'
    AND LigneOffre__r.Offre__r.Compteur__r.Segment__c = '${segment}'
  ORDER BY LigneOffre__r.Offre__r.Compteur__r.Name, DateDebut__c`

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtDate = (d: any) => {
  if (!d) return ''
  const [y, m, j] = String(d).split('-')
  return `${j}/${m}/${y}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtPrix = (v: any) => {
  if (v === null || v === undefined || v === '') return ''
  return Number(v).toFixed(2).replace('.', ',')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtCapital = (v: any) => {
  if (!v) return ''
  return String(v).replace(/\s*EUR\s*/i, '').trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildAdresseCompteur = (c: any) =>
  [c.Voie__c, c.CodePostal__c, c.Commune__c]
    .map((v: string) => (v || '').replace(/[\r\n]+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildAdresseAccount = (a: any) =>
  [a.BillingStreet, a.BillingPostalCode, a.BillingCity, a.BillingCountry]
    .map((v: string) => (v || '').replace(/[\r\n]+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSiteData(offre: any, prixMap: Record<string, any>) {
  const c       = offre.Compteur__r
  const lignes  = offre.LignesOffre__r?.records || []
  const ligne   = lignes[0]
  if (!ligne) return null

  const pxLigne = ligne || {}
  const pxAnnee = prixMap[ligne.Id] || {}
  const px = {
    PrixHPHmarge__c:  pxLigne.PrixHPHmarge__c  ?? pxAnnee.PrixHPHmarge__c,
    PrixHCHmarge__c:  pxLigne.PrixHCHmarge__c  ?? pxAnnee.PrixHCHmarge__c,
    PrixHPEmarge__c:  pxLigne.PrixHPEmarge__c  ?? pxAnnee.PrixHPEmarge__c,
    PrixHCEmarge__c:  pxLigne.PrixHCEmarge__c  ?? pxAnnee.PrixHCEmarge__c,
    PrixHPTEmarge__c: pxLigne.PrixHPTEmarge__c ?? pxAnnee.PrixHPTEmarge__c,
    PrixUmarge__c:    pxLigne.PrixUmarge__c    ?? pxAnnee.PrixUmarge__c,
    PrixHPmarge__c:   pxLigne.PrixHPmarge__c   ?? pxAnnee.PrixHPmarge__c,
    PrixHCmarge__c:   pxLigne.PrixHCmarge__c   ?? pxAnnee.PrixHCmarge__c,
  }

  return {
    site: {
      prm:          c.Name                       || '',
      siret:        c.Siret_Compteur__c          || '',
      naf:          c.Compte__r?.TECH_APE_NAF__c || '',
      adresse:      buildAdresseCompteur(c),
      cee:          ligne.CompteEligible_CEE__c ? 'oui' : 'non',
      fta:          c.Code_Acheminement__c       || '',
      date_debut:   fmtDate(ligne.DateDebut__c),
      date_fin:     fmtDate(ligne.DateFin__c),
      puiss_pointe: String(c.PuissanceHPTE__c || c.PuissanceSouscrite__c || ''),
      puiss_hph:    String(c.PuissanceHPH__c || ''),
      puiss_hch:    String(c.PuissanceHCH__c || ''),
      puiss_hpe:    String(c.PuissanceHPE__c || ''),
      puiss_hce:    String(c.PuissanceHCE__c || ''),
      calendrier:   c.ProfilCompteur__c || c.Code_Acheminement__c || '',
      puissance:    String(c.PuissanceSouscrite__c || ''),
    },
    px,
    dateDebut: ligne.DateDebut__c,
    dateFin:   ligne.DateFin__c,
    volume:    Number(c.VolumeTotalAnnuel__c || 0),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ceeStatus(sites: any[]) {
  const vals = sites.map(s => s.cee)
  const allOui  = vals.length > 0 && vals.every(v => v === 'oui')
  const allNon  = vals.length > 0 && vals.every(v => v === 'non')
  const isMixte = !allOui && !allNon
  return {
    cee_check_soumis:     allOui  ? '☑' : '☐',
    cee_check_non_soumis: allNon  ? '☑' : '☐',
    cee_check_mixte:      isMixte ? '☑' : '☐',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildClientData(opp: any) {
  const acc     = opp.Account
  const ctl     = opp.Contact_Principal__r
  const adresse = buildAdresseAccount(acc)
  return {
    nom_client:                acc.Name || '',
    forme_juridique:           acc.ESCONNECT__legalForm__c || '',
    capital_social:            fmtCapital(acc.ESCONNECT__FORMULA_capital__c),
    adresse_siege:             adresse,
    ville_rcs:                 acc.Ville_RCS__c || acc.BillingCity || '',
    siren:                     acc.ESCONNECT__SIREN__c || '',
    adresse_facturation:       adresse,
    cp_ville_facturation:      adresse.includes(',') ? adresse.split(',').slice(1).join(',').trim() : '',
    email_facturation:         ctl?.Email || '',
    prenom_nom_signataire:     ctl?.Name  || '',
    prenom_nom_signataire_bas: ctl?.Name  || '',
    fonction_signataire:       ctl?.Title || '',
    fonction_signataire_bas:   ctl?.Title || '',
    contact_nom:               ctl?.Name  || '',
    contact_email:             ctl?.Email || '',
    contact_tel_fixe:          ctl?.Phone || '',
    contact_tel_mobile:        ctl?.MobilePhone || '',
    contact_adresse: [ctl?.MailingStreet, ctl?.MailingPostalCode, ctl?.MailingCity]
      .map((v: string) => (v || '').replace(/[\r\n]+/g, ' ').trim())
      .filter(Boolean).join(', '),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMonoData(opp: any, offres: any[], prixMap: Record<string, any>, segment: string) {
  const client = buildClientData(opp)
  const sitesData = offres.map(o => buildSiteData(o, prixMap)).filter(Boolean)
  
  const sites     = sitesData.map(s => s!.site)
  const volumes   = sitesData.map(s => s!.volume)
  const dates     = sitesData.flatMap(s => [s!.dateDebut, s!.dateFin])
  const dateMin   = dates.filter(Boolean).sort()[0]
  const dateMax   = dates.filter(Boolean).sort().reverse()[0]
  const totalVol  = volumes.reduce((a, b) => a + b, 0)

  const firstPx   = sitesData[0]?.px || {}
  const tarifs = {
    prix_hph:    fmtPrix(firstPx.PrixHPHmarge__c),
    prix_hch:    fmtPrix(firstPx.PrixHCHmarge__c),
    prix_hpe:    fmtPrix(firstPx.PrixHPEmarge__c),
    prix_hce:    fmtPrix(firstPx.PrixHCEmarge__c),
    prix_pointe: fmtPrix(firstPx.PrixHPTEmarge__c),
    prix_base:   fmtPrix(firstPx.PrixUmarge__c),
    prix_hp:     fmtPrix(firstPx.PrixHPmarge__c),
    prix_hc:     fmtPrix(firstPx.PrixHCmarge__c),
  }

  return {
    ...client,
    ...tarifs,
    ...ceeStatus(sites),
    date_debut_fourniture:  fmtDate(dateMin),
    date_fin_fourniture:    fmtDate(dateMax),
    nb_prm:                 String(sites.length),
    volume_contractuel_mwh: totalVol > 0 ? Math.round(totalVol).toLocaleString('fr-FR') : '',
    sites,
    // Alias pour le segment dans les templates monosegment
    sites_c2: segment === 'C2' ? sites : [],
    sites_c4: segment === 'C4' ? sites : [],
    sites_c5: segment === 'C5' ? sites : [],
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMultiData(opp: any, allOffresBySeg: Record<string, any[]>, allPrixMap: Record<string, any>) {
  const client = buildClientData(opp)

  const segData: Record<string, { sites: any[], px: any, vol: number }> = {}
  let dateMin: string | null = null
  let dateMax: string | null = null
  let totalVol = 0
  let totalPrm = 0

  for (const [seg, offres] of Object.entries(allOffresBySeg)) {
    const sitesData = offres.map(o => buildSiteData(o, allPrixMap)).filter(Boolean)
    const sites     = sitesData.map(s => s!.site)
    const vol       = sitesData.reduce((a, s) => a + s!.volume, 0)
    const px        = sitesData[0]?.px || {}

    sitesData.forEach(s => {
      if (s?.dateDebut && (!dateMin || s.dateDebut < dateMin)) dateMin = s.dateDebut
      if (s?.dateFin   && (!dateMax || s.dateFin   > dateMax)) dateMax = s.dateFin
    })

    totalVol += vol
    totalPrm += sites.length
    segData[seg] = { sites, px, vol }
  }

  const allSites = Object.values(segData).flatMap(s => s.sites)

  return {
    ...client,
    ...ceeStatus(allSites),
    date_debut_fourniture: fmtDate(dateMin),
    date_fin_fourniture:   fmtDate(dateMax),

    // Tableau 1 stats
    c2_nb_prm:        String(segData['C2']?.sites.length || ''),
    c2_volume_mwh:    segData['C2']?.vol ? Math.round(segData['C2'].vol).toLocaleString('fr-FR') : '',
    c4_nb_prm:        String(segData['C4']?.sites.length || ''),
    c4_volume_mwh:    segData['C4']?.vol ? Math.round(segData['C4'].vol).toLocaleString('fr-FR') : '',
    c5_nb_prm:        String(segData['C5']?.sites.length || ''),
    c5_volume_mwh:    segData['C5']?.vol ? Math.round(segData['C5'].vol).toLocaleString('fr-FR') : '',
    total_nb_prm:     String(totalPrm),
    total_volume_mwh: totalVol > 0 ? Math.round(totalVol).toLocaleString('fr-FR') : '',
    c2_flexibilite: '', c4_flexibilite: '', c5_flexibilite: '', total_flexibilite: '',

    // Prix C2
    c2_prix_pointe: fmtPrix(segData['C2']?.px?.PrixHPTEmarge__c),
    c2_prix_hph:    fmtPrix(segData['C2']?.px?.PrixHPHmarge__c),
    c2_prix_hch:    fmtPrix(segData['C2']?.px?.PrixHCHmarge__c),
    c2_prix_hpe:    fmtPrix(segData['C2']?.px?.PrixHPEmarge__c),
    c2_prix_hce:    fmtPrix(segData['C2']?.px?.PrixHCEmarge__c),

    // Prix C4
    c4_prix_hph:    fmtPrix(segData['C4']?.px?.PrixHPHmarge__c),
    c4_prix_hch:    fmtPrix(segData['C4']?.px?.PrixHCHmarge__c),
    c4_prix_hpe:    fmtPrix(segData['C4']?.px?.PrixHPEmarge__c),
    c4_prix_hce:    fmtPrix(segData['C4']?.px?.PrixHCEmarge__c),

    // Prix C5
    c5_prix_base:   fmtPrix(segData['C5']?.px?.PrixUmarge__c),
    c5_prix_hp:     fmtPrix(segData['C5']?.px?.PrixHPmarge__c),
    c5_prix_hc:     fmtPrix(segData['C5']?.px?.PrixHCmarge__c),
    c5_prix_hph:    fmtPrix(segData['C5']?.px?.PrixHPHmarge__c),
    c5_prix_hch:    fmtPrix(segData['C5']?.px?.PrixHCHmarge__c),
    c5_prix_hpe:    fmtPrix(segData['C5']?.px?.PrixHPEmarge__c),
    c5_prix_hce:    fmtPrix(segData['C5']?.px?.PrixHCEmarge__c),

    // Sites par segment
    sites_c2: segData['C2']?.sites || [],
    sites_c4: segData['C4']?.sites || [],
    sites_c5: segData['C5']?.sites || [],
  }
}

// ── Génération du .docx ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateDocx(data: any, segment: string): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PizZip        = require('pizzip')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Docxtemplater = require('docxtemplater')

  const templateName = `template_${segment}.docx`
  const templatePath = path.join(TEMPLATES_DIR, templateName)

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template introuvable : ${templateName} (dossier ${TEMPLATES_DIR})`)
  }

  const content = fs.readFileSync(templatePath, 'binary')
  const zip     = new PizZip(content)
  const doc     = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
    nullGetter:    () => '',
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
}

// ── Point d'entrée principal ──────────────────────────────────────────────────

export async function generateContractFromOpportunity(opportunityId: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsforce = require('jsforce')

  const conn = new jsforce.Connection({ loginUrl: SF_CONFIG.loginUrl })
  await conn.login(SF_CONFIG.username, SF_CONFIG.password + SF_CONFIG.securityToken)

  try {
    // 1. Opportunité
    const oppRes = await conn.query(Q_OPPORTUNITY(opportunityId))
    if (!oppRes.records.length) throw new Error(`Opportunity ${opportunityId} introuvable`)
    const opp = oppRes.records[0]
    const clientName = opp.Account?.Name || ''

    // 2. Détecter les segments présents
    const foundSegs: string[] = []
    for (const seg of ['C2', 'C3', 'C4', 'C5']) {
      const r = await conn.query(
        `SELECT COUNT() FROM Offre__c WHERE Opportunity__c = '${opportunityId}' AND Compteur__r.Segment__c = '${seg}'`
      )
      if (r.totalSize > 0) foundSegs.push(seg)
    }
    if (!foundSegs.length) throw new Error('Aucune offre retenue trouvée pour cette opportunité')

    const isMulti     = foundSegs.length > 1
    const templateKey = isMulti ? 'MULTI' : foundSegs[0]

    // 3. Charger offres + prix pour chaque segment
    const allPrixMap: Record<string, unknown> = {}
    const allOffresBySeg: Record<string, unknown[]> = {}

    for (const seg of foundSegs) {
      const [offresRes, prixRes] = await Promise.all([
        conn.query(Q_OFFRES(opportunityId, seg)),
        conn.query(Q_PRIX(opportunityId, seg)),
      ])
      allOffresBySeg[seg] = offresRes.records
      for (const row of prixRes.records as Record<string, unknown>[]) {
        const lid = row.LigneOffre__c as string
        if (!allPrixMap[lid]) allPrixMap[lid] = row
      }
    }

    // 4. Construire le payload
    let data: Record<string, unknown>
    if (isMulti) {
      data = buildMultiData(opp, allOffresBySeg, allPrixMap)
    } else {
      data = buildMonoData(opp, allOffresBySeg[foundSegs[0]], allPrixMap, foundSegs[0])
    }

    // 5. Générer le docx
    const buffer   = generateDocx(data, templateKey)
    const slug     = clientName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 40)
    const dateStr  = (data.date_debut_fourniture as string || '').replace(/\//g, '-')
    const filename = `contrat_${templateKey}_${slug}_${dateStr}.docx`

    return { buffer, filename, segment: templateKey, clientName }

  } finally {
    await conn.logout()
  }
}
