import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeStatus } from '../types';

interface CustomNodeData {
  label: string;
  status: NodeStatus;
  level: string;
  nodeId: number;
  disabled: boolean;
}

interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
  id: string;
}

function CustomNode({ data, selected }: CustomNodeProps) {
  const getStatusColor = (status: NodeStatus): string => {
    switch (status) {
      case NodeStatus.PASSED:
        return '#10b981'; // green
      case NodeStatus.FAILED:
        return '#ef4444'; // red
      case NodeStatus.IN_PROGRESS:
        return '#f59e0b'; // amber
      case NodeStatus.NOT_REACHED:
        return '#6b7280'; // gray
      case NodeStatus.DISABLED:
        return '#9ca3af'; // light gray
      default:
        return '#6b7280';
    }
  };

  const backgroundColor = getStatusColor(data.status);
  const opacity = data.disabled ? 0.5 : 1;

  return (
    <div
      style={{
        backgroundColor,
        color: '#fff',
        border: selected ? '3px solid #3b82f6' : '2px solid #1f2937',
        borderRadius: '8px',
        padding: '12px',
        minWidth: 150,
        minHeight: 80,
        opacity,
        boxShadow: selected ? '0 4px 6px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {data.label}
              </div>
            </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
}

export default memo(CustomNode);

