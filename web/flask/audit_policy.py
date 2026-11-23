"""
audit_policy.py - climberdb data-access policy for the audit module.

This file IS the policy. Changes should be reviewed. Run check_policy() in
tests/CI so a new table or column can't silently go unclassified.

Defaults are fail-safe: a column that isn't in SAFE_COLUMNS is treated as PII,
and a table that isn't in AUDIT_KEYS raises KeyError in audit.rows().
"""
import re

import sqlglot
from sqlglot import exp
from flask import g
from sqlalchemy import text as sqlatext

from audit import get_audit

# --------------------------------------------------------------------------- #
# Entity keys: view/table -> {entity (base table): column holding its PK}
# --------------------------------------------------------------------------- #
_PERSON = {
	'climbers': 'climber_id',
	'expedition_members': 'expedition_member_id'
}
_EXPEDITION = {'expeditions': 'expedition_id'}

# Tables/views with no PII (config, lookups, system views). Fill in the rest of
# your lookup tables here; they weren't in the column list I was given.
LOOKUP_TABLES = {
	'config',
	'cmc_inventory',
	'foreign_keys_view',
	'transaction_type_view',
	'cua_company_codes',
}

AUDIT_KEYS = {
	# ---- base tables ----
	#'attachments':				{'attachments': 'id'},
	'climbers':                 {'climbers': 'id'},
	'expedition_members':       _PERSON,
	'emergency_contacts':       {'emergency_contacts': 'id', 'climbers': 'climber_id'},
	'communication_devices':    {'communication_devices': 'id', 'expedition_members': 'expedition_member_id'},

	# ---- views (one row per climb / member) ----
	'all_checked_in_climbers_view': _PERSON,
	'all_climbs_view':              _PERSON,
	'registered_climbs_view':       _PERSON,
	'solo_climbs_view':             _PERSON,
	'climber_history_view':         _PERSON,
	'climber_info_view':            {'climbers': 'id'},
	'special_use_permit_view':      _PERSON,
	'seven_day_rule_view':          {'climbers': 'climber_id'},
	'expedition_info_view': 		_PERSON,
}
AUDIT_KEYS.update({t: {} for t in LOOKUP_TABLES})

# For raw SQL, where the table isn't known, infer entities from result keys.
# Only unambiguous names: a bare "id" can't be attributed to a table.
RESULT_KEY_ENTITIES = {
	'climber_id': 'climbers',
	'expedition_member_id': 'expedition_members',
	'expedition_id': 'expeditions',
	'attachment_id': 'attachments',
	'transaction_id': 'transactions',
	'briefing_id': 'briefings',
}

# --------------------------------------------------------------------------- #
# Column classification (by column name, across all tables and views)
# --------------------------------------------------------------------------- #
# Allowlist: columns that may be returned without being treated as PII access.
# Deliberately excludes person-level keys (climber_id, expedition_member_id...),
# so any query returning person-level rows is always logged.
SAFE_COLUMNS = {
	# dates / times
	'actual_departure_date', 
	'actual_return_date', 
	'planned_departure_date', 
	'planned_return_date',
	'planned_return', 
	'departure', 
	'departure_date', 
	'return', 
	'return_date', 
	'early_return_date',
	'summit_date', 
	'location_start_date', 
	'location_end_date', 
	'date_confirmed', 
	'date_received',
	'datetime_cancelled', 
	'datetime_reserved', 
	'checked_in_datetime', 
	'checkout_date',
	'briefing_start', 
	'briefing_end', 
	'briefing_date', 
	'briefing_datetime', 
	'briefing_time',
	'briefing_start_time', 
	'briefing_end_time', 
	'transaction_date', 
	'expedition_date',
	'month', 
	'year', 
	'trip_length_days', 
	'days_overdue', 
	'days_to_departure',
	# coarse demographics (judgment call: see notes)
	'sex_code', 'country_code', 'country', 'state_code', 'state',
	# routes, mountains, groups, status, codes
	'air_taxi_code', 
	'route_code', 
	'route_name', 
	'route_order', 
	'route_was_summited', 
	'routes',
	'mountain_code', 
	'mountain_name', 
	'summited', 
	'highest_elevation_ft',
	'group_status_code', 
	'special_group_type_code', 
	'reservation_status_code', 
	'expedition_status', 
	'status',
	'guide_company_code', 
	'cua_company_code', 
	'backcountry_location_code',
	'backcountry_location_type_code', 
	'attachment_type_code', 
	'communication_device_type_code',
	'payment_method_code', 
	'transaction_type_code', 
	#'ad_username',
	'user_role_code', 
	'user_status_code',
	# group-level identifiers and measures (not person-level)
	'expedition_id', 
	'itinerary_location_id', 
	'expedition_member_routes_itinerary_location_id',
	'cmc_id', 
	'cmc_checkout_id', 
	'cmc_count', 
	'n_members', 
	'expected_expedition_size', 
	'bump_flights',
	'display_order', 
	'row_number',
	# locations of groups (operational, not personal)
	'latitude', 'longitude',
	# flags and booleans
	'application_complete', 
	'psar_complete', 
	'solo_form_signed', 
	'received_pro_pin', 
	'flagged',
	'is_guide', 
	'is_guiding', 
	'is_guiding_yes_no', 
	'is_backcountry', 
	'is_backcountry_yes_no',
	'is_checked_in', 
	'is_interpreter', 
	'is_trip_leader', 
	'is_acclimatizing',
	'needs_special_use_permit', 
	'missing_payment', 
	'missing_sup', 
	'unscheduled',
	'equipment_loss', 
	'sanitation_problems',
	# money
	'transaction_value',
	# file metadata (not the name or path)
	'mime_type', 
	'file_size_kb',
	'attachment_notes',
	'attachment_type_code',
	'file_path',
	'client_filename'
	# staff work-assignment fields (usernames of who did the work, not climbers)
	'briefed_by', 
	'reviewed_by', 
	'checked_in_by', 
	'issued_by', 
	'flagged_by', 
	'briefing_ranger_user_id',
}

