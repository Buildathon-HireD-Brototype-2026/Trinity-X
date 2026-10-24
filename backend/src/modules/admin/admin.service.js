import prisma from '../../config/db.js';
import { hashPassword, normalizeEmail } from '../../shared/security.js';
import { AppError } from '../../shared/response.js';
import { recordAuditLog } from '../../shared/audit.js';

/**
 * Format a Prisma Admin entity into the safe, OpenAPI-compliant response schema.
 * Never returns passwordHash or sensitive session information.
 */
export function formatAdminResponse(admin) {
  if (!admin) return null;
  const res = {
    admin_id: admin.adminId,
    office_id: admin.officeId,
    admin_name: admin.adminName,
    phone_no: admin.phoneNo || null,
    email_id: admin.emailId,
    status: admin.status,
    created_at: admin.createdAt ? admin.createdAt.toISOString() : null,
    updated_at: admin.updatedAt ? admin.updatedAt.toISOString() : null
  };
  if (admin.office?.officeName) {
    res.office_name = admin.office.officeName;
  }
  return res;
}

/**
 * List admin accounts with optional status filter and pagination.
 */
export async function listAdmins({ status, page = 1, limit = 20, skip = 0 }) {
  const where = {};
  if (status) {
    const upper = status.toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(upper)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid status filter. Must be ACTIVE or INACTIVE.', [
        { field: 'status', message: 'must be ACTIVE or INACTIVE' }
      ]);
    }
    where.status = upper;
  }

  const [items, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { adminId: 'asc' },
      include: {
        office: { select: { officeId: true, officeName: true } }
      }
    }),
    prisma.admin.count({ where })
  ]);

  return {
    items: items.map(formatAdminResponse),
    page,
    limit,
    total
  };
}

/**
 * Retrieve an admin account's details by ID.
 */
export async function getAdminById(adminId) {
  const id = parseInt(adminId, 10);
  if (isNaN(id) || id <= 0) {
    throw new AppError(400, 'BAD_REQUEST', 'Invalid admin ID.');
  }

  const admin = await prisma.admin.findUnique({
    where: { adminId: id },
    include: {
      office: { select: { officeId: true, officeName: true } }
    }
  });

  if (!admin) {
    throw new AppError(404, 'NOT_FOUND', `Admin with ID ${id} not found.`);
  }

  return formatAdminResponse(admin);
}

/**
 * Create another admin account directly with password hashing.
 */
export async function createAdminAccount(data, actor = {}, ipAddress = null) {
  const adminName = data.admin_name || data.adminName;
  const emailId = data.email_id || data.emailId;
  const phoneNo = data.phone_no || data.phoneNo;
  const officeId = data.office_id || data.officeId;
  const password = data.password;

  const details = [];
  if (!adminName || !adminName.trim()) details.push({ field: 'admin_name', message: 'is required' });
  if (!emailId || !emailId.trim()) details.push({ field: 'email_id', message: 'is required' });
  if (!officeId) details.push({ field: 'office_id', message: 'is required' });
  if (!password || !password.trim()) {
    details.push({ field: 'password', message: 'is required' });
  } else if (password.trim().length < 8) {
    details.push({ field: 'password', message: 'must be at least 8 characters' });
  }

  if (details.length > 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Validation failed.', details);
  }

  const cleanEmail = normalizeEmail(emailId);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Invalid email format.', [
      { field: 'email_id', message: 'must be a valid email address' }
    ]);
  }

  // Duplicate email check (case-insensitive)
  const existing = await prisma.admin.findFirst({
    where: { emailId: { equals: cleanEmail, mode: 'insensitive' } }
  });
  if (existing) {
    throw new AppError(409, 'DUPLICATE_EMAIL', 'A user with this email_id already exists.');
  }

  // Office verification
  const parsedOfficeId = parseInt(officeId, 10);
  const office = await prisma.office.findUnique({
    where: { officeId: parsedOfficeId }
  });
  if (!office) {
    throw new AppError(404, 'NOT_FOUND', 'Office not found.', [
      { field: 'office_id', message: `Office with ID ${parsedOfficeId} does not exist.` }
    ]);
  }

  const passwordHash = await hashPassword(password.trim());

  let newAdmin;
  await prisma.$transaction(async (tx) => {
    newAdmin = await tx.admin.create({
      data: {
        adminName: adminName.trim(),
        emailId: cleanEmail,
        phoneNo: phoneNo?.trim() || null,
        officeId: parsedOfficeId,
        passwordHash,
        status: 'ACTIVE'
      },
      include: {
        office: { select: { officeId: true, officeName: true } }
      }
    });

    await recordAuditLog(tx, {
      actorId: actor.userId || null,
      actorType: 'ADMIN',
      action: 'ADMIN_CREATED',
      entityType: 'ADMIN',
      entityId: newAdmin.adminId,
      newValue: {
        admin_id: newAdmin.adminId,
        admin_name: newAdmin.adminName,
        email_id: newAdmin.emailId,
        office_id: newAdmin.officeId,
        status: newAdmin.status
      },
      ipAddress
    });
  });

  return formatAdminResponse(newAdmin);
}

