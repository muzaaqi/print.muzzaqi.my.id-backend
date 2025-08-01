import express from "express";
import multer from "multer";
import {
  getTransactions,
  createTransaction,
  updateStatusTransaction,
  deleteTransaction,
  getDownloadUrl,
  handleMidtransNotification,
} from "../controllers/TransactionController.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/transaction", getTransactions);
router.post("/transaction", upload.single("file"), createTransaction);
router.patch("/transaction/:id", updateStatusTransaction);
router.delete("/transaction/:id", deleteTransaction);
router.get("/transaction/:id/download", getDownloadUrl);
router.post("/transaction/midtrans-notification", handleMidtransNotification);

export default router;
