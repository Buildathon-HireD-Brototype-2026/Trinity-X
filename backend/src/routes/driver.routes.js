/**
 * =============================================================================
 * HIRED BACKEND - DRIVER ROUTES
 * =============================================================================
 * Route definitions for Driver Mobile App endpoints:
 * - GET    /api/v1/driver/trips/assigned   -> View trips assigned by admin
 * - PATCH  /api/v1/driver/trips/:id/start   -> Start assigned trip
 * - POST   /api/v1/driver/trips/:id/expenses -> Log trip expenses
 * - POST   /api/v1/driver/trips/:id/close    -> Complete trip with OTP
 *
 * Mapped to Prisma schema per `database.md` (`trips`, `orders`, `companies`).
 * =============================================================================
 */

import { Router } from 'express';
import {
  getAssignedTrips,
  startTrip,
  addTripExpense,
  closeTripWithOtp
} from '../modules/driver/driver.controller.js';

// If auth middleware is active in backend, uncomment below:
// import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// router.use(authenticate); // Require valid driver JWT bearer token

// 1. Get assigned & active trips for the authenticated driver
router.get('/trips/assigned', getAssignedTrips);

// 2. Start an assigned trip (sets trip_status = 'ONGOING')
router.patch('/trips/:tripId/start', startTrip);

// 3. Log an expense during the trip (fuel, toll, parking)
router.post('/trips/:tripId/expenses', addTripExpense);

// 4. Close trip with client 6-digit OTP code (credits driver wallet)
router.post('/trips/:tripId/close', closeTripWithOtp);

export default router;
