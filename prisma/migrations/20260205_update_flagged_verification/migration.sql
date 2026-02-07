-- AlterEnum: Update FlaggedQueryStatus values
-- Replace REVIEWED and RESOLVED with VERIFIED and CORRECTED

-- First, add the new values to the enum
ALTER TYPE "FlaggedQueryStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE "FlaggedQueryStatus" ADD VALUE IF NOT EXISTS 'CORRECTED';

-- Add verificationNotes column to flagged_queries
ALTER TABLE "flagged_queries" ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;
