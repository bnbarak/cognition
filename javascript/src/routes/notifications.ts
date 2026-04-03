import { Router, Request, Response } from "express";

const router = Router();

interface Notification {
  id: string;
  clientId: string;
  type: "claim_update" | "policy_renewal" | "payment_due" | "document_request" | "general";
  title: string;
  message: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  readAt: string | null;
  metadata?: Record<string, string>;
}

interface CreateNotificationRequest {
  clientId: string;
  type: Notification["type"];
  title: string;
  message: string;
  priority?: Notification["priority"];
  metadata?: Record<string, string>;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique notification identifier
 *           example: NOTIF-000001
 *         clientId:
 *           type: string
 *           description: ID of the client this notification belongs to
 *           example: cli_001
 *         type:
 *           type: string
 *           enum: [claim_update, policy_renewal, payment_due, document_request, general]
 *           description: Category of the notification
 *         title:
 *           type: string
 *           description: Short notification title
 *           example: Policy Renewal Due
 *         message:
 *           type: string
 *           description: Full notification message body
 *           example: Your auto policy SF-2024-00123 is due for renewal on Jan 1.
 *         read:
 *           type: boolean
 *           description: Whether the notification has been read
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: Notification priority level
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: ISO 8601 timestamp when the notification was created
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: ISO 8601 timestamp when the notification was read, or null
 *         metadata:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           description: Optional key-value metadata
 *     CreateNotificationRequest:
 *       type: object
 *       required: [clientId, type, title, message]
 *       properties:
 *         clientId:
 *           type: string
 *           description: ID of the client to notify
 *           example: cli_001
 *         type:
 *           type: string
 *           enum: [claim_update, policy_renewal, payment_due, document_request, general]
 *         title:
 *           type: string
 *           example: Policy Renewal Due
 *         message:
 *           type: string
 *           example: Your auto policy is due for renewal.
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: Defaults to medium if not provided
 *         metadata:
 *           type: object
 *           additionalProperties:
 *             type: string
 */

/** In-memory store */
const notifications: Map<string, Notification> = new Map();
let nextId = 1;

/**
 * @openapi
 * /api/notifications:
 *   post:
 *     summary: Create a notification
 *     description: Creates a new notification for a client. Requires clientId, type, title, and message.
 *     tags: [Notifications]
 *     operationId: createNotification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotificationRequest'
 *     responses:
 *       '201':
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       '400':
 *         description: Missing required fields (clientId, type, title, or message)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */
router.post("/", (req: Request<{}, {}, CreateNotificationRequest>, res: Response) => {
  const { clientId, type, title, message, priority, metadata } = req.body;

  if (!clientId || !type || !title || !message) {
    res.status(400).json({
      success: false,
      message: "Missing required fields: clientId, type, title, and message are required",
    });
    return;
  }

  const id = `NOTIF-${String(nextId++).padStart(6, "0")}`;
  const notification: Notification = {
    id,
    clientId,
    type,
    title,
    message,
    read: false,
    priority: priority || "medium",
    createdAt: new Date().toISOString(),
    readAt: null,
    metadata,
  };

  notifications.set(id, notification);
  res.status(201).json({ success: true, data: notification });
});

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: List notifications
 *     description: Returns a paginated list of notifications. Supports filtering by clientId, type, read status, and priority. Sorted by newest first.
 *     tags: [Notifications]
 *     operationId: listNotifications
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter by client ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [claim_update, policy_renewal, payment_due, document_request, general]
 *         description: Filter by notification type
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: If "true", only return unread notifications
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority level
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       '200':
 *         description: Paginated list of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get("/", (req: Request, res: Response) => {
  const clientId = req.query.clientId as string | undefined;
  const type = req.query.type as string | undefined;
  const unreadOnly = req.query.unreadOnly === "true";
  const priority = req.query.priority as string | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  let results = Array.from(notifications.values());

  if (clientId) results = results.filter((n) => n.clientId === clientId);
  if (type) results = results.filter((n) => n.type === type);
  if (unreadOnly) results = results.filter((n) => !n.read);
  if (priority) results = results.filter((n) => n.priority === priority);

  // Sort by createdAt descending (newest first)
  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = results.length;
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  res.json({ notifications: paged, total, page, limit, totalPages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /api/notifications/{notificationId}:
 *   get:
 *     summary: Get a notification by ID
 *     description: Returns a single notification by its unique identifier.
 *     tags: [Notifications]
 *     operationId: getNotification
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique notification ID
 *         example: NOTIF-000001
 *     responses:
 *       '200':
 *         description: Notification found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       '404':
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */
router.get("/:notificationId", (req: Request<{ notificationId: string }>, res: Response) => {
  const notification = notifications.get(req.params.notificationId);
  if (!notification) {
    res.status(404).json({ success: false, message: `Notification ${req.params.notificationId} not found` });
    return;
  }
  res.json({ success: true, data: notification });
});

/**
 * @openapi
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     description: Sets the notification's read flag to true and records the readAt timestamp.
 *     tags: [Notifications]
 *     operationId: markNotificationRead
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique notification ID
 *         example: NOTIF-000001
 *     responses:
 *       '200':
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       '404':
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */
router.patch("/:notificationId/read", (req: Request<{ notificationId: string }>, res: Response) => {
  const notification = notifications.get(req.params.notificationId);
  if (!notification) {
    res.status(404).json({ success: false, message: `Notification ${req.params.notificationId} not found` });
    return;
  }

  notification.read = true;
  notification.readAt = new Date().toISOString();
  res.json({ success: true, data: notification });
});

/**
 * @openapi
 * /api/notifications/client/{clientId}/read-all:
 *   patch:
 *     summary: Mark all client notifications as read
 *     description: Marks all unread notifications for a given client as read. Returns the count of notifications updated.
 *     tags: [Notifications]
 *     operationId: markAllClientNotificationsRead
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID whose notifications should be marked as read
 *         example: cli_001
 *     responses:
 *       '200':
 *         description: All client notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                   description: Number of notifications marked as read
 */
router.patch("/client/:clientId/read-all", (req: Request<{ clientId: string }>, res: Response) => {
  const now = new Date().toISOString();
  let count = 0;

  for (const notification of notifications.values()) {
    if (notification.clientId === req.params.clientId && !notification.read) {
      notification.read = true;
      notification.readAt = now;
      count++;
    }
  }

  res.json({ success: true, message: `Marked ${count} notifications as read`, count });
});

/**
 * @openapi
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Permanently deletes a notification by its ID.
 *     tags: [Notifications]
 *     operationId: deleteNotification
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique notification ID
 *         example: NOTIF-000001
 *     responses:
 *       '200':
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '404':
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */
router.delete("/:notificationId", (req: Request<{ notificationId: string }>, res: Response) => {
  if (!notifications.has(req.params.notificationId)) {
    res.status(404).json({ success: false, message: `Notification ${req.params.notificationId} not found` });
    return;
  }

  notifications.delete(req.params.notificationId);
  res.status(200).json({ success: true, message: "Notification deleted" });
});

export default router;
