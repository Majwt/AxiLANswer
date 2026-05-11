import "./NodeDetailsPane.css";
import { useMemo, useState } from "react";
import { buildEffectiveFilters, matchesEdgeFilters, matchesNodeConnectionFilters } from "../filters/matchesFilter";
import type { filter } from "../types/filter";
import type { EdgeDetails, NodeDetails, NodePortTarget } from "../types/graph";
import { getServiceName, isDynamicPort } from "../utils/portServices";

type Props = {
  node: NodeDetails | null;
  edge: EdgeDetails | null;
  filters: filter[];
  searchQuery: string;
};

type PaneMode = "auto" | "minimized";

function renderPortService(port: number) {
  const label = getServiceName(port);
  return (
    <span className={`port-service ${isDynamicPort(port) ? "dynamic" : ""}`} title={`Port ${port}`}>
      {label}
    </span>
  );
}

function renderProcessName(processName: string | null, pid: number) {
  const label = processName ?? "Unknown Process";
  return (
    <span className={`port-service`} title={`PiD ${pid}`}>
      {label}
    </span>
  );
}

function renderFqdnWithTooltip(fqdn: string, ip: string) {
  const label = fqdn;
  return (
    <span className="port-service" title={`IP: ${ip}`}>
      {label}
    </span>
  );
}

function getDirectionMeta(target: NodePortTarget) {
  return target.direction === "outgoing"
    ? { glyph: "↗", label: "Outgoing" }
    : { glyph: "↘", label: "Incoming" };
}

export default function NodeDetailsPanel({ node, edge, filters, searchQuery }: Props) {
  const [paneMode, setPaneMode] = useState<PaneMode>("auto");
  const effectiveFilters = useMemo(() => buildEffectiveFilters(filters, searchQuery), [filters, searchQuery]);
  const visibleTargets = useMemo(() => {
    if (!node) return [];
    return node.portTargets.filter((target) => matchesNodeConnectionFilters(node, target, effectiveFilters));
  }, [node, effectiveFilters]);
  const visibleEdgeConnections = useMemo(() => {
    if (!edge) return [];
    const sourceNode: NodeDetails = {
      label: edge.source_fqdn,
      ip: edge.source_ip,
      fqdn: edge.source_fqdn,
      color: "",
      subnet: "",
      portTargets: [],
      size: 0,
      x: 0,
      y: 0,
    };
    const targetNode: NodeDetails = {
      label: edge.target_fqdn,
      ip: edge.target_ip,
      fqdn: edge.target_fqdn,
      color: "",
      subnet: "",
      portTargets: [],
      size: 0,
      x: 0,
      y: 0,
    };

    return edge.connections.filter((connection) =>
      matchesEdgeFilters({ sourceNode, targetNode, connections: [connection] }, effectiveFilters),
    );
  }, [edge, effectiveFilters]);

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
          <span aria-hidden="true">▲</span>
        </button>
      ) : (
        <div className="details-content">
          {node ? (
            <div className="details-node-info">
              <header className="details-header">
                <span className="details-header-fqdn">{node.fqdn}</span>
                <div className="details-header-subtitle">
                  <span className="details-header-ip">{node.ip}</span>
                  {node.subnet && (
                    <span className="details-header-subnet">({node.subnet})</span>
                  )}
                </div>
                <button
                  type="button"
                  className="details-minimize-button"
                  onClick={() => setPaneMode("minimized")}
                  title="Minimize details pane"
                  aria-label="Minimize details pane"
                >
                  <span aria-hidden="true">▾</span>
                </button>
              </header>
              {visibleTargets.length > 0 ? (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Direction</th>
                      <th>Service</th>
                      <th>FQDN</th>
                      <th>Peer Service</th>
                      <th>Process</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTargets.map((target) => (
                      <tr key={`${target.port}-${target.remote_port}-${target.fqdn}-${target.ip}-${target.direction}-${target.pid}-${target.processName ?? ""}`}>
                        <td>
                          <span className={`direction-pill ${target.direction}`} title={getDirectionMeta(target).label}>
                            <span className="direction-glyph" aria-hidden="true">{getDirectionMeta(target).glyph}</span>
                            {getDirectionMeta(target).label}
                          </span>
                        </td>
                        <td>{renderPortService(target.port)}</td>
                        <td>{renderFqdnWithTooltip(target.fqdn, target.ip)}</td>
                        <td>{renderPortService(target.remote_port)}</td>
                        <td>{renderProcessName(target.processName, target.pid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No connections match current filters.</p>
              )}
            </div>
          ) : edge ? (
            <div className="details-node-info">
              <header className="details-header">
                <span className="details-header-fqdn">{edge.source_fqdn} → {edge.target_fqdn}</span>
                <div className="details-header-subtitle">
                  <span className="details-header-ip">{edge.source_ip} → {edge.target_ip}</span>
                </div>
                <button
                  type="button"
                  className="details-minimize-button"
                  onClick={() => setPaneMode("minimized")}
                  title="Minimize details pane"
                  aria-label="Minimize details pane"
                >
                  <span aria-hidden="true">▾</span>
                </button>
              </header>
              {visibleEdgeConnections.length > 0 ? (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Source Service</th>
                      <th>Source Process</th>
                      <th>Target Service</th>
                      <th>Target Process</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEdgeConnections.map((connection, index) => (
                      <tr key={`${edge.id}-${connection.source_port}-${connection.target_port}-${connection.source_pid ?? connection.pid ?? 0}-${connection.source_process_name ?? connection.process_name ?? ""}-${connection.target_pid ?? connection.pid ?? 0}-${connection.target_process_name ?? connection.process_name ?? ""}-${index}`}>
                        <td>{renderPortService(connection.source_port)}</td>
                        <td>{renderProcessName(connection.source_process_name ?? connection.process_name ?? null, connection.source_pid ?? connection.pid ?? 0)}</td>
                        <td>{renderPortService(connection.target_port)}</td>
                        <td>{renderProcessName(connection.target_process_name ?? connection.process_name ?? null, connection.target_pid ?? connection.pid ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No connections match current filters.</p>
              )}
            </div>
          ) : (
            <p id="no-node-selected">Select a node or edge to see details.</p>
          )}
        </div>
      )}
    </aside>
  );
}
