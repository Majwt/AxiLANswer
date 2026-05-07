import { fuzzy } from "fast-fuzzy";
import type { filter } from "../types/filter";
import type { GraphEdge, NodeDetails } from "../types/graph";

export type EdgeFilterContext = {
  sourceNode: NodeDetails;
  targetNode: NodeDetails;
  connections: GraphEdge[];
};

export function matchesEdgeFilters(edge: EdgeFilterContext, filters: filter[]): boolean {
  return filters.every((entry) => matchesEdgeFilter(edge, entry));
}

function matchesEdgeFilter(edge: EdgeFilterContext, entry: filter): boolean {
  const value = entry.value.trim();
  if (!value) return true;

  if (entry.type === "port") {
    const port = Number(value);
    if (Number.isNaN(port)) return true;

    const matchesPort = edge.connections.some(
      (connection) => port === connection.source_port || port === connection.target_port,
    );

    return applyOperation(matchesPort, entry.operation);
  }

  if (entry.type === "ip") {
    const lowerValue = value.toLowerCase();
    const ipMatches = edge.sourceNode.ip.toLowerCase() === lowerValue || edge.targetNode.ip.toLowerCase() === lowerValue;
    return applyOperation(ipMatches, entry.operation);
  }

  if (entry.type === "fqdn") {
    const fqdnMatches = matchesFqdn(edge.sourceNode.fqdn, value) || matchesFqdn(edge.targetNode.fqdn, value);
    return applyOperation(fqdnMatches, entry.operation);
  }

  if (entry.type === "process") {
    const lowerValue = value.toLowerCase();
    const processMatches = edge.connections.some((connection) =>
      (connection.process_name ?? "").toLowerCase().includes(lowerValue),
    );
    return applyOperation(processMatches, entry.operation);
  }

  return true;
}

function applyOperation(matches: boolean, operation: filter["operation"]): boolean {
  return operation === "include" ? matches : !matches;
}

function normalizeFqdn(s: string): string {
  return s.trim().toLowerCase().replace(/\.$/, "");
}

function matchesFqdn(fqdn: string, rawPattern: string): boolean {
  const host = normalizeFqdn(fqdn);
  const pattern = normalizeFqdn(rawPattern);
  const firstLabel = host.split(".")[0] ?? "";

  if (!pattern) return true;

  if (pattern.startsWith(".")) return host.endsWith(pattern);

  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return firstLabel.startsWith(prefix);
  }

  if (!pattern.includes(".")) return firstLabel.startsWith(pattern);

  if (host === pattern) return true;

  return matchesFqdnFuzzy(host, firstLabel, pattern);
}

function matchesFqdnFuzzy(host: string, firstLabel: string, pattern: string): boolean {
  if (pattern.length < 1) return false;

  const fullScore = fuzzy(pattern, host);
  const labelScore = fuzzy(pattern, firstLabel);

  return Math.max(fullScore, labelScore) >= 0.78;
}