/**
 * Update permitted admin profile fields.
 * Permitted fields: admin_name, phone_no, email_id, office_id, password.
 */
export async function updateAdminProfile(adminId, data, actor = {}, ipAddress = null) {
  const id = parseInt(adminId, 10);
  if (isNaN(id) || id <= 0) {
    throw new AppError(400, 'BAD_REQUEST', 'Invalid admin ID.');
  }

  const admin = await prisma.admin.findUnique({
    where: { adminId: id },
    include: {
      office: { select: { officeId: true, officeName: true } }
    }
  });

  if (!admin) {
    throw new AppError(404, 'NOT_FOUND', `Admin with ID ${id} not found.`);
  }

  const updateData = {};
  const oldValue = {};
  const newValue = {};

  const adminName = data.admin_name !== undefined ? data.admin_name : data.adminName;
  if (adminName !== undefined) {
    if (!adminName || !adminName.trim()) {
      throw new AppError(422, 'VALIDATION_ERROR', 'admin_name cannot be empty.', [
        { field: 'admin_name', message: 'cannot be empty' }
      ]);
    }
    updateData.adminName = adminName.trim();
    oldValue.admin_name = admin.adminName;
    newValue.admin_name = updateData.adminName;
  }

  const phoneNo = data.phone_no !== undefined ? data.phone_no : data.phoneNo;
  if (phoneNo !== undefined) {
    updateData.phoneNo = phoneNo ? phoneNo.trim() : null;
    oldValue.phone_no = admin.phoneNo;
    newValue.phone_no = updateData.phoneNo;
  }

  const emailId = data.email_id !== undefined ? data.email_id : data.emailId;
  if (emailId !== undefined) {
    const cleanEmail = normalizeEmail(emailId);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid email format.', [
        { field: 'email_id', message: 'must be a valid email address' }
      ]);
    }
    if (cleanEmail !== admin.emailId.toLowerCase()) {
      const duplicate = await prisma.admin.findFirst({
        where: {
          emailId: { equals: cleanEmail, mode: 'insensitive' },
          adminId: { not: id }
        }
      });
      if (duplicate) {
        throw new AppError(409, 'DUPLICATE_EMAIL', 'A user with this email_id already exists.');
      }
    }
    updateData.emailId = cleanEmail;
    oldValue.email_id = admin.emailId;
    newValue.email_id = cleanEmail;
  }

  const officeId = data.office_id !== undefined ? data.office_id : data.officeId;
  if (officeId !== undefined) {
    const parsedOfficeId = parseInt(officeId, 10);
    const office = await prisma.office.findUnique({
      where: { officeId: parsedOfficeId }
    });
    if (!office) {
      throw new AppError(404, 'NOT_FOUND', 'Office not found.', [
        { field: 'office_id', message: `Office with ID ${parsedOfficeId} does not exist.` }
      ]);
    }
    updateData.officeId = parsedOfficeId;
    oldValue.office_id = admin.officeId;
    newValue.office_id = parsedOfficeId;
  }

  if (data.password !== undefined) {
    if (typeof data.password !== 'string' || data.password.trim().length < 8) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Password must be at least 8 characters long.', [
        { field: 'password', message: 'must be at least 8 characters' }
      ]);
    }
    updateData.passwordHash = await hashPassword(data.password.trim());
    newValue.password_changed = true;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'No valid permitted fields provided for update.');
  }

  let updatedAdmin;
  await prisma.$transaction(async (tx) => {
    updatedAdmin = await tx.admin.update({
      where: { adminId: id },
      data: updateData,
      include: {
        office: { select: { officeId: true, officeName: true } }
      }
    });

    // If password was changed, revoke active sessions
    if (updateData.passwordHash) {
      await tx.session.updateMany({
        where: {
          userType: 'ADMIN',
          userId: id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    await recordAuditLog(tx, {
      actorId: actor.userId || null,
      actorType: 'ADMIN',
      action: 'ADMIN_UPDATED',
      entityType: 'ADMIN',
      entityId: id,
      oldValue: Object.keys(oldValue).length > 0 ? oldValue : null,
      newValue: Object.keys(newValue).length > 0 ? newValue : null,
      ipAddress
    });
  });

  return formatAdminResponse(updatedAdmin);
}

/**
 * Activate or deactivate an admin account.
 * Business rules:
 * - Deactivating an admin revokes active sessions transactionally.
 * - Prevents self-deactivation.
 * - Enforces minimum 2 active admins requirement.
 */
export async function changeAdminAccountStatus(adminId, data, actor = {}, ipAddress = null) {
  const id = parseInt(adminId, 10);
  if (isNaN(id) || id <= 0) {
    throw new AppError(400, 'BAD_REQUEST', 'Invalid admin ID.');
  }

  const { status, reason } = data;
  if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Status must be either ACTIVE or INACTIVE.', [
      { field: 'status', message: 'must be either ACTIVE or INACTIVE' }
    ]);
  }

  const targetStatus = status.toUpperCase();

  const admin = await prisma.admin.findUnique({
    where: { adminId: id },
    include: {
      office: { select: { officeId: true, officeName: true } }
    }
  });

  if (!admin) {
    throw new AppError(404, 'NOT_FOUND', `Admin with ID ${id} not found.`);
  }

  // Idempotent no-op if status matches
  if (admin.status === targetStatus) {
    return formatAdminResponse(admin);
  }

  if (targetStatus === 'INACTIVE') {
    // Rule 5: Prevent self-deactivation
    if (actor.userId && actor.userId === id) {
      throw new AppError(400, 'CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own admin account.');
    }

    // Rule 7: Require maintaining at least two active admins
    const activeAdminCount = await prisma.admin.count({
      where: { status: 'ACTIVE' }
    });

    if (activeAdminCount <= 2) {
      throw new AppError(
        422,
        'MINIMUM_ACTIVE_ADMINS_REQUIRED',
        'Cannot deactivate admin. A minimum of two active admins must be maintained in the system for operations such as invoice verification.'
      );
    }
  }

  let updatedAdmin;
  await prisma.$transaction(async (tx) => {
    updatedAdmin = await tx.admin.update({
      where: { adminId: id },
      data: { status: targetStatus },
      include: {
        office: { select: { officeId: true, officeName: true } }
      }
    });

    // If deactivating, revoke all active sessions transactionally
    if (targetStatus === 'INACTIVE') {
      await tx.session.updateMany({
        where: {
          userType: 'ADMIN',
          userId: id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    const auditAction = targetStatus === 'INACTIVE' ? 'USER_DEACTIVATED' : 'USER_REACTIVATED';
    await recordAuditLog(tx, {
      actorId: actor.userId || null,
      actorType: 'ADMIN',
      action: auditAction,
      entityType: 'ADMIN',
      entityId: id,
      oldValue: { status: admin.status },
      newValue: { status: targetStatus },
      reason: reason || null,
      ipAddress
    });
  });

  return formatAdminResponse(updatedAdmin);
}
