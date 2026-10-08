import React, { useState } from 'react';
import type { CirculationTrendPoint } from '../types';

export interface TrendChartProps {
  data: CirculationTrendPoint[];
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, height = 240 }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 640;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Max scale calculation
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.checkouts, d.returns, d.renewals)),
    6
  );

  const getX = (index: number) => {
    return paddingX + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingY - (val / maxVal) * chartHeight;
  };

  // Generate SVG path strings
  const checkoutsPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.checkouts)}`)
    .join(' ');

  const returnsPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.returns)}`)
    .join(' ');

  const checkoutsArea = `${checkoutsPath} L ${getX(data.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        <defs>
          <linearGradient id="checkoutsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Background Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = height - paddingY - pct * chartHeight;
          const val = Math.round(pct * maxVal);
          return (
            <g key={idx} className="opacity-40 dark:opacity-20">
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeDasharray="4 4"
                strokeWidth="1"
                className="text-border-subtle"
              />
              <text
                x={paddingX - 10}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] font-mono fill-canvas-muted"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill for checkouts */}
        <path d={checkoutsArea} fill="url(#checkoutsGradient)" />

        {/* Returns line */}
        <path
          d={returnsPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Checkouts line */}
        <path
          d={checkoutsPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Data Nodes & Hover Columns */}
        {data.map((d, i) => {
          const x = getX(i);
          const yCheck = getY(d.checkouts);
          const yRet = getY(d.returns);
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              {/* Invisible wide hit area for comfortable hover on mobile and desktop */}
              <rect
                x={x - chartWidth / (data.length * 2)}
                y={paddingY}
                width={chartWidth / data.length}
                height={chartHeight}
                fill="transparent"
              />

              {/* Hover vertical crosshair */}
              {isHovered && (
                <line
                  x1={x}
                  y1={paddingY}
                  x2={x}
                  y2={height - paddingY}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  className="opacity-70"
                />
              )}

              {/* Data points */}
              <circle
                cx={x}
                cy={yCheck}
                r={isHovered ? 5 : 3.5}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-150"
              />
              <circle
                cx={x}
                cy={yRet}
                r={isHovered ? 5 : 3.5}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-150"
              />

              {/* X Axis Labels */}
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                className={`text-[10px] font-mono transition-colors ${
                  isHovered ? 'fill-canvas-text font-bold' : 'fill-canvas-muted'
                }`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Dynamic Hover Tooltip Card */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute pointer-events-none p-3 rounded-xl bg-surface border border-border-strong shadow-modal text-xs font-mono z-30 transition-all duration-150 space-y-1.5"
          style={{
            left: `${(hoveredIdx / (data.length - 1)) * 75 + 10}%`,
            top: '15px',
          }}
        >
          <div className="font-bold text-canvas-text pb-1 border-b border-border-subtle flex justify-between gap-4">
            <span>{data[hoveredIdx].label}</span>
            <span className="text-canvas-muted text-[10px]">{data[hoveredIdx].date}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-brand">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand" /> Checkouts
            </span>
            <span className="font-bold">{data[hoveredIdx].checkouts}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Returns
            </span>
            <span className="font-bold">{data[hoveredIdx].returns}</span>
          </div>
        </div>
      )}

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 text-xs font-mono text-canvas-muted border-t border-border-subtle/50">
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand" /> Checkouts (Outward)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Returns (Check-In)
        </span>
      </div>
    </div>
  );
};
