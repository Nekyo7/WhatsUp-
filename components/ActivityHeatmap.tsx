"use client";

import React, { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import type { HeatmapPoint } from "@/types";

interface ActivityHeatmapProps {
  heatmap: HeatmapPoint[];
  title?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  heatmap,
  title = "24x7 Conversational Activity Heatmap",
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; count: number } | null>(null);

  // Find max count for color scaling
  const maxCount = Math.max(1, ...heatmap.map((p) => p.count));

  const getCellData = (day: number, hour: number) => {
    return heatmap.find((p) => p.day === day && p.hour === hour) || { day, hour, count: 0 };
  };

  const getColorIntensity = (count: number) => {
    if (count === 0) return "#0E111C";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "#1E2A4A";
    if (ratio < 0.5) return "#2D4B85";
    if (ratio < 0.75) return "#0284C7";
    return "#38BDF8";
  };

  const formatHourLabel = (h: number) => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  return (
    <div className="rounded-2xl bg-[#0B0D15] border border-[#191E30] p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#171B2B] pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#38BDF8]" />
          <h4 className="font-bold text-sm text-white">{title}</h4>
        </div>
        <div className="text-xs font-mono text-[#7985A3]">
          {hoveredCell ? (
            <span className="text-[#38BDF8] font-bold">
              {DAYS[hoveredCell.day]} at {formatHourLabel(hoveredCell.hour)}: {hoveredCell.count} messages
            </span>
          ) : (
            <span>Hover over slots for message frequency</span>
          )}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[650px]">
          {/* Hour Headers */}
          <div className="flex text-[10px] font-mono text-[#636E8B] mb-1 pl-10">
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <div key={h} className="w-[12.5%] text-left">
                {formatHourLabel(h)}
              </div>
            ))}
          </div>

          {/* Grid Rows for Days */}
          <div className="space-y-1.5">
            {DAYS.map((dayName, dayIdx) => (
              <div key={dayName} className="flex items-center gap-2">
                <span className="w-8 text-[11px] font-mono text-[#7E88A3] text-right">
                  {dayName}
                </span>

                <div className="flex-1 grid grid-cols-24 gap-1">
                  {HOURS.map((hour) => {
                    const cell = getCellData(dayIdx, hour);
                    return (
                      <div
                        key={hour}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className="h-5 rounded-[3px] transition-all cursor-pointer hover:scale-125 hover:z-10 relative border border-black/20"
                        style={{ backgroundColor: getColorIntensity(cell.count) }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#6C7796] pt-1">
        <span>Less active</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-3 rounded-[2px] bg-[#0E111C]" />
          <div className="w-3.5 h-3 rounded-[2px] bg-[#1E2A4A]" />
          <div className="w-3.5 h-3 rounded-[2px] bg-[#2D4B85]" />
          <div className="w-3.5 h-3 rounded-[2px] bg-[#0284C7]" />
          <div className="w-3.5 h-3 rounded-[2px] bg-[#38BDF8]" />
        </div>
        <span>Peak activity</span>
      </div>
    </div>
  );
};
