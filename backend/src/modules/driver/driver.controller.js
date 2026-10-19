import {
  listDrivers,
  getDriverDetailById,
  listDriverDocuments,
  generateDocumentSignedLink,
  changeDriverStatus,
  getDriverWallet,
  createWalletDebit,
  getDriverProfile,
  updateDriverAvailability,
  uploadDriverDocument,
  listDriverTrips,
  getDriverTrip,
  startDriverTrip,
  closeDriverTrip,
  getHeadOffice,
  listDriverLeaves,
  createDriverLeave,
  deleteDriverLeave,
  listTripExpenses,
  createTripExpense,
  updateTripExpense,
  deleteTripExpense,
  confirmTripExpenses,
  getOwnDriverWallet,
  recordDriverLocation,
  recordBatchLocations,
  uploadDriverPhoto
} from './driver.service.js';
import { successResponse, listResponse } from '../../shared/response.js';
import { parsePagination } from '../../middlewares/validate.middleware.js';

function getBaseUrl(req) {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

export async function listDriversHandler(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { status, is_online, available_on } = req.query;

    const result = await listDrivers({
      status,
      is_online,
      available_on,
      page,
      limit,
      skip
    });

    return listResponse(res, result.items, result.page, result.limit, result.total, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function getDriverHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const driver = await getDriverDetailById(driverId);
    return successResponse(res, 200, driver, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function listDriverDocumentsHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const documents = await listDriverDocuments(driverId);
    return successResponse(res, 200, documents, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function getDocumentSignedLinkHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const documentId = req.params.document_id || req.params.documentId;
    const baseUrl = getBaseUrl(req);

    const linkData = await generateDocumentSignedLink(driverId, documentId, baseUrl);
    return successResponse(res, 200, linkData, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function changeDriverStatusHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const driver = await changeDriverStatus(driverId, req.body, req.user, req.ip);
    return successResponse(res, 200, driver, 'Driver status changed.');
  } catch (err) {
    next(err);
  }
}

export async function getDriverWalletHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const { page, limit, skip } = parsePagination(req);

    const wallet = await getDriverWallet(driverId, { page, limit, skip });
    return successResponse(res, 200, wallet, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function createWalletDebitHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const debitTx = await createWalletDebit(driverId, req.body, req.user, req.ip);
    return successResponse(res, 201, debitTx, 'Debit recorded.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/profile
 */
export async function getOwnProfileHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const profile = await getDriverProfile(driverId);
    return successResponse(res, 200, profile, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /driver/availability
 */
export async function setOwnAvailabilityHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const isOnline = req.body.is_online !== undefined ? req.body.is_online : req.body.isOnline;
    const driver = await updateDriverAvailability(driverId, isOnline);
    return successResponse(res, 200, driver, 'Availability updated.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/documents
 */
export async function listOwnDocumentsHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const documents = await listDriverDocuments(driverId);
    return successResponse(res, 200, documents, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/documents
 */
export async function uploadOwnDocumentHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const docType = req.body.document_type || req.body.documentType;
    const document = await uploadDriverDocument(driverId, req.file, docType);
    return successResponse(res, 201, document, 'Document uploaded.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/documents/:document_id/link
 */
export async function getOwnDocumentLinkHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const documentId = req.params.document_id || req.params.documentId;
    const baseUrl = getBaseUrl(req);
    const linkData = await generateDocumentSignedLink(driverId, documentId, baseUrl);
    return successResponse(res, 200, linkData, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/trips
 */
export async function listOwnTripsHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { status, page, limit } = req.query;
    const result = await listDriverTrips(driverId, { status, page, limit });
    return listResponse(res, result.items, result.page, result.limit, result.total, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/trips/:trip_id
 */
export async function getOwnTripDetailHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const trip = await getDriverTrip(driverId, tripId);
    return successResponse(res, 200, trip, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/trips/:trip_id/start
 */
export async function startOwnTripHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const trip = await startDriverTrip(driverId, tripId, req.body, req.ip);
    return successResponse(res, 200, trip, 'Trip started.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/trips/:trip_id/close
 */
export async function closeOwnTripHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const result = await closeDriverTrip(driverId, tripId, req.body, req.ip);
    return successResponse(res, 200, result, 'Trip closed successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/office
 */
export async function getHeadOfficeHandler(req, res, next) {
  try {
    const office = await getHeadOffice();
    return successResponse(res, 200, office, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/leaves
 */
export async function listOwnLeavesHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const leaves = await listDriverLeaves(driverId);
    return successResponse(res, 200, leaves, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/leaves
 */
export async function createOwnLeaveHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const leave = await createDriverLeave(driverId, req.body, req.ip);
    return successResponse(res, 201, leave, 'Leave requested successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /driver/leaves/:leave_id
 */
export async function deleteOwnLeaveHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const leaveId = req.params.leave_id || req.params.leaveId;
    const result = await deleteDriverLeave(driverId, leaveId, req.ip);
    return successResponse(res, 200, result, 'Leave deleted.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/trips/:trip_id/expenses
 */
export async function listTripExpensesHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const expenses = await listTripExpenses(driverId, tripId);
    return successResponse(res, 200, expenses, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/trips/:trip_id/expenses
 */
export async function createTripExpenseHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const expense = await createTripExpense(driverId, tripId, req.body, req.ip);
    return successResponse(res, 201, expense, 'Expense added.');
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /driver/trips/:trip_id/expenses/:expense_id
 */
export async function updateTripExpenseHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const expenseId = req.params.expense_id || req.params.expenseId;
    const expense = await updateTripExpense(driverId, tripId, expenseId, req.body, req.ip);
    return successResponse(res, 200, expense, 'Expense updated.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /driver/trips/:trip_id/expenses/:expense_id
 */
export async function deleteTripExpenseHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const expenseId = req.params.expense_id || req.params.expenseId;
    const result = await deleteTripExpense(driverId, tripId, expenseId, req.ip);
    return successResponse(res, 200, result, 'Expense deleted.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/trips/:trip_id/confirm-expenses
 */
export async function confirmTripExpensesHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const trip = await confirmTripExpenses(driverId, tripId, req.ip);
    return successResponse(res, 200, trip, 'Expenses confirmed.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /driver/wallet
 */
export async function getOwnWalletHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { page, limit, skip } = parsePagination(req);
    const wallet = await getOwnDriverWallet(driverId, { page, limit, skip });
    return successResponse(res, 200, wallet, 'OK');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/location
 */
export async function recordLocationHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const location = await recordDriverLocation(driverId, req.body);
    return successResponse(res, 200, location, 'Location updated.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/locations/batch
 */
export async function recordBatchLocationsHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const result = await recordBatchLocations(driverId, req.body);
    return successResponse(res, 200, result, 'Batch locations recorded.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /driver/profile/photo
 */
export async function uploadPhotoHandler(req, res, next) {
  try {
    const driverId = req.user.userId;
    const driver = await uploadDriverPhoto(driverId, req.file);
    return successResponse(res, 200, driver, 'Profile photo updated.');
  } catch (err) {
    next(err);
  }
}

