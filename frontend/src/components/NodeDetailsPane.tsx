import "./NodeDetailsPane.css";
import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { NodeDetails } from "../types/graph";

type Props = {
  node: NodeDetails | null;
};

export default function NodeDetailsPanel({ node }: Props) {
  const [width, setWidth] = useState(360);
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number>(360);

  function onDragStart(event: ReactMouseEvent<HTMLDivElement>) {
    dragStartX.current = event.clientX;
    dragStartWidth.current = width;

    function onMouseMove(moveEvent: MouseEvent) {
      if (dragStartX.current === null) return;
      const deltaX = dragStartX.current - moveEvent.clientX;
      const nextWidth = Math.max(280, Math.min(window.innerWidth * 0.7, dragStartWidth.current + deltaX));
      setWidth(nextWidth);
    }

    function onMouseUp() {
      dragStartX.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <aside className={`details-panel ${node ? "open" : ""}`} style={{ width }}>
      <div
        className="details-resize-handle"
        onMouseDown={onDragStart}
        role="separator"
        title="Drag to resize"
        aria-label="Resize details pane"
        aria-orientation="vertical"
      />
      <div className="details-content">
        {node ? (
          <>
            <h2>{node.fqdn ?? node.ip}</h2>
            <p>{node.ip}</p>
            <p>{node.subnet}</p>
            <h3>Connections</h3>
            {node.portTargets.length > 0 ? (
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Port</th>
                    <th>FQDN</th>
                    <th>To Port</th>
                    <th>PID</th>
                    <th>Process</th>
                  </tr>
                </thead>
                <tbody>
                  {node.portTargets.map((target) => (
                    <tr key={`${target.port}-${target.remote_port}-${target.fqdn}-${target.pid}-${target.processName ?? ""}`}>
                      <td>{target.port}</td>
                      <td>{target.fqdn}</td>
                      <td>{target.remote_port}</td>
                      <td>{target.pid > 0 ? target.pid : "-"}</td>
                      <td>{target.processName ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No connections found.</p>
            )}
          </>
        ) : (
            <p>Select a node to see details.</p>
          )}
      </div>
    </aside>
  );
}
