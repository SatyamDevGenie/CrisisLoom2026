import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createDonorSchema,
  idParamSchema,
  nearbyQuerySchema,
  updateDonorSchema,
} from "../validators";
import * as donorController from "../controllers/donor.controller";

const router = Router();

router.get("/nearby", validate(nearbyQuerySchema), donorController.nearbyDonors);

router.use(authenticate);

router.get("/", authorize("admin", "ngo_manager"), donorController.listDonors);
router.post("/", authorize("donor"), validate(createDonorSchema), donorController.createDonor);
router.get("/me", authorize("donor"), donorController.myDonor);
router.patch("/me", authorize("donor"), validate(updateDonorSchema), donorController.updateMyDonor);
router.get("/:id", validate(idParamSchema), donorController.getDonor);

export default router;
