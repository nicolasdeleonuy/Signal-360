import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Bar
} from 'recharts';

// TypeScript interfaces for component props and data structures
export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
  benchmark?: number;
  [key: string]: any; // Allow additional properties for flexibility
}

export interface ChartColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  grid: string;
  text: string;
}

export interface AnalysisChartProps {
  data: ChartDataPoint[];
  chartType: 'line' | 'bar' | 'composed';
  title?: string;
  height?: number;
  colors?: ChartColorScheme;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
}

// Placeholder data structures for different chart types
const PLACEHOLDER_DATA = {
  line: [
    { name: 'Jan', value: 65, benchmark: 60 },
    { name: 'Feb', value: 72, benchmark: 65 },
    { name: 'Mar', value: 68, benchmark: 70 },
    { name: 'Apr', value: 85, benchmark: 75 },
    { name: 'May', value: 92, benchmark: 80 },
    { name: 'Jun', value: 88, benchmark: 82 }
  ] as ChartDataPoint[],
  
  bar: [
    { name: 'Valuation', value: 75, benchmark: 65, category: 'fundamental' },
    { name: 'Growth', value: 85, benchmark: 70, category: 'fundamental' },
    { name: 'Profitability', value: 68, benchmark: 75, category: 'fundamental' },
    { name: 'Leverage', value: 55, benchmark: 60, category: 'fundamental' },
    { name: 'Quality', value: 78, benchmark: 72, category: 'fundamental' }
  ] as ChartDataPoint[],
  
  composed: [
    { name: 'Q1', value: 150, price: 150, volume: 1200, rsi: 65, benchmark: 145 },
    { name: 'Q2', value: 165, price: 165, volume: 1500, rsi: 72, benchmark: 160 },
    { name: 'Q3', value: 142, price: 142, volume: 980, rsi: 45, benchmark: 148 },
    { name: 'Q4', value: 178, price: 178, volume: 1800, rsi: 78, benchmark: 170 },
    { name: 'Q5', value: 185, price: 185, volume: 2100, rsi: 82, benchmark: 175 }
  ] as ChartDataPoint[]
};

// Default color scheme using Tailwind CSS color palette
const DEFAULT_COLOR_SCHEME: ChartColorScheme = {
  primary: '#3B82F6',    // blue-500
  secondary: '#10B981',  // emerald-500
  accent: '#F59E0B',     // amber-500
  grid: '#E5E7EB',       // gray-200
  text: '#374151'        // gray-700
};

