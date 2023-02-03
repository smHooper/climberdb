class ClimberDBQuery extends ClimberDB {
	
	constructor() {
		super();
		this.routeCodes = {};
		this.mountainCodes = {};
		this.guideCompanies = {};
		this.result = [];
		this.ancillaryResult = []; // for things like briefings that go along with 
		this.queries = {
			guide_company_client_status: {
				tags: ['guide', 'guiding', 'accounting'],
				sql: 
					`
					SELECT DISTINCT
						expedition_id,
						expedition_name AS "Group Name",
						first_name AS "First Name",
						last_name AS "Last Name",
						CASE 
							WHEN codes.code IN (1, 2, 6) THEN codes.name ELSE 'Confirmed' 
						END AS "Reservation Status",
						
						CASE
							WHEN is_guiding THEN '-'
							WHEN climbing_fees.balance <= 0 THEN 'Yes'
							ELSE 'No'
						END AS "Climbing Fee Paid",
						
						CASE
							WHEN is_guiding THEN '-'
							WHEN entrance_fees.balance <= 0 THEN 'Yes'
							ELSE 'No'
						END AS "Entrance Fee Paid",
						
						CASE 
							WHEN is_guiding THEN '-' 
							WHEN application_complete THEN 'Yes' 
							ELSE 'No' 
						END AS "SUP Application Complete",

						CASE
							WHEN is_guiding THEN 'GUIDE'
							WHEN application_complete AND climbing_fees.balance <= 0 AND entrance_fees.balance <= 0 THEN 'COMPLETE'
							ELSE 'INCOMPLETE'
						END AS "Registration Complete"
					FROM expedition_info_view info 
						JOIN group_status_codes codes 
							ON info.reservation_status_code = codes.code   
						LEFT JOIN 
							(
								SELECT 
									expedition_member_id, 
									sum(transaction_value)::NUMERIC AS balance 
								FROM transactions 
								WHERE transaction_type_code IN (${this.constants.climbingFeeTransactionCodes}) 
								GROUP BY expedition_member_id 
							) climbing_fees 
							ON info.expedition_member_id = climbing_fees.expedition_member_id
						LEFT JOIN 
							(
								SELECT 
									expedition_member_id, 
									sum(transaction_value)::NUMERIC AS balance 
								FROM transactions 
								WHERE transaction_type_code IN (${this.constants.entranceFeeTransactionCodes}) 
								GROUP BY expedition_member_id 
							) entrance_fees ON info.expedition_member_id = entrance_fees.expedition_member_id
					WHERE 
						guide_company_code = {guide_company_code} AND 
						extract(year FROM planned_departure_date) = {year}
					ORDER BY 
						"Group Name",
						"Last Name",
						"First Name"
					`,
				columns: [
					'Group Name',
					'First Name',
					'Last Name',
					'SUP Application Complete',
					'Climbing Fee Paid',
					'Entrance Fee Paid',
					'Registration Complete',
				],
				hrefs: {
					'Group Name': 'expeditions.html?id={expedition_id}'
				}
			},
			guided_company_briefings: {
				tags: ['guide', 'guiding', 'briefing'],
				sql: 
					`
						SELECT
							briefings.id AS briefing_id,
							briefings.expedition_id,
							min(briefing_start::date) AS briefing_date,
							expedition_name AS "Group Name",
							min(to_char(briefing_start, 'FMMM/FMDD/YY')) AS "Briefing Date",
							min(to_char(briefing_start, 'FMHH12:MI')) AS "Briefing Time",
							count(*) AS "Number of Climbers"
						FROM briefings
							JOIN expeditions ON briefings.expedition_id = expeditions.id
							JOIN expedition_members ON expedition_members.expedition_id = expeditions.id
						WHERE
							guide_company_code = {guide_company_code} AND 
							extract(year FROM planned_departure_date) = {year}
						GROUP BY briefing_id, briefings.expedition_id, expedition_name
						ORDER BY expedition_name 
					`,
				columns: [
					'Group Name',
					'Briefing Date',
					'Briefing Time',
					'Number of Climbers'
				],
				hrefs: {
					'Group Name': 'expeditions.html?id={expedition_id}',
					'Briefing Date': 'briefings.html?date={briefing_date}&id={briefing_id}'
				}
			},
			count_per_guide_company: {
				tags: [],
				sql: 
					`	
						SELECT 
							coalesce(guide_company, 'All Expeditions') AS "Guide Company",
							*
						FROM (
							SELECT 
								guide_company,
								sum(within_peak) AS "Peak Season",
								count(*) - sum(within_peak) AS "Non-Peak",
								count(*) AS "Total"
							FROM (
								SELECT DISTINCT 
									{group_by_field},
									CASE guide_company_codes.name = 'None' THEN 'Independent' ELSE guide_company_codes.name AS guide_company,
									CASE
										WHEN extract(doy FROM planned_departure_date) BETWEEN 74 and 182  -- 3/15-7/1
											THEN 1
										ELSE 0
									END AS within_peak
								FROM expeditions
									JOIN expedition_members ON expeditions.id = expedition_members.expedition_id 
									JOIN expedition_member_routes on expedition_members.id = expedition_member_routes.expedition_member_id
									JOIN guide_company_codes ON expeditions.guide_company_code = guide_company_codes.code
									JOIN route_codes ON route_codes.code=expedition_member_routes.route_code
								WHERE 
									reservation_status_code <> 6 AND 
									group_status_code <> 6 AND 
									coalesce(special_group_type_code, 0) <> 3 AND -- NPS group
									coalesce(route_code::text, '') LIKE '{route_code}' AND
									coalesce(mountain_code::text, '') LIKE '{mountain_code}' AND
									extract(year FROM planned_departure_date) = {year}
							) AS _
							GROUP BY ROLLUP(guide_company)
							ORDER BY guide_company
						) __;
					`,
				columns: [
					'Guide Company',
					'Peak Season',
					'Non-Peak',
					'Total'
				],
				displayFunction: this.showcount_per_guide_company
			},
			count_climbers_per_year: {},
			count_climbers_per_route: {},
			count_climbers_by_locale: {},
			average_trip_length: {},
			all_female_expeditions: {},
			medical_issues: {},
			user_nights: {}
		};
		return this;
	}

	configureMainContent() {
		$('.main-content-wrapper').append(`
			<div class="query-options-sidebar col-2">
				<input id="query-option-search-input" class="fuzzy-search-bar" placeholder="Type to search for queries" title="Search for queries">
				<ul id="query-option-list">
					<li class="query-option" role="button" data-query-name="guide_company_client_status">Guided Client Status</li>
					<li class="query-option" role="button" data-query-name="guided_company_briefings">Guide Company Briefings</li>
					<li class="query-option" role="button" data-query-name="count_per_guide_company">Expeditions/Climbers Per Guide Company</li>
				</ul>
			</div>
			<div class="query-details-container col">
				<div class="query-parameters-header">
					<div class="query-parameters-container hidden" data-query-name="guide_company_client_status">
						<h5 class="w-100 mb-3">Guided Client Status Query Parameters</h5>
						<div class="field-container col-sm-3">
							<select id="guide_company_client_status-guide_company" class="input-field remove-null-guide-option default" name="guide_company_code" title="Guide company" required>
								<option value="">Guide company</option>
							</select>
							<label class="field-label" for="guide_company_client_status-guide_company">Guide company</label>
						</div>	
						<div class="field-container col-sm-3">
							<select id="guide_company_client_status-year" class="input-field default no-option-fill year-select-field" name="year" title="Year" required>
								<option value="">Year</option>
							</select>
							<label class="field-label" for="guide_company_client_status-year">Year</label>
						</div>	

					</div>

					<div class="query-parameters-container hidden" data-query-name="guided_company_briefings">
						<h5 class="w-100 mb-3">Guide Company Breifing Query Parameters</h5>
						<div class="field-container col-sm-3">
							<select id="guided_company_briefings-guide_company" class="input-field remove-null-guide-option default" name="guide_company_code" title="Guide company" required>
								<option value="">Guide company</option>
							</select>
							<label class="field-label" for="guided_company_briefings-guide_company">Guide company</label>
						</div>	
						<div class="field-container col-sm-3">
							<select id="guided_company_briefings-year" class="input-field default no-option-fill year-select-field" name="year" title="Year" required>
								<option value="">Year</option>
							</select>
							<label class="field-label" for="guided_company_briefings-year">Year</label>
						</div>	
					</div>

					<div class="query-parameters-container hidden" data-query-name="count_per_guide_company">
						<h5 class="w-100 mb-3">Expeditions/Climbers Per Guide Company Query Parameters</h5>
						<div class="field-container col-sm-3">
							<select id="count_per_guide_company-group_by_field" class="input-field remove-null-guide-option default no-option-fill" name="group_by_field" title="Count expeditions or climbers?" required>
								<option value="">Count expeditions or climbers?</option>
								<option value="expedition_id">Expeditions</option>
								<option value="expedition_member_id">Expedition member</option>
							</select>
							<label class="field-label" for="count_per_guide_company-guide_company">Count expeditions or climbers?</label>
						</div>	
						<div class="field-container col-sm-3">
							<select id="count_per_guide_company-year" class="input-field default no-option-fill year-select-field" name="year" title="Year" required>
								<option value="">Year</option>
							</select>
							<label class="field-label" for="count_per_guide_company-year">Year</label>
						</div>
						<div class="field-container col-sm-3">
							<select id="count_per_guide_company-mountain_code" class="input-field mountain-code-parameter-input no-option-fill" name="mountain_code">
								<option value="%">All mountains</option>
							</select>
							<label class="field-label" for="count_per_guide_company-mountain_code">Mountain</label>
						</div>
						<div class="field-container col-sm-3 collapse">
							<select id="count_per_guide_company-route_code" class="input-field route-code-parameter-input no-option-fill" name="route_code" data-dependent-target="#count_per_guide_company-mountain_code" data-dependent-value="!%">
								<option value="%">All routes</option>
							</select>
							<label class="field-label" for="count_per_guide_company-route_code">Route</label>
						</div>
					</div>

				</div>
				<div class="w-100 d-flex justify-content-center">
					<button id="run-query-button" class="generic-button hidden" title="Run query">Run query</button>
				</div>

				<div class="w-100 d-flex justify-content-end">
					<button id="open-reports-modal-button" class="expedition-edit-button icon-button hidden" type="button" aria-label="Open exports menu" title="Open exports menu" aria-hidden="true">
						<i class="fas fa-2x fa-file-export"></i>
					</button>
				</div>
				<div class="query-result-container">
				</div>
			</div>
		`);

		// Show query parameters (if there are any) when a query option is clicked
		$('.query-option').click(e => {this.onQueryOptionClick(e)});
		
		$('#run-query-button').click(() => {
			this.onRunQueryButtonClick();
		});

		$('.mountain-code-parameter-input').change(e => {
			this.onMountainCodeInputChange(e)
		});

		$('#open-reports-modal-button').click(() => {
			$('#exports-modal').modal();
		});

		$('#export-data-button').click(() => {
			this.onExportDataButtonClick();
		});

		// Make the values of any input fields with the same name attribute consistent
		$('.input-field').change(e => {
			const $target = $(e.target);
			const name = $target.attr('name');
			$(`.input-field[name=${name}]`).not($target)
				.val($target.val())	
		});
	}


	onMountainCodeInputChange(e) {
		const $target = $(e.target);
		const $paramContainer = $target.closest('.query-parameters-container');
		const $routeSelect = $paramContainer.find('.route-code-parameter-input');
		const mountainCode = $target.val();
		$routeSelect.val('%')
			.find('option')
				.not('[value="%"]')
				.remove();
		const mountainRoutes = Object.values(this.routeCodes)
			.filter(r => r.mountain_code == mountainCode)
			.sort((a, b) => a.sort_order - b.sort_order);
		for (const route of mountainRoutes) {
			$routeSelect.append($(`<option value="${route.code}">${route.name}</option>`))
		}
	}


	onQueryOptionClick(e) {
		// Deselect previous selection
		const $previousOption = $('.query-option.selected').removeClass('selected');
		
		// Hide previous inputs
		$(`.query-details-container [data-query-name="${$previousOption.data('query-name')}"]`).ariaHide(true);
		
		// Select clicked option and show assoicated inputs
		const $option = $(e.target).addClass('selected');
		$(`[data-query-name="${$option.data('query-name')}"]`).ariaHide(false);

		// Make sure 
		$('#run-query-button').ariaHide(false); 		// the run button is visible
		$('#open-reports-modal-button').ariaHide(true); // export button is hidden
		$('.query-result-container').empty();			// any previous result is deleted
	}


	showResult(result, queryName) {
		// Empty the result container
		const $resultContainer = $('.query-result-container').empty();

		const queryInfo = this.queries[queryName];
		const hrefs = queryInfo.hrefs || {};
		const columns = queryInfo.columns;
		const columnsHTML = columns.map(c => `<th>${c}</th>`).join('');
		var rowsHTML = '';
		
		// Iterate through results and build row HTML
		for (const row of result) {
			let cells = '';
			// Loop through columns in order
			for (const c of columns) {
				// default to cell content just being the result text
				let cellContent = row[c];
				if (!(c in row)) continue;

				// If this column has an href entry, make the cell content an anchor tag
				if (hrefs[c]) {
					let urlString = hrefs[c];
					// Find the 
					for (const match of urlString.match(/\{\w+\}/g)) {
						urlString = urlString.replaceAll(match, row[match.replaceAll(/\{|\}/g, '')])
					}
					cellContent = `<a href="${urlString}" target="_blank">${row[c]}</a>`
				} 
				cells += `<td><span class="cell-content">${cellContent}</span></td>`
			}
			
			rowsHTML += `<tr>${cells}</tr>`;
		}
		$resultContainer.append(`
			<table class="climberdb-data-table">
				<thead>
					<tr>${columnsHTML}</tr>
				</thead>
				<tbody>
					${rowsHTML}
				</tbody>
			</table>
		`);

		// Show the export button
		$('#open-reports-modal-button').ariaHide(false);

	}

	/*

	*/
	runQuery(queryName, {showResult=true}={}) {
		
		if ( !this.validateFields($(`.query-details-container [data-query-name=${queryName}]`)) ) {
			const $errors = $('.error');
			const $firstErrorField = $errors.first();
			const firstErrorFieldName = $firstErrorField.siblings('.field-label').text();
			const message = `The field <strong>${firstErrorFieldName}</strong> must be filled` +
				' in before you can run this query.';
			const eventHandler = () => {$('#alert-modal .confirm-button').click(() => {$firstErrorField.focus()})}
			showModal(message, 'Missing Parameter', 'alert', '', {eventHandlerCallable: eventHandler})
			$errors.removeClass('error');
			return;
		}

		const queryInfo = this.queries[queryName];
		var sql = queryInfo.sql;
		for (const el of $(`.query-parameters-container[data-query-name=${queryName}] .input-field`)) {
			sql = sql.replaceAll(`{${el.name}}`, this.getInputFieldValue($(el)));
		}

		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					const queryDisplayName = $('.query-option.selected').text();
					showModal(`There was a problem with the '${queryDisplayName}' query: ${queryResultString}`, 'Unexpected Error');
				} else if (showResult) {
					this.result = $.parseJSON(queryResultString);
					this.ancillaryResult = [];
					
					// If this query has a custom result handler, call that. Otherwise, fallback to the default handler
					if (queryInfo.customResultHandler) {
						queryInfo.customResultHandler(this.result);
					} else {
						this.showResult(this.result, queryName);
					}
				}
			})
	}


	queryGuidedClientStatus() {
		this.runQuery('guide_company_client_status')
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal('An unexpected error occurred: ' + queryResultString, 'Unexpected Error');
				} else {

					// If the user is exporting, the export needs briefings as well so just query it now
					this.runQuery('guided_company_briefings', {showResult: false})
						.done(queryResultString => {
							try {
								this.ancillaryResult = $.parseJSON(queryResultString);
							} catch {
								print(`Failed to query briefings. Result: ${queryResultString.trim()}`)
							}
						})
				}
			})
	}


	onRunQueryButtonClick() {
		const queryName = $('.query-option.selected').data('query-name');
		if (queryName === 'guide_company_client_status') {
			this.queryGuidedClientStatus();
		} else {
			this.runQuery(queryName);
		}
	}

	fillYearSelects() {
		const sql = `
			SELECT 
				extract(
					year FROM 
					generate_series(
						min(planned_departure_date), 
						max(planned_departure_date), 
						'1 year'
					)
				) AS year 
			FROM expeditions 
			ORDER BY 1 DESC`;
		return this.queryDB(sql)
			.done(queryResultString => {
				if (!this.queryReturnedError(queryResultString)) {
					for (const row of $.parseJSON(queryResultString)) {
						$('.year-select-field').append(`<option value=${row.year}>${row.year}</option>`);
					}
				}
			})
	}


	queryRouteCodes() {
		return this.queryDB(`
			SELECT route_codes.*, mountain_codes.name AS mountain_name 
			FROM route_codes 
				JOIN mountain_codes ON mountain_codes.code=route_codes.mountain_code 
			WHERE route_codes.sort_order IS NOT NULL
			ORDER BY mountain_codes.sort_order, route_codes.sort_order
		`).done(queryResultString => {
			const $routeSelects = $('.route-code-parameter-input');
			const $mountainSelects = $('.mountain-code-parameter-input');
			if (!this.queryReturnedError(queryResultString)) {
				for (const route of $.parseJSON(queryResultString)) {
					this.routeCodes[route.code] = {...route};
					$routeSelects.append($(`<option value="${route.code}">${route.name}</option>`));
				
					if (!(route.mountain_code in this.mountainCodes)) {
						this.mountainCodes[route.mountain_code] = route.mountain_name
						$mountainSelects.append($(`<option value="${route.mountain_code}">${route.mountain_name}</option>`))
					}
				}
			}
		})
	}


	/*
	Default option to handler export button clicks
	*/
	defaultExportHandler(queryName) {

		const queryInfo = this.queries[queryName]
		return $.post({
			url: 'flask/reports/export_query',
			data: {
				query_name: queryName,
				export_type: $('#input-export_type').val(),
				columns: JSON.stringify(queryInfo.columns),
				query_data: JSON.stringify(this.result),
				ancillary_data: JSON.stringify(this.ancillaryResult),
				excel_start_row: queryInfo.excelStartRow || 0,
				excel_write_columns: queryInfo.excelWriteColumns || false
			}
		})
	}

	/*
	Handle exports for 
	*/
	guideCompanyExportHandler(queryName) {

		const queryData = {
			client_status: queryName === 'guide_company_client_status' ? this.result : this.ancillaryResult,
			briefings: queryName === 'guide_company_client_status' ? this.ancillaryResult : this.result
		}
		const $guideCompanySelect = $(`#${queryName}-guide_company`);
		const guideCompanyShortName = this.guideCompanies[$guideCompanySelect.val()].short_name;
		const guideCompanyName = $guideCompanySelect
			.find(`option[value=${$guideCompanySelect.val()}]`)
				.text()
					.split('-') // guide company names are currently <3-letter abbreviation> - <full name>
						.slice(-1)[0] // select the last element so even if the above pattern changes, it'll still work
							.trim()
		const now = new Date();
		const dateString = now.toLocaleDateString('en-us', {year: 'numeric', month: 'short', day: 'numeric'});
		return $.post({
			url: 'flask/reports/export_query',
			data: {
				query_name: queryName,
				export_type: $('#input-export_type').val(),
				base_filename: `guided_client_status_${guideCompanyShortName}_${getFormattedTimestamp(now, {format: 'date'})}`,
				query_data: JSON.stringify(queryData),
				client_status_columns: JSON.stringify(this.queries.guide_company_client_status.columns),
				briefing_columns: JSON.stringify(this.queries.guided_company_briefings.columns),
				title_cell_text: `Client Status for ${guideCompanyName} as of ${dateString}`
			}
		})
	}


	onExportDataButtonClick() {
		showLoadingIndicator('export');
		const queryName = $('.query-option.selected').data('query-name');
		const queryInfo = this.queries[queryName];
		let deferred;
		if (queryName === 'guide_company_client_status' || queryName === 'guided_company_briefings') {
			deferred = this.guideCompanyExportHandler(queryName);
		} else {
			deferred = this.defaultExportHandler(queryName);
		}

		// Handle the response
		const exportType = $('#input-export_type').val();
		deferred.done(resultString => {
			if (this.pythonReturnedError(resultString)) {
				$('#exports-modal').modal('hide');
				showModal('An unexpected error occurred while exporting the data: ' + resultString, 'Unexpected Error');
			} else {
				resultString = resultString.trim()
				// Either prompt a download if the file is an Excel doc
				if (exportType === 'excel') {
					window.location.href = resultString;
				// or open the file in a new browser tab if it's a PDF
				} else if (exportType === 'pdf') {
					window.open(resultString, '_blank');
				} else {
					print('export type not understood: ' + exportType)
				}
			}	
		}).fail( (xhr, status, error) => {
			$('#exports-modal').modal('hide');
			showModal('An unexpected error occurred while exporting the data: ' + error, 'Unexpected Error');
		}).always(() => {
			hideLoadingIndicator();
		})
	}

	init() {
		// Call super.init()
		this.showLoadingIndicator('init');

		// Need guide company info for guide company query exports
		this.queryDB('SELECT * FROM guide_company_codes WHERE sort_order IS NOT NULL')
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					print('Failed to get guide company names. Returned result: ' + queryResultString)
				} else {
					for (const row of $.parseJSON(queryResultString)) {
						this.guideCompanies[row.code] = {...row}
					}
				}
			})
		var initDeferreds = $.when(...super.init())
			.then(() => {
				this.configureMainContent();
				
				return [
					...this.fillAllSelectOptions(),
					this.fillYearSelects(),
					this.queryRouteCodes()
				]
			})
			.then(() => {
				// Remove the "None" option for guide company accounting queries
				setTimeout(() => {$('.remove-null-guide-option option[value=-1]').remove()}, 500);
				$('#query-option-list .query-option').first().click();
			})
			.always(() => {
				hideLoadingIndicator();
			});

		return initDeferreds;
	}
}