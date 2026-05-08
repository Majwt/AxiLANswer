import "./NodeDetailsPane.css";
import { useMemo, useState } from "react";
import { buildEffectiveFilters, matchesNodeConnectionFilters } from "../filters/matchesFilter";
import type { filter } from "../types/filter";
import type { NodeDetails, NodePortTarget } from "../types/graph";
import { getServiceName, isDynamicPort } from "../utils/portServices";

type Props = {
  node: NodeDetails | null;
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

export default function NodeDetailsPanel({ node, filters, searchQuery }: Props) {
  const [paneMode, setPaneMode] = useState<PaneMode>("auto");
  const effectiveFilters = useMemo(() => buildEffectiveFilters(filters, searchQuery), [filters, searchQuery]);
  const visibleTargets = useMemo(() => {
    if (!node) return [];
    return node.portTargets.filter((target) => matchesNodeConnectionFilters(node, target, effectiveFilters));
  }, [node, effectiveFilters]);

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
          ) : (
            <p id="no-node-selected">Select a node to see details.</p>
          )}
        </div>
      )}
    </aside>
  );
}
