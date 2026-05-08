-- AlterTable
ALTER TABLE "Grievance" ADD COLUMN "fixPhotoUrl" TEXT;
ALTER TABLE "Grievance" ADD COLUMN "resolutionConfidence" REAL;
ALTER TABLE "Grievance" ADD COLUMN "resolutionReasoning" TEXT;
ALTER TABLE "Grievance" ADD COLUMN "resolutionVerdict" TEXT;
ALTER TABLE "Grievance" ADD COLUMN "resolutionVerifiedAt" DATETIME;
