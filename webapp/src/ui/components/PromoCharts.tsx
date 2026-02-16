import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, ZAxis } from 'recharts'

export const DualLineCard: React.FC<{ title: string; data: any[]; xKey: string; y1: { key: string; color: string; name: string }; y2: { key: string; color: string; name: string } }> = ({ title, data, xKey, y1, y2 }) => (
  <div className="card">
    <div className="mb-2 font-semibold">{title}</div>
    <div className="w-full h-72">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="#eee" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey={y1.key} stroke={y1.color} name={y1.name} dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey={y2.key} stroke={y2.color} name={y2.name} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)

export const ScatterCard: React.FC<{ title: string; data: any[]; xKey: string; yKey: string; color?: string }> = ({ title, data, xKey, yKey, color = '#0ea5e9' }) => (
  <div className="card">
    <div className="mb-2 font-semibold">{title}</div>
    <div className="w-full h-72">
      <ResponsiveContainer>
        <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="#eee" />
          <XAxis dataKey={xKey} name={xKey} tick={{ fontSize: 12 }} />
          <YAxis dataKey={yKey} name={yKey} tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={color} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  </div>
)


