import Graph from "graphology";
import type { GraphData } from "../types/graph";
import { addNodes } from "./addNodes";
import { addEdges } from "./addEdges";
import { setupCurvedEdges } from "./setupCurvedEdges";
import Sigma from "sigma";
import { EdgeCurvedArrowProgram } from "@sigma/edge-curve";
import { EdgeArrowProgram, type NodeHoverDrawingFunction, type NodeLabelDrawingFunction } from "sigma/rendering";

/**
 * Creates a Graphology graph from the given GraphData.
 *
 * @param data - The graph data containing nodes and edges.
 * @param colors - An object containing text and background colors for node labels.
 * @returns A tuple containing the Sigma renderer instance and the Graphology graph instance.
 *
 */
export function createGraph(containerRef: HTMLDivElement, data: GraphData, colors: { text: string, background: string }): [Sigma, Graph] {
  const graph = new Graph({
    multi: true,
    type: "directed",
  });

  addNodes(graph, data);

  addEdges(graph, data, true);

  setupCurvedEdges(graph);

  const renderer = new Sigma(graph, containerRef, {
    zIndex: true,
    enableEdgeEvents: true,
    defaultEdgeType: "straight",
    edgeProgramClasses: {
      straight: EdgeArrowProgram,
      curvedArrow: EdgeCurvedArrowProgram,
      curved: EdgeCurvedArrowProgram,
    },
    labelSize: 13,
    labelColor: { color: colors.text },
    defaultDrawNodeLabel: createNodeLabelDrawer(colors.text, colors.background),
    defaultDrawNodeHover: createNodeHoverLabelDrawer(),
  });


  return [renderer, graph];
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
    const textWidth = context.measureText(label).width;
    const labelX = data.x - textWidth / 2;
    const labelY = data.y - data.size - 8;
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
    const textWidth = context.measureText(label).width;
    const labelX = data.x - textWidth / 2;
    const labelY = data.y - data.size - 9;
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
