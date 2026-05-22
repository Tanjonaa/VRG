import React, { useEffect, useRef } from 'react'

export default function Particles({ count = 40 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let particles = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    class Particle {
      constructor() { this.reset(true) }
      reset(init = false) {
        this.x = Math.random() * canvas.width
        this.y = init ? Math.random() * canvas.height : canvas.height + 10
        this.size = Math.random() * 2 + 0.5
        this.speedY = Math.random() * 0.6 + 0.2
        this.speedX = (Math.random() - 0.5) * 0.3
        this.opacity = Math.random() * 0.5 + 0.1
        this.hue = Math.random() > 0.6 ? 43 : 270  // gold or purple
      }
      update() {
        this.y -= this.speedY
        this.x += this.speedX
        if (this.y < -10) this.reset()
      }
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${this.opacity})`
        ctx.fill()
      }
    }

    for (let i = 0; i < count; i++) particles.push(new Particle())

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => { p.update(); p.draw() })
      animId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  )
}
