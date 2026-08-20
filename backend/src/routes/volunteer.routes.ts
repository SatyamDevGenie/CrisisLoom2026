import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createVolunteerSchema,
  idParamSchema,
  listVolunteerQuery,
  nearbyQuerySchema,
  updateVolunteerSchema,
  volunteerAvailabilitySchema,
  volunteerLocationSchema,
} from "../validators";
import * as volunteerController from "../controllers/volunteer.controller";

const router = Router();

router.get("/nearby", validate(nearbyQuerySchema), volunteerController.nearbyVolunteers);
router.get("/", authenticate, authorize("admin", "ngo_manager", "shelter_staff"), validate(listVolunteerQuery), volunteerController.listVolunteers);

router.use(authenticate);

router.post("/", authorize("volunteer"), validate(createVolunteerSchema), volunteerController.createVolunteer);
router.get("/me", authorize("volunteer"), volunteerController.myVolunteer);
router.patch("/me", authorize("volunteer"), validate(updateVolunteerSchema), volunteerController.updateMyVolunteer);
router.patch("/me/location", authorize("volunteer"), validate(volunteerLocationSchema), volunteerController.updateVolunteerLocation);
router.patch("/me/availability", authorize("volunteer"), validate(volunteerAvailabilitySchema), volunteerController.updateAvailability);
router.get("/:id", validate(idParamSchema), volunteerController.getVolunteer);

export default router;
