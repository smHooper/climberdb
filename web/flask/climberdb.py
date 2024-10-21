import os
import re
import traceback
import base64
import secrets
import string
import shutil

import bcrypt
import smtplib
from pandas import DataFrame, ExcelWriter, read_sql
from zipfile import ZipFile, ZIP_DEFLATED
from pypdf import PdfReader, PdfWriter
from datetime import datetime
from uuid import uuid4

from flask import Flask, has_request_context, json, jsonify, render_template, request, url_for
from flask_mail import Mail, Message
from flask.logging import default_handler

import logging
from logging.config import dictConfig as loggingDictConfig

from sqlalchemy import asc
from sqlalchemy import desc
from sqlalchemy import select
from sqlalchemy import text as sqlatext
from sqlalchemy.engine.row import Row as sqla_Row
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker
# from sqlalchemy.orm import MappedClassProtocol //sqla 2.0 only

from typing import Any
from werkzeug.datastructures import FileStorage

# climberdb modules
from cache_tag import CacheTag, print_zpl
import climberdb_utils
from export_briefings import briefings_to_excel

# Asynchronously load weasyprint because it takes forever and it should only block when it's needed (exporting PDFs)
import threading
import importlib

def load_weasyprint():
    global weasyprint
    weasyprint = importlib.import_module('flask_weasyprint')

# Initiate the parallel thead to import flask_weasyprint
weasyprint_thread = threading.Thread(target=load_weasyprint)
weasyprint_thread.start()

def wait_for_weasyprint():
	'''
	Helper function to wait for weasyprint to load for endpoints that require it
	'''
	weasyprint_thread.join()


# Enable logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
if not os.path.isdir(log_dir):
	os.mkdir(log_dir)
# Configure a logger that will create a new file each day
#	Only 100 logs will be saved before they oldest one is deleted
loggingDictConfig(
	{
		"version": 1,
		"formatters": {
			"default": {
				"datefmt": "%B %d, %Y %H:%M:%S %Z",
			},
		},
		"handlers": {
			"time-rotate": {
				"class": "logging.handlers.TimedRotatingFileHandler",
				"filename": os.path.join(log_dir, 'flask.log'),
				"when": "D",
				"interval": 1,
				"backupCount": 100,
				"formatter": "default",
			},
		},
		"root": {
			"level": "DEBUG",
			"handlers": ["time-rotate"],
		},
	}
)
# Configure a custom formatter to include request information
class RequestFormatter(logging.Formatter):
	def format(self, record):
		if has_request_context():
			record.url = request.url
			record.remote_addr = request.remote_addr
			record.request_data = (
				'**ommitted**' if request.url.endswith('checkPassword') else 
				json.dumps(request.form)
			)
		else:
			record.url = None
			record.remote_addr = None
			record.request_data = None
		return super().format(record)

line_separator = '-' * 150 
formatter = RequestFormatter(line_separator + 
    '\n[%(asctime)s] %(remote_addr)s requested %(url)s\n' 
    'with POST data %(request_data)s\n'
    '%(levelname)s in %(module)s message:\n %(message)s\n' +
    line_separator
)
logging.root.handlers[0].setFormatter(formatter)


app = Flask(__name__)

# Error handling
@app.errorhandler(500)
def internal_server_error(error):
	app.logger.error(traceback.format_exc())

	return 'ERROR: Internal Server Error.\n' + traceback.format_exc() + '\n\nrequest: ' + json.dumps(request.json)


# Load config
if not os.path.isfile(climberdb_utils.CONFIG_FILE):
	raise IOError(f'CONFIG_FILE does not exists: {climberdb_utils.CONFIG_FILE}')
if not app.config.from_file(climberdb_utils.CONFIG_FILE, load=json.load):
	raise IOError(f'Could not read CONFIG_FILE: {climberdb_utils.CONFIG_FILE}')


@app.route('/flask/environment', methods=['GET'])
def get_environment() -> str:
	return climberdb_utils.get_environment()


def get_config_from_db() -> dict:
	"""
	Retrieve saved configuration values for the web app from the 'config' table
	and save it to the flask config
	"""
	engine = climberdb_utils.get_engine()
	db_config = {}		
	
	# helper function to convert DB values (which are all strings) to the proper data type
	def convert_value(value, data_type):
		return (
			float(value) if data_type == 'float' else  
			int(value) if data_type == 'integer' else
			value
		)

	with engine.connect() as conn:
		cursor = conn.execute('TABLE config');
	
		for row in cursor:
			data_type = row['data_type']
			property_name = row['property']
			value = row['value']
			try:
				converted_value = (
					[convert_value(v.strip(), data_type) for v in value.split(',')]
					if row['is_array'] 
					else convert_value(value, data_type)
				)
			except:
				raise ValueError(f'''Invalid value for property "{property_name}" with data type "{data_type}": {value} ''')
			
			# Save value in Flask config and in a dict to return for the web app
			app.config[property_name] = converted_value
			db_config[property_name] = converted_value

	return db_config

# Call it
get_config_from_db()

# Establish global scope sessionmakers to reuse at the function scope
schema = climberdb_utils.get_schema()
read_engine = climberdb_utils.get_engine(access='read', schema=schema)
write_engine = climberdb_utils.get_engine(access='write', schema=schema)
ReadSession = sessionmaker(read_engine)
WriteSession = sessionmaker(write_engine)

# Get DB model in app's global scope
tables = climberdb_utils.get_tables()


def get_content_dir(dirname='exports'):
	return os.path.join(os.path.dirname(__file__), '..', dirname)


def get_random_string(length=8):
	alphabet = string.ascii_letters + string.digits
	return ''.join(secrets.choice(alphabet) for i in range(length))



# disable caching (this doesn't seem to work for some reason)
#app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
@app.after_request
def add_header(response):
    '''
   	Add headers to force n
    '''
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers["Expires"] = "0"
    response.headers['Cache-Control'] = 'public, max-age=0'

    return response

###############################################
# ------------- Helper functions ------------ #
###############################################

