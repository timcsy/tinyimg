import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './app.css'

const target = document.getElementById('app')
if (!target) throw new Error('找不到 #app')
createRoot(target).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
