/* Live vidéo : transforme le lien collé dans l'admin en lecteur intégrable.
   - YouTube : vidéo, live, shorts ou chaîne (/channel/UC…/live)
   - Facebook : vidéo ou live (plugin vidéo officiel)
   - TikTok : les lives ne sont pas intégrables (pas d'embed officiel) → lien
     uniquement ; les vidéos TikTok classiques, elles, s'intègrent.
   Retourne null si le lien n'est pas une URL http(s) valide. */

const PLATFORM_LABEL = { youtube: 'YouTube', facebook: 'Facebook', tiktok: 'TikTok', other: 'le site du live' }
export const platformLabel = p => PLATFORM_LABEL[p] || PLATFORM_LABEL.other

export function parseLiveUrl(raw) {
  const str = String(raw || '').trim()
  if (!str) return null
  let u
  try { u = new URL(/^https?:\/\//i.test(str) ? str : `https://${str}`) } catch { return null }
  if (!/^https?:$/.test(u.protocol)) return null

  const host = u.hostname.replace(/^(www|m|mobile|web)\./, '')
  const link = u.href

  /* ── YouTube ── */
  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const parts = u.pathname.split('/').filter(Boolean)
    let id = null
    if (host === 'youtu.be') id = parts[0]
    else if (u.searchParams.get('v')) id = u.searchParams.get('v')
    else if (['live', 'shorts', 'embed'].includes(parts[0])) id = parts[1]

    const params = 'autoplay=1&mute=1&playsinline=1&rel=0'
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return { platform: 'youtube', link, vertical: parts[0] === 'shorts',
        embed: `https://www.youtube-nocookie.com/embed/${id}?${params}` }
    }
    /* Lien de chaîne : youtube.com/channel/UC…/live → live en cours de la chaîne */
    if (parts[0] === 'channel' && /^UC[\w-]{10,}$/.test(parts[1] || '')) {
      return { platform: 'youtube', link, vertical: false,
        embed: `https://www.youtube.com/embed/live_stream?channel=${parts[1]}&${params}` }
    }
    return { platform: 'youtube', link, embed: null }
  }

  /* ── Facebook ── */
  if (host.endsWith('facebook.com') || host === 'fb.watch' || host === 'fb.com') {
    const isVideo = host === 'fb.watch' || /\/(videos|watch|live|reel)\b|\/share\/v\//.test(u.pathname) || u.searchParams.has('v')
    if (!isVideo) return { platform: 'facebook', link, embed: null }
    return { platform: 'facebook', link, vertical: /\/reel\b/.test(u.pathname),
      embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=false&autoplay=1&mute=1` }
  }

  /* ── TikTok ── */
  if (host.endsWith('tiktok.com')) {
    const m = u.pathname.match(/\/video\/(\d+)/)
    if (m) return { platform: 'tiktok', link, vertical: true, embed: `https://www.tiktok.com/embed/v2/${m[1]}` }
    return { platform: 'tiktok', link, embed: null }   // live TikTok : ouverture dans l'app
  }

  return { platform: 'other', link, embed: null }
}

/* Live affiché sur la boutique ? (interrupteur admin + lien exploitable) */
export function liveFromSettings(settings) {
  if (settings?.live_active !== '1') return null
  return parseLiveUrl(settings.live_url)
}
