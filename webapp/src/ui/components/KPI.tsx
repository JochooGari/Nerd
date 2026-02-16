import React from 'react'

export interface KPIProps {
  label: string;
  value: string | number;
  icon?: string;
  change?: number;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
}

export const KPI: React.FC<KPIProps> = ({
  label,
  value,
  icon,
  change,
  unit = '',
  status = 'good'
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 bg-green-50'
    if (change < 0) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${getStatusColor(status)} border`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-sm font-medium text-gray-600">{label.toUpperCase()}</span>
        </div>
        {status !== 'good' && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status}
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>

      {change !== undefined && (
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getChangeColor(change)}`}>
          <span className="mr-1">
            {change > 0 ? '↗' : change < 0 ? '↘' : '→'}
          </span>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </div>
      )}
    </div>
  )
}


