import React from 'react';

interface KeyMetricCardProps {
  title: string;
  value: string;
  description: string;
  icon?: React.ReactNode;
  accentColor?: 'cyan' | 'purple' | 'green' | 'orange';
}

export function KeyMetricCard({ 
  title, 
  value, 
  description, 
  icon, 
  accentColor = 'cyan' 
}: KeyMetricCardProps) {
  const getAccentClasses = (color: string) => {
    switch (color) {
      case 'purple':
        return {
          gradient: 'from-purple-400 to-purple-600',
          border: 'border-purple-400/30',
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          iconBg: 'from-purple-400/20 to-purple-600/20'
        };
      case 'green':
        return {
          gradient: 'from-green-400 to-emerald-500',
          border: 'border-green-400/30',
          bg: 'bg-green-500/10',
          text: 'text-green-400',
          iconBg: 'from-green-400/20 to-emerald-500/20'
        };
      case 'orange':
        return {
          gradient: 'from-orange-400 to-red-500',
          border: 'border-orange-400/30',
          bg: 'bg-orange-500/10',
          text: 'text-orange-400',
          iconBg: 'from-orange-400/20 to-red-500/20'
        };
      default: // cyan
        return {
          gradient: 'from-cyan-400 to-cyan-600',
          border: 'border-cyan-400/30',
          bg: 'bg-cyan-500/10',
          text: 'text-cyan-400',
          iconBg: 'from-cyan-400/20 to-cyan-600/20'
        };
    }
  };

  const classes = getAccentClasses(accentColor);

  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:shadow-${accentColor}-500/25 hover:border-${accentColor}-400/30 transition-all duration-500 hover:-translate-y-2 group`}>
      {/* Icon */}
      {icon && (
        <div className={`w-16 h-16 bg-gradient-to-br ${classes.iconBg} border ${classes.border} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
          <div className={`${classes.text} group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
      )}

      {/* Title */}
      <h3 className={`text-xl lg:text-2xl font-bold text-white mb-4 group-hover:${classes.text} transition-colors duration-300 text-center`}>
        {title}
      </h3>

      {/* Value */}
      <div className={`text-3xl lg:text-4xl font-bold bg-gradient-to-r ${classes.gradient} bg-clip-text text-transparent mb-4 text-center`}>
        {value}
      </div>

      {/* Description */}
      <p className="text-gray-300 leading-relaxed text-base lg:text-lg text-center">
        {description}
      </p>
    </div>
  );
}