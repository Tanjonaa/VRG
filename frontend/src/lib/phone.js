/* Numéros malgaches : normalisation + validation (miroir du backend).
   Accepte « 034 12 345 67 », « +261 34 12 345 67 », « 00261341234567 »…
   Retourne la forme locale 10 chiffres (0341234567), ou null si invalide.
   Préfixes attribués : 032 Orange · 033 Airtel · 034/037/038 Telma-Yas */
export function normalizeMgPhone(raw) {
  if (!raw) return null
  let p = String(raw).replace(/[\s.\-()]/g, '')
  if (p.startsWith('+261'))                        p = '0' + p.slice(4)
  else if (p.startsWith('00261'))                  p = '0' + p.slice(5)
  else if (p.startsWith('261') && p.length === 12) p = '0' + p.slice(3)
  return /^0(32|33|34|37|38)\d{7}$/.test(p) ? p : null
}

export const isValidMgPhone = (raw) => normalizeMgPhone(raw) !== null

export const MG_PHONE_HINT = 'Numéro malgache : 03X XX XXX XX (032, 033, 034, 037 ou 038)'
