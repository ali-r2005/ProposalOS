CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"html" text NOT NULL,
	"context" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
