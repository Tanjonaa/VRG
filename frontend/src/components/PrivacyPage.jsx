import React from 'react'

const S = {
  page: {
    minHeight: '100dvh', background: '#07070f',
    color: '#f0f0f5', fontFamily: 'system-ui, sans-serif',
  },
  header: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#0c0c1a',
    padding: '16px 24px',
    display: 'flex', alignItems: 'center', gap: 16,
    position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
    color: 'rgba(240,240,245,0.6)', fontSize: 13, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  wrap: {
    maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px',
  },
  h1: {
    fontSize: 28, fontWeight: 800, color: '#f0f0f5',
    letterSpacing: '-0.5px', marginBottom: 8,
  },
  lead: {
    fontSize: 14, color: 'rgba(240,240,245,0.45)', lineHeight: 1.6, marginBottom: 40,
  },
  section: {
    marginBottom: 32,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: '24px 28px',
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 800, color: '#FF9900',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    marginBottom: 14,
  },
  p: {
    fontSize: 14, color: 'rgba(240,240,245,0.6)', lineHeight: 1.7, marginBottom: 10,
  },
  ul: {
    paddingLeft: 0, listStyle: 'none', margin: 0,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  li: {
    fontSize: 14, color: 'rgba(240,240,245,0.6)', lineHeight: 1.6,
    paddingLeft: 18, position: 'relative',
  },
  dot: {
    position: 'absolute', left: 0, top: 7,
    width: 5, height: 5, borderRadius: '50%',
    background: '#FF9900', display: 'inline-block',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 99, padding: '4px 12px',
    fontSize: 12, fontWeight: 700, color: '#22c55e',
  },
  updated: {
    fontSize: 12, color: 'rgba(240,240,245,0.25)', marginTop: 40, textAlign: 'center',
  },
}

function Li({ children }) {
  return (
    <li style={S.li}>
      <span style={S.dot} />
      {children}
    </li>
  )
}

function Section({ title, children }) {
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <button style={S.backBtn} onClick={() => window.location.href = '/'}>
          ← Retour
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <img src="/images/logo/logo.svg" alt="VRG"
            style={{ width: 26, height: 26, borderRadius: 7 }}
            onError={e => e.target.style.display = 'none'} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#FF9900' }}>VaRyGasy</span>
        </div>
      </header>

      {/* Content */}
      <div style={S.wrap}>
        <h1 style={S.h1}>Politique de confidentialité</h1>
        <p style={S.lead}>
          Chez VaRyGasy, ta vie privée est importante. Cette page explique quelles données
          nous collectons, comment nous les utilisons, et tes droits.
        </p>

        <Section title="Données collectées">
          <p style={S.p}>Lors de ton inscription ou de ta commande, nous collectons :</p>
          <ul style={S.ul}>
            <Li>Ton <strong style={{ color: '#f0f0f5' }}>nom complet</strong> et ton <strong style={{ color: '#f0f0f5' }}>numéro de téléphone</strong> (identifiant de compte)</Li>
            <Li>Ton <strong style={{ color: '#f0f0f5' }}>adresse de livraison</strong></Li>
            <Li>Ton <strong style={{ color: '#f0f0f5' }}>historique de commandes</strong> (articles, montants, statuts)</Li>
            <Li>La <strong style={{ color: '#f0f0f5' }}>référence de transaction mobile money</strong> (MVola / Airtel / Orange) que tu fournis pour confirmer ton paiement — uniquement à titre de preuve</Li>
          </ul>
        </Section>

        <Section title="Utilisation de tes données">
          <ul style={S.ul}>
            <Li>Traitement et suivi de tes commandes</Li>
            <Li>Livraison : ton nom, téléphone et adresse sont communiqués au livreur assigné</Li>
            <Li>Support client via le chat ou WhatsApp</Li>
            <Li>Calcul de tes points de fidélité et de ton programme de parrainage</Li>
            <Li>Amélioration de nos services (statistiques internes anonymisées)</Li>
          </ul>
        </Section>

        <Section title="Ce que nous ne faisons PAS">
          <ul style={S.ul}>
            <Li>Aucune vente ni transmission de tes données à des tiers commerciaux</Li>
            <Li>Aucune publicité ciblée via des plateformes externes (Google Ads, Meta…)</Li>
            <Li>Aucun partage de données, sauf obligation légale imposée par le droit malgache</Li>
          </ul>
        </Section>

        <Section title="Qui accède à tes données ?">
          <p style={S.p}>
            Uniquement l'équipe interne VaRyGasy :
          </p>
          <ul style={S.ul}>
            <Li><strong style={{ color: '#FF9900' }}>Administrateurs</strong> — accès complet pour la gestion de la boutique</Li>
            <Li><strong style={{ color: '#60a5fa' }}>Modérateurs</strong> — gestion des commandes et du stock</Li>
            <Li><strong style={{ color: '#22c55e' }}>Livreurs</strong> — accès uniquement à ton nom, téléphone et adresse pour la livraison en cours</Li>
          </ul>
        </Section>

        <Section title="Cookies et stockage local">
          <p style={S.p}>
            Nous n'utilisons <strong style={{ color: '#f0f0f5' }}>aucun cookie de tracking tiers</strong> (Google Analytics, Meta Pixel, etc.).
          </p>
          <p style={S.p}>
            Un <strong style={{ color: '#f0f0f5' }}>token de session JWT</strong> est stocké dans ton navigateur (localStorage) uniquement pour maintenir ta connexion active pendant 30 jours. Il ne contient que ton identifiant, ton nom et ton rôle — aucune donnée sensible.
          </p>
        </Section>

        <Section title="Tes droits">
          <p style={S.p}>Tu peux à tout moment :</p>
          <ul style={S.ul}>
            <Li>Consulter les données liées à ton compte depuis ton profil</Li>
            <Li>Demander la <strong style={{ color: '#f0f0f5' }}>modification</strong> de ton nom ou numéro dans les paramètres</Li>
            <Li>Demander la <strong style={{ color: '#f87171' }}>suppression complète</strong> de ton compte et de tes données — réponse sous 7 jours ouvrés</Li>
          </ul>
          <div style={{ marginTop: 16 }}>
            <p style={{ ...S.p, marginBottom: 10 }}>Pour toute demande de suppression ou question :</p>
            <span style={S.badge}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              Contacte-nous via le chat support ou WhatsApp
            </span>
          </div>
        </Section>

        <Section title="Sécurité">
          <p style={S.p}>
            Tes données sont stockées sur un serveur sécurisé. Les mots de passe sont chiffrés
            avec <strong style={{ color: '#f0f0f5' }}>bcrypt</strong> — nous n'avons pas accès à ton mot de passe en clair.
            Les communications entre ton navigateur et notre serveur sont protégées par HTTPS.
          </p>
        </Section>

        <p style={S.updated}>Dernière mise à jour : mai 2026 · VaRyGasy, Antananarivo, Madagascar</p>
      </div>
    </div>
  )
}