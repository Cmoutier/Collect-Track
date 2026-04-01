-- Ajout du champ ordre sur Client pour la gestion de la tournée
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "ordre" INTEGER NOT NULL DEFAULT 0;
