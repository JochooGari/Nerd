import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { KPI } from './components/KPI'
import { LineWidget } from './components/LineWidget'
import { IncludeTable } from './components/IncludeTable'
import { Filters, FilterState } from './components/Filters'
import { Page, Section, Card, Header } from './components/Layout'
import { DualLineCard, ScatterCard } from './components/PromoCharts'

export type SiteDaily = {
  site_id: number
  request_date: string
  total_requests: number
  total_response_time_ms: number
  avg_response_time_ms: number
  cache_hit_requests: number
  cache_hit_rate: number
  error_requests: number
  error_rate: number
  nglora_version?: string
  compatibility_mode?: string
}

export type IncludeDaily = {
  site_id: number
  request_date: string
  main_controller_name: string
  controller_name: string
  total_requests: number
  total_requests_main?: number
  percent_of_main_requests?: number
  avg_response_time_ms: number
}

export type PromoDaily = {
  site_id: number
  date: string
  promotions_active: number
  distinct_coupons: number
  coupon_uses: number
}

export type PromoPerfSim = {
  site_id: number
  request_date: string
  promotions_active: number
  sim_cart_latency_ms: number
  sim_checkout_latency_ms: number
}

async function fetchCsv(path: string): Promise<string> {
  const tries = [path, path.startsWith('/') ? path.slice(1) : `/${path}`]
  for (const p of tries) {
    try {
      const res = await fetch(p, { cache: 'no-store' })
      if (res.ok) return await res.text()
    } catch {}
  }
  throw new Error(`CSV not found at ${tries.join(' or ')}`)
}

function useCsv<T = any>(path: string, cast: (row: any) => T): { data: T[]; loading: boolean; error?: string } {
  const [state, setState] = useState<{ data: T[]; loading: boolean; error?: string }>({ data: [], loading: true })
  useEffect(() => {
    let cancelled = false
    setState({ data: [], loading: true })
    fetchCsv(path)
      .then(text => new Promise<any>((resolve, reject) => {
        Papa.parse(text, { header: true, skipEmptyLines: true, complete: r => resolve(r.data), error: reject })
      }))
      .then(rows => {
        if (cancelled) return
        const data = (rows as any[]).map(cast)
        setState({ data, loading: false })
      })
      .catch(err => setState({ data: [], loading: false, error: err?.message || 'parse error' }))
    return () => { cancelled = true }
  }, [path])
  return state
}

