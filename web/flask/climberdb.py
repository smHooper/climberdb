import os
import re
import traceback
import base64
import secrets
import string
import shutil

import sqlalchemy
import bcrypt
import pandas as pd
import smtplib

from datetime import datetime

from flask import Flask, render_template, request, json, url_for
from flask_mail import Mail, Message

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


CONFIG_FILE = '//inpdenaterm01/climberdb/config/climberdb_config.json'


app = Flask(__name__)

# Error handling
@app.errorhandler(500)
def internal_server_error(error):
	return 'ERROR: Internal Server Error.\n' + traceback.format_exc()

# Load config
if not os.path.isfile(CONFIG_FILE):
	raise IOError(f'CONFIG_FILE does not exists: {CONFIG_FILE}')
if not app.config.from_file(CONFIG_FILE, load=json.load):
	raise IOError(f'Could not read CONFIG_FILE: {CONFIG_FILE}')


def connect_db():
	return sqlalchemy.create_engine(
		'postgresql://{username}:{password}@{host}:{port}/{db_name}'
			.format(**app.config['DB_PARAMS'])
	)


def get_config_from_db():
	engine = connect_db()
	db_config = {}		
	with engine.connect() as conn:
		cursor = conn.execute('TABLE config');
	for row in cursor:
		app.config[row['property']] = (
			float(row['value']) if row['data_type'] == 'float' else  
			int(row['value']) if row['data_type'] == 'integer' else
			row['value']
		)
get_config_from_db()


def get_exports_dir():
	return os.path.join(os.path.dirname(__file__), '..', 'exports')


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
	engine = connect_db()
	hashed_password = ''
	with engine.connect() as conn:
		cursor = conn.execute(f'''SELECT hashed_password FROM users WHERE ad_username='{username}';''')
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
	
	return os.getlogin()


# -------------- User Management ---------------- #
# Get username and role
@app.route('/flask/userInfo', methods=['POST'])
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

	sql = f'''SELECT id, '{username}' AS ad_username, user_role_code, user_status_code, first_name, last_name FROM users WHERE ad_username='{username}' '''
	
	# If this is a production, make sure the user is a super user
	if not '\\prod\\' in os.path.abspath(__file__):
		sql += ' AND user_role_code=4' 

	
	engine = connect_db()
	user_info = pd.read_sql(sql, engine)
	if len(user_info) == 0:
		return json.dumps({'ad_username': username, 'user_role_code': None, 'user_status_code': None})
	else:
		# Rather than {column: {row_index: val}}, transform result to {row_index: {column: value}}
		return user_info.T.to_dict()[0]


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
	engine = connect_db()
	engine.execute(f'''UPDATE users SET hashed_password='{hashed_password.decode()}', user_status_code=2 WHERE ad_username='{username}';''')

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
# This endpoint sends an activation notification to a user whose account was just created by an admin
@app.route('/flask/notifications/accountActivation', methods=['POST'])
def send_account_request():
	data = dict(request.form)

	data['logo_base64_string'] = 'data:image/jpg;base64,' + get_email_logo_base64()	
	data['button_url'] = f'''{request.url_root.strip('/')}/index.html?activation=true&id={data['user_id']}'''
	data['button_text'] = 'Activate Account'
	data['heading_title'] = 'Activate your Denali Climbing Permit Portal account'

	html = render_template('email_notification_activation.html', **data)

	mailer = Mail(app)
	msg = Message(
		subject=data['heading_title'],
		recipients=[data['username'] + '@nps.gov'],
		html=html,
		reply_to=app.config['db_admin_email']
	)
	mailer.send(msg)

	return 'true';

