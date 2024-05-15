class ClimberDBQuery extends ClimberDB {
	
	constructor() {
		super();
		this.routeCodes = {};
		this.mountainCodes = {};
		this.guideCompanies = {};
		this.result = [];
		this.ancillaryResult = []; // for things like briefings that go along with 
		this.countClimbersBySelectMap = { // mapping #count_climbers-count_field values to SELECT statements for readability
			climbers: `SELECT DISTINCT ON (climber_id) * FROM {schema}.all_climbs_view`,
			members:  `SELECT DISTINCT ON (expedition_member_id) * FROM {schema}.all_climbs_view`,
			climbs:   `SELECT * FROM {schema}.all_climbs_view`,
		}
		this.minDragbarPageY = 220; // min height to prevent user from covering query title when resizing param container
		this.queries = {
			guide_company_client_status: {
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
					FROM {schema}.expedition_info_view info 
						JOIN {schema}.group_status_codes codes 
							ON info.reservation_status_code = codes.code   
						LEFT JOIN 
							(
								SELECT 
									expedition_member_id, 
									sum(transaction_value)::NUMERIC AS balance 
								FROM {schema}.transactions 
								WHERE transaction_type_code IN (${this.constants.climbingFeeTransactionCodes}) 
								GROUP BY expedition_member_id 
							) climbing_fees 
							ON info.expedition_member_id = climbing_fees.expedition_member_id
						LEFT JOIN 
							(
								SELECT 
									expedition_member_id, 
									sum(transaction_value)::NUMERIC AS balance 
								FROM {schema}.transactions 
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
				],
				hrefs: {
					'Group Name': 'expeditions.html?id={expedition_id}'
				},
				cssColumnClasses: {
					'Group Name': 'justify-content-start',
					'First Name': 'justify-content-start',
					'Last Name': 'justify-content-start'
				}
			},
			guided_company_briefings: {
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
						FROM {schema}.briefings
							JOIN {schema}.expeditions ON briefings.expedition_id = expeditions.id
							JOIN {schema}.expedition_members ON expedition_members.expedition_id = expeditions.id
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
				},
				cssColumnClasses: {
					'Group Name': 'justify-content-start'
				}
			},
			count_per_guide_company: {
				sql: 
					`	
						SELECT 
							coalesce(guide_company, 'All Expeditions') AS "Guide Company",
							"Peak Season (3/15-7/1)",
							"Non-Peak",
							"Total",
							CASE 
								WHEN guide_company IS NULL THEN 0
								WHEN guide_company = 'Independent' THEN 1
								ELSE 2
							END AS result_order
						FROM (
							SELECT 
								guide_company,
								sum(within_peak) AS "Peak Season (3/15-7/1)",
								count(*) - sum(within_peak) AS "Non-Peak",
								count(*) AS "Total"
							FROM (
								SELECT DISTINCT 
									{group_by_field},
									CASE WHEN guide_company_codes.name = 'None' THEN 'Independent' ELSE guide_company_codes.name END AS guide_company,
									CASE
										WHEN extract(doy FROM planned_departure_date) BETWEEN 74 and 182  -- 3/15-7/1
											THEN 1
										ELSE 0
									END AS within_peak
								FROM {schema}.expeditions
									JOIN {schema}.expedition_members ON expeditions.id = expedition_members.expedition_id 
									JOIN {schema}.expedition_member_routes on expedition_members.id = expedition_member_routes.expedition_member_id
									JOIN {schema}.guide_company_codes ON expeditions.guide_company_code = guide_company_codes.code
									JOIN {schema}.route_codes ON route_codes.code=expedition_member_routes.route_code
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
						) __ 
						ORDER BY result_order DESC, guide_company;
					`,
				columns: [
					'Guide Company',
					'Peak Season (3/15-7/1)',
					'Non-Peak',
					'Total'
				],
				cssColumnClasses: {
					'Guide Company': 'justify-content-start'
				}
			},
			count_climbers: {
				sql: `
					SELECT {outer_select}
					FROM ({inner_select} {where_clauses}) _ 
					{joins}
					{group_by}
				`,
				numericColumns: [
					'age',
					'trip_length_days'
				],
				columns: [
					'Count'
				]
			},
			flagged_climbers: {
				sql: `
					SELECT 
						expedition_name AS "Group Name",
						first_name || ' ' || last_name AS "Climber Name",
						flagged_reason AS "Flagged Reason",
						flagged_by AS "Flagged By",
						expedition_id,
						climber_id
					FROM {schema}.expeditions
						JOIN {schema}.expedition_members ON expeditions.id = expedition_members.expedition_id
						JOIN {schema}.climbers ON climbers.id = expedition_members.climber_id
					WHERE
						flagged AND 
						extract(year FROM planned_departure_date) = {year}
					ORDER BY
						"Group Name",
						"Climber Name"
				`,
				columns: [
					'Group Name',
					'Climber Name',
					'Flagged By',
					'Flagged Reason'
				],
				hrefs: {
					'Group Name': 'expeditions.html?id={expedition_id}',
					'Climber Name': 'climbers.html?id={climber_id}'
				},
				cssColumnClasses: {
					'Group Name': 'justify-content-start',
					'Climber Name': 'justify-content-start',
					'Flagged By': 'justify-content-start',
					'Flagged Reason': 'justify-content-start',
				}
			},
			
			all_female_expeditions: {
				sql: `
					SELECT
						expedition_id,
						"Group Name",
						"Planned Departure",
						"Group Status"
					FROM
						(
							SELECT
								expedition_id,
								expedition_name AS "Group Name",
								planned_departure_date AS "Planned Departure",
								group_status_codes.name AS "Group Status",
								every(sex_code = 1) AS is_all_female
							FROM {schema}.registered_climbs_view
								JOIN {schema}.group_status_codes ON group_status_code = group_status_codes.code
							WHERE 
								extract(year FROM planned_departure_date) = {year}
							GROUP BY 
								expedition_id,
								expedition_name,
								planned_departure_date,
								"Group Status"
						) _
					WHERE is_all_female
					ORDER BY
						"Group Name"
				`,
				columns: [
					"Group Name",
					"Planned Departure",
					"Group Status"
				],
				hrefs: {
					'Group Name': 'expeditions.html?id={expedition_id}'
				}
			},

			overdue_expeditions: {
				sql : `
				SELECT
					expedition_id,
					expedition_name AS "Group Name",
					planned_return_date AS "Planned Return",
					COUNT(climber_id) AS "Climber Count"
				FROM {schema}.expeditions
					JOIN {schema}.expedition_members ON expeditions.id = expedition_members.expedition_id
				WHERE 
					extract(year FROM planned_return_date) = extract(year FROM now()) AND
					planned_return_date < now()::date AND
					actual_return_date IS NULL AND
					group_status_code = 4
				GROUP BY
					expedition_members.expedition_id,
					"Group Name",
					"Planned Return"
				ORDER BY
					"Planned Return"
				`,
				columns: [
					'Group Name',
					'Climber Count',
					'Planned Return'
				],
				hrefs: {
					'Group Name': 'expeditions.html?id={expedition_id}'
				}

			},
			pro_pins: {
				sql: `
				SELECT 
					first_name || ' ' || last_name AS "Climber Name",
					expedition_name AS "Group Name",
					extract(year FROM planned_departure_date) AS "Year",
					coalesce(expedition_members.reason_for_pro_pin, '') AS "Reason", 
					climber_id,
					expedition_id
				FROM {schema}.expedition_members 
					JOIN {schema}.climbers ON climbers.id = expedition_members.climber_id and climbers.id = expedition_members.climber_id 
					JOIN {schema}.expeditions ON expeditions.id=expedition_members.expedition_id
				WHERE 
					extract(year FROM actual_departure_date) {year} AND 
					expedition_members.received_pro_pin -- AND expedition_members.reason_for_pro_pin IS NOT NULL
				ORDER BY
					"Climber Name";
				`,
				columns : [
					'Climber Name',
					'Group Name',
					'Year',
					'Reason'
				],
				hrefs : {
					'Climber Name': 'climbers.html?id={climber_id}',
					'Group Name': 'expeditions.html?id={expedition_id}'
				},
				cssColumnClasses: {
					'Reason': 'justify-content-start'
				}
			},
			expedition_by_name_id: {
				sql: `
					SELECT
						expedition_id,
						expedition_name AS "Group Name",
						planned_return_date AS "Planned Return",
						COUNT(climber_id) AS "Climber Count"
					FROM {schema}.expeditions
						JOIN {schema}.expedition_members ON expeditions.id = expedition_members.expedition_id
					{where_clauses}
					GROUP BY
						expedition_id,
						expedition_name,
						planned_return_date
					ORDER BY 
						expedition_name
				`,
				columns: [
					'Group Name',
					'Climber Count',
					'Planned Return'
				],
				hrefs: {
					'Group Name': 'expeditions.html?id={expedition_id}'
				},
				cssColumnClasses: {
					'Group Name': 'justify-content-start'
				}
			},
			user_nights: {
				sql: `
					SELECT 
						mountain_name AS "Mountain", 
						count(*) AS "Users", 
						extract(day FROM sum(days)) AS "User Nights" 
					FROM
						(
							SELECT DISTINCT 
								expedition_member_id, 
								mountain_name, 
								least(coalesce(actual_return_date, now())::date, '{year}-{month}-1'::date + interval '1 month') - greatest(actual_departure_date, '{year}-{month}-1') AS days 
							FROM {schema}.registered_climbs_view
							WHERE 
								actual_departure_date IS NOT NULL AND 
								coalesce(special_group_type_code, -1) <> 3 AND 
								(
									actual_departure_date BETWEEN '{year}-{month}-1' AND ('{year}-{month}-1'::date + interval '1 month')::date - 1 OR
									actual_return_date BETWEEN '{year}-{month}-1' AND ('{year}-{month}-1'::date + interval '1 month')::date - 1
								)
						) _ 
					GROUP BY mountain_name;
				`,
				columns: [
					'Mountain',
					'Users',
					'User Nights'
				]
			},
			average_trip_length: {
				sql: `
				`,
				columns: [
				]
			}
		};
		return this;
	}

	configureMainContent() {
		// $('.main-content-wrapper').append(`

		// `);
		// When the user clicks the expand or contract sidebar button, expand or contract it accordingly
		$('.change-query-option-sidebar-size-button').click(e => {
			const $sideBar = $('.query-options-sidebar');
			const isCollapsed = $sideBar.is('.collapsed');
			$sideBar.toggleClass('collapsed', !isCollapsed);

			const $i = $(e.target).closest('button').find('i');
			// Delay changing icon until transition is finished
			setTimeout(() => {
				const isCollapsed = !$i.is('.fa-arrow-right')
				$i.toggleClass('fa-arrow-right fa-arrow-from-left', isCollapsed)
				$i.siblings('.icon-button-label').text(isCollapsed ? 'show' : 'hide')
			}, 200);
		})

		// filter query options when the user searches
		$('#query-option-search-input').keyup(e => {
			this.onSearchBarKeyUp(e);
		});

		// Show query parameters (if there are any) when a query option is clicked
		$('.query-option').click(e => {this.onQueryOptionClick(e)});
		
		$('#run-query-button').click(() => {
			this.onRunQueryButtonClick();
		});

		$('.climberdb-select2').change(e => {this.onSelect2Change(e)});

		$('.mountain-code-parameter-input').change(e => {
			this.onMountainCodeInputChange(e)
		});

		$('.show-query-parameter-button').click(e => {
			this.onShowQueryParameterButtonClick(e)
		});

		$('.hide-query-parameter-button').click(e => {
			this.onHideQueryParameterButtonClick(e)
		});

		$('#open-reports-modal-button').click(() => {
			$('#exports-modal').modal();
		});

		$('#export-data-button').click(() => {
			this.onExportDataButtonClick();
		});

		$('.input-field').change(e => {
			this.onInputChange(e);
		});

		$('#add-numeric-stat-field-button').click(e => {
			this.onAddNumericStatButtonClick(e);
		})
		$('.remove-stat-row-button').click(e => {
			this.onRemoveNumericStatButtonClick(e);
		})
		$('#query-parameter-dragbar').mousedown(e => {
			this.onDragbarMouseDown(e);
		})
		// mouseup and mousedown events only fire if the mouse gesture occurs while 
		//	the cursor is over the element the event listener is attached to. So it 
		//	needs to be attached to the body, not that dragbar since the event 
		//	fires before the dragbar moves
		$('body').mouseup(e => {
			this.onDragbarMouseUp(e);
		});

		$('.datetime-query-operator').change(e => {
			this.onDatetimeQueryOperatorChange(e)
		});

		$('.add-remove-all-multiselect-options-button').click(e => {
			this.onAddAllMultiselectOptionsClick(e);
		})

		$(document).on('click', '.sort-column-button', e => {
			this.onSortDataButtonClick(e);
		});

		//query button to find the all expeditions with past due dates
		$(document).on('click')

		$('#climbers-per-mountain-query-button').click(e => {
			this.onClimbersPerMountainButtonClick()
		});
		$('#guided-climbers-per-mountain-query-button').click(e => {
			this.onGuidedClimbersPerMountainButtonClick()
		});
		$('#independent-climbers-per-mountain-query-button').click(e => {
			this.onIndependentClimbersPerMountainButtonClick()
		});
		$('#climbers-per-day-query-button').click(e => {
			this.onClimbersPerDayButtonClick();
		});
		$('#nps-climbers-per-mountain-query-button').click(e => {
			this.onNPSClimbersPerMountainButtonClick()
		});
		$('#female-climbers-per-mountain-query-button').click(e => {
			this.onFemaleClimbersPerMountainButtonClick()
		});
		$('#total-summits-per-mountain-query-button').click(e => {
			this.onTotalSummitsPerMountainClick()
		});
		$('#female-summits-per-mountain-query-button').click(e => {
			this.onFemaleSummitsPerMountainButtonClick()
		});
		$('#count-route-attempts-query-button').click(e => {
			this.onCountRouteAttemptsButtonClick()
		});
		$('#count-route-summits-query-button').click(e => {
			this.onCountRouteSummitsButtonClick()
		});
		$('#count-climbers-per-country-query-button').click(e => {
			this.onClimbersPerCountryButtonClick()
		});
		$('#count-climbers-per-state-query-button').click(e => {
			this.onClimbersPerStateButtonClick()
		});
		$('#count-guides-by-gender-query-button').click(e => {
			this.onGuidesByGenderButtonClick()
		});
		$('#count-nps-by-gender-query-button').click(e => {
			this.onNPSByGenderButtonClick()
		});
		$('#count-summits-per-month-query-button').click(e => {
			this.onSummitsPerMonthClick()
		});
		$('#count-summits-per-day-query-button').click(e => {
			this.onSummitsPerDayClick()
		});
		$('.query-parameters-container[data-query-name="expedition_by_name_id"] .update-expedition-id-option').change(() => {
			this.updateExpeditionIDOptions();
		});

		//$(window).resize(e => {onWindowResize(e)})
		
		// Record current value for .revertable inputs so the value can be reverted after a certain event
		$('.input-field.revertable', e => {
			const $target = $(e.target);
			$target.data('current-value', $target.val());
		});
		// Make sure the group by and pivot fields don't contain the same value or the SQL will break
		$('#count_climbers-group_by_fields, #count_climbers-pivot_field').change(e => {
			this.onGroupByPivotFieldChange(e);
		})
	}

	/*
	Make the values of any input fields with the same name attribute consistent
	*/
	onInputChange(e) {
		const $target = $(e.target);
		const name = $target.attr('name');
		// Some fields have name attributes that make invalid jQuery expressions and throw and error
		try {
			$(`.input-field[name=${name}]`).not($target)
				.not('.no-name-auto-update')
				.val($target.val())	
		} catch {
			return
		}
	}


	filterQueryOptions({searchString=''}={}) {
		let $queryOptions = $('.query-option');
		const $noMatchMessage = $('#no-query-match-message').ariaHide(true);
		const $queryList = $('#query-option-list').ariaHide(false);

		// make sure matches aren't case-sensitive
		searchString = searchString.toLowerCase();
		
		// If the search string is blank, show all queries
		if (!searchString.length) {
			$queryOptions.ariaHide(false);
		} else {
			// first try to find all queries that include the search string
			let $matches = $queryOptions.filter(
				(_, el) => el.innerHTML.toLowerCase().includes(searchString)
			);

			// next find all query options that have a tag that matches the search string
			$matches = $matches.add($queryOptions.filter(
				(_, el) => {
					const tags = $(el).data('tags').split(',').map(tag => tag.trim().toLowerCase());
					return tags.includes(searchString);
				}
			))
			.ariaHide(false); // show all matches

			if ($matches.length) {
				// hide all that aren't matches
				$queryOptions.not($matches).ariaHide(true);
			} else {
				// if there aren't any matches show the null match message
				$noMatchMessage.ariaHide(false);
				$queryList.ariaHide(true);
			}
			
		}
	}


	onSearchBarKeyUp(e) {
		const $searchBar = $(e.target);
		const searchString = $searchBar.val();
		this.filterQueryOptions({searchString: searchString});
	}

	/*Set CSS style based on select value*/
	onSelect2Change(e) {
		const $target = $(e.target);
		const $select2 = $target.siblings('.select2-container');
		const valueLength = $target.val().length;
		$select2.toggleClass('is-empty', !valueLength);

		// Show/hide the .field-label of select2s by manually toggling the .default class 
		//	based on the select's value
		$target.toggleClass('default', !valueLength);

		// Set the add/remove all button text, depedning on whether all options are selected or not
		const $addRemoveButton = $target.siblings('.add-remove-all-multiselect-options-button')
		$addRemoveButton.text(
			$target.val().length === this.getAllSelectOptions($target).length ?
				'remove all' :
				'add all'
		);
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

	/*
	Show the query parameters for the clicked query
	*/
	onQueryOptionClick(e) {
		// Deselect previous selection
		const $previousOption = $('.query-option.selected').removeClass('selected');
		
		// Hide previous inputs
		$(`.query-details-container [data-query-name="${$previousOption.data('query-name')}"]`).ariaHide(true);
		
		// Select clicked option and show assoicated inputs
		const $option = $(e.target).addClass('selected');
		const $container = $(`.query-parameters-container[data-query-name="${$option.data('query-name')}"]`).ariaHide(false);

		// Make sure:
		$('#run-query-button').ariaHide(false); 		// the run button is visible
		$('#open-reports-modal-button, .table-row-counter-wrapper').ariaHide(true); // export button is hidden
		$('.query-result-container').empty();			// any previous result is deleted
		$('.query-parameters-container')                // parameter container height is reset
			.css('max-height', 'var(--query-parameter-container-height)'); 

		// The dragbar should only be visible if the query allows it
		$('#query-parameter-dragbar').ariaHide($option.is('.not-expandable'))
			.data('last-dragged-y', window.screen.height);
	}


	/*
	Helper function to set default options for canned count_climbers derative queries
	*/
	setCountClimbersOrClimbsParameters({countBy='climbers', year=new Date().getFullYear(), groupByFields=[], pivotField=''}={}) {
		// Set basic SQL parameter fields
		$('#count_climbers-summary_or_records').val('summary').change();
		$('#count_climbers-count_field').val(countBy).change();
		$('#count_climbers-group_by_fields').val(groupByFields).change();
		$('#count_climbers-pivot_field').val(pivotField).change();

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]')
		
		// Hide all where-clause fields
		$('.where-clause-field').closest('.field-container').removeClass('show');

		// Unhide all parameter show/hide buttons to reset to default
		$container.find('.show-query-parameter-button').ariaHide(false);
		if (year) {
			$container.find('.show-query-parameter-button[data-field-name="year"]').click();
			$('#count_climbers-year').val([year.toString()]).change();
		}
	}

	/*
	Event handlers to prepare canned queries
	*/
	onClimbersPerMountainButtonClick() {
		this.setCountClimbersOrClimbsParameters({groupByFields: ['mountain_name']});

		// Set group status to 'on mountain' and 'done'
		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="group_status_code"]').click();
		$('#count_climbers-group_status').val([4, 5]).change();
	}

	onGuidedClimbersPerMountainButtonClick() {
		this.onClimbersPerMountainButtonClick();

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="guide_company_code"]').click();
		const $guideCompanySelect = $('#count_climbers-guide_company');
		// Select all guide companies (except not guided [-1])
		$guideCompanySelect.val(
			$guideCompanySelect.find('option').map((_, el) => [el.value]).get().filter(code => code != -1)
		).change();
	}

	onIndependentClimbersPerMountainButtonClick() {
		this.onClimbersPerMountainButtonClick();

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="guide_company_code"]').click();
		// Select just independent groups
		$('#count_climbers-guide_company').val([-1]).change();
	}

	onClimbersPerDayButtonClick() {
		this.setCountClimbersOrClimbsParameters({countBy: 'members', year: null, groupByFields: ["to_char(day, 'MM-DD')"]});

		// Set group status to 'on mountain' and 'done'
		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="group_status_code"]').click();
		$('#count_climbers-group_status').val([4, 5]).change();
	}

	onNPSClimbersPerMountainButtonClick() {
		this.onClimbersPerMountainButtonClick();

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="special_group_type_code"]').click();

		$('#count_climbers-special_group_type').val([3]).change();
	}

	onFemaleClimbersPerMountainButtonClick() {
		this.onClimbersPerMountainButtonClick();

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="sex_code"]').click();
		// Select just female climbers
		$('#count_climbers-sex_code').val([1]).change();
	}

	onTotalSummitsPerMountainClick() {
		this.setCountClimbersOrClimbsParameters({countBy: 'climbs', groupByFields: ['mountain_name']});

		// Count only summit=Yes
		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="summited"]').click();
		$('#count_climbers-summited').val(`'Yes'`).change();
	}

	onFemaleSummitsPerMountainButtonClick() {
		this.onTotalSummitsPerMountainClick();

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="sex_code"]').click();
		// Select just female climbers
		$('#count_climbers-sex_code').val([1]).change();
	}

	onCountRouteAttemptsButtonClick() {
		
		// Make sure we're counting climbs
		this.setCountClimbersOrClimbsParameters({countBy: 'climbs', groupByFields: ['route_name'], pivotField: 'mountain_code'})
		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');

		// Set group status parameter
		$container.find('.show-query-parameter-button[data-field-name="group_status_code"]').click();
		$('#count_climbers-group_status').val([4, 5]).change();
	}

	/*
	Do the same things as the route attemps query but also add summited='Yes' parameter
	*/
	onCountRouteSummitsButtonClick() {
		
		this.onCountRouteAttemptsButtonClick();
		
		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="summited"]').click();
		$('#count_climbers-summited').val(`'Yes'`).change();
	}

	/*
	Do the same things as the route summits  query but also add gender=female
	*/
	onCountFemaleRouteSummitsButtonClick() {
		
		this.onCountRouteSummitsButtonClick();
		
		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		$container.find('.show-query-parameter-button[data-field-name="sex_code"]').click();
		// Select just female climbers
		$('#count_climbers-sex_code').val([1]).change();
	}

	onClimbersPerCountryButtonClick() {
		this.setCountClimbersOrClimbsParameters({groupByFields: ['country_code']});

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');

		// Set group status parameter to all but canceled
		$container.find('.show-query-parameter-button[data-field-name="group_status_code"]').click();
		const $groupStatusInput = $('#count_climbers-group_status');
		$groupStatusInput.val($groupStatusInput.find('option').map((_, el) => [el.value]).get().filter(v => v != 6)).change();
	}

	onClimbersPerStateButtonClick() {
		this.onClimbersPerCountryButtonClick();
		$('#count_climbers-group_by_fields').val(['state_code']).change();
	}

	onGuidesByGenderButtonClick() {
		this.setCountClimbersOrClimbsParameters({groupByFields: ['sex_code']});

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');

		// Set group status parameter to all but canceled
		$container.find('.show-query-parameter-button[data-field-name="group_status_code"]').click();
		const $groupStatusInput = $('#count_climbers-group_status');
		$groupStatusInput.val($groupStatusInput.find('option').map((_, el) => [el.value]).get().filter(v => v != 6)).change();

		// Is is_guiding=true
		$container.find('.show-query-parameter-button[data-field-name="is_guiding"]').click();
		$('#count_climbers-is_guiding').val('true').change();
	}

	onNPSByGenderButtonClick() {
		this.setCountClimbersOrClimbsParameters({groupByFields: ['sex_code']});

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');

		// Set group status parameter to all but canceled
		$container.find('.show-query-parameter-button[data-field-name="group_status_code"]').click();
		const $groupStatusInput = $('#count_climbers-group_status');
		$groupStatusInput.val($groupStatusInput.find('option').map((_, el) => [el.value]).get().filter(v => v != 6)).change();

		// Set special group type to NPS
		$container.find('.show-query-parameter-button[data-field-name="special_group_type_code"]').click();
		$('#count_climbers-special_group_type').val([3]).change();
	}

	onSummitsPerMonthClick() {
		this.onTotalSummitsPerMountainClick();
		$('#count_climbers-group_by_fields').val([`to_char(summit_date, 'Month')`]).change();
	}

	onSummitsPerDayClick() {
		this.onTotalSummitsPerMountainClick();
		$('#count_climbers-group_by_fields').val(['summit_date']).change();
	}

	/*
	When the window is resized, set inline CSS height because some queries need to to make scrolling work properly
	*/
	onWindowResize(e) {
		const queryName = $('.query-option.selected').data('query-name');
		const $container = $(`.query-parameters-container[data-query-name="${queryName}"]`);
		$container.height($container.height()); //.height() is syntactic sugar for element.scrollHeight
	}


	/*
	Event handler for .show-query-parameter-button (where clauses for count_climbers)
	*/
	onShowQueryParameterButtonClick(e) {
		const $button = $(e.target).ariaHide(true);
		const fieldName = $button.data('field-name');

		const $container = $button.closest('.query-parameters-container');

		// Show the field
		$container.find(`.input-field[name=${fieldName}]`).closest('.field-container.collapse').collapse('show');
	}


	/*
	Event handler for .hide-query-parameter-button (where clauses for count_climbers)
	*/
	onHideQueryParameterButtonClick(e) {
		const $fieldContainer = $(e.target).closest('.field-container').collapse('hide');
		
		// since datetime fields have multuple input-fields, but only one has the name attribute,
		//	filter for .input-fields that have a truthy name
		const fieldName = $fieldContainer.find('.input-field')
			.filter((_, el) => el.name) 
			.attr('name');

		$fieldContainer.closest('.query-parameters-container')
			.find(`.show-query-parameter-button[data-field-name=${fieldName}]`)
			.ariaHide(false);
	}


	/*
	When a user changes the gorup by or pivot field, make sure that 
	the values of each field DO NOT overlap
	*/
	onGroupByPivotFieldChange(e) {
		const $target = $(e.target);
		const targetIsGroupBy = $target.attr('name') === 'group_by_fields';

		const targetValue = $target.val();
		const targetValueText = targetIsGroupBy ? 
			$target.find('option:selected').map((_, el) => [el.innerHTML]).get() :
			$target.find(`option[value="${targetValue}"]`).text();
		const targetLabelText = $target.siblings('.field-label').text();

		let $otherField = targetIsGroupBy ? $('#count_climbers-pivot_field') : $('#count_climbers-group_by_fields');
		const otherValueText = $otherField.find(`option[value="${$otherField.val()}"]`).text();
		const otherLabelText = $otherField.siblings('.field-label').text();
		
		if (targetIsGroupBy ? targetValueText.includes(otherValueText) : otherValueText.includes(targetValueText)) {
			$target.val($target.data('current-value'));
			const message = `The "${otherLabelText}" field ${targetIsGroupBy ? 'is already set to' : 'already includes'} "${otherValueText}". Either` + 
				` choose a different "${targetLabelText}" value or change the "${otherLabelText}" value.`;
			showModal(message, `Invalid ${targetLabelText} value`);
		}

		// If either Day or Day of year was selected, show the actual departure/return fields
		// if ((targetValue || []).some(value => value.match(/day|^to_char\(day/))) {
		// 	$(`
		// 		.show-query-parameter-button[data-field-name=actual_departure_date], 
		// 		.show-query-parameter-button[data-field-name=actual_return_date] 
		// 	`).click();
		// }
	}


	/*
	Toggle between showing the single and double value field if the operator is "BETWEEN"
	*/
	onDatetimeQueryOperatorChange(e) {
		const $target = $(e.target);
		const isBetween = $target.val() === 'BETWEEN';
		$target.siblings('.single-value-field').ariaHide(isBetween);
		$target.siblings('.query-option-double-value-container').ariaHide(!isBetween);
		$target.closest('.field-container').toggleClass('is-between', isBetween);
	}


	/*
	Helper function to get all selects options of a multi-select
	*/
	getAllSelectOptions($select) {
		return $select.find('option').map((_, el) => el.value).get().filter(v => v !== '');
	}


	onAddAllMultiselectOptionsClick(e) {
		const $button = $(e.target).closest('button');
		const $select = $button.siblings('select');
		const allOptionsAdded = $button.text() === 'remove all';
		if (allOptionsAdded) {
			$select.val([]).change();
			$button.text('add all');
		} else {
			$select.val(this.getAllSelectOptions($select)).change();
			$button.text('remove all');
		}
	}

	resizeQueryParameterContainer(e) {
		const mouseYCoordinate = e.pageY;
		const $container = $('.query-parameters-container:not(.hidden)');
		const $dragbar = $('#query-parameter-dragbar');
		const lastDraggedYCoordinate = $dragbar.data('last-dragged-y') || window.screen.height;

		// if the container no longer needs to scroll, don't let the user keep expanding it
		if (	
				// user is trying to expand the div
				lastDraggedYCoordinate < mouseYCoordinate && 
				// the container is as tall as its contents
				$container[0].scrollHeight <= $container[0].offsetHeight
			) {
			return;
		}

		// Also make sure the result table will show at least 1 row
		const maxMouseYCoordinate = $('.main-content-wrapper')[0].offsetHeight 
			- $('.query-details-container').css('padding').replace('px', '') // make sure padding is accommodated for
			- ($(':root').css('--climberdb-data-table-row-height').replace('px', '') * 2); // make sure header and 1 row of table is visible
		if (mouseYCoordinate > maxMouseYCoordinate) {
			return;
		}
		
		const currentHeight = parseInt($container.css('height').replace('px', ''));
		const offset = this.minDragbarPageY - $('#run-query-button')[0].offsetHeight;
		const newHeight = (mouseYCoordinate - offset) + 'px';
		$container
			.css('height', newHeight)
			.css('max-height', newHeight);

		$dragbar.data('last-dragged-y', mouseYCoordinate);
	}


	onAddNumericStatButtonClick() {
		const $cloneable = $('.stat-field-row.cloneable');
		const $row = $cloneable.clone(true);
		$row.removeClass('cloneable')
			.ariaHide(false)
			.insertBefore($cloneable);
		$row.find('.input-field[name=numeric_stat_field]')
			.attr('id', '')
			.focus();
		$row.find('')
	}

	onRemoveNumericStatButtonClick(e) {
		$(e.target).closest('.stat-field-row').remove();
	}

	/*
	When a user clicks the dragbar, 
	*/
	onDragbarMouseDown(e) {
		e.preventDefault();
		const $dragbar = $('#query-parameter-dragbar').addClass('resizing');
		$('body').mousemove(e => {
			this.resizeQueryParameterContainer(e)
		});
	}

	/*
	When the user releases the dragbar, remove the mousemove event and the .resizing class
	*/
	onDragbarMouseUp(e) {
		$('#query-parameter-dragbar').removeClass('resizing');
		$('body').off('mousemove');
	}


	showResult(result, {queryName= $('.query-option.selected').data('query-name'), dataOnly=false}={}) {

		const queryInfo = this.queries[queryName];
		const hrefs = queryInfo.hrefs || {};
		const columns = queryInfo.columns;
		const columnsHTML = columns.map(c => `
			<th>	
				<button class="text-only-button sort-column-button" data-field-name="${c}">
					<span>${c}</span>
					<i class="fa fa-solid fa-sort fa-circle-sort-up"></i>
				</button>
			</th>	
			`).join('');
		var rowsHTML = '';
		
		const cssClasses = queryInfo.cssColumnClasses || {};

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
				cells += `<td><span class="cell-content ${cssClasses[c] || ''}">${cellContent}</span></td>`
			}
			
			rowsHTML += `<tr>${cells}</tr>`;
		}

		if (dataOnly) {
			$('.query-result-container tbody')
				.empty()
				.append(rowsHTML);
		} else {
			// Empty the result container
			$('.query-result-container')
				.empty()
				.append(`
					<table class="climberdb-data-table">
						<thead>
							<tr>${columnsHTML}</tr>
						</thead>
						<tbody>
							${rowsHTML}
						</tbody>
					</table>
				`);
		}
		// Show the export button
		$('#open-reports-modal-button, .table-row-counter-wrapper').ariaHide(false);
		$('.table-row-counter').text(result.length)

	}


	validateFields(queryName) {
		super.validateFields($(`.query-details-container [data-query-name=${queryName}]`));
		// If the field has a .cloneable ancestor, remove the error field
		let $errors = $('.error');
		for (const el of $errors) {
			const $input = $(el);
			if ($input.closest('.cloneable').length) $input.removeClass('error');
		}
		const isValid = $('.error').length === 0;
		if (!isValid) {
			const $firstErrorField = $errors.first();
			const firstErrorFieldName = $firstErrorField.data('validation-field-name') || $firstErrorField.siblings('.field-label').text();
			const message = `The field <strong>${firstErrorFieldName}</strong> must be filled` +
				' in before you can run this query.';
			const eventHandler = () => {$('#alert-modal .confirm-button').click(() => {$firstErrorField.focus()})}
			showModal(message, 'Missing Parameter', 'alert', '', {eventHandlerCallable: eventHandler})
			$errors.removeClass('error');
		}

		return isValid;
	}


	/*
	Helper function to submit SQL and optionally show result. This needs to be separated from runQuery() so that custom 
	query processing functions can still use the same code
	*/
	submitQuery(sql, {queryName=$('.query-option.selected').data('query-name'), showResult=true}={}) {
		return this.queryDB(sql.replace(/\{schema\}/g, this.dbSchema))
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					const queryDisplayName = $('.query-option.selected').text();
					showModal(`There was a problem with the '${queryDisplayName}' query: ${queryResultString}`, 'Unexpected Error');
				} else if (showResult) {
					this.result = $.parseJSON(queryResultString);
					this.ancillaryResult = [];
					
					const queryInfo = this.queries[queryName];
					// If this query has a custom result handler, call that. Otherwise, fallback to the default handler
					if (queryInfo.customResultHandler) {
						queryInfo.customResultHandler(this.result);
					} else {
						this.showResult(this.result, queryName);
					}
				}
			})
	}


	/*
	Execut a simple query. Anything surrounded by {} is assumed to be a field name that should be replaced with the value of the field whose name attribute is field
	*/
	runQuery(queryName, {showResult=true}={}) {

		if (!this.validateFields(queryName)) return;

		const queryInfo = this.queries[queryName];
		var sql = queryInfo.sql;
		for (const el of $(`.query-parameters-container[data-query-name=${queryName}] .input-field`)) {
			sql = sql.replaceAll(`{${el.name}}`, this.getInputFieldValue($(el)));
		}

		return this.submitQuery(sql, {queryName: queryName, showResult: showResult});
	}


	onSortDataButtonClick(e) {
		const $button = $(e.target).closest('.sort-column-button');

		// if the column was already sorted and descending, then make it ascending. 
		//	Otherwise, the column will be sorted ascending
		let sortAscending;
		const isSorted = $button.is('.sorted');
		if (isSorted) {
			sortAscending = $button.is('.descending');
		} else {
			sortAscending = true;
		}
		

		const fieldName = $button.data('field-name');
		
		this.result = this.sortDataArray(this.result, fieldName, {ascending: sortAscending});
		const queryName = $('.query-option.selected').data('query-name');
		this.showResult(this.result, queryName, {dataOnly: true});

		//$('.sort-column-button').removeClass('sorted');
		$(`.sort-column-button[data-field-name="${fieldName}"]`).addClass('sorted')
			.toggleClass('descending', !sortAscending);
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

	/*
	Get WHERE clause(s) from query parameters to update. Used to update the expedition ID 
	select options and for running the actual query
	*/
	getExpeditionByNameIDWhere() {
		const year = $('#expedition_by_name_id-year').val();
		const expeditionSearchOperator = $('#expedition_by_name_id-search_by').val();
		const expeditionSearchString = $('#expedition_by_name_id-search_string').val();
		
		var where = [];
		if (year) {
			where.push('extract(year FROM planned_departure_date) = ' + year);
		}
		if (expeditionSearchString.length) {
			const searchString = 
				expeditionSearchOperator === 'equals' ? expeditionSearchString : 
				expeditionSearchOperator === 'starts' ? expeditionSearchString + '%' :
				expeditionSearchOperator === 'ends'   ? '%' + expeditionSearchString :
				'%' + expeditionSearchString + '%'; // contains
			where.push(`expedition_name LIKE '${searchString}'`); 
		}

		return where;
	}


	/*
	When the user changes a query parameter (either expedition name search operator/string 
	or year), update the expedition ID select options
	*/
	updateExpeditionIDOptions() {
		// Show loading indicator and hide everything else in this field container
		const $loadingIndicator = $('#expedition-id-loading-indicator')
			.ariaHide(false)
			.siblings()
				.ariaHide(true);

		const where = this.getExpeditionByNameIDWhere();
		
		const sql = `SELECT id FROM ${this.dbSchema}.expeditions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`;
		this.queryDB(sql)
			.done(response => {
				if (this.queryReturnedError(response)) {
					print('Error querying expedition IDs: '  + response)
				} else {
					const $select = $('#expedition_by_name_id-expedition_id');
					// capture current selection so it can be reselected if those IDs still 
					//	exist as options
					const currentSelection = $select.val();
					
					// clear previous options
					$select.find('option').remove();
					for (const {id} of $.parseJSON(response)) {
						$select.append(`<option value=${id}>${id}</option>`)
					}
					
					// reset previous selection. Only IDs that exist with after the new 
					//	query will be selected
					$select.val(currentSelection).change();
				}
			})
			.always(() => {
				// Hide the loading indicator and show everything else
				const $loadingIndicator = $('#expedition-id-loading-indicator')
					.ariaHide(true)
					.siblings()
						.ariaHide(false);
			})
	}


	/*
	The Expedition By Name/ID query requires special handling of the WHERE 
	clause(s) because the search string and operator combo can't be used with 
	a direct .replace()
	*/
	queryExpeditionByNameOrID() {
		const expeditionIDs = $('#expedition_by_name_id-expedition_id').val();
		const whereClauses = this.getExpeditionByNameIDWhere();
		const where = 
			expeditionIDs.length ? ` WHERE expedition_id in (${expeditionIDs.join(',')})` :
			whereClauses.length ? ' WHERE ' + whereClauses.join(' AND ') :
			'';
		if (where.length == 0) {
			showModal('You must enter an expedition name search string or select a year or expedition ID', 'No Query Parameters')
			return;
		}

		const sql = this.queries.expedition_by_name_id.sql.replace('{where_clauses}', where);
		this.submitQuery(sql, 'expedition_by_name_id');
	}


	fieldToSelectAlias([field, alias]) {
		return field.endsWith('_code') ? `${field}s.name AS "${alias}"` : `${field} AS "${alias}"`;
	}


	whereFieldToClause(el) {
		const value = $(el).val();
		const fieldName = el.name;
		let clause = '';
		if (el.multiple) { 
			// If the value includes null and other values, add IS NULL OR statement
			let isNullClause = '';
			if (value.includes('null')) isNullClause = `${fieldName} IS NULL`;

			// Make the field IN () clause for all selected options except null
			let nonNullClause = '';
			const nonNullValues = value.filter(v => v !== 'null');
			if (nonNullValues.length) nonNullClause = `${fieldName} IN (${nonNullValues.join(',')})`;
			clause = 
				isNullClause && !nonNullClause ? isNullClause : //just IS NULL
				!isNullClause && nonNullClause ? nonNullClause : // just IN ()
				`(${isNullClause} OR ${nonNullClause})`; // else both
		} else {
			clause = `${fieldName} = ${value}`
		}

		return clause;
	}

	queryCountClimbers() {

		if (!this.validateFields('count_climbers')) return;

		const $container = $('.query-parameters-container[data-query-name="count_climbers"]');
		const $whereFields = $container.find(`
				.field-container.collapse.show .where-clause-field:not(.hidden), 
				.field-container.collapse.show .where-clause-field.datetime-query-option
			`)
			.filter((_, el) => !$(el).closest('.collapse:not(.show)').length)
		let whereClauses = $whereFields.map((_, el) => {
				const $el = $(el);
				// If this is a datetime query option, need to combine it with the operator value
				if ($el.is('.datetime-query-option')) {
					const operator = $el.siblings('.query-option-operator').val();
					const $betweenFields = $el.siblings('.query-option-double-value-container').find('.double-value-field');
					const whereValue = operator === 'BETWEEN' ? 
						$betweenFields.map((_, f) => `'${f.value}'`).get().join(' AND ') :
						`'${$el.val()}'`;
					return `${el.name} ${operator} ${whereValue}`;
				} 
				// Otherwise, it's a normal field. In this case, multiple select values need to be gathered in an array, whereas normal fields just need 'fieldname = value'
				else {
					return this.whereFieldToClause(el);
				}
			}).get()
			.join(' AND ');
		
		// If there were any WHERE clauses, add the "WHERE" to the beginning
		if (whereClauses.length) whereClauses = `WHERE ${whereClauses}`;
		
		// Get field/value pairs to be able to get human-readable values
		const whereFields = Object.fromEntries(
			$whereFields.map((_, el) => [[el.name, $(el).data('validation-field-name') || $(el).siblings('.field-label').text()]]).get()
		);

		let pivotField = '',
			pivotAlias = '',
			groupBySelectFields = [],
			groupByAliases = [],
			additionalStats = '',
			outerSelectClause = '',
			innerSelectStatement = '',
			joins = '',
			groupByClause = '';
		
		const returnData = $('#count_climbers-summary_or_records').val()
		if (returnData === 'summary') {
			// Collect the group by fields in an object with key/value pairs as field_name: alias 
			const groupByFields = Object.fromEntries(
				$('#count_climbers-group_by_fields').val()
					.map(field => [field, $(`#count_climbers-group_by_fields option[value="${field}"]`).text()])
			);

			innerSelectStatement = this.countClimbersBySelectMap[$('#count_climbers-count_field').val()];
			if (!innerSelectStatement) {
				console.error('Invalid selectFrom option: ' + $('#count_climbers-count_field').val());
				return;
			}

			// Get pivot field
			const $pivotFieldSelect = $('#count_climbers-pivot_field');
			pivotField = $pivotFieldSelect.val();
			pivotAlias = pivotField ? $pivotFieldSelect.find(`option[value=${pivotField}]`).text() : '';
			const pivotSelect = pivotField.endsWith('_code') ? 
				`${pivotField}s.name AS "${pivotAlias}"` :
				`${pivotField} AS "${pivotAlias}"`
				;

			for (const field in groupByFields) {
				if (field.endsWith('_code')) {
					joins += `LEFT JOIN ${field}s ON ${field}=${field}s.code `
				} 
			}
			if (pivotField && pivotField.endsWith('_code')) joins += `LEFT JOIN ${pivotField}s ON ${pivotField}=${pivotField}s.code `;

			// get string of the fields to select with aliases (e.g., SELECT field AS alias, ...). For lookup fields, show the display name from the *_codes table rather than the numeric code
			groupBySelectFields = Object.entries(groupByFields).map(this.fieldToSelectAlias).join(', ');
			const groupByFieldSelects = pivotField ? `${pivotSelect}, ${groupBySelectFields}` : groupBySelectFields;
			outerSelectClause = `${groupByFieldSelects} ${additionalStats}, count(*) AS "Count"`;
			groupByAliases = Object.values(groupByFields);
			let groupByAliasString = pivotField ? 
				`"${pivotAlias}", "${groupByAliases.join('", "')}"` : 
				`"${groupByAliases.join('", "')}"`;
			groupByClause = `GROUP BY ${groupByAliasString} ORDER BY ${groupByAliasString}`;

			const pivotAndGroupByAliases = groupByAliases.concat([pivotAlias])
			if (['Day', 'Day of year'].some(alias => pivotAndGroupByAliases.includes(alias))) {
				const startSearchDate = $('#count_climbers-day_search_start').val();
				const endSearchDate = $('#count_climbers-day_search_end').val();
				joins += ` INNER JOIN (SELECT generate_series('${startSearchDate}', '${endSearchDate}', interval '1 day') AS day) days ON day BETWEEN actual_departure_date AND actual_return_date`
			}

			// The columns of the result will change with each query, so set it here
			this.queries.count_climbers.columns = groupByAliases.concat(['Count']);
			this.queries.count_climbers.hrefs = {} // reset in case a raw-data query was run before

			// Get stat fields
			for (const el of $('.stat-field-row:not(.cloneable)')) {
				const $row = $(el);
				const $statNameSelect = $row.find('.numeric-stat-name');
				const $fieldNameSelect = $row.find('.numeric-stat-field-name');
				const stat = $statNameSelect.val();
				const fieldName = $fieldNameSelect.val();
				const fieldDisplayName = $fieldNameSelect.find(`option[value="${fieldName}"]`).text();
				const statDisplayName = $statNameSelect.find(`option[value="${stat}"]`).text();
				const columnName = `${statDisplayName} ${fieldDisplayName}`;
				outerSelectClause += `, round(${stat}(${fieldName}), 1) AS "${columnName}"`;
				this.queries.count_climbers.columns.push(columnName);
			}

		} else { // otherwise this is a raw-data query

			// Add joins for lookup tables so the "WHERE"-criteria fields 
			//	can show human-readable values, not numeric codes
			for (const field of Object.keys(whereFields)) {
				if (field.endsWith('_code')) {
					joins += `LEFT JOIN ${field}s ON ${field}=${field}s.code `
				}
			}
			// Get aliases to add to query info .columns property
			const whereFieldAliases = Object.values(whereFields);
			// Get WHERE-criteria field part of SELECT clause because this will be the same 
			//	regardless of which raw-data query is run
			const whereFieldSelectString = Object.entries(whereFields).map(this.fieldToSelectAlias).join(', '); 
			if (returnData === 'climbers') {
				this.queries.count_climbers.columns = ['Climber name', ...whereFieldAliases];
				outerSelectClause = 'climber_name AS "Climber name", climber_id, ' + whereFieldSelectString;
				innerSelectStatement = this.countClimbersBySelectMap.climbers;
				this.queries.count_climbers.hrefs = {'Climber name': 'climbers.html?id={climber_id}'}
			} else if (returnData === 'expeditions') {
				this.queries.count_climbers.columns = ['Expedition name', ...whereFieldAliases];
				outerSelectClause = 'expedition_name AS "Expedition name", expedition_id, ' +  whereFieldSelectString;
				innerSelectStatement = `SELECT DISTINCT ON (expedition_id) * FROM ${this.dbSchema}.all_climbs_view`;
				this.queries.count_climbers.hrefs = {'Expedition name': 'expeditions.html?id={expedition_id}'};
			}
		}

		let sql = this.queries.count_climbers.sql
			.replace('{outer_select}', outerSelectClause)
			.replace('{inner_select}', innerSelectStatement)
			.replace('{where_clauses}', whereClauses)
			.replace('{joins}', joins)
			.replace('{group_by}', groupByClause);

		this.submitQuery(
			sql, 
			{
				queryName: 'count_climbers', 
				showResult: !groupBySelectFields.length || !pivotField //only show the result with the default display function if the result shouldn't be pivoted (raw data or simple group-by)
			}
		).done(queryResultString => {
			if (pivotField && !this.queryReturnedError(queryResultString)) {
				const result = $.parseJSON(queryResultString);
				let groupValues = {};
				let pivotValues = [];
				for (const row of result) {

					const groupByValues = Object.fromEntries(groupByAliases.map(alias => [alias, row[alias]]));
					const groupByValueString = Object.values(groupByValues).toString();
					const pivotValue_ = row[pivotAlias];
					const count = Object.fromEntries([[pivotValue_, row.Count]]);
					groupByValues.idString = groupByValueString;
					groupValues[groupByValueString] = {...groupValues[groupByValueString] || groupByValues, ...count}
					pivotValues.push(pivotValue_)
				}

				let pivotedResult = []
				pivotValues = [...new Set(pivotValues)].sort();
				// Fill nulls with 0 for each row
				for (const pivotedRow of Object.values(groupValues)) {
					for (const pivotValue_ of pivotValues) {
						if (!pivotedRow[pivotValue_]) pivotedRow[pivotValue_] = 0;
					}
					pivotedResult.push(pivotedRow);
				}

				this.queries.count_climbers.columns = groupByAliases.concat(pivotValues);
				this.result = this.sortDataArray(pivotedResult, 'idString');

				this.showResult(this.result, 'count_climbers');
			}
		});
	}


	onRunQueryButtonClick() {
		const queryName = $('.query-option.selected').data('query-name');
		if (queryName === 'guide_company_client_status') {
			this.queryGuidedClientStatus();
		} else if (queryName === 'count_climbers') {
			this.queryCountClimbers();
		} else if (queryName === 'expedition_by_name_id') {
			this.queryExpeditionByNameOrID();
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
			FROM ${this.dbSchema}.expeditions 
			ORDER BY 1 DESC`;
		return this.queryDB(sql)
			.done(queryResultString => {
				if (!this.queryReturnedError(queryResultString)) {
					$('.year-select-field.nullable').append(`<option value=" IS NOT NULL">All</option>`);
					for (const row of $.parseJSON(queryResultString)) {
						$('.year-select-field:not(.nullable)').append(`<option value=${row.year}>${row.year}</option>`);
						$('.year-select-field.nullable').append(`<option value="= ${row.year}">${row.year}</option>`);
					}
				}
			})
	}


	queryRouteCodes() {
		return this.queryDB(`
			SELECT route_codes.*, mountain_codes.name AS mountain_name 
			FROM ${this.dbSchema}.route_codes 
				JOIN ${this.dbSchema}.mountain_codes ON mountain_codes.code=route_codes.mountain_code 
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
				title_text: `Client Status for ${guideCompanyName} as of ${dateString}`,
				columns: JSON.stringify(this.queries.guide_company_client_status.columns)
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

		return super.init()
			.then(() => {
				this.configureMainContent();

				// Need guide company info for guide company query exports
				this.queryDB(`SELECT * FROM ${this.dbSchema}.guide_company_codes WHERE sort_order IS NOT NULL`)
					.done(queryResultString => {
						if (this.queryReturnedError(queryResultString)) {
							print('Failed to get guide company names. Returned result: ' + queryResultString)
						} else {
							for (const row of $.parseJSON(queryResultString)) {
								this.guideCompanies[row.code] = {...row}
							}
						}
					})

				return [
					...this.fillAllSelectOptions(),
					this.fillYearSelects(),
					this.queryRouteCodes()
				]
			})
			.then(() => {
				// Initialize select2s individually because the width needs to be set depending on the type of select
				for (const el of $('.climberdb-select2')) {
					const $select = $(el);
					$select.select2({
						width: $select.siblings('.hide-query-parameter-button').length ? 'calc(100% - 28px)' : '100%',
						placeholder: $select.attr('placeholder')
					});
					// .select2 removes the .default class for some reason
					$select.addClass('default');
				}

				// Remove the "None" option for guide company accounting queries
				setTimeout(() => {
					$('.remove-null-guide-option option[value=-1]').remove()
					$('.has-null-option').append('<option value="null">Null</option>');
				}, 500);
				
				$('#query-option-list .query-option').first().click();
			})
			.always(() => {
				hideLoadingIndicator();
			});
	}
}