class ClimberDBUsers extends ClimberDB {
	
	constructor() {
		super();
		this.userRoleOptions = '';
		this.noLoginRoleOptions = '';
		this.userStatusOptions = '';
		this.users = {};
		return this;
	}

	configureMainContent() {

		// Add delegated event handlers to handle events on newly created elements
		// Toggle edits when a user either clicks the edit button for a row or double-clicks it
		$(document).on('click', '.edit-button', e => {
			this.onEditButtonClick(e);
		});
		$(document).on('dblclick', '#main-data-table tbody tr', e => {
			this.onEditButtonClick(e);
		});

		$(document).on('click', '.save-button', e => {
			this.saveEdits();
		});

		$(document).on('click', '.reset-password-button', e => {
			this.onResetPasswordButtonClick();
		})

		$(document).on('change', '.input-field', e => {
			this.onInputChange(e);
		})
		
		$(document).on('change', '.input-field[name="ad_username"]', e => {
			this.onUsernameChange(e);
		});

		$(document).on('change', '.input-field[name=user_status_code]', e => {
			const $select = $(e.target);
			const $tr = $select.closest('tr');
			$tr.toggleClass('inactive', $select.val() != 2);
		});

		$(document).on('change', '[name=first_name],[name=last_name]', e => {
			this.onFirstLastNameChange(e);
		});

		$('.add-user-button').click(e => {
			this.onAddUserRowButtonClick(e)
		});

		$(document).on('click', '.delete-button', e => {
			this.onDeleteButtonClick(e);
		})
	}

	/*
	Helper method to disable all editing. Need to be able to do this in toggleEditing() 
	and onAddNewUserButtonClick()
	*/
	disableAllEditing() {
		// make all rows uneditable at first
		$('.climberdb-data-table tbody tr')
			.addClass('uneditable')
			// turn off tab-ability for inputs and buttons in all other rows
			.find('.input-field, .icon-button:not(.edit-button)')
				.attr('tabindex', -1);
	}


	toggleEditing($tr, {allowEdits=null}={}) {

		if (allowEdits === null) {
			allowEdits = $tr.hasClass('uneditable');
		}

		this.disableAllEditing();

		// toggle editability for this row
		const $inputs = $tr.toggleClass('uneditable', !allowEdits)
			// toggle tab-ability for inputs and buttons
			.find('td:not(.uneditable) .input-field, .icon-button:not(.edit-button)')
				.attr('tabindex', allowEdits ? 0 : -1); //!allowEdits - allowEdits
		// focus on first input so it's easy to tab through them
		if (allowEdits) $inputs.first().focus();
	}

	/*
	Event handler for edit button and row double-click
	*/
	onEditButtonClick(e) {
		
		const $tr = $(e.target).closest('tr');
		const userID = $tr.data('table-id');
		const allowEdits = $tr.hasClass('uneditable');

		if ($('.input-field.dirty').length) {
			this.confirmSaveEdits({
				afterActionCallbackStr: `climberDB.toggleEditing( $('tr[data-table-id=${userID}]'), ${allowEdits})`}
			);
		} else {
			this.toggleEditing($tr, allowEdits);
		}
	}


	/* 
	Add the .dirty class when an input changes. Remove it if the value has been reverted back to the 
	original database value
	*/
	onInputChange(e) {
		const $input = $(e.target);
		const $tr = $input.closest('tr');
		const userID = $tr.data('table-id');
		var isDirty = true;
		// If this is a new user, so any changes have to make the input dirty
		if (!$tr.is('.new-user')) {
			const fieldName = $input.attr('name');
			const dbValue = this.users[userID][fieldName];
			isDirty = dbValue != $input.val();
		}
		$input.toggleClass('dirty', isDirty);
	}


