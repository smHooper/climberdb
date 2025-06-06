"""
DB/Flask utilities common to multiple scripts

"""

import datetime
import json
import dill as pickle
import os
from sqlalchemy import column, Column, create_engine, func, inspect, Integer, Table,  select, text
from sqlalchemy.engine import Engine, URL
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm.decl_api import DeclarativeMeta
from sqlalchemy.pool import NullPool
from sqlalchemy.sql.elements import BinaryExpression
from sqlalchemy.sql.selectable import Subquery

from typing import Any, Mapping

SQLA_TABLE_DIR = os.path.join(os.path.dirname(__file__), '_sqlalchemy_cache')
CONFIG_FILE = '//inpdenaterm01/climberdb/config/climberdb_config.json'
# The SQLAlchemy ORM requires that views have a primary key. This dict 
#	stores the PK column name for each view. ANy views not specified here
#	have a row_number column that serves as the PK
VIEW_PRIMARY_KEYS = { 
	'climber_info_view': 'id',
	'briefings_view': 'id',
	'briefings_expedition_info_view': 'expedition_id',
	'current_backcountry_groups_view': 'expedition_id',
	'expedition_status_view': 'expedition_id',
	'missing_sup_or_payment_dashboard_view': 'expedition_id',
	'overdue_parties_view': 'expedition_id',
	'seven_day_rule_view': 'climber_id',
	'special_use_permit_view': 'expedition_member_id',
	'transaction_type_view': 'id',
	'current_flagged_expeditions_view': 'expedition_id'
}

# __all__ = [
# 	'CONFIG_FILE',
# 	'get_engine',
# 	'get_environment',
# 	'get_schema',
# 	'get_tables',
# ]


def get_engine(access='read', schema='public') -> Engine:
	"""
	Helper method to get a sqlalchemy engine 

	:return: sqlalchemy.engine.Engine
	"""
	with open(CONFIG_FILE) as f:
		config = json.load(f)

	url = URL.create('postgresql', **config[f'DB_{access.upper()}_PARAMS'])

	# Use NullPool to prevent connection pooling. Since IIS spins up a 
	#	new instance for every request (or maybe just every request 
	#	with a different URL), each app instance creates its own connection. 
	#	With SQLAlchemy connection pooling, connections stay open and the 
	#	postgres simultaneous connection limit can easily be exceeded
	return create_engine(url, poolclass=NullPool)\
		.execution_options(schema_translate_map={'public': schema, None: schema})


def get_environment() -> str:
	""" 
	Return a string indicating whether this is the production or development env.
	"""
	return 'prod' if '\\prod\\' in os.path.abspath(__file__) else 'dev'


def get_schema() -> str:
	"""
	Return the appropriate database schema based on this file's path (i.e., the environment)
	"""
	return 'public' if get_environment() == 'prod' else 'dev'



# 	Define a virtual view for the backcountry_locations_mountains_xref table
# 	SQLALchemy automap_base's .prepare() will fail if the table has its 
# 	own ID column, but session.query() will dail if it doesn't. To get 
# 	around these conflicting problems, create a virtual view (doesn't exist
# 	in the DB) and treat it like a SQLAlchemy ORM table
# 	
virtual_view = select(
    func.row_number().over().label('id'),
    column('backcountry_location_code'),
    column('mountain_code')
).select_from(text(f'{get_schema()}.backcountry_locations_mountains_xref')).subquery()

Base = declarative_base()
class BackcountryLocationsMountainsXref(Base):
    __table__ = virtual_view
    __mapper_args__ = {
        'primary_key': [virtual_view.c.id]
    }


