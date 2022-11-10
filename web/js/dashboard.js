class ClimberDBDashboard extends ClimberDB {
	
	constructor() {
		super();
		this.flaggedExpeditionInfo = [];
		this.missingPaymentOrSUPInfo = [];
		return this;
	}

	configureMainContent() {
		const now = new Date();
		$('.main-content-wrapper').append(`
			<div class="main-dashboard-container container-fluid">
				<!-- season mountain stats -->
				<div class="col-md px-2">
					<div id="season-mountain-stats-card" class="card dashboard-card">
						<h2 class="dashboard-card-header">Mountain Stats This Season</h2>
						<div class="dashboard-card-body">
							<table class="climberdb-dashboard-table">
								<thead>
									<tr>
										<th></th>
										<th>Denali</th>
										<th>Foraker</th>
									</th>
								</thead>
								<tbody>
								</tbody>
							</table>
						</div>
					</div>
				</div>
				<!-- flagged expeditions -->
				<div class="col-md px-2">
					<div id="flagged-groups-card" class="card dashboard-card">
						<h2 class="dashboard-card-header">Flagged Expeditions</h2>
						<div class="dashboard-card-body">
							<table class="climberdb-dashboard-table">
								<thead>
									<tr>
										<th>
											<button class="text-only-button sort-column-button" data-field-name="expedition_name">
												<span>Name</span>
												<i class="fa fa-solid fa-sort fa-circle-sort-up"></i>
											</button>
										</th>
										<th>
											<button class="text-only-button sort-column-button sorted" data-field-name="departure">
												<span>Departure</span>
												<i class="fa fa-solid fa-sort fa-circle-sort-up"></i>
											</button>
										</th>
										<th>Commments</th>
									</tr>
								</thead>
								<tbody>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<!-- group status -->
				<div class="col-md px-2">
					<div id="group-status-card" class="card dashboard-card">
						<h2 class="dashboard-card-header w-100 centered-text">Group Status</h2>
						<div class="dashboard-card-body h-100">
							<div class="group-status-graph-container">
								<div class="group-status-row" data-status-code="1">
									<label class="group-status-bar-label">Pending</label>
									<div class="group-status-bar-container">
										<div class="group-status-bar"></div>
										<div class="group-status-bar-text count-up"></div>
										<div class="group-status-bar-dropdown">
											<div class="group-status-bar-dropdown-header">
												<button class="close text-only-button">&times</button>
											</div>
											<div class="group-status-bar-dropdown-content">
											</div>
										</div>
									</div>
								</div>
								<div class="group-status-row" data-status-code="2">
									<label class="group-status-bar-label">Ready for review</label>
									<div class="group-status-bar-container">
										<div class="group-status-bar"></div>
										<div class="group-status-bar-text count-up"></div>
										<div class="group-status-bar-dropdown">
											<div class="group-status-bar-dropdown-header">
												<button class="close">&times</button>
											</div>
											<div class="group-status-bar-dropdown-content">
											</div>
										</div>
									</div>
								</div>
								<div class="group-status-row" data-status-code="3">
									<label class="group-status-bar-label">Confirmed</label>
									<div class="group-status-bar-container">
										<div class="group-status-bar"></div>
										<div class="group-status-bar-text count-up"></div>
										<div class="group-status-bar-dropdown">
											<div class="group-status-bar-dropdown-header">
												<button class="close">&times</button>
											</div>
											<div class="group-status-bar-dropdown-content">
											</div>
										</div>
									</div>
								</div>
								<div class="group-status-row" data-status-code="4">
									<label class="group-status-bar-label">On mountain</label>
									<div class="group-status-bar-container">
										<div class="group-status-bar"></div>
										<div class="group-status-bar-text count-up"></div>
										<div class="group-status-bar-dropdown">
											<div class="group-status-bar-dropdown-header">
												<button class="close">&times</button>
											</div>
											<div class="group-status-bar-dropdown-content">
											</div>
										</div>
									</div>
								</div>
								<div class="group-status-row" data-status-code="5">
									<label class="group-status-bar-label">Off mountain</label>
									<div class="group-status-bar-container">
										<div class="group-status-bar"></div>
										<div class="group-status-bar-text count-up"></div>
										<div class="group-status-bar-dropdown">
											<div class="group-status-bar-dropdown-header">
												<button class="close">&times</button>
											</div>
											<div class="group-status-bar-dropdown-content">
											</div>
										</div>
									</div>
								</div>
								<div class="group-status-row" data-status-code="6">
									<label class="group-status-bar-label">Cancelled</label>
									<div class="group-status-bar-container">
										<div class="group-status-bar"></div>
										<div class="group-status-bar-text count-up"></div>
										<div class="group-status-bar-dropdown">
											<div class="group-status-bar-dropdown-header">
												<button class="close">&times</button>
											</div>
											<div class="group-status-bar-dropdown-content">
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="w-100"></div>

				<!-- breifings per day -->
				<div class="col-lg-8 px-2">
					<div class="card dashboard-card">
						<h2 class="dashboard-card-header w-100 centered-text">Scheduled Expedition Briefings per Day</h2>
						<div class="scrollable-chart-and-axis-wrapper">
							<div class="scrollable-chart-outer-wrapper">
								<div class="scrollable-chart-inner-wrapper">
									<canvas id="daily-briefings-chart" class="climberdb-chart" height="310"></canvas>
								</div>
							</div>
							<!-- for a horizontally scrollable chart, the axis has to be a separate plot outside the scrollable div-->
							<canvas id="daily-briefings-axis" class="climberdb-chart" height="310" width="0"></canvas>
						</div>
					</div>
				</div>

				<!-- expeditions that still need to pay and turn in application -->
				<div class="col-md px-2">
					<div id="missing-sup-fee-groups-card" class="card dashboard-card">
						<h2 class="dashboard-card-header">Missing SUP or Climber Fee</h2>
						<div class="dashboard-card-body">
							<table class="climberdb-dashboard-table">
								<thead>
									<tr>
										<th>
											<button class="text-only-button sort-column-button" data-field-name="expedition_name">
												<span>Name</span>
												<i class="fa fa-solid fa-sort fa-circle-sort-up"></i>
											</button>
										</th>
										<th>
											<button class="text-only-button sort-column-button sorted" data-field-name="days_to_departure">
												<span>Days to Departure</span>
												<i class="fa fa-solid fa-sort fa-circle-sort-up"></i>
											</button>
										</th>
										<th>Missing SUP</th>
										<th>Missing payment</th>
									</r>
								</thead>
								<tbody>
								</tbody>
							</table>
						</div>
					</div>
				</div>

			</div>
		`);

		$('.group-status-bar-container').click(e => {
			const $container = $(e.target).closest('.group-status-bar-container');
			$container.find('.group-status-bar-dropdown').toggleClass('show');
		});

		$('.sort-column-button').click(e => {
			const $button = $(e.target).closest('.sort-column-button');
			// if the column was already sorted and descending, then make it ascending. 
			//	Otherwise, the column will be sorted ascending
			let sortAscending;
			const isSorted = $button.is('.sorted');
			if (isSorted) {
				sortAscending = $button.is('.descending')
			} else {
				sortAscending = true;
			}

			const fieldName = $button.data('field-name');
			
			if ($button.closest('.dashboard-card').is('#flagged-groups-card')) {
				this.sortFlaggedExpeditions({sortField: fieldName, ascending: sortAscending});
			} else {
				this.sortMisingPaymentOrSUP({sortField: fieldName, ascending: sortAscending})
			}

			$('.sort-column-button').removeClass('sorted');
			$button.addClass('sorted')
				.toggleClass('descending', !sortAscending);
		});
	}

	configureDailyMountainStats() {
		const year = (new Date()).getFullYear()
		// Collect data, then add to table since order matters and the queries won't necessarily return results in order
		const tableData = {};
		
		// registered climbers
		const registeredSQL = `
			SELECT 
				mountain_name,
				count(climber_id) AS value
			FROM 
			 	(
				 	SELECT DISTINCT 
						climber_id, 
						planned_departure_date, --remove if counting climbers not climbs
						mountain_name
					FROM all_checked_in_climbers_view
					WHERE planned_departure_date >= '${year}-1-1'
				) t
			GROUP BY mountain_name
			ORDER BY mountain_name;
		`;
		const nullResult = [
			{mountain_name: 'Denali', value: 0},
			{mountain_name: 'Foraker', value: 0} 
		]
		
		const processResult = (queryResultString, statName, displayName) => {
			tableData[statName] = {displayName: displayName}
			if (this.queryReturnedError(queryResultString)) {
				print(`${statName} query failed with result: ${queryResultString}`);
				tableData[statName].data = [...nullResult];
			} else {
				let result = $.parseJSON(queryResultString);
				// In case the query returns nothing, set the values to 0
				if (!result.length) {
					result = [...nullResult];
				} else if (!Object.values(result).filter(row => row.mountain_name === 'Denali').length) {
					result.push({mountain_name: 'Denali', value: 0})
				} else if (!Object.values(result).filter(row => row.mountain_name === 'Foraker').length) {
					result.push({mountain_name: 'Foraker', value: 0})
				}
				tableData[statName].data = result;
			}
		}

		const registeredDeferred =  this.queryDB(registeredSQL)
			.done(queryResultString => {
				processResult(queryResultString, 'registered', 'Registered climbers');
			})
			.fail((xhr, status, error) => {
				print('Registered climber query failed with error: ' + error);
				tableData.registered = {
					displayName: 'Registered climbers',
					data: [...nullResult]
				}
			});

		// on the mountain
		const onMountainSQL = `
			SELECT 
				mountain_name,
				count(climber_id) AS value
			FROM 
				(
					SELECT DISTINCT 
						climber_id, 
						planned_departure_date, --remove if counting climbers not climbs
						mountain_name
					FROM all_checked_in_climbers_view
					WHERE 
						planned_departure_date >= '${year}-1-1' AND 
						reservation_status_code = 4 --4 == briefing complete
				) t
			GROUP BY mountain_name
			ORDER BY mountain_name;
		`;
		const onMountainDeferred =  this.queryDB(onMountainSQL)
			.done(queryResultString => {
				processResult(queryResultString, 'onMountain', 'On the Mountain');
			})
			.fail((xhr, status, error) => {
				print('Registered climber query failed with error: ' + error);
				tableData.onMountain = {
					displayName: 'On the Mountain',
					data: [...nullResult]
				};
			});

		// off mountain
		const offMountainSQL = `
			SELECT 
				mountain_name,
				count(climber_id) AS value
			FROM 
				(
					SELECT DISTINCT 
						climber_id, 
						mountain_name
					FROM all_checked_in_climbers_view
					WHERE 
						planned_departure_date >= '${year}-1-1' AND 
						reservation_status_code = 5 --5 == returned
				) t
			GROUP BY mountain_name
			ORDER BY mountain_name;
		`;
		const offMountainDeferred =  this.queryDB(offMountainSQL)
			.done(queryResultString => {
				processResult(queryResultString, 'offMountain', 'Done and off Mountain');
			})
			.fail((xhr, status, error) => {
				print('Registered climber query failed with error: ' + error);
				tableData.offMountain = {
					displayName: 'Done and off Mountain',
					data: [...nullResult]
				};
			});

		// summited
		const summitedSQL = `
			SELECT 
				mountain_name,
				count(climber_id) AS value
			FROM 
				(
					SELECT DISTINCT 
						climber_id, 
						planned_departure_date,
						mountain_name,
						reservation_status_code
					FROM all_checked_in_climbers_view
					WHERE 
						planned_departure_date >= '${year}-1-1' AND 
						reservation_status_code = 5 AND
						route_was_summited
				) t
			GROUP BY mountain_name
			ORDER BY mountain_name;
		`;
		const summitedDeferred =  this.queryDB(summitedSQL)
			.done(queryResultString => {
				processResult(queryResultString, 'summited', 'Summits');
			})
			.fail((xhr, status, error) => {
				print('Registered climber query failed with error: ' + error);
				tableData.summited = {
					displayName: 'Summits',
					data: [...nullResult]
				};
			});

		function addData(rowData, statDisplayName) {
			$(`
				<tr>
					<td>${statDisplayName}</td>
					<td>${rowData[0].value}</td>
					<td>${rowData[1].value}</td>
				</tr>
			`).appendTo($('#season-mountain-stats-card .climberdb-dashboard-table tbody'))
		}
		return $.when(
			registeredDeferred, 
			onMountainDeferred, 
			offMountainDeferred, 
			summitedDeferred
		).then(() => {
			// Add summit percentage
			tableData.summitPercent = {displayName: 'Summit percentage', data: []};
			tableData.summitPercent.data.push({
				mountain_name: 'Denali',
				value: Math.round(
					tableData.summited.data[0].value / 
					(tableData.offMountain.data[0].value || 1) // if offMountain is 0, avoid 0 in denominator
					* 100
				) + '%'
			});
			tableData.summitPercent.data.push({
				mountain_name: 'Foraker',
				value: Math.round(
					tableData.summited.data[1].value /  // ****** breaks when no summits
					(tableData.offMountain.data[1].value || 1) 
					* 100
				) + '%'
			});

			for (const statName of ['registered', 'onMountain', 'offMountain', 'summited', 'summitPercent']) {
				addData(tableData[statName].data, tableData[statName].displayName);
			}

		});
	}

	/*
	Return an array of objects sorted by a given field
	*/
	sortDataArray(data, sortField, {ascending=true}={}) {
		return data.sort((a, b) => {
				return ((a[sortField] > b[sortField]) - (b[sortField] > a[sortField])) * (ascending ? 1 : -1);
			})
	}

	/*
	Helper method to fill the flagged groups table. Called on load and whenever a column header 
	in the flagged groups table is clicked
	*/
	sortFlaggedExpeditions({sortField=null, ascending=true}={}) {
		
		// Clear the table
		const $tableBody = $('#flagged-groups-card .climberdb-dashboard-table tbody')
			.empty();

		if (sortField) {
			this.flaggedExpeditionInfo = this.sortDataArray(this.flaggedExpeditionInfo, sortField, {ascending: ascending});
		}

		for (const info of this.flaggedExpeditionInfo) {
			$(`<tr>
				<td><a href="expeditions.html?id=${info.expedition_id}" target="_blank">${info.expedition_name}</a></td>
				<td class="centered-text">${info.departure}</td>
				<td>${info.flagged_comments}</td>
			</tr>`).appendTo($tableBody)
		}
	}

	configureFlaggedGroups() {
		const sql = `
			SELECT 
				expedition_name, 
				to_char(planned_departure_date, 'Mon DD') AS departure, 
				to_char(planned_return_date, 'Mon DD') AS return, 
				gb.* 
			FROM expeditions 
			JOIN (
				SELECT 
					expedition_id, 
					replace(string_agg(flagged_reason, ';'), ';;', ';') AS flagged_comments 
				FROM expedition_members 
				WHERE flagged 
				GROUP BY expedition_id
			) gb ON expeditions.id=expedition_id
			WHERE planned_departure_date >= now()::date
			ORDER BY planned_departure_date;`
		
		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					console.log('error querying flagged: ' + queryResultString)
				} else {
					
					this.flaggedExpeditionInfo = $.parseJSON(queryResultString);
					this.sortFlaggedExpeditions();
				}
			})
	}


	/*
	Helper method to fill the flagged groups table. Called on load and whenever a column header 
	in the flagged groups table is clicked
	*/
	sortMisingPaymentOrSUP({sortField=null, ascending=true}={}) {
		
		// Clear the table
		const $tableBody = $('#missing-sup-fee-groups-card .climberdb-dashboard-table tbody')
			.empty();

		if (sortField) {
			this.missingPaymentOrSUPInfo = this.sortDataArray(this.missingPaymentOrSUPInfo, sortField, {ascending: ascending});
		}

		for (const info of this.missingPaymentOrSUPInfo) {
			$(`<tr>
				<td><a href="expeditions.html?id=${info.expedition_id}" target="_blank">${info.expedition_name}</a></td>
				<td class="centered-text">${info.days_to_departure}</td>
				<td class="centered-text">${info.missing_sup || ''}</td>
				<td class="centered-text">${info.missing_payment || ''}</td>
			</tr>`).appendTo($tableBody)
		}
	}

	configureMisingPaymentOrSUP() {
		const sql = `
			SELECT 
				expedition_name, 
				extract(days FROM planned_departure_date - now()) AS days_to_departure, 
				sup.missing_sup, 
				sup.expedition_id,
				fee.missing_payment 
			FROM expeditions 
			LEFT JOIN (
				SELECT 
					expedition_id, 
					count(id) AS missing_sup
				FROM expedition_members 
				WHERE NOT application_complete
				GROUP BY expedition_id
			) sup ON expeditions.id=sup.expedition_id 
			LEFT JOIN (
				SELECT 
					expedition_id, 
					count(expedition_member_id) AS missing_payment
				FROM (
					SELECT
						expedition_id,
						expedition_member_id,
						sum(transaction_value) AS balance
					FROM expedition_members
					JOIN transactions ON expedition_members.id=transactions.expedition_member_id
					WHERE transaction_type_code IN (3, 10, 12, 14, 15, 23, 24) 
					GROUP BY expedition_id, expedition_member_id
				) climbing_fee_balance 
				WHERE balance > 0::MONEY
				GROUP BY expedition_id
			) fee ON expeditions.id=fee.expedition_id
			WHERE planned_departure_date >= now()::date 
			ORDER BY days_to_departure, expedition_name;`
		
		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					console.log('error querying flagged: ' + queryResultString)
				} else {
					
					this.missingPaymentOrSUPInfo = $.parseJSON(queryResultString);
					this.sortMisingPaymentOrSUP();
				}
			})
	}

	configureGroupStatusGraph() {

		const year = (new Date()).getFullYear();

		const sql = `
			SELECT DISTINCT
				expedition_id,
				expedition_name,
				group_status_code,
				group_status_codes.name AS group_status,
				planned_departure_date
			FROM expedition_info_view JOIN group_status_codes ON group_status_code = group_status_codes.code
			WHERE planned_departure_date > '${year}-1-1' 
			ORDER BY expedition_name;
		`;
		return this.queryDB(sql)
			.done((queryResultString) => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(
						`An error occurred while querying group status. Make sure you're` + 
						` connected to the NPS network and reload the page. If the` + 
						` problem persists, contact your IT administrator.`, 
						'Database error'
					);
				} else {
					const dropdowns = {};
					const nExpeditions = {};
					for (const row of $.parseJSON(queryResultString)) {
						const status = row.group_status_code;
						if (!(status in nExpeditions)) nExpeditions[status] = 0;
						nExpeditions[status] ++;
						const $dropdown = $(`.group-status-row[data-status-code="${status}"] .group-status-bar-dropdown-content`).append(
							$(`<a class="group-status-link" href="expeditions.html?id=${row.expedition_id}" target="_blank">${row.expedition_name}</a>`)
						);
						//if (!(status in dropdowns)) dropdowns[status] = $dropdown;
					}

					const maxGroups = Math.max(...Object.values(nExpeditions));
					for (const el of $('.group-status-bar-dropdown')) {
						const $dropdown = $(el);
						const nGroups = $dropdown.find('.group-status-link').length;
						$dropdown.siblings('.group-status-bar-text').text(nGroups);
						const width = Math.ceil(nGroups / maxGroups * 100);
						const $bar = $dropdown.siblings('.group-status-bar').css('width', width  + '%');
						if (width == 0) {
							$dropdown.closest('.group-status-bar-container').addClass('disabled');
						}
					}
					
					// Animate the group counts
					this.runCountUpAnimations();
					
				}
			})
			.fail((xhr, status, error) => {

			});

	}


	configureDailyBriefingsChart() {
		const sql = `
			SELECT 
				series.briefing_date AS full_date,
				to_char(series.briefing_date, 'Mon DD') AS briefing_date, 
				coalesce(n_briefings, 0) AS n_briefings 
			FROM 
				(
					SELECT 
						generate_series(min(briefing_start), max(briefing_start), '1d')::date AS briefing_date 
					FROM briefings 
					WHERE extract(year FROM briefing_start) = extract(year FROM now())
				) series 
			LEFT JOIN 
				(
					SELECT 
						briefing_start::date AS briefing_date, 
						count(*) AS n_briefings 
					FROM briefings 
					WHERE extract(year FROM briefing_start) = extract(year FROM now())
					GROUP BY briefing_date
				) n 
			USING (briefing_date) 
			ORDER BY full_date;
		`;
		
		//for click event -> query string. Needs to be defined in outer scope to be available to click event handler
		var fullDates = []; 

		const onBarClick = (e, _, chart) => {
	        const canvasPosition = Chart.helpers.getRelativePosition(e, chart);

	        // Substitute the appropriate scale IDs
	        const index = chart.scales.x.getValueForPixel(canvasPosition.x);
	        
	        const $tooltip = getChartTooltip(chart);
	        
	        // Set the href of the tooltip so the user can open. Do this here rather than in the 
	        //	tooltip handler because the fullDates array is available within this scope
	        $tooltip.find('a').attr('href', encodeURI(`briefings.html?date=${fullDates[index]}`))

	    }

	    const onBarHover = (e, el) => {
			// show pointer cursor
			$(e.native.target).css("cursor", el[0] ? "pointer" : "default");
		}

		return this.queryDB(sql, 'climberdb')
			.done((queryResultString) => {
	        	let resultString = queryResultString.trim();
	        	if (resultString.startsWith('ERROR') || resultString === "false" || resultString === "php query failed") {
	        		alert('Unable to query briefings per day: ' + resultString);
	        		return false; // Save was unsuccessful
	        	} else {
	        		let queryResult = $.parseJSON(resultString);
	        		var data = [];
	        		var xlabels = [];
	        		for (let row of queryResult) {
	        			data.push(row.n_briefings);
	        			xlabels.push(row.briefing_date);
	        			fullDates.push(row.full_date)
	        		}
	        		var rectangleSet = false;
					const $canvas = $('#daily-briefings-chart');
					const $canvasWrapper = $canvas.parent();
					const canvasWidth = $canvasWrapper.width() * data.length / 14;
					$canvasWrapper.width(canvasWidth);

					var chart = new Chart($canvas, {
						type: 'bar',
						data: {
							labels: xlabels,
							datasets: [{
								data: data,
								backgroundColor: '#f28100',//'#FFB600'//,
								borderColor: '#f28100'//'#FFB600'//,
							}],
						},
			            maintainAspectRatio: true,
			            responsive: true,
			            options: {
			            	interaction: {
			            		mode: 'index',
			            		intersect: true
			            	},
			                tooltips: {
			                    titleFontSize: 0,
			                    titleMarginBottom: 0,
			                    bodyFontSize: 12
			                },
			                plugins: {
				                legend: {
				                    display: false
				                },
								tooltip: {
									enabled: false,
									position: 'nearest',
									external: externalTooltipHandler,
									events: ['click'] // make sure tooltip only shows when a bar is clicked
								}
				            },
			                scales: {
			                    y: {
			                        ticks: {
			                            beginAtZero: true,
			                            stepSize: 1
			                        }
			                    }
			                },
			                onClick: onBarClick,
					        onHover: onBarHover,
			                aspectRatio: canvasWidth / $canvasWrapper.height(),
			                animation: {
			                	// when the chart finishes drawing, set the scale of the independently drawn x-axis
			                    onComplete: () => {
			                        if (!rectangleSet) {
			                            var scale = window.devicePixelRatio;                       

			                            var sourceCanvas = chart.canvas;
			                            var yAxis = chart.scales.y
			                            var copyWidth = yAxis.width - 10;
			                            var copyHeight = yAxis.height + yAxis.top + 10;

			                            var targetCtx = document.getElementById("daily-briefings-axis").getContext("2d");

			                            targetCtx.scale(scale, scale);
			                            targetCtx.canvas.width = copyWidth * scale;
			                            targetCtx.canvas.height = copyHeight * scale;

			                            targetCtx.canvas.style.width = `${copyWidth}px`;
			                            targetCtx.canvas.style.height = `${copyHeight}px`;
			                            targetCtx.drawImage(sourceCanvas, 0, 0, copyWidth * scale, copyHeight * scale, 0, 0, copyWidth * scale, copyHeight * scale);

			                            var sourceCtx = sourceCanvas.getContext('2d');

			                            // Normalize coordinate system to use css pixels.
			                            sourceCtx.clearRect(0, 0, copyWidth * scale, copyHeight * scale);
			                            rectangleSet = true;
			                        }
			                    },
			                    onProgress: () => {
			                        if (rectangleSet) {
			                            var yAxis = chart.scales.y
			                            var copyWidth = yAxis.width - 10;
			                            var copyHeight = yAxis.height + yAxis.top + 10;

			                            var sourceCtx = chart.canvas.getContext('2d');
			                            sourceCtx.clearRect(0, 0, copyWidth, copyHeight);
			                        }
			                    }
			                }
			            }
					});
					// Scroll to the end (most recent)
	        		const $outerWrapper = $canvas.closest('.scrollable-chart-outer-wrapper');
	        		const scrollWidth = $outerWrapper[0].scrollWidth;
	        		const now = new Date();
	        		const minDate = new Date(`${xlabels[0]}, ${now.getFullYear()}`);
	        		const maxDate = new Date(`${xlabels[xlabels.length - 1]}, ${now.getFullYear()}`);
	        		const millisecondsPerDay = 1000 * 60 * 60 * 24;
	        		const nTotalDays = (maxDate.getTime() - minDate.getTime()) / millisecondsPerDay;
	        		const minDateToNow = (now.getTime() - minDate.getTime()) / millisecondsPerDay;
	        		const scrollDistance = (minDateToNow / nTotalDays) * scrollWidth;
	        		$outerWrapper.scrollLeft(scrollDistance);
	        	}
			})
			.fail((xhr, status, error) => {
				console.log(error)
			})

	}

	init() {
		// Call super.init()
		this.showLoadingIndicator('init');
		var initDeferreds = super.init();
		
		this.configureMainContent();
		
		$.when(
			initDeferreds,
			this.configureDailyMountainStats(),
			this.configureGroupStatusGraph(),
			this.configureDailyBriefingsChart(),
			this.configureFlaggedGroups(),
			this.configureMisingPaymentOrSUP()
		).always(() => {
			hideLoadingIndicator();
		});

		return initDeferreds;
	}
}

