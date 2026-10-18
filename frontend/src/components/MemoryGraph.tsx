'use client';

import React, { useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Position,
  MarkerType,
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Brain,
  Zap,
  BookOpen,
  Library,
  ScrollText,
  Shield,
  Wrench,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';
import { MemoryTopologyResponse, TopologyNode } from '../types';

interface MemoryGraphProps {
  topology: MemoryTopologyResponse | null;
  activeMemoryType?: string | null;
  isStreaming?: boolean;
}

// Custom Node Component for High-End Futuristic Aesthetic
const CustomMemoryNode = ({ data }: { data: any }) => {
  const { label, type, status, details, isActive } = data;

  const getIcon = () => {
    switch (type) {
      case 'agent':
        return <Brain className="w-6 h-6 text-indigo-400 animate-pulse" />;
      case 'memory_working':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'memory_episodic':
        return <BookOpen className="w-5 h-5 text-purple-400" />;
      case 'memory_semantic':
        return <Library className="w-5 h-5 text-cyan-400" />;
      case 'memory_procedural':
        return <ScrollText className="w-5 h-5 text-emerald-400" />;
      case 'guardrail':
        return <Shield className="w-5 h-5 text-rose-400" />;
      case 'tools':
        return <Wrench className="w-5 h-5 text-blue-400" />;
      default:
        return <Brain className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getGlow = () => {
    if (isActive) return 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/30 scale-105';
    switch (type) {
      case 'agent':
        return 'border-indigo-500/60 shadow-lg shadow-indigo-500/20';
      case 'memory_working':
        return 'border-amber-500/40 hover:border-amber-400';
      case 'memory_episodic':
        return 'border-purple-500/40 hover:border-purple-400';
      case 'memory_semantic':
        return 'border-cyan-500/40 hover:border-cyan-400';
      case 'memory_procedural':
        return 'border-emerald-500/40 hover:border-emerald-400';
      case 'guardrail':
        return 'border-rose-500/40 hover:border-rose-400';
      default:
        return 'border-slate-700';
    }
  };

  return (
    <div
      className={`relative px-4 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border transition-all duration-300 min-w-[190px] cursor-pointer ${getGlow()}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-indigo-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-400 !w-2 !h-2" />

      <div className="flex items-center space-x-2.5">
        <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
          {getIcon()}
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100 tracking-wide">{label}</div>
          <div className="text-[10px] text-slate-400 capitalize flex items-center space-x-1 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            ></span>
            <span>{status}</span>
          </div>
        </div>
      </div>

      {/* Mini Telemetry Pill */}
      {details && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          {type === 'memory_working' && (
            <span>{details.message_count || 0} messages • {details.tokens || 0} tokens</span>
          )}
          {type === 'memory_procedural' && (
            <span>{details.total_guidelines || 10} active guidelines</span>
          )}
          {type === 'memory_episodic' && (
            <span className="text-purple-300">Hybrid Reflection</span>
          )}
          {type === 'memory_semantic' && (
            <span className="text-cyan-300">CoALA Vector Chunks</span>
          )}
          {type === 'agent' && (
            <span className="text-indigo-300">Turn #{details.current_turn || 0}</span>
          )}
          {type === 'guardrail' && (
            <span className="text-rose-300">Prompt Shield</span>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomMemoryNode
};

export const MemoryGraph: React.FC<MemoryGraphProps> = ({ topology, activeMemoryType, isStreaming }) => {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  // Map backend topology nodes to React Flow layout coordinates
  const initialNodes: Node[] = useMemo(() => {
    if (!topology || !topology.nodes) return [];

    const positions: Record<string, { x: number; y: number }> = {
      'guardrail-node': { x: 50, y: 40 },
      'working-memory': { x: 300, y: 20 },
      'agent-core': { x: 300, y: 190 },
      'procedural-memory': { x: 40, y: 200 },
      'episodic-memory': { x: 560, y: 190 },
      'semantic-memory': { x: 300, y: 370 },
      'tools-node': { x: 560, y: 360 }
    };

    return topology.nodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: positions[node.id] || { x: 250, y: 200 },
      data: {
        ...node,
        isActive: activeMemoryType === node.type || (isStreaming && node.type === 'agent')
      }
    }));
  }, [topology, activeMemoryType, isStreaming]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!topology || !topology.edges) return [];

    return topology.edges.map((edge) => {
      const isAnimated = edge.animated || isStreaming;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: isAnimated,
        style: {
          stroke: isAnimated ? '#06b6d4' : '#475569',
          strokeWidth: isAnimated ? 2.5 : 1.5,
          filter: isAnimated ? 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' : 'none'
        },
        labelStyle: {
          fill: '#94a3b8',
          fontSize: 9,
          fontWeight: 600,
          background: '#0f172a'
        },
        labelBgStyle: {
          fill: '#0f172a',
          fillOpacity: 0.85,
          rx: 4,
          ry: 4
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isAnimated ? '#06b6d4' : '#475569',
          width: 14,
          height: 14
        }
      };
    });
  }, [topology, isStreaming]);

  const onNodeClick = (_: any, node: Node) => {
    if (topology) {
      const found = topology.nodes.find((n) => n.id === node.id);
      setSelectedNode(found || null);
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Banner */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Agent-Memory Mesh Topology
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Live Dataflow Pulse Active</span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300" />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 max-h-[90%] rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl p-4 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100">{selectedNode.label}</h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Memory Type:</span>
                <span className="ml-2 text-cyan-300 font-semibold">{selectedNode.type}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="ml-2 inline-flex items-center text-emerald-400 font-semibold capitalize">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {selectedNode.status}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-semibold block mb-1.5">Runtime Details:</span>
                <pre className="bg-slate-950 p-2.5 rounded-lg text-[11px] text-slate-300 font-mono overflow-x-auto border border-slate-800/80">
                  {JSON.stringify(selectedNode.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
