class ClimberDBUsers extends ClimberDB {
	
	constructor() {
		super();
		this.userRoleOptions = '';
		this.userStatusOptions = '';
		this.users = {};
		return this;
	}

	configureMainContent() {
		$('.main-content-wrapper').append(`
			<div id="main-table-wrapper" class="climberdb-data-table-wrapper">
				<table id="main-data-table" class="climberdb-data-table">
					<thead>
						<tr>
							<th>Windows Username</th>
							<th>First Name</th>
							<th>Last Name</th>
							<th>Role</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
			<div class="d-flex justify-content-center pt-2">
				<button class="generic-button add-user-button" title="Add new user">Add new user</button>
			</div>
		`);

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
		})

		$('.add-user-button').click(() => {
			this.onaddUserRowButtonClick()
		});

	}

	/*
	Helper method to disable all editing. Need to be able to do this in toggleEditing() 
	and onAddNewUserButtonClick()
	*/
	disableAllEditing() {
		// make all rows uneditable at first
		$('#main-table-wrapper tbody tr')
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

			// If the edited user already exists, roll the username edits 
			// on second thought, I don't think it's possible for the user to be old
			/*const $tr = $input.closest('tr');
			if (!$tr.is('.new-user')) {
				const originalUserID = $tr.data('table-id');
				$input.val(this.users[originalUserID].ad_username)
			}*/
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
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button save-button slide-up-on-focus has-motion" title="Save edits" tabindex=-1>
						<i class="fa fa-save fa-lg"></i>
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button reset-password-button slide-up-on-focus has-motion" title="Reset password" tabindex=-1>
						<i class="fa fa-key fa-lg"></i>
					</button>
				</td>
				<td class="no-border">
					<button class="icon-button delete-button slide-up-on-focus has-motion" title="Disable user" tabindex=-1>
						<i class="fa fa-trash fa-lg"></i>
					</button>
				</td>
			</tr>
		`).appendTo($('#main-table-wrapper tbody'));
	}


	/*
	Add a row for a new user to the table. For now, an admin user has full control 
	(and responsibility) for entering all information correctly, including the 
	ad_username. I might want to move to an LDAP query and limiting the choices for 
	ad_username or maybe handle new user creation via emails
	*/
	addNewUserRow() {
		const $tr = this.addUserRow();
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
	}


	/*
	Event handler for add new user button. 
	*/
	onaddUserRowButtonClick() {
		// if there's already a new user, force the user to save or discard that one
		if ($('.new-user').length) {
			showModal('You already created a new user. Either save those changes or delete that user before creating another one.', 'Save Error');
			return;
		}
		// If the user is currently editing
		if ($('.input-field.dirty').length) {
			this.confirmSaveEdits({afterActionCallbackStr: 'climberDB.addNewUserRow()'})
		} else {
			// If the user is currently editing a row (but hasn't made any unsaved changes), 
			//	turn off editing before adding the new row
			this.disableAllEditing();
			this.addNewUserRow();
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
		var values = [], 
			fields = [];
		for (const el of $inputs) {
			values.push(el.value);
			fields.push(el.name);
		}

		var userID = $tr.data('table-id');
		const isInsert = $tr.is('.new-user');
		var sql;
		if (isInsert) {
			// insert
			sql = `INSERT INTO users (${fields.join(',')}) VALUES (${fields.map(f => '$' + (fields.indexOf(f) + 1))}) RETURNING id`;
		} else {
			// update
			sql = `UPDATE users SET ${fields.map(f => `${f}=$${fields.indexOf(f) + 1}`)} WHERE id=${userID}`;
		}

		return $.post({ 
			url: 'climberdb.php',
			data: {action: 'paramQuery', queryString: sql, params: values},
			cache: false
		}).done(queryResultString => {
			if (this.queryReturnedError(queryResultString)) {
				showModal(`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			} else  {
				const result = $.parseJSON(queryResultString)[0];

				if (isInsert) {
					userID = result.id;
					$tr.attr('data-table-id', userID)
						.removeClass('new-user')
						.addClass('uneditable');

					const username = $tr.find('.input-field[name="ad_username"]').val();
					const firstName = $tr.find('.input-field[name="first_name"]').val();
					const activationURL = `${window.location.origin}/index.html?activation=true&id=${userID}`
						.replace(':9006', ':9007'); // make sure the URL is for the prod. site

					// Send an activation email to the user 
					return $.post({
						url: 'flask/notifications/accountActivation',
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
							showModal(`An activation email was successfully sent to ${username}@nps.gov with the activation link <a href="${activationURL}">${activationURL}</a>. The account will not be active until ${firstName} completes the activation process.`, 'Activation Email Sent')
						}
					}).fail((xhr, status, error) => { 
						showModal(`Account activation email failed to send with the error: ${error}. You can send the activation link directly to the user whose account you just created: <br><a href="${activationURL}">${activationURL}</a>`, 'Email Server Error')
					})
				}
				$inputs.removeClass('dirty');

				// update in-memory data
				const userInfo = this.users[userID] || {};
				for (const i in values) {
					userInfo[fields[i]] = values[i];
				}
				// If this was an update, actually set the in-memory data
				if (!(userID in this.users)) {
					this.users[userID] = {...userInfo};
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
			`You have unsaved edits to this expedition. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this expedition.`,
			'Save edits?',
			'alert',
			footerButtons
		);
	}


	/*
	Helper method to send a password reset email. This really just makes the modal html code more legible
	*/
	sendPasswordResetEmail(username, userID) {
		return $.post({
			url: 'flask/notifications/resetPassword',
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
				showModal(`A password reset email was sent to ${username}@nps.gov. The user's account will be inactive until they change their password.`, 'Password reset email sent');
				$(`tr[data-table-id=${userID}]`).addClass('inactive')
					.find('.input-field[name=user_status_code]')
						.val(1) // set status to "inactive"
						.change(); 
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
		const userID = $tr.data('table-id');

		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="climberDB.sendPasswordResetEmail('${username}', '${userID}')">Yes</button>
		`;
		showModal(`Are you sure want to reset ${firstName}'s password? If you click 'Yes', ${firstName} will receive an email at ${username}@nps.gov with a link to reset their password, but their account will be suspended until they reset it.`, 'Send password reset email?', 'confirm', footerButtons);
	}


	loadSelectOptions() {
		return [
			this.queryDB('TABLE user_role_codes ORDER BY sort_order;').done(queryResultString => {
				// No need to check result
				const codes = $.parseJSON(queryResultString);
				this.userRoleOptions = codes.map(({code, name}) => `<option value=${code}>${name}</option>`).join('\n');
			}),
			this.queryDB('TABLE user_status_codes ORDER BY sort_order;').done(queryResultString => {
				// No need to check result
				const codes = $.parseJSON(queryResultString);
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
				user_role_code,
				user_status_code 
			FROM users 
			ORDER BY 
				user_status_code,
				first_name, 
				last_name
		`;
		return this.queryDB(sql).done(queryResultString => {
			// No need to check result
			const result = $.parseJSON(queryResultString);
			for (const row of result) {
				// Save in-memory data for rolling back edits
				this.users[row.id] = {...row};
				const $tr = this.addUserRow({data: row});
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
		var initDeferreds = $.when(...super.init())
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

		return initDeferreds;
	}
}