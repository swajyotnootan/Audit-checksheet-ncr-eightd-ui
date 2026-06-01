import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Print the current environment
// console.log('Current ENV:', import.meta.env.MODE)

// Print the API URL from env
// console.log('API_URL:', import.meta.env.VITE_API_URL)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
