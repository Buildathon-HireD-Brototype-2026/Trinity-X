import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';
import { recordAuditLog } from '../../shared/audit.js';
import { generateSignedFileToken } from '../../shared/security.js';
import storage from '../../shared/storage.js';
import { isCloudinaryConfigured, uploadSelfie, deleteSelfie } from '../../services/cloudinary.service.js';

/**
 * Format a Driver model to OpenAPI-compliant Driver schema.
 * Never returns passwordHash or file storage paths.
 */
export function formatDriverResponse(driver) {
  if (!driver) return null;
  return {
    driver_id: driver.driverId,
    name: driver.name,
    phone_no: driver.phoneNo,
    has_photo: Boolean(driver.photoURL),
    is_online: Boolean(driver.isOnline),
    status: driver.status,
    locked_until: driver.lockedUntil ? driver.lockedUntil.toISOString() : null,
    current_location: driver.currentLocation || null,
    created_at: driver.createdAt ? driver.createdAt.toISOString() : null,
    updated_at: driver.updatedAt ? driver.updatedAt.toISOString() : null
  };
}

/**
 * Format a DriverDocument model to OpenAPI DriverDocument schema.
 * Never exposes fileURL or private storage paths.
 */
export function formatDriverDocumentResponse(doc) {
  if (!doc) return null;
  return {
    document_id: doc.documentId,
    driver_id: doc.driverId,
    document_type: doc.documentType,
    original_file_name: doc.originalFileName,
    mime_type: doc.mimeType,
    size_bytes: doc.sizeBytes,
    uploaded_at: doc.uploadedAt ? doc.uploadedAt.toISOString() : null
  };
}

/**
 * Format DriverLeave to OpenAPI DriverLeave schema.
 */
export function formatDriverLeaveResponse(leave) {
  if (!leave) return null;
  // start_date and end_date are DATE type in PostgreSQL, format as YYYY-MM-DD
  const formatIsoDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return dateObj.toISOString().split('T')[0];
  };

  return {
    leave_id: leave.leaveId,
    driver_id: leave.driverId,
    start_date: formatIsoDate(leave.startDate),
    end_date: formatIsoDate(leave.endDate),
    status: leave.status || 'PENDING',
    reason: leave.reason || null,
    created_at: leave.createdAt ? leave.createdAt.toISOString() : null
  };
}

/**
 * Format a DriverWalletTransaction model to OpenAPI WalletTransaction schema.
 */
export function formatWalletTransaction(tx) {
  if (!tx) return null;
  return {
    transaction_id: tx.transactionId,
    trip_id: tx.tripId || null,
    driver_id: tx.driverId,
    credit: tx.credit !== null && tx.credit !== undefined ? Number(tx.credit).toFixed(2) : null,
    debit: tx.debit !== null && tx.debit !== undefined ? Number(tx.debit).toFixed(2) : null,
    note: tx.note || null,
    created_at: tx.createdAt ? tx.createdAt.toISOString() : null
  };
}

/**
 * List drivers with pagination and documented filters:
 * - status: PENDING, ACTIVE, INACTIVE
 * - is_online: boolean
 * - available_on: YYYY-MM-DD (excludes drivers who have leave covering this date)
 */
export async function listDrivers({ status, is_online, available_on, page = 1, limit = 20, skip = 0 }) {
  const where = {};

  if (status) {
    if (!['PENDING', 'ACTIVE', 'INACTIVE'].includes(status)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid status. Must be PENDING, ACTIVE, or INACTIVE.', [
        { field: 'status', message: 'must be PENDING, ACTIVE, or INACTIVE' }
      ]);
    }
    where.status = status;
  }

  if (is_online !== undefined && is_online !== null && is_online !== '') {
    if (typeof is_online === 'string') {
      where.isOnline = is_online.toLowerCase() === 'true';
    } else {
      where.isOnline = Boolean(is_online);
    }
  }

  if (available_on) {
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(String(available_on).trim());
    const targetDate = new Date(available_on);
    if (!isIsoDate || isNaN(targetDate.getTime())) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid date format for available_on. Must be YYYY-MM-DD.', [
        { field: 'available_on', message: 'must be a valid date YYYY-MM-DD' }
      ]);
    }

    // Exclude drivers where there is ANY leave overlapping this targetDate
    // Overlapping condition: leave.startDate <= targetDate AND leave.endDate >= targetDate
    where.leaves = {
      none: {
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      }
    };
  }

  const [items, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.driver.count({ where })
  ]);

  return {
    items: items.map(formatDriverResponse),
    page,
    limit,
    total
  };
}

/**
 * Retrieve driver details including latest document of each type and upcoming/scheduled leaves.
 */
export async function getDriverDetailById(driverId) {
  const driver = await prisma.driver.findUnique({
    where: { driverId: Number(driverId) }
  });

  if (!driver) {
    throw new AppError(404, 'NOT_FOUND', 'Driver not found.');
  }

  // Fetch current (newest) document for each of the 4 document types
  const docTypes = ['DRIVING_LICENCE', 'AADHAAR', 'PAN', 'PCC'];
  const documentPromises = docTypes.map((type) =>
    prisma.driverDocument.findFirst({
      where: {
        driverId: Number(driverId),
        documentType: type
      },
      orderBy: { uploadedAt: 'desc' }
    })
  );

  const [documents, leaves] = await Promise.all([
    Promise.all(documentPromises).then((docs) => docs.filter(Boolean)),
    prisma.driverLeave.findMany({
      where: { driverId: Number(driverId) },
      orderBy: { startDate: 'desc' }
    })
  ]);

  const baseDriver = formatDriverResponse(driver);

  return {
    ...baseDriver,
    documents: documents.map(formatDriverDocumentResponse),
    leaves: leaves.map(formatDriverLeaveResponse)
  };
}

