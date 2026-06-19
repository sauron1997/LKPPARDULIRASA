ALTER TABLE "payments" ALTER COLUMN "public_access_token" SET DEFAULT md5(random()::text || clock_timestamp()::text);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "parent_name" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "photo_media_id" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "ijazah_media_id" text;--> statement-breakpoint
CREATE INDEX "students_account_id_idx" ON "students" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "students_name_idx" ON "students" USING btree ("name");--> statement-breakpoint
CREATE INDEX "assessment_progress_student_idx" ON "assessment_progress" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assessment_progress_course_idx" ON "assessment_progress" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "assessment_submissions_student_idx" ON "assessment_submissions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assessment_submissions_course_idx" ON "assessment_submissions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "assessment_submissions_definition_idx" ON "assessment_submissions" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "attendance_records_student_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_course_idx" ON "attendance_records" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "attendance_records_marked_at_idx" ON "attendance_records" USING btree ("marked_at");--> statement-breakpoint
CREATE INDEX "certificates_student_idx" ON "certificates" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "certificates_course_idx" ON "certificates" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_course_idx" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schedule_assignments_student_idx" ON "schedule_assignments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "schedule_assignments_course_idx" ON "schedule_assignments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "schedule_sessions_start_at_idx" ON "schedule_sessions" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "schedule_sessions_course_idx" ON "schedule_sessions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "message_threads_student_idx" ON "message_threads" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "message_threads_channel_status_idx" ON "message_threads" USING btree ("channel","status");--> statement-breakpoint
CREATE INDEX "message_threads_updated_at_idx" ON "message_threads" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "thread_messages_thread_id_idx" ON "thread_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "thread_messages_created_at_idx" ON "thread_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_student_idx" ON "payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_public_access_token_idx" ON "payments" USING btree ("public_access_token");