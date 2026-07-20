CREATE SCHEMA "tmpl_tendencia_event_proposal";
--> statement-breakpoint
CREATE TABLE "tmpl_tendencia_event_proposal"."activities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"description" text[] NOT NULL,
	"video" text NOT NULL,
	"meta" text NOT NULL,
	"images" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmpl_tendencia_event_proposal"."hotels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"category" integer NOT NULL,
	"price" integer NOT NULL,
	"currency" text NOT NULL,
	"location" text NOT NULL,
	"hotel_url" text NOT NULL,
	"description" text NOT NULL,
	"images" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmpl_tendencia_event_proposal"."soirees" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subtitle" text NOT NULL,
	"description" text[] NOT NULL,
	"image" text NOT NULL
);
