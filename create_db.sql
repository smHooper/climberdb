CREATE DATABASE climbing_permits;

--Create lookup tables
CREATE TABLE IF NOT EXISTS attachment_type_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS backcountry_location_type_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS backcountry_location_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER, latitude NUMERIC(10, 7), longitude NUMERIC(10, 7));
CREATE TABLE IF NOT EXISTS cmc_status_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS communication_device_type_codes (id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS country_codes(id SERIAL PRIMARY KEY, short_name CHAR(2), name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS cua_company_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS state_codes(id SERIAL PRIMARY KEY, short_name CHAR(2), name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS sex_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS frostbite_severity_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS guide_company_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS air_taxi_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS group_status_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS special_group_type_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS reservation_status_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS mountain_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER, elevation_ft INTEGER);
CREATE TABLE IF NOT EXISTS payment_method_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS route_codes(
	id SERIAL PRIMARY KEY, 
	mountain_code INTEGER REFERENCES mountain_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT, 
	name VARCHAR(50), 
	code INTEGER UNIQUE, 
	sort_order INTEGER,
	UNIQUE (mountain_code, name)
);
CREATE TABLE transaction_type_codes (
	id SERIAL PRIMARY KEY,
	name VARCHAR(255),
	short_name VARCHAR(50),
	code INTEGER UNIQUE,
	sort_order INTEGER,
	is_credit BOOLEAN,
	is_payment BOOLEAN,
	permit_fee_multiplier INTEGER,
	entrance_fee_multiplier	INTEGER,
	youth_discount_multiplier INTEGER,
	default_fee MONEY
);
CREATE TABLE IF NOT EXISTS user_role_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS user_status_codes (id SERIAL PRIMARY KEY, name varchar(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);

-- create a cross-ref table for the many-to-many relationship between 
--	backcountry locations and mountains. This relationship allows
--	different backcountry locations to be associated with overlapping
--	sets of mountains that might also contain unique memebers
CREATE TABLE IF NOT EXISTS dev.backcountry_locations_mountains_xref (
	backcountry_location_code INTEGER REFERENCES backcountry_location_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	mountain_code INTEGER REFERENCES mountain_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	PRIMARY KEY (backcountry_location_code, mountain_code)
);

--Create data tables
CREATE TABLE IF NOT EXISTS climbers (
	id SERIAL PRIMARY KEY,
	first_name VARCHAR(50),
	last_name VARCHAR(50),
	address VARCHAR(255),
	city VARCHAR(50),
	state_code INTEGER REFERENCES state_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	other_state_name VARCHAR(50),
	country_code INTEGER REFERENCES country_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	postal_code VARCHAR(25),
	dob DATE,
	age INTEGER, --only necessary in case asking for DOB isn't allowed
	email_address VARCHAR(50),
	phone VARCHAR(25),
	sex_code INTEGER REFERENCES sex_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	received_pro_pin BOOLEAN, -- for backwards compatibility with old DB
	is_guide BOOLEAN,
	hx_of_frostbite INTEGER REFERENCES frostbite_severity_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	hx_of_ams BOOLEAN,
	hx_of_hace BOOLEAN,
	hx_of_hape BOOLEAN,
	hx_notes TEXT,
	internal_notes TEXT,
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
	id SERIAL PRIMARY KEY,
	climber_id INTEGER REFERENCES climbers(id) ON UPDATE CASCADE ON DELETE CASCADE,
	relationship varchar(50),
	first_name VARCHAR(50),
	last_name VARCHAR(50),
	address VARCHAR(255),
	city VARCHAR(50),
	state_code INTEGER REFERENCES state_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	other_state_name VARCHAR(50),
	country_code INTEGER REFERENCES country_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	postal_code VARCHAR(25),
	email_address VARCHAR(50),
	primary_phone VARCHAR(25),
	alternate_phone VARCHAR(25),
	internal_notes TEXT,
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expeditions (
	id SERIAL PRIMARY KEY,
	expedition_name VARCHAR(100),
	planned_departure_date DATE,
	planned_return_date DATE,
	actual_departure_date DATE,
	actual_return_date DATE,
	guide_company_code INTEGER REFERENCES guide_company_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT DEFAULT -1,
	cua_company_code INTEGER REFERENCES cua_company_code(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	air_taxi_code INTEGER REFERENCES air_taxi_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT -1,
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	reviewed_by VARCHAR(50),
	briefed_by VARCHAR(50),
	checked_in_datetime TIMESTAMP,
	sanitation_problems VARCHAR(255),
	equipment_loss VARCHAR(255),
	group_status_code INTEGER REFERENCES group_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT DEFAULT 1,
	date_confirmed DATE,
	needs_special_use_permit BOOLEAN, 
	special_group_type_code INTEGER REFERENCES special_group_type_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	expected_expedition_size INTEGER,
	is_backcountry BOOLEAN,
	is_acclimatizing BOOLEAN,
	bump_flights TEXT,
	itinerary_description TEXT,
	cmc_count INTEGER, -- alternative to checking out individual CMCs
	expedition_notes VARCHAR,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expedition_members (
	id SERIAL PRIMARY KEY,
	expedition_id INTEGER NOT NULL REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	climber_id INTEGER NOT NULL REFERENCES climbers(id) ON UPDATE CASCADE ON DELETE CASCADE,
	permit_number VARCHAR(50) UNIQUE,
	datetime_reserved TIMESTAMP,
	datetime_cancelled TIMESTAMP,
	early_return_date DATE,
	is_checked_in BOOLEAN,
	reservation_status_code INTEGER REFERENCES group_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT DEFAULT 1,
	flagged BOOLEAN,
	flagged_reason TEXT,
	flagged_by VARCHAR(50),
	is_illegal_guide BOOLEAN,
	application_complete BOOLEAN,
	psar_complete BOOLEAN,
	is_trip_leader BOOLEAN,
	is_guiding BOOLEAN,
	is_interpreter BOOLEAN,
	received_pro_pin BOOLEAN, -- in new DB this should be recorded per expedition member, not per climber
	frostbite_severity_code INTEGER REFERENCES frostbite_severity_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	frostbite_details VARCHAR(255),
	had_ams BOOLEAN,
	had_hace BOOLEAN,
	had_hape BOOLEAN,
	medical_notes TEXT,
	climber_comments TEXT, --ClimberNotes
	internal_notes TEXT, --ResNotes
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
	id SERIAL PRIMARY KEY,
	expedition_member_id INTEGER NOT NULL REFERENCES expedition_members(id) ON UPDATE CASCADE ON DELETE CASCADE,
	attachment_type_code INTEGER REFERENCES attachment_type_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	date_received DATE,
	attachment_notes TEXT, 
	client_filename VARCHAR(255),
	mime_type varchar(50),
	file_path VARCHAR(255), 
	file_size_kb INTEGER,  
	entry_time TIMESTAMP, 
	entered_by VARCHAR(50), 
	last_modified_time TIMESTAMP, 
	last_modified_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS itinerary_locations (
	id SERIAL PRIMARY KEY,
	expedition_id INTEGER NOT NULL REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	backcountry_location_type_code INTEGER REFERENCES backcountry_location_type_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	backcountry_location_code INTEGER REFERENCES backcountry_location_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	location_start_date DATE,
	location_end_date DATE,
	latitude NUMERIC(10, 7),
	longitude NUMERIC(10, 7), 
	display_order INTEGER,	
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expedition_member_routes (
	id SERIAL PRIMARY KEY,
	expedition_member_id INTEGER NOT NULL REFERENCES expedition_members(id) ON UPDATE CASCADE ON DELETE CASCADE,
	route_code INTEGER REFERENCES route_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	itinerary_location_id REFERENCES itinerary_locations(id) ON UPDATE CASCADE ON DELETE SET NULL, --
	route_order INTEGER,
	route_was_summited BOOLEAN, --a null summit_date could indicate that the route wasn't climbed, but I don't think you could rely on it
	highest_elevation_ft INTEGER,
	summit_date DATE 
);

CREATE TABLE IF NOT EXISTS transactions (
	id SERIAL PRIMARY KEY,
	expedition_member_id INTEGER NOT NULL REFERENCES expedition_members(id) ON UPDATE CASCADE ON DELETE CASCADE,
	transaction_type_code INTEGER REFERENCES transaction_type_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	payment_method_code INTEGER REFERENCES payment_method_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	transaction_value MONEY,
	transaction_notes TEXT,
	transaction_date DATE,
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

-- I think most of the actual calendar building can happen in the app. This table just stores the breifing info
CREATE TABLE IF NOT EXISTS briefings (
	id SERIAL PRIMARY KEY,
	expedition_id INTEGER NOT NULL REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	briefing_start TIMESTAMP,
	briefing_end TIMESTAMP,
	briefing_ranger_user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
	briefing_notes TEXT
);

CREATE TABLE IF NOT EXISTS cmc_inventory (
	id SERIAL PRIMARY KEY, 
	cmc_can_identifier VARCHAR(50) UNIQUE, 
	cmc_status_code INTEGER 
		DEFAULT 1 -- active 
		REFERENCES cmc_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT, 
	rfid_tag_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS cmc_checkout (
	id SERIAL PRIMARY KEY, 
	expedition_id INTEGER NOT NULL REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	cmc_id INTEGER NOT NULL REFERENCES cmc_inventory(id) ON UPDATE CASCADE ON DELETE CASCADE,
	issued_by VARCHAR(50),
	checkout_date DATE,
	checked_in_by VARCHAR(50),
	return_date DATE
);

CREATE TABLE IF NOT EXISTS communication_devices (
	id SERIAL PRIMARY KEY,
	expedition_id INTEGER NOT NULL REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE, --expedition_member_id is optional field in app, so persistent foreign key is necessary
	expedition_member_id INTEGER REFERENCES expedition_members(id) ON UPDATE CASCADE ON DELETE CASCADE,
	communication_device_type_code INTEGER REFERENCES communication_device_type_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	number_or_address VARCHAR(255),
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users ( 
	id SERIAL PRIMARY KEY, 
	ad_username VARCHAR(50) UNIQUE, 
	first_name VARCHAR(50), 
	last_name VARCHAR(50), 
	email_address VARCHAR(50) UNIQUE,
	user_role_code INTEGER REFERENCES user_role_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	user_status_code INTEGER REFERENCES user_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT, 
	UNIQUE (first_name, last_name)
);

CREATE DOMAIN config_data_type AS VARCHAR(25) CHECK (
    VALUE IN (
        'string',
        'integer',
        'float',
        'boolean',
        'money'
    )
);
CREATE TABLE IF NOT EXISTS config (
	id SERIAL PRIMARY KEY,
	property VARCHAR(50) UNIQUE,
	display_name VARCHAR(255) UNIQUE,
	data_type config_data_type,
	value VARCHAR(255),
	is_editable BOOLEAN DEFAULT true,
	is_array BOOLEAN DEFAULT false
);


-- insert lookup info that won't get imported in Python script
INSERT INTO sex_codes (name) VALUES ('Female'), ('Male'), ('Intersex'), ('Prefer not to say');
INSERT INTO frostbite_severity_codes(name) VALUES ('superficial'), ('deep'), ('mild'), ('moderate'), ('severe');
INSERT INTO user_role_codes (name) VALUES ('Data entry'), ('Ranger'), ('Admin');
INSERT INTO mountain_codes (name, elevation_ft) VALUES ('Denali', 20310), ('Foraker', 17400);
INSERT INTO cmc_status_codes (name) VALUES ('active'), ('lost'), ('damaged'));
INSERT into payment_method_codes (name) VALUES ('Pay.gov'), ('Credit card'), ('Cash'), ('Check');
INSERT into communication_device_type_codes (name) VALUES ('Satellite phone'), ('inReach'), ('Zoleo'), ('Spot');

-- UPDATE codes and sort order
DO $$
DECLARE
    tables CURSOR FOR
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public' AND table_name LIKE '%_codes'
        ORDER BY table_name;
    nbRow int;
BEGIN
    FOR table_record IN tables LOOP
        EXECUTE 'UPDATE ' || table_record.table_name || ' SET sort_order=id, code=id;';
    END LOOP;
END$$;


-- VIEWS/MAT VIEWS
-- climber info
CREATE OR REPLACE VIEW climber_info_view AS
	SELECT DISTINCT ON (climbers.first_name, middle_name, climbers.last_name, climbers.id)
	 	climbers.first_name || ' ' || climbers.last_name AS full_name,
	    climbers.id,
	    climbers.first_name,
	    coalesce(climbers.middle_name, '') as middle_name,
	    climbers.last_name,
	    climbers.address,
	    climbers.city,
	    climbers.state_code,
	    climbers.other_state_name,
	    climbers.country_code,
	    climbers.postal_code,
	    climbers.dob,
	    CASE  
	    	WHEN climbers.dob IS NULL AND climbers.age IS NOT NULL THEN extract(years FROM age(now(), climbers.entry_time)) + climbers.age  
	    	ELSE extract(years FROM age(now(), climbers.dob)) 
	    END AS age,
	    climbers.email_address,
	    climbers.phone,
	    climbers.sex_code,
	    climbers.solo_form_signed,
	    climbers.received_pro_pin,
	    climbers.is_guide, 
	    climbers.hx_of_frostbite,
	    climbers.hx_of_ams,
	    climbers.hx_of_hace,
	    climbers.hx_of_hape,
	    climbers.hx_notes,
	    climbers.internal_notes,
	    climbers.entered_by,
	   	to_char(climbers.entry_time, 'Mon DD, YYYY') AS entry_time,
	    climbers.last_modified_by,
	    to_char(climbers.last_modified_time, 'Mon DD, YYYY') AS last_modified_time,
	    expeditions.id AS expedition_id,
	    expeditions.expedition_name,
	    to_char(coalesce(expeditions.actual_departure_date, expeditions.planned_departure_date), 'Mon DD, YYYY') AS expedition_date
	   FROM climbers
		 LEFT JOIN expedition_members ON climbers.id = expedition_members.climber_id
	     LEFT JOIN expeditions ON expeditions.id = expedition_members.expedition_id
	  ORDER BY climbers.first_name, middle_name, climbers.last_name, climbers.id, abs(extract(epoch FROM planned_departure_date - now()))
	  ;


-- climber history view
CREATE OR REPLACE VIEW climber_history_view AS 
	SELECT 
		row_number() over(),
		expeditions.expedition_name, 
		expeditions.id AS expedition_id, 
		expedition_member_routes.id AS expedition_member_route_id,
		expedition_members.id AS expedition_member_id,
		expedition_members.climber_id,
		expedition_members.permit_number,
		expedition_members.datetime_reserved::date AS datetime_reserved,
		expedition_members.datetime_cancelled,
		expedition_members.early_return_date,
		expedition_members.is_checked_in,
		expedition_members.reservation_status_code,
		expedition_members.flagged,
		expedition_members.flagged_reason,
		expedition_members.flagged_by,
		expedition_members.is_illegal_guide,
		expedition_members.is_trip_leader,
		expedition_members.is_guiding,
		expedition_members.is_interpreter,
		expedition_members.received_pro_pin,
		expedition_members.reason_for_pro_pin,
		expedition_members.application_complete,
		expedition_members.psar_complete,
		expedition_members.frostbite_severity_code,
		expedition_members.frostbite_details,
		expedition_members.had_ams,
		expedition_members.had_hace,
		expedition_members.had_hape,
		expedition_members.medical_notes,
		expedition_members.climber_comments,
		expedition_members.internal_notes,
		expedition_member_routes.route_code,
		expedition_member_routes.route_order,
		expedition_member_routes.route_was_summited,
		expedition_member_routes.summit_date,
		expedition_member_routes.highest_elevation_ft,
		expeditions.sanitation_problems, 
		expeditions.equipment_loss,
		expeditions.actual_departure_date, 
		expeditions.actual_return_date,
		expeditions.is_backcountry,
		coalesce(expedition_status_view.expedition_status, 1) AS group_status_code 
	FROM expedition_member_routes 
		JOIN expedition_members ON expedition_member_routes.expedition_member_id=expedition_members.id 
		JOIN expeditions ON expedition_members.expedition_id=expeditions.id 
		JOIN climbers ON expedition_members.climber_id=climbers.id 
		LEFT JOIN expedition_status_view ON expedition_status_view.expedition_id = expeditions.id
	WHERE 
		expeditions.actual_departure_date < now() 
	ORDER BY 
		expeditions.actual_departure_date DESC, 
		expedition_member_routes.route_order ASC;


CREATE OR REPLACE VIEW expedition_status_view AS 
	SELECT 
		expedition_id,
		min(reservation_status_code) AS expedition_status
	FROM expedition_members
	WHERE reservation_status_code >= 0
	GROUP BY expedition_id;


CREATE OR REPLACE VIEW expedition_info_view AS 
	SELECT 
		row_number() over(),
		expedition_member_routes.id AS expedition_member_route_id,
		transactions.id AS transaction_id,
		climbers.first_name,
		climbers.last_name,
		climbers.is_guide,
		to_char(expeditions.entry_time, 'Mon DD, YYYY'::text) AS expeditions_entry_time,
		expeditions.entered_by AS expeditions_entered_by,
		to_char(expeditions.last_modified_time, 'Mon DD, YYYY'::text) AS expeditions_last_modified_time,
		expeditions.last_modified_by AS expeditions_last_modified_by,
		to_char(expedition_members.entry_time, 'Mon DD, YYYY'::text) AS expedition_members_entry_time,
		expedition_members.entered_by AS expedition_members_entered_by,
		to_char(transactions.entry_time, 'Mon DD, YYYY'::text) AS transactions_entry_time,
		transactions.entered_by AS transactions_entered_by,
		to_char(transactions.last_modified_time, 'Mon FMDD, YYYY') AS transactions_last_modified_time,
		transactions.last_modified_by AS transactions_last_modified_by,
		to_char(attachments.entry_time, 'Mon DD, YYYY'::text) AS attachments_entry_time,
		attachments.entered_by AS attachments_entered_by,
		to_char(attachments.last_modified_time, 'Mon FMDD, YYYY') AS attachments_last_modified_time,
		attachments.last_modified_by AS attachments_last_modified_by,
		expeditions.id AS expedition_id,
		expeditions.expedition_name,
		format(
			'%1s - %2s', 
			expeditions.expedition_name, 
			to_char(
				coalesce(expeditions.actual_departure_date, expeditions.planned_departure_date), 
				'MM/DD/YYYY'
			)
		) AS backcountry_expedition_name,
		expeditions.date_confirmed,
		expeditions.planned_departure_date,
		expeditions.planned_return_date,
		expeditions.actual_departure_date,
		expeditions.actual_return_date,
		expeditions.guide_company_code,
		expeditions.cua_company_code,
		expeditions.air_taxi_code,
		expeditions.entered_by,
		expeditions.entry_time,
		expeditions.reviewed_by,
		expeditions.briefed_by,
		expeditions.checked_in_datetime,
		expeditions.sanitation_problems,
		expeditions.equipment_loss,
		COALESCE(expedition_status_view.expedition_status, expeditions.group_status_code, 1) AS group_status_code,
		expeditions.expected_expedition_size,
		expeditions.is_backcountry,
		expeditions.needs_special_use_permit,
		expeditions.special_group_type_code,
		expeditions.is_acclimatizing,
		expeditions.bump_flights,
		expeditions.itinerary_description,
		expeditions.cmc_count,
		expeditions.last_modified_by,
		expeditions.last_modified_time,
		itinerary_locations.id AS itinerary_location_id,
		itinerary_locations.backcountry_location_type_code,
		itinerary_locations.backcountry_location_code,
		itinerary_locations.location_start_date,
		itinerary_locations.location_end_date,
		itinerary_locations.latitude,
		itinerary_locations.longitude,
		expedition_members.id AS expedition_member_id,
		expedition_members.climber_id,
		expedition_members.permit_number,
		expedition_members.datetime_reserved::date AS datetime_reserved,
		expedition_members.datetime_cancelled,
		expedition_members.early_return_date,
		expedition_members.is_checked_in,
		expedition_members.reservation_status_code,
		expedition_members.flagged,
		expedition_members.flagged_reason,
		expedition_members.flagged_by,
		expedition_members.is_illegal_guide,
		expedition_members.is_trip_leader,
		expedition_members.is_guiding,
		expedition_members.is_interpreter,
		expedition_members.received_pro_pin,
		expedition_members.reason_for_pro_pin,
		expedition_members.application_complete,
		expedition_members.psar_complete,
		expedition_members.frostbite_severity_code,
		expedition_members.frostbite_details,
		expedition_members.had_ams,
		expedition_members.had_hace,
		expedition_members.had_hape,
		expedition_members.medical_notes,
		expedition_members.climber_comments,
		expedition_members.internal_notes,
		expedition_member_routes.route_code,
		expedition_member_routes.route_order,
		expedition_member_routes.route_was_summited,
		expedition_member_routes.summit_date,
		expedition_member_routes.highest_elevation_ft,
		expedition_member_routes.itinerary_location_id AS expedition_member_routes_itinerary_location_id, -- prevent collision with itinerary_location table's id field
		transactions.transaction_type_code,
		transactions.transaction_value,
		transactions.transaction_notes,
		transactions.transaction_date,
		transactions.payment_method_code,
		attachments.id AS attachment_id,
		attachments.attachment_type_code,
		attachments.date_received,
		attachments.attachment_notes,
		attachments.client_filename,
		attachments.mime_type,
		(regexp_match(attachments.file_path, '\w+\\[\w-]+\.\w{3,4}$'))[1] AS file_path, --'get jsut folder\file.ext
		attachments.file_size_kb,
		cmc_checkout.id AS cmc_checkout_id,
		cmc_checkout.cmc_id,
		cmc_checkout.issued_by,
		cmc_checkout.checkout_date,
		cmc_checkout.checked_in_by,
		cmc_checkout.return_date,
		briefings.id AS briefing_id,
		briefings.briefing_start::date AS briefing_date,
		to_char(briefings.briefing_start, 'FMHH:MI am'::text) AS briefing_time,
		to_char(briefings.briefing_start, 'Dy Mon FMDD, FMHH:MI am'::text) AS briefing_datetime,
		expeditions.expedition_notes
	FROM expeditions
	LEFT JOIN (expedition_members
	JOIN climbers ON expedition_members.climber_id = climbers.id) ON expeditions.id = expedition_members.expedition_id
	LEFT JOIN itinerary_locations ON expeditions.id = itinerary_locations.expedition_id
	LEFT JOIN briefings ON expeditions.id = briefings.expedition_id
	LEFT JOIN expedition_member_routes ON expedition_members.id = expedition_member_routes.expedition_member_id
	LEFT JOIN transactions ON expedition_members.id = transactions.expedition_member_id
	LEFT JOIN attachments ON expedition_members.id = attachments.expedition_member_id
	LEFT JOIN cmc_checkout ON expeditions.id = cmc_checkout.expedition_id
	LEFT JOIN expedition_status_view ON expedition_status_view.expedition_id = expeditions.id
	ORDER BY 
		(
			CASE
				WHEN expedition_members.reservation_status_code <> 6 THEN 1
				ELSE 2
			END
		), 
		climbers.last_name, 
		climbers.first_name, 
		transactions.transaction_date, 
		transactions.id,
		itinerary_locations.display_order,
		expedition_member_routes.route_order,
		attachments.id;


CREATE OR REPLACE VIEW special_use_permit_view AS
	SELECT
		expedition_members.id AS expedition_member_id,
		expedition_members.climber_id,
		climbers.first_name || ' ' || climbers.last_name AS climber_name,
		expeditions.expedition_name,
		climbers.address,
		climbers.city,
		coalesce(state_codes.name, '')::varchar(50) AS state,
		country_codes.name AS country,
		climbers.postal_code,
		climbers.phone,
		climbers.email_address,
		expedition_members.permit_number,
		to_char(expeditions.actual_departure_date, 'Mon FMDD, YYYY') AS actual_departure_date
	FROM expedition_members
		JOIN expeditions ON expedition_members.expedition_id = expeditions.id 
		JOIN climbers ON expedition_members.climber_id = climbers.id 
		LEFT JOIN country_codes ON climbers.country_code = country_codes.code
		LEFT JOIN state_codes ON climbers.state_code = state_codes.code 
	ORDER BY 
		climbers.last_name, climbers.first_name;


--TODO: once BC routes/area are added to route table, check that BC groups don't get included in 7-day rule
CREATE OR REPLACE VIEW seven_day_rule_view AS 
	SELECT DISTINCT climber_id FROM 
	climber_history_view 
	WHERE 
		actual_return_date < now() AND
		highest_elevation_ft > (SELECT value FROM config WHERE property='minimum_elevation_for_7_day')::int AND 
		NOT is_backcountry AND 
		reservation_status_code <> 6 -- not cancelled
	;


CREATE OR REPLACE VIEW briefings_view AS
	SELECT briefings.id,
	  briefings.expedition_id,
	  briefings.briefing_start,
	  briefings.briefing_ranger_user_id,
	  briefings.briefing_end,
	  briefings.briefing_notes,
	  briefings.briefing_start::date AS briefing_date,
	  regexp_replace(to_char(briefings.briefing_start, 'HH24:MI'::text), '^0'::text, ''::text) AS briefing_start_time,
	  regexp_replace(to_char(briefings.briefing_end, 'HH24:MI'::text), '^0'::text, ''::text) AS briefing_end_time,
	  coalesce(expeditions.expected_expedition_size, t.n_members) AS n_members,
	  t.expedition_name,
	  users.first_name AS ranger_first_name,
	  users.last_name AS ranger_last_name,
	  users.ad_username AS ranger_username
	 FROM briefings
	   JOIN ( SELECT expeditions.expedition_name,
	          expedition_members.expedition_id,
	          count(*) AS n_members
	         FROM expedition_members
	           JOIN expeditions ON expeditions.id = expedition_members.expedition_id
	        GROUP BY expedition_members.expedition_id, expeditions.expedition_name) t ON briefings.expedition_id = t.expedition_id
	   	JOIN expeditions ON t.expedition_id = expeditions.id
	  	LEFT JOIN users ON users.id = briefings.briefing_ranger_user_id;

CREATE OR REPLACE VIEW briefings_expedition_info_view AS 
	SELECT 
	 	gb.expedition_id,
		CASE 
			WHEN expeditions.expected_expedition_size > 0 THEN expeditions.expected_expedition_size
			WHEN no_members THEN 0 
			ELSE gb.n_members 
		END AS n_members,
		expeditions.expedition_name,
		expeditions.planned_departure_date,
		coalesce(expedition_status_view.expedition_status, 1) AS group_status_code,
		briefings.expedition_id IS NULL AS unscheduled,
		gb.routes
	    FROM ( 
	    	SELECT
	    		expedition_id,
	    		routes,
	    		no_members,
	    		count(*) AS n_members
		    FROM (
				SELECT
					expeditions_1.id AS expedition_id,
					expedition_members.id AS expedition_member_id,
					expedition_members.id IS NULL AS no_members,
					string_agg(route_codes.name, '; ') AS routes
				FROM expeditions expeditions_1
					LEFT JOIN expedition_members ON expeditions_1.id = expedition_members.expedition_id
					LEFT JOIN expedition_member_routes ON expedition_members.id = expedition_member_routes.expedition_member_id
					LEFT JOIN route_codes ON route_codes.code=expedition_member_routes.route_code
				WHERE 
					EXTRACT(year FROM now()) <= EXTRACT(year FROM expeditions_1.planned_departure_date) AND 
					special_group_type_code <> 3 -- exclude NPS patrols
				GROUP BY 
					expeditions_1.id, expedition_members.id, no_members
			) t
			GROUP BY expedition_id, no_members, routes
		) gb
	LEFT JOIN briefings ON gb.expedition_id = briefings.expedition_id
	JOIN expeditions ON expeditions.id = gb.expedition_id
	LEFT JOIN expedition_status_view ON expedition_status_view.expedition_id = expeditions.id;


CREATE OR REPLACE VIEW all_climbs_view AS 
	SELECT 
		row_number() over(),
		climbers.first_name || ' ' || climbers.last_name AS climber_name,
		climbers.state_code,
		climbers.country_code,
		climbers.dob,
		climbers.age,
		climbers.sex_code,
		expeditions.expedition_name,
		CASE WHEN is_backcountry AND actual_departure_date IS NULL THEN format('%s - No Departure Entered', expedition_name)
			WHEN  is_backcountry AND actual_departure_date IS NOT NULL THEN format('%1s - %2s', expedition_name, to_char(actual_departure_date, 'MM/DD/YYYY'))
			ELSE expedition_name
		END AS query_expedition_name,
		expeditions.planned_departure_date,
		expeditions.actual_departure_date,
		expeditions.actual_return_date,
		expeditions.guide_company_code,
		expeditions.air_taxi_code,
		expeditions.reviewed_by,
		expeditions.briefed_by,
		coalesce(expedition_status_view.expedition_status, expeditions.group_status_code, 1) AS group_status_code,
		expeditions.special_group_type_code,
		expedition_members.expedition_id,
		expedition_members.climber_id,
		expedition_members.reservation_status_code,
		expedition_member_routes.expedition_member_id,
		expedition_member_routes.route_code,
		expedition_member_routes.route_was_summited,
		expedition_member_routes.summit_date,
		route_codes.mountain_code,
		route_codes.name AS route_name,
		mountain_codes.name AS mountain_name,
		is_guiding,
		CASE WHEN is_guiding OR is_interpreter THEN 'Yes' ELSE 'No' END AS is_guiding_yes_no,
		CASE WHEN summit_date IS NULL THEN 'No' ELSE 'Yes' END AS summited,
		actual_return_date - actual_departure_date AS trip_length_days,
		extract(year FROM coalesce(planned_departure_date, actual_departure_date)) AS year, --for bc groups, planned_departure is null
		to_char(planned_departure_date, 'Month') AS month,
		expeditions.is_backcountry,
		CASE WHEN expeditions.is_backcountry THEN 'Yes' ELSE 'No' END AS is_backcountry_yes_no,
		itinerary_locations.backcountry_location_type_code,
		itinerary_locations.backcountry_location_code,
		itinerary_locations.location_start_date,
		itinerary_locations.location_end_date
	FROM expeditions
		JOIN expedition_members ON expeditions.id = expedition_members.expedition_id
		JOIN climbers ON expedition_members.climber_id = climbers.id
		JOIN expedition_member_routes ON expedition_members.id = expedition_member_routes.expedition_member_id
		JOIN route_codes ON expedition_member_routes.route_code = route_codes.code
		JOIN mountain_codes ON route_codes.mountain_code = mountain_codes.code
		LEFT JOIN expedition_status_view ON expeditions.id = expedition_status_view.expedition_id
		LEFT JOIN itinerary_locations ON expeditions.id = itinerary_locations.expedition_id;


CREATE OR REPLACE VIEW registered_climbs_view AS
	SELECT * FROM all_climbs_view
	WHERE 
		reservation_status_code <> 6 AND 
		group_status_code <> 6; 

CREATE OR REPLACE VIEW solo_climbs_view AS 
	SELECT 
		row_number() over(),
		t.expedition_id,
		expedition_members.id AS expedition_member_id,
		t.route_code,
		expedition_members.climber_id,
		expeditions.actual_departure_date,
		climbers.last_name || ', ' || climbers.first_name AS climber_name,
		route_codes.name AS route_name,
		coalesce(expedition_status_view.expedition_status, 1) AS group_status_code,
		CASE 
			WHEN group_status_codes.name = 'Done and off mountain' THEN 'Off mountain' 
			ELSE group_status_codes.name 
		END AS status,
		to_char(
			coalesce(expeditions.actual_departure_date, expeditions.planned_departure_date),
			'Mon DD'
		) AS departure,
		coalesce(actual_departure_date, planned_departure_date) AS departure_date,
		to_char(expeditions.planned_return_date, 'Mon DD') AS planned_return,
		planned_return_date,
		CASE 
			WHEN is_backcountry THEN 'backcountry' 
			ELSE 'expeditions' 
		END AS page_name
	FROM expeditions
	JOIN expedition_members ON expeditions.id = expedition_members.expedition_id
	JOIN climbers ON expedition_members.climber_id = climbers.id
	JOIN ( 
			SELECT
				expedition_members_1.expedition_id,
				expedition_member_routes.route_code,
				count(*) AS count
			FROM expedition_members expedition_members_1
			JOIN expedition_member_routes ON expedition_members_1.id = expedition_member_routes.expedition_member_id
			GROUP BY expedition_members_1.expedition_id, expedition_member_routes.route_code
		) t ON expeditions.id = t.expedition_id
	JOIN route_codes ON t.route_code=route_codes.code 
	LEFT JOIN expedition_status_view ON expeditions.id = expedition_status_view.expedition_id
	JOIN group_status_codes ON coalesce(expedition_status_view.expedition_status, 1) = group_status_codes.code
	WHERE t.count = 1 AND (expeditions.actual_departure_date IS NOT NULL OR expedition_status_view.expedition_status = 3);


CREATE OR REPLACE VIEW missing_sup_or_payment_dashboard_view AS 
	SELECT 
		expedition_id,
		expedition_name,
		days_to_departure,
		CASE WHEN missing_sup = 0 THEN NULL ELSE missing_sup END AS missing_sup,
		CASE WHEN missing_payment = 0 THEN NULL ELSE missing_payment END AS missing_payment
	FROM (
		SELECT 
			coalesce(sup.expedition_id, fee.expedition_id) AS expedition_id,
			expedition_name, 
			extract(days FROM planned_departure_date - now()) AS days_to_departure, 
			guide_company_code,
			CASE 
				WHEN expected_expedition_size > n_members THEN expected_expedition_size - has_sup
				ELSE n_members - has_sup
			END AS missing_sup,
			CASE 
				WHEN expected_expedition_size > n_members THEN expected_expedition_size - has_fee
				ELSE n_members - has_fee
			END AS missing_payment
		FROM expeditions 
		LEFT JOIN (
			SELECT 
				expedition_id, 
				sum(application_complete::integer) AS has_sup,
				count(id) as n_members
			FROM expedition_members 
			WHERE reservation_status_code <> 6 AND expedition_id > 6000
			GROUP BY expedition_id
		) sup ON expeditions.id=sup.expedition_id 
		LEFT JOIN (
			SELECT 
				expedition_id, 
				sum((balance <= 0::MONEY)::integer) AS has_fee  
			FROM (
				SELECT
					expedition_id,
					expedition_member_id,
					sum(transaction_value) AS balance
				FROM expedition_members
				JOIN transactions ON expedition_members.id=transactions.expedition_member_id
				WHERE
					reservation_status_code <> 6 AND 
					transaction_type_code IN (3, 10, 12, 14, 15, 23, 24) 
				GROUP BY expedition_id, expedition_member_id
			) climbing_fee_balance 
			GROUP BY expedition_id
		) fee ON expeditions.id=fee.expedition_id
		WHERE 
			planned_departure_date >= now()::date AND 
			coalesce(guide_company_code, -1) = -1 --independent only
	) _
	WHERE 
		missing_sup > 0 OR missing_payment > 0
	ORDER BY days_to_departure, expedition_name;

CREATE OR REPLACE VIEW overdue_parties_view AS
	SELECT 
		CASE WHEN is_backcountry THEN 'backcountry' ELSE 'expeditions' END AS page_name,
		expedition_name,
		expedition_id,
		planned_return_date,
		now()::date - planned_return_date AS days_overdue,
		expedition_status
	FROM 
		expeditions JOIN expedition_status_view ON expeditions.id=expedition_status_view.expedition_id
	WHERE
		expedition_status_view.expedition_status = 4 AND 
		(now()::date - planned_return_date) >= 1 AND 
		extract(year FROM planned_return_date) = extract(year FROM now())
	ORDER BY 
		planned_return_date


CREATE OR REPLACE VIEW transaction_type_view AS 
SELECT 
	codes.id,
	name,
	code,
	is_credit,
	sort_order,
	is_payment, 
	coalesce(
		climbing_fee_multiplier * climbing_permit_fee + entrance_fee_multiplier * entrance_fee + youth_discount_multiplier * youth_discount_fee,
		default_fee
	) as default_fee
FROM transaction_type_codes AS codes JOIN (
	SELECT *  FROM crosstab(
		'SELECT -1 AS id, property, value::MONEY
		FROM config
		WHERE property IN (''climbing_permit_fee'', ''entrance_fee'', ''cancellation_fee'', ''youth_discount_fee'')
		ORDER BY property',
		'SELECT property FROM config WHERE property IN (''climbing_permit_fee'', ''entrance_fee'', ''cancellation_fee'', ''youth_discount_fee'') ORDER BY property'
	) AS _ (id INT, cancellation_fee MONEY, climbing_permit_fee MONEY, entrance_fee MONEY, youth_discount_fee MONEY)
) AS fees ON codes.id <> fees.id
WHERE sort_order IS NOT NULL 
ORDER BY sort_order;


CREATE OR REPLACE VIEW current_backcountry_groups_view AS 
	WITH today AS (
		SELECT now(), extract(year FROM now()) AS year
	)
	SELECT 
		itinerary_locations.expedition_id, 
		(CASE 
			WHEN actual_departure_date IS NULL THEN format('%s - No Departure Entered', expedition_name)
			ELSE format('%1s - %2s', expedition_name, to_char(actual_departure_date, 'MM/DD/YYYY'))
		END)::varchar(100) AS expedition_name,
		latitude, 
		longitude
	FROM 
		itinerary_locations 
			JOIN expeditions ON expeditions.id=itinerary_locations.expedition_id 
			JOIN expedition_status_view ON expedition_status_view.expedition_id=itinerary_locations.expedition_id 
			JOIN today ON today.now BETWEEN coalesce(location_start_date, (today.year || '-1-1')::date) AND coalesce(location_end_date, (today.year || '-12-31')::date)
	WHERE 
		expedition_status = 4 AND 
		actual_departure_date < today.now AND 
		today.year = extract(year FROM actual_departure_date)
	;


CREATE OR REPLACE VIEW current_flagged_expeditions_view AS 
	SELECT 
		expedition_name, 
		to_char(planned_departure_date, 'Mon DD') AS departure, 
		to_char(planned_return_date, 'Mon DD') AS return, 
		gb.* 
	FROM expeditions 
	JOIN (
		SELECT 
			expedition_id, 
			-- if no reason provided, aggregated string will have two semi-colons
			replace(string_agg(flagged_reason, ';'), ';;', ';') AS flagged_comments 
		FROM expedition_members 
		WHERE flagged 
		GROUP BY expedition_id
	) gb ON expeditions.id=expedition_id
	WHERE coalesce(planned_departure_date, actual_departure_date) >= now()::date
	ORDER BY planned_departure_date;


CREATE MATERIALIZED VIEW table_info_matview AS 
   SELECT 
   		row_number() over(),
   		columns.column_name,
  		columns.table_name,
  		columns.data_type,
  		columns.character_maximum_length,
  		fk.foreign_table_name,
  		fk.foreign_column_name
  	 FROM information_schema.columns columns
  		 LEFT JOIN ( SELECT columns_1.table_name,
  						columns_1.column_name,
  						ccu.table_name AS foreign_table_name,
  						ccu.column_name AS foreign_column_name
  					 FROM information_schema.table_constraints tc
  						 JOIN information_schema.key_column_usage kcu ON tc.constraint_name::name = kcu.constraint_name::name
  						 JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name::name = tc.constraint_name::name
  						 JOIN information_schema.columns columns_1 ON tc.table_name::name = columns_1.table_name::name AND kcu.column_name::name = columns_1.column_name::name
  					WHERE tc.constraint_type::text = 'FOREIGN KEY'::text AND ccu.column_name::name = 'id'::name
  			) fk ON columns.table_name::name = fk.table_name::name AND columns.column_name::name = fk.column_name::name
  		 LEFT JOIN insert_order_matview i ON i.table_name=columns.table_name  
  	WHERE columns.table_schema::name = 'public'::name AND columns.table_name::name !~~ 'pg_%'::text AND columns.table_name::name !~~ '%_codes'::text AND columns.table_name::name !~~ '%view'::text
  	ORDER BY i.level, columns.table_name, columns.column_name;


-- CREATE OR REPLACE FUNCTION refresh_climber_info_matview()
-- RETURNS trigger language plpgsql
-- AS $$
-- BEGIN
-- 	REFRESH MATERIALIZED VIEW climber_info_matview;
-- 	return null;
-- END $$;

-- CREATE OR REPLACE TRIGGER on_climbers_change
-- AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
-- ON climbers FOR EACH STATEMENT 
-- EXECUTE PROCEDURE refresh_climber_info_matview();

-- CREATE OR REPLACE TRIGGER on_expeditions_change
-- AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
-- ON expeditions FOR EACH STATEMENT 
-- EXECUTE PROCEDURE refresh_climber_info_matview();

-- CREATE OR REPLACE TRIGGER on_expedition_members_change
-- AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
-- ON expedition_members FOR EACH STATEMENT 
-- EXECUTE PROCEDURE refresh_climber_info_matview();

CREATE OR REPLACE FUNCTION get_group_status(group_id int)
returns int
language plpgsql
as
$$
declare
   group_status integer;
BEGIN
   SELECT min(reservation_status_code) 
   into group_status
   FROM expedition_members
   WHERE reservation_status_code BETWEEN 0 AND 5
   AND expedition_id=group_id;
   
   return coalesce(group_status, 6);
END;
$$;



/* Substitute a set of substrings within a larger string.
   When several strings match, the longest wins.
   Similar to php's strtr(string $str, array $replace_pairs).
   Example:
   select multi_replace('foo and bar is not foobar',
             '{"bar":"foo", "foo":"bar", "foobar":"foobar"}'::jsonb);
   => 'bar and foo is not foobar'
 */
CREATE OR REPLACE FUNCTION multi_replace(str text, substitutions jsonb)
RETURNS text
as $$
DECLARE
	regex text;
	s_left text;
	s_tail text;
	res text:='';
BEGIN
	-- collect all keys as a pipe-separated string to insert into the regex to 
	--	match any of the keys in the substitution dict
	-- i.e., key1 | key2 | key 3 ...
	select string_agg(quote_ident(term), '|' )
	from jsonb_object_keys(substitutions) as x(term)
		where term <> ''
	into regex;

	-- the regex doesn't work on a null value, so set it to an empty string
	if (coalesce(regex, '') = '') then
		return str;
	end if;

	-- construct the regex
	regex := concat('^(.*?)(', regex, ')([^_]+.*)$'); -- match no more than 1 row   

	loop
		s_tail := str;
		select 
		   concat(matches[1], substitutions->>matches[2]),
		   matches[3]
		from
		 	regexp_matches(str, regex, 'g') as matches
		into s_left, str;

		exit when s_left is null;
		res := res || s_left;

	end loop;

	res := res || s_tail;
	return res;

END 
$$ LANGUAGE plpgsql strict immutable;

-- keep function to copy views separate so that it can be called on its own
CREATE OR REPLACE FUNCTION clone_views(
	source_schema text,
	dest_schema text
) RETURNS void AS 
$BODY$

	DECLARE
		view_name text;
		record_   record;

	BEGIN

	FOR record_ IN 
		WITH 
		  dict_query AS (
		    SELECT 
		      'a' AS a, 
		      ('{"'|| string_agg(table_name || '": "dev.' || table_name, '","') || '"}')::jsonb AS replace_dict 
		    FROM information_schema.tables 
		    WHERE table_schema='public' 
		    GROUP BY a
		  ), 
		  dependency AS (
		    SELECT
		      source_table.relname as source_table,
		      dependent_view.relname as dependent_views
		    FROM pg_depend 
		    JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
		    JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
		    JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
		    JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
		    WHERE 
		      source_ns.nspname = 'public' AND 
		      source_table.relname LIKE '%view' AND
		      source_table.relname <> dependent_view.relname
		  )
		SELECT DISTINCT ON (sort_order, table_name) 
			* 
		FROM (
		  SELECT 
		    table_name,
		    dependency.dependent_views,
		    CASE 
		      WHEN table_name IN (dependency.source_table) AND table_name NOT IN (SELECT dependent_views FROM dependency) THEN 0
		      WHEN table_name IN (dependency.source_table) AND table_name IN (SELECT dependent_views FROM dependency) THEN 1
		      ELSE 2 
		    END AS sort_order,
		    multi_replace(view_definition, replace_dict) AS view_def
		  FROM information_schema.views 
		    JOIN dict_query ON replace_dict::text <> table_name
		    LEFT JOIN dependency ON dependency.source_table = table_name
		  WHERE table_schema = 'public'
		) _
		ORDER BY sort_order, table_name
	LOOP
		view_name := dest_schema || '.' || quote_ident(record_.table_name);
		EXECUTE 'CREATE OR REPLACE VIEW ' || view_name || ' AS ' || record_.view_def || ';' ;
	END LOOP;
  
	RETURN; 
 
	END;

$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- copy schema to dev
CREATE OR REPLACE FUNCTION clone_schema(
    source_schema text,
    dest_schema text,
    include_records boolean)
  RETURNS void AS
$BODY$

--  This function will clone all sequences, tables, data, views & functions from any existing schema to a new one
-- SAMPLE CALL:
-- SELECT clone_schema('public', 'new_schema', TRUE);

DECLARE
  src_oid          oid;
  tbl_oid          oid;
  func_oid         oid;
  object           text;
  buffer           text;
  srctbl           text;
  default_         text;
  column_          text;
  record_          record;
  qry              text;
  dest_qry         text;
  v_def            text;
  seqval           bigint;
  sq_last_value    bigint;
  sq_maximum_value     bigint;
  sq_start_value   bigint;
  sq_increment_by  bigint;
  sq_min_value     bigint;
  sq_cache_value   bigint;
  sq_log_cnt       bigint;
  sq_is_called     boolean;
  sq_is_cycled     boolean;
  sq_cycled        char(10);

BEGIN

-- Check that source_schema exists
  SELECT oid INTO src_oid
    FROM pg_namespace
   WHERE nspname = quote_ident(source_schema);
  IF NOT FOUND
    THEN 
    RAISE NOTICE 'source schema % does not exist!', source_schema;
    RETURN ;
  END IF;

  -- Check that dest_schema does not yet exist
  PERFORM nspname 
    FROM pg_namespace
   WHERE nspname = quote_ident(dest_schema);
  IF FOUND
    THEN 
    RAISE NOTICE 'dest schema % already exists!', dest_schema;
    RETURN ;
  END IF;

  EXECUTE 'CREATE SCHEMA ' || quote_ident(dest_schema) ;

  -- Create sequences
  -- TODO: Find a way to make this sequence's owner is the correct table.
  FOR object IN
    SELECT sequence_name::text 
      FROM information_schema.sequences
     WHERE sequence_schema = quote_ident(source_schema)
  LOOP
    RAISE NOTICE 'SEQUENCE: %', quote_ident(dest_schema) || '.' || quote_ident(object);
    
    EXECUTE 'CREATE SEQUENCE ' || quote_ident(dest_schema) || '.' || quote_ident(object);
    srctbl := quote_ident(source_schema) || '.' || quote_ident(object);

    EXECUTE 'SELECT last_value, maximum_value, start_value, increment, minimum_value, cache_value, log_cnt, is_cycled, is_called 
              FROM ' || --' || quote_ident(source_schema) || '.' || quote_ident(object) || ';' 
              '(SELECT *, ''a'' AS join_field FROM information_schema.sequences WHERE sequence_schema = ''' || quote_ident(source_schema) || ''' AND sequence_name = ''' || quote_ident(object) || ''') _ NATURAL JOIN (SELECT ''a'' AS join_field, * FROM ' || quote_ident(source_schema) || '.' || quote_ident(object) || ') __ NATURAL JOIN (SELECT ''a'' AS join_field, seqcache AS cache_value, seqcycle AS is_cycled FROM pg_sequence where seqrelid = ''' || quote_ident(object) || '''::regclass) ___ ;'
              INTO sq_last_value, sq_maximum_value, sq_start_value, sq_increment_by, sq_min_value, sq_cache_value, sq_log_cnt, sq_is_cycled, sq_is_called ; 

    IF sq_is_cycled 
      THEN 
        sq_cycled := 'CYCLE';
    ELSE
        sq_cycled := 'NO CYCLE';
    END IF;

    EXECUTE 'ALTER SEQUENCE '   || quote_ident(dest_schema) || '.' || quote_ident(object) 
            || ' INCREMENT BY ' || sq_increment_by
            || ' MINVALUE '     || sq_min_value 
            || ' MAXVALUE '     || sq_maximum_value
            || ' START WITH '   || sq_start_value
            || ' RESTART '      || sq_min_value 
            || ' CACHE '        || sq_cache_value 
            || sq_cycled || ' ;' ;

    buffer := quote_ident(dest_schema) || '.' || quote_ident(object);
    IF include_records 
        THEN
            EXECUTE 'SELECT setval( ''' || buffer || ''', ' || sq_last_value || ', ' || sq_is_called || ');' ; 
    ELSE
            EXECUTE 'SELECT setval( ''' || buffer || ''', ' || sq_start_value || ', ' || sq_is_called || ');' ;
    END IF;

  END LOOP;

-- Create tables 
  FOR object IN
    SELECT table_name::text 
      FROM information_schema.tables 
     WHERE 
        table_schema = quote_ident(source_schema) AND
        table_type = 'BASE TABLE' AND 
        to_regclass(table_name) IS NOT NULL
  LOOP
    buffer := dest_schema || '.' || quote_ident(object);
    EXECUTE 'CREATE TABLE ' || buffer || ' (LIKE ' || quote_ident(source_schema) || '.' || quote_ident(object) 
        || ' INCLUDING ALL)';

    IF include_records 
      THEN 
      -- Insert records from source table
      EXECUTE 'INSERT INTO ' || buffer || ' SELECT * FROM ' || quote_ident(source_schema) || '.' || quote_ident(object) || ';';
    END IF;
 
    FOR column_, default_ IN
      SELECT column_name::text, 
             REPLACE(column_default::text, source_schema, dest_schema) 
        FROM information_schema.COLUMNS 
       WHERE table_schema = dest_schema 
         AND TABLE_NAME = object 
         AND column_default LIKE 'nextval(%' || quote_ident(source_schema) || '%::regclass)'
    LOOP
      EXECUTE 'ALTER TABLE ' || buffer || ' ALTER COLUMN ' || column_ || ' SET DEFAULT ' || default_;
    END LOOP;

  END LOOP;

--  add FK constraint
  FOR qry IN
    SELECT 'ALTER TABLE ' || quote_ident(dest_schema) || '.' || quote_ident(rn.relname) 
                          || ' ADD CONSTRAINT ' || quote_ident(ct.conname) || ' ' || pg_get_constraintdef(ct.oid) || ';'
      FROM pg_constraint ct
      JOIN pg_class rn ON rn.oid = ct.conrelid
     WHERE connamespace = src_oid
       AND rn.relkind = 'r'
       AND ct.contype = 'f'
         
    LOOP
      EXECUTE qry;

    END LOOP;

  -- Make sure destination schema tables point to destination lookup tables
  FOR qry IN
    SELECT 
        format(
            'ALTER TABLE %1$s DROP CONSTRAINT %2$s; ALTER TABLE %1$s ADD CONSTRAINT %2$s %3$s;', 
            pgc.conrelid::regclass::text, 
            constraint_name,  
            replace(pg_get_constraintdef(pgc.oid), pgc.confrelid::regclass::text, dest_schema || '.' || pgc.confrelid::regclass::text)
        ) 
    FROM 
        pg_constraint pgc 
    JOIN information_schema.constraint_column_usage ccu ON conname=constraint_name 
    WHERE 
        constraint_schema <> table_schema AND 
        constraint_schema=dest_schema AND 
        conrelid::regclass::text LIKE dest_schema || '.%'
    
    LOOP
        EXECUTE qry;
    END LOOP;

-- Create views 
  clone_views(source_schema, dest_schema);

-- Create functions 
  FOR func_oid IN
    SELECT oid
      FROM pg_proc 
     WHERE pronamespace = src_oid

  LOOP      
    SELECT pg_get_functiondef(func_oid) INTO qry;
    SELECT replace(qry, source_schema, dest_schema) INTO dest_qry;
    EXECUTE dest_qry;

  END LOOP;
  
  RETURN; 
 
END;
 
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

ALTER FUNCTION clone_schema(text, text, boolean)
  OWNER TO postgres;


-- create a convenience function for granting permissions after re-creating 
--	schemas or views
CREATE OR REPLACE FUNCTION grant_permissions() 
	RETURNS void AS
$BODY$
	BEGIN
		GRANT USAGE ON SCHEMA public TO climberdb_read;
		GRANT SELECT ON ALL TABLES IN SCHEMA public TO climberdb_read;
		GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO climberdb_read;
		GRANT USAGE ON SCHEMA public TO climberdb_admin;
		GRANT ALL ON ALL TABLES IN SCHEMA public TO climberdb_admin;
		GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO climberdb_admin;

		GRANT USAGE ON SCHEMA dev TO climberdb_read;
		GRANT SELECT ON ALL TABLES IN SCHEMA dev TO climberdb_read;
		GRANT SELECT ON ALL SEQUENCES IN SCHEMA dev TO climberdb_read;
		GRANT USAGE ON SCHEMA dev TO climberdb_admin;
		GRANT ALL ON ALL TABLES IN SCHEMA dev TO climberdb_admin;
		GRANT ALL ON ALL SEQUENCES IN SCHEMA dev TO climberdb_admin;
	END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

--SELECT clone_views('public', 'dev'), grant_permissions();
SELECT clone_schema('public', 'dev', true), grant_permissions();
