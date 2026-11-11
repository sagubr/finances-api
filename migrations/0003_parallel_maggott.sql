CREATE TYPE "public"."credit_card_brand" AS ENUM('VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OTHER');--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "brand" "credit_card_brand";
