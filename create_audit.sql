--run in console: psql -c "CREATE ROLE audit_writer LOGIN PASSWORD 'change-me'""
-- 	then: 		  psql -v audit_schema=<schema name> -f audit_schema.sql

CREATE SCHEMA IF NOT EXISTS :"audit_schema";

CREATE TABLE IF NOT EXISTS :"audit_schema".record_access (
	id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	request_id	text NOT NULL,
	accessed_at timestamptz NOT NULL DEFAULT now(),
	app_name    text NOT NULL,
	ad_username text NOT NULL,
	entity      text NOT NULL,   -- climbers | expedition_members | emergency_contacts | communication_devices
	entity_id   bigint NOT NULL,
	endpoint    text NOT NULL,   -- Flask path that returned the data
	source      text,            -- table/view the request asked for ('sql' for raw SQL)
	page        text             -- frontend page, from the Referer header (context only, client-supplied)
);

CREATE TABLE IF NOT EXISTS :"audit_schema".export_files (
    token          uuid PRIMARY KEY,
    display_name   text NOT NULL,        -- what the user sees when downloading
    stored_name    text NOT NULL,        -- token + extension on disk
    kind           text NOT NULL,        -- 'export' | 'attachment'
    contains_pii   boolean NOT NULL,
    created_by     text NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    expires_at     timestamptz,
    deleted_at     timestamptz,
    climber_ids    integer[],
    member_ids     integer[]
);

CREATE TABLE IF NOT EXISTS :"audit_schema".file_downloads (
    id            bigserial PRIMARY KEY,
    token         uuid NOT NULL REFERENCES audit.export_files,
    username      text NOT NULL,
    remote_addr   text,
    downloaded_at timestamptz NOT NULL DEFAULT now()
);


-- One row per user + record + endpoint per minute. Repeat hits within the same
-- minute are dropped by ON CONFLICT DO NOTHING in the insert. AT TIME ZONE 'UTC'
-- makes the expression immutable, which Postgres requires for an index.
CREATE UNIQUE INDEX record_access_dedupe ON :"audit_schema".record_access
	(ad_username, entity, entity_id, endpoint, (date_trunc('minute', accessed_at AT TIME ZONE 'UTC')));

-- "Who has seen record X?"
CREATE INDEX record_access_entity ON :"audit_schema".record_access (entity, entity_id);
-- "What has user Y looked at?"
CREATE INDEX record_access_user ON :"audit_schema".record_access (ad_username, accessed_at);


GRANT USAGE ON SCHEMA :"audit_schema" TO audit_writer;
GRANT INSERT ON :"audit_schema".record_access TO audit_writer;  -- insert only: no UPDATE/DELETE