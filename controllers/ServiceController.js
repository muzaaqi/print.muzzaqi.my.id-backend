import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const getServices = async (req, res) => {
  try {
    const response = await prisma.service.findMany();
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const response = await prisma.service.findUnique({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(404).json({ msg: error.message });
  }
};

export const createService = async (req, res) => {
  const {
    name,
    description,
    paperSize,
    priceOneSide,
    priceTwoSides,
    priceColorOneSide,
    priceColorTwoSides,
  } = req.body;
  try {
    const service = await prisma.service.create({
      data: {
        name: name,
        description: description,
        paperSize: paperSize,
        priceOneSide: priceOneSide,
        priceTwoSides: priceTwoSides,
        priceColorOneSide: priceColorOneSide,
        priceColorTwoSides: priceColorTwoSides,
      },
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};

export const updateService = async (req, res) => {
  const {
    name,
    description,
    paperSize,
    priceOneSide,
    priceTwoSides,
    priceColorOneSide,
    priceColorTwoSides,
  } = req.body;
  try {
    const service = await prisma.service.update({
      where: {
        id: req.params.id
      },
      data: {
        name: name,
        description: description,
        paperSize: paperSize,
        priceOneSide: priceOneSide,
        priceTwoSides: priceTwoSides,
        priceColorOneSide: priceColorOneSide,
        priceColorTwoSides: priceColorTwoSides,
      },
    });
    res.status(200).json(service);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await prisma.service.delete({
      where: {
        id: req.params.id,
      }
  });
    res.status(200).json(service);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};
