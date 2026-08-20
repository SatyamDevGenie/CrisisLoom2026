import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import shelterRoutes from "./shelter.routes";
import volunteerRoutes from "./volunteer.routes";
import donorRoutes from "./donor.routes";
import disasterRoutes from "./disaster.routes";
import resourceRoutes from "./resource.routes";
import requestRoutes from "./request.routes";
import assignmentRoutes from "./assignment.routes";
import notificationRoutes from "./notification.routes";
import dashboardRoutes from "./dashboard.routes";
import healthRoutes from "./health.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/shelters", shelterRoutes);
router.use("/volunteers", volunteerRoutes);
router.use("/donors", donorRoutes);
router.use("/disasters", disasterRoutes);
router.use("/resources", resourceRoutes);
router.use("/requests", requestRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