/**
 * List full document history of a driver.
 */
export async function listDriverDocuments(driverId) {
  const driver = await prisma.driver.findUnique({
    where: { driverId: Number(driverId) }
  });

  if (!driver) {
    throw new AppError(404, 'NOT_FOUND', 'Driver not found.');
  }

  const documents = await prisma.driverDocument.findMany({
    where: { driverId: Number(driverId) },
    orderBy: { uploadedAt: 'desc' }
  });

  return documents.map(formatDriverDocumentResponse);
}

/**
 * Generate a short-lived signed link (expires in 5 minutes) to a driver document.
 */
export async function generateDocumentSignedLink(driverId, documentId, baseUrl) {
  const doc = await prisma.driverDocument.findFirst({
    where: {
      documentId: Number(documentId),
      driverId: Number(driverId)
    }
  });

  if (!doc) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found.');
  }

  const { token, expiresAt } = generateSignedFileToken({
    driverId: Number(driverId),
    documentId: Number(documentId),
    expiresInSeconds: 300 // 5 minutes
  });

  const url = `${baseUrl}/api/v1/files/signed?token=${token}`;

  return {
    url,
    expires_at: expiresAt.toISOString()
  };
}

/**
 * Change driver status according to strict allowed state transitions:
 * - PENDING -> ACTIVE: accepts new driver. Audited as DRIVER_ACTIVATED.
 * - ACTIVE -> INACTIVE: deactivates driver, revoking all active sessions in the same transaction. Audited as USER_DEACTIVATED.
 * - INACTIVE -> ACTIVE: reactivates driver. Audited as USER_REACTIVATED.
 * - Disallowed: PENDING -> INACTIVE, ACTIVE -> ACTIVE, INACTIVE -> INACTIVE, etc. -> returns 409 INVALID_STATUS.
 */
