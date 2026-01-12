-- AlterTable
ALTER TABLE "products" ADD COLUMN "ncm" TEXT;
ALTER TABLE "products" ADD COLUMN "origin" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "users" ADD COLUMN "stateRegistration" TEXT;

-- CreateTable
CREATE TABLE "melhor_envio_token" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "scope" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mercado_pago_config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "publicKey" TEXT,
    "accessToken" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "webhookSecret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