def validate_password(username, password):	
	# Get user password from db
	#engine = climberdb_utils.get_engine()
	hashed_password = ''
	with read_engine.connect() as conn:
		statement = sqlatext('''SELECT hashed_password FROM users WHERE ad_username=:username''')
		cursor = conn.execute(statement, {'username': username})
		result = cursor.first()
		# If the result is an empty list, the user doesn't exist
		if not result:
			raise ValueError(f'Password query failed because user {username} does not exist')
		# if the result is None, this is a new user whose password isn't set
		if not result[0]:
			# return false so the client knows whatever was entered isn't the 
			#	same as the password in the db
			return False 

		hashed_password = result[0].encode('utf-8')
	if not hashed_password:
		raise RuntimeError('Could not connect to database')

	# Check password
	return bcrypt.checkpw(password.encode('utf-8'), hashed_password)


#---- global properties for all templates ----#
@app.context_processor
def get_global_properties():
    return {
    	'current_date': datetime.now().strftime('%B %#d, %Y'),
    	'db_admin_email': app.config['DB_ADMIN_EMAIL']
    }

# Disable caching for dynamic files
@app.after_request
def add_header(response):
    # response.cache_control.no_store = True
    if 'Cache-Control' not in response.headers:
        response.headers['Cache-Control'] = 'no-store'
    return response


###############################################
# -------------- endpoints ------------------ #
###############################################
# **for testing**
@app.route('/flask/test', methods=['GET', 'POST'])
def test():

	if request.files:
		return 'true'
	else:
		return 'false'

@app.route('/flask/config', methods=['POST'])
def db_config_endpoint():
	return get_config_from_db()


# -------------- User Management ---------------- #
def query_user_info(username):
	"""
	Helper function to get DB user info using AD username 
	"""
	sql = '''
		SELECT id, 
			:username AS ad_username, 
			user_role_code, 
			user_status_code, 
			first_name, 
			last_name, 
			email_address 
		FROM users 
		WHERE ad_username=:username 
	'''
	
	# If this is the dev environment, make sure the user is a super user
	if not '\\prod\\' in os.path.abspath(__file__):
		sql += ' AND user_role_code=4' 

	#engine = climberdb_utils.get_engine()
	result = read_engine.execute(sqlatext(sql), {'username': username})
	if result.rowcount == 0:
		return json.dumps({'ad_username': username, 'user_role_code': None, 'user_status_code': None})
	else:
		return result.first()._asdict()


# Get username and role
@app.route('/flask/user_info', methods=['POST'])
def get_user_info():
	
	username = ''
	try:
		# strip domain ('nps') from username, and make sure it's all lowercase
		username = re.sub(r'^.+\\', '', request.remote_user).lower()
	except:
		return 'ERROR: no auth_user'
	if not username:
		return 'ERROR: no auth_user'

	data = request.form
	if 'client_secret' in data:
		if data['client_secret'] == app.config['TEST_CLIENT_SECRET']:
			username = 'test'
		else:
			return json.dumps({'ad_username': username, 'user_role_code': None, 'user_status_code': None})

	return query_user_info(username)


# Set user password
@app.route('/flask/setPassword', methods=['POST'])
def set_password():
	data = request.form
	old_password = data['old_password'] if 'old_password' in data else ''
	username = data['username']
	
	# If the user's old passord is wrong, return false
	if old_password:
		if not validate_password(username, old_password):
			return 'false'

	# encrypt the new password
	new_password = data['new_password']
	salt = bcrypt.gensalt()
	hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), salt)
	
	# Update db
	#engine = climberdb_utils.get_engine()
	statement = sqlatext('''UPDATE users SET hashed_password=:password, user_status_code=2 WHERE ad_username=:username''')
	write_engine.execute(statement, {'password': hashed_password.decode(), 'username': username})

	return 'true'


# check user password
@app.route('/flask/checkPassword', methods=['POST'])
def check_password():
	# Get user input
	data = request.form
	user_input = data['client_password']
	username = data['username']
	
	# Until I implemeent ORM-driven queries, a single-quote will screw up the SQL statements 
	# if "'" in user_input:
	# 	return 'false'

	# Check if the password is right
	is_valid = validate_password(username, user_input)

	return json.dumps(is_valid)

# -------------- User Management ---------------- #


#--------------- Email notifications ---------------------#
def get_email_logo_base64(): 
	""" Helper method to get logo image data for email messages """
	with open('imgs/climberdb_icon_100px.jpg', 'rb') as f:
		return base64.b64encode(f.read()).decode('utf-8')

#account request
# @app.route('/flask/notifications/accountRequest', methods=['POST'])
# def send_account_request():
# 	data = request.form
# 	data = dict(request.form)

# 	# get logo iimage data
# 	with open('imgs/climberdb_icon_100px.jpg', 'rb') as f:
# 		base64_str = base64.b64encode(f.read())
# 	data['logo_base64_string'] = 'data:image/jpg;base64,' + base64_str.decode('utf-8')
# 	data['request_id'] = '1094874'
# 	data['button_url'] = request.base_url + '/users.html?request_id=' + request_id
	
# 	html = render_template('account_request_email.html', **data)
# 	mailer = Mail(app)
# 	msg = Message(
# 		subject='New climber permit portal account request',
# 		recipients=app.config['PROGRAM_ADMIN_EMAIL'], #should get from users table
# 		html=html,
# 		reply_to=app.config['DB_ADMIN_EMAIL'])
# 	mailer.send(msg)

#  	return 'true';

# new account creation

def send_password_email(request_data, html):
	"""
	Helper function to send password reset or account activation email
	"""
	username = request_data['username']
	user_info = query_user_info(username)
	if 'email_address' not in user_info:
		raise RuntimeError(f''' '{username}' is not a valid username''')
	else:
		email_address = user_info['email_address']
		if not email_address:
			raise RuntimeError(f'''No email address found for user '{username}' ''')

	mailer = Mail(app)
	msg = Message(
		subject=request_data['heading_title'],
		recipients=[email_address],
		html=html,
		reply_to=app.config['db_admin_email']
	)
	mailer.send(msg)