export async function changeDriverStatus(driverId, { status, reason = null }, actor = {}, ipAddress = null) {
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Target status must be either ACTIVE or INACTIVE.', [
      { field: 'status', message: 'must be ACTIVE or INACTIVE' }
    ]);
  }

  const driver = await prisma.driver.findUnique({
    where: { driverId: Number(driverId) }
  });

  if (!driver) {
    throw new AppError(404, 'NOT_FOUND', 'Driver not found.');
  }

  const currentStatus = driver.status;
  const targetStatus = status;

  if (currentStatus === targetStatus) {
    throw new AppError(409, 'INVALID_STATUS', `Driver is already ${targetStatus}.`);
  }

  // Validate state transitions
  if (currentStatus === 'PENDING') {
    if (targetStatus !== 'ACTIVE') {
      throw new AppError(409, 'INVALID_STATUS', 'This status change is not allowed. A PENDING driver can only be transitioned to ACTIVE.');
    }
  } else if (currentStatus === 'ACTIVE') {
    if (targetStatus !== 'INACTIVE') {
      throw new AppError(409, 'INVALID_STATUS', 'This status change is not allowed.');
    }
  } else if (currentStatus === 'INACTIVE') {
    if (targetStatus !== 'ACTIVE') {
      throw new AppError(409, 'INVALID_STATUS', 'This status change is not allowed.');
    }
  }

  // Determine audit action
  let auditAction = 'USER_REACTIVATED';
  if (currentStatus === 'PENDING' && targetStatus === 'ACTIVE') {
    auditAction = 'DRIVER_ACTIVATED';
  } else if (targetStatus === 'INACTIVE') {
    auditAction = 'USER_DEACTIVATED';
  }

  const updatedDriver = await prisma.$transaction(async (tx) => {
    const updated = await tx.driver.update({
      where: { driverId: Number(driverId) },
      data: { status: targetStatus }
    });

    // If deactivating, revoke all active sessions immediately
    if (targetStatus === 'INACTIVE') {
      await tx.session.updateMany({
        where: {
          userType: 'DRIVER',
          userId: Number(driverId),
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    await recordAuditLog(tx, {
      actorId: actor.userId || null,
      actorType: actor.userType || 'ADMIN',
      action: auditAction,
      entityType: 'DRIVER',
      entityId: Number(driverId),
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus },
      ipAddress,
      reason: reason || `Driver status transitioned from ${currentStatus} to ${targetStatus}`
    });

    return updated;
  });

  return formatDriverResponse(updatedDriver);
}

/**
 * Retrieve driver wallet information for admin view.
 * Calculates balance as sum(credits) - sum(debits).
 */
export async function getDriverWallet(driverId, { page = 1, limit = 20, skip = 0 }) {
  const driver = await prisma.driver.findUnique({
    where: { driverId: Number(driverId) }
  });

  if (!driver) {
    throw new AppError(404, 'NOT_FOUND', 'Driver not found.');
  }

  // Aggregate balance
  const aggregations = await prisma.driverWalletTransaction.aggregate({
    where: { driverId: Number(driverId) },
    _sum: {
      credit: true,
      debit: true
    }
  });

  const totalCredit = Number(aggregations._sum.credit || 0);
  const totalDebit = Number(aggregations._sum.debit || 0);
  const balance = (totalCredit - totalDebit).toFixed(2);

  const [items, total] = await Promise.all([
    prisma.driverWalletTransaction.findMany({
      where: { driverId: Number(driverId) },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.driverWalletTransaction.count({
      where: { driverId: Number(driverId) }
    })
  ]);

  return {
    balance,
    items: items.map(formatWalletTransaction),
    page,
    limit,
    total
  };
}

/**
 * Record an offline cash-out debit from driver wallet.
 * Refuses debit larger than current wallet balance (422 INSUFFICIENT_BALANCE).
 */
export async function createWalletDebit(driverId, { debit, note = null }, actor = {}, ipAddress = null) {
  const driver = await prisma.driver.findUnique({
    where: { driverId: Number(driverId) }
  });

  if (!driver) {
    throw new AppError(404, 'NOT_FOUND', 'Driver not found.');
  }

  const debitAmount = parseFloat(debit);
  if (isNaN(debitAmount) || debitAmount <= 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Debit amount must be a number greater than 0.', [
      { field: 'debit', message: 'must be > 0' }
    ]);
  }

  return await prisma.$transaction(async (tx) => {
    // Calculate current balance inside transaction
    const agg = await tx.driverWalletTransaction.aggregate({
      where: { driverId: Number(driverId) },
      _sum: { credit: true, debit: true }
    });

    const currentBalance = Number(agg._sum.credit || 0) - Number(agg._sum.debit || 0);
    if (debitAmount > currentBalance) {
      throw new AppError(422, 'INSUFFICIENT_BALANCE', 'Debit is larger than the wallet balance.');
    }

    const transaction = await tx.driverWalletTransaction.create({
      data: {
        driverId: Number(driverId),
        debit: debitAmount.toFixed(2),
        credit: null,
        note: note ? note.trim() : null,
        tripId: null
      }
    });

    await recordAuditLog(tx, {
      actorId: actor.userId || null,
      actorType: actor.userType || 'ADMIN',
      action: 'WALLET_DEBITED',
      entityType: 'WALLET_TRANSACTION',
      entityId: transaction.transactionId,
      oldValue: { balance: currentBalance.toFixed(2) },
      newValue: { debit: debitAmount.toFixed(2), new_balance: (currentBalance - debitAmount).toFixed(2) },
      ipAddress,
      reason: note || 'Offline cash-out recorded by admin'
    });

    return formatWalletTransaction(transaction);
  });
}

/**
 * Get profile for driver app.
 */
export async function getDriverProfile(driverId) {
  const driver = await prisma.driver.findUnique({
    where: { driverId: Number(driverId) }
  });

  if (!driver) {
    throw new AppError(404, 'NOT_FOUND', 'Driver not found.');
  }

  return formatDriverResponse(driver);
}

/**
 * Toggle driver availability online/offline (PRD D-03).
 */
export async function updateDriverAvailability(driverId, isOnline) {
  const onlineBool = Boolean(isOnline);

  const updated = await prisma.driver.update({
    where: { driverId: Number(driverId) },
    data: { isOnline: onlineBool }
  });

  return formatDriverResponse(updated);
}

/**
 * Upload driver KYC document with 5MB limit and allowed mime types (PRD D-02).
 */
export async function uploadDriverDocument(driverId, file, documentType) {
  if (!file) {
    throw new AppError(422, 'INVALID_FILE', 'Document file is required.');
  }

  // 5MB limit
  const MAX_BYTES = 5 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new AppError(422, 'INVALID_FILE', 'File is larger than 5 MB.');
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError(422, 'INVALID_FILE', 'Wrong file type. Only JPG, PNG, and PDF allowed.');
  }

  const rawType = (documentType || 'DRIVING_LICENCE').toUpperCase().trim();
  let cleanDocType = rawType;
  if (rawType.includes('DL') || rawType.includes('LICEN')) {
    cleanDocType = 'DRIVING_LICENCE';
  } else if (rawType.includes('AADHAAR') || rawType.includes('ADHAR')) {
    cleanDocType = 'AADHAAR';
  } else if (rawType.includes('PAN')) {
    cleanDocType = 'PAN';
  } else if (rawType.includes('PCC') || rawType.includes('POLICE')) {
    cleanDocType = 'PCC';
  }

  if (!['DRIVING_LICENCE', 'AADHAAR', 'PAN', 'PCC'].includes(cleanDocType)) {
    cleanDocType = 'DRIVING_LICENCE';
  }

  const saved = await storage.saveFile({
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    folder: 'documents'
  });

  const doc = await prisma.driverDocument.create({
    data: {
      driverId: Number(driverId),
      documentType: cleanDocType,
      fileURL: saved.fileUrl,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size
    }
  });

  return formatDriverDocumentResponse(doc);
}

/**
 * Format DriverTrip to OpenAPI and driver-app schema.
 */
export function formatDriverTripResponse(trip) {
  if (!trip) return null;
  return {
    trip_id: String(trip.tripId),
    order_id: trip.orderId,
    status: trip.tripStatus,
    trip_status: trip.tripStatus,
    amount: Number(trip.amount).toFixed(2),
    driver_share: (Number(trip.amount) * 0.35).toFixed(2),
    eta: trip.eta ? trip.eta.toISOString() : null,
    pickup_spot: trip.order ? trip.order.pickupSpot : 'N/A',
    dropoff_spot: trip.order ? trip.order.dropoffSpot : 'N/A',
    pickup_time: trip.order?.pickupTime ? trip.order.pickupTime.toISOString() : null,
    contact_name: trip.order ? trip.order.contactName : 'N/A',
    contact_phone: trip.order ? trip.order.contactPhone : 'N/A',
    notes: trip.order?.notes || null,
    selfie_url: trip.startSelfieUrl || trip.selfieURL || null,
    has_selfie: Boolean(trip.startSelfieUrl || trip.selfieURL),
    start_selfie_url: trip.startSelfieUrl || trip.selfieURL || null,
    startSelfieUrl: trip.startSelfieUrl || trip.selfieURL || null,
    startSelfieUploadedAt: trip.startSelfieUploadedAt ? trip.startSelfieUploadedAt.toISOString() : null,
    startSelfieExpiresAt: trip.startSelfieExpiresAt ? trip.startSelfieExpiresAt.toISOString() : null,
    startSelfieDeletedAt: trip.startSelfieDeletedAt ? trip.startSelfieDeletedAt.toISOString() : null,
    expenses_confirmed: Boolean(trip.expensesConfirmed),
    assigned_at: trip.assignedAt ? trip.assignedAt.toISOString() : null,
    started_at: trip.startedAt ? trip.startedAt.toISOString() : null,
    closed_at: trip.closedAt ? trip.closedAt.toISOString() : null,
    created_at: trip.createdAt ? trip.createdAt.toISOString() : null,
    version: trip.version !== undefined ? trip.version : 0,
    expenses: Array.isArray(trip.expenses)
      ? trip.expenses.map(e => ({
          expense_id: e.expenseId,
          trip_id: e.tripId,
          driver_id: e.driverId,
          description: e.description,
          amount: Number(e.amount).toFixed(2),
          created_at: e.createdAt ? e.createdAt.toISOString() : null
        }))
      : []
  };
}

/**
 * List trips assigned to a driver.
 */
export async function listDriverTrips(driverId, { status, page = 1, limit = 50 } = {}) {
  const where = {
    driverId: Number(driverId)
  };

  if (status) {
    const validStatuses = ['UNASSIGNED', 'ASSIGNED', 'ONGOING', 'CLOSED', 'CANCELLED'];
    const upStatus = status.toUpperCase();
    if (!validStatuses.includes(upStatus)) {
      throw new AppError(422, 'VALIDATION_ERROR', `Invalid trip status '${status}'. Must be one of: ${validStatuses.join(', ')}.`);
    }
    where.tripStatus = upStatus;
  }

  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, trips] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: {
        order: true,
        expenses: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    })
  ]);

  const items = trips.map(formatDriverTripResponse);
  return {
    items,
    total,
    page: Number(page) || 1,
    limit: take
  };
}