# created/modified audit-trail columns, including prefixed ones like
# transactions_entered_by or expedition_members_entry_time
METADATA_RE = re.compile(r'(\w+_)?(entered_by|entry_time|last_modified_by|last_modified_time)')

# Non-person tables where a bare "id" is harmless
SAFE_COLUMNS_BY_TABLE = {
	'itinerary_locations': {'id'},
	'cmc_checkout': {'id'},
}

# Explicit PII/sensitive list. Not used for decisions (anything not safe is
# PII); it exists so check_policy() can tell "reviewed and PII" from "new,
# nobody has looked at it".
PII_COLUMNS = {
	# keys that identify a person-level record
	'id', 'climber_id', 'expedition_member_id',
	'attachment_id', 'briefing_id', 'transaction_id',
	# identity and contact
	'first_name', 'middle_name', 'last_name', 'full_name', 'climber_name',
	'email_address', 'phone', 'primary_phone', 'alternate_phone', 'number_or_address',
	'address', 'city', 'postal_code', 'other_state_name', 'dob', 'age', 'relationship',
	'permit_number', 'expedition_permit_number',
	# medical / incident
	'hx_notes', 'hx_of_ams', 'hx_of_frostbite', 'hx_of_hace', 'hx_of_hape',
	'had_ams', 'had_hace', 'had_hape', 'frostbite_details', 'frostbite_severity_code',
	'medical_notes', 'sar_fatality', 'sar_incident_number', 'sar_initiated', 'is_illegal_guide',
	# free text (can contain anything)
	'internal_notes', 'climber_comments', 'flagged_reason', 'flagged_comments',
	'expedition_notes', 'itinerary_description', 'transaction_notes', 'attachment_notes',
	'briefing_notes', 'reason_for_pro_pin',
	# names that can embed personal names
	'expedition_name', 'backcountry_expedition_name', 'query_expedition_name', 'page_name',
	'client_filename', 'file_path',
	# staff identity
	'ranger_first_name', 'ranger_last_name', 'ranger_username', 'ad_username',
	# never return
	'hashed_password',
}


def is_safe_column(table: str | None, column: str) -> bool:
	return (
		column in SAFE_COLUMNS
		or bool(METADATA_RE.fullmatch(column))
		or column in SAFE_COLUMNS_BY_TABLE.get(table, ())
	)


# --------------------------------------------------------------------------- #
# Classifying /flask/db/select requests
# --------------------------------------------------------------------------- #
SAFE_AGGREGATES = (exp.Count, exp.Sum, exp.Avg)  # return no raw values (not min/max/array_agg/string_agg)


def _select_nodes(node):
	node = node.unnest()
	if isinstance(node, exp.Union):
		yield from _select_nodes(node.left)
		yield from _select_nodes(node.right)
	else:
		yield node


