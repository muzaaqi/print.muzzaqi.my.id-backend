import express from "express";
import multer from "multer";
import {
  getTransactions,
  createTransaction,
  updateStatusTransaction,
  getDownloadUrl
} from "../controllers/TransactionController.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/transaction", getTransactions);
router.post("/transaction", upload.single("file"), createTransaction);
router.patch("/transaction/:id", updateStatusTransaction);
router.get("/transaction/:id/download", getDownloadUrl);

export default router;
