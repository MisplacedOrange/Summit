import { useEffect, useState } from 'react'
import './App.css'

type VolunteerOrg = {
  name: string
  url: string
  description: string
}

type ApiResponse = {
  query: string
  count: number
  source: string
  items: VolunteerOrg[]
}

function App() {
  const [apiStatus, setApiStatus] = useState('Checking backend...')
  const [orgs, setOrgs] = useState<VolunteerOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [healthResponse, orgsResponse] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/volunteer-organizations?limit=12'),
        ])

        if (!healthResponse.ok || !orgsResponse.ok) {
          throw new Error('Backend returned a non-200 response')
        }

        const healthData: { status: string } = await healthResponse.json()
        const orgData: ApiResponse = await orgsResponse.json()

        setApiStatus(`Backend status: ${healthData.status}`)
        setOrgs(orgData.items)
      } catch (err) {
        setApiStatus('Backend not reachable. Start FastAPI server on port 8000.')
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  return (
    <main>
      <h1>Summit</h1>
      <div className="card">
        <p>{apiStatus}</p>
        <p>
          Showing businesses and organizations discovered from public volunteer-related web results.
        </p>
      </div>

      {loading && <p>Loading volunteer-friendly organizations...</p>}
      {error && !loading && <p className="error">Could not fetch data: {error}</p>}

      {!loading && !error && (
        <section className="results-grid">
          {orgs.map((org) => (
            <article key={org.url} className="result-card">
              <h2>{org.name}</h2>
              <p>{org.description}</p>
              <a href={org.url} target="_blank" rel="noreferrer">
                Visit website
              </a>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default App
