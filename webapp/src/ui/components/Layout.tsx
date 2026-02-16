import React, { useState } from 'react'

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    minHeight: '100vh',
    background: '#f8f9fa',
    color: '#0f172a'
  }}>
    {children}
  </div>
)

export const Header: React.FC<{ activeTab: string; onTabChange: (tab: string) => void }> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'summary', label: 'Summary', icon: '📊' },
    { id: 'monitoring', label: 'Monitoring', icon: '📈' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'devops', label: 'DevOps', icon: '⚙️' }
  ]

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">NERD - Technical Cockpit</h1>
                <p className="text-xs text-gray-500">Infrastructure Monitoring</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <select className="text-sm border border-gray-300 rounded-md px-2 py-1">
              <option>7d</option>
              <option>30d</option>
              <option>90d</option>
            </select>
            <div className="text-xs text-gray-500 ml-4">
              Last refresh: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
        <div className="flex space-x-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export const Section: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-6">
    {title && <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>}
    {children}
  </section>
)

export const Card: React.FC<{
  children: React.ReactNode;
  tone?: 'default' | 'warning' | 'danger';
  className?: string;
}> = ({ children, tone = 'default', className = '' }) => {
  const toneClasses = {
    default: 'bg-white border-gray-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200'
  }

  return (
    <div className={`${toneClasses[tone]} border rounded-lg p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}


