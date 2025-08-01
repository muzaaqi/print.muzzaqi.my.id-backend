import { PrismaClient } from "../generated/prisma/index.js";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/r2.js";
import { snap } from "../lib/midtrans.js";
import { updatePagesStock } from "./ServiceController.js";

const prisma = new PrismaClient();

export const getTransactions = async (req, res) => {
  try {
    const response = await prisma.transaction.findMany({
      include: {
        service: {
          select: {
            serviceName: true, // hanya ambil nama service
          },
        },
      },
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const createTransaction = async (req, res) => {
  const {
    name,
    phone,
    serviceId,
    pageQuantity,
    type,
    color,
    note,
    totalPrice,
    paymentStatus,
  } = req.body;

  const order_id = `TRX-${Date.now()}`; // ID dalam Prisma schema adalah String (cuid)
  const parameter = {
    transaction_details: {
      order_id: order_id,
      gross_amount: Number(totalPrice),
    },
    customer_details: {
      first_name: name,
      phone: phone,
    },
  };

  const snapResponse = await snap.createTransaction(parameter);
  const snapToken = snapResponse.token;
  const redirectUrl = snapResponse.redirect_url;

  try {
    let fileUrl = null;

    if (req.file) {
      const key = `${name}-[${serviceId}][${type}]-[${color}]-${req.file.originalname.replace(
        /\s+/g,
        "_"
      )}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          Metadata: {
            "Content-Disposition": `attachment; filename="${key}"`,
          },
        })
      );

      fileUrl = key;
    }

    const transaction = await prisma.transaction.create({
      data: {
        id: order_id,
        name,
        phone,
        serviceId,
        pageQuantity: Number(pageQuantity),
        type,
        color,
        status: "pending",
        note,
        totalPrice: Number(totalPrice),
        paymentStatus,
        fileUrl,
      },
      include: {
        service: {
          select: {
            serviceName: true,
          },
        },
      },
    });

    updatePagesStock(serviceId, pageQuantity);

    res.status(201).json({ transaction, snapToken, redirectUrl });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const updateStatusTransaction = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    const transaction = await prisma.transaction.update({
      where: {
        id: id, // ID dalam Prisma schema adalah String (cuid)
      },
      data: {
        status: status,
      },
    });
    res.status(200).json(transaction);
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ msg: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  const { id } = req.params;

  try {
    // Cari data dulu, termasuk fileUrl
    const transaction = await prisma.transaction.findUnique({
      where: { id: id }, // ID dalam schema adalah String (cuid), bukan Number
    });

    if (!transaction) {
      return res.status(404).json({ msg: "Transaction not found" });
    }

    // Jika ada fileUrl, hapus file dari R2
    if (transaction.fileUrl) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: transaction.fileUrl, // fileUrl sudah berupa key
          })
        );
        console.log(`✅ File deleted from R2: ${transaction.fileUrl}`);
      } catch (fileError) {
        console.warn(`⚠️ Failed to delete file from R2: ${fileError.message}`);
        // Continue with transaction deletion even if file deletion fails
      }
    }

    // Kembalikan stock pages
    if (transaction.serviceId && transaction.pageQuantity) {
      try {
        // Tambahkan kembali stock yang sudah dikurangi
        const service = await prisma.service.findUnique({
          where: { id: transaction.serviceId },
        });

        if (service) {
          await prisma.service.update({
            where: { id: transaction.serviceId },
            data: {
              remainingStock: service.remainingStock + transaction.pageQuantity,
            },
          });
          console.log(`✅ Stock restored: +${transaction.pageQuantity} pages`);
        }
      } catch (stockError) {
        console.warn(`⚠️ Failed to restore stock: ${stockError.message}`);
      }
    }

    // Hapus data dari PostgreSQL
    await prisma.transaction.delete({
      where: { id: id },
    });

    console.log(`✅ Transaction deleted: ${id}`);
    res.status(200).json({
      msg: "Transaction and associated files deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({
      msg: "Failed to delete transaction",
      error: error.message,
      success: false,
    });
  }
};

export const getDownloadUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || !transaction.fileUrl) {
      return res.status(404).json({ msg: "File not found." });
    }

    const key = transaction.fileUrl.trim(); // ✅ extra safety

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60 * 5,
    });

    res.status(200).json({ url: signedUrl });
  } catch (error) {
    console.error("❌ SIGNED URL ERROR:", error);
    res.status(500).json({
      msg: "Failed to generate signed URL",
      error: error.message,
    });
  }
};

export const handleMidtransNotification = async (req, res) => {
  try {
    const notification = req.body;

    const {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      settlement_time,
    } = notification;

    // Buat logic penyesuaian status
    let paymentStatus = "pending";

    if (transaction_status === "capture") {
      if (fraud_status === "challenge") {
        paymentStatus = "challenge";
      } else if (fraud_status === "accept") {
        paymentStatus = "paid";
      }
    } else if (transaction_status === "settlement") {
      paymentStatus = "paid";
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire"
    ) {
      paymentStatus = "failed";
    } else if (transaction_status === "pending") {
      paymentStatus = "pending";
    }

    await prisma.transaction.update({
      where: { id: order_id },
      data: { paymentStatus },
    });

    res.status(200).json({ msg: "Payment status updated" });
  } catch (err) {
    console.error("🔴 Webhook error:", err);
    res.status(500).json({ msg: "Webhook error", error: err.message });
  }
};