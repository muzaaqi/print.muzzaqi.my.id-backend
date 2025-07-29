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

  const parameter = {
    transaction_details: {
      order_id: `TRX-${Date.now()}`,
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
      where: { id: Number(id) },
    });

    if (!transaction) {
      return res.status(404).json({ msg: "Transaction not found" });
    }

    // Jika ada fileUrl, ambil key-nya dan hapus dari R2
    if (transaction.fileUrl) {
      const url = new URL(transaction.fileUrl);
      const key = url.pathname.substring(1); // hapus `/` di awal path

      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
        })
      );
    }

    // Hapus data dari PostgreSQL
    await prisma.transaction.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ msg: "Transaction deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Failed to delete transaction" });
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
