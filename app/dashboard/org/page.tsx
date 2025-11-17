"use client"
import { useEffect, useState } from 'react'

type Org = { id: string; name: string; slug: string }

export default function OrgPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [current, setCurrent] = useState<Org | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  async function load() {
    const [listRes, curRes] = await Promise.all([
      fetch('/api/organizations'),
      fetch('/api/organizations/current')
    ])
    setOrgs(await listRes.json())
    const cur = await curRes.json()
    setCurrent(cur.organization)
  }

  useEffect(() => { load() }, [])

  async function createOrg() {
    const res = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, slug }) })
    if (res.ok) {
      setName(''); setSlug(''); await load()
    }
  }

  async function switchOrg(id: string) {
    const res = await fetch('/api/organizations/current', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organization</h1>
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Current: {current ? `${current.name} (${current.slug})` : 'None'}</p>
        <div className="flex flex-wrap gap-2">
          {orgs.map((o) => (
            <button key={o.id} className="btn" onClick={() => switchOrg(o.id)} disabled={current?.id === o.id}>
              Switch to {o.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-medium">Create Organization</h2>
        <div className="grid max-w-md gap-2">
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <button className="btn" onClick={createOrg} disabled={!name || !slug}>Create</button>
        </div>
      </div>
    </div>
  )
}