/**
 * Get single trip detail for assigned driver.
 */
export async function getDriverTrip(driverId, tripId) {
  const trip = await prisma.trip.findFirst({
    where: {
      tripId: Number(tripId),
      driverId: Number(driverId)
    },
    include: {
      order: true,
      expenses: true
    }
  });

  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found or not assigned to this driver.');
  }

  return formatDriverTripResponse(trip);
}

/**
 * Start a trip assigned to driver (PRD D-07).
 */
export async function startDriverTrip(driverId, tripId, { selfie_url } = {}, ipAddress, file = null) {
  const trip = await prisma.trip.findFirst({
    where: {
      tripId: Number(tripId),
      driverId: Number(driverId)
    },
    include: { order: true }
  });

  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
  }

  if (trip.tripStatus !== 'ASSIGNED' && trip.tripStatus !== 'ACCEPTED') {
    throw new AppError(409, 'CONFLICT', `Cannot start trip in ${trip.tripStatus} status. Must be ASSIGNED.`);
  }

  let finalSelfieUrl = trip.startSelfieUrl || trip.selfieURL || selfie_url || null;

  if (file) {
    if (!isCloudinaryConfigured()) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Selfie storage is not configured yet. Contact admin.');
    }
    if (trip.startSelfiePublicId) {
      await deleteSelfie(trip.startSelfiePublicId).catch(() => {});
    }
    const uploaded = await uploadSelfie(file.buffer, trip.tripId);
    finalSelfieUrl = uploaded.url;
    const now = new Date();
    await prisma.trip.update({
      where: { tripId: trip.tripId },
      data: {
        startSelfieUrl: uploaded.url,
        startSelfiePublicId: uploaded.publicId,
        startSelfieUploadedAt: now,
        startSelfieExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        startSelfieDeletedAt: null,
        selfieURL: uploaded.url
      }
    });
  }

  // Validate that a selfie was uploaded before starting the trip
  if (!finalSelfieUrl && !trip.startSelfieUrl && !trip.selfieURL) {
    throw new AppError(400, 'SELFIE_REQUIRED', 'Selfie required.');
  }

  const updatedTrip = await prisma.trip.update({
    where: { tripId: trip.tripId },
    data: {
      tripStatus: 'ONGOING',
      startedAt: new Date(),
      selfieURL: finalSelfieUrl,
      version: { increment: 1 }
    },
    include: {
      order: true,
      expenses: { orderBy: { createdAt: 'desc' } }
    }
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'TRIP_STARTED',
    entityType: 'TRIP',
    entityId: trip.tripId,
    oldValue: { tripStatus: trip.tripStatus },
    newValue: { tripStatus: 'ONGOING', selfieURL: finalSelfieUrl },
    ipAddress
  });

  return formatDriverTripResponse(updatedTrip);
}

