import prisma from '../../config/db.js';
import { hashPassword, normalizeEmail } from '../../shared/security.js';
import { AppError } from '../../shared/response.js';
import { recordAuditLog } from '../../shared/audit.js';

/**
 * Format a Prisma Company entity into the OpenAPI-compliant Company schema.
 * Maps hiredSplit -> platform_share_pct and driverSplit -> driver_share_pct.
 * Strips passwordHash and internal secrets.
 */
export function formatCompanyResponse(company) {
  if (!company) return null;
  return {
    company_id: company.companyId,
    name: company.name,
    address: company.address || null,
    contact_person: company.contactPerson || null,
    phone_no: company.phoneNo || null,
    email_id: company.emailId,
    status: company.status,
    locked_until: company.lockedUntil ? company.lockedUntil.toISOString() : null,
    office_id: company.officeId,
    company_location: company.companyLocation || null,
    platform_share_pct: Number(company.hiredSplit).toFixed(2),
    driver_share_pct: Number(company.driverSplit).toFixed(2),
    created_at: company.createdAt ? company.createdAt.toISOString() : null,
    updated_at: company.updatedAt ? company.updatedAt.toISOString() : null
  };
}

/**
 * List companies with optional status filter and pagination.
 */
export async function listCompanies({ status, page = 1, limit = 20, skip = 0 }) {
  const where = {};
  if (status) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid status filter. Must be ACTIVE or INACTIVE.', [
        { field: 'status', message: 'must be ACTIVE or INACTIVE' }
      ]);
    }
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.company.count({ where })
  ]);

  return {
    items: items.map(formatCompanyResponse),
    page,
    limit,
    total
  };
}

/**
 * Create a new partner company and its portal login.
 */
export async function createCompany(data, actor = {}, ipAddress = null) {
  const {
    name,
    address,
    contact_person,
    phone_no,
    email_id,
    password,
    office_id,
    company_location,
    driver_share_pct,
    platform_share_pct
  } = data;

  // Validation
  const details = [];
  if (!name || !name.trim()) details.push({ field: 'name', message: 'is required' });
  if (!email_id || !email_id.trim()) details.push({ field: 'email_id', message: 'is required' });
  if (!password || !password.trim()) details.push({ field: 'password', message: 'is required' });
  if (!office_id) details.push({ field: 'office_id', message: 'is required' });
  if (driver_share_pct === undefined || driver_share_pct === null) {
    details.push({ field: 'driver_share_pct', message: 'is required' });
  }
  if (platform_share_pct === undefined || platform_share_pct === null) {
    details.push({ field: 'platform_share_pct', message: 'is required' });
  }

  if (details.length > 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Missing required fields.', details);
  }

  const driverPct = parseFloat(driver_share_pct);
  const platformPct = parseFloat(platform_share_pct);

  if (isNaN(driverPct) || isNaN(platformPct) || driverPct < 0 || platformPct < 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Payout splits must be non-negative numbers.', [
      { field: 'driver_share_pct', message: 'must be a valid number >= 0' },
      { field: 'platform_share_pct', message: 'must be a valid number >= 0' }
    ]);
  }

  // Precision check: driverPct + platformPct must equal 100
  if (Math.round((driverPct + platformPct) * 100) !== 10000) {
    throw new AppError(422, 'VALIDATION_ERROR', 'The sum of driver_share_pct and platform_share_pct must equal 100.', [
      { field: 'driver_share_pct', message: 'driver_share_pct + platform_share_pct must equal 100' },
      { field: 'platform_share_pct', message: 'driver_share_pct + platform_share_pct must equal 100' }
    ]);
  }

  // Validate office exists
  const office = await prisma.office.findUnique({ where: { officeId: Number(office_id) } });
  if (!office) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Specified office does not exist.', [
      { field: 'office_id', message: 'office not found' }
    ]);
  }

  // Case-insensitive email uniqueness check
  const normalizedEmail = normalizeEmail(email_id);
  const existingCompany = await prisma.company.findFirst({
    where: {
      emailId: {
        equals: normalizedEmail,
        mode: 'insensitive'
      }
    }
  });

  if (existingCompany) {
    throw new AppError(409, 'DUPLICATE_EMAIL', 'A user with this email_id already exists.');
  }

  const hashedPassword = await hashPassword(password);

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      address: address ? address.trim() : null,
      contactPerson: contact_person ? contact_person.trim() : null,
      phoneNo: phone_no ? phone_no.trim() : null,
      emailId: normalizedEmail,
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      officeId: Number(office_id),
      companyLocation: company_location ? company_location.trim() : null,
      hiredSplit: platformPct.toFixed(2),
      driverSplit: driverPct.toFixed(2)
    }
  });

  return formatCompanyResponse(company);
}

/**
 * Retrieve company details by company_id.
 */
export async function getCompanyById(companyId) {
  const company = await prisma.company.findUnique({
    where: { companyId: Number(companyId) }
  });

  if (!company) {
    throw new AppError(404, 'NOT_FOUND', 'Company not found.');
  }

  return formatCompanyResponse(company);
}

/**
 * Update general company details (excluding payout split and status).
 */