function parseNumber(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary')

  const { data: siteDaily, loading: ld1, error: e1 } = useCsv<SiteDaily>(
    'data/fact_site_daily.csv',
    (r) => ({
      site_id: parseNumber(r.site_id),
      request_date: r.request_date,
      total_requests: parseNumber(r.total_requests),
      total_response_time_ms: parseNumber(r.total_response_time_ms),
      avg_response_time_ms: parseNumber(r.avg_response_time_ms),
      cache_hit_requests: parseNumber(r.cache_hit_requests),
      cache_hit_rate: parseNumber(r.cache_hit_rate),
      error_requests: parseNumber(r.error_requests),
      error_rate: parseNumber(r.error_rate),
      nglora_version: r.nglora_version || 'unknown',
      compatibility_mode: r.compatibility_mode || 'unknown'
    })
  )
  const { data: includeDaily, loading: ld2, error: e2 } = useCsv<IncludeDaily>(
    'data/fact_include_controller_daily.csv',
    (r) => ({
      site_id: parseNumber(r.site_id),
      request_date: r.request_date,
      main_controller_name: r.main_controller_name,
      controller_name: r.controller_name,
      total_requests: parseNumber(r.total_requests),
      total_requests_main: parseNumber(r.total_requests_main),
      percent_of_main_requests: parseNumber(r.percent_of_main_requests),
      avg_response_time_ms: parseNumber(r.avg_response_time_ms)
    })
  )
  const { data: promoDaily } = useCsv<PromoDaily>(
    'data/fact_promo_daily.csv',
    (r) => ({
      site_id: parseNumber(r.site_id),
      date: r.date,
      promotions_active: parseNumber(r.promotions_active),
      distinct_coupons: parseNumber(r.distinct_coupons),
      coupon_uses: parseNumber(r.coupon_uses)
    })
  )
  const { data: promoSim } = useCsv<PromoPerfSim>(
    'data/fact_promo_perf_sim.csv',
    (r) => ({
      site_id: parseNumber(r.site_id),
      request_date: r.request_date,
      promotions_active: parseNumber(r.promotions_active),
      sim_cart_latency_ms: parseNumber(r.sim_cart_latency_ms),
      sim_checkout_latency_ms: parseNumber(r.sim_checkout_latency_ms)
    })
  )

  const [filters, setFilters] = useState<FilterState>({})

  const filteredSite = useMemo(() => {
    return siteDaily.filter(r => {
      if (filters.site_id && r.site_id !== filters.site_id) return false
      if (filters.version && r.nglora_version !== filters.version) return false
      if (filters.compatibility && r.compatibility_mode !== filters.compatibility) return false
      if (filters.from && r.request_date < filters.from) return false
      if (filters.to && r.request_date > filters.to) return false
      return true
    })
  }, [siteDaily, filters])

  const filteredInclude = useMemo(() => {
    return includeDaily.filter(r => {
      if (filters.site_id && r.site_id !== filters.site_id) return false
      if (filters.from && r.request_date < filters.from) return false
      if (filters.to && r.request_date > filters.to) return false
      return true
    })
  }, [includeDaily, filters])

  const filteredPromo = useMemo(() => {
    return promoDaily.filter(r => {
      if (filters.site_id && r.site_id !== filters.site_id) return false
      if (filters.from && r.date < filters.from) return false
      if (filters.to && r.date > filters.to) return false
      return true
    })
  }, [promoDaily, filters])

  const filteredSim = useMemo(() => {
    return promoSim.filter(r => {
      if (filters.site_id && r.site_id !== filters.site_id) return false
      if (filters.from && r.request_date < filters.from) return false
      if (filters.to && r.request_date > filters.to) return false
      return true
    })
  }, [promoSim, filters])

  const kpis = useMemo(() => {
    const totalReq = filteredSite.reduce((a,b) => a + b.total_requests, 0)
    const totalRt = filteredSite.reduce((a,b) => a + b.total_response_time_ms, 0)
    const avgRt = totalReq ? totalRt / totalReq : 0
    const cacheReq = filteredSite.reduce((a,b) => a + b.cache_hit_requests, 0)
    const errReq = filteredSite.reduce((a,b) => a + b.error_requests, 0)
    return {
      requests: totalReq,
      avgResponse: Math.round(avgRt),
      cacheHit: totalReq ? (cacheReq / totalReq) * 100 : 0,
      errorRate: totalReq ? (errReq / totalReq) * 100 : 0,
    }
  }, [filteredSite])

  const trend = useMemo(() => {
    const byDate = new Map<string, { date: string; requests: number; avgMs: number; cache: number }>()
    for (const r of filteredSite) {
      const m = byDate.get(r.request_date) || { date: r.request_date, requests: 0, avgMs: 0, cache: 0 }
      m.requests += r.total_requests
      m.avgMs += r.total_response_time_ms
      m.cache += r.cache_hit_requests
      byDate.set(r.request_date, m)
    }
    return Array.from(byDate.values()).map(d => ({
      date: d.date,
      requests: d.requests,
      avg_ms: d.requests ? Math.round(d.avgMs / d.requests) : 0,
      cache_rate: d.requests ? Math.round((d.cache / d.requests) * 1000) / 10 : 0,
    })).sort((a,b) => a.date.localeCompare(b.date))
  }, [filteredSite])

  const includeForProductShow = useMemo(() =>
    filteredInclude.filter(r => (r.main_controller_name || '').toUpperCase() === 'PRODUCT-SHOW'),
  [filteredInclude])

  // Promo series
  const promoTime = useMemo(() => {
    const byDate = new Map<string, { date: string; promotions_active: number; coupons: number }>()
    for (const r of filteredPromo) {
      const m = byDate.get(r.date) || { date: r.date, promotions_active: 0, coupons: 0 }
      m.promotions_active += r.promotions_active
      m.coupons += r.distinct_coupons
      byDate.set(r.date, m)
    }
    return Array.from(byDate.values()).sort((a,b)=>a.date.localeCompare(b.date))
  }, [filteredPromo])

  const scatterCart = useMemo(() => filteredSim.map(d => ({ promotions_active: d.promotions_active, latency: d.sim_cart_latency_ms })), [filteredSim])
  const scatterCheckout = useMemo(() => filteredSim.map(d => ({ promotions_active: d.promotions_active, latency: d.sim_checkout_latency_ms })), [filteredSim])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">🌐</span>
                      <span className="text-sm font-medium text-gray-600">UP-TO-DATE ENVIRONMENTS</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">87%</div>
                    <div className="text-sm text-gray-500">Score based on versions, Compatibility Mode (Dashboard) and Netlore Version (combined)</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Europe - Excellent</span>
                    <span className="text-sm font-medium">94.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">NA SAPENDA - Good</span>
                    <span className="text-sm font-medium">83.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Asia - Excellent</span>
                    <span className="text-sm font-medium">91.8%</span>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">⚡</span>
                      <span className="text-sm font-medium text-gray-600">BEST PRACTICES SCORE</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">87%</div>
                    <div className="text-sm text-gray-500">Calculated from performance and security scores</div>
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">● Energie</span>
                    <span>92%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-500">● NA SAPENDA</span>
                    <span>83%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">● Asia</span>
                    <span>90%</span>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">💰</span>
                      <span className="text-sm font-medium text-gray-600">CREDITS USED</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">72.4%</div>
                    <div className="text-sm text-gray-500">Projection rate: 250%</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Europe</span>
                    <span className="text-sm font-medium text-green-600">68% → 1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">NA SAPENDA</span>
                    <span className="text-sm font-medium text-orange-500">77% → 18%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Asia</span>
                    <span className="text-sm font-medium text-green-600">78% → 6%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )

      case 'monitoring':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPI
                label="Disponibilité"
                value="87%"
                icon="🟢"
                status="good"
                change={2.5}
              />
              <KPI
                label="Performance"
                value="130.6ms"
                icon="⚡"
                unit="ms"
                status="warning"
                change={-10}
              />
              <KPI
                label="Best Practices"
                value="85%"
                icon="🎯"
                status="good"
                change={5.2}
              />
              <KPI
                label="Controllers"
                value="47"
                icon="🔧"
                status="good"
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <LineWidget title="Requests Over Time" data={trend} xKey="date" yKey="requests" />
              <LineWidget title="Average Response Time (ms)" data={trend} xKey="date" yKey="avg_ms" color="#f59e0b" />
              <LineWidget title="Cache Hit Rate (%)" data={trend} xKey="date" yKey="cache_rate" color="#10b981" />
            </div>
          </div>
        )

      case 'performance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPI
                label="Response Time"
                value="118.9ms"
                icon="⏱️"
                unit="ms"
                status="warning"
                change={-10}
              />
              <KPI
                label="Cache Efficiency"
                value="35.38%"
                icon="💾"
                unit="%"
                status="warning"
                change={-2.1}
              />
              <KPI
                label="Request Volume"
                value="4,675,599"
                icon="📊"
                status="good"
                change={15}
              />
              <KPI
                label="Content Load"
                value="95 promotions"
                icon="🎯"
                status="good"
                change={3}
              />
            </div>

            <Section title="Controllers Performance">
              <IncludeTable rows={includeForProductShow} />
            </Section>

            <Section title="Weekly Trends Analysis">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold mb-4">Evolution métriques (7 jours)</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Resp. Time (ms)</span>
                      <span className="text-sm font-mono">120 → 115 → 125 → 119 → 118 → 118 → 105</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cache Hit %</span>
                      <span className="text-sm font-mono">34 → 36 → 35 → 33 → 35 → 38 → 46</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Requests/h (%)</span>
                      <span className="text-sm font-mono">195 → 203 → 189 → 195 → 218 → 165 → 145</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold mb-4">Cache Analysis Table</h3>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-4 font-medium border-b pb-2">
                      <span>Controller</span>
                      <span>Hit Rate</span>
                      <span>Volume</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span>Analytics</span>
                      <span className="text-green-600">100%</span>
                      <span>449K</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span>Page-Resources</span>
                      <span className="text-green-600">97%</span>
                      <span>533K</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span>CookiesGet</span>
                      <span className="text-green-600">100%</span>
                      <span>229K</span>
                    </div>
                  </div>
                </Card>
              </div>
            </Section>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPI
                label="Security Score"
                value="92%"
                icon="🔒"
                status="good"
                change={1.2}
              />
              <KPI
                label="Non-2xx Errors"
                value="3.7%"
                icon="⚠️"
                unit="%"
                status="warning"
                change={0.5}
              />
              <KPI
                label="Vulnerabilities"
                value="0"
                icon="🛡️"
                status="good"
              />
              <KPI
                label="SSL Rating"
                value="A+"
                icon="🔐"
                status="good"
              />
            </div>
          </div>
        )

      case 'devops':
        return (
          <div className="space-y-6">
            <Section title="Environment Status">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <h3 className="text-lg font-semibold mb-2">DEV</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">v77.4.0 - OK</span>
                  </div>
                </Card>
                <Card>
                  <h3 className="text-lg font-semibold mb-2">QA</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">v77.3.0 - OLD</span>
                  </div>
                </Card>
                <Card>
                  <h3 className="text-lg font-semibold mb-2">PRO</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">v77.4.0 - OK</span>
                  </div>
                </Card>
              </div>
            </Section>

            <Section title="Promotions & Performance">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DualLineCard
                  title="Promotions actives vs Distinct coupons"
                  data={promoTime}
                  xKey="date"
                  y1={{ key: 'promotions_active', color: '#111827', name: 'Promotions actives' }}
                  y2={{ key: 'coupons', color: '#6b7280', name: 'Coupons distincts' }}
                />
                <ScatterCard title="Promotions vs Latence Panier (simulé)" data={scatterCart} xKey="promotions_active" yKey="latency" />
              </div>
            </Section>
          </div>
        )

      default:
        return <div>Tab content not implemented</div>
    }
  }

  return (
    <Page>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Filters data={siteDaily} value={filters} onChange={setFilters} />

        {(ld1 || ld2) && (
          <Card tone="warning" className="mb-6">
            <div>Chargement des données…</div>
          </Card>
        )}

        {(e1 || e2) && (
          <Card tone="danger" className="mb-6">
            <div>Erreur chargement CSV: {e1 || e2}</div>
          </Card>
        )}

        {renderTabContent()}
      </div>
    </Page>
  )
}
