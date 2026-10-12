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
