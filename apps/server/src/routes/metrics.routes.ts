import { Router, Request, Response, type IRouter } from "express";

const router: IRouter = Router();

// In-memory request counters
let totalRequests = 0;
const requestCountsByStatus: Record<string, number> = {
  "2xx": 0,
  "3xx": 0,
  "4xx": 0,
  "5xx": 0,
};

// Middleware to record metrics safely
export function metricsCollector(req: Request, res: Response, next: () => void) {
  totalRequests++;

  res.on("finish", () => {
    const codeGroup = `${Math.floor(res.statusCode / 100)}xx`;
    if (requestCountsByStatus[codeGroup] !== undefined) {
      requestCountsByStatus[codeGroup]++;
    }
  });

  next();
}

/**
 * GET /api/metrics
 * Exposes Prometheus-compatible text metrics (text/plain; version=0.0.4)
 */
router.get("/", (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const cpuUsage = process.cpuUsage();

  const metrics = [
    "# HELP process_uptime_seconds The process uptime in seconds.",
    "# TYPE process_uptime_seconds gauge",
    `process_uptime_seconds ${uptimeSeconds}`,
    "",
    "# HELP nodejs_heap_size_total_bytes Process heap total memory in bytes.",
    "# TYPE nodejs_heap_size_total_bytes gauge",
    `nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}`,
    "",
    "# HELP nodejs_heap_size_used_bytes Process heap memory used in bytes.",
    "# TYPE nodejs_heap_size_used_bytes gauge",
    `nodejs_heap_size_used_bytes ${memoryUsage.heapUsed}`,
    "",
    "# HELP nodejs_external_memory_bytes Process external memory in bytes.",
    "# TYPE nodejs_external_memory_bytes gauge",
    `nodejs_external_memory_bytes ${memoryUsage.external}`,
    "",
    "# HELP nodejs_resident_memory_bytes Resident Set Size (RSS) memory in bytes.",
    "# TYPE nodejs_resident_memory_bytes gauge",
    `nodejs_resident_memory_bytes ${memoryUsage.rss}`,
    "",
    "# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.",
    "# TYPE process_cpu_user_seconds_total counter",
    `process_cpu_user_seconds_total ${(cpuUsage.user / 1e6).toFixed(4)}`,
    "",
    "# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.",
    "# TYPE process_cpu_system_seconds_total counter",
    `process_cpu_system_seconds_total ${(cpuUsage.system / 1e6).toFixed(4)}`,
    "",
    "# HELP http_requests_total Total number of HTTP requests processed.",
    "# TYPE http_requests_total counter",
    `http_requests_total ${totalRequests}`,
    "",
    "# HELP http_requests_by_status Total HTTP requests by status code family.",
    "# TYPE http_requests_by_status counter",
    `http_requests_by_status{status="2xx"} ${requestCountsByStatus["2xx"]}`,
    `http_requests_by_status{status="3xx"} ${requestCountsByStatus["3xx"]}`,
    `http_requests_by_status{status="4xx"} ${requestCountsByStatus["4xx"]}`,
    `http_requests_by_status{status="5xx"} ${requestCountsByStatus["5xx"]}`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(metrics);
});

export default router;
