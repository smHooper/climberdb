import os
import re
import traceback

import sqlalchemy
import bcrypt
import pandas as pd
import smtplib

from flask import Flask, render_template, request, json



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


# ---------- endpoints ------------------
# **for testing**
@app.route('/flask/hello', methods=['GET', 'POST'])
def hello():
	return json.dumps(request.form)


# Get username and role
@app.route('/flask/userInfo', methods=['POST'])
def get_user_info():
	
	username = ''
	try:
		username = re.sub(r'^.+\\', '', request.remote_user)
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
	data = request.json


# Validate user password
@app.route('/flask/checkPassword', methods=['POST'])
def check_password():
	# Get user input
	data = request.form
	user_input = data['clientPassword']
	username = data['username']
		
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
	is_valid = bcrypt.checkpw(user_input.encode('utf-8'), hashed_password)
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



if __name__ == "__main__":

	app.run()#debug=True)