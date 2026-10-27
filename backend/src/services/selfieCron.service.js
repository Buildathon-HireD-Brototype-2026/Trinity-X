import cron from 'node-cron';
import prisma from '../config/db.js';
import { isCloudinaryConfigured, deleteSelfie } from './cloudinary.service.js';

let isCronStarted = false;

/**
 * Clean up expired selfies older than 24 hours.
 * Runs hourly or on-demand.
 */
export async function cleanupExpiredSelfies() {
  if (!isCloudinaryConfigured()) {
    // Skip run silently if Cloudinary is not configured
    return { skipped: true, reason: 'CLOUDINARY_NOT_CONFIGURED', count: 0 };
  }

  const now = new Date();
  try {
    const expiredTrips = await prisma.trip.findMany({
      where: {
        startSelfieExpiresAt: { lte: now },
        startSelfieDeletedAt: null,
        startSelfiePublicId: { not: null }
      },
      select: {
        tripId: true,
        startSelfiePublicId: true
      }
    });

    if (expiredTrips.length === 0) {
      return { skipped: false, count: 0 };
    }

    let deletedCount = 0;
    for (const trip of expiredTrips) {
      try {
        const deleted = await deleteSelfie(trip.startSelfiePublicId);
        if (deleted) {
          await prisma.trip.update({
            where: { tripId: trip.tripId },
            data: {
              startSelfieDeletedAt: new Date(),
              startSelfieUrl: null,
              selfieURL: null
            }
          });
          deletedCount++;
          console.log(`[selfieCron] Expired selfie auto-deleted for trip #${trip.tripId}`);
        }
      } catch (err) {
        console.error(`[selfieCron] Error deleting selfie for trip #${trip.tripId} (will retry next run):`, err.message);
      }
    }

    return { skipped: false, count: deletedCount };
  } catch (error) {
    console.error('[selfieCron] Error querying expired selfies:', error.message);
    return { skipped: false, error: error.message, count: 0 };
  }
}

/**
 * Initialize hourly cron job. Ensures job cannot start twice.
 */
export function initSelfieCleanupCron() {
  if (isCronStarted) {
    return;
  }
  isCronStarted = true;

  // Run every hour at minute 0 ('0 * * * *')
  cron.schedule('0 * * * *', async () => {
    try {
      await cleanupExpiredSelfies();
    } catch (e) {
      console.error('[selfieCron] Scheduled run failed:', e.message);
    }
  });

  console.log('[selfieCron] Hourly selfie expiration cleanup cron initialized');
}
