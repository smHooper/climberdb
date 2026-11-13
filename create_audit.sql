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

CREATE TABLE IF NOT EXISTS :"audit_schema".file_access (
	token        uuid PRIMARY KEY,
	app_name     text NOT NULL,
	file_type    text NOT NULL,         -- export | attachment
	display_name text NOT NULL,
	stored_name  text NOT NULL,
	contains_pii boolean NOT NULL,
	created_by   text NOT NULL,
	created_at   timestamptz NOT NULL DEFAULT now(),
	expires_at   timestamptz            -- NULL = never expires (attachments)
);

CREATE TABLE IF NOT EXISTS :"audit_schema".file_entities (
	token     uuid NOT NULL REFERENCES :"audit_schema".file_access,
	entity    text NOT NULL,
	entity_id bigint NOT NULL,
	PRIMARY KEY (token, entity, entity_id)
);

CREATE TABLE IF NOT EXISTS :"audit_schema".file_events (
	id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	token       uuid NOT NULL REFERENCES :"audit_schema".file_access,
	event       text NOT NULL,          -- created | downloaded | deleted
	ad_username text NOT NULL,
	remote_addr text,
	accessed_at timestamptz NOT NULL DEFAULT now()
);


-- One row per user + record + endpoint per minute. Repeat hits within the same
-- minute are dropped by ON CONFLICT DO NOTHING in the insert. AT TIME ZONE 'UTC'
-- makes the expression immutable, which Postgres requires for an index.
CREATE UNIQUE INDEX IF NOT EXISTS record_access_dedupe ON :"audit_schema".record_access
	(ad_username, entity, entity_id, endpoint, (date_trunc('minute', accessed_at AT TIME ZONE 'UTC')));

-- "Who has seen record X?"
CREATE INDEX IF NOT EXISTS record_access_entity ON :"audit_schema".record_access (entity, entity_id);
-- "What has user Y looked at?"
CREATE INDEX IF NOT EXISTS record_access_user ON :"audit_schema".record_access (ad_username, accessed_at);

CREATE INDEX IF NOT EXISTS file_access_entity ON :"audit_schema".file_entities (entity, entity_id);
CREATE INDEX IF NOT EXISTS file_event_entity ON :"audit_schema".file_events (token, event);
CREATE INDEX IF NOT EXISTS file_event_user ON :"audit_schema".file_events (ad_username, accessed_at DESC);

GRANT USAGE ON SCHEMA :"audit_schema" TO audit_writer;
-- insert and select only: no UPDATE/DELETE
GRANT SELECT ON ALL TABLES IN SCHEMA :"audit_schema" TO audit_writer;
GRANT INSERT ON ALL TABLES IN SCHEMA :"audit_schema" TO audit_writer;  