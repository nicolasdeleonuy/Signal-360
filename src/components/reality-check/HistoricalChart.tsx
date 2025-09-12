
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HistoricalDataPoint {
  year: string;
  value: number;
}

interface HistoricalChartProps {
  data: HistoricalDataPoint[];
}

// Custom tooltip component for premium styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/90 border border-cyan-400/30 rounded-2xl p-4 shadow-2xl">
        <p className="text-cyan-300 font-semibold text-lg mb-2">{`Year: ${label}`}</p>
        <p className="text-white font-bold text-xl">
          <span className="text-gray-300 text-sm">S&P 500: </span>
          {`${payload[0].value.toLocaleString()}`}
        </p>
      </div>
    );
  }
  return null;
};

export function HistoricalChart({ data }: HistoricalChartProps) {
  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          S&P 500 Historical Performance
        </h2>
        <p className="text-lg text-gray-300">
          Two decades of market evolution: from dot-com crash to modern highs
        </p>
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            {/* Grid with subtle styling */}
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255, 255, 255, 0.1)"
              horizontal={true}
              vertical={false}
            />
            
            {/* X-axis styling */}
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: '#9CA3AF', 
                fontSize: 12,
                fontWeight: 500
              }}
              interval="preserveStartEnd"
            />
            
            {/* Y-axis styling */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: '#9CA3AF', 
                fontSize: 12,
                fontWeight: 500
              }}
              tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
            />
            
            {/* Custom tooltip */}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Area chart with gradient fill */}
            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#colorGradient)"
              strokeWidth={3}
              fill="url(#fillGradient)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: '#06B6D4',
                strokeWidth: 2,
                fill: '#FFFFFF'
              }}
            />
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
                <stop offset="50%" stopColor="rgba(139, 92, 246, 0.2)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0.1)" />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="backdrop-blur-sm bg-cyan-500/10 border border-cyan-400/30 rounded-2xl p-4 text-center">
          <p className="text-cyan-300 font-semibold text-sm mb-1">Dot-Com Crash</p>
          <p className="text-white font-bold">2000-2002</p>
        </div>
        <div className="backdrop-blur-sm bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-center">
          <p className="text-red-300 font-semibold text-sm mb-1">Financial Crisis</p>
          <p className="text-white font-bold">2008</p>
        </div>
        <div className="backdrop-blur-sm bg-green-500/10 border border-green-400/30 rounded-2xl p-4 text-center">
          <p className="text-green-300 font-semibold text-sm mb-1">Bull Market</p>
          <p className="text-white font-bold">2009-2021</p>
        </div>
      </div>
    </div>
  );
}