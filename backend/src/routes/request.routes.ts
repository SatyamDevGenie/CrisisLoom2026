import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createRequestSchema,
  idParamSchema,
  listRequestQuery,
  updateRequestSchema,
} from "../validators";
import * as requestController from "../controllers/request.controller";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(createRequestSchema),
  requestController.createRequest
);
router.get("/", validate(listRequestQuery), requestController.listRequests);
router.get("/:id", validate(idParamSchema), requestController.getRequest);
router.patch(
  "/:id",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(updateRequestSchema),
  requestController.updateRequest
);
router.post(
  "/:id/cancel",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(idParamSchema),
  requestController.cancelRequest
);
router.post(
  "/:id/fulfill",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(idParamSchema),
  requestController.fulfillRequest
);

export default router;
