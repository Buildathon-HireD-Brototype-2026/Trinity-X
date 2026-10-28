import prisma from '../config/db.js';

/**
 * Format IP address for PostgreSQL INET type.
 * Cleans IPv6 loopback (::1, ::ffff:127.0.0.1) to standard 127.0.0.1.
 */
function cleanIp(ip) {
  if (!ip) return '127.0.0.1';
  let cleaned = String(ip).trim();
  if (cleaned === '::1' || cleaned === '::ffff:127.0.0.1') return '127.0.0.1';
  if (cleaned.startsWith('::ffff:')) return cleaned.replace('::ffff:', '');
  return cleaned;
}

/**
 * Record an audit log entry in the database.
 * If a transaction client (tx) is provided, uses it to ensure atomicity.
 */
export async function recordAuditLog(txOrPrisma, {
  actorId = null,
  actorType = 'ADMIN',
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  reason = null
}) {
  const client = txOrPrisma || prisma;
  return await client.auditLog.create({
    data: {
      actorId: actorId ? Number(actorId) : null,
      actorType: String(actorType),
      action: String(action),
      entityType: String(entityType),
      entityId: Number(entityId),
      oldValue: oldValue ? oldValue : undefined,
      newValue: newValue ? newValue : undefined,
      ipAddress: cleanIp(ipAddress),
      reason: reason ? String(reason) : null
    }
  });
}
