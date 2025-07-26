import { PrismaClient } from "../generated/prisma/index.js";

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
  const {name, phone, description, serviceId, type, status, quantity, totalPricem, paymentStatus, fileUrl} = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: {
        name: name,
        phone: phone,
        description: description,
        serviceId: serviceId,
        type: type,
        status: status,
        quantity: quantity,
        totalPrice: totalPricem,
        paymentStatus: paymentStatus,
        fileUrl: fileUrl
      },
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
}

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