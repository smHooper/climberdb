"""
DB/Flask utilities common to multiple scripts

"""

import datetime
import json
import dill as pickle
import os
from sqlalchemy import (
	asc, 
	case, 
	column, 
	Column, 
	create_engine, 
	desc, 
	func, 
	inspect, 
	Integer, 
	Table,  
	select, 
	text
)
from sqlalchemy.engine import Engine, URL
from sqlalchemy.engine.row import Row as sqla_Row
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm.decl_api import DeclarativeMeta
from sqlalchemy.orm import sessionmaker
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


with open(CONFIG_FILE) as f:
	config = json.load(f)


def get_engine(access='read', schema='public') -> Engine:
	"""
	Helper method to get a sqlalchemy engine 

	:return: sqlalchemy.engine.Engine
	"""
	# with open(CONFIG_FILE) as f:
	# 	config = json.load(f)

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
# 	own ID column, but session.query() will fail if it doesn't. To get 
# 	around these conflicting problems, create a virtual view (doesn't exist
# 	in the DB) and treat it like a SQLAlchemy ORM table

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
	Python datetime.date* types are converted to strings in the JSON response 
	with a GMT timezone. When converting to a Javascript Date, this pushes the 
	local time back 8/9 hours (depending on Daylight Savings). To prevent this,
	just convert all datetime.date* types to string. Then when the Javascript
	Date() constructor is called, it assumes local time and converts 
	appropriately
	
	:parameters:
	------------
	value: Any
		The value returned for a single column in a SQLAlchemy Query result

	:return: value of any type (except datetime/date)
	"""
	if isinstance(value, (datetime.date, datetime.datetime)):
		value = value.strftime('%Y-%m-%d %H:%M')

	return value


def orm_to_dict(
		orm_class_instance: Any, 
		selected_columns:[str]=[], 
		prohibited_columns: dict={}
	) -> dict:
	"""
	Helper function to process an ORM class instance into a dictionary
	"""	
	prohibited_columns = prohibited_columns or config['PHOHIBITED_QUERY_COLUMNS']
	exclude_columns = prohibited_columns.get(orm_class_instance.__table__.name) or []
	
	# If specific columns weren't specified, return all
	columns = (
		selected_columns or 
		[column.name for column in orm_class_instance.__table__.columns]
	)

	return {
		column_name: sanitize_query_value(getattr(orm_class_instance, column_name))
		for column_name in columns
		if column_name not in exclude_columns
	}



def select_result_to_dict(cursor) -> list:
	"""
	Helper function to process results from SQLAlchemy result cursor resulting 
	from a .execute() call
	"""
	return ([ 
		{
			column_name: sanitize_query_value(value)
			for column_name, value in row._asdict().items()
		} 
		for row in cursor.all()
	])


# Define in global scope so it can be imported and used in this module
db_tables = get_tables()
schema = get_schema()

def query_db(query_params:dict):

	sql = query_params.get('sql')
	where_clauses = query_params.get('where') or {}
	selects = query_params.get('select') or {}
	table_names = (
		query_params.get('tables') or 
		set([*where_clauses.keys(), *selects.keys()])
	)

	prohibited_columns = config['PHOHIBITED_QUERY_COLUMNS']

	schema = get_schema()
	read_engine = get_engine(access='read', schema=schema)
	ReadSession = sessionmaker(read_engine)

	# If raw SQL was passed, execute it
	with ReadSession() as session:
		if sql:
			# List parameters have to be tuples
			params = {
				name: tuple(param) if isinstance(param, list) 
				else param 
				for name, param in (query_params.get('params') or {}).items()
			}
			result = session.execute(sql.replace('{schema}', schema), params)
			
			response_data = select_result_to_dict(result)

		# Otherwise, use the SQLAlchemy ORM
		elif len(table_names):
			
			result = (session
				.query(*[db_tables[table_name_] for table_name_ in table_names])
				.where(*[
					get_where_clause(
						db_tables,
						table_name,
						where.get('column_name'), 
						where.get('operator') or '', 
						where.get('comparand')
					)
					for table_name, table_wheres in where_clauses.items() 
					for where in table_wheres
					if where.get('column_name')
				])
			)

			joins = query_params.get('joins')
			if joins:
				for join_ in joins: 
					left_table = db_tables[join_.get('left_table')]
					right_table = db_tables[join_.get('right_table')]
					left_table_column = getattr(
						left_table, 
						join_.get('left_table_column')
					)
					right_table_column = getattr(
						right_table, 
						join_.get('right_table_column')
					)
					result = result.join(
						right_table, 
						left_table_column == right_table_column, 
						isouter=join_.get('is_left'),
						full=join_.get('is_full')
					)

			order_by_clauses = query_params.get('order_by')
			if order_by_clauses:
				# If there are multiple ORDER BY columns, successive calls to 
				#	.order_by will modify the result accordingly
				for order_by in order_by_clauses:
					table = db_tables[order_by['table_name']]
					order = asc # function from sqla
					if 'order' in order_by:
						order = (
							asc if order_by['order']
								.lower().startswith('asc') 
							else desc
						)
					result = result.order_by(
						order(
							getattr(table, order_by['column_name'])
						)
					)


			response_data = []
			if result.count():
				for row in result:
					row_data = {}
					# If there was more than one table passed to query(), the 
					#	result will be a sqla.engine.row.Row, with separate 
					#	class instances for each table. In that case, iterate
					#	through each of them and combine
					if isinstance(row, sqla_Row): 
						for orm_instance in row:
							selected_columns = selects.get(
									orm_instance.__table__.name
								) or []
							row_data = {
								**row_data, 
								**orm_to_dict(
									orm_instance, 
									selected_columns=selected_columns
								)
							}
					else:
						row_data = orm_to_dict(row)
					# Add to the list of dicts, which will 
					response_data.append(row_data)
		else:
			raise RuntimeError(
				'Either "sql", "tables", or "where" given in reequest data. Request data:\n' + 
				json.dumps(query_params, indent=4)
			)
		
		return response_data


__all__ = [
	'CONFIG_FILE',
	'get_engine',
	'get_environment',
	'get_schema',
	'get_tables',
	'get_where_clause',
	'sanitize_query_value',
	'orm_to_dict',
	'select_result_to_dict',
	'query_db',
	'db_tables'
]