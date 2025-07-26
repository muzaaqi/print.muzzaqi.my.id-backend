import express from "express";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/ServiceController.js";

const router = express.Router();

router.get("/services", getServices);
router.get("/services/:id", getServiceById);
router.post("/services", createService);
router.patch("/services/:id", updateService);
router.delete("/services/:id", deleteService);

export default router;