# This endpoint sends an activation notification to a user whose account was just created by an admin
@app.route('/flask/notifications/account_activation', methods=['POST'])
def send_account_request():
	data = dict(request.form)

	if not 'user_id' in data:
		raise ValueError('BAD REQUEST. No user_id given')
	if not 'username' in data:
		raise ValueError('BAD REQUEST. No username given')

	data['logo_base64_string'] = 'data:image/jpg;base64,' + get_email_logo_base64()	
	data['button_url'] = f'''{request.url_root.strip('/')}/index.html?activation=true&id={data['user_id']}'''
	data['button_text'] = 'Activate Account'
	data['heading_title'] = 'Activate your Denali Climbing Permit Portal account'

	html = render_template('email_notification_activation.html', **data)

	send_password_email(data, html)

	return 'true';


# reset password
# This endpoint sends a password reset email to a user
@app.route('/flask/notifications/reset_password', methods=['POST'])
def send_reset_password_request():
	data = dict(request.form)

	if not 'user_id' in data:
		raise ValueError('BAD REQUEST. No user_id given')
	if not 'username' in data:
		raise ValueError('BAD REQUEST. No username given')

	user_id = data['user_id']
	data['logo_base64_string'] = 'data:image/jpg;base64,' + get_email_logo_base64()	
	data['button_url'] = f'''{request.url_root.strip('/').replace(':9006', ':9007')}/index.html?reset=true&id={user_id}'''
	data['button_text'] = 'Reset Password'
	data['heading_title'] = 'Reset Denali Climbing Permit Portal account password'

	html = render_template('email_notification_reset_password.html', **data)
	
	send_password_email(data, html)

	#engine = climberdb_utils.get_engine()
	try:
		write_engine.execute(sqlatext('UPDATE users SET user_status_code=1 WHERE id=:user_id'), {'user_id': user_id})
	except Exception as e:
		raise RuntimeError(f'Failed to update user status with error: {e}')

	return 'true'

#--------------- Email notifications ---------------------#



#--------------- Reports ---------------------#
@app.route('/flask/reports/confirmation_letter/<expedition_id>.pdf', methods=['POST'])
def get_confirmation_letter(expedition_id):
	data = dict(request.form)

	# For some stupid reason, the array comes in as a single value, so I encode it as a 
	#	JSON string client side and it needs to be decoded here
	data['climbers'] = json.loads(data['climbers'])
	# Reformat date to be more human-readable
	data['planned_departure_date'] = datetime.strptime(
			data['planned_departure_date'], '%Y-%m-%d'
		).strftime('%B %#d, %Y')
	
	# Get HTML string
	html = render_template('confirmation_letter.html', **data)

	cleaned_expedition_name = re.sub(r'\W', '_', data['expedition_name'])
	pdf_filename = f'confirmation_letter_{cleaned_expedition_name}.pdf'

	# wait until the last moment to block for weasyprint to load
	wait_for_weasyprint()

	# return HTML as PDF binary data
	html = weasyprint.HTML(string=html)
	#pdf_data = weasyprint.render_pdf(html, download_filename=pdf_filename)
	
	# write to disk as PDF
	pdf_path = os.path.join(get_content_dir('exports'), pdf_filename)
	html.write_pdf(pdf_path)

	return 'exports/' + pdf_filename #pdf_data


@app.route('/flask/reports/registration_card/<expedition_id>.pdf', methods=['POST'])
def get_registration_card(expedition_id):
	data = dict(request.form)

	# For some stupid reason, the array comes in as a single value, so I encode it as a 
	#	JSON string client side and it needs to be decoded here
	data['climbers'] = json.loads(data['climbers'])
	data['routes'] = json.loads(data['routes'])
	for prop in data:
		if prop.endswith('_date') and data[prop]:
			data[prop] = datetime.strptime(
					data[prop], '%Y-%m-%d'
				).strftime('%#m/%#d/%Y')
	data['checkmark_character'] = '\u2714';

	# Get HTML string
	html = render_template('registration_card.html', **data)

	cleaned_expedition_name = re.sub(r'\W', '_', data['expedition_name'])
	pdf_filename = f'registration_card_{cleaned_expedition_name}.pdf'

	# render html
	wait_for_weasyprint()
	html = weasyprint.HTML(string=html)
	
	# write to disk as PDF
	pdf_path = os.path.join(get_content_dir('exports'), pdf_filename)
	html.write_pdf(pdf_path)
	#pdf_data = weasyprint.render_pdf()
	
	return 'exports/' + pdf_filename #pdf_data


@app.route('/flask/reports/transaction_history/<expedition_id>.pdf', methods=['POST'])
def get_transaction_history(expedition_id):
	data = dict(request.form)

	data['transaction_history'] = json.loads(data['transaction_history']);

	# Get HTML string
	html = render_template('transaction_history.html', **data)

	cleaned_expedition_name = re.sub(r'\W', '_', data['expedition_name'])
	pdf_filename = f'transaction_history_{cleaned_expedition_name}.pdf'

	# render html
	wait_for_weasyprint()
	html = weasyprint.HTML(string=html)
	
	# write to disk as PDF
	pdf_path = os.path.join(get_content_dir('exports'), pdf_filename)
	html.write_pdf(pdf_path)

	return 'exports/' + pdf_filename #pdf_data


@app.route('/flask/reports/transaction_history/<expedition_id>', methods=['GET', 'POST'])
def get_transaction_history_html(expedition_id):
	data = dict(request.form)

	data['transaction_history'] = json.loads(data['transaction_history']);

	# Get HTML string
	return render_template('transaction_history.html', **data)


@app.route('/flask/reports/briefing_schedule', methods=['POST'])
def get_briefing_schedule():
	data = dict(request.form)
	data['time_slots'] = json.loads(data['time_slots'])
	data['briefings'] = json.loads(data['briefings'])

	excel_filename = briefings_to_excel(data, get_content_dir('exports'))
	
	return 'exports/' + excel_filename