	/* 
	When the username changes check if the user already exists. If so, show and 
	re-enable the existing user. Only a newly created user's username can be edited so no 
	need to check if the username will be duplicated for an existing user
	*/
	onUsernameChange(e) {
		const $input = $(e.target);
		const username = $input.val();
		const matchedUsers = Object.values(this.users).filter(u => u.ad_username === username);
		if (matchedUsers.length) {
			const status = matchedUsers[0].user_status_code;
			const matchedUserID = matchedUsers[0].id;
			var message = `The user ${username} already exists `
			var footerButtons = '';
			if (status == -1) {
				message += `but the account is currently disabled. Would you like to enable it?`;
				//TODO: need to send password reset email to enabled user
				const onConfirmClick = `
					climberDB.discardEdits(); //remove new user
					const $tr = $('#main-data-table tbody tr[data-table-id=${matchedUserID}]');
					// set user status code to 'enabled' for matched user
					$tr.ariaHide(false)
						.removeClass('uneditable')
						.find('.input-field[name=user_status_code]')
							.val(2)
							.change();
				`;
				footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
					<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">Yes</button>
				`;
			} else {
				message += 'and each user must have a unique username that matches their Windows Active Directory username.'
				footerButtons = '';
			}
			
			showModal(message, 'Duplicate username', 'confirm', footerButtons);
		}
	}


	onFirstLastNameChange(e) {
		const $tr = $(e.target).closest('tr');
		const firstName = $tr.find('.input-field[name=first_name]').val();
		const lastName = $tr.find('.input-field[name=last_name]').val();
		const matchedUsers = Object.values(this.users)
			.filter(u => u.first_name === firstName && u.last_name === lastName);
		var onConfirmClickHandler = () => {};
		
		if (matchedUsers.length) {
			const status = matchedUsers[0].user_status_code;
			const matchedUserID = matchedUsers[0].id;
			var message = `The user <strong>${firstName} ${lastName}</strong> already exists `
			var footerButtons = '';
			if (status == -1) {
				message += `but the account is currently disabled. Would you like to enable it?`;
				onConfirmClickHandler = () => {
					('#alert-modal .confirm-button').click(() => {
						this.discardEdits(); //remove new user
						const $tr = $(`.climberdb-data-table tbody tr[data-table-id=${matchedUserID}]`);
						// set user status code to 'enabled' for matched user
						// 	this will do nothing for non-login users since there is no status field
						$tr.ariaHide(false)
							.removeClass('uneditable')
							.find('.input-field[name=user_status_code]')
								.val(2)
								.change();
					});
				}

				footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
					<button class="generic-button modal-button primary-button close-modal confirm-button" data-dismiss="modal">Yes</button>
				`;
			} else {
				message += 'and each user must have a unique first and last name.'
				footerButtons = '';
			}
			
			showModal(message, 'Duplicate user', 'confirm', footerButtons, {eventHandlerCallable: onConfirmClickHandler});
		}
	}


	/*
	Helper method to add new row to the users table
	*/
	addUserRow({data={}}={}) {
		return $(`
			<tr class="uneditable" data-table-id="${data.id}">
				<td class="uneditable">
					<span>
						<input class="input-field user-table-input" type="text" name="ad_username" title="Username" placeholder="username" value="${data.ad_username}" autocomplete="__never" tabindex=-1>
				</span></td>
				<td>
					<span>
						<input class="input-field user-table-input" type="text" name="first_name" title="First Name" placeholder="First name" value="${data.first_name}" autocomplete="__never" tabindex=-1>
					</span>
				</td>
				<td>
					<span>
						<input class="input-field user-table-input" type="text" name="last_name" title="Last Name" placeholder="Last name" value="${data.last_name}" autocomplete="__never" tabindex=-1>
					</span>
				</td>
				<td>
					<span>
						<input class="input-field user-table-input" type="email" name="email_address" title="Email Address" placeholder="Email address" value="${data.email_address}" autocomplete="__never" tabindex=-1>
					</span>
				</td>
				<td>
					<span>
						<select class="input-field user-table-input" name="user_role_code" title="User role" tabindex=-1>
							${this.userRoleOptions}
						</select>
					</span>
				</td>
				<td>
					<span>
						<select class="input-field user-table-input" name="user_status_code" title="User status" tabindex=-1>
							${this.userStatusOptions}
						</select>
					</span>
				</td>
				<td class="no-border">
					<button class="icon-button edit-button slide-up-on-focus has-motion" title="Toggle editing" tabindex=0>
						<i class="fa fa-edit fa-lg"></i>
						<label class="icon-button-label ">edit</label>
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button save-button slide-up-on-focus has-motion" title="Save edits" tabindex=-1>
						<i class="fa fa-save fa-lg"></i>
						<label class="icon-button-label ">save</label>
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button reset-password-button slide-up-on-focus has-motion" title="Reset password" tabindex=-1>
						<i class="fa fa-key fa-lg"></i>
						<label class="icon-button-label ">reset password</label>
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button delete-button slide-up-on-focus has-motion" title="Disable user" tabindex=-1>
						<i class="fa fa-trash fa-lg"></i>
						<label class="icon-button-label ">delete</label>
					</button>
				</td>
			</tr>
		`).appendTo($('#main-table-wrapper tbody'));
	}

