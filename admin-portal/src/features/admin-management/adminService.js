/**
 * adminService.js
 * Service for Admin Management.
 * Connected directly to backend PostgreSQL via apiClient.
 */
import apiClient from '../../services/apiClient';

/**
 * Returns the list of admins from PostgreSQL database.
 */
export async function getAdmins() {
  const res = await apiClient.get('/admin/admins');
  const items = res?.data?.items || res?.data || [];
  if (!Array.isArray(items)) return [];

  return items.map((a) => {
    const id = a.admin_id || a.adminId || a.id;
    return {
      id: id ? `ADM-${String(id).padStart(3, '0')}` : 'ADM-001',
      admin_id: id,
      admin_name: a.admin_name || a.adminName || 'Admin',
      email_id: a.email_id || a.emailId || '',
      phone_no: a.phone_no || a.phoneNo || '',
      office_id: a.office_id || a.officeId || 1,
      office_name: a.office_name || a.office?.officeName || 'Head Office',
      status: a.status || 'ACTIVE',
      created_at: a.created_at || a.createdAt || new Date().toISOString()
    };
  });
}

/**
 * Adds a new admin to the backend database.
 * @param {object} data
 */
export async function addAdmin(data) {
  const { admin_name, email_id, phone_no, password, office_id } = data;

  if (!admin_name || !email_id || !phone_no) {
    throw new Error('Please fill in all required fields.');
  }

  const payload = {
    adminName: admin_name.trim(),
    emailId: email_id.trim().toLowerCase(),
    phoneNo: phone_no.trim(),
    password: password || 'Admin@12345',
    officeId: Number(office_id) || 1
  };

  const res = await apiClient.post('/admin/admins', payload);
  const created = res?.data || {};
  const id = created.admin_id || created.adminId || created.id;

  return {
    id: id ? `ADM-${String(id).padStart(3, '0')}` : 'ADM-NEW',
    admin_id: id,
    admin_name: created.admin_name || created.adminName || admin_name,
    email_id: created.email_id || created.emailId || email_id,
    phone_no: created.phone_no || created.phoneNo || phone_no,
    office_id: created.office_id || created.officeId || 1,
    status: created.status || 'ACTIVE',
    created_at: created.created_at || created.createdAt || new Date().toISOString()
  };
}

/**
 * Deactivates an admin account on the backend.
 * @param {string|number} adminId
 * @param {string} currentUserId
 */
export async function deactivateAdmin(adminId, currentUserId) {
  const cleanId = String(adminId).replace(/\D/g, '') || adminId;
  const res = await apiClient.patch(`/admin/admins/${cleanId}/status`, {
    status: 'INACTIVE'
  });
  return res?.data;
}
