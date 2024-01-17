
class ClimberDBIndex extends ClimberDB {

	/*
	Show/hide different form components, i.e., for logging in, requesting access, 
	or activating an account
	*/
	toggleFormElements(selector) {
		// Hide everything that doesn't match the selector
		$('#sign-in-form-container, #sign-in-form-footer')
			.children(`:not(${selector})`)
				.ariaHide(true);

		// Show everything that does match
		$(selector).ariaHide(false);

		// Always hide error messages
		$('.invalid-input-message').ariaHide(true);
		$('.invalid').removeClass('invalid');
	}


	onPasswordVisibilityClick(e) {
		const $button = $(e.target).closest('button');
		const $icon = $button.find('i');

		// if the icon is just the fa-eye (not fa-eye-slash), then the password 
		//	is currently hidden and should be shown
		const showPassword = $icon.is('.fa-eye');
		
		// if a target is specified, use that. Otherwise just use the sibling .password-input
		const target = $button.data('target');
		(target ? $(target) : $button.siblings('.password-input'))
			.attr('type', showPassword ? 'text' : 'password');
		$icon
			.toggleClass('fa-eye', !showPassword)
			.toggleClass('fa-eye-slash', showPassword);
	}

	
	/*
	Helper method user in signIn() and onSetPasswordButtonClick()
	*/
	showInvalidPasswordMessage(selector) {
		$(selector).ariaHide(false);
		$('#password-input').addClass('invalid')
			.val('')
			.focus();
	}


	/*
	Verify that the password a user has entered is correct and log them in if so
	*/
	signIn() {
		// Hide in case the user didn't enter anything and clicked the sign-in button
		$('.invalid-password-message').ariaHide(true);

		const password = $('#password-input').val();
		if (password.length === 0) {
			this.showInvalidPasswordMessage('#empty-password-message');
			return;
		}

		this.verifyPassword(password)
			.done(isValid => {
				if (!isValid) {
					//showModal('Password incorrect', 'Incorrect password');
					this.showInvalidPasswordMessage('#incorrect-password-message');
				} else {
					const stayLoggedIn = $('#retain-login-checkbox').prop('checked');
					const expiration = (new Date()).getTime() + 
						(stayLoggedIn ? 
							(1000 * 60 * 60 * 24 * 7) : // lasts 7 days 
							(1000 * 60 * 60) // lasts 1 hour
						); 
					this.loginInfo = {username: this.userInfo.ad_username, expiration: expiration}
					window.localStorage.setItem('login', JSON.stringify(this.loginInfo));
					window.location.href = $('#sign-in-button').data('target');
				}
			});
	}

	/*
	Send an email to the user with a password reset link. The user has to confirm their username so that they're not accidentally sending a password reset link to someone else (i.e., if someone else is logged into the computer)
	*/
	onResetPasswordButtonClick() {
		const $input = $('#reset-password-confirm-username-input');
		const confirmedUsername = $input.val();
		// Check that the user filled in the username confirmation field
		if (confirmedUsername.length === 0) {
			$('#password-reset-empty-username-message').ariaHide(false);
			$input.addClass('invalid').focus();
			return;
		}
		// Check that the username matches the username pulled from the server
		if (confirmedUsername !== this.userInfo.ad_username) {
			$('#password-reset-invalid-username-message').ariaHide(false);
			$input.addClass('invalid').focus();
			return;
		}

		const $buttonContainer = $('#reset-password-button').parent();
		this.toggleDotLoadingIndicator($buttonContainer, {hide: false});

		return $.post({
			url: 'flask/notifications/reset_password',
			data: {
				username: this.userInfo.ad_username,
				user_id: this.userInfo.id
			},
			cache: false
		}).done(resultString => {
			const pythonError = this.pythonReturnedError(resultString);
			if (pythonError !== false) {
				showModal(`Password reset email failed to send with the error:\n${pythonError.trim()}. Make sure you're still connected to the NPS network and try again. Contact your <a href="mailto:${this.config.db_admin_email}">database adminstrator</a> if the problem persists.`, 'Email Server Error')
			} else {
				// show success message
				$('#sign-in-form-container > *:not(.email-success-message-container)').ariaHide();
				$('.email-success-message-container').ariaHide(false)
				$('#reset-password-success-message').ariaHide(false);
			}
		}).fail((xhr, status, error) => { 
			showModal(`Password reset email failed to send with the error: ${error}. Make sure you're still connected to the NPS network and try again. Contact your <a href="mailto:${this.config.db_admin_email}">database adminstrator</a> if the problem persists.`, 'Email Server Error')
		}).always(() => {this.toggleDotLoadingIndicator($buttonContainer, {hide: true})})
	}


