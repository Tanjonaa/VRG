import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/* Code-splitting : chaque espace est un chunk séparé — un visiteur du site
   vitrine ne télécharge jamais le code de l'admin ou de l'espace livreur */
const AdminApp    = lazy(() => import('./admin/AdminApp.jsx'))
const LivreurApp  = lazy(() => import('./livreur/LivreurApp.jsx'))
const PrivacyPage = lazy(() => import('./components/PrivacyPage.jsx'))
const CGUPage     = lazy(() => import('./components/CGUPage.jsx'))
const Shop        = lazy(() => import('./components/Shop.jsx'))

const fallback = <div style={{ height: '100dvh', background: '#07070f' }} />

const path = window.location.pathname
const isAdmin      = path.startsWith('/admin')
const isLivreur    = path.startsWith('/livreur')
const isPrivacy    = path.startsWith('/confidentialite')
const isCGU        = path.startsWith('/cgu')
/* /produit/:id ouvre le catalogue avec la fiche produit affichée (lien partageable) */
const isCatalogue  = path.startsWith('/catalogue') || path.startsWith('/produit/')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={fallback}>
      {isAdmin     ? <AdminApp />   :
       isLivreur   ? <LivreurApp /> :
       isPrivacy   ? <PrivacyPage />:
       isCGU       ? <CGUPage />    :
       isCatalogue ? <Shop />        :
       <App />}
    </Suspense>
  </React.StrictMode>,
)
