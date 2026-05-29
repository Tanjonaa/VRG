import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import LivreurApp from './livreur/LivreurApp.jsx'
import PrivacyPage from './components/PrivacyPage.jsx'
import CGUPage from './components/CGUPage.jsx'
import ShopDemo from './components/ShopDemo.jsx'
import './index.css'

const path = window.location.pathname
const isAdmin      = path.startsWith('/admin')
const isLivreur    = path.startsWith('/livreur')
const isPrivacy    = path.startsWith('/confidentialite')
const isCGU        = path.startsWith('/cgu')
const isCatalogue  = path.startsWith('/catalogue')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin     ? <AdminApp />   :
     isLivreur   ? <LivreurApp /> :
     isPrivacy   ? <PrivacyPage />:
     isCGU       ? <CGUPage />    :
     isCatalogue ? <ShopDemo />   :
     <App />}
  </React.StrictMode>,
)
