import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const CardBarChart = ({ data, options, title, subtitle }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null); // Reference to store the chart instance

  useEffect(() => {
    if (chartRef.current) {
      // If there's an existing chart instance, destroy it to prevent memory leaks
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data,
        options: {
          maintainAspectRatio: false,
          responsive: true,
          ...options,
        },
      });
    }

    // Cleanup function to destroy chart instance when the component unmounts
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, options]); // Dependency array to determine when to rerun the useEffect hook

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center">
          <div className="relative w-full max-w-full flex-grow flex-1">
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              {subtitle}
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              {title}
            </h2>
          </div>
        </div>
      </div>
      <div className="p-4 flex-auto">
        {/* Chart */}
        <div className="relative h-350-px">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  );
};

export default CardBarChart;
