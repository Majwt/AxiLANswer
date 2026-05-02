
import "./GraphView.css";
import { useEffect, useRef } from "react";
import Sigma from "sigma";
import type { GraphData, NodeDetails } from "../types/graph.ts";
import { createGraph } from "../graph/createGraph.ts";
import ForceSupervisor from "graphology-layout-force/worker";
import type Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { SigmaNodeEventPayload, MouseCoords } from "sigma/types";
import { EdgeArrowProgram } from "sigma/rendering";
import { EdgeCurvedArrowProgram } from "@sigma/edge-curve";
import type { NodeHoverDrawingFunction, NodeLabelDrawingFunction } from "sigma/rendering";

type props = {
  data: GraphData;
  onSelectNode: (node: string, attrs: NodeDetails | null) => void;
};

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

export default function GraphView({ data, onSelectNode }: props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);


  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-h")
    .trim();
  const backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = createGraph(data);



    const renderer = new Sigma(graph, containerRef.current, {
      edgeProgramClasses: {
        arrow: EdgeArrowProgram,
        curvedArrow: EdgeCurvedArrowProgram,
      },
      labelColor: { color: textColor },
      defaultDrawNodeLabel: createNodeLabelDrawer(textColor, backgroundColor),
      defaultDrawNodeHover: createNodeHoverLabelDrawer(),
    });

    // background grid
    // --------------------------------
    const gridLayer = document.createElement("div");
    gridLayer.className = "graphview-grid";
    gridLayer.setAttribute("aria-hidden", "true");
    containerRef.current.appendChild(gridLayer);
    gridRef.current = gridLayer;

    const camera = renderer.getCamera();
    const setInitialCamera = () => {
      renderer.refresh();
      camera.animatedReset({ duration: 0 });
      camera.updateState((state) => ({ ratio: state.ratio * 1.6 }));
    };

    const onWheel = (event: WheelEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const delta = event.deltaY * -3 / 360;
      if (!delta) return;

      const bounds = container.getBoundingClientRect();
      const target = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      const currentRatio = camera.getState().ratio;
      const zoomingRatio = renderer.getSetting("zoomingRatio");
      const newRatio = camera.getBoundedRatio(
        currentRatio * (delta > 0 ? 1 / zoomingRatio : zoomingRatio),
      );

      if (currentRatio === newRatio) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      camera.setState(
        renderer.getViewportZoomedState(target, newRatio),
      );
    };
    containerRef.current.addEventListener("wheel", onWheel, { passive: false });

    const updateGrid = () => {
      if (!gridRef.current) return;

      const origin = renderer.graphToViewport({ x: 0, y: 0 });
      const xStep = renderer.graphToViewport({ x: 1, y: 0 });
      const yStep = renderer.graphToViewport({ x: 0, y: 1 });

      const pixelsPerGraphUnit = (Math.abs(xStep.x - origin.x) + Math.abs(yStep.y - origin.y)) / 2;
      if (pixelsPerGraphUnit <= 0) return;

      const targetSpacingPx = 85;
      const minSpacingPx = 75;
      const maxSpacingPx = 100;
      const rawUnitsStep = targetSpacingPx / pixelsPerGraphUnit;
      const exponent = Math.floor(Math.log10(rawUnitsStep));

      let bestStep = rawUnitsStep;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let exp = exponent - 1; exp <= exponent + 2; exp += 1) {
        const base = 10 ** exp;
        for (const factor of [1, 2, 5]) {
          const unitsStep = factor * base;
          const spacingPx = unitsStep * pixelsPerGraphUnit;
          const inRangePenalty = spacingPx < minSpacingPx || spacingPx > maxSpacingPx ? 1000 : 0;
          const score = Math.abs(spacingPx - targetSpacingPx) + inRangePenalty;
          if (score < bestScore) {
            bestScore = score;
            bestStep = unitsStep;
          }
        }
      }

      const spacing = Math.max(6, bestStep * pixelsPerGraphUnit);
      const offsetX = ((origin.x % spacing) + spacing) % spacing;
      const offsetY = ((origin.y % spacing) + spacing) % spacing;

      gridRef.current.style.setProperty("--grid-spacing", `${spacing}px`);
      gridRef.current.style.setProperty("--grid-offset-x", `${offsetX}px`);
      gridRef.current.style.setProperty("--grid-offset-y", `${offsetY}px`);
    };

    camera.on("updated", updateGrid);
    window.addEventListener("resize", updateGrid);
    updateGrid();
    // --------------------------------
    //
    renderer.on("clickNode", ({ node }) => {
      const attrs = graph.getNodeAttributes(node) as NodeDetails;
      onSelectNode(node, attrs);
    });

    renderer.on("clickStage", () => {
      onSelectNode("", null);
    });

    const useForceAtlas2 = true; // toggle between ForceAtlas2 and ForceSupervisor
    if (useForceAtlas2) {

      // Force Layout
      forceAtlas2.assign(graph, {
        iterations: 100,
        settings: {
          gravity: 2.5,
          scalingRatio: 2,
          strongGravityMode: false,
        },
      });
      setInitialCamera();

    }
    else {
      // -- Enable force layout with fixed nodes --
      const layout = new ForceSupervisor(graph, {
        isNodeFixed: (_, attr) => attr.fixed, settings: {
          attraction: 0.0005,
          repulsion: 0.2,
        },
      });
      layout.start();
      // enable moving with mouse
      enableNodeDragging(renderer, graph, layout);
      // -- 
      setInitialCamera();

    }

    return () => {
      containerRef.current?.removeEventListener("wheel", onWheel);
      camera.removeListener("updated", updateGrid);
      window.removeEventListener("resize", updateGrid);
      gridRef.current?.remove();
      gridRef.current = null;
      renderer.kill();
      // layout?.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, textColor, backgroundColor]);

  return <div ref={containerRef} className="graphview-canvas" />;
}

function enableNodeDragging(
  renderer: Sigma,
  graph: Graph,
  supervisor?: ForceSupervisor
) {
  let draggedNode: string | null = null;
  let isDragging = false;

  const onDownNode = (e: SigmaNodeEventPayload) => {
    isDragging = true;
    draggedNode = e.node;

    graph.setNodeAttribute(draggedNode, "fixed", true);
    renderer.getCamera().disable();

    supervisor?.stop(); // optional
  };

  const onMouseMove = (e: MouseCoords) => {
    if (!isDragging || !draggedNode) return;

    const pos = renderer.viewportToGraph(e);

    graph.setNodeAttribute(draggedNode, "x", pos.x);
    graph.setNodeAttribute(draggedNode, "y", pos.y);

    e.preventSigmaDefault();
    e.original.preventDefault();
    e.original.stopPropagation();
  };

  const onMouseUp = () => {
    if (draggedNode) {
      graph.removeNodeAttribute(draggedNode, "fixed");
    }

    isDragging = false;
    draggedNode = null;

    renderer.getCamera().enable();
    supervisor?.start(); // optional
  };

  renderer.on("downNode", onDownNode);
  renderer.getMouseCaptor().on("mousemovebody", onMouseMove);
  renderer.getMouseCaptor().on("mouseup", onMouseUp);

  // cleanup function
  return () => {
    renderer.removeListener("downNode", onDownNode);
    renderer.getMouseCaptor().removeListener("mousemovebody", onMouseMove);
    renderer.getMouseCaptor().removeListener("mouseup", onMouseUp);
  };
}