	addNoLoginRow({data={}}={}) {
		return $(`
			<tr class="uneditable" data-table-id="${data.id}">
				<td>
					<span>
						<input class="input-field user-table-input" type="text" name="first_name" title="First Name" placeholder="First name" value="${data.first_name}" autocomplete="__never" tabindex=-1>
					</span>
				</td>
				<td>
					<span>
						<input class="input-field user-table-input" type="text" name="last_name" title="Last Name" placeholder="Last name" value="${data.last_name}" autocomplete="__never" tabindex=-1>
					</span>
				</td>
				<td>
					<span>
						<select class="input-field user-table-input" name="user_role_code" title="User role" tabindex=-1>
							${this.noLoginRoleOptions}
						</select>
					</span>
				</td>
				<td class="no-border">
					<button class="icon-button edit-button slide-up-on-focus has-motion" title="Toggle editing" tabindex=0>
						<i class="fa fa-edit fa-lg"></i>
						<label class="icon-button-label ">edit</label>
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button save-button slide-up-on-focus has-motion" title="Save edits" tabindex=-1>
						<i class="fa fa-save fa-lg"></i>
						<label class="icon-button-label ">save</label>
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button delete-button slide-up-on-focus has-motion" title="Disable user" tabindex=-1>
						<i class="fa fa-trash fa-lg"></i>
						<label class="icon-button-label ">delete</label>
					</button>
				</td>
			</tr>
		`).appendTo($('#no-login-table-wrapper tbody'));
	}

	/*
	Add a row for a new user to the table. For now, an admin user has full control 
	(and responsibility) for entering all information correctly, including the 
	ad_username. I might want to move to an LDAP query and limiting the choices for 
	ad_username or maybe handle new user creation via emails
	*/
	addNewUserRow($table) {
		const $tr = $table.is('#main-data-table') ? this.addUserRow() : this.addNoLoginRow();
		$tr.addClass('new-user')
			.removeClass('uneditable')
			.find('td.uneditable')
				.removeClass('uneditable')
				.find('.input-field')
					.focus();
		// Set the value of regular inputs to null
		$tr.find('input.input-field')
			.val('')
			.attr('tabindex', 0)

		// set selects to be dirty so that even if they don't change, they'll be saved
		$tr.find('select.input-field')
			.change()
			.attr('tabindex', 0);

		return $tr;
	}


	/*
	Event handler for add new user button. 
	*/
	onAddUserRowButtonClick(e) {
		const $table = $($(e.target).closest('button').data('target'))
		// if there's already a new user, force the user to save or discard that one
		if ($table.find('.new-user').length) {
			showModal('You already created a new user. Either save those changes or delete that user before creating another one.', 'Save Error');
			return;
		}
		// If the user is currently editing
		if ($table.find('.input-field.dirty').length) {
			this.confirmSaveEdits({afterActionCallbackStr: 'climberDB.addNewUserRow()'})
		} else {
			// If the user is currently editing a row (but hasn't made any unsaved changes), 
			//	turn off editing before adding the new row
			this.disableAllEditing();
			const $tr = this.addNewUserRow($table);

			// Scroll to the new row if necessary
			$tr[0].scrollIntoView();
		}

	}


