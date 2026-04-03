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

/** In-memory store */
const notifications: Map<string, Notification> = new Map();
let nextId = 1;

/**
 * Create a new notification for a client.
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
 * List notifications with optional filters.
 * Supports filtering by clientId, type, read status, and priority.
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
 * Get a single notification by ID.
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
 * Mark a notification as read.
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
 * Mark all notifications for a client as read.
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
 * Delete a notification.
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
