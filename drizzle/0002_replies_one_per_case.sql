DROP INDEX "app"."replies_case_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "replies_case_idx" ON "app"."replies" USING btree ("case_id");