def get_tables(overwrite_cache: bool=False, schema:str='') -> dict:
	"""
	Return a dictionary of table_name: sqlalchemy.orm.automap class instance. 
	If a SQLAlchemy metadata cache exists, load from that. If not, reflect 
	the database to create the Automap instance and cache the metadata for 
	the next time as a pickled binary file
	a pickled binary file. 
	
	:parameters:
	----------------
	overwrite_cache: bool
		ignore any previously pickled DB model. This parameter should be set to True 
		if any changes to the DB schema have ocurred since the last time the model was pickled

	:return: dictionary
	"""
	schema = schema or get_schema()
	engine = get_engine(schema=schema)
	

	if not os.path.isdir(SQLA_TABLE_DIR):
		os.mkdir(SQLA_TABLE_DIR)

	pickle_path = os.path.join(SQLA_TABLE_DIR, f'{schema}.pkl')


	inspector = inspect(engine)
	view_names = inspector.get_view_names(schema=schema)

	if not overwrite_cache and os.path.isfile(pickle_path):
		# Only try to load the DB model from the pickled cache if overwrite_cache is False 
		#	(and the file exists)
		with open(pickle_path, 'rb') as f:
			cached_metadata = pickle.load(f)
		base = automap_base(declarative_base(bind=engine, metadata=cached_metadata))
		base.prepare()

		#return {table_name: table for (table_name, table) in base.metadata.tables.items()}
	else:
		# Otherwise, reflect the metadata from the DB
		base = automap_base()
		# Views are not automapped by default so manually add them

		for view_name_ in view_names:
			Table(
				view_name_, 
				base.metadata, 
				Column(VIEW_PRIMARY_KEYS.get(view_name_) or 'row_number', Integer, primary_key=True), 
				autoload=True, 
				autoload_with=engine
				)
		base.prepare(autoload_with=engine, schema=schema, reflect=True)
		
		# Write the metadata to cache
		with open(pickle_path, 'wb') as f:
			pickle.dump(base.metadata, f)


	table_names = inspector.get_table_names(schema=schema)
	
	relation_names = table_names + view_names;
	
	tables = {
		table_name_: getattr(base.classes, table_name_) 
		for table_name_ in relation_names 
		if hasattr(base.classes, table_name_)
	}
	tables['backcountry_locations_mountains_xref'] = BackcountryLocationsMountainsXref

	return tables


def get_where_clause(
		table_dict: Mapping, 
		table_name: str, 
		column_name: str, 
		operator: str='', 
		comparand: str | list | None=None
	) -> BinaryExpression:
	"""
	Return a sqlalchemy.sql.elements.BinaryExpression instance constructed from the

	:parameters:
	----------------
	table_dict: dict
		dictionary of table_name: sqlalachemy.orm.automap class as returned by get_tables()
	table_name: str
		name of the table for this clause
	column_name: str
		name of the column for this clause
	operator: str, optional
		SQL operator. This must be one of the keys in the SQLA_OPERATORS dict or an empty string. If it's empty, column_name must refer to a boolean field.
	comparand: str or list, optional
		The value to compare the column's values to. If the operator is 'IN' or 'BETWEEN', comparand needs to be a list (for BETWEEN, the list needs to be of length 2)

	:return: sqlalchemy.sql.elements.BinaryExpression
	"""

	SQLA_OPERATORS = {
		'=':  '__eq__',
		'<>': '__ne__',
		'>':  '__gt__',
		'<':  '__lt__',
		'>=': '__ge__',
		'<=': '__le__',
		'in': 		'in_',
		'not in':   'not_in',
		'is': 		'is_',
		'is not': 	'is_not', 
		'like': 	'like',
		'not like': 'not_like',
		'between': 	'between'
	}

	if not table_name in table_dict:
		raise ValueError(f'There is no table with name "{table_name}" in the database')
	else:
		table = table_dict[table_name]

	if not hasattr(table, column_name):
		raise ValueError(f'The table "{table_name}" does not have the column "{column_name}"')
	else:
		column = getattr(table, column_name)

	if operator:
		operator = operator.lower()
		if not operator in SQLA_OPERATORS:
			raise ValueError(f'SQL operator not recognized: "{operator}"')
		
		sqla_operator_name = SQLA_OPERATORS[operator]
		if not hasattr(column, sqla_operator_name):
			raise ValueError(f'There is no matching operator "{operator}" for column "{column_name}"')

		if str(comparand).lower() == 'null':
			comparand = None

		sqla_operator = getattr(column, sqla_operator_name)
		
		# If the operator is BETWEEN, then
		expression = (
			sqla_operator(*comparand)
			if sqla_operator_name == 'between'
			else sqla_operator(comparand)
		)
	else:
		expression = column

	return expression


def sanitize_query_value(value: Any) -> Any:
	"""
	Python datetime.date* types are converted to strings in the JSON response with a GMT timezone. When converting to a Javascript Date, this pushes the local time back 8/9 hours (depending on Daylight Savings). To prevent this, just convert all datetime.date* types to string. Then when the Javascript Date() constructor is called, it assumes local time and converts appropriately
	
	:parameters:
	------------
	value: Any
		The value returned for a single column in a SQLAlchemy Query result

	:return: value of any type (except datetime/date)
	"""
	if isinstance(value, (datetime.date, datetime.datetime)):
		value = value.strftime('%Y-%m-%d %H:%M')

	return value

