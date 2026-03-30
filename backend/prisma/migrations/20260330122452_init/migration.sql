-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'manager', 'facteur');

-- CreateEnum
CREATE TYPE "StatutCollecte" AS ENUM ('conforme', 'hors_marge', 'incident', 'manquant');

-- CreateEnum
CREATE TYPE "StatutTournee" AS ENUM ('planifiee', 'en_cours', 'terminee');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'facteur',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "joursCollecte" INTEGER[],
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "margeMinutes" INTEGER NOT NULL DEFAULT 15,
    "facteurDefautId" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collecte" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "facteurId" INTEGER NOT NULL,
    "dateCollecte" DATE NOT NULL,
    "heureCollecte" TIMESTAMP(3) NOT NULL,
    "statut" "StatutCollecte" NOT NULL DEFAULT 'conforme',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collecte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" SERIAL NOT NULL,
    "collecteId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" SERIAL NOT NULL,
    "collecteId" INTEGER,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "traitee" BOOLEAN NOT NULL DEFAULT false,
    "emailEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournee" (
    "id" SERIAL NOT NULL,
    "facteurId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "statut" "StatutTournee" NOT NULL DEFAULT 'planifiee',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourneeClient" (
    "id" SERIAL NOT NULL,
    "tourneeId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "scanne" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TourneeClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_qrCode_key" ON "Client"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "Parametre_cle_key" ON "Parametre"("cle");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_facteurDefautId_fkey" FOREIGN KEY ("facteurDefautId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collecte" ADD CONSTRAINT "Collecte_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collecte" ADD CONSTRAINT "Collecte_facteurId_fkey" FOREIGN KEY ("facteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_collecteId_fkey" FOREIGN KEY ("collecteId") REFERENCES "Collecte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_collecteId_fkey" FOREIGN KEY ("collecteId") REFERENCES "Collecte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournee" ADD CONSTRAINT "Tournee_facteurId_fkey" FOREIGN KEY ("facteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourneeClient" ADD CONSTRAINT "TourneeClient_tourneeId_fkey" FOREIGN KEY ("tourneeId") REFERENCES "Tournee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourneeClient" ADD CONSTRAINT "TourneeClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