export async function updateCompany(companyId, data, actor = {}, ipAddress = null) {
  const existing = await prisma.company.findUnique({
    where: { companyId: Number(companyId) }
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Company not found.');
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;
  if (data.contact_person !== undefined) updateData.contactPerson = data.contact_person ? data.contact_person.trim() : null;
  if (data.phone_no !== undefined) updateData.phoneNo = data.phone_no ? data.phone_no.trim() : null;
  if (data.company_location !== undefined) updateData.companyLocation = data.company_location ? data.company_location.trim() : null;

  if (data.office_id !== undefined) {
    const office = await prisma.office.findUnique({ where: { officeId: Number(data.office_id) } });
    if (!office) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Specified office does not exist.', [
        { field: 'office_id', message: 'office not found' }
      ]);
    }
    updateData.officeId = Number(data.office_id);
  }

  if (data.email_id !== undefined) {
    const normalized = normalizeEmail(data.email_id);
    if (!normalized) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Email address cannot be empty.', [
        { field: 'email_id', message: 'email_id is required' }
      ]);
    }
    // Check uniqueness excluding current company
    const emailConflict = await prisma.company.findFirst({
      where: {
        emailId: {
          equals: normalized,
          mode: 'insensitive'
        },
        NOT: { companyId: Number(companyId) }
      }
    });

    if (emailConflict) {
      throw new AppError(409, 'DUPLICATE_EMAIL', 'A user with this email_id already exists.');
    }
    updateData.emailId = normalized;
  }

  const updated = await prisma.company.update({
    where: { companyId: Number(companyId) },
    data: updateData
  });

  return formatCompanyResponse(updated);
}

/**
 * Update payout split for a company.
 * Mandatory check: driver_share_pct + platform_share_pct === 100.
 * Audited as PAYOUT_SPLIT_CHANGED in the same transaction.
 * Historical payroll records are preserved untouched.
 */
export async function updatePayoutSplit(companyId, { driver_share_pct, platform_share_pct }, actor = {}, ipAddress = null) {
  const existing = await prisma.company.findUnique({
    where: { companyId: Number(companyId) }
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Company not found.');
  }

  if (driver_share_pct === undefined || platform_share_pct === undefined) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Both driver_share_pct and platform_share_pct are required.', [
      { field: 'driver_share_pct', message: 'is required' },
      { field: 'platform_share_pct', message: 'is required' }
    ]);
  }

  const driverPct = parseFloat(driver_share_pct);
  const platformPct = parseFloat(platform_share_pct);

  if (isNaN(driverPct) || isNaN(platformPct) || driverPct < 0 || platformPct < 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Payout splits must be non-negative numbers.', [
      { field: 'driver_share_pct', message: 'must be a valid number' },
      { field: 'platform_share_pct', message: 'must be a valid number' }
    ]);
  }

  if (Math.round((driverPct + platformPct) * 100) !== 10000) {
    throw new AppError(422, 'VALIDATION_ERROR', 'The sum of driver_share_pct and platform_share_pct must equal 100.', [
      { field: 'driver_share_pct', message: 'driver_share_pct + platform_share_pct must equal 100' },
      { field: 'platform_share_pct', message: 'driver_share_pct + platform_share_pct must equal 100' }
    ]);
  }

  const oldValues = {
    driver_share_pct: Number(existing.driverSplit).toFixed(2),
    platform_share_pct: Number(existing.hiredSplit).toFixed(2)
  };
  const newValues = {
    driver_share_pct: driverPct.toFixed(2),
    platform_share_pct: platformPct.toFixed(2)
  };

  const updatedCompany = await prisma.$transaction(async (tx) => {
    const updated = await tx.company.update({
      where: { companyId: Number(companyId) },
      data: {
        driverSplit: driverPct.toFixed(2),
        hiredSplit: platformPct.toFixed(2)
      }
    });

    await recordAuditLog(tx, {
      actorId: actor.userId || null,
      actorType: actor.userType || 'ADMIN',
      action: 'PAYOUT_SPLIT_CHANGED',
      entityType: 'COMPANY',
      entityId: Number(companyId),
      oldValue: oldValues,
      newValue: newValues,
      ipAddress,
      reason: 'Payout split updated by admin'
    });

    return updated;
  });

  return formatCompanyResponse(updatedCompany);
}

/**
 * Change company status (ACTIVE <-> INACTIVE).
 * If status becomes INACTIVE: revokes all active sessions for this company in the same transaction.
 * Audited as USER_DEACTIVATED or USER_REACTIVATED.
 */
export async function changeCompanyStatus(companyId, { status, reason = null }, actor = {}, ipAddress = null) {
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Status must be either ACTIVE or INACTIVE.', [
      { field: 'status', message: 'must be ACTIVE or INACTIVE' }
    ]);
  }

  const existing = await prisma.company.findUnique({
    where: { companyId: Number(companyId) }
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Company not found.');
  }

  const oldStatus = existing.status;
  const newStatus = status;

  const updatedCompany = await prisma.$transaction(async (tx) => {
    const updated = await tx.company.update({
      where: { companyId: Number(companyId) },
      data: { status: newStatus }
    });

    // If company is deactivated, revoke all its active sessions immediately
    if (newStatus === 'INACTIVE') {
      await tx.session.updateMany({
        where: {
          userType: 'PARTNER',
          userId: Number(companyId),
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    const action = newStatus === 'INACTIVE' ? 'USER_DEACTIVATED' : 'USER_REACTIVATED';

    await recordAuditLog(tx, {
      actorId: actor.userId || null,
      actorType: actor.userType || 'ADMIN',
      action,
      entityType: 'COMPANY',
      entityId: Number(companyId),
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
      ipAddress,
      reason: reason || (newStatus === 'INACTIVE' ? 'Company deactivated by admin' : 'Company activated by admin')
    });

    return updated;
  });

  return formatCompanyResponse(updatedCompany);
}
