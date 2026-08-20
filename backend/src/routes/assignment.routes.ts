import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createAssignmentSchema,
  idParamSchema,
  listAssignmentQuery,
} from "../validators";
import * as assignmentController from "../controllers/assignment.controller";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize("admin", "ngo_manager"),
  validate(createAssignmentSchema),
  assignmentController.createAssignment
);
router.get("/", validate(listAssignmentQuery), assignmentController.listAssignments);
router.post(
  "/:id/accept",
  authorize("volunteer", "donor"),
  validate(idParamSchema),
  assignmentController.acceptAssignment
);
router.post(
  "/:id/reject",
  authorize("volunteer", "donor"),
  validate(idParamSchema),
  assignmentController.rejectAssignment
);
router.post(
  "/:id/complete",
  authorize("volunteer", "donor", "admin", "ngo_manager"),
  validate(idParamSchema),
  assignmentController.completeAssignment
);

export default router;
