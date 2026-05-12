import "./NodeDetailsPane.css";
import { useMemo, useState } from "react";
import { buildEffectiveFilters, matchesEdgeFilters, matchesNodeConnectionFilters } from "../filters/matchesFilter";
import type { filter } from "../types/filter";
import type { EdgeDetails, GraphEdge, NodeDetails, NodePortTarget } from "../types/graph";
import { getServiceName, isDynamicPort } from "../utils/portServices";

type Props = {
  node: NodeDetails | null;
  edge: EdgeDetails | null;
  filters: filter[];
  searchQuery: string;
};

type PaneMode = "auto" | "minimized";
type AggregatedEdgeConnection = {
  connection: GraphEdge;
  seenCount: number;
};

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

function renderLastSeen(value: string) {
  const parsed = Date.parse(value);
  const isValid = Number.isFinite(parsed);
  const display = isValid
    ? new Date(parsed).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "medium" })
    : value;

  return (
    <time className={`last-seen-chip ${isValid ? "" : "invalid"}`} dateTime={isValid ? new Date(parsed).toISOString() : undefined} title={value}>
      {display}
    </time>
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
  const visibleNodeConnectionCount = useMemo(
    () => visibleTargets.reduce((sum, target) => sum + target.seenCount, 0),
    [visibleTargets],
  );
  const aggregatedVisibleEdgeConnections = useMemo<AggregatedEdgeConnection[]>(() => {
    const groups = new Map<string, AggregatedEdgeConnection>();

    for (const connection of visibleEdgeConnections) {
      const key = `${connection.source_port}-${connection.target_port}-${connection.source_pid ?? connection.pid ?? -1}-${connection.source_process_name ?? connection.process_name ?? ""}-${connection.target_pid ?? connection.pid ?? -1}-${connection.target_process_name ?? connection.process_name ?? ""}`;
      const seenCount = Math.max(connection.seen_count ?? 1, 1);
      const existing = groups.get(key);
      if (existing) {
        existing.seenCount += seenCount;
        continue;
      }
      groups.set(key, { connection, seenCount });
    }

    return Array.from(groups.values()).sort((a, b) =>
      b.seenCount - a.seenCount
      || a.connection.source_port - b.connection.source_port
      || a.connection.target_port - b.connection.target_port,
    );
  }, [visibleEdgeConnections]);
  const visibleEdgeConnectionCount = useMemo(
    () => aggregatedVisibleEdgeConnections.reduce((sum, entry) => sum + entry.seenCount, 0),
    [aggregatedVisibleEdgeConnections],
  );

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
                <div className="details-header-metrics">
                  <span className="details-count-pill">{visibleTargets.length} aggregated rows</span>
                  <span className="details-count-pill emphasis">{visibleNodeConnectionCount} connections</span>
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
              <p className="details-aggregation-note">
                Process/PID values are representative aggregated values (max PID per side), not guaranteed to be the latest sample.
                  <br />
                The dynamic port is latest seen port for the connection, but may not be the only ports used in the connection history.
              </p>
              {visibleTargets.length > 0 ? (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Direction</th>
                      <th>Local Service</th>
                      <th>Local Port</th>
                      <th>Local Process</th>
                      <th>Peer Host</th>
                      <th>Peer Ip</th>
                      <th>Peer Service</th>
                      <th>Peer Port</th>
                      <th>Connections</th>
                      <th>Last Seen</th>
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
                        <td>{target.port}</td>
                        <td>{renderProcessName(target.processName, target.pid)}</td>
                        <td>{target.fqdn}</td>
                        <td>{target.ip}</td>
                        <td>{renderPortService(target.remote_port)}</td>
                        <td>{target.remote_port}</td>
                        <td>{target.seenCount}</td>
                        <td className="last-seen-cell">{renderLastSeen(target.lastSeen)}</td>
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
                <div className="details-header-metrics">
                  <span className="details-count-pill">{aggregatedVisibleEdgeConnections.length} aggregated rows</span>
                  <span className="details-count-pill emphasis">{visibleEdgeConnectionCount} connections</span>
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
              <p className="details-aggregation-note">
                Process/PID values are representative aggregated values (max PID per side), not guaranteed to be the latest sample.
              </p>
              {aggregatedVisibleEdgeConnections.length > 0 ? (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>From Service</th>
                      <th>From Process</th>
                      <th>To Service</th>
                      <th>To Process</th>
                      <th>Connections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedVisibleEdgeConnections.map(({ connection, seenCount }, index) => (
                      <tr key={`${edge.id}-${connection.source_port}-${connection.target_port}-${connection.source_pid ?? connection.pid ?? 0}-${connection.source_process_name ?? connection.process_name ?? ""}-${connection.target_pid ?? connection.pid ?? 0}-${connection.target_process_name ?? connection.process_name ?? ""}-${index}`}>
                        <td>{renderPortService(connection.source_port)}</td>
                        <td>{renderProcessName(connection.source_process_name ?? connection.process_name ?? null, connection.source_pid ?? connection.pid ?? 0)}</td>
                        <td>{renderPortService(connection.target_port)}</td>
                        <td>{renderProcessName(connection.target_process_name ?? connection.process_name ?? null, connection.target_pid ?? connection.pid ?? 0)}</td>
                        <td>{seenCount}</td>
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
