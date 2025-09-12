import React, { useState, useEffect } from 'react';
import { FundamentalAnalysis } from '../../services/analysisService';

// DCF Calculation Utility Function
const calculateDcfValue = (assumptions: DCFAssumptions, initialData: FundamentalAnalysis, currentPrice: number): number => {
  try {
    // Data Parsing - Convert percentage strings to numbers
    const parsePercentage = (value: string): number => {
      const match = value.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) / 100 : 0;
    };

    const revenueGrowthRate = parsePercentage(assumptions.revenueGrowthRate);
    const ebitMargin = parsePercentage(assumptions.ebitMargin);
    const discountRate = parsePercentage(assumptions.discountRate);
    const perpetualGrowthRate = parsePercentage(assumptions.perpetualGrowthRate);
    const taxRate = parsePercentage(assumptions.taxRate);

    // Derive initial financial metrics from available data
    const peRatio = parseFloat(initialData.keyFinancialRatios["Price/Earnings (P/E)"].value.replace(/[^\d.-]/g, '')) || 15;
    const netProfitMargin = parsePercentage(initialData.keyFinancialRatios["Net Profit Margin"].value);
    
    // Estimate shares outstanding (simplified assumption)
    const estimatedShares = 1000000000; // 1B shares as reasonable default
    
    // Work backwards to estimate initial revenue and EBIT
    const estimatedNetIncome = (currentPrice * estimatedShares) / peRatio;
    const estimatedRevenue = netProfitMargin > 0 ? estimatedNetIncome / netProfitMargin : estimatedNetIncome / 0.1;
    const initialEBIT = estimatedRevenue * ebitMargin;

    // Step 1: Project FCFF for 5 Years
    const projectedFCFF: number[] = [];
    let currentRevenue = estimatedRevenue;
    
    for (let year = 1; year <= 5; year++) {
      // Project Revenue and EBIT
      currentRevenue = currentRevenue * (1 + revenueGrowthRate);
      const projectedEBIT = currentRevenue * ebitMargin;
      
      // Calculate NOPAT (Net Operating Profit After Tax)
      const nopat = projectedEBIT * (1 - taxRate);
      
      // Estimate D&A, CAPEX, and Change in NWC as percentages of revenue
      const depreciation = currentRevenue * 0.03; // 3% of revenue
      const capex = currentRevenue * 0.04; // 4% of revenue
      const changeInNWC = currentRevenue * revenueGrowthRate * 0.02; // 2% of revenue growth
      
      // Calculate Free Cash Flow to Firm (FCFF)
      const fcff = nopat + depreciation - capex - changeInNWC;
      projectedFCFF.push(fcff);
    }

    // Step 2: Calculate Terminal Value using Gordon Growth Model
    const terminalFCFF = projectedFCFF[4] * (1 + perpetualGrowthRate);
    const terminalValue = terminalFCFF / (discountRate - perpetualGrowthRate);

    // Step 3: Discount All Cash Flows to Present Value
    let presentValueOfFCFF = 0;
    for (let year = 1; year <= 5; year++) {
      const pv = projectedFCFF[year - 1] / Math.pow(1 + discountRate, year);
      presentValueOfFCFF += pv;
    }
    
    const presentValueOfTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

    // Step 4 & 5: Calculate Enterprise Value and Intrinsic Value per Share
    const enterpriseValue = presentValueOfFCFF + presentValueOfTerminalValue;
    
    // Assume Net Debt = 0 for simplification (Equity Value = Enterprise Value)
    const equityValue = enterpriseValue;
    
    // Calculate intrinsic value per share
    const intrinsicValuePerShare = equityValue / estimatedShares;
    
    return Math.max(0, intrinsicValuePerShare); // Ensure non-negative value
    
  } catch (error) {
    console.error('DCF Calculation Error:', error);
    return 0;
  }
};

interface InteractiveDCFProps {
  initialData: FundamentalAnalysis;
  currentPrice: number;
}

