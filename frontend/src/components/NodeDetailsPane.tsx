import type { NodeDetails } from "../types/graph";

type Props = {
  node: NodeDetails | null;
  onClose: () => void;
};

export default function NodeDetailsPanel({ node, onClose }: Props) {
  return (
    <aside className={`details-panel ${node ? "open" : ""}`}>
      <button type="button" className="details-close" onClick={onClose}>Close</button>

      {node && (
        <>
          <h2>{node.fqdn ?? node.ip}</h2>
          <p>{node.ip}</p>
          <p>{node.subnet}</p>
          <p>{node.pids}</p>
          <p>{node.ports}</p>
          <h3>Connections</h3>
          {node.portTargets.length > 0 ? (
            <table className="details-table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>FQDN</th>
                  <th>PID</th>
                  <th>Process</th>
                </tr>
              </thead>
              <tbody>
                {node.portTargets.map((target) => (
                  <tr key={`${target.port}-${target.fqdn}-${target.pid}-${target.processName ?? ""}`}>
                    <td>{target.port}</td>
                    <td>{target.fqdn}</td>
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
      )}
    </aside>
  );
}
