import {
  listPartnerInvoices,
  getPartnerInvoiceDetail
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
