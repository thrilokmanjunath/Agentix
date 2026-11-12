import { NextResponse } from "next/server";
import axios from "axios";
import { getServerBackendAuthHeaders, getServerBackendBase } from "@/lib/backendServer";

export async function GET() {
  const backendBase = getServerBackendBase();
  if (!backendBase) {
    return NextResponse.json({
      status: "unconfigured",
      data: {
        total_benchmark_datasets: 0,
        total_experiments: 0,
        total_strategy_reasonings: 0,
        top_experiments: []
      }
    });
  }

  try {
    const authHeaders = await getServerBackendAuthHeaders();
    const response = await axios.get(`${backendBase}/api/v1/platform/benchmark-stats`, {
      timeout: 10000,
      headers: authHeaders,
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("[benchmark-stats] Backend error:", error?.message);
    return NextResponse.json({
      status: "error",
      data: {
        total_benchmark_datasets: 0,
        total_experiments: 0,
        total_strategy_reasonings: 0,
        top_experiments: []
      }
    });
  }
}
