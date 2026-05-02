import Graph from "graphology";
import type { GraphData, NodeDetails } from "../types/graph";
import { addNodes } from "./addNodes";
import { addEdges } from "./addEdges";
import { setupCurvedEdges } from "./setupCurvedEdges";
import Sigma from "sigma";
import { EdgeCurvedArrowProgram } from "@sigma/edge-curve";
import { EdgeArrowProgram, type NodeHoverDrawingFunction, type NodeLabelDrawingFunction } from "sigma/rendering";
import type { Attributes } from "react";

/**
 * Creates a Graphology graph from the given GraphData.
 *
 * @param data - The graph data containing nodes and edges.
 *
 */
export function createGraph(containerRef: HTMLDivElement, onSelectNode: (node: string, attrs: NodeDetails | null) => void, data: GraphData, colors: { text: string, background: string }): [Sigma, Graph] {
  const graph = new Graph({
    multi: true,
    type: "directed",
  });

  addNodes(graph, data);

  addEdges(graph, data, true);

  setupCurvedEdges(graph);
  let selectedNodeId: string | null = null;
  let connectedNodeIds = new Set<string>();

  const renderer = new Sigma(graph, containerRef, {
    defaultEdgeType: "straight",
    edgeProgramClasses: {
      straight: EdgeArrowProgram,
      curvedArrow: EdgeCurvedArrowProgram,
      curved: EdgeCurvedArrowProgram,
    },
    labelColor: { color: colors.text },
    defaultDrawNodeLabel: createNodeLabelDrawer(colors.text, colors.background),
    defaultDrawNodeHover: createNodeHoverLabelDrawer(),
    nodeReducer: (node, nodeData) => nodeReducer(node, connectedNodeIds, selectedNodeId, nodeData),
    edgeReducer: (edge, edgeData) => {
      if (!selectedNodeId) return { ...edgeData };

      const [source, target] = graph.extremities(edge);
      const isConnectedEdge = source === selectedNodeId || target === selectedNodeId;

      return {
        ...edgeData,
        hidden: !isConnectedEdge,
      };
    },
  });

  renderer.on("clickNode", ({ node }) => {
    selectedNodeId = node;
    connectedNodeIds = new Set([node]);
    graph.forEachNeighbor(node, (neighbor) => connectedNodeIds.add(neighbor));
    renderer.refresh();
    const attrs = graph.getNodeAttributes(node) as NodeDetails;
    onSelectNode(node, attrs);

  });

  renderer.on("clickStage", () => {
    selectedNodeId = null;
    connectedNodeIds = new Set();
    renderer.refresh();
    onSelectNode("", null);
  });

  return [renderer, graph];
}

function nodeReducer(node: string, connectedNodeIds: Set<string>, selectedNodeId: string | null, nodeData: any) {
  if (!selectedNodeId) return { ...nodeData };

  const isConnected = connectedNodeIds.has(node);

  if (!isConnected) {
    return {
      ...nodeData,
      color: "#2a2f36",
      highlighted: false,
      forceLabel: false,
      zIndex: 1,
      size: Math.max(nodeData.size * 0.9, 6),
    };
  }

  if (node === selectedNodeId) {
    return {
      ...nodeData,
      highlighted: true,
      forceLabel: true,
      zIndex: 10,
      size: nodeData.size * 1.3,
    };
  }

  return {
    ...nodeData,
    zIndex: 1,
  };

}


function createNodeLabelDrawer(textColor: string, backgroundColor: string): NodeLabelDrawingFunction {
  return (context, data, settings) => {
    if (!data.label) return;

    const fontSize = settings.labelSize;
    const font = `${settings.labelWeight} ${fontSize}px ${settings.labelFont}`;
    context.font = font;

    const label = String(data.label);
    const paddingX = 6;
    const paddingY = 3;
    const labelX = data.x + data.size + 4;
    const labelY = data.y + fontSize / 3;
    const textWidth = context.measureText(label).width;
    const boxX = labelX - paddingX;
    const boxY = labelY - fontSize - paddingY;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;

    context.save();
    context.fillStyle = backgroundColor;
    context.globalAlpha = 0.82;
    drawRoundedRect(context, boxX, boxY, boxWidth, boxHeight, 6);
    context.fill();

    context.globalAlpha = 1;
    context.fillStyle = textColor;
    context.font = font;
    context.fillText(label, labelX, labelY);
    context.restore();
  };
}

function createNodeHoverLabelDrawer(): NodeHoverDrawingFunction {
  return (context, data, settings) => {
    if (!data.label) return;

    const fontSize = settings.labelSize + 1;
    const font = `700 ${fontSize}px ${settings.labelFont}`;
    context.font = font;

    const label = String(data.label);
    const paddingX = 7;
    const paddingY = 4;
    const labelX = data.x + data.size + 5;
    const labelY = data.y + fontSize / 3;
    const textWidth = context.measureText(label).width;
    const boxX = labelX - paddingX;
    const boxY = labelY - fontSize - paddingY;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;

    context.save();
    context.fillStyle = "#000000";
    context.globalAlpha = 0.88;
    drawRoundedRect(context, boxX, boxY, boxWidth, boxHeight, 7);
    context.fill();

    context.globalAlpha = 0.45;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1;
    context.stroke();

    context.globalAlpha = 1;
    context.fillStyle = "#ffffff";
    context.font = font;
    context.fillText(label, labelX, labelY);
    context.restore();
  };
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

