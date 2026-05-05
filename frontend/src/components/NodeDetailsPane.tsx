import "./NodeDetailsPane.css";
import { useState } from "react";
import type { NodeDetails } from "../types/graph";

type Props = {
  node: NodeDetails | null;
};

type PaneMode = "auto" | "minimized";

export default function NodeDetailsPanel({ node }: Props) {
  const [paneMode, setPaneMode] = useState<PaneMode>("auto");

  return (
    <aside className={`details-panel ${paneMode}`}>
      {paneMode === "minimized" ? (
        <button
          type="button"
          className="details-minimized-strip"
          onClick={() => setPaneMode("auto")}
          title="Restore auto size"
          aria-label="Restore details pane auto size"
        >
          <span aria-hidden="true">◀</span>
        </button>
      ) : (
        <div className="details-content">
          <button type="button" className="details-minimize-button" onClick={() => setPaneMode("minimized")}>
            Minimize
          </button>
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
            <p id="no-node-selected">Select a node to see details.</p>
          )}
        </div>
      )}
    </aside>
  );
}
