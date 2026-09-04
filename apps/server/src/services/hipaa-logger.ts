import { prisma } from "../lib/prisma";

export class HIPAALogger {
  /**
   * Logs access or modification of Protected Health Information (PHI)
   * This is a requirement for HIPAA compliance (Audit Controls).
   */
  static async logAccess(
    userId: string,
    resourceType: string,
    resourceId: string | null,
    action: 'READ' | 'WRITE' | 'DENY',
    details?: any
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      console.error("Critical: Failed to write to HIPAA Audit Log", error);
    }
  }
}
