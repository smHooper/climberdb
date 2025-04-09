import json
import logging
from logging.config import dictConfig
import os

import climberdb_utils


class RequestLoggingFormatter(logging.Formatter):
	"""
	Configure a custom formatter to include request information
	"""
	def format(self, record):
		if has_request_context():
			record.url = request.url
			record.remote_addr = request.remote_addr
			record.user = request.remote_user
			record.request_data = (
				'**ommitted**' if request.url.endswith('checkPassword') else 
				json.dumps(request.form)
			)
		else:
			record.url = None
			record.remote_addr = None
			record.user = None
			record.request_data = None
		return super().format(record)


def configure_logging(app_name, log_dir):


	with open(climberdb_utils.CONFIG_FILE) as f:
		app_config = json.load(f)

	environment = climberdb_utils.get_environment()
	logging_config = {
		'version': 1,
		'formatters': {
			'default': {
				'datefmt': '%B %d, %Y %H:%M:%S %Z',
			},
		},
		'handlers': {
			# Configure a logger that will create a new file each day
			#	Only 100 logs will be saved before they oldest one is deleted
			'file': {
				'class': 'logging.handlers.TimedRotatingFileHandler',
				'filename': os.path.join(log_dir, 'flask.log'),
				'when': 'D',
				'interval': 1,
				'backupCount': 100,
				'formatter': 'default',
				'level': 'INFO'
			},
			# Logger for email notifications of Python errors
			'email': {
				'class': 	'logging.handlers.SMTPHandler',
				'level': 	'ERROR',
				'mailhost': app_config['MAIL_SERVER'],
				'fromaddr': f'ClimberDB Error Notifications <{app_name}.{environment}-notifications@nps.gov>',
				'toaddrs':	[app_config['DB_ADMIN_EMAIL']],
				'subject':	f'An error occurred with the {app_name} app'
			}
		},
		'root': {
			'level': 'INFO',
			'handlers': ['file', 'email'],
		}
	}

	dictConfig(logging_config)

	line_separator = '-' * 150 
	file_formatter = RequestLoggingFormatter(line_separator + 
	    '\n[%(asctime)s] %(user)s requested %(url)s from %(remote_addr)s\n' 
	    'with POST data %(request_data)s\n'
	    '%(levelname)s in %(module)s message:\n %(message)s\n' +
	    line_separator
	)

	email_formatter = RequestLoggingFormatter(
		'Time: %(asctime)s\n'
		'User: %(user)s\n'
		'URL: %(url)s\n'
		'Remote Address: %(remote_addr)s\n'
		'Logger name: %(name)s\n'
		'\n'
	)

	root_logger = logging.root
	root_logger.handlers[0].setFormatter(file_formatter) # file
	root_logger.handlers[1].setFormatter(email_formatter) # email

