import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { AstNode } from '../types/compiler';
import { GitFork, ZoomIn, ZoomOut, Maximize2, RefreshCw, X } from 'lucide-react';

interface AstGraphProps {
  ast?: AstNode | null;
  onSelectLine?: (line: number) => void;
  isLoading?: boolean;
}

const AstCustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const getNodeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'program':
        return 'border-blue-500 bg-blue-50/90 text-blue-900';
      case 'functiondecl':
        return 'border-indigo-500 bg-indigo-50/90 text-indigo-900';
      case 'binaryexpr':
        return 'border-amber-500 bg-amber-50/90 text-amber-900';
      case 'vardecl':
      case 'vardeclgroup':
        return 'border-teal-500 bg-teal-50/90 text-teal-900';
      case 'literal':
        return 'border-emerald-500 bg-emerald-50/90 text-emerald-900';
      case 'identifier':
        return 'border-sky-500 bg-sky-50/90 text-sky-900';
      default:
        return 'border-slate-300 bg-white text-slate-800';
    }
  };

  return (
    <div
      className={`relative px-2.5 py-1.5 rounded border text-center transition-all cursor-pointer min-w-[120px] max-w-[190px] ${getNodeColor(
        data.type
      )} ${selected ? 'ring-2 ring-blue-600 shadow-sm' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-1.5 h-1.5 bg-slate-400 border border-white"
      />

      <div className="flex items-center justify-between gap-1 text-[9.5px] uppercase font-semibold opacity-70">
        <span className="truncate">{data.type}</span>
        {data.line && <span className="font-mono">L{data.line}</span>}
      </div>

      <div className="font-mono text-xs font-bold truncate text-slate-900 mt-0.5">
        {data.label}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-1.5 h-1.5 bg-slate-400 border border-white"
      />
    </div>
  );
};

const nodeTypes = {
  astNode: AstCustomNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 35,
    ranksep: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 140, height: 50 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 70,
        y: nodeWithPosition.y - 25,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const flattenAst = (root: AstNode) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let idCounter = 0;

  const traverse = (node: AstNode, parentId?: string) => {
    const currentId = `ast_${idCounter++}`;
    nodes.push({
      id: currentId,
      type: 'astNode',
      data: {
        type: node.type,
        label: node.label,
        line: node.line,
        rawChildrenCount: node.children?.length || 0,
      },
      position: { x: 0, y: 0 },
    });

    if (parentId) {
      edges.push({
        id: `e_${parentId}_${currentId}`,
        source: parentId,
        target: currentId,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: '#94a3b8',
        },
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      });
    }

    if (node.children) {
      node.children.forEach((child) => traverse(child, currentId));
    }
  };

  traverse(root);
  return { nodes, edges };
};

const AstGraphInner: React.FC<AstGraphProps> = ({ ast, onSelectLine, isLoading }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const reactFlowInstance = useReactFlow();

  const relayout = useCallback(() => {
    if (!ast) return;
    const { nodes: rawNodes, edges: rawEdges } = flattenAst(ast);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rawNodes,
      rawEdges,
      'TB'
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 50);
  }, [ast, reactFlowInstance, setNodes, setEdges]);

  useEffect(() => {
    relayout();
  }, [ast, relayout]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data);
    if (node.data.line && onSelectLine) {
      onSelectLine(node.data.line);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ast) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <GitFork className="w-8 h-8 mb-2 stroke-[1.5]" />
        <p className="text-xs">Compile code to inspect AST</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Controls Bar */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-2xs">
        <button
          onClick={() => reactFlowInstance.zoomIn()}
          className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => reactFlowInstance.zoomOut()}
          className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
          className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded"
          title="Fit View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-0.5" />
        <button
          onClick={relayout}
          className="px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded flex items-center gap-1"
          title="Reset Layout"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Selected Node Box */}
      {selectedNodeData && (
        <div className="absolute top-2.5 right-2.5 z-10 w-64 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg p-3 text-xs">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Node Details
            </span>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-[11.5px]">
            <div>
              <span className="text-slate-400 font-sans text-[10px] uppercase block">Type</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {selectedNodeData.type}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans text-[10px] uppercase block">Label</span>
              <span className="text-slate-800 dark:text-slate-200">
                {selectedNodeData.label}
              </span>
            </div>
            {selectedNodeData.line && (
              <div>
                <span className="text-slate-400 font-sans text-[10px] uppercase block">Line</span>
                <span className="text-slate-700 dark:text-slate-300">
                  Line {selectedNodeData.line}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
      />
    </div>
  );
};

export const AstGraph: React.FC<AstGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <AstGraphInner {...props} />
    </ReactFlowProvider>
  );
};
