
import React from 'react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
}

const Barcode: React.FC<BarcodeProps> = ({ value, width = 200, height = 50 }) => {
  const bars: { x: number; width: number }[] = [];
  let currentX = 0;

  if (!value) return null;

  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    // Simple algorithm to generate varied bar widths
    const barWidth = 1 + (charCode % 3); // bar widths of 1, 2, or 3
    
    if(i % 2 === 0) { // Only draw bars for even indices to create gaps
        bars.push({ x: currentX, width: barWidth });
    }
    
    currentX += barWidth + 1; // Add gap
  }
  
  // Adjust svg width to fit all bars
  const svgWidth = currentX > 0 ? currentX - 1 : 0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="none">
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y="0"
          width={bar.width}
          height={height}
          fill="black"
        />
      ))}
    </svg>
  );
};

export default Barcode;