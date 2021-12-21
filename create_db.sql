CREATE DATABASE climbing_permits;

--Create lookup tables
CREATE TABLE IF NOT EXISTS country_codes(id SERIAL PRIMARY KEY, short_name CHAR(2), name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS state_codes(id SERIAL PRIMARY KEY, short_name CHAR(2), name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS sex_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS frostbite_severity_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS guide_company_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS air_taxi_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS group_status_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS special_group_type_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS reservation_status_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS mountain_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS route_codes(
	id SERIAL PRIMARY KEY, 
	mountain_code INTEGER REFERENCES mountain_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT, 
	name VARCHAR(50), 
	code INTEGER UNIQUE, 
	sort_order INTEGER,
	UNIQUE (mountain_code, name)
);
CREATE TABLE IF NOT EXISTS user_role_codes(id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS user_status_codes (id SERIAL PRIMARY KEY, name varchar(50) UNIQUE, code INTEGER UNIQUE, sort_order INTEGER);

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
	solo_form_signed BOOLEAN,
	received_pro_pin BOOLEAN,
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
	permit_number SERIAL NULL,
	planned_departure_date DATE,
	planned_return_date DATE,
	actual_departure_date DATE,
	actual_return_date DATE,
	guide_company_code INTEGER REFERENCES guide_company_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	air_taxi_code INTEGER REFERENCES air_taxi_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	reviewed_by VARCHAR(50),
	briefed_by VARCHAR(50),
	checked_in_datetime TIMESTAMP,
	sanitation_problems VARCHAR(255),
	equipment_loss VARCHAR(255),
	group_status_code INTEGER REFERENCES group_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	needs_special_use_permit BOOLEAN, 
	special_group_type_code INTEGER REFERENCES special_group_type_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expedition_members (
	id SERIAL PRIMARY KEY,
	expedition_id INTEGER REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	climber_id INTEGER REFERENCES climbers(id) ON UPDATE CASCADE ON DELETE CASCADE,
	datetime_reserved TIMESTAMP,
	datetime_canceled TIMESTAMP,
	early_return_date DATE,
	is_checked_in BOOLEAN,
	paid_registration_fee BOOLEAN,
	paid_entrance_fee BOOLEAN,
	reservation_status INTEGER REFERENCES group_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	is_illegal_guide BOOLEAN,
	is_trip_leader BOOLEAN,
	frostbite_severity_code INTEGER REFERENCES frostbite_severity_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	frostbite_details VARCHAR(255),
	had_ams BOOLEAN,
	had_hace BOOLEAN,
	had_hape BOOLEAN,
	medical_notes TEXT,
	highest_elevation_ft INTEGER,
	climber_comments TEXT, --ClimberNotes
	internal_notes TEXT, --ResNotes
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planned_routes (
	id SERIAL PRIMARY KEY,
	expedition_member_id INTEGER REFERENCES expedition_members(id) ON UPDATE CASCADE ON DELETE CASCADE,
	route_code INTEGER REFERENCES route_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	route_order INTEGER,
	route_was_climbed BOOLEAN, --a null summit_date could indicate that the route wasn't climbed, but I don't think you could rely on it
	summit_date DATE 
);

-- I think most of the actual calendar building can happen in the app. This table just stores the breifing info
CREATE TABLE IF NOT EXISTS briefing_times (
	id SERIAL PRIMARY KEY,
	expedition_id INTEGER REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	breifing_datetime TIMESTAMP,
	briefing_ranger_user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS users ( id SERIAL PRIMARY KEY, ad_username VARCHAR
(50), first_name VARCHAR(50), last_name VARCHAR(50), user_role_code INTEGER
REFERENCES user_role_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
user_status_code INTEGER REFERENCES user_status_codes(code) ON UPDATE CASCADE
ON DELETE RESTRICT, UNIQUE (first_name, last_name), UNIQUE (ad_username) );

-- insert lookup info that won't get imported in Python script
INSERT INTO sex_codes (name) VALUES ('Female'), ('Male'), ('Intersex'), ('Prefer not to say');
INSERT INTO frostbite_severity_codes(name) VALUES ('superficial'), ('deep'), ('mild'), ('moderate'), ('severe');
INSERT INTO user_role_codes (name) VALUES ('Data entry'), ('Ranger'), ('Admin');
INSERT INTO mountain_codes (name) VALUES ('Denali'), ('Foraker');

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
