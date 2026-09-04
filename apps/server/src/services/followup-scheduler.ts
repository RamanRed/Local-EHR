import { prisma } from "../lib/prisma.js";

let intervalId: ReturnType<typeof setInterval> | null = null;

async function checkAndScheduleFollowUps(): Promise<void> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Find finalized consults with followUpDate today that have no FollowUpCall yet
    const consults = await prisma.consult.findMany({
      where: {
        finalized: true,
        followUpDate: {
          gte: todayStart,
          lt: todayEnd,
        },
        followUpCalls: {
          none: {},
        },
      },
      select: {
        id: true,
        patientId: true,
        followUpDate: true,
      },
    });

    if (consults.length === 0) return;

    console.log(`[Scheduler] Found ${consults.length} consult(s) needing follow-up calls`);

    for (const consult of consults) {
      await prisma.followUpCall.create({
        data: {
          patientId: consult.patientId,
          consultId: consult.id,
          initiatedBy: "SYSTEM",
          status: "scheduled",
          scheduledAt: consult.followUpDate,
        },
      });
      console.log(`[Scheduler] Created follow-up call for consult ${consult.id}`);
    }
  } catch (error) {
    console.error("[Scheduler] Error checking follow-ups:", error);
  }
}

export function startFollowUpScheduler(): void {
  console.log("[Scheduler] Follow-up call scheduler started");

  // Run immediately on startup
  checkAndScheduleFollowUps();

  // Then run every hour
  intervalId = setInterval(checkAndScheduleFollowUps, 60 * 60 * 1000);
}

export function stopFollowUpScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Follow-up call scheduler stopped");
  }
}
