CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INVITED', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(63) NOT NULL,
	"name" varchar(200) NOT NULL,
	"settings" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "school_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"status" "user_status" DEFAULT 'INVITED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid,
	"admission_number" varchar(32) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "schools_slug_uq" ON "schools" USING btree ("slug") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "schools_active_idx" ON "schools" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "school_memberships_school_user_uq" ON "school_memberships" USING btree ("school_id","user_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "school_memberships_school_active_idx" ON "school_memberships" USING btree ("school_id","deleted_at");--> statement-breakpoint
CREATE INDEX "school_memberships_user_idx" ON "school_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_admission_uq" ON "students" USING btree ("school_id","admission_number") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "students_school_active_idx" ON "students" USING btree ("school_id","deleted_at");--> statement-breakpoint
CREATE INDEX "students_school_lastname_idx" ON "students" USING btree ("school_id","last_name");--> statement-breakpoint
-- ===========================================================================
-- Row-Level Security — layer 3 of tenant isolation.
--
-- Appended to the drizzle-kit output because drizzle-kit does not model
-- policies. A tenant table that ships without its policy is unprotected for
-- the entire window between deployments, so the policy belongs in the SAME
-- migration as the table. See docs/06-multi-tenancy.md.
--
-- NULLIF is load-bearing. current_setting(..., true) returns NULL only when
-- the parameter was NEVER defined. Once a transaction has SET LOCAL it and
-- ended, the session value becomes the EMPTY STRING, and ''::uuid raises
-- 22P02 instead of matching nothing. NULLIF maps '' back to NULL so a query
-- with no tenant context returns zero rows rather than erroring -- the
-- fail-closed behaviour this layer exists to guarantee.
-- ===========================================================================

ALTER TABLE "school_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "school_memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "school_memberships"
  USING      (school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "students" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "students"
  USING      (school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid);
