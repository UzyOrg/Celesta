"use client";
import React from 'react';
import { ResponsiveRadar } from '@nivo/radar';

type Datum = { metric: string; valor: number };

export default function RadarChart({ data }: { data: Datum[] }) {
  return (
    <div style={{ height: 360 }} className="bg-black/20 rounded border border-neutral-800">
      <ResponsiveRadar
        data={data}
        keys={["valor"]}
        indexBy="metric"
        maxValue="auto"
        valueFormat=".2f"
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
        borderColor={{ from: 'color' }}
        gridLabelOffset={20}
        dotSize={6}
        colors={{ scheme: 'category10' }}
        blendMode="multiply"
        motionConfig="gentle"
        theme={{
          text: { fill: '#e5e7eb' },
          grid: { line: { stroke: '#374151', strokeWidth: 1 } },
          axis: { ticks: { text: { fill: '#e5e7eb' } } },
          legends: { text: { fill: '#e5e7eb' } },
        }}
      />
    </div>
  );
}
