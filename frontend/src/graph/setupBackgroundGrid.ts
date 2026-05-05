import type Sigma from "sigma";

export function setupBackgroundGrid(
  renderer: Sigma,
  container: HTMLElement,
  gridRef: React.RefObject<HTMLDivElement | null> ,
) {
  const gridLayer = document.createElement("div");
  gridLayer.className = "graphview-grid";
  gridLayer.setAttribute("aria-hidden", "true");
  container.appendChild(gridLayer);
  gridRef.current = gridLayer;

  const camera = renderer.getCamera();

  const updateGrid = () => {
    if (!gridRef.current) return;

    const origin = renderer.graphToViewport({ x: 0, y: 0 });
    const xStep = renderer.graphToViewport({ x: 1, y: 0 });
    const yStep = renderer.graphToViewport({ x: 0, y: 1 });

    const pixelsPerGraphUnit =
      (Math.abs(xStep.x - origin.x) + Math.abs(yStep.y - origin.y)) / 2;

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
        const inRangePenalty =
          spacingPx < minSpacingPx || spacingPx > maxSpacingPx ? 1000 : 0;

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

  return () => {
    camera.removeListener("updated", updateGrid);
    window.removeEventListener("resize", updateGrid);
    gridRef.current?.remove();
    gridRef.current = null;
  };
}
