ALTER TABLE "payments" ADD COLUMN "public_access_token" text;--> statement-breakpoint
UPDATE "payments"
SET "public_access_token" = md5("id" || clock_timestamp()::text)
WHERE "public_access_token" IS NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "public_access_token" SET NOT NULL;
