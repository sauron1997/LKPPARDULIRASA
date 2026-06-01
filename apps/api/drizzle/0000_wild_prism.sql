CREATE TYPE "public"."assessment_status" AS ENUM('not_started', 'in_progress', 'in_review', 'passed', 'retry');--> statement-breakpoint
CREATE TYPE "public"."assessment_type" AS ENUM('latihan', 'teori', 'praktik');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'late', 'absent', 'excused');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."schedule_assignment_status" AS ENUM('scheduled', 'assigned', 'cancelled', 'removed');--> statement-breakpoint
CREATE TYPE "public"."schedule_session_status" AS ENUM('scheduled', 'planned', 'published', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'submitted', 'in_review', 'passed', 'retry');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('public', 'student');--> statement-breakpoint
CREATE TYPE "public"."message_thread_status" AS ENUM('unread', 'replied', 'closed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"role" text DEFAULT 'student' NOT NULL,
	"student_id" text,
	"nis" text,
	"account_id" text,
	"course_id" text,
	"enrollment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "login_identifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_user_id" text,
	"identifier" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" integer PRIMARY KEY NOT NULL,
	"auth_user_id" text,
	"account_id" text,
	"nis" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"status" text DEFAULT 'Aktif' NOT NULL,
	"identity_media_id" text,
	"registration_date" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"auth_user_id" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"student_id" integer,
	"display_name" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"order_index" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"duration_label" text,
	"file_media_id" text,
	"resource_type" text DEFAULT 'lesson' NOT NULL,
	"is_published" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"icon" text,
	"price_value" integer DEFAULT 0 NOT NULL,
	"price_label" text,
	"duration" text,
	"level" text,
	"brochure_media_id" text,
	"is_published" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"type" "assessment_type" NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"instructions" text,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"passing_score" integer DEFAULT 75 NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"allow_retry" text DEFAULT 'true' NOT NULL,
	"submission_mode" text DEFAULT 'online_quiz' NOT NULL,
	"allowed_extensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"enrollment_id" text NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"type" "assessment_type" NOT NULL,
	"assessment_title" text,
	"status" "assessment_status" DEFAULT 'not_started' NOT NULL,
	"score" integer,
	"max_score" integer DEFAULT 100 NOT NULL,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"feedback" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"definition_id" text NOT NULL,
	"order_index" integer DEFAULT 1 NOT NULL,
	"kind" text DEFAULT 'essay' NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"answer" text,
	"weight" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"definition_id" text NOT NULL,
	"enrollment_id" text NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"type" "assessment_type" NOT NULL,
	"title" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"score" integer,
	"max_score" integer DEFAULT 100 NOT NULL,
	"feedback" text,
	"reviewer_name" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"assignment_id" text NOT NULL,
	"enrollment_id" text NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"check_in_at" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"recorded_by" text,
	"notes" text,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"marked_by" text DEFAULT 'system' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"enrollment_id" text NOT NULL,
	"course_id" integer NOT NULL,
	"nis" text NOT NULL,
	"student_name" text NOT NULL,
	"program" text,
	"issue_date" text,
	"status" text DEFAULT 'available' NOT NULL,
	"file_media_id" text,
	"eligibility_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"program_snapshot" text,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_date" text,
	"registration_date" text,
	"started_at" text,
	"completed_at" text,
	"current_module_id" text,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"enrollment_id" text NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"status" "schedule_assignment_status" DEFAULT 'scheduled' NOT NULL,
	"assignment_status" "schedule_assignment_status" DEFAULT 'assigned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"module_id" text,
	"title" text NOT NULL,
	"description" text,
	"instructor_name" text,
	"location" text,
	"location_label" text,
	"meeting_link" text,
	"mode" text DEFAULT 'offline' NOT NULL,
	"status" "schedule_session_status" DEFAULT 'published' NOT NULL,
	"notes" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"question_id" text NOT NULL,
	"value" jsonb DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"media_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accreditations" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"certificate_number" text,
	"description" text,
	"expiry_date" text,
	"year" text,
	"status" text DEFAULT 'Aktif' NOT NULL,
	"document_media_id" text,
	"document_name" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content_html" text,
	"author_name" text,
	"category" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"cover_media_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_id" text,
	"type" text DEFAULT 'photo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_media" (
	"id" text PRIMARY KEY NOT NULL,
	"gallery_item_id" integer NOT NULL,
	"name" text,
	"type" text DEFAULT 'photo' NOT NULL,
	"url" text,
	"mime_type" text,
	"is_object_url" text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_profile" (
	"id" text PRIMARY KEY DEFAULT 'site' NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"logo" text,
	"description" text,
	"vision" text,
	"mission" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"history" text,
	"address" text,
	"phone" text,
	"email" text,
	"founded_year" integer,
	"teacher_count" integer,
	"alumni_count" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"url" text,
	"enabled" text DEFAULT 'false' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" "message_channel" NOT NULL,
	"student_id" integer,
	"enrollment_id" text,
	"course_id" integer,
	"sender_name" text,
	"sender_email" text,
	"sender_address" text,
	"subject" text,
	"status" "message_thread_status" DEFAULT 'unread' NOT NULL,
	"draft" text,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_user_id" text,
	"author_role" text NOT NULL,
	"author_name" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"storage_key" text,
	"public_url" text,
	"original_name" text,
	"mime_type" text,
	"owner_type" text,
	"owner_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_account_provider_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_user_username_idx" ON "user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "login_identifier_unique_idx" ON "login_identifiers" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "students_nis_unique_idx" ON "students" USING btree ("nis");--> statement-breakpoint
CREATE UNIQUE INDEX "students_email_unique_idx" ON "students" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_unique_idx" ON "courses" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_definition_course_type_unique_idx" ON "assessment_definitions" USING btree ("course_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_progress_enrollment_type_unique_idx" ON "assessment_progress" USING btree ("enrollment_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_session_enrollment_unique_idx" ON "attendance_records" USING btree ("session_id","enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_enrollment_unique_idx" ON "certificates" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_assignment_session_enrollment_unique_idx" ON "schedule_assignments" USING btree ("session_id","enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_unique_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "social_links_platform_unique_idx" ON "social_links" USING btree ("platform");