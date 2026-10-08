import React, { useState } from 'react';
import type { InventoryAvailabilityMetric } from '../types';

export interface DonutChartProps {
  data: InventoryAvailabilityMetric;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 180 }) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const { available, borrowed, reserved, total, utilizationRate } = data;

  if (total === 0) return null;

  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    {
      id: 'available',
      label: 'On Shelf (Available)',
      value: available,
      color: '#10b981', // emerald
      fraction: available / total,
    },
    {
      id: 'borrowed',
      label: 'Active Loans (Borrowed)',
      value: borrowed,
      color: '#3b82f6', // blue
      fraction: borrowed / total,
    },
    {
      id: 'reserved',
      label: 'Staged / Held',
      value: reserved,
      color: '#f59e0b', // amber
      fraction: reserved / total,
    },
  ];

  let accumulatedFraction = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 select-none">
      {/* SVG Ring Graphic */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          {segments.map((seg) => {
            const strokeDasharray = `${seg.fraction * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedFraction * circumference;
            accumulatedFraction += seg.fraction;
            const isHovered = hoveredSegment === seg.id;

            return (
              <circle
                key={seg.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredSegment(seg.id)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            );
          })}
        </svg>

        {/* Center Telemetry Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text leading-none">
            {utilizationRate}%
          </span>
          <span className="text-[10px] font-mono text-canvas-muted uppercase tracking-wider mt-1">
            Utilization
          </span>
        </div>
      </div>

      {/* Segment Legend Stack */}
      <div className="space-y-2 text-xs font-mono flex-1 min-w-[180px]">
        {segments.map((seg) => {
          const isHovered = hoveredSegment === seg.id;
          const percentage = Math.round(seg.fraction * 100);

          return (
            <div
              key={seg.id}
              onMouseEnter={() => setHoveredSegment(seg.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                isHovered ? 'bg-canvas-subtle border-border-strong' : 'border-transparent hover:bg-canvas-subtle/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="font-sans text-canvas-text text-xs">{seg.label}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-canvas-text">{seg.value}</span>
                <span className="text-canvas-muted text-[10px] ml-1">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
