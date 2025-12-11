import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeStatus } from '../types';

interface CustomNodeData {
  label: string;
  status: NodeStatus;
  level: string;
  nodeId: number;
  disabled: boolean;
  score?: number;
  question?: string;
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

  // Truncate question text if too long
  const truncateText = (text: string, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const displayQuestion = data.question ? truncateText(data.question, 60) : '';

  return (
    <div
      style={{
        backgroundColor,
        color: '#fff',
        border: selected ? '3px solid #3b82f6' : '2px solid #1f2937',
        borderRadius: '8px',
        padding: '12px',
        minWidth: 150,
        maxWidth: 200, // Limit width to prevent nodes from expanding too much
        minHeight: 80,
        opacity,
        boxShadow: selected ? '0 4px 6px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s',
        position: 'relative',
        wordWrap: 'break-word',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      {/* Score badge in top right corner when status is passed */}
      {data.status === NodeStatus.PASSED && data.score !== undefined && data.score > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#10b981',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            border: '2px solid #10b981',
          }}
          title={`Score: ${data.score}`}
        >
          {data.score}
        </div>
      )}
      
      <div style={{ textAlign: 'center', paddingTop: data.status === NodeStatus.PASSED && data.score ? '4px' : '0' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: displayQuestion ? '6px' : '0' }}>
          {data.label}
        </div>
        {displayQuestion && (
          <div style={{ fontSize: '11px', opacity: 0.9, lineHeight: '1.3', marginTop: '4px' }}>
            {displayQuestion}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
}

export default memo(CustomNode);

