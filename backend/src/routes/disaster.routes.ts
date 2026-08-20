import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createDisasterSchema,
  idParamSchema,
  listDisasterQuery,
  updateDisasterSchema,
} from "../validators";
import * as disasterController from "../controllers/disaster.controller";

const router = Router();

router.get("/active", disasterController.activeDisasters);
router.get("/", validate(listDisasterQuery), disasterController.listDisasters);
router.get("/:id", validate(idParamSchema), disasterController.getDisaster);
router.get("/:id/nearby-assets", authenticate, validate(idParamSchema), disasterController.nearbyAssets);

router.use(authenticate);

router.post(
  "/",
  authorize("admin", "ngo_manager"),
  validate(createDisasterSchema),
  disasterController.createDisaster
);
router.patch(
  "/:id",
  authorize("admin", "ngo_manager"),
  validate(updateDisasterSchema),
  disasterController.updateDisaster
);

export default router;