/**
 * Upload trip-start selfie to Cloudinary (PRD D-07)
 */
export async function uploadStartSelfie(driverId, tripId, file) {
  if (!isCloudinaryConfigured()) {
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Selfie storage is not configured yet. Contact admin.');
  }

  if (!file || !file.buffer) {
    throw new AppError(400, 'FILE_REQUIRED', 'Selfie image is required.');
  }

  const trip = await prisma.trip.findFirst({
    where: {
      tripId: Number(tripId),
      driverId: Number(driverId)
    }
  });

  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found or does not belong to you.');
  }

  const allowedPreStartStatuses = ['ASSIGNED', 'ACCEPTED'];
  if (!allowedPreStartStatuses.includes(trip.tripStatus)) {
    throw new AppError(
      400,
      'INVALID_TRIP_STATUS',
      `Cannot upload start selfie for trip with status ${trip.tripStatus}. Must be ASSIGNED or ACCEPTED.`
    );
  }

  // If the trip already has a selfie, delete the old one from Cloudinary first
  if (trip.startSelfiePublicId) {
    try {
      await deleteSelfie(trip.startSelfiePublicId);
    } catch (delErr) {
      console.warn('[cloudinary] Failed to delete previous selfie:', delErr.message);
    }
  }

  // Upload to Cloudinary
  const { url, publicId } = await uploadSelfie(file.buffer, trip.tripId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.trip.update({
    where: { tripId: trip.tripId },
    data: {
      startSelfieUrl: url,
      startSelfiePublicId: publicId,
      startSelfieUploadedAt: now,
      startSelfieExpiresAt: expiresAt,
      startSelfieDeletedAt: null,
      selfieURL: url
    }
  });

  return {
    success: true,
    selfieUrl: url,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Upload trip-start selfie independently (PRD D-07 legacy wrapper)
 */
export async function uploadTripSelfie(driverId, tripId, file) {
  return uploadStartSelfie(driverId, tripId, file);
}

/**
 * Close trip upon arrival with passenger 6-digit OTP verification (PRD D-09, D-10).
 * Calculates payroll and credits driver wallet atomically.
 */
export async function closeDriverTrip(driverId, tripId, { otp } = {}, ipAddress) {
  if (!otp || typeof otp !== 'string' || !otp.trim()) {
    throw new AppError(400, 'BAD_REQUEST', '6-digit trip closure OTP is required.');
  }

  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findFirst({
      where: {
        tripId: Number(tripId),
        driverId: Number(driverId)
      },
      include: {
        order: {
          include: {
            company: true
          }
        }
      }
    });

    if (!trip) {
      throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
    }

    if (trip.tripStatus !== 'ONGOING') {
      throw new AppError(409, 'CONFLICT', `Cannot close trip in ${trip.tripStatus} status. Must be ONGOING.`);
    }

    const maxAttempts = 5;
    if ((trip.otpAttempts || 0) >= maxAttempts) {
      throw new AppError(403, 'OTP_LOCKED', 'Maximum OTP verification attempts exceeded. Trip requires administrative review.');
    }

    // Verify OTP
    if (otp.trim() !== trip.otp.trim()) {
      const updatedAttempts = (trip.otpAttempts || 0) + 1;
      await prisma.trip.update({
        where: { tripId: trip.tripId },
        data: { otpAttempts: { increment: 1 } }
      });
      const remaining = Math.max(0, maxAttempts - updatedAttempts);
      throw new AppError(400, 'INVALID_OTP', `Invalid trip completion OTP. ${remaining} attempt(s) remaining.`);
    }

    // Calculate payouts
    const company = trip.order.company;
    const driverPct = Number(company.driverSplit || 30.00);
    const companyPct = Number(company.hiredSplit || 70.00);
    const tripAmount = Number(trip.amount);
    const driverShare = (tripAmount * driverPct) / 100;
    const companyShare = (tripAmount * companyPct) / 100;

    const closedAt = new Date();

    // 1. Update Trip
    await tx.trip.update({
      where: { tripId: trip.tripId },
      data: {
        tripStatus: 'CLOSED',
        expensesConfirmed: true,
        closedAt,
        version: { increment: 1 }
      }
    });

    // 2. Create TripPayroll
    await tx.tripPayroll.create({
      data: {
        tripId: trip.tripId,
        driverId: Number(driverId),
        driverPCT: driverPct.toFixed(2),
        companyPCT: companyPct.toFixed(2),
        tripAmount: tripAmount.toFixed(2),
        driverShare: driverShare.toFixed(2),
        companyShare: companyShare.toFixed(2),
        payoutStatus: 'CREDITED',
        paymentStatus: 'UNPAID'
      }
    });

    // 3. Create DriverWalletTransaction
    await tx.driverWalletTransaction.create({
      data: {
        tripId: trip.tripId,
        driverId: Number(driverId),
        credit: driverShare.toFixed(2),
        debit: null,
        note: `Payout for Trip #${trip.tripId}`
      }
    });

    // 4. Audit
    await recordAuditLog(tx, {
      actorId: driverId,
      actorType: 'DRIVER',
      action: 'TRIP_CLOSED',
      entityType: 'TRIP',
      entityId: trip.tripId,
      oldValue: { tripStatus: 'ONGOING' },
      newValue: { tripStatus: 'CLOSED', driverShare: driverShare.toFixed(2) },
      ipAddress
    });

    return {
      trip_id: trip.tripId,
      status: 'CLOSED',
      closed_at: closedAt.toISOString()
    };
  });
}

