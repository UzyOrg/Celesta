import React from 'react';
import { Reorder } from 'framer-motion';
import styles from './LogicScaffold.module.css';

export interface LogicNode {
  id: string;
  content: string;
}

export interface TelemetryEvent {
  event: 'node_moved';
  nodeId: string;
  timestamp: number;
}

export interface LogicScaffoldProps {
  instruction: string;
  nodes: LogicNode[];
  onOrderChange: (newNodes: LogicNode[]) => void;
  onTelemetryUpdate: (telemetryData: TelemetryEvent) => void;
}

const DragHandle: React.FC = () => (
  <div className={styles.dragHandle} aria-hidden="true">
    <span className={styles.handleDot} />
    <span className={styles.handleDot} />
    <span className={styles.handleDot} />
    <span className={styles.handleDot} />
    <span className={styles.handleDot} />
    <span className={styles.handleDot} />
  </div>
);

export const LogicScaffold: React.FC<LogicScaffoldProps> = ({
  instruction,
  nodes,
  onOrderChange,
  onTelemetryUpdate,
}) => {
  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{instruction}</p>

      <Reorder.Group
        as="ul"
        axis="y"
        values={nodes}
        onReorder={onOrderChange}
        className={styles.list}
      >
        {nodes.map((node) => (
          <Reorder.Item
            as="li"
            key={node.id}
            value={node}
            className={styles.item}
            onDragEnd={() => {
              onTelemetryUpdate({
                event: 'node_moved',
                nodeId: node.id,
                timestamp: Date.now(),
              });
            }}
            whileDrag={{
              scale: 1.02,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
            transition={{ duration: 0.15 }}
          >
            <DragHandle />
            <span className={styles.content}>{node.content}</span>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};
