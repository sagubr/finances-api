CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('CHECKING', 'SAVINGS', 'CASH', 'BROKERAGE', 'BENEFIT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."card_accounting_mode" AS ENUM('DETAILED', 'PAYMENT_ONLY');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('VALID', 'WARNING', 'ERROR', 'COMMITTED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('UPLOADED', 'PROCESSING', 'PREVIEWED', 'COMMITTED', 'ROLLED_BACK', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('WEEKLY', 'MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."statement_status" AS ENUM('OPEN', 'CLOSED', 'PARTIALLY_PAID', 'PAID');--> statement-breakpoint
CREATE TYPE "auth"."token_purpose" AS ENUM('EMAIL_CONFIRMATION', 'PASSWORD_RESET');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PLANNED', 'CONFIRMED', 'SETTLED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'CARD_PAYMENT', 'INVESTMENT');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('OWNER', 'EDITOR', 'VIEWER');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "account_type" NOT NULL,
	"currency" varchar(3) NOT NULL,
	"opening_balance_cents" bigint DEFAULT 0 NOT NULL,
	"opening_balance_on" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_threshold_deliveries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "budget_threshold_deliveries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_id" bigint NOT NULL,
	"budget_id" bigint NOT NULL,
	"threshold_bps" integer NOT NULL,
	"budget_version" integer NOT NULL,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_threshold_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "budgets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"month" varchar(7) NOT NULL,
	"category_id" bigint NOT NULL,
	"limit_cents" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "budgets_limit_nonnegative" CHECK ("budgets"."limit_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "card_statements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "card_statements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"card_id" bigint NOT NULL,
	"cycle_start_on" date NOT NULL,
	"cycle_end_on" date NOT NULL,
	"due_on" date NOT NULL,
	"status" "statement_status" DEFAULT 'OPEN' NOT NULL,
	"accounting_mode" "card_accounting_mode" NOT NULL,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"paid_cents" bigint DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_statements_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "card_statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "category_type" NOT NULL,
	"color" varchar(7),
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_cards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"name" varchar(120) NOT NULL,
	"last_four" varchar(4),
	"currency" varchar(3) NOT NULL,
	"limit_cents" bigint NOT NULL,
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"accounting_mode" "card_accounting_mode" DEFAULT 'DETAILED' NOT NULL,
	"payment_account_id" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_cards_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "credit_cards_days" CHECK ("credit_cards"."closing_day" between 1 and 31 and "credit_cards"."due_day" between 1 and 31)
);
--> statement-breakpoint
ALTER TABLE "credit_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."email_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth"."email_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"user_id" bigint NOT NULL,
	"purpose" "auth"."token_purpose" NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"token_ciphertext" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_tokens_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "email_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "idempotency_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_id" bigint NOT NULL,
	"actor_id" bigint NOT NULL,
	"operation" varchar(160) NOT NULL,
	"key" varchar(128) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_batches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"status" "import_status" DEFAULT 'UPLOADED' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"file_size" bigint NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"committed_at" timestamp with time zone,
	"rolled_back_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_commits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_commits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"batch_id" bigint NOT NULL,
	"selected_row_ids" jsonb NOT NULL,
	"committed_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rolled_back_at" timestamp with time zone,
	CONSTRAINT "import_commits_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "import_commits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_rows_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"batch_id" bigint NOT NULL,
	"row_number" integer NOT NULL,
	"status" "import_row_status" NOT NULL,
	"raw" jsonb NOT NULL,
	"normalized" jsonb,
	"fingerprint" varchar(64),
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transaction_id" bigint,
	CONSTRAINT "import_rows_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "import_rows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "installment_plans" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "installment_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"credit_card_id" bigint,
	"description" varchar(500) NOT NULL,
	"total_amount_cents" bigint NOT NULL,
	"installments" integer NOT NULL,
	"first_due_on" date NOT NULL,
	"currency" varchar(3) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installment_plans_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "installment_plans_total_positive" CHECK ("installment_plans"."total_amount_cents" > 0),
	CONSTRAINT "installment_plans_count_positive" CHECK ("installment_plans"."installments" > 0)
);
--> statement-breakpoint
ALTER TABLE "installment_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint,
	"job_name" varchar(120) NOT NULL,
	"job_version" integer NOT NULL,
	"execution_key" varchar(200) NOT NULL,
	"status" "job_status" DEFAULT 'PENDING' NOT NULL,
	"payload" jsonb NOT NULL,
	"progress" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(100),
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_runs_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "job_runs_execution_key_unique" UNIQUE("execution_key")
);
--> statement-breakpoint
CREATE TABLE "auth"."login_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth"."login_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email_hash" varchar(64) NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"succeeded" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outbox_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" uuid NOT NULL,
	"workspace_id" bigint,
	"event_name" varchar(120) NOT NULL,
	"event_version" integer NOT NULL,
	"aggregate_type" varchar(100) NOT NULL,
	"aggregate_public_id" uuid NOT NULL,
	"aggregate_version" integer NOT NULL,
	"correlation_id" uuid NOT NULL,
	"causation_id" uuid,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "outbox_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "recurring_occurrences" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recurring_occurrences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"rule_id" bigint NOT NULL,
	"logical_date" date NOT NULL,
	"transaction_id" bigint,
	"detached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_occurrences_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recurring_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"credit_card_id" bigint,
	"category_id" bigint,
	"type" "category_type" NOT NULL,
	"description" varchar(500) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"frequency" "recurrence_frequency" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"day_of_month" integer,
	"day_of_week" integer,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"next_occurrence_on" date NOT NULL,
	"paused_at" timestamp with time zone,
	"timezone" varchar(80) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rules_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "recurring_rules_interval_positive" CHECK ("recurring_rules"."interval" > 0),
	CONSTRAINT "recurring_rules_amount_positive" CHECK ("recurring_rules"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "recurring_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth"."sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"user_id" bigint NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"family_id" uuid NOT NULL,
	"user_agent" varchar(512),
	"ip_hash" varchar(64),
	"expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "statement_cycles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "statement_cycles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_id" bigint NOT NULL,
	"statement_id" bigint NOT NULL,
	"transaction_id" bigint NOT NULL,
	"attached_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "statement_cycles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "statement_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "statement_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"statement_id" bigint NOT NULL,
	"transaction_id" bigint NOT NULL,
	"amount_cents" bigint NOT NULL,
	"paid_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statement_payments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "statement_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transaction_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transaction_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_id" bigint NOT NULL,
	"transaction_id" bigint NOT NULL,
	"transaction_public_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"action" varchar(30) NOT NULL,
	"actor_id" bigint,
	"snapshot" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"category_id" bigint,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" varchar(500) NOT NULL,
	"occurred_on" date NOT NULL,
	"competence_month" varchar(7) NOT NULL,
	"settled_on" date,
	"source_module" varchar(40),
	"source_public_id" uuid,
	"source_sequence" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount_cents" > 0),
	CONSTRAINT "transactions_competence_format" CHECK ("transactions"."competence_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "transactions_competence_matches_date" CHECK ("transactions"."competence_month" = substring("transactions"."occurred_on"::text from 1 for 7)),
	CONSTRAINT "transactions_settlement_consistency" CHECK (("transactions"."status" = 'SETTLED' and "transactions"."settled_on" is not null) or ("transactions"."status" <> 'SETTLED' and "transactions"."settled_on" is null))
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transfer_pairs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transfer_pairs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"workspace_id" bigint NOT NULL,
	"debit_transaction_id" bigint NOT NULL,
	"credit_transaction_id" bigint NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_pairs_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "transfer_pairs_distinct_legs" CHECK ("transfer_pairs"."debit_transaction_id" <> "transfer_pairs"."credit_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "transfer_pairs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."user_credentials" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"password_version" integer DEFAULT 1 NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"email_confirmed_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"role" "workspace_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workspaces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"timezone" varchar(80) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"base_currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_threshold_deliveries" ADD CONSTRAINT "budget_threshold_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_threshold_deliveries" ADD CONSTRAINT "budget_threshold_deliveries_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_statements" ADD CONSTRAINT "card_statements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_statements" ADD CONSTRAINT "card_statements_card_id_credit_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."credit_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_payment_account_id_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_commits" ADD CONSTRAINT "import_commits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_commits" ADD CONSTRAINT "import_commits_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_rule_id_recurring_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_cycles" ADD CONSTRAINT "statement_cycles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_cycles" ADD CONSTRAINT "statement_cycles_statement_id_card_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."card_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_cycles" ADD CONSTRAINT "statement_cycles_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_payments" ADD CONSTRAINT "statement_payments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_payments" ADD CONSTRAINT "statement_payments_statement_id_card_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."card_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_payments" ADD CONSTRAINT "statement_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_pairs" ADD CONSTRAINT "transfer_pairs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_pairs" ADD CONSTRAINT "transfer_pairs_debit_transaction_id_transactions_id_fk" FOREIGN KEY ("debit_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_pairs" ADD CONSTRAINT "transfer_pairs_credit_transaction_id_transactions_id_fk" FOREIGN KEY ("credit_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_workspace_idx" ON "accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_workspace_name_unique" ON "accounts" USING btree ("workspace_id","name") WHERE "accounts"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_threshold_once_unique" ON "budget_threshold_deliveries" USING btree ("budget_id","threshold_bps","budget_version");--> statement-breakpoint
CREATE INDEX "budget_threshold_deliveries_workspace_idx" ON "budget_threshold_deliveries" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_category_target_unique" ON "budgets" USING btree ("workspace_id","month","category_id") WHERE "budgets"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "card_statements_cycle_unique" ON "card_statements" USING btree ("card_id","cycle_start_on");--> statement-breakpoint
CREATE INDEX "card_statements_workspace_idx" ON "card_statements" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "categories_workspace_idx" ON "categories" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_name_type_unique" ON "categories" USING btree ("workspace_id","name","type");--> statement-breakpoint
CREATE INDEX "credit_cards_workspace_idx" ON "credit_cards" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_scope_unique" ON "idempotency_records" USING btree ("workspace_id","actor_id","operation","key");--> statement-breakpoint
CREATE INDEX "idempotency_records_workspace_idx" ON "idempotency_records" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "import_batches_workspace_idx" ON "import_batches" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_checksum_unique" ON "import_batches" USING btree ("workspace_id","checksum");--> statement-breakpoint
CREATE INDEX "import_commits_workspace_idx" ON "import_commits" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_batch_number_unique" ON "import_rows" USING btree ("batch_id","row_number");--> statement-breakpoint
CREATE INDEX "import_rows_workspace_idx" ON "import_rows" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "installment_plans_workspace_idx" ON "installment_plans" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_time_idx" ON "auth"."login_attempts" USING btree ("email_hash","attempted_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_time_idx" ON "auth"."login_attempts" USING btree ("ip_hash","attempted_at");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox_events" USING btree ("published_at","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_occurrences_rule_date_unique" ON "recurring_occurrences" USING btree ("rule_id","logical_date");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_workspace_idx" ON "recurring_occurrences" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "recurring_rules_workspace_idx" ON "recurring_rules" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "auth"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "statement_cycles_transaction_unique" ON "statement_cycles" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "statement_cycles_workspace_idx" ON "statement_cycles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "statement_payments_workspace_idx" ON "statement_payments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "transaction_history_workspace_idx" ON "transaction_history" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "transactions_workspace_idx" ON "transactions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "transactions_workspace_competence_idx" ON "transactions" USING btree ("workspace_id","competence_month","occurred_on","id");--> statement-breakpoint
CREATE INDEX "transactions_workspace_account_idx" ON "transactions" USING btree ("workspace_id","account_id","occurred_on");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_source_unique" ON "transactions" USING btree ("workspace_id","source_module","source_public_id","source_sequence") WHERE "transactions"."source_public_id" is not null;--> statement-breakpoint
CREATE INDEX "transfer_pairs_workspace_idx" ON "transfer_pairs" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_pairs_debit_unique" ON "transfer_pairs" USING btree ("debit_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_pairs_credit_unique" ON "transfer_pairs" USING btree ("credit_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "accounts_workspace_policy" ON "accounts" AS PERMISSIVE FOR ALL TO public USING ("accounts"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("accounts"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "budget_threshold_deliveries_workspace_policy" ON "budget_threshold_deliveries" AS PERMISSIVE FOR ALL TO public USING ("budget_threshold_deliveries"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("budget_threshold_deliveries"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "budgets_workspace_policy" ON "budgets" AS PERMISSIVE FOR ALL TO public USING ("budgets"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("budgets"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "card_statements_workspace_policy" ON "card_statements" AS PERMISSIVE FOR ALL TO public USING ("card_statements"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("card_statements"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "categories_workspace_policy" ON "categories" AS PERMISSIVE FOR ALL TO public USING ("categories"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("categories"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "credit_cards_workspace_policy" ON "credit_cards" AS PERMISSIVE FOR ALL TO public USING ("credit_cards"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("credit_cards"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "idempotency_records_workspace_policy" ON "idempotency_records" AS PERMISSIVE FOR ALL TO public USING ("idempotency_records"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("idempotency_records"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "import_batches_workspace_policy" ON "import_batches" AS PERMISSIVE FOR ALL TO public USING ("import_batches"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("import_batches"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "import_commits_workspace_policy" ON "import_commits" AS PERMISSIVE FOR ALL TO public USING ("import_commits"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("import_commits"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "import_rows_workspace_policy" ON "import_rows" AS PERMISSIVE FOR ALL TO public USING ("import_rows"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("import_rows"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "installment_plans_workspace_policy" ON "installment_plans" AS PERMISSIVE FOR ALL TO public USING ("installment_plans"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("installment_plans"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "recurring_occurrences_workspace_policy" ON "recurring_occurrences" AS PERMISSIVE FOR ALL TO public USING ("recurring_occurrences"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("recurring_occurrences"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "recurring_rules_workspace_policy" ON "recurring_rules" AS PERMISSIVE FOR ALL TO public USING ("recurring_rules"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("recurring_rules"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "statement_cycles_workspace_policy" ON "statement_cycles" AS PERMISSIVE FOR ALL TO public USING ("statement_cycles"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("statement_cycles"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "statement_payments_workspace_policy" ON "statement_payments" AS PERMISSIVE FOR ALL TO public USING ("statement_payments"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("statement_payments"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "transaction_history_workspace_policy" ON "transaction_history" AS PERMISSIVE FOR ALL TO public USING ("transaction_history"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("transaction_history"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "transactions_workspace_policy" ON "transactions" AS PERMISSIVE FOR ALL TO public USING ("transactions"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("transactions"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "transfer_pairs_workspace_policy" ON "transfer_pairs" AS PERMISSIVE FOR ALL TO public USING ("transfer_pairs"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint) WITH CHECK ("transfer_pairs"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);--> statement-breakpoint
CREATE POLICY "workspace_members_workspace_policy" ON "workspace_members" AS PERMISSIVE FOR ALL TO public USING ("workspace_members"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint or "workspace_members"."user_id" = nullif(current_setting('app.actor_id', true), '')::bigint) WITH CHECK ("workspace_members"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::bigint);