	saveEdits() {
		const $tr = $('tbody tr:not(.uneditable)');
		const $inputs = $tr.find('.input-field.dirty');

		if (!$inputs.length) {
			showModal('You have not yet made any edits to save.', 'No edits to save');
			return;
		}

		showLoadingIndicator('saveEdits');

		// Gather fields and values
		// var values = [], 
		// 	fields = [];
		// for (const el of $inputs) {
		// 	values.push(el.value);
		// 	fields.push(el.name);
		// }
		var values = Object.fromEntries(
			$inputs.map( (_, el) => [[el.name, this.getInputFieldValue($(el))]] ).get()
		)

		var userID = $tr.data('table-id');
		const isInsert = $tr.is('.new-user');
		var inserts = {},
			updates = {};
		if (isInsert) {
			inserts = {users: [{
				values: values,
				// since only one user can be selected at a time, it doesn't matter 
				//	what the html_id is as long as it's truthy
				html_id: 'a' 
			}]}
		} else {
			updates = {
				users: {[userID]: values}
			}
		}

		const formData = new FormData()
		formData.append('data', JSON.stringify({
			inserts: inserts,
			updates: updates
		}) )

		return $.post({
			url: '/flask/db/save',
			data: formData,
			contentType: false,
			processData: false
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				showModal(`An unexpected error occurred while saving data to the database. Make sure you're still connected to the NPS network and try again. <a href="mailto:${this.config.db_admin_email}">Contact your database adminstrator</a> if the problem persists. Full error: <br><br>${response}`, 'Unexpected error');
				return false;
			} else {

				$inputs.removeClass('dirty');
				$tr.addClass('uneditable');

				// update in-memory data
				const userInfo = (this.users[userID] = this.users[userID] || {});
				for (const [field, value] of Object.entries(values)) {
					userInfo[field = value;
				}

				if (isInsert) { 
					result = ( response.data || [] )[0]
					$tr.attr('data-table-id', (result || {}).db_id)
						.removeClass('new-user')
						
					// Send activation email for a new user
					if (!this.config.no_login_user_roles.includes(userInfo.user_role_code)) {


						const username = userInfo.ad_username;//$tr.find('.input-field[name="ad_username"]').val();
						const firstName = userInfo.first_name;//$tr.find('.input-field[name="first_name"]').val();
						const email = userInfo.email_address;//$tr.find('.input-field[name="email_address"]').val();
						const port = window.location.port;
						const activationURL = `${window.location.origin}/index.html?activation=true&id=${userID}`
							.replace(':' + port, ':4007'); // make sure the URL is for the prod. site

						// Send an activation email to the user 
						return $.post({
							url: 'flask/notifications/account_activation',
							data: {
								username: username,
								user_id: userID
							},
							cache: false
						}).done(resultString => {
							const pythonError = this.pythonReturnedError(resultString);
							if (pythonError !== false) {
								showModal(`Account activation email failed to send with the error:\n${pythonError.trim()}.\nYou can send the activation link directly to ${firstName}: <br><a href="${activationURL}">${activationURL}</a>`, 'Email Server Error')
							} else {
								showModal(`An activation email was successfully sent to ${email} with the activation link <a href="${activationURL}">${activationURL}</a>. The account will not be active until ${firstName} completes the activation process.`, 'Activation Email Sent')
							}
						}).fail((xhr, status, error) => { 
							showModal(`Account activation email failed to send with the error: ${error}. You can send the activation link directly to the user whose account you just created: <br><a href="${activationURL}">${activationURL}</a>`, 'Email Server Error')
						})
					}
				}
			}
		}).fail((xhr, status, error) => {
			showModal(`An unexpected error occurred while saving data to the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your <a href="mailto:${this.config.db_admin_email}">database adminstrator</a> if the problem persists.`, 'Unexpected error');
			// roll back in-memory data
		}).always(() => {
		 	climberDB.hideLoadingIndicator();
		});

	}