	/*
	When a user requests access, send an email to an admin who manages accounts
	*/
	onRequestAccessButtonClick() {
		const username = $('#username-input').val();
		const firstName = $('#first-name-input').val();
		const lastName = $('#last-name-input').val();
		if (firstName.length === 0) {
			$('#empty-first-name-message').ariaHide(false);
			$('#first-name-input').addClass('invalid')
				.val('')
				.focus();
			return;
		}			
		if (lastName.length === 0) {
			$('#empty-last-name-message').ariaHide(false);
			$('#last-name-input').addClass('invalid')
				.val('')
				.focus();
			return;
		}

		showLoadingIndicator('requestAccess');

		$.post({
			url: 'flask/notifications/accountRequest',
			data: {
				username: username,
				first_name: firstName,
				last_name: lastName
			},
			cache: false
		}).done(response => {
			if (response === 'true') {
				$('#sign-in-form-container').ariaHide();
				$('#account-request-success-message').ariaHide(false);
			} else {
				showModal('There was a problem submitting your request. Check your network connection and try again.', 'Unexpected error');
			}
		}).fail((xhr, status, error) => {
			showModal(`There was a problem submitting your request: ${error}. Check your network connection and try again.`, 'Unexpected error');
		}).always(() => {
			hideLoadingIndicator()
		})
	}

	/*
	Helper method to show criteria with validated styling
	*/
	validatePassword($ul, value) {
		$ul.find('li[data-property="length"]').toggleClass('valid', value.length >= 8); // >= 8 characters
		$ul.find('li[data-property="letter"]').toggleClass('valid', !!value.match(/[a-zA-Z]/)); // has at least one letter
		$ul.find('li[data-property="number"]').toggleClass('valid', !!value.match(/\d/)); // at least one number
		$ul.find('li[data-property="special"]').toggleClass('valid', !!value.match(/[^\w\d\s]/)); // at least one special char
	}


	/*
	Set style classes for activation password criteria list to give realtime feedback to let a user know their password meets the necessary criteria
	*/
	onActivationPasswordFieldKeypress(e) {
		const value = $('#new-password-input').val() + e.key;
		const $ul = $('#password-criteria-list').addClass('validated');
		this.validatePassword($ul, value);
	}


	/*
	Keypress event only registers keystrokes that produce a character, so add event to handle deletes
	*/
	onActivationPasswordFieldKeyup(e) {
		if ((e.key === 'Backspace') || (e.key === 'Delete')) {
			const value = $('#new-password-input').val();
			const $ul = $('#password-criteria-list');

			// If the input will be blank, set all styling to the dfault list
			if (value.length === 0) {
				$ul.removeClass('validated')
					.find('li.valid')
						.removeClass('valid');
			} else {
				this.validatePassword($ul, value);
			}
		}
	}


	/*
	Helper function to toggle the 3 dot loading indicator
	*/
	toggleDotLoadingIndicator($parent, {hide=true}={}) {
		$parent.find('.loading-indicator-dot-container')
			.ariaHide(hide)
			.siblings()
				.ariaHide(!hide);
	}


