import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { updateResourceSchema, upsertResourceSchema } from "../validators";
import * as resourceController from "../controllers/resource.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/low-stock",
  authorize("admin", "ngo_manager", "shelter_staff"),
  resourceController.lowStock
);
router.get(
  "/shelter/:shelterId",
  resourceController.listShelterResources
);
router.post(
  "/shelter/:shelterId",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(upsertResourceSchema),
  resourceController.upsertResource
);
router.patch(
  "/:id",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(updateResourceSchema),
  resourceController.updateResource
);

export default router;
