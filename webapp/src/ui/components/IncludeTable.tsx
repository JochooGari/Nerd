import React, { useMemo, useState } from 'react'
import { IncludeDaily } from '../App'

export const IncludeTable: React.FC<{ rows: IncludeDaily[] }> = ({ rows }) => {
  const [sort, setSort] = useState<{ key: keyof IncludeDaily; dir: 'asc' | 'desc' }>({ key: 'total_requests', dir: 'desc' })

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a,b) => {
      const va = (a[sort.key] as any) ?? ''
      const vb = (b[sort.key] as any) ?? ''
      if (va === vb) return 0
      const res = va > vb ? 1 : -1
      return sort.dir === 'asc' ? res : -res
    })
    return copy
  }, [rows, sort])

  const getStatusColor = (responseTime: number) => {
    if (responseTime <= 100) return 'text-green-600 bg-green-50'
    if (responseTime <= 300) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getStatusIcon = (responseTime: number) => {
    if (responseTime <= 100) return '🟢'
    if (responseTime <= 300) return '🟡'
    return '🔴'
  }

  const header = (key: keyof IncludeDaily, label: string) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sort.key === key && (
          <span className="text-gray-400">
            {sort.dir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {header('controller_name', 'Controller Name')}
              {header('total_requests', 'Requests Count')}
              {header('percent_of_main_requests', '% of Main')}
              {header('avg_response_time_ms', 'Response Time')}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((r, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {r.controller_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                  {(r.total_requests as any)?.toLocaleString?.() || '0'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {r.percent_of_main_requests ? (r.percent_of_main_requests * 100).toFixed(1) : '0.0'}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">{Math.round(r.avg_response_time_ms || 0)}ms</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.avg_response_time_ms || 0)}`}>
                      {r.avg_response_time_ms <= 100 ? 'Excellent' : r.avg_response_time_ms <= 300 ? 'Good' : 'Slow'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="text-lg">{getStatusIcon(r.avg_response_time_ms || 0)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-2xl mb-2 block">📊</span>
          <p>No controller data available</p>
        </div>
      )}
    </div>
  )
}
