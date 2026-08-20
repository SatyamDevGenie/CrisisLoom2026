import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  idParamSchema,
  listUsersQuery,
  updateRoleSchema,
  updateStatusSchema,
  updateUserSchema,
} from "../validators";
import * as userController from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("admin", "ngo_manager"), validate(listUsersQuery), userController.listUsers);
router.get("/:id", validate(idParamSchema), userController.getUser);
router.patch("/:id", validate(updateUserSchema), userController.updateUser);
router.patch("/:id/role", authorize("admin"), validate(updateRoleSchema), userController.updateRole);
router.patch("/:id/status", authorize("admin"), validate(updateStatusSchema), userController.updateStatus);
router.delete("/:id", authorize("admin"), validate(idParamSchema), userController.deleteUser);

export default router;