@app.route('/flask/reports/special_use_permit', methods=['POST'])
def export_special_use_permit():
	"""
	Endpoint to export Special Use Permit(s) for one or more expedition members.
	
	Request data parameters include:
	permit_data: per exp. member info that's easier to get client-side
	export_type: value is either 'merged' or 'multiple' which indicates whether a single
		merged PDF should be created or a zip file of multiple individual PDFs should be
		returned
	expedition_id: The expedition database ID. This is only required so thatPDFs
		for can include the ID in the filename in case this multiple files for 
		climbers/expeditions with the same name exist in the exports directory

	response: path the PDF or zip file
	"""

	# permit_data is data per exp. member that's easier to get client-side
	permit_data = json.loads(request.form['permit_data'])
	export_type = request.form['export_type'] # mutliple PDFs or a single merged PDF
	expedition_id = request.form['expedition_id']
	expedition_name = request.form['expedition_name']

	# Query data from DB
	expedition_member_ids = permit_data.keys()
	#engine = climberdb_utils.get_engine()
	expedition_member_id_string = ','.join(expedition_member_ids)
	statement = sqlatext('''
		SELECT * FROM special_use_permit_view 
		WHERE expedition_member_id IN (:expedition_member_ids)
	''')
	with read_engine.connect():
		cursor = read_engine.execute(statement, {'expedition_member_ids': expedition_member_id_string})
		
		sup_permit_filename = app.config['SUP_PERMIT_FILENAME']
		pdf_path = os.path.join(os.path.dirname(__file__), 'assets', sup_permit_filename)

		output_pdfs = []	
		for row in cursor:
			member_id = str(row.expedition_member_id)
			form_prefix = f'id_{member_id}'

			# Combine the client-side and DB data
			member_data = dict(**permit_data[member_id], **row)
			
			reader = PdfReader(pdf_path)
			writer = PdfWriter()

			# Get the index of the first page of this permit. This is the 0th page of the permit
			#	so it will always be the number of pages before pages for this permit are added
			data_page_index = len(writer.pages)
			
			# Add pages for this permit. clone_document_from_reader is the only method that 
			#	copies the form and all other PDF structural components such that 
			writer.clone_document_from_reader(reader)

			writer.update_page_form_field_values(writer.pages[data_page_index], member_data)
			
			# If each permit is a separate PDF or if there's only one to write, write this one to disk
			climber_name = re.sub(r'\W+', '_', member_data['climber_name']).lower()
			pdf_filename = f'special_use_permit_{expedition_id}_{climber_name}.pdf'
			output_pdf = os.path.join(get_content_dir('exports'), pdf_filename)
			with open(output_pdf, 'wb') as f:
				writer.write(f)
			
			# If there's only one PDF to create, just return that path
			if len(expedition_member_ids) == 1:
				return 'exports/' + pdf_filename
			else:
				output_pdfs.append(output_pdf)

	if len(output_pdfs) == 0:
		raise RuntimeError('PDFs could not be created because no expediton_member_ids matached ' + expedition_member_id_string)

	output_basename = f'special_use_permit_{expedition_id}_' + re.sub(r'\W+', '_', expedition_name)	
	
	# write a single merged PDF
	if export_type == 'merged':
		letters = [chr(item) for item in range(ord("a"), ord("z") + 1)] # a-z as list
		writer = PdfWriter()
		for i, pdf_path in enumerate(output_pdfs):
			reader = PdfReader(pdf_path)
			reader.add_form_topname(letters[i])
			writer.append(reader)
			del reader

		output_filename = output_basename + '.pdf'
		output_path = os.path.join(get_content_dir('exports'), output_filename)
		with open(output_path, 'wb') as f:
			writer.write(f)
	# it's a zipped collection of individual PDFs
	else: 
		output_filename = output_basename + '.zip'
		output_path = os.path.join(get_content_dir('exports'), output_filename)
		with ZipFile(output_path, 'w', ZIP_DEFLATED) as z:
			for pdf_path in output_pdfs:
				z.write(pdf_path, arcname=os.path.basename(pdf_path))

	return 'exports/' + output_filename


# Default 
def write_query_to_excel(query_data, query_name, excel_path, excel_start_row=0, write_columns=True):

	# Write to the excel file
	with ExcelWriter(excel_path, engine='openpyxl', mode='a', if_sheet_exists='overlay') as writer:
		query_data.to_excel(writer, startrow=excel_start_row, header=write_columns, index=False)


# Handle guide_company_client_status and guide_company_briefings queries
def write_guided_company_query_to_excel(client_status, briefings, excel_path, title_text):

	with ExcelWriter(excel_path, engine='openpyxl', mode='a', if_sheet_exists='overlay') as writer:
		workbook = writer.book

		if len(client_status):
			client_status.to_excel(writer, sheet_name='Client Status', startrow=2, header=False, index=False)
		else:
			workbook.remove('Client Status')
			workbook.save()

		if len(briefings):
			briefings.to_excel(writer, sheet_name='Briefings', startrow=1, header=False, index=False)

		workbook['Client Status']['A1'] = title_text


# Export results of predefined queries
@app.route('/flask/reports/export_query', methods=['POST'])
def export_query():
	
	data = dict(request.form)

	# with open(os.path.join(get_content_dir('exports'), 'export_data.json'), 'w') as f:
	# 	json.dump(data, f)

	# Make sure any filename is unique
	random_string = get_random_string()

	query_name = data['query_name']

	# Convert JSON string arrays to lists because arrays can't be sent directly
	data['columns'] = json.loads(data['columns'])
	if query_name == 'guide_company_client_status' or query_name == 'guide_company_briefings':
		data['client_status_columns'] = json.loads(data['client_status_columns'])
		data['briefing_columns'] = json.loads(data['briefing_columns'])

	data['query_data'] = json.loads(data['query_data'])

	#TODO: consider re-writing so that temporary results get written when query is first run
	
	if data['export_type'] == 'excel':
		
		# If a template Excel file exists, make a copy in the exports directory to make a new file to write to
		excel_filename =  data['base_filename'] + '.xlsx' if 'base_filename' in data else f'{query_name}_{random_string}.xlsx'
		excel_path = os.path.join(get_content_dir('exports'), excel_filename)
		excel_template_path = os.path.join(os.path.dirname(__file__), 'templates', f'{query_name}.xlsx')
		if os.path.isfile(excel_template_path):
			shutil.copy(excel_template_path, excel_path)
		# If not, just write the file without using a template and return
		else:
			# maybe set up a default file
			query_data = DataFrame(data['query_data']).reindex(columns=data['columns'])
			query_data.to_excel(excel_path, index=False)
			return 'exports/' + excel_filename

		if query_name == 'guide_company_client_status' or query_name == 'guide_company_briefings':
			query_data = data['query_data']
			client_status = DataFrame(query_data['client_status']).reindex(columns=data['client_status_columns'])
			briefings = DataFrame(query_data['briefings']).reindex(columns=data['briefing_columns'])
			write_guided_company_query_to_excel(
				client_status, 
				briefings, 
				excel_path,
				data['title_text']
			)
		else:
			query_data = DataFrame(data['query_data']).reindex(data['columns'])
			write_query_to_excel(
				query_data, 
				query_name, 
				excel_path, 
				excel_start_row=data['excel_start_row'],
				write_columns=data['excel_write_columns']
			)

		return 'exports/' + excel_filename

	else:
		template_name = f'{query_name}.html'
		if not os.path.isfile(os.path.join(os.path.dirname(__file__), 'templates', template_name)):
			template_name = 'export_query.html'
			
		if query_name == 'guide_company_client_status':
			data['briefing_title_text'] = data['title_text'].replace('Client Status', 'Scheduled Briefings')
			
		html = render_template(template_name, **data) 

		# render html
		wait_for_weasyprint()
		html = weasyprint.HTML(string=html)

		# write to disk
		pdf_filename = f'{query_name}.pdf' #f'{query_name}_{random_string}.pdf'
		pdf_path = os.path.join(get_content_dir('exports'), pdf_filename)
		html.write_pdf(pdf_path)

		return 'exports/' + pdf_filename