	/*
	Set the user's password, either when activating or resetting it
	*/
	setPassword({verifyDifferentPassword=true}={}) {

		const $usernameInput = $('#confirm-username-input');
		const $passwordInput = $('#new-password-input');
		const $confirmInput = $('#new-password-confirm-input');
		const username = $usernameInput.val();
		const password = $passwordInput.val();
		const confirmationPassword = $confirmInput.val();

		// check that the username entered their username
		if (username !== this.userInfo.ad_username) {
			$('#invalid-username-message').ariaHide(false);
			$usernameInput.addClass('invalid')
				.focus();
			return;
		}		

		// check that the username matches the username retrieved from the server
		if (username !== this.userInfo.ad_username) {
			$('#invalid-username-message').ariaHide(false);
			$usernameInput.addClass('invalid')
				.focus();
			return;
		}

		// check that the first password field has been validated
		const $ul = $('#password-criteria-list');
		const allValid = $ul.find('li').length === $ul.find('li.valid').length;
		if (!password.length || !allValid) {
			$('#invalid-password-message').ariaHide(false);
			$passwordInput.addClass('invalid')
				.focus();
			return;
		} 
		
		const $buttonContainer = $('#set-password-button').parent();
		this.toggleDotLoadingIndicator($buttonContainer, {hide: false})
		const passwordIsSame = (verifyDifferentPassword ? this.verifyPassword(password) : $.Deferred().resolve(false))
		passwordIsSame.then(isSame => {
			if (isSame) {
				$('#same-password-message').ariaHide(false);
				$passwordInput.addClass('invalid')
					.focus();
				this.toggleDotLoadingIndicator($buttonContainer, {hide: true});
				return false;
			}
			if (!confirmationPassword.length || (password !== confirmationPassword)) {
				$('#incorrect-confirm-password-message').ariaHide(false);
				$confirmInput.addClass('invalid')
					.focus();
				this.toggleDotLoadingIndicator($buttonContainer, {hide: true});
				return false;
			}

			// set password
			$.post({
				url: 'flask/setPassword',
				data: {
					username: this.userInfo.ad_username,
					new_password: password,
					old_password: $('#old-password-input').val() || ''
				}
			}).done(resultString => {
				if (resultString === 'true') {
					// If a refererring link is given, go back to that page. Otherwise, 
					//	open the regular log-in page
					window.location.href = $('#set-password-button').data('target') || window.location.pathname;
				} else {
					showModal(`There was a problem setting your password. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Database Error');
				}
			}).fail((xhr, error, status) => {
				showModal(`An unexpected error occurred while saving data to the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			}).always(() => {this.toggleDotLoadingIndicator($buttonContainer, {hide: true});})
		})
	}


	onSetPasswordButtonClick() {
		const $passwordInput = $('#password-input');
		// If this is a password change: make sure the password entered for verification is valid
		if ($passwordInput.data('mode') === 'reset') {
			const password = $passwordInput.val();
			if (password.length === 0) {
				this.showInvalidPasswordMessage('#empty-password-message');
				return;
			}
			const $buttonContainer = $('#set-password-button').parent();
			this.toggleDotLoadingIndicator($buttonContainer, {hide: false});
			this.verifyPassword(password).done(isValid => {
				// If the password entered for verification is valid, try to set the new password
				if (isValid) {
					// Tell the user if the old and new passwords match
					if (password === $('#new-password-input').val()) {
						$('#same-password-message').ariaHide(false);
						$('#new-password-input').addClass('invalid')
							.focus();
						this.toggleDotLoadingIndicator($buttonContainer, {hide: true});
						return false;
					}
					this.setPassword({verifyDifferentPassword: false});
				
				// Otherwise let the user know the password is invalid 
				} else {
					this.showInvalidPasswordMessage('#incorrect-password-message');
					this.toggleDotLoadingIndicator($buttonContainer, {hide: true});
				}
			});
		} else {
			this.setPassword();
		}
	}


	showActivationErrorMessage(messageSelector) {

		$('.activation-element').not(messageSelector).remove();
		$('#activation-error-message-container').ariaHide(false);
		$(messageSelector).ariaHide(false);
	}


	showDisabledUserMessage(messageSelector) {

	}

	init() {

		// If the user was bounced back to the sign-in page after trying to visit another page, 
		//	the URL should have a query with the "referer" parameter set
		const $formContainer = $('#sign-in-form-container');
		const urlParams = this.parseURLQueryString();
		if ('referer' in urlParams) {
			$('#sign-in-button').data('target', encodeURI(urlParams.referer));
		}

		if ('testClientSecret' in urlParams) {
			let targetURL = new URL($('#sign-in-button').data('target'), window.location.origin);
			targetURL.searchParams.set('testClientSecret', urlParams.testClientSecret);
			$('#sign-in-button').data('target', targetURL.href);
		}


		const initDeferreds = super.init({addMenu: false});
		$.when(...initDeferreds)
			.done(resultString => {
				const username = this.userInfo.ad_username;
				const userStatus = this.userInfo.user_status_code;
				const userStatusCodes = this.constants.userStatusCodes;
				var isActivation = false;
				if ( ('activation' in urlParams) || ('reset' in urlParams) ) {

					// If somehow the id param isn't in the URL query, tell the user and exit 
					//	because no other initialization should occur
					if (!('id' in urlParams)) {
						this.showActivationErrorMessage('#bad-url-activation-message');
						return;
					}

					if ( ('reset' in urlParams) || ('changePassword' in urlParams) ) {
						$('#set-password-button')
							.text('reset password')
							.data('target', urlParams.referer || '');
						this.toggleFormElements('.reset-password-element')
					}

					if ('changePassword' in urlParams) {
						$('#password-input').attr('placeholder', 'Old password')
							.data('mode', 'reset')
							.siblings('.field-label')
								.text('Old password');
						$('#hide-reset-password-button').text('back to change password')
					}
					
					if (userStatus == userStatusCodes.inactive) {
						this.toggleFormElements('.activation-element' + ('changePassword' in urlParams ? ', .change-password-element' : '') );
						$formContainer.addClass('activation');
						isActivation = true;
					}

				}

				// If the user's account has been disabled, don't let them do anything else
				if (userStatus == userStatusCodes.disabled || (userStatus == userStatusCodes.inactive && !isActivation)) {
					$formContainer.addClass('activation')
						.children().not('#activation-error-message-container').remove();
					this.showActivationErrorMessage('#disabled-user-activation-message');
					return;
				}

				// If the user is activating a new account or resetting their passowrd, 
				//	check that the userID in the URL params matches the Windows username 
				//	retrieved from the server
				if (isActivation) {
					if (parseInt(urlParams.id) !== parseInt(this.userInfo.id)) {
						this.showActivationErrorMessage('#incorrect-user-activation-message');
						return;
					}
				} 

				// If the user logged in before and their session is still active, go to the home page
				else if (this.loginInfo[username]) {
					if (this.loginInfo[username].expiration > new Date().getTime()) {
						window.location.href = 'dashboard.html';
					}
				} 
				// Otherwise, just prepare the sign-in form 
				else if (Object.keys(this.userInfo).length) {
					$('#username-input').val(username);
					$('#password-input').focus();
					//$('#request-access-toggle-button-container').ariaHide(true);
				}
			}); 

		// Show the password reset form when the button is clicked
		$('#forgot-password-button').click(() => {
			this.toggleFormElements('.reset-password-element');
		});

		// Show the "request access" fields when the button is clicked
		$('#request-access-toggle-button-container button').click((e) => {
			this.toggleFormElements('.request-access-element');
		});

		// Hide request access stuff when someone clicks the back-to-sign-in button
		$('.back-to-sign-in-button').click(e => {
			this.toggleFormElements(
				window.location.search.match('changePassword') ? 
				'.activation-element, .change-password-element' : 
				'.login-element'
			);
		})

		// Send email to admins when someone requests access
		$('#request-access-button').click(() => {
			this.onRequestAccessButtonClick();
		});

		$('#reset-password-button').click(() => {
			this.onResetPasswordButtonClick()
		})

		$('.toggle-password-visibility-button').click(e => {
			this.onPasswordVisibilityClick(e);
		})

		$('.has-invalid-message').keyup(e => {
			// For the password input, if the user pressed the enter key, sign in
			if (e.which === 13 && $(e.target).is('#password-input')) {
				this.signIn(e);
			// otherwise, remove any indication of an invalid input
			} else {
				$('.password-input').removeClass('invalid');
				$('.invalid-input-message').ariaHide(true);
			}
		});

		// the username shouldn't be focusable
		$('#username-input').focus(e => {
			$('#password-input').focus();
		})

		$('#sign-in-button').click(e => {
			this.signIn(e);
		});

		$('#new-password-input')
			.keypress(e => {
				this.onActivationPasswordFieldKeypress(e);
			}).keyup(e => {
				this.onActivationPasswordFieldKeyup(e);
			});

		$('#set-password-button').click(() => {
			this.onSetPasswordButtonClick();
		})
	}
}