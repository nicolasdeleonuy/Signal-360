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
  
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <ResponsiveContainer
          width="100%"
          height={height}
          minHeight={300}
          debounce={50}
        >
          {(() => {
            switch (chartType) {
              case 'line':
                return (
                  <LineChart 
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    {/* Common chart elements */}
                    {showGrid && (
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={colors?.grid || "#E5E7EB"}
                        strokeOpacity={0.6}
                        horizontal={true}
                        vertical={false}
                      />
                    )}
                    <XAxis 
                      dataKey="name"
                      axisLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tick={{ 
                        fill: colors?.text || "#374151", 
                        fontSize: 12,
                        fontWeight: 500
                      }}
                      tickMargin={8}
                    />
                    <YAxis 
                      axisLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tick={{ 
                        fill: colors?.text || "#374151", 
                        fontSize: 12,
                        fontWeight: 500
                      }}
                      tickMargin={8}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    {showTooltip && (
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                        labelStyle={{
                          color: colors?.text || "#374151",
                          fontWeight: 600,
                          marginBottom: '4px'
                        }}
                        formatter={(value: any, name: string) => [
                          typeof value === 'number' ? value.toFixed(1) : value,
                          name === 'value' ? 'Value' : name === 'benchmark' ? 'Benchmark' : name
                        ]}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                    )}
                    {showLegend && (
                      <Legend 
                        verticalAlign="top"
                        height={36}
                        iconType="line"
                        wrapperStyle={{
                          paddingBottom: '20px',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: colors?.text || "#374151"
                        }}
                        formatter={(value: string) => 
                          value === 'value' ? 'Value' : value === 'benchmark' ? 'Benchmark' : value
                        }
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={colors?.primary || "#3B82F6"} 
                      strokeWidth={3}
                      dot={{ 
                        fill: colors?.primary || "#3B82F6", 
                        strokeWidth: 2, 
                        r: 5,
                        fillOpacity: 0.8
                      }}
                      activeDot={{ 
                        r: 7, 
                        stroke: colors?.primary || "#3B82F6", 
                        strokeWidth: 2,
                        fill: colors?.primary || "#3B82F6",
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
                        stroke={colors?.secondary || "#10B981"} 
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        dot={{ 
                          fill: colors?.secondary || "#10B981", 
                          strokeWidth: 1, 
                          r: 4,
                          fillOpacity: 0.7
                        }}
                        activeDot={{ 
                          r: 6, 
                          stroke: colors?.secondary || "#10B981", 
                          strokeWidth: 2,
                          fill: colors?.secondary || "#10B981"
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
                  >
                    {/* Common chart elements */}
                    {showGrid && (
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={colors?.grid || "#E5E7EB"}
                        strokeOpacity={0.6}
                        horizontal={true}
                        vertical={false}
                      />
                    )}
                    <XAxis 
                      dataKey="name"
                      axisLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tick={{ 
                        fill: colors?.text || "#374151", 
                        fontSize: 12,
                        fontWeight: 500
                      }}
                      tickMargin={8}
                    />
                    <YAxis 
                      axisLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: colors?.text || "#374151", strokeWidth: 1 }}
                      tick={{ 
                        fill: colors?.text || "#374151", 
                        fontSize: 12,
                        fontWeight: 500
                      }}
                      tickMargin={8}
                      domain={[0, 'dataMax + 10']}
                    />
                    {showTooltip && (
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                        labelStyle={{
                          color: colors?.text || "#374151",
                          fontWeight: 600,
                          marginBottom: '4px'
                        }}
                        formatter={(value: any, name: string) => [
                          typeof value === 'number' ? value.toFixed(1) : value,
                          name === 'value' ? 'Value' : name === 'benchmark' ? 'Benchmark' : name
                        ]}
                        labelFormatter={(label) => `Category: ${label}`}
                      />
                    )}
                    {showLegend && (
                      <Legend 
                        verticalAlign="top"
                        height={36}
                        iconType="rect"
                        wrapperStyle={{
                          paddingBottom: '20px',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: colors?.text || "#374151"
                        }}
                        formatter={(value: string) => 
                          value === 'value' ? 'Value' : value === 'benchmark' ? 'Benchmark' : value
                        }
                      />
                    )}
                    <Bar 
                      dataKey="value" 
                      fill={colors?.primary || "#3B82F6"}
                      radius={[4, 4, 0, 0]}
                      stroke={colors?.primary || "#2563EB"}
                      strokeWidth={1}
                    />
                    {chartData[0]?.benchmark !== undefined && (
                      <Bar 
                        dataKey="benchmark" 
                        fill={colors?.secondary || "#10B981"}
                        radius={[4, 4, 0, 0]}
                        stroke={colors?.secondary || "#059669"}
                        strokeWidth={1}
                      />
                    )}
                  </BarChart>
                );
              
              case 'composed':
                return (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">Composed Chart</p>
                      <p className="text-sm">
                        Placeholder structure for composed chart implementation
                      </p>
                      <p className="text-xs mt-2 text-gray-400">
                        Will combine Line and Bar components with multiple Y-axes
                      </p>
                      <div className="mt-4 text-xs text-left bg-gray-50 p-3 rounded max-w-md">
                        <p className="font-medium mb-2">Ready with data:</p>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(chartData[0], null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              
              default:
                return (
                  <div className="flex items-center justify-center h-full text-red-500">
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">Invalid Chart Type</p>
                      <p className="text-sm">
                        Supported types: 'line', 'bar', 'composed'
                      </p>
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