#--------------- Reports ---------------------#


#-------------- cache tags -------------------#
# Write data to Label Matrix source Excel file
@app.route('/flask/cache_tag/write_label_matrix', methods=['POST'])
def write_to_label_matrix():
	
	data = DataFrame([dict(request.form)])
	label_matrix_source = app.config['LABEL_MATRIX_SOURCE']
	source_path = os.path.join(os.path.dirname(__file__), 'assets', label_matrix_source)
	data.to_csv(source_path, index=False)

	return 'true'


@app.route('/flask/cache_tag/preview', methods=['POST'])
def preview_cache_tag():
	"""
	Create a cache tag label, save it as an image, and return the image path 
	and ZPL string to create it back to the client
	"""

	data = dict(request.form)

	expedition_id = data['expedition_id']
	tag = CacheTag(
		data['expedition_name'], 
		data['leader_name'], 
		expedition_id, 
		data['air_taxi_name'], 
		data['planned_return_date'],
		ssl_cert=app.config['SSL_CERT_PATH']
	)
	tag.build_cache_tag_label()
	
	preview_img = tag.get_preview()
	exports_dir = get_content_dir('exports')
	preview_filename = f'cache_tag_preview_{expedition_id}.jpg'
	preview_img.save(os.path.join(exports_dir, preview_filename))

	return {'preview_src': 'exports/' + preview_filename, 'zpl': tag.label.code}


@app.route('/flask/cache_tag/print', methods=['POST'])
def print_cache_tag():
	"""
	Send ZPL to printer to produce the requested number of labels
	"""
	zpl = request.form['zpl']
	for i in range(int(request.form['n_labels'])):
		print_zpl(app.config['CACHE_TAG_PRINTER_HOST'], app.config['CACHE_TAG_PRINTER_PORT'], zpl)

	return 'true'

#-------------- cache tags -------------------#


#---------------- DB I/O ---------------------#

# helper function to process an ORM class instance into a dictionary
def orm_to_dict(orm_class_instance: Any, selected_columns:[str]=[], prohibited_columns: dict={}) -> dict:
	
	prohibited_columns = prohibited_columns or app.config['PHOHIBITED_QUERY_COLUMNS']
	exclude_columns = prohibited_columns.get(orm_class_instance.__table__.name) or []
	
	# If specific columns weren't specified, return all
	columns = (
		selected_columns or 
		[column.name for column in orm_class_instance.__table__.columns]
	)

	return {
		column_name: climberdb_utils.sanitize_query_value(getattr(orm_class_instance, column_name))
		for column_name in columns
		if column_name not in exclude_columns
	}


# helper function to process results from SQLAlchemy result cursor resulting 
#	from a .execute() call
def select_result_to_dict(cursor) -> list:
	return ([ 
		{
			column_name: climberdb_utils.sanitize_query_value(value)
			for column_name, value in row._asdict().items()
		} 
		for row in cursor.all()
	])


