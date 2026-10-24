import {
  listPartnerOrders,
  createPartnerOrder,
  getPartnerOrder,
  listAdminOrders,
  acceptOrder,
  rejectOrder,
  assignDriverToTrip,
  formatOrderResponse
} from './order.service.js';
import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';

/**
 * GET /orders & GET /partner/orders
 */
export async function listPartnerOrdersHandler(req, res, next) {
  try {
    const companyId = req.user.userId;
    const result = await listPartnerOrders(companyId, req.query);

    return res.status(200).json({
      success: true,
      orders: result.items,
      data: {
        items: result.items,
        page: result.page,
        limit: result.limit,
        total: result.total
      },
      message: 'Orders retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /orders & POST /partner/orders
 */
export async function createPartnerOrderHandler(req, res, next) {
  try {
    const companyId = req.user.userId;
    const order = await createPartnerOrder(companyId, req.body);

    return res.status(201).json({
      success: true,
      order,
      data: order,
      message: 'Order created.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orders/:order_id & GET /partner/orders/:order_id
 */
export async function getPartnerOrderHandler(req, res, next) {
  try {
    const companyId = req.user.userId;
    const orderId = req.params.order_id || req.params.orderId;
    const order = await getPartnerOrder(companyId, orderId);

    return res.status(200).json({
      success: true,
      ...order,
      data: order,
      message: 'OK'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/orders
 */
export async function listAdminOrdersHandler(req, res, next) {
  try {
    const result = await listAdminOrders(req.query);

    return res.status(200).json({
      success: true,
      orders: result.items,
      data: {
        items: result.items,
        page: result.page,
        limit: result.limit,
        total: result.total
      },
      message: 'OK'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/orders/:order_id
 */
export async function getAdminOrderHandler(req, res, next) {
  try {
    const orderId = Number(req.params.order_id || req.params.orderId);
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        company: true,
        trip: {
          include: {
            driver: true
          }
        }
      }
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found.');
    }

    const formatted = formatOrderResponse(order);
    return res.status(200).json({
      success: true,
      data: formatted,
      message: 'OK'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/orders/:order_id/accept
 */
export async function acceptOrderHandler(req, res, next) {
  try {
    const orderId = Number(req.params.order_id || req.params.orderId);
    const adminId = req.user.userId;
    const result = await acceptOrder(orderId, adminId, req.body, req.ip);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Order accepted.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/orders/:order_id/reject
 */
export async function rejectOrderHandler(req, res, next) {
  try {
    const orderId = Number(req.params.order_id || req.params.orderId);
    const adminId = req.user.userId;
    const result = await rejectOrder(orderId, adminId, req.body, req.ip);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Order rejected.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/trips/:trip_id/assign-driver
 */
export async function assignDriverHandler(req, res, next) {
  try {
    const tripId = Number(req.params.trip_id || req.params.tripId);
    const adminId = req.user.userId;
    const result = await assignDriverToTrip(tripId, adminId, req.body, req.ip);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Driver assigned.'
    });
  } catch (err) {
    next(err);
  }
}
