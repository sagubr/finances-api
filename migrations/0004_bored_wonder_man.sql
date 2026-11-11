CREATE TYPE "public"."wishlist_status" AS ENUM('PLANNED', 'PURCHASE_PENDING', 'PURCHASED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wishlist_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"name" varchar(200) NOT NULL,
	"url" varchar(2048),
	"estimated_price_cents" bigint,
	"currency" varchar(3) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"reason" varchar(500),
	"planned_on" date,
	"status" "wishlist_status" DEFAULT 'PLANNED' NOT NULL,
	"actual_price_cents" bigint,
	"purchased_on" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_items_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "wishlist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wishlist_purchase_links" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wishlist_purchase_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_id" bigint NOT NULL,
	"item_id" bigint NOT NULL,
	"transaction_id" bigint NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_purchase_links_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
ALTER TABLE "wishlist_purchase_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_purchase_links" ADD CONSTRAINT "wishlist_purchase_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_purchase_links" ADD CONSTRAINT "wishlist_purchase_links_item_id_wishlist_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_purchase_links" ADD CONSTRAINT "wishlist_purchase_links_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishlist_items_workspace_idx" ON "wishlist_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "wishlist_purchase_links_workspace_idx" ON "wishlist_purchase_links" USING btree ("workspace_id");--> statement-breakpoint
CREATE POLICY "wishlist_items_workspace_policy" ON "wishlist_items" AS PERMISSIVE FOR ALL TO public USING ("wishlist_items"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("wishlist_items"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "wishlist_purchase_links_workspace_policy" ON "wishlist_purchase_links" AS PERMISSIVE FOR ALL TO public USING ("wishlist_purchase_links"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("wishlist_purchase_links"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);