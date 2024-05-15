class ClimberDBConfig extends ClimberDB {
	
	constructor() {
		super();
		this.inputTypes = {
			integer: 'number',
			float: 'number',
			string: 'text',
			money: 'number'
		}

		return this;
	}

	configureMainContent() {

		$(document).on('change', '.input-field', e => {this.onInputChange(e)});

		$('#save-button').click(() => {this.saveEdits()});
	}


	/* 
	Add the .dirty class when an input changes. Remove it if the value has been reverted back to the 
	original database value
	*/
	onInputChange(e) {
		const $input = $(e.target);
		// check if the value is different from the in-memory value
		const isDirty = $input.val() != this.config[$input.data('table-id')].value;
		$input.toggleClass('dirty', isDirty);
		$('#save-button').ariaTransparent(!isDirty);
	}


	/*
	Helper method to add new row to the config values table
	*/
	addRow({data={}}={}) {
		return $(`
			<tr data-table-id="${data.id}">
				<td class="uneditable">
					<span>
						<label class="px-3 w-100 mb-0 text-left" for="input-field-${data.id}">${data.display_name}</label>
					</span>
				</td>
				<td class="config-value-cell">
					<span class="${data.data_type === 'money' ? 'money-field-container' : ''}">
						<input id="input-field-${data.id}" class="input-field user-table-input" type="${this.inputTypes[data.data_type]}" name="${data.property}" title="${data.display_name}" placeholder="${data.display_name}" data-table-id="${data.id}" value="${data.value}" autocomplete="off">
					</span>
				</td>
			</tr>
		`).appendTo($('#main-table-wrapper tbody'));
	}


	saveEdits() {
		const $inputs = $('.input-field.dirty');

		if (!$inputs.length) {
			showModal('You have not yet made any edits to save.', 'No edits to save');
			return;
		}

		showLoadingIndicator('saveEdits');

		// Gather fields and values
		var values = {},
			sqlParameters = [],
			sqlStatements = [];
		for (const el of $inputs) {
			const inputValue = el.value;
			const id = $(el).data('table-id');
			values[id] = inputValue
			sqlParameters.push([inputValue]);
			sqlStatements.push(`UPDATE config SET value=$1 WHERE id=${id} RETURNING id`);
		}

		return $.post({ 
			url: 'climberdb.php',
			data: {action: 'paramQuery', queryString: sqlStatements, params: sqlParameters},
			cache: false
		}).done(queryResultString => {
			if (this.queryReturnedError(queryResultString)) {
				showModal(`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			} else  {
				const result = $.parseJSON(queryResultString);

				// update in-memory data
				for (const {id} of result) {
					this.config[id].value = values[id];
				}

				$inputs.removeClass('dirty');
				$('#save-button').ariaTransparent();
			}
		}).fail((xhr, status, error) => {
			showModal(`An unexpected error occurred while saving data to the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your <a href="mailto:${this.config.db_admin_email}">database adminstrator</a> if the problem persists.`, 'Unexpected error');
			// roll back in-memory data
		}).always(() => {
		 	this.hideLoadingIndicator();
		});

	}


	loadConfig() {

		const sql = `SELECT * FROM config WHERE is_editable ORDER BY sort_order`;
		return this.queryDB(sql).done(queryResultString => {
			// No need to check result
			const result = $.parseJSON(queryResultString);
			for (const row of result) {
				// Save in-memory data for rolling back edits
				this.config[row.id] = {...row};
				const $tr = this.addRow({data: row});
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
				this.loadConfig();
			})
			.always(() => {
				hideLoadingIndicator();
			});

		return initDeferreds;
	}
}