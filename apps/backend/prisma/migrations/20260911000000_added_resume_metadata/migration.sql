-- AlterTable
ALTER TABLE "Interview" ALTER COLUMN "githubMetadata" DROP NOT NULL,
ADD COLUMN     "resumeMetadata" JSONB,
ADD COLUMN     "selectedResumeProject" TEXT;