/**
 * Get Head Office details (queries first office by office_id ASC).
 */
export async function getHeadOffice() {
  const office = await prisma.office.findFirst({
    orderBy: { officeId: 'asc' }
  });
  if (!office) {
    throw new AppError(404, 'NOT_FOUND', 'Office not found.');
  }
  return {
    office_id: office.officeId,
    office_name: office.officeName,
    office_location: office.officeLocation || null,
    created_at: office.createdAt ? office.createdAt.toISOString() : null
  };
}

/**
 * List leaves for authenticated driver.
 */
export async function listDriverLeaves(driverId) {
  const leaves = await prisma.driverLeave.findMany({
    where: { driverId: Number(driverId) },
    orderBy: { startDate: 'desc' }
  });
  return leaves.map(formatDriverLeaveResponse);
}

/**
 * Create a new leave request (status: PENDING).
 */
export async function createDriverLeave(driverId, { start_date, end_date, reason } = {}, ipAddress) {
  if (!start_date || !end_date) {
    throw new AppError(422, 'VALIDATION_ERROR', 'start_date and end_date are required.', [
      { field: 'start_date', message: 'required' },
      { field: 'end_date', message: 'required' }
    ]);
  }
  const start = new Date(start_date);
  const end = new Date(end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD.');
  }
  if (end < start) {
    throw new AppError(422, 'VALIDATION_ERROR', 'end_date must be on or after start_date.');
  }

  const leave = await prisma.driverLeave.create({
    data: {
      driverId: Number(driverId),
      startDate: start,
      endDate: end,
      status: 'PENDING',
      reason: reason ? String(reason).trim() : null
    }
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'LEAVE_REQUESTED',
    entityType: 'DRIVER_LEAVE',
    entityId: leave.leaveId,
    oldValue: null,
    newValue: { status: 'PENDING', startDate: start_date, endDate: end_date },
    ipAddress
  });

  return formatDriverLeaveResponse(leave);
}

/**
 * Delete own leave to unblock days off.
 */
export async function deleteDriverLeave(driverId, leaveId, ipAddress) {
  const leave = await prisma.driverLeave.findFirst({
    where: {
      leaveId: Number(leaveId),
      driverId: Number(driverId)
    }
  });
  if (!leave) {
    throw new AppError(404, 'NOT_FOUND', 'Leave request not found or does not belong to you.');
  }

  await prisma.driverLeave.delete({
    where: { leaveId: leave.leaveId }
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'LEAVE_DELETED',
    entityType: 'DRIVER_LEAVE',
    entityId: leave.leaveId,
    oldValue: { status: leave.status, startDate: leave.startDate },
    newValue: null,
    ipAddress
  });

  return { success: true, message: 'Leave request deleted.' };
}

/**
 * List expenses for a trip belonging to driver.
 */
export async function listTripExpenses(driverId, tripId) {
  const trip = await prisma.trip.findFirst({
    where: {
      tripId: Number(tripId),
      driverId: Number(driverId)
    }
  });
  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found or does not belong to you.');
  }

  const expenses = await prisma.expense.findMany({
    where: { tripId: Number(tripId) },
    orderBy: { createdAt: 'desc' }
  });

  return expenses.map(e => ({
    expense_id: e.expenseId,
    trip_id: e.tripId,
    driver_id: e.driverId,
    description: e.description,
    amount: Number(e.amount).toFixed(2),
    created_at: e.createdAt ? e.createdAt.toISOString() : null
  }));
}

/**
 * Create an expense on an ONGOING trip.
 */
export async function createTripExpense(driverId, tripId, { description, amount } = {}, ipAddress) {
  const trip = await prisma.trip.findFirst({
    where: {
      tripId: Number(tripId),
      driverId: Number(driverId)
    }
  });
  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found or does not belong to you.');
  }
  if (trip.tripStatus !== 'ONGOING') {
    throw new AppError(409, 'CONFLICT', `Expenses can only be logged while trip is ONGOING (current: ${trip.tripStatus}).`);
  }

  const numAmount = parseFloat(amount);
  if (!description || !description.trim()) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Expense description is required.');
  }
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Expense amount must be a positive number.');
  }

  const expense = await prisma.expense.create({
    data: {
      tripId: trip.tripId,
      driverId: Number(driverId),
      description: description.trim(),
      amount: numAmount.toFixed(2)
    }
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'EXPENSE_LOGGED',
    entityType: 'EXPENSE',
    entityId: expense.expenseId,
    oldValue: null,
    newValue: { description: expense.description, amount: expense.amount },
    ipAddress
  });

  return {
    expense_id: expense.expenseId,
    trip_id: expense.tripId,
    driver_id: expense.driverId,
    description: expense.description,
    amount: Number(expense.amount).toFixed(2),
    created_at: expense.createdAt.toISOString()
  };
}

/**
 * Update an expense on an ONGOING trip.
 */
