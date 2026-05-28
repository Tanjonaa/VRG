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
    marginBottom: 24,
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
    background: '#FF9900',
  },
  highlight: { color: '#f0f0f5', fontWeight: 600 },
  chip: (color) => ({
    display: 'inline-block', fontSize: 12, fontWeight: 700,
    padding: '2px 10px', borderRadius: 99,
    background: `rgba(${color},0.1)`, color: `rgb(${color})`,
    border: `1px solid rgba(${color},0.2)`,
  }),
  divider: {
    border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '12px 0',
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

export default function CGUPage() {
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
        <h1 style={S.h1}>Conditions Générales d'Utilisation</h1>
        <p style={S.lead}>
          En utilisant le site VaRyGasy ou en passant une commande, tu acceptes les présentes
          conditions. Lis-les attentivement — elles sont courtes et rédigées en langage simple.
        </p>

        <Section title="1. Qui sommes-nous ?">
          <p style={S.p}>
            <span style={S.highlight}>VaRyGasy</span> est une boutique en ligne malgache spécialisée
            dans les accessoires gaming et mobile (ventilateurs, finger sleeves, câbles, etc.).
            Nous livrons principalement sur <span style={S.highlight}>Antananarivo</span> et sa périphérie.
          </p>
        </Section>

        <Section title="2. Compte utilisateur">
          <ul style={S.ul}>
            <Li>Tu dois avoir au moins <span style={S.highlight}>18 ans</span> pour créer un compte, ou être autorisé par un parent/tuteur.</Li>
            <Li>Ton <span style={S.highlight}>numéro de téléphone</span> est ton identifiant unique — il doit être valide et t'appartenir.</Li>
            <Li>Tu es responsable de la <span style={S.highlight}>confidentialité de ton mot de passe</span>. En cas de compromission, contacte-nous immédiatement.</Li>
            <Li>Nous nous réservons le droit de suspendre tout compte utilisé de manière frauduleuse ou abusive.</Li>
          </ul>
        </Section>

        <Section title="3. Commandes et paiement">
          <p style={S.p}>
            Toute commande passée sur VaRyGasy constitue un engagement ferme d'achat sous réserve de disponibilité du stock.
          </p>
          <ul style={S.ul}>
            <Li>Les prix sont affichés en <span style={S.highlight}>Ariary (Ar)</span>, frais de livraison non inclus.</Li>
            <Li>Modes de paiement acceptés : <span style={S.chip('0,166,81')}>MVola</span>{' '}
              <span style={S.chip('228,0,50')}>Airtel Money</span>{' '}
              <span style={S.chip('255,102,0')}>Orange Money</span>{' '}
              <span style={S.chip('34,197,94')}>Paiement à la livraison</span></Li>
            <Li>Pour les paiements mobile money, la référence de transaction que tu fournis est utilisée uniquement pour vérifier ton paiement.</Li>
            <Li>Une commande n'est confirmée qu'après validation du paiement par notre équipe.</Li>
          </ul>
        </Section>

        <Section title="4. Livraison">
          <ul style={S.ul}>
            <Li>Nous livrons sur <span style={S.highlight}>Antananarivo ville</span> et la <span style={S.highlight}>périphérie</span>. Les frais de livraison sont indiqués au moment de la commande.</Li>
            <Li>Le délai de livraison habituel est de <span style={S.highlight}>24 à 48h</span> après confirmation de commande.</Li>
            <Li>Tu recevras les <span style={S.highlight}>coordonnées de ton livreur</span> via le chat dès la prise en charge de ta commande.</Li>
            <Li>En cas d'absence lors de la livraison, notre livreur te contactera directement par téléphone.</Li>
          </ul>
        </Section>

        <Section title="5. Retours et remboursements">
          <p style={S.p}>
            Nous acceptons les retours dans un délai de <span style={S.highlight}>7 jours</span> après réception, si le produit :
          </p>
          <ul style={S.ul}>
            <Li>Est <span style={S.highlight}>défectueux</span> ou ne correspond pas à la description</Li>
            <Li>N'a <span style={S.highlight}>pas été utilisé</span> et est dans son état d'origine</Li>
          </ul>
          <hr style={S.divider} />
          <p style={{ ...S.p, marginBottom: 0 }}>
            Pour initier un retour, contacte-nous via le chat support ou WhatsApp dans le délai imparti.
            Les frais de retour sont à la charge du client sauf en cas de produit défectueux.
          </p>
        </Section>

        <Section title="6. Disponibilité et stocks">
          <ul style={S.ul}>
            <Li>Les stocks affichés sur le site sont mis à jour en temps réel. Un article peut néanmoins être épuisé entre le moment où tu l'ajoutes au panier et la finalisation de la commande.</Li>
            <Li>En cas de rupture après validation, nous te contacterons pour proposer un remboursement ou un article de remplacement.</Li>
          </ul>
        </Section>

        <Section title="7. Programme de fidélité et parrainage">
          <ul style={S.ul}>
            <Li><span style={S.highlight}>1 point</span> par tranche de 1 000 Ar dépensé sur les commandes non annulées.</Li>
            <Li><span style={S.highlight}>10 points</span> offerts pour chaque filleul inscrit via ton lien de parrainage — crédités après que le filleul ait dépensé 5 000 Ar.</Li>
            <Li>Les points sont informatifs, sans valeur monétaire directe à ce stade.</Li>
            <Li>VaRyGasy se réserve le droit de modifier les règles du programme avec un préavis de 15 jours.</Li>
          </ul>
        </Section>

        <Section title="8. Propriété intellectuelle">
          <p style={S.p}>
            L'ensemble du contenu du site (logo, textes, photos, design) est la propriété de VaRyGasy.
            Toute reproduction, même partielle, sans autorisation écrite est interdite.
          </p>
        </Section>

        <Section title="9. Responsabilité">
          <ul style={S.ul}>
            <Li>VaRyGasy ne peut être tenu responsable des retards de livraison causés par des événements indépendants de notre volonté (intempéries, grèves, coupures réseau).</Li>
            <Li>Nous ne sommes pas responsables d'un usage inapproprié des produits achetés.</Li>
            <Li>En cas de litige, nous privilégions toujours une résolution amiable via le support client.</Li>
          </ul>
        </Section>

        <Section title="10. Modification des CGU">
          <p style={S.p}>
            Nous pouvons mettre à jour ces conditions à tout moment. La date de dernière modification
            est indiquée en bas de page. La poursuite de l'utilisation du site après modification
            vaut acceptation des nouvelles conditions.
          </p>
          <p style={{ ...S.p, marginBottom: 0 }}>
            Pour toute question : <span style={S.highlight}>chat support</span> ou <span style={S.highlight}>WhatsApp</span> disponible 7j/7.
          </p>
        </Section>

        <p style={S.updated}>Dernière mise à jour : mai 2026 · VaRyGasy, Antananarivo, Madagascar</p>
      </div>
    </div>
  )
}