	discardEdits() {
		const $tr = $('tbody tr:not(.uneditable)');
		
		// If this is a new user, just remove it
		if ($tr.is('.new-user')) {
			$tr.remove();
			return;
		}

		const userID = $tr.data('table-id');
		const originalData = this.users[userID];
		for (const el of $tr.find('td:not(.uneditable) .input-field')) {
			const fieldName = el.name;
			el.value = originalData[fieldName];
		}

		$('.input-field.dirty').removeClass('dirty');
		$tr.addClass('uneditable');
	}

	/*
	Ask the user to confirm/discard edits
	*/
	confirmSaveEdits({afterActionCallbackStr='', afterCancelCallbackStr=''}={}) {
		//@param afterActionCallbackStr: string of code to be appended to html onclick attribute

		const onConfirmClick = `
			showLoadingIndicator('saveEdits');
			climberDB.saveEdits(); 
		`;
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal" onclick="${afterCancelCallbackStr}">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.discardEdits();${afterActionCallbackStr}">Discard</button>
			<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}${afterActionCallbackStr}">Save</button>
		`;

		showModal(
			`You have unsaved edits to this user. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this user.`,
			'Save edits?',
			'alert',
			footerButtons
		);
	}


	onDeleteButtonClick(e) {
		const $userRow = $(e.target).closest('tr');
		const $table = $userRow.closest('.climberdb-data-table');
		if ($userRow.is('.new-user')) { 
			// if it's a new user that hasn't been saved yet, 
			//	just remove it
			$userRow.fadeRemove();
		} else if ($table.is('#main-data-table')) {
			// Main data table users are only disabled, not deleted because user 
			//	IDs need to persist (mostly for ref. integrity in the briefings table)
			$userRow.find('.input-field[name=user_status_code]')
				.val(-1)
				.change();
				this.saveEdits();
		} else {
			// an already saved user in no-login table
			// update status to disabled in case there are any briefing records with this user assigned to it
			this.queryDB(`UPDATE users SET user_status_code=-1 WHERE id=${parseInt($userRow.data('table-id'))} RETURNING id`)
				.done(response => {
					if (this.queryReturnedError(response)) {
						showModal('Database Error', 'The user could not be disabled because the system encountered an unexpected error: ' + response)
					} else {
						$userRow.fadeRemove()
					}
				}).fail((xhr, status, error) => {
					showModal('Database Error', 'The user could not be disabled because the system encountered an unexpected error: ' + error)
				});
		}
	}


	/*
	Helper method to send a password reset email. This really just makes the modal html code more legible
	*/
	sendPasswordResetEmail(username, userID, email_address) {
		return $.post({
			url: 'flask/notifications/reset_password',
			data: {
				username: username,
				user_id: userID
			},
			cache: false
		}).done(resultString => {
			const pythonError = this.pythonReturnedError(resultString);
			if (pythonError !== false) {
				showModal(`Password reset email failed to send with the error:\n${pythonError.trim()}. Make sure you're still connected to the NPS network and try again. Contact your <a href="mailto:${this.config.db_admin_email}">database adminstrator</a> if the problem persists.`, 'Email Server Error')
			} else {
				showModal(`A password reset email was sent to ${email_address}. The user's account will be inactive until they change their password.`, 'Password reset email sent');
				$(`tr[data-table-id=${userID}]`).addClass('inactive')
					.find('.input-field[name=user_status_code]')
						// set status to "inactive" in the UI but don't worry about saving because it's already doen server-side
						.val(1) 
						//.change(); 
			}
		}).fail((xhr, status, error) => { 
			showModal(`Password reset email failed to send with the error: ${error}. Make sure you're still connected to the NPS network and try again. Contact your <a href="mailto:${this.config.db_admin_email}">database adminstrator</a> if the problem persists.`, 'Email Server Error')
		});
	}


	/*
	Send a password reset email when the user confirms the choice to do so
	*/
	onResetPasswordButtonClick() {

		const $tr = $('tbody tr:not(.uneditable)');
		if ($tr.is('.new-user')) {
			showModal('This is a new user so their password does not need to be reset. To send an activation email to the user, click the "Save" button', 'Invalid action');
			return;
		}

		const firstName = $tr.find('.input-field[name="first_name"]').val();
		const lastName = $tr.find('.input-field[name="last_name"]').val();
		const username = $tr.find('.input-field[name="ad_username"]').val();
		const email_address = $tr.find('.input-field[name="email_address"]').val();
		const userID = $tr.data('table-id');

		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button primary-button close-modal confirm-button" data-dismiss="modal">Yes</button>
		`;
		const onConfirmClick = () => {$('#alert-modal .confirm-button').click(() => {
			this.sendPasswordResetEmail(username, userID, email_address)
		})}
		showModal(`Are you sure want to reset ${firstName}'s password? If you click 'Yes', ${firstName} will receive an email at ${email_address} with a link to reset their password, but their account will be suspended until they reset it.`, 'Send password reset email?', 'confirm', footerButtons, {eventHandlerCallable: onConfirmClick});
	}


	loadSelectOptions() {
		return [
			this.queryDBPython({
				where: { user_role_codes: [{column_name: 'code', operator: 'NOT IN', comparand: this.config.no_login_user_roles}] },
				orderBy: [{table_name: 'user_role_codes', column_name: 'sort_order'}]
			}).done(response => {
				// No need to check result
				const codes = response.data || [];
				this.userRoleOptions = codes.map(({code, name}) => `<option value=${code}>${name}</option>`).join('\n');
			}),
			this.queryDBPython({
				where: { user_role_codes: [{column_name: 'code', operator: 'IN', comparand: this.config.no_login_user_roles}] },
				orderBy: [{table_name: 'user_role_codes', column_name: 'sort_order'}]
			}).done(response => {
				// No need to check result
				const codes = response.data || [];
				this.noLoginRoleOptions = codes.map(({code, name}) => `<option value=${code}>${name}</option>`).join('\n');
			}),
			this.queryDBPython({
				tables: ['user_status_codes'], 
				orderBy: [{table_name: 'user_status_codes', column_name: 'sort_order'}]
			}).done(response => {
				// No need to check result
				const codes = response.data || [];
				this.userStatusOptions = codes.map(({code, name}) => `<option value=${code}>${name}</option>`).join('\n');
			})
		]

	}


	loadUsers() {

		const sql = `
			SELECT 
				id, 
				ad_username, 
				first_name, 
				last_name, 
				email_address,
				user_role_code,
				user_status_code 
			FROM ${this.dbSchema}.users 
			ORDER BY 
				user_status_code DESC,
				first_name, 
				last_name
		`;
		return this.queryDBPython({
			selects: {
				users: [
					'id', 
					'ad_username', 
					'first_name', 
					'last_name', 
					'email_address',
					'user_role_code',
					'user_status_code'
				]
			},
			orderBy: [
				{table_name: 'users', column_name: 'user_status_code', order: 'desc'},
				{table_name: 'users', column_name: 'first_name'},
				{table_name: 'users', column_name: 'last_name'},
			]
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				showModal('An error occurred while loading users: <br><br>' + response, 'Unexpected Error');
				return false;
			}
			const result = response.data || [];
			const noLoginRoles = this.config.no_login_user_roles;
			for (const row of result) {
				// Save in-memory data for rolling back edits
				this.users[row.id] = {...row};
				const $tr = noLoginRoles.includes(parseInt(row.user_role_code)) ? 
					this.addNoLoginRow({data: row}) : 
					this.addUserRow({data: row});
				$tr.find('select[name="user_role_code"]')
					.val(row.user_role_code);
				$tr.find('select[name="user_status_code"]')
					.val(row.user_status_code);
				if (row.user_status_code == -1) $tr.ariaHide(true);
			}
			
		});
	}



	init() {
		// Call super.init()
		this.showLoadingIndicator('init');
		return super.init()
			.then(() => { 
				return this.checkUserRole()
			})
			// Only runs if checkUserRole returns a resolved promise
			.then(() => {
				this.configureMainContent();
				
				return $.when(...this.loadSelectOptions())
			})
			.then(() => {
				this.loadUsers();
			})
			.always(() => {
				hideLoadingIndicator();
			});
	}
}
