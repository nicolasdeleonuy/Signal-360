import React from 'react';
import AnalysisChart from './src/components/charts/AnalysisChart';

// Test the component with different chart types
const TestCharts = () => {
  const testData = [
    { name: 'Jan', value: 65, benchmark: 60 },
    { name: 'Feb', value: 72, benchmark: 65 },
    { name: 'Mar', value: 68, benchmark: 70 }
  ];

  return (
    <div className="p-4 space-y-8">
      <AnalysisChart 
        data={testData} 
        chartType="line" 
        title="Line Chart Test"
      />
      <AnalysisChart 
        data={testData} 
        chartType="bar" 
        title="Bar Chart Test"
      />
      <AnalysisChart 
        data={[]} 
        chartType="composed" 
        title="Composed Chart Test"
      />
    </div>
  );
};

export default TestCharts;