interface DCFAssumptions {
  revenueGrowthRate: string;
  ebitMargin: string;
  discountRate: string;
  perpetualGrowthRate: string;
  taxRate: string;
}

const InteractiveDCF: React.FC<InteractiveDCFProps> = ({ initialData, currentPrice }) => {
  const [assumptions, setAssumptions] = useState<DCFAssumptions>(
    initialData.dcfAnalysis.assumptions
  );
  const [calculatedValue, setCalculatedValue] = useState<number>(
    initialData.dcfAnalysis.intrinsicValuePerShare
  );

  // Real-time calculation using useEffect
  useEffect(() => {
    const newValue = calculateDcfValue(assumptions, initialData, currentPrice);
    setCalculatedValue(newValue);
  }, [assumptions, initialData, currentPrice]);

  const handleAssumptionChange = (key: keyof DCFAssumptions, value: string) => {
    const updatedAssumptions = {
      ...assumptions,
      [key]: value
    };
    setAssumptions(updatedAssumptions);
  };

  const formatLabel = (key: string): string => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const parsePercentage = (value: string): number => {
    return parseFloat(value.replace('%', '')) || 0;
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
      <h4 className="text-2xl font-bold text-green-400 mb-6">Interactive DCF Valuation</h4>
      <p className="text-lg text-gray-400 mb-8">
        Adjust the assumptions below to see how they impact the valuation model.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          <h5 className="text-xl font-semibold text-green-300 mb-4">DCF Assumptions</h5>
          
          {Object.entries(assumptions).map(([key, value]) => (
            <div key={key} className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                {formatLabel(key)}
              </label>
              
              <div className="space-y-3">
                {/* Range Slider */}
                <input
                  type="range"
                  min="0"
                  max={key.includes('Growth') || key.includes('Margin') ? "50" : "20"}
                  step="0.1"
                  value={parsePercentage(value)}
                  onChange={(e) => handleAssumptionChange(key as keyof DCFAssumptions, `${e.target.value}%`)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                
                {/* Text Input */}
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleAssumptionChange(key as keyof DCFAssumptions, e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-center font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  placeholder="0.0%"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          <h5 className="text-xl font-semibold text-green-300 mb-4">Valuation Results</h5>
          
          {/* Intrinsic Value Display */}
          <div className="backdrop-blur-sm bg-green-500/10 border border-green-400/30 rounded-2xl p-6 text-center">
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Calculated Intrinsic Value
              </span>
            </div>
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-2xl mb-4">
              <span className="text-2xl font-bold text-white">
                ${calculatedValue.toFixed(2)}
              </span>
            </div>
            <p className="text-green-300 text-sm font-semibold">
              Updates in Real-Time
            </p>
          </div>

          {/* Valuation Comparison */}
          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
            <h6 className="text-lg font-semibold text-green-400 mb-4">Valuation Comparison</h6>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Current Market Price:</span>
                <span className="text-white font-semibold">${currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Calculated Intrinsic Value:</span>
                <span className="text-white font-semibold">${calculatedValue.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-600 pt-3">
                <div className={`flex justify-between items-center p-3 rounded-lg ${
                  calculatedValue > currentPrice 
                    ? 'bg-green-500/20 text-green-400' 
                    : calculatedValue < currentPrice
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <span className="font-semibold">Assessment:</span>
                  <span className="font-bold">
                    {calculatedValue > currentPrice * 1.1 
                      ? 'Undervalued' 
                      : calculatedValue < currentPrice * 0.9
                      ? 'Overvalued'
                      : 'Fair Value'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assumptions Summary */}
          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
            <h6 className="text-lg font-semibold text-green-400 mb-4">Current Assumptions</h6>
            <div className="space-y-2">
              {Object.entries(assumptions).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">{formatLabel(key)}:</span>
                  <span className="text-white font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Status */}
          <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-400/30 rounded-2xl p-4">
            <p className="text-blue-300 text-sm text-center">
              ✨ Real-time DCF calculations active!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDCF;