import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppwriteProvider } from '@src/packages/appwrite-client'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppwriteProvider>
      <App />
    </AppwriteProvider>
  </StrictMode>,
)
