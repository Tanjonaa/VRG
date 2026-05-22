import React from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 3,
        scaleX,
        transformOrigin: '0%',
        background: 'linear-gradient(90deg, #FFDD55, #FF9900, #CC5500)',
        zIndex: 9999,
      }}
    />
  )
}
