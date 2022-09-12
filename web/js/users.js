class ClimberDBUsers extends ClimberDB {
	
	constructor() {
		super();
		return this;
	}

	configureMainContent() {
		$('.main-content-wrapper').append(`
			<div id="main-table-wrapper">
				<table>
					<thead><tr>
						<th>First Name</th>
						<th>Last Name</th>
						<th>Username</th>
						<th>Role</th>
					</tr></thead>
					<tbody></tbody>
				</table>
			</div>
		`);

	}

	loadUserRoleCodes () {
		
	}

	loadUsers() {

		const userRoleOptions = this.userRoleCodes.map(([code, name]) => `<option value=${code}>${name}</option>`).join('\n')

		const sql = 'SELECT id, ad_username, first_name, last_name, user_role_code FROM users WHERE user_status_code = 2';
		this.queryDB(sql).done(queryResultString => {
			// No need to check result
			const result = $.parseJSON(queryResultString);
			const $tbody = $('#main-table-wrapper tbody');
			for (const row of result) {
				$tbody.append(`
					<tr data-table-id="${row.id}">
						<td><input id="input-first_name-${row.id}" class="input-field user-table-input" type="text" name="first_name" title="First Name" value="${row.first_name}"></td>
						<td><input id="input-last_name-${row.id}" class="input-field user-table-input" type="text" name="last_name" title="Last Name" value="${row.last_name}"></td>
						<td><input id="input-ad_username-${row.id}" class="input-field user-table-input" type="text" name="ad_useranme" title="Username" value="${row.ad_username}"></td>
						<td>
							<select id="input-user_role_code-${row.id}" class="input-field user-table-input" name="user_role_code" title="User role" value="${row.user_role_code}">
								${userRoleOptions}
							</select>
						</td>
					</tr>
				`);
			}
		})
	}

	init() {
		// Call super.init()
		this.showLoadingIndicator('init');
		var initDeferreds = super.init();
		
		this.configureMainContent();
		
		$.when(
			initDeferreds
		).always(() => {
			hideLoadingIndicator();
		});

		return initDeferreds;
	}
}