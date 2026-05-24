import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import CartPanel from './components/CartPanel.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Marquee from './components/Marquee.jsx'
import Features from './components/Features.jsx'
import Products from './components/Products.jsx'
import Gallery from './components/Gallery.jsx'
import Pricing from './components/Pricing.jsx'
import Team from './components/Team.jsx'
import CTA from './components/CTA.jsx'
import Footer from './components/Footer.jsx'
import ScrollProgress from './components/ScrollProgress.jsx'
import AuthModal from './components/AuthModal.jsx'
import AccountPanel from './components/AccountPanel.jsx'

function AppInner() {
  const { user } = useAuth()
  const [showAuth, setShowAuth]       = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showCart, setShowCart]       = useState(false)

  const handleOpenAuth = () => {
    if (user) setShowAccount(true)
    else setShowAuth(true)
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
    setShowAccount(true)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <ScrollProgress />
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenAccount={() => setShowAccount(true)}
        onOpenCart={() => setShowCart(true)}
      />
      <main>
        <Hero />
        <Features />
        <Products />
        <Gallery />
        <Pricing />
        <Team />
        <CTA />
      </main>
      <Footer />
      <Marquee />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
      <AccountPanel
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
      />
      <CartPanel
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onOpenAuth={() => { setShowCart(false); setShowAuth(true) }}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppInner />
      </CartProvider>
    </AuthProvider>
  )
}
