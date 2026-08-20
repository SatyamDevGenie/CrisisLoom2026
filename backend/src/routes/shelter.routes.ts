import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createShelterSchema,
  idParamSchema,
  listShelterQuery,
  nearbyQuerySchema,
  occupancySchema,
  updateShelterSchema,
} from "../validators";
import * as shelterController from "../controllers/shelter.controller";

const router = Router();

router.get("/nearby", validate(nearbyQuerySchema), shelterController.nearbyShelters);
router.get("/", validate(listShelterQuery), shelterController.listShelters);
router.get("/:id", validate(idParamSchema), shelterController.getShelter);

router.use(authenticate);

router.post(
  "/",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(createShelterSchema),
  shelterController.createShelter
);
router.patch(
  "/:id",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(updateShelterSchema),
  shelterController.updateShelter
);
router.patch(
  "/:id/occupancy",
  authorize("admin", "ngo_manager", "shelter_staff"),
  validate(occupancySchema),
  shelterController.updateOccupancy
);
router.delete(
  "/:id",
  authorize("admin", "ngo_manager"),
  validate(idParamSchema),
  shelterController.deleteShelter
);

export default router;
