import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';
import { recordAuditLog } from '../../shared/audit.js';
import { generateSignedFileToken } from '../../shared/security.js';

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
    const targetDate = new Date(available_on);
    if (isNaN(targetDate.getTime())) {
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

  const doc = await prisma.driverDocument.create({
    data: {
      driverId: Number(driverId),
      documentType: cleanDocType,
      fileURL: `uploads/driver_${driverId}_${cleanDocType}_${Date.now()}_${file.originalname}`,
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
    eta: trip.eta ? trip.eta.toISOString() : null,
    pickup_spot: trip.order ? trip.order.pickupSpot : 'N/A',
    dropoff_spot: trip.order ? trip.order.dropoffSpot : 'N/A',
    pickup_time: trip.order?.pickupTime ? trip.order.pickupTime.toISOString() : null,
    contact_name: trip.order ? trip.order.contactName : 'N/A',
    contact_phone: trip.order ? trip.order.contactPhone : 'N/A',
    notes: trip.order?.notes || null,
    selfie_url: trip.selfieURL || null,
    expenses_confirmed: Boolean(trip.expensesConfirmed),
    assigned_at: trip.assignedAt ? trip.assignedAt.toISOString() : null,
    started_at: trip.startedAt ? trip.startedAt.toISOString() : null,
    closed_at: trip.closedAt ? trip.closedAt.toISOString() : null,
    created_at: trip.createdAt ? trip.createdAt.toISOString() : null
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
    where.tripStatus = status.toUpperCase();
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
export async function startDriverTrip(driverId, tripId, { selfie_url } = {}, ipAddress) {
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

  if (trip.tripStatus !== 'ASSIGNED') {
    throw new AppError(409, 'CONFLICT', `Cannot start trip in ${trip.tripStatus} status. Must be ASSIGNED.`);
  }

  const updatedTrip = await prisma.trip.update({
    where: { tripId: trip.tripId },
    data: {
      tripStatus: 'ONGOING',
      startedAt: new Date(),
      selfieURL: selfie_url || null,
      version: { increment: 1 }
    },
    include: { order: true }
  });

  await recordAuditLog(prisma, {
    actorId: driverId,
    actorType: 'DRIVER',
    action: 'TRIP_STARTED',
    entityType: 'TRIP',
    entityId: trip.tripId,
    oldValue: { tripStatus: 'ASSIGNED' },
    newValue: { tripStatus: 'ONGOING' },
    ipAddress
  });

  return formatDriverTripResponse(updatedTrip);
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