# reset password
# This endpoint sends a password reset email to a user
@app.route('/flask/notifications/resetPassword', methods=['POST'])
def send_reset_password_request():
	data = dict(request.form)

	user_id = data['user_id']
	data['logo_base64_string'] = 'data:image/jpg;base64,' + get_email_logo_base64()	
	data['button_url'] = f'''{request.url_root.strip('/').replace(':9006', ':9007')}/index.html?reset=true&id={user_id}'''
	data['button_text'] = 'Reset Password'
	data['heading_title'] = 'Reset Denali Climbing Permit Portal account password'

	html = render_template('email_notification_reset_password.html', **data)
		
	mailer = Mail(app)
	msg = Message(
		subject=data['heading_title'],
		recipients=[data['username'] + '@nps.gov'],
		html=html,
		reply_to=app.config['db_admin_email']
	)
	mailer.send(msg)

	engine = connect_db()
	try:
		engine.execute(f'UPDATE users SET user_status_code=1 WHERE id={user_id}')
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
	pdf_path = os.path.join(get_exports_dir(), pdf_filename)
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
	pdf_path = os.path.join(get_exports_dir(), pdf_filename)
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
	pdf_path = os.path.join(get_exports_dir(), pdf_filename)
	html.write_pdf(pdf_path)

	return 'exports/' + pdf_filename #pdf_data


@app.route('/flask/reports/transaction_history/<expedition_id>', methods=['POST'])
def get_transaction_history_html(expedition_id):
	data = dict(request.form)

	data['transaction_history'] = json.loads(data['transaction_history']);

	# Get HTML string
	return render_template('transaction_history.html', **data)



# Default 
def write_query_to_excel(query_data, query_name, excel_path, excel_start_row=0, write_columns=True):

	# Write to the excel file
	with pd.ExcelWriter(excel_path, engine='openpyxl', mode='a', if_sheet_exists='overlay') as writer:
		query_data.to_excel(writer, startrow=excel_start_row, header=write_columns, index=False)


# Handle guide_company_client_status and guide_company_briefings queries
def write_guided_company_query_to_excel(client_status, briefings, excel_path, title_text):

	with pd.ExcelWriter(excel_path, engine='openpyxl', mode='a', if_sheet_exists='overlay') as writer:
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

	# with open(os.path.join(get_exports_dir(), 'export_data.json'), 'w') as f:
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
		excel_path = os.path.join(get_exports_dir(), excel_filename)
		excel_template_path = os.path.join(os.path.dirname(__file__), 'templates', f'{query_name}.xlsx')
		if os.path.isfile(excel_template_path):
			shutil.copy(excel_template_path, excel_path)
		# If not, just write the file without using a template and return
		else:
			# maybe set up a default file
			query_data = pd.DataFrame(data['query_data']).reindex(columns=data['columns'])
			query_data.to_excel(excel_path, index=False)
			return 'exports/' + excel_filename

		if query_name == 'guide_company_client_status' or query_name == 'guide_company_briefings':
			query_data = data['query_data']
			client_status = pd.DataFrame(query_data['client_status']).reindex(columns=data['client_status_columns'])
			briefings = pd.DataFrame(query_data['briefings']).reindex(columns=data['briefing_columns'])
			write_guided_company_query_to_excel(
				client_status, 
				briefings, 
				excel_path,
				data['title_text']
			)
		else:
			query_data = pd.DataFrame(data['query_data']).reindex(data['columns'])
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
		pdf_path = os.path.join(get_exports_dir(), pdf_filename)
		html.write_pdf(pdf_path)

		return 'exports/' + pdf_filename

#--------------- Reports ---------------------#


#-------------- cache tags -------------------#
# Write data to Label Matrix source Excel file
@app.route('/flask/cache_tags/write_label_matrix', methods=['POST'])
def write_to_label_matrix():
	
	data = pd.DataFrame([dict(request.form)])
	label_matrix_source = app.config['LABEL_MATRIX_SOURCE']
	source_path = os.path.join(os.path.dirname(__file__), 'assets', label_matrix_source)
	data.to_csv(source_path, index=False)

	return 'true'

#-------------- cache tags -------------------#


if __name__ == '__main__':

	app.run()#debug=True)