# All-purpose SELECT query endpoint
@app.route('/flask/db/select', methods=['POST'])
def query_db():

	request_data = request.get_json()	

	sql = request_data.get('sql')
	where_clauses = request_data.get('where') or {}
	selects = request_data.get('select') or {}
	table_names = (
		request_data.get('tables') or 
		set([*where_clauses.keys(), *selects.keys()])
	)

	prohibited_columns = app.config['PHOHIBITED_QUERY_COLUMNS']

	# If raw SQL was passed, execute it
	with ReadSession() as session:
		if sql:
			params = request_data.get('params') or None
			result = session.execute(sql, params)
			
			response_data = select_result_to_dict(result)

		# Otherwise, use the SQLAlchemy ORM
		elif len(table_names):
			
			result = (session
				.query(*[tables[table_name_] for table_name_ in table_names])
				.where(*[
					climberdb_utils.get_where_clause(
						tables,
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

			joins = request_data.get('joins')
			if joins:
				for join_ in joins: 
					left_table = tables[join_.get('left_table')]
					right_table = tables[join_.get('right_table')]
					left_table_column = getattr(left_table, join_.get('left_table_column'))
					right_table_column = getattr(right_table, join_.get('right_table_column'))
					result = result.join(right_table, left_table_column == right_table_column, isouter=join_.get('is_left'), full=join_.get('is_full'))

			order_by_clauses = request_data.get('order_by')
			if order_by_clauses:
				# If there are multiple ORDER BY columns, successive calls to .order_by 
				#	will modify the result accordingly
				for order_by in order_by_clauses:
					table = tables[order_by['table_name']]
					order = asc # function from sqla
					if 'order' in order_by:
						order = asc if order_by['order'].lower().startswith('asc') else desc
					result = result.order_by(order(getattr(table, order_by['column_name'])))


			response_data = []
			if result.count():
				for row in result:
					row_data = {}
					# If there was more than one table passed to query(), the result will be
					#	a sqla.engine.row.Row, with separate class instances for each table.
					#	In that case, iterate through each of them and combine
					if isinstance(row, sqla_Row): 
						for orm_instance in row:
							selected_columns = selects.get(orm_instance.__table__.name) or []
							row_data = {
								**row_data, 
								**orm_to_dict(orm_instance, selected_columns=selected_columns)
							}
					else:
						row_data = orm_to_dict(row)
					# Add to the list of dicts, which will 
					response_data.append(row_data)
		else:
			raise RuntimeError(
				'Either "sql", "tables", or "where" given in reequest data. Request data:\n' + 
				json.dumps(request_data, indent=4)
			)
		
		response = {'data': response_data}

		if 'queryTime' in request_data:
			response['queryTime'] = request_data['queryTime']

		return jsonify(response)



@app.route('/flask/db/select/rangers', methods=['POST'])
def query_rangers():

	with ReadSession() as session:
		users = tables['users']
		stmt = (
			select(
				users.id,
				(users.first_name + ' ' + users.last_name).label('full_name')
			).where(
				users.user_role_code == 2, # rangers
				users.user_status_code == 2 # enabled
			).order_by('full_name')
		)
		result = session.execute(stmt)
		response = {'data': select_result_to_dict(result)}

		return jsonify(response)


@app.route('/flask/db/select/climbers', methods=['POST'])
def query_climbers():

	request_data = request.get_json()
	climber_id = request_data.get('climber_id')
	
	# If a climber_id was given, just return the climber
	if climber_id:
		with ReadSession() as session:
			climbers = tables['climber_info_view']
			row = session.get(climbers, climber_id)
			# If a single ID was invalid, ROLLBACK the entire transaction
			if not row:
				raise RuntimeError(f'No climber with ID {climber_id} found')
			return jsonify({
				'data': [orm_to_dict(row)]
			})

	search_string = request_data.get('search_string')
	is_guide = request_data.get('is_guide')
	is_7_day = request_data.get('is_7_day')
	query_all_fields = request_data.get('query_all_fields')

	where_clause = ''
	if is_7_day:
		where_clause += f' WHERE {schema}.climber_info_view.id IN (SELECT climber_id FROM {schema}.seven_day_rule_view)'
	if is_guide:
		where_clause += ' AND is_guide' if where_clause else ' WHERE is_guide'


	# for the climbers page, results are paginated and only n_records climbers 
	#	are returned at a time. If this option is specified, get records from 
	#	min_index to min_index + n_records, as numbered in alphabetical order 
	#	by name
	min_index = int(request_data.get('min_index') or 1)
	n_records = int(request_data.get('n_records') or 0)
	index_where = ''
	if n_records:
		index_where = f'WHERE row_number BETWEEN :min_index AND :max_index'

	query_fields = '*' if query_all_fields else 'first_name, middle_name, last_name, full_name'
	sql = ''
	if search_string:
		core_sql = f'''
			SELECT
				*	
			FROM (
				SELECT 
					id, 
					min(sort_order) AS first_sort_order
				FROM (
					WITH climber_names AS (
						SELECT 
							*,
							regexp_replace(first_name, '\\W', '', 'g') AS re_first_name, 
							regexp_replace(middle_name, '\\W', '', 'g') AS re_middle_name, 
							regexp_replace(last_name, '\\W', '', 'g') AS re_last_name,
							regexp_replace(full_name, '\\W', '', 'g') AS re_full_name
						FROM {schema}.climber_info_view
					)
					SELECT *, 1 AS sort_order FROM climber_names WHERE 
						re_first_name ILIKE :search_string || '%%' 
					UNION ALL 
					SELECT *, 2 AS sort_order FROM climber_names WHERE 
						re_first_name || re_middle_name ILIKE :search_string || '%%' AND
						re_first_name NOT ILIKE :search_string || '%%'
					UNION ALL 
					SELECT *, 3 AS sort_order FROM climber_names WHERE 
						re_first_name || re_last_name ILIKE :search_string || '%%' AND
						(
							re_first_name NOT ILIKE :search_string || '%%' OR
							re_first_name || re_middle_name NOT ILIKE :search_string || '%%'
						)
					UNION ALL
					SELECT *, 4 AS sort_order FROM climber_names WHERE 
						re_last_name ILIKE :search_string || '%%' AND
						(
							re_first_name NOT ILIKE :search_string || '%%' OR
							re_first_name || re_middle_name NOT ILIKE :search_string || '%%' OR
							re_first_name || re_last_name NOT ILIKE :search_string || '%%'
						)
					UNION ALL 
					SELECT *, 5 AS sort_order FROM climber_names WHERE 
						re_middle_name || re_last_name ILIKE :search_string || '%%' AND 
						re_middle_name IS NOT NULL AND 
						(
							re_first_name NOT ILIKE :search_string || '%%' OR
							re_first_name || re_middle_name NOT ILIKE :search_string || '%%' OR
							re_first_name || re_last_name NOT ILIKE :search_string || '%%' OR 
							re_last_name NOT ILIKE :search_string || '%%'
						)
					UNION ALL
					SELECT *, 6 AS sort_order FROM climber_names WHERE 
						similarity(re_full_name, :search_string || '%%') > 0.5 AND 
						(
							re_first_name NOT ILIKE :search_string || '%%' OR
							re_first_name || re_middle_name NOT ILIKE :search_string || '%%' OR
							re_first_name || re_last_name NOT ILIKE :search_string || '%%' OR 
							re_last_name NOT ILIKE :search_string || '%%' OR
							re_middle_name || re_last_name NOT ILIKE :search_string || '%%'
						)
				) t 
				GROUP BY full_name, id
			) gb 
			JOIN {schema}.climber_info_view ON gb.id = climber_info_view.id 
			{where_clause}
			ORDER BY first_sort_order::text || full_name
		'''

	else:
		core_sql = f'''
			SELECT 
				*  
			FROM {schema}.climber_info_view 
			{where_clause}
		'''

	# If n_records given, execute the core sql as a subquery and return
	#	n_records starting with the specified min_index
	if n_records:
		sql = f''' 
			SELECT * FROM (
				SELECT
					row_number() over(),
					*	
				FROM 
					( {core_sql} ) t1
			) t2
			{index_where}
			ORDER BY row_number

		'''
	else:
		sql = core_sql

	return_count = request_data.get('return_count')
	with ReadSession() as session:
		params = {
			'search_string': re.sub(r'\W', '', search_string),
			'is_guide': is_guide,
			'is_7_day': is_7_day,
			'min_index': min_index,
			'max_index': (min_index + n_records - 1) if n_records else '' 
		}
		result = session.execute(sqlatext(sql), params)
		response = {
			'data': select_result_to_dict(result),
			'queryTime': request_data.get('queryTime')
		}
		if return_count:
			cursor = session.execute(sqlatext(f'SELECT count(*) FROM ({core_sql}) _'), params)
			response['count'] = cursor.first().count
		
		return jsonify(response)


@app.route('/flask/db/save', methods=['POST'])
def save_db_edits():
	"""
	Generic endpoinr to process INSERT and UPDATE requests. The INSERT data come in as 
	{
		root_table: [
			{
				root_data_1: {
					values: {...}, 
					children: {
						child_table: [
							{
								values: {...},
								child_table_1: {...}
							...

	UPDATE data come in as 
	{
		table_1: [
			{field_1: value_1, field_2: value_2},
			{field_1: value_1, field_2: value_2}
			...
		],
		table_2: [
			...
		]
	}
	"""
	request_data = json.loads(request.form['data'])
	foreign_columns = request_data.get('foreign_columns') or {}
	year = request_data.get('year')

	# For inserts, map the HTML element IDs to database IDs
	inserted_rows = {}
	
	# For collecting filenames from INSERTS to save files later
	attachments = {}

	# Helper function to recursively create inserts
	def walk_inserts(data, parent_row):
		# data should be dictionary with items as {table_name: [values]}
		for table_name, table_data_list in data.items():
			
			# Get the ORM class factory
			table = tables[table_name]
			
			# Loop through each list item, which is a dictionary of {field: value}
			for table_data in table_data_list:
				html_id = table_data.get('html_id')
				
				values = table_data.get('values')
				if not values:
					continue
				
				if table_name == 'expedition_members' and not 'permit_number' in values:
					if not year:
						raise ValueError('Year not specified in request data but permit number was not in insert data')
					values['permit_number'] = f'TKA-{str(year)[-2:]}-{get_next_permit_number(year)}'
				
				if table_name == 'attachments':
					filename = values.get('client_filename')
					if not filename:
						raise ValueError(f'Filename not specified in request data for #{html_id}')
					attachments[filename] = html_id

				# Create the row
				child_row = table(**values)
				
				# Add to the parent, which will relate the records by the appropriate IDs
				#	The automapped class factory automatically creates the relationship, 
				#	naming it <child_table_name>_collection
				getattr(parent_row, f'{table_name}_collection')\
					.append(child_row)

				# For now, just map the ID to ORM class instance. Once the data are inserted,
				#	the database ID will automatically be set
				inserted_rows[html_id] = child_row

				# recurse through the tree
				walk_inserts(table_data.get('children') or {}, child_row)


	with WriteSession() as session, session.begin():

		# Loop through each parent table at the root of the inserts dicitionary
		#	and iterate successively through each child record
		inserts = request_data.get('inserts') or {}
		for root_table_name, root_data_list in inserts.items():
			for root_data in root_data_list:
				root_table = tables[root_table_name]
				values = root_data.get('values')
				root_id = root_data.get('id')
				# If there were values defined in the insert dict, 
				#	this is a new record that needs to be inserted
				if values:
					root_row = root_table(**values)
					session.add(root_row) # add as an INSERT
					html_id = root_data.get('html_id')
					if html_id:
						inserted_rows[html_id] = root_row

				# If there's an 'id' property, the parent already exists
				elif root_id:
					root_row = session.get(root_table, root_id)
				else:
					raise RuntimeError(f'No "values" or "id" in request for table "{root_table_name}"')

				children = root_data.get('children') or {}

				walk_inserts(children, root_row)

		# If files were sent in the request but no attachment information was, raise
		if len(attachments) == 0 and request.files:
			raise RuntimeError('A file was sent to server but there was no attachment information')
		
		# Save attachments to server
		for filename, html_id in attachments.items():
			# Save the file
			file_path = save_attachment_to_file(filename, request.files.get(filename))

			# Set the value of the ORM attachment 
			inserted_rows[html_id].file_path = file_path

		# Save an updates to existing records
		updates = request_data.get('updates') or {}
		for table_name, update_data_dict in updates.items():
			table = tables[table_name]
			for update_id, update_data in update_data_dict.items():
				session.query(table).where(table.id == update_id)\
					.update(update_data)

		# Send the changes to the DB. To get the foreign keys in the next *for* 
		#	block, the data have to be flushed. The IDs also have to be retrieved 
		# 	within the with/as block because the session has to still be active 
		session.flush()

		# Get the table name, HTML element ID, database ID, and foreign keys as a 
		#	dictionary for each INSERTed row
		html_ids = []
		for html_id, row in inserted_rows.items():
			table_name = row.__class__.__table__.name
			foreign_keys = {
				d['foreignTable']: getattr(row, d['column']) 
				for d 
				in foreign_columns.get(row.__class__.__table__.name) or []
			}
			html_ids.append({
				'table_name': table_name, 
				'html_id': html_id, 
				'db_id': row.id,
				'foreign_keys': foreign_keys
			})
		
	
	return {'data': html_ids}


@app.route('/flask/db/delete/by_id', methods=['POST'])
def delete_by_id():

	request_data = request.get_json()

	table_name = request_data.get('table_name')
	if not table_name:
		raise ValueError('table_name not specified in request data')

	ids = request_data.get('db_ids')
	if not ids:
		raise ValueError('"db_ids" not specified in request data')
	try:
		id_list = (
			# If it's a list, make sure they're all integers
			[int(i) for i in ids] 
			if isinstance(ids, list)
			else [int(ids)] # otherwise, just make it a list of length 1
		)
	except ValueError:
		raise ValueError('Invalid ID in id_list: ' + str(ids))

	table = tables.get(table_name)
	if not table:
		raise ValueError(f'The table "{table_name}" does not exist')

	returning = request_data.get('returning')

	# For collecting values that would be in RETURNING clauses.
	#	The dict is in the form { table_name: [{column: value}] }
	returned = {}

	# Execute deletes within a transaction so an error will ROLLBACK 
	#	any would-be successful deletes
	with WriteSession() as session, session.begin():
		for table_id in id_list:
			# Get the row by ID
			row = session.get(table, table_id)	
			# If a single ID was invalid, ROLLBACK the entire transaction
			if not row:
				raise RuntimeError(f'No {table_name} row with ID {table_id} found')
			
			if returning:
				if not table_name in returned:
					returned[table_name] = []
				returned[table_name].append(
					 {
					 	column_name: climberdb_utils.sanitize_query_value(getattr(row, column_name)) 
					 	for column_name in returning[table_name]
					 } 
				)
			session.delete(row)

	return jsonify({
		'data': returned
	})


def get_next_permit_number(year: int) -> str:
	"""
	Generate the next permit number for a given year. 
	"""
	sql = sqlatext(f'''
		SELECT 
		max(m.permit_number) AS max_permit 
		FROM {schema}.expedition_members m
		JOIN {schema}.expeditions e ON m.expedition_id=e.id
		WHERE 
			extract(year FROM planned_departure_date)=:full_year AND
			m.permit_number LIKE :permit_search_str
	''')
	with ReadSession() as session:
		cursor = session.execute(sql, {'full_year': year, 'permit_search_str': f'TKA-{str(year)[-2:]}-%'})
		row = cursor.first()
		if row:
			# Permit format: TKA-YY-####. Just return just the number + 1
			return str(int((row.max_permit or '0000').split('-')[-1]) + 1)
		else:
			raise RuntimeError('Failed to get next permit number')


@app.route('/flask/next_permit_number', methods=['POST'])
def request_next_permit_number():
	
	data = request.form
	if not 'year' in data:
		raise KeyError('Year not given in request data')
	else:
		year = int(data['year'])

	return get_next_permit_number()




def save_attachment_to_file(client_filename: str, uploaded_file: FileStorage) -> str:
	"""
	Save a file passed to the server
	"""
	client_basename, extension = os.path.splitext(client_filename)
	server_filename = str(uuid4()) + extension	
	file_path = os.path.join(get_content_dir('attachments'), server_filename)
	request.files[client_filename].save(file_path)

	return os.path.abspath(file_path)


@app.route('/flask/attachments/add_expedition_member_files', methods=['POST'])
def save_attachment():
	
	attachment_data = json.loads(request.form['attachment_data'])
	#engine = climberdb_utils.get_engine()
	failed_files = []
	attachment_ids = [] # return to set UI element .data() attributes
	with write_engine.connect() as conn:
		for filename, data in attachment_data.items():
			try:
				client_filename = data['client_filename']
				client_basename, extension = os.path.splitext(client_filename)
				server_filename = str(uuid4()) + extension	
				file_path = os.path.join(get_content_dir('attachments'), server_filename)
				data['file_path'] = os.path.abspath(file_path)
				request.files[client_filename].save(file_path)
				sorted_columns = sorted(data.keys())
				sql = f'''
					INSERT INTO {schema}.attachments ({','.join(sorted_columns)}) 
					VALUES ({','.join([':' + k for k in sorted_columns])})
					RETURNING id
				'''
				cursor = conn.execute(sqlatext(sql), data)
				result = cursor.first()
				attachment_ids.append({
					'id': result.id, 
					'expedition_member_id': data['expedition_member_id']
				})
			except Exception as e:
				failed_files.append({
					'filename': client_filename,
					'error': str(e),
					'attachment_data': data
				})

	return {'failed_files': failed_files, 'attachment_ids': attachment_ids}


@app.route('/flask/attachments/delete_expedition_member_file', methods=['POST'])
def delete_attachment():
	filename = os.path.basename(request.form['file_path'])
	file_path = os.path.join(get_content_dir('attachments'), filename)
	if (os.path.isfile(file_path)):
		os.remove(file_path) # requires modify permissions for server AD user
		return 'true'
	else:
		return 'false'


@app.route('/flask/merge_climbers', methods=['POST'])
def merge_climbers():
	"""
	Transfer all expedition_member records from one climber profile to another. There are many 
	duplicate climber records for the same person, so this endponit allows users to merge them 
	by replacing the climber_id of expedition_members records for one climber with another.
	The climber record that no longer has any associated expedition_member records can then 
	be safely deleted

	Request parameters:
	selected_climber_id - the numeric ID of the climber record that the user intends to maintained
	merge_climber_id - the numeric ID of the climber record that the user intends to merge with 
		the maintained climber record

	"""
	data = dict(request.form)
	
	if not 'selected_climber_id' in data:
		raise ValueError('selected_climber_id was not specified')
	if not 'merge_climber_id' in data:
		raise ValueError('selected_climber_id was not specified')
	
	engine = climberdb_utils.get_engine()
	with write_engine.connect() as conn:
		# First, update the expedition_member records for the climber to merge. To prevent duplicate 
		#	expedition member entries when someone tries to merge two climbers that are on at least
		#	one expedition together, filter out expeditions they both belong to. In practice, this 
		# 	shouldn't ever be the case but it is possible
		update_result = conn.execute(
			sqlatext('''
				UPDATE expedition_members 
				SET climber_id=:selected_climber_id 
				WHERE 
					climber_id=:merge_climber_id AND 
					expedition_id NOT IN (
						SELECT expedition_id FROM expedition_members WHERE climber_id=:selected_climber_id
					)
				RETURNING id'''),
			data
		)
		# expedition_member records have now been transferred so the climber record to merge
		#	can now be safely deleted
		delete_result = conn.execute(
			sqlatext('''DELETE FROM climbers WHERE id=:merge_climber_id RETURNING id'''),
			data
		)

	return {'update_result': [r._asdict() for r in update_result.fetchall()]}

#---------------- DB I/O ---------------------#


if __name__ == '__main__':

	app.run()#debug=True)
