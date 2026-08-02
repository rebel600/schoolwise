CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_membership_id_school_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."school_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_uq" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_session_idx" ON "refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expiry_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_school_idx" ON "sessions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
-- ===========================================================================
-- NO Row-Level Security on sessions / refresh_tokens -- deliberate.
--
-- Both are read during login and refresh, which happen BEFORE any tenant
-- context exists. A tenant_isolation policy here would prevent the refresh
-- flow from finding the very session it needs in order to authenticate:
-- it would break login rather than secure it.
--
-- sessions.school_id is DATA (which tenant this session is bound to), not a
-- scoping key. Isolation comes from a different mechanism: a session is
-- reachable only by presenting its opaque refresh token, and every query is
-- scoped by session id or user id.
--
-- See src/database/schema/index.ts -- GLOBAL_TABLE_NAMES.
-- ===========================================================================
