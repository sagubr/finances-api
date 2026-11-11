CREATE TYPE "public"."instrument_type" AS ENUM('STOCK', 'ETF', 'FUND', 'BOND', 'CRYPTO', 'CURRENCY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."investment_order_side" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TABLE "instrument_provider_mappings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "instrument_provider_mappings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instrument_id" bigint NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_symbol" varchar(120) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "instruments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"symbol" varchar(40) NOT NULL,
	"market" varchar(40) NOT NULL,
	"name" varchar(200) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"type" "instrument_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "investment_orders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "investment_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"investment_account_id" bigint NOT NULL,
	"instrument_id" bigint NOT NULL,
	"side" "investment_order_side" NOT NULL,
	"quantity" numeric(30, 12) NOT NULL,
	"unit_price" numeric(30, 10) NOT NULL,
	"fees" numeric(30, 10) DEFAULT '0' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"traded_on" date NOT NULL,
	"transaction_id" bigint,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investment_orders_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "investment_orders_quantity_positive" CHECK ("investment_orders"."quantity" > 0),
	CONSTRAINT "investment_orders_price_nonnegative" CHECK ("investment_orders"."unit_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "investment_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "market_data_fetches" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "market_data_fetches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"provider" varchar(80) NOT NULL,
	"endpoint" varchar(200) NOT NULL,
	"requested_symbols" jsonb NOT NULL,
	"response_payload" jsonb NOT NULL,
	"response_hash" varchar(64) NOT NULL,
	"http_status" integer NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "market_data_fetches_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "position_projections" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "position_projections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_id" bigint NOT NULL,
	"investment_account_id" bigint NOT NULL,
	"instrument_id" bigint NOT NULL,
	"quantity" numeric(30, 12) NOT NULL,
	"average_cost" numeric(30, 10) NOT NULL,
	"total_cost" numeric(30, 10) NOT NULL,
	"source_version" integer NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "position_projections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quotes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instrument_id" bigint NOT NULL,
	"fetch_id" bigint NOT NULL,
	"price" numeric(30, 10) NOT NULL,
	"day_change" numeric(30, 10),
	"day_change_percent" numeric(18, 8),
	"currency" varchar(3) NOT NULL,
	"provider" varchar(80) NOT NULL,
	"market_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"quality" varchar(30) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instrument_provider_mappings" ADD CONSTRAINT "instrument_provider_mappings_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_orders" ADD CONSTRAINT "investment_orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_orders" ADD CONSTRAINT "investment_orders_investment_account_id_accounts_id_fk" FOREIGN KEY ("investment_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_orders" ADD CONSTRAINT "investment_orders_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_orders" ADD CONSTRAINT "investment_orders_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_projections" ADD CONSTRAINT "position_projections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_projections" ADD CONSTRAINT "position_projections_investment_account_id_accounts_id_fk" FOREIGN KEY ("investment_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_projections" ADD CONSTRAINT "position_projections_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_fetch_id_market_data_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "public"."market_data_fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "instrument_provider_mapping_unique" ON "instrument_provider_mappings" USING btree ("provider","provider_symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_symbol_market_currency_unique" ON "instruments" USING btree ("symbol","market","currency");--> statement-breakpoint
CREATE INDEX "investment_orders_workspace_idx" ON "investment_orders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "market_data_fetches_provider_received_idx" ON "market_data_fetches" USING btree ("provider","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "position_projection_unique" ON "position_projections" USING btree ("investment_account_id","instrument_id");--> statement-breakpoint
CREATE INDEX "position_projections_workspace_idx" ON "position_projections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "quotes_instrument_market_idx" ON "quotes" USING btree ("instrument_id","market_at");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_provider_instrument_market_unique" ON "quotes" USING btree ("provider","instrument_id","market_at");--> statement-breakpoint
CREATE POLICY "investment_orders_workspace_policy" ON "investment_orders" AS PERMISSIVE FOR ALL TO public USING ("investment_orders"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("investment_orders"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "position_projections_workspace_policy" ON "position_projections" AS PERMISSIVE FOR ALL TO public USING ("position_projections"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("position_projections"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);