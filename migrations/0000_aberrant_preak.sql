-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"tenant" text DEFAULT 'public' NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"roles" text[] DEFAULT '{"RAY['BRLS_Viewer'::tex"}',
	"tenant" text DEFAULT 'public' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "rigs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tenant" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wells" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'drilling' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"rig_id" varchar,
	"tenant" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "wells" ADD CONSTRAINT "wells_rig_id_rigs_id_fk" FOREIGN KEY ("rig_id") REFERENCES "public"."rigs"("id") ON DELETE no action ON UPDATE no action;
*/