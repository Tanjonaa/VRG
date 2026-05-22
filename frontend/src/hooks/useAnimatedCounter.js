import { useEffect, useRef, useState } from 'react'

export default function useAnimatedCounter(target, duration = 1800, inView = false) {
  const [value, setValue] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!inView) return
    const isNumeric = typeof target === 'number'
    if (!isNumeric) { setValue(target); return }

    startRef.current = performance.now()
    const animate = (now) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inView, target, duration])

  return value
}
