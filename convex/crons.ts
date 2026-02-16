import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup daily at 2 AM UTC
crons.daily(
  "cleanup-old-data",
  { hourUTC: 2, minuteUTC: 0 },
  internal.cleanup.cleanupOldData
);

export default crons;
