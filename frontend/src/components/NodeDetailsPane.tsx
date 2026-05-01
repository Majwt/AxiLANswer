import type { NodeDetails } from "../types/graph";

type Props = {
  node: NodeDetails | null;
  onClose: () => void;
};

export default function NodeDetailsPanel({ node, onClose }: Props) {
  console.log("Selected node:", node);
  return (
    <aside className={`details-panel ${node ? "open" : ""}`}>
      {/* <button onClick={onClose}>Close</button> */}

      {node && (
        <>
          <h2>{node.fqdn ?? node.ip}</h2>
          <p>{node.ip}</p>
          <p>{node.subnet}</p>
          <p>{node.pids}</p>
          <p>{node.ports}</p>
        </>
      )}
    </aside>
  );
}
