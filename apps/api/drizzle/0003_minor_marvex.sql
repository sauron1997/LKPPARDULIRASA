ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "public_access_token" text;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "public_access_token" SET DEFAULT md5(random()::text || clock_timestamp()::text);--> statement-breakpoint
UPDATE "payments"
SET "public_access_token" = md5("id" || clock_timestamp()::text)
WHERE "public_access_token" IS NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "public_access_token" SET NOT NULL;
