CREATE TYPE "public"."transaction_location_source" AS ENUM('DEVICE', 'MAP_PIN');--> statement-breakpoint
CREATE TABLE "transaction_locations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transaction_locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_id" bigint NOT NULL,
	"transaction_id" bigint NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy_meters" double precision,
	"captured_at" timestamp with time zone NOT NULL,
	"source" "transaction_location_source" NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_locations_latitude_range" CHECK ("transaction_locations"."latitude" >= -90 and "transaction_locations"."latitude" <= 90),
	CONSTRAINT "transaction_locations_longitude_range" CHECK ("transaction_locations"."longitude" >= -180 and "transaction_locations"."longitude" <= 180),
	CONSTRAINT "transaction_locations_accuracy_positive" CHECK ("transaction_locations"."accuracy_meters" is null or "transaction_locations"."accuracy_meters" > 0),
	CONSTRAINT "transaction_locations_source_accuracy" CHECK ("transaction_locations"."source" <> 'MAP_PIN' or "transaction_locations"."accuracy_meters" is null)
);
--> statement-breakpoint
ALTER TABLE "transaction_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transaction_locations" ADD CONSTRAINT "transaction_locations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_locations" ADD CONSTRAINT "transaction_locations_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_locations" ADD CONSTRAINT "transaction_locations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_locations" ADD CONSTRAINT "transaction_locations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_locations_workspace_idx" ON "transaction_locations" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_locations_transaction_unique" ON "transaction_locations" USING btree ("transaction_id");--> statement-breakpoint
CREATE POLICY "transaction_locations_workspace_policy" ON "transaction_locations" AS PERMISSIVE FOR ALL TO public USING ("transaction_locations"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("transaction_locations"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);