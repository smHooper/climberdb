import os
import re
import traceback

import sqlalchemy
import bcrypt
import pandas as pd
import smtplib

from datetime import datetime

from flask import Flask, render_template, request, json, url_for

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
def connect_db():
	return sqlalchemy.create_engine(
		'postgresql://{username}:{password}@{host}:{port}/{db_name}'
			.format(**app.config['DB_PARAMS'])
	)


def validate_password(username, password):	
	# Get user password from db
	engine = connect_db()
	hashed_password = ''
	with engine.connect() as conn:
		cursor = conn.execute(f'''SELECT hashed_password FROM users WHERE ad_username='{username}';''')
		result = cursor.first()
		if not result:
			raise ValueError(f'Password query failed because user {username} does not exist')
		hashed_password = result[0].encode('utf-8')
	if not hashed_password:
		raise RuntimeError('Could not connect to database')

	# Check password
	return bcrypt.checkpw(password.encode('utf-8'), hashed_password)


#---- global properties for all templates ----#
@app.context_processor
def get_global_properties():
    return {'current_date': datetime.now().strftime('%B %#d, %Y')}

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
	return json.dumps(request.form)


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

	sql = f'''SELECT '{username}' AS ad_username, user_role_code, user_status_code, first_name, last_name FROM users WHERE ad_username='{username}' '''
	engine = connect_db()
	user_info = pd.read_sql(sql, engine)
	if len(user_info) == 0:
		return json.dumps({'ad_user': username, 'user_role_code': None, 'user_status_code': None})
	else:
		# Rather than {column: {row_index: val}}, transform result to {row_index: {column: value}}
		return user_info.T.to_dict()[0]


# Set user password
@app.route('/flask/setPassword', methods=['POST'])
def set_password():
	data = request.form
	old_password = data['oldPassword']
	username = data['username']
	
	# If the user's old passord is wrong, return false
	if not validate_password(username, old_password):
		return 'false'

	# encrypt the new password
	new_password = data['newPassword']
	salt = bcrypt.gensalt()
	hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), salt)
	
	# Update db
	engine = connect_db()
	engine.execute(f'''UPDATE users SET hashed_password='{hashed_password.decode()}' WHERE ad_username='{username}';''')

	return 'true'


# check user password
@app.route('/flask/checkPassword', methods=['POST'])
def check_password():
	# Get user input
	data = request.form
	user_input = data['clientPassword']
	username = data['username']
	
	# Until I implemeent ORM-driven queries, a single-quote will screw up the SQL statements 
	if "'" in user_input:
		return 'false'

	# Check if the password is right
	is_valid = validate_password(username, user_input)

	return json.dumps(is_valid)


# Send account request email
@app.route('/flask/accountRequest', methods=['POST'])
def send_account_request():
	data = request.form
	username = data['username']
	first_name = data['first_name']
	last_name = data['last_name']

	message = f'''{first_name} {last_name} has requested a new DENA Climbing Permit Portal account. Click the button below to continue to the portal and create this account.'''

	return


#--------------- Reports ---------------------#
# test
@app.route('/flask/hello/', defaults={'name': 'World'})
@app.route('/flask/hello/<name>/')
def hello_html(name):
    return render_template('hello.html', name=name)

@app.route('/flask/hello_<name>.pdf')
def hello_pdf(name):
    # Make a PDF straight from HTML in a string.
    html = render_template('hello.html', name=name)
    return render_pdf(HTML(string=html))


@app.route('/flask/reports/confirmation_letter/<expedition_id>', methods=['GET', 'POST'])
def get_confirmation_letter_html(expedition_id):
	if request.method == 'GET':
		data = json.loads('''
			{"expedition_name":"Some expedition","leader_full_name":"Leader Name","planned_departure_date":"2022-1-1","total_payment":"300.00","total_climbers":"2", "something":"1", "climber_names":"[\\"Climber 1\\",\\"Climber 2\\"]","cancellation_fee":"100.00"}
					''')
	else:
		data = dict(request.form)
	# For some stupid reason, the array comes in as a single value, so I encode it as a 
	#	JSON string client side and it needs to be decoded here
	data['climber_names'] = json.loads(data['climber_names'])
	# Reformat date to be more human-readable
	data['planned_departure_date'] = datetime.strptime(
			data['planned_departure_date'], '%Y-%m-%d'
		).strftime('%B %#d, %Y')
	
	# Get HTML string
	return render_template('confirmation_letter.html', **data)


@app.route('/flask/reports/confirmation_letter/<expedition_id>.pdf', methods=['GET', 'POST'])
def get_confirmation_letter(expedition_id):
	#data = dict(request.form)
	
	if request.method == 'GET':
		data = json.loads('''
			{"expedition_name":"Some expedition","leader_full_name":"Leader Name","planned_departure_date":"2022-1-1","total_payment":"300.00","total_climbers":"5", "something":"1", "climber_names":"[\\"Climber 1\\",\\"Climber 2\\",\\"Climber 3\\",\\"Climber 4\\",\\"Climber 5\\",\\"Climber 5\\"]","cancellation_fee":"100.00"}
					''')
	else:
		data = dict(request.form)


	# For some stupid reason, the array comes in as a single value, so I encode it as a 
	#	JSON string client side and it needs to be decoded here
	data['climber_names'] = json.loads(data['climber_names'])
	# Reformat date to be more human-readable
	data['planned_departure_date'] = datetime.strptime(
			data['planned_departure_date'], '%Y-%m-%d'
		).strftime('%B %#d, %Y')
	
	# Get HTML string
	html = render_template('confirmation_letter.html', **data)

	# retunr HTML as PDF binary data
	wait_for_weasyprint()

	pdf_data = weasyprint.render_pdf(weasyprint.HTML(string=html))
	return pdf_data


if __name__ == "__main__":

	app.run()#debug=True)
