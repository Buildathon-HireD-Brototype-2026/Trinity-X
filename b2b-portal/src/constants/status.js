/**
 * HireD Official Status Constants & Display Mappings
 * Reference: HireD PRD Phase 1 MVP v0.2 & database_updated0.2.md
 */

export const ORDER_STATUS = {
  RECEIVED: 'RECEIVED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
};

export const TRIP_STATUS = {
  UNASSIGNED: 'UNASSIGNED',
  ASSIGNED: 'ASSIGNED',
  ONGOING: 'ONGOING',
  CLOSED: 'CLOSED',
};

export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
};

export const STATUS_META = {
  // Orders
  RECEIVED: {
    label: 'Received',
    className: 'status-received',
    description: 'Order placed, awaiting Admin review',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'status-accepted',
    description: 'Order approved and converted to trip',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'status-rejected',
    description: 'Order declined by admin',
  },

  // Trips
  UNASSIGNED: {
    label: 'Unassigned',
    className: 'status-unassigned',
    description: 'Awaiting driver assignment by admin',
  },
  ASSIGNED: {
    label: 'Assigned',
    className: 'status-assigned',
    description: 'Driver assigned, awaiting trip start',
  },
  ONGOING: {
    label: 'Ongoing',
    className: 'status-ongoing',
    description: 'Trip in progress with verified driver selfie',
  },
  CLOSED: {
    label: 'Closed',
    className: 'status-closed',
    description: 'Trip completed and verified with OTP',
  },

  // Invoices (Partner only has access to PUBLISHED)
  PUBLISHED: {
    label: 'Published',
    className: 'status-published',
    description: 'Verified by 2 admins and available for partner settlement',
  },
};
