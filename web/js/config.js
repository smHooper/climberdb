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

		// make CUA guide company name field revertable in case the user wants to discard edits
		$(document).on('focus', '.cua-table-input', e => {
			const $el = $(e.target);
			const originalValue = $el.data('current-value');
			// if it's already set, don't reset it
			if (!originalValue) $el.data('current-value', $el.val());
		});

		$('#add-cua-holder-button').click(() => {
			this.onAddCUACompanyClick();
		});

		$('#save-button').click(() => {this.saveEdits()});

		$(document).on('click', '.cua-edit-button', e => {
			this.onEditCUARowButtonClick(e)
		});
		$(document).on('dblclick', '#cua-holder-table tbody tr.uneditable', e => {
			this.onEditCUARowButtonClick(e);
		});
		$(document).on('click', '.cua-edit-button.delete-button', e => {
			this.onDeleteCUARowButtonClick(e)
		});
	}


	/* 
	Add the .dirty class when an input changes. Remove it if the value has been reverted back to the 
	original database value
	*/
	onInputChange(e) {
		const $input = $(e.target);
		// check if the value is different from the in-memory value
		let isDirty = false;
		if ($input.is('.config-table-input')) {
			isDirty = $input.val() != this.config[$input.data('table-id')].value;
		} else if ($input.is('.cua-table-input')) {
			isDirty = true;
		}
		$input.toggleClass('dirty', isDirty);
		$('#save-button').ariaTransparent($('.input-field.dirty').length);
	}


	disableAllCUAEditing() {
		// remove unsaved new row
		const $newRow = $('.new-cua-row').remove();

		$('#cua-holder-table tbody tr').addClass('uneditable')
		// turn off tab-ability for inputs and buttons in all other rows
		.find('.input-field, .icon-button:not(.edit-button)')
			.attr('tabindex', -1);
	}


	toggleCUARowEditing($tr, {allowEdits=null}={}) {

		if (allowEdits === null) {
			allowEdits = $tr.hasClass('uneditable');
		}

		this.disableAllCUAEditing();

		// toggle editability for this row
		const $input = $tr.toggleClass('uneditable', !allowEdits)
			.find('.input-field');

		// toggle tab-ability for inputs and buttons
		$([...$input, ...$('.icon-button:not(.edit-button)')])
				.attr('tabindex', allowEdits ? 0 : -1);
		// focus on first input so it's easy to tab through them
		if (allowEdits) $input.focus();
	}


	confirmSaveEdits($clickedRow, {confirmButtonCallback=()=>{}, discardButtonCallback=()=>{}}={}) {
		const eventHandler = () => {
			$('#alert-modal .cancel-button').click(() => {
				$('.cua-table-input.dirty').focus();
			});

			const allowEdits = $clickedRow.hasClass('uneditable');

			// call the modal button callback when discard/save button is clicked
			$('#alert-modal .discard-button').click(() => {
				const $editableRow = $('#cua-holder-table tbody tr:not(.uneditable)')
				this.revertInputValue($editableRow.find('.input-field'), {removeDirty: true})
				this.toggleCUARowEditing($clickedRow, allowEdits);
				discardButtonCallback();
			});
			// if it was the save button that was clicked, also save edits
			$('#alert-modal .confirm-button').click(() => {
				this.saveEdits();
				this.toggleCUARowEditing($clickedRow, allowEdits);
				confirmButtonCallback();
			});
		}

		const footerButtons = `
			<button class="generic-button modal-button cancel-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
			<button class="generic-button modal-button danger-button discard-button close-modal" data-dismiss="modal">Discard</button>
			<button class="generic-button modal-button primary-button confirm-button close-modal" data-dismiss="modal">Save</button>
		`;
		showModal(
			'You have unsaved edits. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing.',
			'Save edits?',
			'alert',
			footerButtons,
			{eventHandlerCallable: eventHandler}
		)
	}


	/*
	Event handler for edit button and row double-click
	*/
	onEditCUARowButtonClick(e) {
		
		const $tr = $(e.target).closest('tr');
		const allowEdits = $tr.hasClass('uneditable');

		if ($('.input-field.dirty').length) {
			this.confirmSaveEdits($tr);
		} else {
			// if the user created a new row but didn't edit it, remove it
			$('.new-cua-row').remove();
			this.toggleCUARowEditing($tr, allowEdits);
		}
	}


	/*
	Helper method to add new row to the config values table
	*/
	addConfigRow({data={}}={}) {
		return $(`
			<tr data-table-id="${data.id}">
				<td class="uneditable">
					<span>
						<label class="px-3 w-100 mb-0 text-left" for="input-field-${data.id}">${data.display_name}</label>
					</span>
				</td>
				<td class="config-value-cell">
					<span class="${data.data_type === 'money' ? 'money-field-container' : ''}">
						<input 
							id="input-field-${data.id}" 
							class="input-field config-table-input" 
							type="${this.inputTypes[data.data_type]}" 
							name="${data.property}" title="${data.display_name}" 
							placeholder="${data.display_name}" 
							data-table-id="${data.id}" 
							value="${data.value}" 
							autocomplete="off">
					</span>
				</td>
			</tr>
		`).appendTo($('#config-values-table tbody'));
	}


	addCUACompanyRow(name, id) {
		const $tbody = $('#cua-holder-table tbody');
		const nRows = $tbody.find('tr').length + 1;
		return $(`
			<tr class="uneditable" data-table-id="${id || ''}">
				<td>
					<span>
						<input 
							id="input-field-${id || ('new-' + nRows)}" 
							class="input-field cua-table-input uneditable" 
							type="text" data-table-id="${id || ''}" 
							value="${name || ''}" 
							data-current-value="${name || ''}"
							placeholder="Enter CUA guide company name">
					</span>
				</td>
				<td class="no-border edit-button-table-cell ">
					<button class="icon-button edit-button cua-edit-button slide-up-on-focus has-motion" title="Toggle editing" tabindex=0>
						<i class="fa fa-edit fa-lg"></i>
						<label class="icon-button-label ">edit</label>
					</button>
				</td>
				<td class="no-border edit-button-table-cell ">
					<button class="icon-button delete-button cua-edit-button slide-up-on-focus has-motion" title="Disable user" tabindex=-1>
						<i class="fa fa-trash fa-lg"></i>
						<label class="icon-button-label ">delete</label>
					</button>
				</td>
			</tr>
		`).appendTo($tbody);
	}


	saveEdits() {
		const $configInputs = $('.config-table-input.dirty');
		const $cuaInputs = $('.cua-table-input.dirty');

		if (![...$configInputs, ...$cuaInputs].length) {
			showModal('You have not yet made any edits to save.', 'No edits to save');
			return;
		}

		showLoadingIndicator('saveEdits');

		// Gather fields and values
		var configUpdates = {},
			cuaUpdates = {},
			cuaInserts = []
		;
		for (const el of $configInputs) {
			const inputValue = el.value;
			const id = $(el).data('table-id');
			configUpdates[id] = {value: inputValue};
		}

		// For CUA updates, the backend can process them like other tables.
		//	For CUA inserts, the backend has to look up the next code value
		//	if the CUA company name doesn't already exist in the table. It
		//	might already exist, however, if this CUA company was "deleted"
		//	before because clicking the delete button just disables that
		//	CUA company by setting the sort_order to null
		for (const el of $cuaInputs) {
			const $el = $(el);
			const inputValue = $el.val();
			if (inputValue == 'None') {
				hideLoadingIndicator();
				showModal(
					'The CUA company code option for "None" is always included by default.' +
					' Delete this row to save any other edits or additions.', 
					'Invalid CUA Company Name'
				);
				return;
			}
			const id = $el.data('table-id');
			if (!id) {
				cuaInserts.push({html_id: el.id, name: inputValue});
			} else {
				cuaUpdates[id] = {name: inputValue}
			}
		}

		var requestData = {
			config_updates: configUpdates,
			cua_updates: cuaUpdates,
			cua_inserts: cuaInserts
		}

		return $.post({
			url: '/flask/db/save/config',
			data: JSON.stringify(requestData),
			contentType: 'application/json'
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				showModal(`An unexpected error occurred while saving data to the database. Make sure you're still connected to the NPS network and try again. <a href="mailto:${this.config.db_admin_email}">Contact your database adminstrator</a> if the problem persists. Full error: <br><br>${response}`, 'Unexpected error');
			} else  {
				// update in-memory data
				for (const [id, {value}] of Object.entries(configUpdates)) {
					this.config[id].value = value;
				}

				// update the data-current-value attribute so we can compare any subsequent changes to this
				//	input's value and determine if the user actually changed the value
				for (const [id, {name}] of Object.entries(cuaUpdates)) {
					$cuaInputs.filter(`[data-table-id=${id}]`)
						.data('current-value', name);
				}
				// set table-id data value for inserts
				const inserts = response.data || [];
				for (const {html_id, id} of inserts) {
					const $input = $('#' + html_id);
					$input.attr('data-table-id', id)
						.data('current-value', $input.val())
						.closest('tr')
							.attr('data-table-id', id)
							.removeClass('new-cua-row');
				}

				$([...$configInputs, ...$cuaInputs]).removeClass('dirty');
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

		return this.queryDB({
			where: {'config': [{column_name: 'is_editable'}]}
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				showModal('An error occurred while retreiving configuration values: <br><br>' + response, 'Database Error');
			} else {
				const result = response.data || [];
				for (const row of result) {
					// Save in-memory data for rolling back edits
					this.config[row.id] = {...row};
					const $tr = this.addConfigRow({data: row});
				}
			}
		});
	}


	loadCUACompanies() {
		return this.queryDB({
			where: {cua_company_codes: [
				{column_name: 'code', operator: '<>', comparand: -1},
				{column_name: 'sort_order', operator: 'IS NOT', comparand: 'null'}
			]},
			orderBy: [{table_name: 'cua_company_codes', column_name: 'sort_order'}]
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				showModal('An error occurred while retreiving CUA Holders: <br><br>' + response, 'Database Error');
			} else {
				for (const {name, id} of response.data || []) {
					this.addCUACompanyRow(name, id);
				}
			}
		})
	}


	addNewCUACompanyRow() {
		const $row = this.addCUACompanyRow();
		$row.addClass('new-cua-row')
			.removeClass('uneditable')
			.find('.input-field')
				.focus();
	}


	onAddCUACompanyClick() {
		// If the user is already editing a row
		const $editableRow = $('tr:not(.uneditable)');
		const $newCUARow = $('.new-cua-row');
		if ($editableRow.length) { 
			if ($editableRow.is('.new-cua-row')) {
				// the user added a new row but didn't edit it yet
				$newCUARow.find('.input-field').focus();
			} else if ($editableRow.find('.cua-table-input.dirty').length ) {
				// confirm the edits if there are any
				this.confirmSaveEdits($(''), {
					discardButtonCallback: () => {this.addNewCUACompanyRow()},
					confirmButtonCallback: () => {this.addNewCUACompanyRow()}
				});
			} else {
				// if the user hasn't yet made edits, just disable edits and 
				//	add the row
				this.disableAllCUAEditing();
				this.addNewCUACompanyRow();
			}
		} else {
			// Otherwise, just add the row
			this.addNewCUACompanyRow();
		}
	}


	/*
	When the user clicks a delete CUA row button, disable that option rather than delete it. This is 
	to maintain referential intregrity for any legacy data that use the code for this option
	*/
	onDeleteCUARowButtonClick(e) {
		const $tr = $(e.target).closest('tr');

		if ($tr.is('.new-cua-row')) {
			// just remove a new row that hasn't yet been saved
			$tr.fadeRemove();
		} else {
			const companyName = $tr.find('.input-field').val();
			const message = `Are you sure you want to remove <strong>${companyName}</strong> as a CUA Guide Company option?`
			const footerButtons = `
				<button class="generic-button modal-button cancel-button secondary-button close-modal" data-dismiss="modal">No</button>
				<button class="generic-button modal-button confirm-button danger-button close-modal" data-dismiss="modal">Yes</button>
			`;
			const eventHandler = () => {
				const dbID = $tr.data('table-id');
				$('.confirm-button').click(() => {
					const formData = new FormData();
					formData.append('data', JSON.stringify({
						updates: {
							cua_company_codes: {
								[dbID]: {sort_order: null}
							}
						}
					}))
					$.post({
						url: '/flask/db/save',
						data: formData,
						contentType: false,
						processData: false
					}).done(response => {
						if (this.pythonReturnedError(response)) {
							const message = 
								'There was an error when removing the CUA Guide Company and the action' +
								' could not be completed. Try again and if the problem persists, contact your' +
								` <a href="mailto:${this.config.db_admin_email}">database adminstrator</a>.` +
								' Full error message:<br><br>' + response;
							showModal(message, 'Database Error');
						} else {
							$tr.fadeRemove();
						}
					})
				})
			}
			showModal(message, 'Remove CUA Guide Company', 'alert', footerButtons, {eventHandlerCallable: eventHandler});
		}
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
				this.loadConfig();
				this.loadCUACompanies();
			})
			.always(() => {
				hideLoadingIndicator();
			});

	}
}
