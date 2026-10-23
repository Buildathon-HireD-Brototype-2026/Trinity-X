import {
  listPartnerTripReports,
  getPartnerTripReport
} from './report.service.js';

/**
 * GET /reports/trips
 */
export async function listPartnerTripReportsHandler(req, res, next) {
  try {
    const companyId = req.user.userId;
    const result = await listPartnerTripReports(companyId, req.query);

    return res.status(200).json({
      success: true,
      reports: result.items,
      data: {
        items: result.items,
        page: result.page,
        limit: result.limit,
        total: result.total
      },
      message: 'Trip reports retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/trips/:trip_id & GET /partner/trips/:trip_id/report
 */
export async function getPartnerTripReportHandler(req, res, next) {
  try {
    const companyId = req.user.userId;
    const tripId = req.params.trip_id || req.params.tripId;
    const report = await getPartnerTripReport(companyId, tripId);

    return res.status(200).json({
      success: true,
      ...report,
      data: report,
      message: 'Trip report retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}