/* 
These two functions have to be defined the global scope because the Chart object gets confused about what "this" is. 
There's probably a better way to do this but this works for now
*/
function getChartTooltip(chart) {
	/*
	The tooltips that appear when a bar is clicked is actually just a single
	div that gets changed and repositioned each time a different bar is clicked.
	This helper function to creates the tooltip element if it doesn't exist
	or just returns it if it already does
	*/

	const $canvasWrapper = $(chart.canvas.parentNode)
	let $tooltip = $canvasWrapper.find('.climberdb-chart-tooltip');

	if (!$tooltip.length) { 
		$tooltip = $(`
			<div class='climberdb-chart-tooltip transparent'>
				<a href="#" target="_blank">View briefings</>
				<i class="tooltip-arrow"></i>
			</div>
		`);
		$canvasWrapper.append($tooltip);
	}

	return $tooltip;
}

function externalTooltipHandler(context) {
	// Tooltip Element
	const {chart, tooltip} = context;
	const $tooltip = getChartTooltip(chart);

	// Hide if no tooltip
	if (tooltip.opacity === 0) {
		$tooltip.addClass('transparent');
		return;
	}

	const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;

	// Display, position, and set styles for font
	const tooltipHeight = $tooltip[0].scrollHeight;
	var top = positionY + tooltip.caretY - tooltipHeight;
	
	// Check if the tooltip's position on top of the bar will push it outside the container
	//	If so, move it down and add a class to put the caret on top
	const tooltipOutsideView = top < 0;
	if (tooltipOutsideView) top += tooltipHeight + tooltip.caretY;
	$tooltip.find('.tooltip-arrow').toggleClass('top', tooltipOutsideView);
	
	$tooltip.removeClass('transparent');
	$tooltip.css('left', positionX + tooltip.caretX + 'px');
	$tooltip.css('top', top + 'px');
	$tooltip.css('font', tooltip.options.bodyFont.string);
	$tooltip.css('padding', tooltip.options.padding + 'px ' + tooltip.options.padding + 'px');
}