export async function updateTripExpense(driverId, tripId, expenseId, { description, amount } = {}, ipAddress) {
  const trip = await prisma.trip.findFirst({
    where: { tripId: Number(tripId), driverId: Number(driverId) }
  });
  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
  }
  if (trip.tripStatus !== 'ONGOING') {
    throw new AppError(409, 'CONFLICT', 'Expenses can only be modified while trip is ONGOING.');
  }

  const expense = await prisma.expense.findFirst({
    where: { expenseId: Number(expenseId), tripId: Number(tripId), driverId: Number(driverId) }
  });
  if (!expense) {
    throw new AppError(404, 'NOT_FOUND', 'Expense not found.');
  }

  const data = {};
  if (description !== undefined) {
    if (!description.trim()) throw new AppError(422, 'VALIDATION_ERROR', 'Description cannot be empty.');
    data.description = description.trim();
  }
  if (amount !== undefined) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw new AppError(422, 'VALIDATION_ERROR', 'Amount must be positive.');
    data.amount = numAmount.toFixed(2);
  }

  const updated = await prisma.expense.update({
    where: { expenseId: expense.expenseId },
    data
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'EXPENSE_UPDATED',
    entityType: 'EXPENSE',
    entityId: expense.expenseId,
    oldValue: { description: expense.description, amount: expense.amount },
    newValue: data,
    ipAddress
  });

  return {
    expense_id: updated.expenseId,
    trip_id: updated.tripId,
    driver_id: updated.driverId,
    description: updated.description,
    amount: Number(updated.amount).toFixed(2),
    created_at: updated.createdAt.toISOString()
  };
}

/**
 * Delete an expense on an ONGOING trip.
 */
export async function deleteTripExpense(driverId, tripId, expenseId, ipAddress) {
  const trip = await prisma.trip.findFirst({
    where: { tripId: Number(tripId), driverId: Number(driverId) }
  });
  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
  }
  if (trip.tripStatus !== 'ONGOING') {
    throw new AppError(409, 'CONFLICT', 'Expenses can only be deleted while trip is ONGOING.');
  }

  const expense = await prisma.expense.findFirst({
    where: { expenseId: Number(expenseId), tripId: Number(tripId), driverId: Number(driverId) }
  });
  if (!expense) {
    throw new AppError(404, 'NOT_FOUND', 'Expense not found.');
  }

  await prisma.expense.delete({
    where: { expenseId: expense.expenseId }
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'EXPENSE_DELETED',
    entityType: 'EXPENSE',
    entityId: expense.expenseId,
    oldValue: { description: expense.description, amount: expense.amount },
    newValue: null,
    ipAddress
  });

  return { success: true, message: 'Expense deleted.' };
}

/**
 * Confirm expenses are complete on an ONGOING trip.
 */
export async function confirmTripExpenses(driverId, tripId, ipAddress) {
  const trip = await prisma.trip.findFirst({
    where: { tripId: Number(tripId), driverId: Number(driverId) }
  });
  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
  }
  if (trip.tripStatus !== 'ONGOING') {
    throw new AppError(409, 'CONFLICT', 'Can only confirm expenses on an ONGOING trip.');
  }

  const updated = await prisma.trip.update({
    where: { tripId: trip.tripId },
    data: {
      expensesConfirmed: true,
      version: { increment: 1 }
    },
    include: {
      order: true,
      expenses: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'EXPENSES_CONFIRMED',
    entityType: 'TRIP',
    entityId: trip.tripId,
    oldValue: { expensesConfirmed: false },
    newValue: { expensesConfirmed: true },
    ipAddress
  });

  return formatDriverTripResponse(updated);
}

/**
 * Driver view of own wallet and transaction ledger.
 */
