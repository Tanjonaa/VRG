import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import LivreurApp from './livreur/LivreurApp.jsx'
import './index.css'

const path = window.location.pathname
const isAdmin   = path.startsWith('/admin')
const isLivreur = path.startsWith('/livreur')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminApp /> : isLivreur ? <LivreurApp /> : <App />}
  </React.StrictMode>,
)
