-- audit_log is append-only: any UPDATE or DELETE raises.
-- TRUNCATE does not fire row-level triggers, so the daily reset (TRUNCATE inside its own
-- transaction) keeps working. Anyone with DDL rights can still drop the trigger; the trigger
-- guards against application bugs and ad-hoc statements, not against a database owner.
CREATE FUNCTION "app"."audit_log_reject_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (% not allowed)', TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_log_append_only"
BEFORE UPDATE OR DELETE ON "app"."audit_log"
FOR EACH ROW EXECUTE FUNCTION "app"."audit_log_reject_change"();
