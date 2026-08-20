import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", notificationController.listNotifications);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", validate(idParamSchema), notificationController.markRead);

export default router;
