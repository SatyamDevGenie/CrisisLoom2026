import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();

router.use(authenticate, authorize("admin", "ngo_manager", "shelter_staff"));

router.get("/stats", dashboardController.getStats);
router.get("/activity", dashboardController.getActivity);

export default router;
