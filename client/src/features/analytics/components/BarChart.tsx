import React from 'react';
import type { DepartmentBorrowingMetric } from '../types';

export interface BarChartProps {
  data: DepartmentBorrowingMetric[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxLoans = Math.max(...data.map((d) => d.activeLoans), 1);

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {data.map((item) => {
        const percentage = Math.round((item.activeLoans / maxLoans) * 100);

        return (
          <div key={item.department} className="space-y-1">
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-sans font-medium text-canvas-text truncate max-w-[220px]">
                {item.department}
              </span>
              <div className="text-right">
                <span className="font-bold text-brand">{item.activeLoans}</span>
                <span className="text-canvas-muted text-[11px] ml-1">
                  loans ({item.totalMembers} members)
                </span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-canvas-subtle overflow-hidden">
              <div
                style={{ width: `${percentage}%` }}
                className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
