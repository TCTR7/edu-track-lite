CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT_EXCUSED', 'ABSENT_UNEXCUSED');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('COLLECT_TUITION', 'REVERT_TUITION', 'ADJUST_TUITION', 'ADD_BONUS_POINT', 'ADD_TEST_SCORE', 'UPDATE_TEST_SCORE', 'DELETE_TEST_SCORE', 'UPDATE_PUBLIC_NOTE', 'UPDATE_INTERNAL_NOTE', 'CREATE_ATTENDANCE_SESSION', 'UPDATE_ATTENDANCE', 'UPDATE_STUDENT_STATUS', 'RESET_STUDENT_PASSWORD');--> statement-breakpoint
CREATE TYPE "public"."class_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'PAUSED', 'LEFT');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."point_type" AS ENUM('BONUS', 'TEST');--> statement-breakpoint
CREATE TYPE "public"."tuition_cycle_status" AS ENUM('OPEN', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OPERATOR', 'ADMIN', 'TEACHER', 'STUDENT');--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "attendance_status" DEFAULT 'PRESENT' NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"session_number_in_cycle" integer NOT NULL,
	"session_date" date NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action_type" "audit_action" NOT NULL,
	"target_student_id" uuid,
	"class_id" uuid,
	"details_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"bank_bin" text,
	"bank_account_no" text,
	"bank_account_name" text,
	"rounding_unit" integer DEFAULT 1000 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"public_note" text,
	"internal_note" text,
	"total_bonus_points" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"name" text NOT NULL,
	"grade_level" text NOT NULL,
	"teacher_id" uuid NOT NULL,
	"schedule_json" jsonb NOT NULL,
	"tuition_per_cycle" integer NOT NULL,
	"sessions_per_cycle" integer NOT NULL,
	"deduction_per_session" integer NOT NULL,
	"current_cycle_number" integer DEFAULT 1 NOT NULL,
	"current_session_count" integer DEFAULT 0 NOT NULL,
	"status" "class_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"grade_level" text NOT NULL,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"file_key" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homeworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"image_urls_json" jsonb NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"type" "point_type" NOT NULL,
	"title" text NOT NULL,
	"score" double precision NOT NULL,
	"recorded_date" date NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tuition_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "tuition_cycle_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tuition_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tuition_cycle_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"billable_sessions" integer NOT NULL,
	"excused_absent_count" integer DEFAULT 0 NOT NULL,
	"unexcused_absent_count" integer DEFAULT 0 NOT NULL,
	"base_amount" integer NOT NULL,
	"deducted_amount" integer DEFAULT 0 NOT NULL,
	"adjustment_amount" integer DEFAULT 0 NOT NULL,
	"adjustment_note" text,
	"final_amount" integer NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"payment_method" "payment_method",
	"collected_by_user_id" uuid,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_student_id_users_id_fk" FOREIGN KEY ("target_student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuition_cycles" ADD CONSTRAINT "tuition_cycles_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuition_records" ADD CONSTRAINT "tuition_records_tuition_cycle_id_tuition_cycles_id_fk" FOREIGN KEY ("tuition_cycle_id") REFERENCES "public"."tuition_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuition_records" ADD CONSTRAINT "tuition_records_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuition_records" ADD CONSTRAINT "tuition_records_collected_by_user_id_users_id_fk" FOREIGN KEY ("collected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_unique_idx" ON "attendance_records" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_student_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_class_cycle_idx" ON "attendance_sessions" USING btree ("class_id","cycle_number");--> statement-breakpoint
CREATE INDEX "attendance_sessions_class_date_idx" ON "attendance_sessions" USING btree ("class_id","session_date");--> statement-breakpoint
CREATE INDEX "audit_logs_center_created_idx" ON "audit_logs" USING btree ("center_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_students_unique_idx" ON "class_students" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE INDEX "class_students_student_idx" ON "class_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "classes_center_status_idx" ON "classes" USING btree ("center_id","status");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "documents_center_grade_idx" ON "documents" USING btree ("center_id","grade_level");--> statement-breakpoint
CREATE INDEX "homeworks_class_idx" ON "homeworks" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "point_histories_class_student_idx" ON "point_histories" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tuition_cycles_class_cycle_idx" ON "tuition_cycles" USING btree ("class_id","cycle_number");--> statement-breakpoint
CREATE INDEX "tuition_cycles_status_idx" ON "tuition_cycles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tuition_records_cycle_student_idx" ON "tuition_records" USING btree ("tuition_cycle_id","student_id");--> statement-breakpoint
CREATE INDEX "tuition_records_paid_idx" ON "tuition_records" USING btree ("is_paid","paid_at");--> statement-breakpoint
CREATE INDEX "users_center_role_idx" ON "users" USING btree ("center_id","role");