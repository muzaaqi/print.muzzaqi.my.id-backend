-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('black_white', 'color');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('processing', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed');

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "remainingStock" INTEGER NOT NULL,
    "priceOneSide" DOUBLE PRECISION NOT NULL,
    "priceTwoSides" DOUBLE PRECISION NOT NULL,
    "priceColorOneSide" DOUBLE PRECISION NOT NULL,
    "priceColorTwoSides" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "pageQuantity" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "note" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