// Basic component structure
const AnalysisChart: React.FC<AnalysisChartProps> = ({
  data,
  chartType,
  title,
  height = 400,
  colors,
  showLegend = true,
  showTooltip = true,
  showGrid = true
}) => {
  // Use placeholder data if no data is provided or for demonstration
  const chartData = data.length > 0 ? data : PLACEHOLDER_DATA[chartType];
  
  // Merge provided colors with default color scheme
  const colorScheme = { ...DEFAULT_COLOR_SCHEME, ...colors };
  
  return (
    <div 
      className="w-full min-w-0" 
      role="img" 
      aria-label={title ? `${title} chart` : `${chartType} chart`}
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {title && (
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 px-1 truncate" style={{ color: colorScheme.text }}>
          {title}
        </h3>
      )}
      <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md" style={{ borderColor: colorScheme.grid }}>
        <ResponsiveContainer
          width="100%"
          height={height}
          minHeight={280}
          debounce={50}
        >
          {(() => {
            switch (chartType) {
              case 'line':
                return (
                  <LineChart 
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    aria-label={`Line chart showing ${chartData.length} data points`}
                  >
                    {/* Common chart elements */}
                    {showGrid && (
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={colorScheme.grid}
                        strokeOpacity={0.6}
                        horizontal={true}
                        vertical={false}
                      />
                    )}
                    <XAxis 
                      dataKey="name"
                      axisLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tickLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tick={{ 
                        fill: colorScheme.text, 
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                      tickMargin={8}
                      height={60}
                    />
                    <YAxis 
                      axisLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tickLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tick={{ 
                        fill: colorScheme.text, 
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                      tickMargin={8}
                      width={60}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    {showTooltip && (
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: `1px solid ${colorScheme.grid}`,
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          fontSize: '13px',
                          fontWeight: 500,
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          padding: '12px',
                          minWidth: '120px'
                        }}
                        labelStyle={{
                          color: colorScheme.text,
                          fontWeight: 600,
                          marginBottom: '6px',
                          fontSize: '14px'
                        }}
                        itemStyle={{
                          color: colorScheme.text,
                          fontSize: '13px',
                          fontWeight: 500,
                          padding: '2px 0'
                        }}
                        formatter={(value: any, name: string) => [
                          typeof value === 'number' ? value.toFixed(1) : value,
                          name === 'value' ? 'Value' : name === 'benchmark' ? 'Benchmark' : name
                        ]}
                        labelFormatter={(label) => `Period: ${label}`}
                        cursor={{ stroke: colorScheme.primary, strokeWidth: 1, strokeOpacity: 0.5 }}
                      />
                    )}
                    {showLegend && (
                      <Legend 
                        verticalAlign="top"
                        height={40}
                        iconType="line"
                        wrapperStyle={{
                          paddingBottom: '16px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: colorScheme.text,
                          fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                        formatter={(value: string) => 
                          value === 'value' ? 'Value' : value === 'benchmark' ? 'Benchmark' : value
                        }
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={colorScheme.primary} 
                      strokeWidth={3}
                      dot={{ 
                        fill: colorScheme.primary, 
                        strokeWidth: 2, 
                        r: 5,
                        fillOpacity: 0.9,
                        stroke: 'white'
                      }}
                      activeDot={{ 
                        r: 7, 
                        stroke: colorScheme.primary, 
                        strokeWidth: 3,
                        fill: 'white',
                        fillOpacity: 1
                      }}
                      animationDuration={1500}
                      animationEasing="ease-in-out"
                      connectNulls={false}
                    />
                    {chartData[0]?.benchmark !== undefined && (
                      <Line 
                        type="monotone" 
                        dataKey="benchmark" 
                        stroke={colorScheme.secondary} 
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        dot={{ 
                          fill: colorScheme.secondary, 
                          strokeWidth: 1, 
                          r: 4,
                          fillOpacity: 0.8,
                          stroke: 'white'
                        }}
                        activeDot={{ 
                          r: 6, 
                          stroke: colorScheme.secondary, 
                          strokeWidth: 2,
                          fill: 'white',
                          fillOpacity: 1
                        }}
                        animationDuration={1800}
                        animationEasing="ease-in-out"
                        connectNulls={false}
                      />
                    )}
                  </LineChart>
                );
              
              case 'bar':
                return (
                  <BarChart 
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    aria-label={`Bar chart showing ${chartData.length} categories`}
                  >
                    {/* Common chart elements */}
                    {showGrid && (
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={colorScheme.grid}
                        strokeOpacity={0.6}
                        horizontal={true}
                        vertical={false}
                      />
                    )}
                    <XAxis 
                      dataKey="name"
                      axisLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tickLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tick={{ 
                        fill: colorScheme.text, 
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                      tickMargin={8}
                      height={60}
                      interval={0}
                    />
                    <YAxis 
                      axisLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tickLine={{ stroke: colorScheme.text, strokeWidth: 1 }}
                      tick={{ 
                        fill: colorScheme.text, 
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                      tickMargin={8}
                      width={60}
                      domain={[0, 'dataMax + 10']}
                    />
                    {showTooltip && (
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: `1px solid ${colorScheme.grid}`,
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          fontSize: '13px',
                          fontWeight: 500,
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          padding: '12px',
                          minWidth: '120px'
                        }}
                        labelStyle={{
                          color: colorScheme.text,
                          fontWeight: 600,
                          marginBottom: '6px',
                          fontSize: '14px'
                        }}
                        itemStyle={{
                          color: colorScheme.text,
                          fontSize: '13px',
                          fontWeight: 500,
                          padding: '2px 0'
                        }}
                        formatter={(value: any, name: string) => [
                          typeof value === 'number' ? value.toFixed(1) : value,
                          name === 'value' ? 'Value' : name === 'benchmark' ? 'Benchmark' : name
                        ]}
                        labelFormatter={(label) => `Category: ${label}`}
                        cursor={{ fill: colorScheme.grid, fillOpacity: 0.3 }}
                      />
                    )}
                    {showLegend && (
                      <Legend 
                        verticalAlign="top"
                        height={40}
                        iconType="rect"
                        wrapperStyle={{
                          paddingBottom: '16px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: colorScheme.text,
                          fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                        formatter={(value: string) => 
                          value === 'value' ? 'Value' : value === 'benchmark' ? 'Benchmark' : value
                        }
                      />
                    )}
                    <Bar 
                      dataKey="value" 
                      fill={colorScheme.primary}
                      radius={[4, 4, 0, 0]}
                      stroke={colorScheme.primary}
                      strokeWidth={0}
                      fillOpacity={0.9}
                    />
                    {chartData[0]?.benchmark !== undefined && (
                      <Bar 
                        dataKey="benchmark" 
                        fill={colorScheme.secondary}
                        radius={[4, 4, 0, 0]}
                        stroke={colorScheme.secondary}
                        strokeWidth={0}
                        fillOpacity={0.8}
                      />
                    )}
                  </BarChart>
                );
              
              case 'composed':
                return (
                  <div 
                    className="flex items-center justify-center h-full text-gray-500"
                    role="status"
                    aria-label="Composed chart placeholder"
                  >
                    <div className="text-center max-w-lg px-4">
                      <div className="mb-4">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center">
                          <svg 
                            className="w-8 h-8 text-blue-600" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                            />
                          </svg>
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold mb-2" style={{ color: colorScheme.text }}>
                        Composed Chart
                      </h4>
                      <p className="text-sm mb-3 text-gray-600">
                        Advanced visualization combining multiple chart types
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Will feature Line and Bar components with dual Y-axes for comprehensive data analysis
                      </p>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                        <p className="font-medium text-sm mb-2" style={{ color: colorScheme.text }}>
                          Sample Data Structure:
                        </p>
                        <div className="bg-white rounded border p-3 text-xs font-mono overflow-x-auto">
                          <pre className="text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(chartData[0], null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              
              default:
                return (
                  <div 
                    className="flex items-center justify-center h-full"
                    role="alert"
                    aria-label="Chart type error"
                  >
                    <div className="text-center max-w-md px-4">
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <svg 
                          className="w-8 h-8 text-red-600" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold mb-2 text-red-700">
                        Invalid Chart Type
                      </h4>
                      <p className="text-sm text-red-600 mb-3">
                        The specified chart type "{chartType}" is not supported.
                      </p>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-red-800 mb-1">
                          Supported types:
                        </p>
                        <ul className="text-xs text-red-700 space-y-1">
                          <li>• 'line' - Line chart for time series data</li>
                          <li>• 'bar' - Bar chart for categorical data</li>
                          <li>• 'composed' - Combined chart types</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                );
            }
          })()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalysisChart;