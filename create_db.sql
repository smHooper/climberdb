CREATE DATABASE climbing_permits;

--Create lookup tables
CREATE TABLE country_codes(id SERIAL PRIMARY KEY, short_name CHAR(2), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE state_codes(id SERIAL PRIMARY KEY, short_name CHAR(2), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE sex_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE frostbite_severity_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE guide_company_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE air_taxi_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE group_status_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE special_group_type_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE reservation_status_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE mountain_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE route_codes(id SERIAL PRIMARY KEY, mountain_code INTEGER REFERENCES mountain_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);
CREATE TABLE user_role_codes(id SERIAL PRIMARY KEY, short_name CHAR(3), name VARCHAR(50), code INTEGER, sort_order INTEGER);


--Create data tables
CREATE TABLE climbers (
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
	email_address VARCHAR(50),
	phone VARCHAR(25),
	sex_code INTEGER REFERENCES sex_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	solo_form_signed BOOLEAN,
	received_pro_pin BOOLEAN,
	hx_of_ams BOOLEAN,
	hx_of_frostbite INTEGER REFERENCES frostbite_severity_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	hx_of_hace BOOLEAN,
	hx_of_hape BOOLEAN,
	hx_notes TEXT,
	internal_notes TEXT,
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE emergency_contacts (
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
	alternate_phone VARCHAR(25)
	internal_notes TEXT,
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE expeditions (
	id SERIAL PRIMARY KEY,
	expedition_name VARCHAR(100) UNIQUE,
	permit_number SERIAL,
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
	group_status_code INTEGER REFERENCES group_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	needs_special_use_permit BOOLEAN, 
	special_group_type_code INTEGER special_group_type_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

CREATE TABLE expedition_members (
	id SERIAL PRIMARY KEY,
	expedition_id INTEGER REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	climber_id INTEGER REFERENCES climbers(id) ON UPDATE CASCADE ON DELETE CASCADE,
	datetime_reserved TIMESTAMP,
	datetime_canceled TIMESTAMP,
	datetime_returned TIMESTAMP,
	is_checked_in BOOLEAN,
	paid_registration_fee BOOLEAN,
	paid_entrance_fee BOOLEAN,
	reservation_status REFERENCES group_status_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	is_illegal_guide BOOLEAN,
	is_trip_leader BOOLEAN,
	frostbite_severity_code INTEGER frostbite_severity_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT,
	frostbite_details VARCHAR(255),
	contracted_ams BOOLEAN,
	contracted_hace BOOLEAN,
	contracted_hape BOOLEAN,
	medical_notes TEXT,
	highest_elevation INTEGER,
	climber_comments TEXT, --ClimberNotes
	internal_notes TEXT, --ResNotes
	entered_by VARCHAR(50),
	entry_time TIMESTAMP,
	last_modified_by VARCHAR(50),
	last_modified_time TIMESTAMP
);

-- only need one of these. The DB would be much simpler if routes were tracked by group, but it's possible
--	that routes might need to be tracked per group member
CREATE TABLE expedition_routes (
	id SERIAL PRIMARY KEY,
	expedition_id REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	route_code REFERENCES route_codes ON UPDATE CASCADE ON DELETE RESTRICT,
	summit_date DATE
);
CREATE TABLE expedition_member_routes (
	id SERIAL PRIMARY KEY,
	expedition_member_id REFERENCES expedition_members(id) ON UPDATE CASCADE ON DELETE CASCADE,
	route_code REFERENCES route_codes ON UPDATE CASCADE ON DELETE RESTRICT,
	summit_date DATE
);

-- I think most of the calendar building can happen in the app. This table just stores the breifing info
CREATE TABLE briefing_times (
	id SERIAL PRIMARY KEY,
	expedition_id REFERENCES expeditions(id) ON UPDATE CASCADE ON DELETE CASCADE,
	breifing_datetime TIMESTAMP,
	briefing_ranger_user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	ad_username VARCHAR(50),
	first_name VARCHAR(50),
	last_name VARCHAR(50),
	user_role_code INTEGER REFERENCES user_role_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT
);