def _projection_is_safe(proj) -> bool:
	# * is only OK directly inside count(*)
	for star in proj.find_all(exp.Star):
		if not isinstance(star.parent, exp.Count):
			return False
	for col in proj.find_all(exp.Column):
		if is_safe_column(None, col.name):
			continue
		# Otherwise the column must be consumed by a safe aggregate
		if not isinstance(col.find_ancestor(exp.AggFunc), SAFE_AGGREGATES):
			return False
	return True


def sql_exposes_pii(sql: str) -> bool:
	"""True unless every top-level output is a safe column or a safe aggregate.
	Anything that doesn't parse, or that we don't understand, counts as PII."""
	try:
		tree = sqlglot.parse_one(sql.replace('{schema}', 'schema'), read='postgres')
		for sel in _select_nodes(tree):
			if not isinstance(sel, exp.Select):
				return True
			if not all(_projection_is_safe(p) for p in sel.expressions):
				return True
		return False
	except Exception:
		return True


def _tables(request_data: dict) -> set:
	selects = request_data.get('select') or {}
	wheres = request_data.get('where') or {}
	return set(request_data.get('tables') or {*wheres, *selects})


def classify_select(request_data: dict) -> str:
	"""
	'lookup' (log nothing), 'safe' (log query shape only) or 'pii' (log entities)
	"""
	sql = request_data.get('sql')
	if sql:
		return 'pii' if sql_exposes_pii(sql) else 'safe'

	selects = request_data.get('select') or {}
	tier = 'lookup'
	for table in _tables(request_data):
		if table in LOOKUP_TABLES:
			continue
		cols = selects.get(table)
		# no column list means every column
		if not cols or not all(is_safe_column(table, c) for c in cols):
			return 'pii'
		tier = 'safe'
	return tier


def audit_instance(instance):
	"""
	Call from query_db's ORM loop for each mapped instance. Reads PKs straight
	off the instance, because the merged row dict loses them when several
	tables each have an "id". No-op unless the endpoint set g.audit['capture'].
	"""
	ctx = g.get('audit')
	if not ctx or not ctx.get('capture'):
		return
	keys = AUDIT_KEYS[instance.__table__.name]  # KeyError for unmapped tables, deliberately
	get_audit().note(records={e: [getattr(instance, c, None)] for e, c in keys.items()})


def audit_select(audit, request_data: dict, rows: list, tier: str):
	"""Record the outcome of /flask/db/select after query_db has run"""
	if tier == 'lookup':
		audit.skip()
		return

	sql = request_data.get('sql')
	detail = (
		{'sql': sql, 'params': request_data.get('params')} if sql
		else {'select': request_data.get('select'), 'where': request_data.get('where')}
	)
	resource = 'raw_sql' if sql else ','.join(sorted(_tables(request_data)))

	if tier == 'safe':
		audit.note(resource=resource, action='read_aggregate', row_count=len(rows), **detail)
		return

	records = {}
	if sql:  # best effort; the ORM path records entities via audit_instance()
		for key, entity in RESULT_KEY_ENTITIES.items():
			ids = [r[key] for r in rows if r.get(key) is not None]
			if ids:
				records[entity] = ids
	audit.note(resource=resource, action='read', records=records, row_count=len(rows), **detail)


# --------------------------------------------------------------------------- #
# Policy self-check: run in tests/CI against the real schema
# --------------------------------------------------------------------------- #
def check_policy(conn, schema: str) -> dict:
	rows = conn.execute(sqlatext('''
		SELECT table_name, column_name FROM information_schema.columns
		WHERE table_schema = :schema
	'''), {'schema': schema}).all()

	columns = {}
	for table, column in rows:
		columns.setdefault(table, set()).add(column)

	problems = {'unclassified_columns': [], 'tables_without_keys': [], 'bad_key_columns': []}
	for table, cols in columns.items():
		if table in LOOKUP_TABLES:
			continue
		if table not in AUDIT_KEYS:
			problems['tables_without_keys'].append(table)
		for col in sorted(cols):
			if not (is_safe_column(table, col) or col in PII_COLUMNS):
				problems['unclassified_columns'].append(f'{table}.{col}')
	for table, keys in AUDIT_KEYS.items():
		for entity, col in keys.items():
			if table in columns and col not in columns[table]:
				problems['bad_key_columns'].append(f'{table}.{col}')
	return problems