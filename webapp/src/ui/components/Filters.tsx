import React, { useMemo } from 'react'
import { SiteDaily } from '../App'

export type FilterState = {
  site_id?: number
  from?: string
  to?: string
  version?: string
  compatibility?: string
}

export const Filters: React.FC<{ data: SiteDaily[]; value: FilterState; onChange: (v: FilterState) => void }> = ({ data, value, onChange }) => {
  const sites = useMemo(() => Array.from(new Set(data.map(d => d.site_id))).sort((a,b)=>a-b), [data])
  const versions = useMemo(() => Array.from(new Set(data.map(d => d.nglora_version || 'unknown'))).sort(), [data])
  const compat = useMemo(() => Array.from(new Set(data.map(d => d.compatibility_mode || 'unknown'))).sort(), [data])

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '12px 0' }}>
      <select value={value.site_id ?? ''} onChange={e => onChange({ ...value, site_id: e.target.value ? Number(e.target.value) : undefined })}>
        <option value=''>All sites</option>
        {sites.map(id => <option key={id} value={id}>{id}</option>)}
      </select>
      <input type="date" value={value.from || ''} onChange={e => onChange({ ...value, from: e.target.value || undefined })} />
      <input type="date" value={value.to || ''} onChange={e => onChange({ ...value, to: e.target.value || undefined })} />
      <select value={value.version ?? ''} onChange={e => onChange({ ...value, version: e.target.value || undefined })}>
        <option value=''>All versions</option>
        {versions.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <select value={value.compatibility ?? ''} onChange={e => onChange({ ...value, compatibility: e.target.value || undefined })}>
        <option value=''>All modes</option>
        {compat.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  )
}


