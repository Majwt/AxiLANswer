import type { GraphData } from "../types/graph";


export async function fetchGraph(): Promise<GraphData> {
  const response = await fetch(`/api/graph`);

  if (!response.ok) {
    throw new Error("Failed to fetch graph");
  }

  console.log("Graph data fetched successfully");

  return response.json();
}
