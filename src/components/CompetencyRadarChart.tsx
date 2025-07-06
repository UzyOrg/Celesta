import React from 'react';
import { ResponsiveRadar } from '@nivo/radar';

// Datos simulados para la demo
const data = [
  {
    "taste": "Pensamiento Crítico",
    "Diagnóstico Inicial": 2.0,
    "Progreso Post-Proyecto": 4.0,
  },
  {
    "taste": "Resolución",
    "Diagnóstico Inicial": 1.5,
    "Progreso Post-Proyecto": 4.5,
  },
  {
    "taste": "Colaboración",
    "Diagnóstico Inicial": 2.5,
    "Progreso Post-Proyecto": 4.2,
  },
  {
    "taste": "Comunicación",
    "Diagnóstico Inicial": 2.0,
    "Progreso Post-Proyecto": 3.8,
  },
  {
    "taste": "Creatividad",
    "Diagnóstico Inicial": 1.8,
    "Progreso Post-Proyecto": 3.5,
  },
];

const CompetencyRadarChart: React.FC = () => (
  <ResponsiveRadar
    data={data}
    keys={['Diagnóstico Inicial', 'Progreso Post-Proyecto']}
    indexBy="taste"
    valueFormat=">-.2f"
    maxValue={5}
    margin={{ top: 70, right: 100, bottom: 40, left: 100 }}
    borderWidth={2}
    borderColor={{ from: 'color' }}
    fillOpacity={0}
    gridLabelOffset={20}
    dotSize={10}
    dotColor={{ theme: 'background' }}
    dotBorderWidth={2}
    colors={['#d9d2f7', '#a7d8f5']} /* Solid Crystal Lavender & Blue for borders */
    blendMode="multiply"
    animate={false}
    motionConfig="wobbly"
    theme={{
      grid: {
        line: {
          stroke: 'rgba(240, 244, 248, 0.15)', // Subtle light grid lines
        },
      },
      axis: {
        ticks: {
          text: {
            fill: 'rgba(240, 244, 248, 0.7)', // Light text for labels
          },
        },
      },
      tooltip: {
        container: {
          background: '#1a1f2c',
          color: '#f0f4f8',
        },
      },
    }}
    legends={[
      {
        anchor: 'top-left',
        direction: 'column',
        translateX: 0,
        translateY: -40,
        itemWidth: 80,
        itemHeight: 20,
        itemTextColor: 'rgba(240, 244, 248, 0.7)', /* Star White with transparency */
        symbolSize: 12,
        symbolShape: 'circle',
        effects: [
          {
            on: 'hover',
            style: {
              itemTextColor: '#fff',
            },
          },
        ],
      },
    ]}
    theme={{
      axis: {
        ticks: {
          text: {
            fill: '#fff',
            fontSize: 12,
          },
        },
        legend: {
          text: {
            fill: '#fff',
            fontSize: 14,
          },
        },
      },
      grid: {
        line: {
          stroke: 'rgba(255, 255, 255, 0.2)',
        },
      },
      tooltip: {
        container: {
          background: '#333',
          color: '#fff',
          fontSize: 12,
        },
      },
    }}
  />
);

export default CompetencyRadarChart;
