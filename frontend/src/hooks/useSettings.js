import { useState, useEffect } from 'react'

// Cache module-level : un seul fetch pour toute la page
let _cache = null
let _promise = null

export function useSettings() {
  const [settings, setSettings] = useState(_cache || {})

  useEffect(() => {
    if (_cache) { setSettings(_cache); return }
    if (!_promise) {
      _promise = fetch('/api/settings')
        .then(r => r.json())
        .then(data => { _cache = data; return data })
        .catch(() => ({}))
    }
    _promise.then(data => setSettings(data))
  }, [])

  return settings
}