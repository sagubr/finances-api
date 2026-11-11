CREATE TABLE "market_provider_rate_limits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "market_provider_rate_limits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"provider" varchar(80) NOT NULL,
	"next_allowed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_provider_rate_limits_provider_unique" UNIQUE("provider")
);
