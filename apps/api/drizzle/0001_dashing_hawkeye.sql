CREATE TABLE "payment_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"qris_image_url" text,
	"bank_name" text,
	"account_number" text,
	"account_holder_name" text,
	"payment_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
