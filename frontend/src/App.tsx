import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState('Checking backend...')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error('Backend returned a non-200 response')
        }

        const data: { status: string } = await response.json()
        setApiStatus(`Backend status: ${data.status}`)
      } catch {
        setApiStatus('Backend not reachable. Start FastAPI server on port 8000.')
      }
    }

    void checkBackend()
  }, [])

  return (
    <>
      <h1>Hack Canada 2026</h1>
      <div className="card">
        <p>{apiStatus}</p>
        <p>
          Frontend is requesting <code>/api/health</code> via Vite proxy.
        </p>
      </div>
    </>
  )
}

export default App
