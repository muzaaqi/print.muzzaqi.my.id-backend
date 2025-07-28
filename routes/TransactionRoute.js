import express from "express";
import multer from "multer";
import {
  getTransactions,
  createTransaction,
  updateStatusTransaction,
} from "../controllers/TransactionController.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});

const upload = multer({ storage: storage });

const router = express.Router();

router.get("/transaction", getTransactions);
router.post("/transaction", upload.single("file"), createTransaction);
router.patch("/transaction/:id", updateStatusTransaction);

export default router;
