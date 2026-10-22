import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo'
import '@fontsource-variable/inter'
import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/slides.css'
import App from './App.jsx'
import { registerOffline } from './lib/offline'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerOffline()
