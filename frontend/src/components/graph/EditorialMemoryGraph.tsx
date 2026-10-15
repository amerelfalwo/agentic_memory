'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Position,
  MarkerType,
  Handle,
  useReactFlow,
  ReactFlowProvider
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
  X,
  Maximize2,
  HelpCircle
} from 'lucide-react';
import { TopologyNode } from '../../types';
import { useMemory } from '../../context/MemoryContext';

// Custom Node Component with Light Editorial Aesthetic
const EditorialNode = ({ data }: { data: any }) => {
  const { label, type, status, details, isSelected } = data;

  const getNodeTheme = () => {
    switch (type) {
      case 'agent':
        return {
          badgeBg: '#E8F0E8',
          badgeText: '#285943',
          border: isSelected ? '#285943' : '#DFE5DD',
          icon: <Brain className="w-4 h-4 text-[#285943]" />
        };
      case 'memory_working':
        return {
          badgeBg: '#FEF3C7',
          badgeText: '#B7791F',
          border: isSelected ? '#B7791F' : '#DFE5DD',
          icon: <Zap className="w-4 h-4 text-[#B7791F]" />
        };
      case 'memory_episodic':
        return {
          badgeBg: '#F3E8FF',
          badgeText: '#6B21A8',
          border: isSelected ? '#6B21A8' : '#DFE5DD',
          icon: <BookOpen className="w-4 h-4 text-[#6B21A8]" />
        };
      case 'memory_semantic':
        return {
          badgeBg: '#E0F2FE',
          badgeText: '#0369A1',
          border: isSelected ? '#0369A1' : '#DFE5DD',
          icon: <Library className="w-4 h-4 text-[#0369A1]" />
        };
      case 'memory_procedural':
        return {
          badgeBg: '#E8F0E8',
          badgeText: '#285943',
          border: isSelected ? '#285943' : '#DFE5DD',
          icon: <ScrollText className="w-4 h-4 text-[#285943]" />
        };
      case 'guardrail':
        return {
          badgeBg: '#FEE2E2',
          badgeText: '#B54747',
          border: isSelected ? '#B54747' : '#DFE5DD',
          icon: <Shield className="w-4 h-4 text-[#B54747]" />
        };
      default:
        return {
          badgeBg: '#F1F5F9',
          badgeText: '#475569',
          border: isSelected ? '#475569' : '#DFE5DD',
          icon: <Wrench className="w-4 h-4 text-[#475569]" />
        };
    }
  };

  const theme = getNodeTheme();

  return (
    <div
      style={{ borderColor: theme.border }}
      className={`
        relative px-4 py-3 rounded-lg bg-white border transition-all duration-150 min-w-[200px] shadow-xs cursor-pointer
        ${isSelected ? 'ring-2 ring-[#285943]/20 shadow-md' : 'hover:border-[#8DAA91]'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#8DAA91] !w-2 !h-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#8DAA91] !w-2 !h-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!bg-[#8DAA91] !w-2 !h-2 !border-white" />
      <Handle type="source" position={Position.Right} className="!bg-[#8DAA91] !w-2 !h-2 !border-white" />

      <div className="flex items-center space-x-2.5">
        <div
          style={{ backgroundColor: theme.badgeBg }}
          className="p-1.5 rounded-md border border-[#DFE5DD]"
        >
          {theme.icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-[#242A25] tracking-tight">{label}</div>
          <div className="text-[10px] text-[#737B74] flex items-center space-x-1 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'active' ? 'bg-[#285943]' : 'bg-[#737B74]'
              }`}
            />
            <span className="capitalize">{status}</span>
          </div>
        </div>
      </div>

      {/* Node Metrics Summary */}
      {details && (
        <div className="mt-2 pt-2 border-t border-[#DFE5DD] flex items-center justify-between text-[10px] text-[#737B74]">
          {type === 'memory_working' && (
            <span>{details.message_count || 0} messages • {details.tokens || 0} tok</span>
          )}
          {type === 'memory_procedural' && (
            <span>{details.total_guidelines || 10} active rules</span>
          )}
          {type === 'memory_episodic' && (
            <span>Hybrid Experience Recall</span>
          )}
          {type === 'memory_semantic' && (
            <span>CoALA Chunks Indexed</span>
          )}
          {type === 'agent' && (
            <span>Turn #{details.current_turn || 0}</span>
          )}
          {type === 'guardrail' && (
            <span>Protection Active</span>
          )}
          {type === 'tools' && (
            <span>Knowledge Base Search</span>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  editorial: EditorialNode
};

const DEFAULT_TOPOLOGY_NODES: TopologyNode[] = [
  {
    id: 'agent-core',
    label: 'Mnemos Core Agent (LLM)',
    type: 'agent',
    status: 'active',
    details: { model: 'qwen/qwen3.8-27b', current_turn: 1, active_messages: 2 }
  },
  {
    id: 'working-memory',
    label: '⚡ Working Memory',
    type: 'memory_working',
    status: 'active',
    details: { message_count: 2, is_summarized: false, tokens: 240 }
  },
  {
    id: 'episodic-memory',
    label: '📖 Episodic Memory',
    type: 'memory_episodic',
    status: 'active',
    details: { storage: 'Weaviate Vector DB', collection: 'episodic_memory', recall_mode: 'Hybrid (Vector + BM25)' }
  },
  {
    id: 'semantic-memory',
    label: '📚 Semantic Memory',
    type: 'memory_semantic',
    status: 'active',
    details: { source: 'CoALA_Paper.pdf', collection: 'CoALA_Paper', hybrid_alpha: 0.5 }
  },
  {
    id: 'procedural-memory',
    label: '📋 Procedural Memory',
    type: 'memory_procedural',
    status: 'active',
    details: { total_guidelines: 10, last_updated: 'Live Synchronized' }
  },
  {
    id: 'guardrail-node',
    label: '🛡️ Security Guardrail',
    type: 'guardrail',
    status: 'active',
    details: { protection: 'Prompt Injection Defense', state: 'Armed' }
  },
  {
    id: 'tools-node',
    label: '🔧 External Tools / MCP',
    type: 'tools',
    status: 'active',
    details: { registered_tools: ['search_knowledge_base'] }
  }
];

const DEFAULT_TOPOLOGY_EDGES = [
  { id: 'e-guard-agent', source: 'guardrail-node', target: 'agent-core', label: 'Input Guardrail Check', animated: true, active: true },
  { id: 'e-agent-working', source: 'agent-core', target: 'working-memory', label: 'Read Buffer / Append Dialogue', animated: true, active: true },
  { id: 'e-agent-episodic', source: 'agent-core', target: 'episodic-memory', label: 'Recall Reflections / Store Learnings', animated: true, active: true },
  { id: 'e-agent-semantic', source: 'agent-core', target: 'semantic-memory', label: 'Hybrid Vector Retrieval', animated: true, active: true },
  { id: 'e-agent-procedural', source: 'agent-core', target: 'procedural-memory', label: 'Read Guidelines / Synthesize Evolution', animated: true, active: true },
  { id: 'e-agent-tools', source: 'agent-core', target: 'tools-node', label: 'Tool Dispatch', animated: false, active: false }
];

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'guardrail-node': { x: 50, y: 60 },
  'working-memory': { x: 380, y: 40 },
  'agent-core': { x: 380, y: 220 },
  'procedural-memory': { x: 50, y: 230 },
  'episodic-memory': { x: 720, y: 220 },
  'semantic-memory': { x: 380, y: 410 },
  'tools-node': { x: 720, y: 410 }
};

const GraphCanvasInner: React.FC = () => {
  const { topology } = useMemory();
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Synchronize nodes & edges with live topology or fallback default
  React.useEffect(() => {
    const rawNodes = topology?.nodes && topology.nodes.length > 0 ? topology.nodes : DEFAULT_TOPOLOGY_NODES;
    const rawEdges = topology?.edges && topology.edges.length > 0 ? topology.edges : DEFAULT_TOPOLOGY_EDGES;

    const formattedNodes: Node[] = rawNodes.map((node) => ({
      id: node.id,
      type: 'editorial',
      position: NODE_POSITIONS[node.id] || { x: 380, y: 220 },
      data: {
        ...node,
        isSelected: selectedNode?.id === node.id
      }
    }));

    const formattedEdges: Edge[] = rawEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: edge.animated || edge.active || false,
      style: {
        stroke: edge.active ? '#285943' : '#8DAA91',
        strokeWidth: edge.active ? 2 : 1.5
      },
      labelStyle: {
        fill: '#242A25',
        fontSize: 10,
        fontWeight: 500
      },
      labelBgStyle: {
        fill: '#FFFFFF',
        fillOpacity: 0.95,
        stroke: '#DFE5DD',
        strokeWidth: 1,
        rx: 4,
        ry: 4
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.active ? '#285943' : '#8DAA91',
        width: 12,
        height: 12
      }
    }));

    setNodes(formattedNodes);
    setEdges(formattedEdges);

    const timer = setTimeout(() => {
      try {
        reactFlowInstance?.fitView({ padding: 0.25, duration: 300 });
      } catch (e) {}
    }, 120);

    return () => clearTimeout(timer);
  }, [topology, selectedNode, reactFlowInstance]);

  const onNodeClick = (_: any, node: Node) => {
    const rawNodes = topology?.nodes && topology.nodes.length > 0 ? topology.nodes : DEFAULT_TOPOLOGY_NODES;
    const found = rawNodes.find((n) => n.id === node.id);
    setSelectedNode(found || null);
  };

  const handleFitView = () => {
    try {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    } catch (e) {}
  };

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col bg-[#F6F6F0] relative">
      {/* Canvas Header / Controls Bar */}
      <div className="h-12 px-6 border-b border-[#DFE5DD] bg-[#FFFFFF] flex items-center justify-between text-xs text-[#737B74] shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-[#242A25]">Agent-Memory Mesh Topology</span>
          <span className="text-[#DFE5DD]">|</span>
          <span>CoALA Multi-Tier Memory Routing</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleFitView}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#F6F6F0] hover:bg-[#E8F0E8] border border-[#DFE5DD] text-[#285943] text-xs font-medium transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit Graph</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas with explicit height */}
      <div className="w-full flex-1 min-h-[550px] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.3}
          maxZoom={1.8}
          className="bg-[#F6F6F0] w-full h-full"
        >
          <Background color="#DFE5DD" gap={24} size={1} />
          <Controls className="!bg-[#FFFFFF] !border-[#DFE5DD] !shadow-xs" />
        </ReactFlow>

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-5 left-5 z-10 bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-[#DFE5DD] shadow-xs text-[11px] space-y-1.5 max-w-xs">
          <div className="font-semibold text-[#242A25] flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#285943]" />
            <span>Memory Mesh Legend</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[#737B74]">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#285943]" />
              <span>Core Agent</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B7791F]" />
              <span>Working</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6B21A8]" />
              <span>Episodic</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0369A1]" />
              <span>Semantic</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8DAA91]" />
              <span>Procedural</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B54747]" />
              <span>Guardrail</span>
            </span>
          </div>
        </div>

        {/* Node Selection Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-88 max-h-[92%] rounded-xl bg-white border border-[#DFE5DD] shadow-lg p-5 overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#DFE5DD] pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-[#285943]" />
                <h4 className="text-sm font-semibold text-[#242A25]">{selectedNode.label}</h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#737B74] hover:text-[#242A25] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#737B74] font-medium">Memory Classification:</span>
                <span className="ml-2 font-mono text-[#285943] font-semibold">{selectedNode.type}</span>
              </div>
              <div>
                <span className="text-[#737B74] font-medium">Operational State:</span>
                <span className="ml-2 inline-flex items-center text-[#285943] font-medium capitalize">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {selectedNode.status}
                </span>
              </div>

              <div className="pt-2 border-t border-[#DFE5DD]">
                <span className="text-[#242A25] font-semibold block mb-1.5">Live State & Metadata:</span>
                <pre className="bg-[#F6F6F0] p-3 rounded-md text-[11px] text-[#242A25] font-mono overflow-x-auto border border-[#DFE5DD]">
                  {JSON.stringify(selectedNode.details, null, 2)}
                </pre>
              </div>

              <div className="pt-2 border-t border-[#DFE5DD] text-[#737B74] text-[11px] leading-relaxed">
                {selectedNode.type === 'agent' && (
                  <p>The central LangGraph node executing prompt assembly, reflection synthesis, and decision cycles.</p>
                )}
                {selectedNode.type === 'memory_working' && (
                  <p>Maintains the active conversation buffer and manages history summarization when thresholds are met.</p>
                )}
                {selectedNode.type === 'memory_episodic' && (
                  <p>Recalls reflections from past sessions (what worked, what to avoid) and indexes new learnings upon session milestones.</p>
                )}
                {selectedNode.type === 'memory_semantic' && (
                  <p>Provides factual domain knowledge retrieved through dense vector and BM25 hybrid search over indexed literature.</p>
                )}
                {selectedNode.type === 'memory_procedural' && (
                  <p>Stores 10 executable guidelines that guide response length, clarity, empathetic responses, and active listening.</p>
                )}
                {selectedNode.type === 'guardrail' && (
                  <p>Analyzes incoming prompts before state execution to intercept prompt injections and prevent system prompt leakage.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const EditorialMemoryGraph: React.FC = () => {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
};
