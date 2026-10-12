import {
  listDrivers,
  getDriverDetailById,
  listDriverDocuments,
  generateDocumentSignedLink,
  changeDriverStatus,
  getDriverWallet,
  createWalletDebit
} from './driver.service.js';
import { successResponse, listResponse } from '../../shared/response.js';
import { parsePagination } from '../../middlewares/validate.middleware.js';

function getBaseUrl(req) {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

export async function listDriversHandler(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { status, is_online, available_on } = req.query;

    const result = await listDrivers({
      status,
      is_online,
      available_on,
      page,
      limit,
      skip
    });

    return listResponse(res, result.items, result.page, result.limit, result.total, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function getDriverHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const driver = await getDriverDetailById(driverId);
    return successResponse(res, 200, driver, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function listDriverDocumentsHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const documents = await listDriverDocuments(driverId);
    return successResponse(res, 200, documents, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function getDocumentSignedLinkHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const documentId = req.params.document_id || req.params.documentId;
    const baseUrl = getBaseUrl(req);

    const linkData = await generateDocumentSignedLink(driverId, documentId, baseUrl);
    return successResponse(res, 200, linkData, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function changeDriverStatusHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const driver = await changeDriverStatus(driverId, req.body, req.user, req.ip);
    return successResponse(res, 200, driver, 'Driver status changed.');
  } catch (err) {
    next(err);
  }
}

export async function getDriverWalletHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const { page, limit, skip } = parsePagination(req);

    const wallet = await getDriverWallet(driverId, { page, limit, skip });
    return successResponse(res, 200, wallet, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function createWalletDebitHandler(req, res, next) {
  try {
    const driverId = req.params.driver_id || req.params.driverId;
    const debitTx = await createWalletDebit(driverId, req.body, req.user, req.ip);
    return successResponse(res, 201, debitTx, 'Debit recorded.');
  } catch (err) {
    next(err);
  }
}
