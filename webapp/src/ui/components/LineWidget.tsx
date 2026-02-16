import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export const LineWidget: React.FC<{ title: string; data: any[]; xKey: string; yKey: string; color?: string }> = ({ title, data, xKey, yKey, color = '#334155' }) => {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>{title}</div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="#eee" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


