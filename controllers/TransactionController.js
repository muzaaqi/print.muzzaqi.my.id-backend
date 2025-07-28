import { PrismaClient } from "../generated/prisma/index.js";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../lib/r2.js";
import { updatePagesStock } from "./ServiceController.js";

const prisma = new PrismaClient();

export const getTransactions = async (req, res) => {
  try {
    const response = await prisma.transaction.findMany();
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
}

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



  try {
    let fileUrl = null;

    if (req.file) {
      const key = `${Date.now()}-${req.file.originalname}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );

      fileUrl = `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT}.r2.cloudflarestorage.com/${key}`;
    }

    const transaction = await prisma.transaction.create({
      data: {
        name,
        phone,
        serviceId,
        pageQuantity,
        type,
        color,
        status : "pending",
        note,
        totalPrice,
        paymentStatus,
        fileUrl, // ← simpan URL file
      },
    });

    updatePagesStock(serviceId, pageQuantity);

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const updateStatusTransaction = async (req, res) => {
  const { status } = req.body;
  try {
    const transaction = await prisma.transaction.update({
      where: {
        id: req.params.id,
      },
      data: {
        status: status,
      },
    });
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
}

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