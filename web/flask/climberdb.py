import os
import re
import traceback
import base64

import sqlalchemy
import bcrypt
import pandas as pd
import smtplib

from datetime import datetime

from flask import Flask, render_template, request, json, url_for
from flask_mail import Mail, Message

# Asynchronously load weasyprint because it takes forever and it will never need to be used immediately
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
			return True

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
	
	return json.dumps([request.url_root])


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

	data['logo_base64_string'] = 'data:image/jpg;base64,' + get_email_logo_base64()	
	data['button_url'] = f'''{request.url_root.strip('/')}/index.html?reset=true&id={data['user_id']}'''
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

	#TODO: set user status to inactive

	return 'true';

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

	# wait until the last moment to block for weasyprint to load
	wait_for_weasyprint()

	# return HTML as PDF binary data
	pdf_data = weasyprint.render_pdf(weasyprint.HTML(string=html))
	return pdf_data


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

	# render pdf
	wait_for_weasyprint()
	pdf_data = weasyprint.render_pdf(weasyprint.HTML(string=html))
	
	return pdf_data

#--------------- Reports ---------------------#


if __name__ == "__main__":

	app.run()#debug=True)
