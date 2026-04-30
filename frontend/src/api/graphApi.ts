import type { GraphData } from "../types/graph";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchGraph(): Promise<GraphData> {
  const response = await fetch(`${API_URL}/api/graph`);

  if (!response.ok) {
    throw new Error("Failed to fetch graph");
  }

  console.log("Graph data fetched successfully");

  return response.json();
}
