import { Router } from "express";
import { healthcheck } from "../controllers/health.controller.js";

const router = Router();

// Public route, no auth needed
router.get("/healthcheck", healthcheck);

export default router;
