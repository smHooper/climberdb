
class ClimberDBIndex extends ClimberDB {


	signIn() {
		// Hide in case the user didn't enter anything and clicked the sign-in button
		$('.invalid-password-message').ariaHide(true);

		const password = $('#password-input').val();
		if (password.length === 0) {
			$('#empty-password-message').ariaHide(false);
			$('#password-input').addClass('invalid')
				.val('')
				.focus();
			return;
		}

		this.verifyPassword(password)
			.done(isValid => {
				if (!isValid) {
					//showModal('Password incorrect', 'Incorrect password');
					$('#incorrect-password-message').ariaHide(false);
					$('#password-input').addClass('invalid')
						.val('')
						.focus();
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


	init() {

		
		// If the user was bounced back to the sign-in page after trying to visit another page, 
		//	the URL should have a query with the "referer" parameter set
		if (window.location.search.length) {
			const params = this.parseURLQueryString();
			if ('referer' in params) {
				$('#sign-in-button').data('target', encodeURI(params.referer));
			}
		}

		$.when(...super.init({addMenu: false}))
			.done(resultString => {
				// If the user logged in before and their session is still active, go to the home page
				const username = this.userInfo.ad_username;
				if (this.loginInfo[username]) {
					if (this.loginInfo[username].expiration > new Date().getTime()) {
						window.location.href = 'dashboard.html';
					}
				} 
				if (Object.keys(this.userInfo).length) {
					$('#username-input').val(this.userInfo.ad_username);
					$('#password-input').focus();
					//$('#request-access-toggle-button-container').ariaHide(true);
				}
			}); 

		// Show the "request access" fields when the button is clicked
		$('#request-access-toggle-button-container button').click((e) => {
			$('.default-field').ariaHide(true);
			$('#sign-in-button').ariaHide(true);
			$('#retain-login-checkbox').closest('.field-container').ariaHide(true);
			$(e.target).ariaHide(true);

			$('.request-field, .request-access-button').ariaHide(false);

			// Always hide error messages
			$('.invalid-input-message').ariaHide(true);
			$('.invalid').removeClass('invalid');
		});

		// Hide request access stuff when someone clicks the back-to-sign-in button
		$('#hide-request-access-button').click(() => {
			$('.default-field').ariaHide(false);
			$('#sign-in-button').ariaHide(false);
			$('#retain-login-checkbox').closest('.field-container').ariaHide(false);
			$('#request-access-toggle-button-container button').ariaHide(false);

			$('.request-field, .request-access-button').ariaHide(true);

			// Always hide error messages
			$('.invalid-input-message').ariaHide(true);
			$('.invalid').removeClass('invalid');
		})

		// Send email to admins when someone requests access
		$('#request-access-button').click(() => {
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
				url: 'flask/accountRequest',
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
		});


		$('.has-invalid-message').keydown(e => {
			// For the password input, if the user pressed the enter key, sign in
			if (e.which === 13 && $(e.target).is('#password-input')) {
				this.signIn(e);
			// otherwise, remove any indication of an invalid input
			} else {
				$('#password-input').removeClass('invalid');
				$(`.invalid-input-message[for="${e.target.id}"]`).ariaHide(true);
			}
		});

		$('#sign-in-button').click(e => {
			this.signIn(e);
		});

	}
}