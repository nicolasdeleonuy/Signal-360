import React from 'react';
import AnalysisChart from './src/components/charts/AnalysisChart';

// Test the conditional rendering logic
const TestChart = () => {
  const testData = [
    { name: 'Jan', value: 65, benchmark: 60 },
    { name: 'Feb', value: 72, benchmark: 65 },
    { name: 'Mar', value: 68, benchmark: 70 }
  ];

  return (
    <div>
      <h2>Line Chart Test</h2>
      <AnalysisChart data={testData} chartType="line" title="Line Chart Test" />
      
      <h2>Bar Chart Test</h2>
      <AnalysisChart data={testData} chartType="bar" title="Bar Chart Test" />
      
      <h2>Composed Chart Test</h2>
      <AnalysisChart data={testData} chartType="composed" title="Composed Chart Test" />
    </div>
  );
};

export default TestChart;