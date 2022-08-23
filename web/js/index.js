
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
		});

		$('#hide-request-access-button').click(() => {
			$('.default-field').ariaHide(false);
			$('#sign-in-button').ariaHide(false);
			$('#retain-login-checkbox').closest('.field-container').ariaHide(false);
			$('#request-access-toggle-button-container button').ariaHide(false);

			$('.request-field, .request-access-button').ariaHide(true);
		})

		$('#password-input').keydown(e => {
			// if the user pressed enter, try to sign in
			if (e.which === 13) {
				this.signIn(e);
			} else {
				// otherwise, remove any indication of an invalid password
				$('#password-input').removeClass('invalid');
				$('.invalid-password-message').ariaHide(true);
			}
		});

		$('#sign-in-button').click(e => {
			this.signIn(e);
		});

	}
}