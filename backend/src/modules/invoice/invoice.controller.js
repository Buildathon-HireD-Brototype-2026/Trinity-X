import {
  listPartnerInvoices,
  getPartnerInvoiceDetail,
  listAdminInvoices,
  getAdminInvoiceDetail,
  approveFirstAdminInvoice,
  approveSecondAdminInvoice,
  dispatchAdminInvoiceEmail
} from './invoice.service.js';

/**
 * GET /invoices & GET /partner/invoices
 */
export async function listPartnerInvoicesHandler(req, res, next) {
  try {
    const companyId = req.user.userId;
    const result = await listPartnerInvoices(companyId, req.query);

    return res.status(200).json({
      success: true,
      invoices: result.items,
      data: {
        items: result.items,
        page: result.page,
        limit: result.limit,
        total: result.total
      },
      message: 'Statements retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /invoices/:invoice_id & GET /partner/invoices/:invoice_id
 */
export async function getPartnerInvoiceDetailHandler(req, res, next) {
  try {
    const companyId = req.user.userId;
    const invoiceId = req.params.invoice_id || req.params.invoiceId;
    const invoice = await getPartnerInvoiceDetail(companyId, invoiceId);

    return res.status(200).json({
      success: true,
      ...invoice,
      data: invoice,
      message: 'Statement retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/invoices
 */
export async function listAdminInvoicesHandler(req, res, next) {
  try {
    const result = await listAdminInvoices(req.query);

    return res.status(200).json({
      success: true,
      invoices: result.items,
      metrics: result.metrics,
      data: {
        items: result.items,
        metrics: result.metrics,
        page: result.page,
        limit: result.limit,
        total: result.total
      },
      message: 'Invoices retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/invoices/:invoice_id
 */
export async function getAdminInvoiceHandler(req, res, next) {
  try {
    const invoiceId = req.params.invoice_id || req.params.id;
    const invoice = await getAdminInvoiceDetail(invoiceId);

    return res.status(200).json({
      success: true,
      invoice,
      data: invoice,
      message: 'Statement details retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/invoices/:invoice_id/verify-first
 */
export async function verifyFirstInvoiceHandler(req, res, next) {
  try {
    const invoiceId = req.params.invoice_id || req.params.id;
    const invoice = await approveFirstAdminInvoice(invoiceId, req.user, req.ip);

    return res.status(200).json({
      success: true,
      invoice,
      data: invoice,
      message: 'First verification sign-off recorded successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/invoices/:invoice_id/verify-second
 */
export async function verifySecondInvoiceHandler(req, res, next) {
  try {
    const invoiceId = req.params.invoice_id || req.params.id;
    const invoice = await approveSecondAdminInvoice(invoiceId, req.user, req.ip);

    return res.status(200).json({
      success: true,
      invoice,
      data: invoice,
      message: 'Second verification sign-off recorded successfully. Statement is now verified.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/invoices/:invoice_id/dispatch-email
 */
export async function dispatchInvoiceEmailHandler(req, res, next) {
  try {
    const invoiceId = req.params.invoice_id || req.params.id;
    const { recipientEmail, ccEmails, notes } = req.body;
    const result = await dispatchAdminInvoiceEmail(
      invoiceId,
      {
        recipientEmail,
        ccEmails,
        notes,
        senderAdmin: req.user.profile || req.user
      },
      req.ip
    );

    return res.status(200).json({
      success: true,
      ...result,
      data: result,
      message: 'Invoice statement dispatched to B2B company email successfully.'
    });
  } catch (err) {
    next(err);
  }
}
