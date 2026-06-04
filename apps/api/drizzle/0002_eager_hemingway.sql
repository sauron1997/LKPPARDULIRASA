CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'paid', 'expired', 'failed');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"enrollment_id" text NOT NULL,
	"student_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"public_access_token" text NOT NULL,
	"transaction_id" text,
	"redirect_url" text,
	"status" "payment_transaction_status" DEFAULT 'pending' NOT NULL,
	"payment_channel" text DEFAULT 'midtrans' NOT NULL,
	"payment_method" text,
	"manual_proof_media_id" text,
	"manual_proof_url" text,
	"manual_submitted_at" text,
	"manual_reference_note" text,
	"manual_review_note" text,
	"manual_reviewed_at" text,
	"paid_at" text,
	"expiry_at" text,
	"raw_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