export async function getOwnDriverWallet(driverId, { page = 1, limit = 20, skip = 0 } = {}) {
  const parsedDriverId = Number(driverId);
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const [total, transactions, creditsSum, debitsSum] = await Promise.all([
    prisma.driverWalletTransaction.count({ where: { driverId: parsedDriverId } }),
    prisma.driverWalletTransaction.findMany({
      where: { driverId: parsedDriverId },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.driverWalletTransaction.aggregate({
      where: { driverId: parsedDriverId },
      _sum: { credit: true }
    }),
    prisma.driverWalletTransaction.aggregate({
      where: { driverId: parsedDriverId },
      _sum: { debit: true }
    })
  ]);

  const totalCredit = Number(creditsSum._sum.credit || 0);
  const totalDebit = Number(debitsSum._sum.debit || 0);
  const balance = totalCredit - totalDebit;

  return {
    driver_id: parsedDriverId,
    balance: balance.toFixed(2),
    total_credit: totalCredit.toFixed(2),
    total_debit: totalDebit.toFixed(2),
    transactions: {
      items: transactions.map(formatWalletTransaction),
      total,
      page: Number(page) || 1,
      limit: take
    }
  };
}

/**
 * Record single live location ping (UPSERT driver_locations + INSERT driver_location_history).
 * Enforces rate limit: 1 ping per 3 seconds per driver.
 */
export async function recordDriverLocation(driverId, data) {
  const parsedDriverId = Number(driverId);
  const { lat, lng, speed, heading, accuracy, battery_percent, trip_id } = data;

  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);

  if (isNaN(numLat) || numLat < -90 || numLat > 90) {
    throw new AppError(422, 'VALIDATION_ERROR', 'lat must be a number between -90 and 90.');
  }
  if (isNaN(numLng) || numLng < -180 || numLng > 180) {
    throw new AppError(422, 'VALIDATION_ERROR', 'lng must be a number between -180 and 180.');
  }

  // Rate limit: 1 ping per 3 seconds per driver
  const existing = await prisma.driverLocation.findUnique({
    where: { driverId: parsedDriverId }
  });

  if (existing) {
    const elapsedMs = Date.now() - new Date(existing.updatedAt).getTime();
    if (elapsedMs < 3000) {
      throw new AppError(429, 'RATE_LIMITED', 'Location pings rate limited to one ping per 3 seconds.');
    }
  }

  const now = new Date();
  const parsedTripId = trip_id ? Number(trip_id) : (existing?.tripId || null);

  // 1. Upsert latest location
  const loc = await prisma.driverLocation.upsert({
    where: { driverId: parsedDriverId },
    create: {
      driverId: parsedDriverId,
      lat: numLat,
      lng: numLng,
      speed: speed !== undefined && speed !== null ? parseFloat(speed) : null,
      heading: heading !== undefined && heading !== null ? parseFloat(heading) : null,
      accuracy: accuracy !== undefined && accuracy !== null ? parseFloat(accuracy) : null,
      batteryPercent: battery_percent !== undefined && battery_percent !== null ? parseInt(battery_percent, 10) : null,
      tripId: parsedTripId,
      updatedAt: now
    },
    update: {
      lat: numLat,
      lng: numLng,
      speed: speed !== undefined && speed !== null ? parseFloat(speed) : null,
      heading: heading !== undefined && heading !== null ? parseFloat(heading) : null,
      accuracy: accuracy !== undefined && accuracy !== null ? parseFloat(accuracy) : null,
      batteryPercent: battery_percent !== undefined && battery_percent !== null ? parseInt(battery_percent, 10) : null,
      tripId: parsedTripId,
      updatedAt: now
    }
  });

  // 2. Insert into history
  await prisma.driverLocationHistory.create({
    data: {
      driverId: parsedDriverId,
      tripId: parsedTripId,
      lat: numLat,
      lng: numLng,
      speed: speed !== undefined && speed !== null ? parseFloat(speed) : null,
      recordedAt: now
    }
  });

  return {
    driver_id: loc.driverId,
    lat: loc.lat,
    lng: loc.lng,
    speed: loc.speed,
    heading: loc.heading,
    accuracy: loc.accuracy,
    battery_percent: loc.batteryPercent,
    trip_id: loc.tripId,
    updated_at: loc.updatedAt.toISOString(),
    google_maps_url: `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
  };
}

/**
 * Record batch offline locations.
 */
export async function recordBatchLocations(driverId, { pings = [] } = {}) {
  const parsedDriverId = Number(driverId);
  if (!Array.isArray(pings) || pings.length === 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'pings must be a non-empty array of location objects.');
  }
  if (pings.length > 100) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Maximum 100 location pings allowed per batch.');
  }

  const validRecords = [];
  let latestPing = null;

  for (const ping of pings) {
    const lat = parseFloat(ping.lat);
    const lng = parseFloat(ping.lng);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      continue;
    }
    let recordedAt = ping.recorded_at ? new Date(ping.recorded_at) : new Date();
    const now = new Date();
    // Clamp/validate: ignore invalid dates, clamp timestamps older than 24 hours or >5 minutes into the future
    if (isNaN(recordedAt.getTime())) {
      recordedAt = now;
    } else {
      const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
      const maxFutureMs = 5 * 60 * 1000; // 5 minutes clock skew
      if (now.getTime() - recordedAt.getTime() > maxAgeMs || recordedAt.getTime() - now.getTime() > maxFutureMs) {
        recordedAt = now;
      }
    }
    const tripId = ping.trip_id ? Number(ping.trip_id) : null;
    const speed = ping.speed !== undefined && ping.speed !== null ? parseFloat(ping.speed) : null;

    validRecords.push({
      driverId: parsedDriverId,
      tripId,
      lat,
      lng,
      speed,
      recordedAt
    });

    if (!latestPing || recordedAt > latestPing.recordedAt) {
      latestPing = {
        lat,
        lng,
        speed,
        tripId,
        recordedAt
      };
    }
  }

  if (validRecords.length > 0) {
    await prisma.driverLocationHistory.createMany({
      data: validRecords
    });

    if (latestPing) {
      const existing = await prisma.driverLocation.findUnique({
        where: { driverId: parsedDriverId }
      });

      if (!existing || latestPing.recordedAt > existing.updatedAt) {
        await prisma.driverLocation.upsert({
          where: { driverId: parsedDriverId },
          create: {
            driverId: parsedDriverId,
            lat: latestPing.lat,
            lng: latestPing.lng,
            speed: latestPing.speed,
            tripId: latestPing.tripId,
            updatedAt: latestPing.recordedAt
          },
          update: {
            lat: latestPing.lat,
            lng: latestPing.lng,
            speed: latestPing.speed,
            tripId: latestPing.tripId,
            updatedAt: latestPing.recordedAt
          }
        });
      }
    }
  }

  return {
    synced: validRecords.length,
    message: `Successfully synchronized ${validRecords.length} location pings.`
  };
}

/**
 * Upload profile photo for driver.
 */
export async function uploadDriverPhoto(driverId, file) {
  if (!file) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Photo file is required.');
  }

  const saved = await storage.saveFile({
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    folder: 'profiles'
  });

  const driver = await prisma.driver.update({
    where: { driverId: Number(driverId) },
    data: { photoURL: saved.fileUrl }
  });

  return formatDriverResponse(driver);
}

