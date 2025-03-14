class ClimberDBDashboard extends ClimberDB {
	
	constructor() {
		super();
		this.flaggedExpeditionInfo = [];
		this.soloClimberInfo = [];
		this.missingPaymentOrSUPInfo = [];
		this.overduePartiesInfo = [];
		this.maps = {
			main: {
				map: null,
				layers: []
			},
			// modal: {
			// 	map: null,
			// 	layers: {}
			// }
		};
		return this;
	}

	configureMainContent() {
		const now = new Date();

		$('.group-status-bar-container').click(e => {
			const $container = $(e.target).closest('.group-status-bar-container');
			$container.find('.group-status-bar-dropdown').toggleClass('show');
		});

		// Hide the group status dropdowns when the user clicks outside of it
		$(document).on('click', e => {
			const $openDrawer = $('.group-status-bar-dropdown.show');
			if (!$(e.target).closest('.group-status-bar-container').length && $openDrawer.length) {
				$openDrawer.collapse('hide');
			}
		});

		$('.sort-column-button').click(e => {
			this.onSortDataButtonClick(e)
		});
	}


	onSortDataButtonClick(e) {
		const $button = $(e.target).closest('.sort-column-button');

		const $card = $button.closest('.dashboard-card');
		let data = 
			$card.is('#flagged-groups-card') ? this.flaggedExpeditionInfo :
			$card.is('#solo-climbers-card') ? this.soloClimberInfo :
			$card.is('#missing-sup-fee-groups-card') ? this.missingPaymentOrSUPInfo : 
			this.overduePartiesInfo;

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
		
		data = this.sortDataTable($button.closest('table'), data, {sortField: fieldName, ascending: sortAscending});

		$('.sort-column-button').removeClass('sorted');
		$button.addClass('sorted')
			.toggleClass('descending', !sortAscending);
	}
	

	configureDailyMountainStats() {
		const year = (new Date()).getFullYear()
		// Collect data, then add to table since order matters and the queries won't necessarily return results in order
		const tableData = {};
		
		// Show total number of climbers separately from per mountain total climbers
		const totalClimbersSQL = `
			SELECT 
				count(*) AS total_climbers
			FROM 
			 	(
				 	SELECT DISTINCT 
						expedition_member_id
					FROM {schema}.registered_climbs_view
					WHERE planned_departure_date BETWEEN :start_date AND :end_date
				) t
			;
		`;
		
		const startDate = `${year}-1-1`;
		const endDate = `${year}-12-31`;
		const totalClimbersDeferred = this.queryDB({
			sql: totalClimbersSQL, 
			sqlParameters: {start_date: startDate, end_date: endDate}
		}).done(response => {
			const $totalClimbersSpan = $('.total-registered-climbers-count');
			if (this.pythonReturnedError(response)) {
				print(`Total climbers query failed with result:\n${response}`);
				$totalClimbersSpan.text('ERROR');
			} else {
				const result = response.data || [];
				$totalClimbersSpan.text(result[0].total_climbers)
			}
		})
		.fail((xhr, status, error) => {
			print('Registered climber query failed with error: ' + error);
			$totalClimbersSpan.text('ERROR');
		})

		const templateSQL = `
			SELECT
				coalesce(mountain_name, 'Either') AS mountain_name,
				value
			FROM (
				SELECT 
					mountain_name,
					count(expedition_member_id) AS value
				FROM (
				 	SELECT DISTINCT 
						expedition_member_id, 
						mountain_name
					FROM (
						SELECT DISTINCT
							expedition_member_id, 
							route_code,
							mountain_name,
							reservation_status_code
						FROM ${this.dbSchema}.registered_climbs_view
						WHERE planned_departure_date BETWEEN :start_date AND :end_date 
							{where}
						ORDER BY expedition_member_id, mountain_name
					) _
				) __
				GROUP BY mountain_name
			) ____ 
		`
		const nullResult = [
			{mountain_name: 'Denali', value: 0},
			{mountain_name: 'Foraker', value: 0}
		]
		
		const processResult = (response, statName, displayName) => {
			tableData[statName] = {displayName: displayName}
			if (this.pythonReturnedError(response)) {
				print(`${statName} query failed with result:\n${response}`);
				tableData[statName].data = [...nullResult];
			} else {
				let result = response.data || [];
				// In case the query returns nothing, set the values to 0
				if (!result.length) {
					result = [...nullResult];
				} 
				result = Object.fromEntries(result.map(row => [row.mountain_name, row.value]));
				if (!('Denali' in result)) {
					result['Denali'] = 0
				}
				if (!('Foraker' in result)) {
					result['Foraker'] = 0
				}
				tableData[statName].data = result;
			}
		}

		// registered climbers
		const registeredSQL = templateSQL.replace(/\{where\}/g, '');
		const registeredDeferred =  this.queryDB({
			sql: registeredSQL, 
			sqlParameters: {start_date: startDate, end_date: endDate}
		})
		.done(response => {
			processResult(response, 'registered', 'Registered climbers');
		})
		.fail((xhr, status, error) => {
			print('Registered climber query failed with error: ' + error);
			tableData.registered = {
				displayName: 'Registered climbers',
				data: [...nullResult]
			}
		});

		// on the mountain
		const onMountainSQL = templateSQL.replace(/\{where\}/g, 'AND reservation_status_code = 4 --4 == briefing complete');
		const onMountainDeferred =  this.queryDB({
			sql: onMountainSQL, 
			sqlParameters: {start_date: startDate, end_date: endDate}
		})
		.done(response => {
			processResult(response, 'onMountain', 'On the mountain');
		})
		.fail((xhr, status, error) => {
			print('Registered climber query failed with error: ' + error);
			tableData.onMountain = {
				displayName: 'On the mountain',
				data: [...nullResult]
			};
		});

		// off mountain
		const offMountainSQL = templateSQL.replace(/\{where\}/g, 'AND reservation_status_code = 5 --5 == returned');
		const offMountainDeferred =  this.queryDB({
			sql: offMountainSQL, 
			sqlParameters: {start_date: startDate, end_date: endDate}
		})
		.done(response => {
			processResult(response, 'offMountain', 'Done and off mountain');
		})
		.fail((xhr, status, error) => {
			print('Registered climber query failed with error: ' + error);
			tableData.offMountain = {
				displayName: 'Done and off mountain',
				data: [...nullResult]
			};
		});

		// summited
		const summitedSQL = `
			SELECT
				coalesce(mountain_name, 'Either') AS mountain_name,
				value
			FROM (
				SELECT 
					mountain_name,
					count(expedition_member_id) AS value
				FROM (
				 	SELECT DISTINCT 
						expedition_member_id, 
						mountain_name
					FROM (
						SELECT DISTINCT
							expedition_member_id, 
							route_code,
							mountain_name,
							reservation_status_code
						FROM ${this.dbSchema}.registered_climbs_view
						WHERE 
							planned_departure_date BETWEEN :start_date AND :end_date AND 
							reservation_status_code = 5 AND
							summit_date IS NOT NULL
						ORDER BY expedition_member_id, mountain_name
					) _		
				) __
				GROUP BY ROLLUP(mountain_name)
			) ___ 
		`;

		const summitedDeferred =  this.queryDB({
			sql: summitedSQL, 
			sqlParameters: {start_date: startDate, end_date: endDate}
		})
		.done(response => {
			processResult(response, 'summited', 'Summits');
		})
		.fail((xhr, status, error) => {
			print('Registered climber query failed with error: ' + error);
			tableData.summited = {
				displayName: 'Summits',
				data: [...nullResult]
			};
		});

		const cancelledSQL = offMountainSQL
			.replace(/reservation_status_code = 5/g, 'reservation_status_code = 6')
			.replace(/registered_climbs_view/g, 'all_climbs_view');

		const cancelledDeferred = this.queryDB({
			sql: cancelledSQL, 
			sqlParameters: {start_date: startDate, end_date: endDate}
		})
		.done(response => {
			processResult(response, 'cancelled', 'Cancelled climbers');
		})
		.fail((xhr, status, error) => {
			print('Registered climber query failed with error: ' + error);
			tableData.offMountain = {
				displayName: 'Cancelled climbers',
				data: [...nullResult]
			};
		});

		function addData(rowData, statDisplayName) {
			return $(`
				<tr>
					<td>${statDisplayName}</td>
					<td>${rowData['Denali']}</td>
					<td>${rowData['Foraker']}</td>
				</tr>
			`).appendTo($('#season-mountain-stats-card .mountain-stats-table tbody'))
		}

		// Query BC stats
		const bcSQL = `
			SELECT
				group_status_code,
				count(*)
			FROM (
				SELECT DISTINCT  
					expedition_member_id, group_status_code 
				FROM {schema}.expedition_info_view 
				WHERE 
					group_status_code IN :status_codes AND 
					extract(year FROM actual_departure_date) = extract(year FROM now()) AND
					is_backcountry 
			) _
			GROUP BY group_status_code
		`;
		const statusCodes = this.constants.groupStatusCodes;
		const bcDeferred = this.queryDB({
			sql: bcSQL, 
			sqlParameters: {status_codes: [statusCodes.onMountain, statusCodes.offMountain]} 
		}).done(response => {
			if (!this.pythonReturnedError(response, {errorExplanation: 'There was an error while query backcountry stats to date.'})) {
				const result = response.data || []
				$('#season-mountain-stats-card .bc-stats-table tbody').append(`
					<tr>
						<td>${(result.filter(({group_status_code}) => group_status_code == statusCodes.onMountain)[0] || {}).count || 0}</td>
						<td>${(result.filter(({group_status_code}) => group_status_code == statusCodes.offMountain)[0] || {}).count || 0}</td>
					</tr>
				`)
			}
		})

		return $.when(
			totalClimbersDeferred,
			registeredDeferred, 
			onMountainDeferred, 
			offMountainDeferred, 
			summitedDeferred,
			cancelledDeferred,
			bcDeferred
		).then(() => {
			// Add summit percentage
			tableData.summitPercent = {displayName: 'Summit percentage', data: {}};
			tableData.summitPercent.data.Denali =
				Math.round(
					tableData.summited.data.Denali / 
					(tableData.offMountain.data.Denali || 1) // if offMountain is 0, avoid 0 in denominator
					* 100
				) + '%';
			tableData.summitPercent.data.Foraker = 
				Math.round(
					tableData.summited.data.Foraker / 
					(tableData.offMountain.data.Foraker || 1) 
					* 100
				) + '%';

			for (const statName of ['registered', 'onMountain', 'offMountain', 'summited', 'summitPercent', 'cancelled']) {
				const $tr = addData(tableData[statName].data, tableData[statName].displayName);
				if (statName === 'cancelled') $tr.addClass('cancelled-row')
			}

		});

	}


	configureFlaggedGroups() {
		const sql = `
			SELECT 
				expedition_name, 
				to_char(planned_departure_date, 'Mon DD') AS departure, 
				to_char(planned_return_date, 'Mon DD') AS return, 
				gb.* 
			FROM ${this.dbSchema}.expeditions 
			JOIN (
				SELECT 
					expedition_id, 
					replace(string_agg(flagged_reason, ';'), ';;', ';') AS flagged_comments 
				FROM ${this.dbSchema}.expedition_members 
				WHERE flagged 
				GROUP BY expedition_id
			) gb ON expeditions.id=expedition_id
			WHERE planned_departure_date >= now()::date
			ORDER BY planned_departure_date;`
		
		return this.queryDB({sql: sql})
			.done(response => {
				if (this.pythonReturnedError(response)) {
					print('error querying flagged: ' + response)
				} else {
					this.flaggedExpeditionInfo = response.data || [];
					this.sortDataTable($('#flagged-groups-card .climberdb-dashboard-table'), this.flaggedExpeditionInfo);
				}
			})
	}


	configureSoloClimbers() {

		const year = new Date().getFullYear();
		const sql = `
			SELECT * FROM (
				SELECT DISTINCT ON (expedition_member_id) *
				FROM ${this.dbSchema}.solo_climbs_view 
				WHERE 
				departure_date >= :start_date AND 
				group_status_code IN (3, 4)
			) _ ORDER BY departure_date
		`;
		return this.queryDB({sql: sql, sqlParameters: {start_date: `${year}-1-1`}})
			.done(response => {
				if (this.pythonReturnedError(response)) {
					print('error querying solo climbs: ' + response)
				} else {
					const result = response.data || [];
					this.soloClimberInfo = result.filter( (value, index, self) =>
						index === self.findIndex( 
							t => t.expedition_id === value.expedition_id 
						)
					)

					this.sortDataTable($('#solo-climbers-card .climberdb-dashboard-table'), this.soloClimberInfo);
				}
			})

	}


	configureMisingPaymentOrSUP() {
		
		return this.queryDB({tables: ['missing_sup_or_payment_dashboard_view']})
			.done(response => {
				if (this.pythonReturnedError(response)) {
					print('error querying missing SUP/payment: ' + response)
				} else {
					this.missingPaymentOrSUPInfo = response.data || [];
					this.sortDataTable($('#missing-sup-fee-groups-card .climberdb-dashboard-table'), this.missingPaymentOrSUPInfo);
				}
			})
	}


	configureOverdueParties() {
		
		return this.queryDB({tables: ['overdue_parties_view']})
			.done(response => {
				if (this.pythonReturnedError(response)) {
					print('error querying overdue parties: ' + response)
				} else {
					this.overduePartiesInfo = response.data || [];
					this.sortDataTable($('#overdue-parties-card .climberdb-dashboard-table'), this.overduePartiesInfo);
				}
			});
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
			FROM ${this.dbSchema}.expedition_info_view JOIN ${this.dbSchema}.group_status_codes ON group_status_code = group_status_codes.code
			WHERE 
				planned_departure_date > :start_date AND 
				NOT is_backcountry
			ORDER BY expedition_name;
		`;
		return this.queryDB({sql: sql, sqlParameters: {start_date: `${year}-1-1`}})
			.done((response) => {
				if (!this.pythonReturnedError(response, {errorExplanation: 'An error occurred while querying group status.'})) {
					const dropdowns = {};
					const nExpeditions = {};
					for (const row of response.data) {
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
						const $bar = $dropdown.siblings('.group-status-bar').css('width', width  + '%')
							.toggleClass('no-width', width === 0);
						if (width == 0) {
							$dropdown.closest('.group-status-bar-container').addClass('disabled');
						}
					}
					
					// Animate the group counts
					this.runCountUpAnimations();
					
				}
			})
			.fail((xhr, status, error) => {
				print('Error querying group status: ' + error)
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
						generate_series(min(briefing_start), max(briefing_start + '1d'::interval), '1d')::date AS briefing_date 
					FROM ${this.dbSchema}.briefings 
					WHERE extract(year FROM briefing_start) >= extract(year FROM now()) 
				) series 
			LEFT JOIN 
				(
					SELECT 
						briefing_start::date AS briefing_date, 
						count(*) AS n_briefings 
					FROM ${this.dbSchema}.briefings 
					WHERE extract(year FROM briefing_start) >= extract(year FROM now())
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

		return this.queryDB({sql: sql})
			.done(response => {
	        	if (this.pythonReturnedError(response, {errorExplanation: 'An error occurred while querying breifings.'})) {
	        		return false; // Save was unsuccessful
	        	} else {
	        		let queryResult = response.data || [];
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
					const canvasWidth = Math.max($canvasWrapper.width(), data.length * 40) //width is either current width or just make bars 40px;
					$canvasWrapper.width(canvasWidth);

					var chart = new Chart($canvas, {
						type: 'bar',
						data: {
							labels: xlabels,
							datasets: [{
								data: data,
								backgroundColor: '#f28100',
								borderColor: '#f28100',
								maxBarThickness: '60' //in pixels
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
	        		const minDate = new Date(`${fullDates[0]} 00:00`);
	        		const maxDate = new Date(`${fullDates[fullDates.length - 1]} 00:00`);
	        		const nTotalDays = (maxDate.getTime() - minDate.getTime()) / this.constants.millisecondsPerDay;
	        		const minDateToNow = minDate < now ? 
        				(now.getTime() - minDate.getTime()) / this.constants.millisecondsPerDay :
        				0;
	        		const scrollDistance = (minDateToNow / nTotalDays) * scrollWidth;
	        		$outerWrapper.scrollLeft(scrollDistance);//scrollDistance);
	        	}
			})
			.fail((xhr, status, error) => {
				console.log(error)
			})

	}


	configureBCMap() {

		const queryDeferred = this.queryDB({tables: ['current_backcountry_groups_view']})
		return $.when(
			this.configureMap('bc-groups-map', {mapObject: this.maps.main, showBackcountryUnits: false}),
			queryDeferred
		).done((_, [queryResponse]) => { // ignore .configureMap() response
			if (!this.pythonReturnedError(queryResponse, {errorExplanation: 'Backcountry groups could not be queried because there was an unexpected error.'})) {
				const icon = L.icon({
					iconUrl: '../imgs/camp_icon_50px.png',
					iconSize: [35, 35],
				});
				const result = queryResponse.data || [];
				const markerCluster = L.markerClusterGroup({
					spiderLegPolylineOptions: {color: '#fff'},
					showCoverageOnHover: false
				});
				for (const {expedition_id, expedition_name, latitude, longitude} of result) {
					const marker = L.marker([latitude, longitude], {icon: icon})
						.bindTooltip(expedition_name)
						.on('click', () => {
							// when clicked, open the backcountry page for that group in a new tab
							window.open(`backcountry.html?id=${expedition_id}`, '_blank')
						});
					markerCluster.addLayer(marker);
					this.maps.main.layers.push(marker);
				}
				markerCluster.addTo(this.maps.main.map);
				this.fitMapBoundsToLocations(this.maps.main);

				// Fill row counter
				$('#bc-groups-map-card > .dashboard-card-header > .table-row-counter')
					.text(result.length);
			}
		}).fail(() => {
			this.showModal('There was a problem loading backcountry group data', 'Database Error')
		})
	}


	init() {
		// Call super.init()
		this.showLoadingIndicator('init');
		var initDeferreds = super.init();
		
		this.configureMainContent();
		
		initDeferreds.then(() => {
			return $.when(
				this.configureDailyMountainStats(),
				this.configureGroupStatusGraph(),
				this.configureDailyBriefingsChart(),
				this.configureFlaggedGroups(),
				this.configureSoloClimbers(),
				this.configureMisingPaymentOrSUP(),
				this.configureOverdueParties(),
				this.configureBCMap()
			)
		}).always(() => {
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
