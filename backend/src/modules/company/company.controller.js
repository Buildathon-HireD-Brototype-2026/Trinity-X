import {
  listCompanies,
  createCompany,
  getCompanyById,
  updateCompany,
  updatePayoutSplit,
  changeCompanyStatus
} from './company.service.js';
import { successResponse, listResponse } from '../../shared/response.js';
import { parsePagination } from '../../middlewares/validate.middleware.js';

export async function listCompaniesHandler(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { status } = req.query;

    const result = await listCompanies({ status, page, limit, skip });
    return listResponse(res, result.items, result.page, result.limit, result.total, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function createCompanyHandler(req, res, next) {
  try {
    const company = await createCompany(req.body, req.user, req.ip);
    return successResponse(res, 201, company, 'Company created.');
  } catch (err) {
    next(err);
  }
}

export async function getCompanyHandler(req, res, next) {
  try {
    const companyId = req.params.company_id || req.params.companyId;
    const company = await getCompanyById(companyId);
    return successResponse(res, 200, company, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function updateCompanyHandler(req, res, next) {
  try {
    const companyId = req.params.company_id || req.params.companyId;
    const company = await updateCompany(companyId, req.body, req.user, req.ip);
    return successResponse(res, 200, company, 'Company updated.');
  } catch (err) {
    next(err);
  }
}

export async function updatePayoutSplitHandler(req, res, next) {
  try {
    const companyId = req.params.company_id || req.params.companyId;
    const company = await updatePayoutSplit(companyId, req.body, req.user, req.ip);
    return successResponse(res, 200, company, 'Payout split updated.');
  } catch (err) {
    next(err);
  }
}

export async function changeCompanyStatusHandler(req, res, next) {
  try {
    const companyId = req.params.company_id || req.params.companyId;
    const company = await changeCompanyStatus(companyId, req.body, req.user, req.ip);
    return successResponse(res, 200, company, 'Company status changed.');
  } catch (err) {
    next(err);
  }
}
