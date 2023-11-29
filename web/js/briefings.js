class ClimberDBBriefings extends ClimberDB {
	
	constructor() {
		super();
		this.briefings = {};
		this.expeditionInfo = {
			expeditions: {},
			unscheduled: []
		};
		this.edits = {};
		this.currentBriefing = {};
		this.urlQueryParams = {};
		return this;
	}


	getFormattedMonth(date=new Date()) {
		return date.toLocaleDateString('en-us', {month: 'long', year: 'numeric'});
	}


	/*
	Show the calendar for the given (0-indexed) month and year
	*/
	setCalendarDates(month, year) {
		const $calendarBody = $('.calendar-body-container').empty();

		var date = new Date(year, month, 1);

		// Add days leading up to this month
		const startDayOfWeek = date.getDay(); 
		//	Date(year, month, 0) will give last date of previous month, so use negative 
		//	start day of week + 1 to get previous month's first date of the week
		const startOfCalendar = new Date(year, month, -startDayOfWeek + 1);
		const startDate = startOfCalendar.getDate();
		for (let i = 0; i < startDayOfWeek; i++) {
			$calendarBody.append(`
				<div class="calendar-cell disabled" data-date="${getFormattedTimestamp(new Date(startOfCalendar.getTime() + this.constants.millisecondsPerDay * i))}">
					<label class="calendar-cell-date-label">${startDate + i}</label>
					<div class="calendar-cell-body"></div>
				</div>
			`);
		}

		// Get all dates for current month
		var daysInMonth = 0;
		while (date.getMonth() === month) {
			daysInMonth++;//dates.push(new Date(date));
			const dayOfMonth = date.getDate();
			$calendarBody.append(`
				<div class="calendar-cell" data-date="${getFormattedTimestamp(date)}" role="button" tabindex=0>
					<label class="calendar-cell-date-label">${dayOfMonth}</label>
					<div class="calendar-cell-body">
						<p class="briefing-calendar-entry summary hidden"></p>
					</div>
				</div>
			`);
			date.setDate(dayOfMonth + 1);
		}

		// Add days for next month
		const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 0);
		const endDayOfWeek = lastDayOfMonth.getDay();
		for (let i = 0; i + endDayOfWeek < 6; i++) { // < 6 because getDay() returns 0-indexed day of week
			$calendarBody.append(`
				<div class="calendar-cell disabled" data-date="${getFormattedTimestamp(new Date(date.getTime() + this.constants.millisecondsPerDay * i))}">
					<label class="calendar-cell-date-label">${i + 1}</label>
					<div class="calendar-cell-body"></div>
				</div>
			`);
		}

		$('.calendar-cell:not(.disabled)').click(e => {
			this.onCalendarCellClick(e);
		});

	}


	/*
	Helper method to select a given date
	*/
	selectCalendarCell(date=new Date()) {
		$(`.calendar-cell[data-date="${getFormattedTimestamp(date)}"]`).click();
	}


	getBriefingDateFromURL() {

		// Default to today
		var date = new Date();

		const params = Object.keys(this.urlQueryParams).length ? this.urlQueryParams : this.parseURLQueryString();

		// Try to create the date from the given params
		const paramDate = new Date(params.date + ' 00:00'); //** not robust -- FIX

		// Check that the date is valid. If it's not, return today
		if (paramDate instanceof Date && !isNaN(paramDate.valueOf())) {
			date = paramDate;
		}

		return date;
	} 


	/*
	Helper method to get an array of the potential appointment times from the schedule UI
	*/
	getAppointmentTimes() {
		return $('.schedule-background .half-hour-block')
			.map((_, el) => $(el).data('time'))
			.get();
	}


	/*
	Helper method to get in-memory briefing information using the selected briefing appointment
	*/
	getBriefingInfo(briefingID=null) {
		// If the briefing ID isn't given, try to get it from the selected appointment container
		// 	(if there is one)
		if (briefingID == null) {
			const $selectedAppointment = $('.briefing-appointment-container.selected');
			if (!$selectedAppointment.length) return {};
			briefingID = $selectedAppointment.data('briefing-id');
		}
		const selectedDate = $('.calendar-cell.selected').data('date');
		// If there aren't any briefings for this date, return an empty object
		if (!(selectedDate in this.briefings)) return {};

		return this.briefings[selectedDate][briefingID] || {};
	}


	configureMainContent() {
		
		this.urlQueryParams = this.parseURLQueryString();

		const calendarDate = window.location.search.length ? this.getBriefingDateFromURL() : new Date();
		
		// Configure dates
		$('#current-month-label')
			.data('current-date', getFormattedTimestamp(calendarDate))
			.text(this.getFormattedMonth(calendarDate));
		$('.briefing-details-sidebar-header').text(
			calendarDate.toLocaleDateString('en-us', {weekday: 'long', month: 'long', day: 'numeric' })
		);
		$('#input-briefing_date')
			.prop('min', `${calendarDate.getFullYear()}-1-1`)
			.prop('max', `${calendarDate.getFullYear()}-12-31`);
		
		// Set calendar for this month
		this.setCalendarDates(calendarDate.getMonth(), calendarDate.getFullYear());

		// Advance to next or previous month's calendar
		$('.show-previous-month-button, .show-next-month-button').click(e => {
			const nextButtonWasClicked = $(e.target).closest('button').is('.show-next-month-button');

			// Because the selected date is going to change, if there are unsaved edits, check what the user wants to do
			if ($('.input-field.dirty, .briefing-appointment-container.new-briefing').length) {
				// Only close the drawer if the user saves or discards, not cancels
				this.confirmSaveEdits({
					afterActionCallbackStr: `
						climberDB.closeAppointmentDetailsDrawer();
						climberDB.getPreviousNextMonth(${nextButtonWasClicked}
					`
				});
			} else {
				// No edits to worry about so just close the drawer (if it's open) and go to the next month
				this.closeAppointmentDetailsDrawer();
				this.getPreviousNextMonth(nextButtonWasClicked);
			}
			
		});

		$('button.half-hour-block:not(:last-child)')
			.hover(e => {this.onTimeSlotHover(e)}, e => {this.onTimeSlotLostHover(e)})
			.click(e => {this.onTimeSlotClick(e)});
		$('.schedule-background .half-hour-block')
			.hover(e => {this.onScheduleHover(e)}, e => {this.onScheduleLostHover(e)})
			.click(e => {this.onScheduleSlotClick(e)})

		// When the user clicks the expand or contract sidebar button, expand or contract it accordingly
		$('.change-briefing-details-size-button').click(e => {
			const $target = $(e.target);
			const $sideBar = $('.briefing-details-sidebar');
			const isExpanded = $sideBar.is('.expanded');
			$sideBar.toggleClass('expanded', $target.closest('button').is('.expand-briefing-details-button'));
		})

		// bind click events to any .briefing-appointment-containers that might be clicked
		$(document).on('click', '.briefing-appointment-container', e => {
			this.onBriefingAppointmentClick(e);
		});

		// hide the details drawer when the close button is clicked
		$('.appointment-details-header-container button.close').click(() => {
			if ($('.input-field.dirty, .briefing-appointment-container.new-briefing').length) {
				// Only close the drawer if the user saves or discards, not cancels
				this.confirmSaveEdits({
					afterActionCallbackStr: `climberDB.toggleEditing(false); $('.appointment-details-drawer').removeClass('show'); $('.briefing-appointment-container.selected').removeClass('selected')`,
				});
			} else {
				this.closeAppointmentDetailsDrawer();
			}
		});

		$('.input-field').change(e => {
			this.onInputChange(e);
		});

		$('#input-expedition').change(e => {
			this.onExpeditionChange();
		});
		$('#input-ranger').change(e => {
			this.onBriefingRangerChange(e)
		});
		$('#input-briefing_date').change(e => {
			this.onBriefingDateChange(e);
		});
		$('#input-briefing_start_time, #input-briefing_end_time').change(e => {
			this.onBriefingTimeChange($(e.target));
		});
		$('.revert-on-invalid-briefing-time').focus(e => {
			const $el = $(e.target);
			$el.data('current-value', $el.val())
		});

		$('#edit-button').click(e => {
			this.onEditButtonClick()
		});

		$('#save-button').click(e => {
			this.saveEdits();
		})

		$('#delete-button').click(e => {
			this.onDeleteButtonClick(e);
		})

		$('#open-export-modal-button').click(() => {
			$('#exports-modal').modal();
			const selectedDateStr = $('.calendar-cell.selected').data('date')
			const selectedDate = new Date(selectedDateStr + ' 00:00')
			$('#input-export_start_date').val(getFormattedTimestamp(selectedDate));
			$('#input-export_end_date').val(getFormattedTimestamp(selectedDate.addDays(6)));
		});

		$('#export-briefings-button').click(() => {
			this.onExportBriefingsClick();
		})
	}


	/*
	Show either the previous or next month's calendar
	*/
	getPreviousNextMonth(goToNext) {
		const $monthLabel = $('#current-month-label');
		const currentDate = new Date(`${$monthLabel.data('current-date')} 00:00`);
		const newDate = goToNext ? 
			new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) :
			new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
		const newMonth = newDate.getMonth();
		
		// Set the calendar with the new month's dates
		this.setCalendarDates(newMonth, newDate.getFullYear());
		
		// Select the current date if the month is the current one. Otherwise, select the first of the month
		const today = new Date((new Date()).toDateString());
		if (newMonth === today.getMonth()) {
			this.selectCalendarCell(today);
		} else {
			this.selectCalendarCell(newDate);
		}

		// Fill appointments on calendar
		this.fillCalendarBriefings();

		$monthLabel.data('current-date', getFormattedTimestamp(newDate));
		$monthLabel.text(this.getFormattedMonth(newDate));
	}


	/*
	Helper method to return a JS Date() object from the date stamp in a .calendar-cell's data attribute.
	Dates are stored in the ISO yyyy-mm-dd format, however, the Date() constructor must have a bug in it
	because new Date('yyyy-m-dd') returns the correct date with midnight as the time whereas 
	new Date('yyyy-mm-dd') returns a date from the previous day
	*/
	getDateFromCalendarCell($cell) {
		return new Date(`${$cell.data('date')} 00:00`);//needs time in string or it might return the wrong UTC date
	}

	leastCommonMultiple(array) {

		const gcd = (a, b) => !b ? a : gcd(b, a % b);

		const lcm = (a, b) => (a * b) / gcd(a, b);   

		// drop 0s
		array = array.filter(c => c)
		
		var multiple = Math.min(...array);
		for (const n of array) {
			if (!n) continue;
			multiple = lcm(multiple, n);
		}

		return multiple;
	}

	/*
	(re)Calculate the CSS grid start column (end column will fill to the max). 
		1. Find the max number of columns for any time slot
		2. Find the max start column for each briefing
	This method is called when the daily schedule details need to be loaded/changed 
	and when exporting to Excel. The setUI parameter should be set to true unless
	exporting to Excel
	*/
	setBriefingAppointmentColumns({appointmentTimes=[], dateString='', setUI=true}={}) {
		
		if (!appointmentTimes.length) appointmentTimes = this.getAppointmentTimes();

		dateString = dateString || $('.calendar-cell.selected').data('date');

		// First, loop through the briefings and determine the number of briefings per time slot
		//	Sort the briefings in descending order of duration first so that long briefings display
		//	first (further left), which is more visually coherent
		const sortedBriefings = Object.values(climberDB.briefings[dateString])
			.sort((a, b) => {
				const aDuration =  new Date(a.briefing_end) - new Date(a.briefing_start);
				const bDuration = new Date(b.briefing_end) - new Date(b.briefing_start);
				return (bDuration > aDuration) - (aDuration > bDuration);
			});
		let briefingsPerRow = appointmentTimes.map(() => []);
		let rowIndices = [];
		for (const briefing of sortedBriefings) {
			const briefingID = briefing.id;
			const [rowStart, rowEnd] = this.getAppointmentRowIndex(briefing, {appointmentTimes: appointmentTimes});
			rowIndices.push([briefingID, rowStart, rowEnd]);

			for (let i = rowStart; i < rowEnd; i++) {
				briefingsPerRow[i].push(briefingID)
			}
		}
		// Determine the total number of columns by getting the count of briefings
		//	in each time slot and calculating the lowest common multiple
		const briefingCountPerRow = briefingsPerRow.map(a => a.length);
		const uniqueCounts = [... new Set(briefingCountPerRow)];
		const nColumns = this.leastCommonMultiple(uniqueCounts);

		// Loop through the sorted briefings (longest to shortest) and set their
		//	horizontal extents
		let placedBriefings = {};
		for (const [briefingID, rowStart, rowEnd] of rowIndices) {
			// Get a 2-D array of just the rows (i.e., time slots) for the extent of this briefing
			const overlappingBriefingsPerRow = briefingsPerRow.slice(rowStart, rowEnd);
			
			// Find row with the greatest numebr of briefings. A briefing that overlaps with 
			//	multiple briefings at different times should be as narrow as its most crowded
			//	overlapping row
			const longestRow = overlappingBriefingsPerRow.reduce(
				(currentMaxRow, currentRow, currentIndex) => currentRow.length > currentMaxRow.length ? currentRow : currentMaxRow,
				overlappingBriefingsPerRow[0] // initiate currentMaxIndex to 0
			)

			// The width in columns is the total number of columns divided by the
			//	number of briefings in the most crowded row
			const briefingWidth = nColumns / longestRow.length
			
			// Because the briefings were initially sorted by length in the first for loop,
			//	the start column can be reliably calculated by getting this briefing's index
			//	in the longest row without the possibility of any briefing containers overlapping
			const startColumn = longestRow.indexOf(briefingID) * briefingWidth + 1; 
			const endColumn = startColumn + briefingWidth;

			if (setUI) {
				$(`.briefing-appointment-container[data-briefing-id=${briefingID}]`).css('grid-column', `${startColumn} / ${endColumn}`);
			}
			const id = parseInt(briefingID);
			placedBriefings[id] = {startColumn: startColumn, endColumn: endColumn}
		}

		return placedBriefings;

	}


	/*
	Helper method to get the row index of a briefing appointment. Called when adding a 
	briefing to the schedule and when exporting briefing schedule to Excel
	*/
	getAppointmentRowIndex(briefingInfo, {appointmentTimes=[]}={}) {
		if (!appointmentTimes.length) appointmentTimes = this.getAppointmentTimes();

		// Calculate the CSS grid row index for the given start and end times
		const rowIndexStart = appointmentTimes.indexOf(briefingInfo.briefing_start_time) + 1;
		const rowIndexEnd = appointmentTimes.indexOf(briefingInfo.briefing_end_time) + 1;

		return [rowIndexStart, rowIndexEnd]
	}



	/*
	Helper method to add an appointment container to the sidebar schedule UI. This is 
	only called when a new cell is selected and the schedule needs to be filled in and 
	when discarding edits.
	*/
	addBriefingToSchedule(briefingInfo, {appointmentTimes=[]}={}) {
		
		const [rowIndexStart, rowIndexEnd] = this.getAppointmentRowIndex(briefingInfo, {appointmentTimes: appointmentTimes});

		$('.schedule-ui-container').append(`
			<div class="briefing-appointment-container" style="grid-row: ${rowIndexStart} / ${rowIndexEnd}" data-briefing-id=${briefingInfo.id} title="${briefingInfo.expedition_name}">
				<label class="briefing-appointment-header">${briefingInfo.expedition_name}</label>
				<p class="briefing-appointment-text">
					<span class="briefing-details-n-climbers">Routes: ${briefingInfo.routes.replace(/; /g, ', ')}</span><br>
					<span class="briefing-details-n-climbers">${briefingInfo.n_members}</span> climber<span class="briefing-details-climber-plural">${briefingInfo.n_members > 1 ? 's' : ''}</span><br>
					<span class="briefing-details-ranger-name">${briefingInfo.ranger_last_name || ''}</span>
				</p>
			</div>
		`);

	}


	/*
	Select the date when a calendar cell is clicked and fill any appointments on the sidebar schedule
	*/
	onCalendarCellClick(e) {
		
		// if the cell is already selected, do nothing
		const $cell = $(e.target).closest('.calendar-cell');
		if ($cell.is('.selected')) return;

		// Clear old date's appointments
		$('.schedule-ui-container .briefing-appointment-container').remove();

		$('.calendar-cell.selected').removeClass('selected');
		$cell.addClass('selected');

		// Set the label of the schedule details
		const dateString = $cell.data('date');
		const selectedDate = this.getDateFromCalendarCell($cell);
		$('.briefing-details-sidebar-header')
			.text(selectedDate.toLocaleDateString('en-us', {weekday: 'long', month: 'long', day: 'numeric'}));

		// Add breifing appointments to the schedule details
		const appointmentTimes = this.getAppointmentTimes();
		const briefingAppointments = this.briefings[dateString];
		if (briefingAppointments) {
			for (const expeditionID in briefingAppointments) {
				const info = briefingAppointments[expeditionID];
				this.addBriefingToSchedule(info, {appointmentTimes: appointmentTimes})
			}
			this.setBriefingAppointmentColumns({appointmentTimes: appointmentTimes, dateString: dateString});
	
		}
		
	}


	/*Show the brieing appointment details when clicked*/
	onBriefingAppointmentClick(e) {
		$('.briefing-appointment-container.selected').removeClass('selected');

		const $container = $(e.target).closest('.briefing-appointment-container')
			.addClass('selected');
		const selectedDate = $('.calendar-cell.selected').data('date');
		const briefingID = $container.data('briefing-id');
		const $routeList = $('#appointment-details-route-list').empty();
		var info; 
		if (briefingID) {
			info = this.briefings[selectedDate][briefingID];
			const expeditionOptions = Object.values(this.expeditionInfo.expeditions)
				.filter(i => this.expeditionInfo.unscheduled.includes(i.expedition_id) || i.expedition_id == info.expedition_id);
			this.fillExpeditionsSelectOptions(expeditionOptions);
			for (const el of $('.appointment-details-drawer .input-field')) {
				this.setInputFieldValue(el, info)
			}
			for (const routeName of info.routes.split('; ')) {
				$routeList.append(`<li>${routeName}</li>`)
			}
		} else {
			const expeditionOptions = Object.values(this.expeditionInfo.expeditions)
				.filter(i => this.expeditionInfo.unscheduled.includes(i.expedition_id));
			this.fillExpeditionsSelectOptions(expeditionOptions);
			this.clearInputFields({parent: '.appointment-details-drawer', triggerChange: false});
		}


		$('.appointment-details-drawer').addClass('show');

		// Scroll to the selected container, but delay for a half second so that the 
		//	.show transition can start first
		setTimeout(() => {$container[0].scrollIntoView()}, 50);

		// clear data-current-value properties
		for (const input of $('.input-field')) {
			$(input).data('currentValue', '');
		}

		// Capture original values of the briefing so they can be reverted
		this.currentBriefing = {...info};
	}


	/*
	ClimberDB.clearInputFields() excludes any .no-option-fill inputs because these 
	usually don't have a default value. The briefing ranger field is .no-option-fill 
	but does have one, so make sure it gets reset too
	*/
	clearInputFields() {
		// Clear all inputs except .no-option-fill
		super.clearInputFields({parent: '.appointment-details-drawer', triggerChange: false});
		
		// clear .no-option-fill
		$('.appointment-details-drawer .no-option-fill').val('').addClass('default');
	}

	/*
	Helper method to close the details drawer
	*/
	closeAppointmentDetailsDrawer() {
		
		this.clearInputFields({triggerChange: false});

		$('.appointment-details-drawer').removeClass('show');
		$('.briefing-appointment-container.selected').removeClass('selected');
		this.toggleEditing({allowEdits: false});// turn off editing
	}


	saveEdits() {
		showLoadingIndicator('saveEdits');

		if (!$('.appointment-details-drawer .input-field.dirty').length) {
			showModal('You have not made any edits to save yet.', 'No edits to save');
			hideLoadingIndicator();
			return;
		}

		for (const el of $('.input-field:required')) {
			if (el.value === '') {
				const $input = $(el);
				const labelText = $input.siblings('.field-label').text();
				$input.addClass('error').focus();
				showModal(`Before you can save this briefing, all fields except "Briefing ranger" must be filled in and the '${labelText}' field is blank. Fill in this and any other blank fields, then try to save your changes.`, 'Empty field');
				hideLoadingIndicator();
				return;
			}
		}
		var fields = [];
		var values = [];
		const briefingDate = $('#input-briefing_date').val();
		for (const el of $('.input-field:not(#input-briefing_date, .ignore-on-save)')) {
			const $input = $(el);
			if (el.id.endsWith('_time')) {
				fields.push(el.name.replace(/_time$/, ''));
				values.push(`${briefingDate} ${el.value}`)
			} else {
				fields.push(el.name);
				values.push(el.value);
			}
		}

		// Add last modified fields
		const now = getFormattedTimestamp(new Date(), {format: 'datetime'});
		fields = fields.concat(['last_modified_time', 'last_modified_by']);
		values = values.concat([now, this.userInfo.ad_username]);

		const $selectedAppointment = $('.briefing-appointment-container.selected');
		const isInsert = $selectedAppointment.is('.new-briefing');
		var sql = '';
		if (isInsert) {
			// This is a new entry so add "entered by" fields
			fields = fields.concat(['entry_time', 'entered_by']);
			values = values.concat([now, this.userInfo.ad_username]);
			// get parametized fields
			let parametized = fields.map(f => '$' + (fields.indexOf(f) + 1))
				.join(', ');
			sql = `INSERT INTO briefings (${fields.join(', ')}) VALUES (${parametized}) RETURNING id;`;
		} else {
			const briefingID = $selectedAppointment.data('briefing-id');
			let parametized = fields.map(f => `${f}=$${fields.indexOf(f) + 1}`)
				.join(', ');
			sql = `UPDATE briefings SET ${parametized} WHERE id=${briefingID} RETURNING id;`;
		}

		return $.ajax({ 
			url: 'climberdb.php',
			method: 'POST',
			data: {action: 'paramQuery', queryString: sql, params: values},
			cache: false
		}).done(queryResultString => {
			if (this.queryReturnedError(queryResultString)) {
				showModal(
					`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}.` + 
						` Make sure you're still connected to the NPS network and try again. Contact your database` + 
						` adminstrator if the problem persists.`, 
					'Unexpected error'
				);
			} else {
				const result = $.parseJSON(queryResultString);
				const briefingID = result[0].id;

				// Update in-memory data
				if (!this.briefings[briefingDate]) this.briefings[briefingDate] = {};
				if (!this.briefings[briefingDate][briefingID]) this.briefings[briefingDate][briefingID] = {};
				
				var info = this.briefings[briefingDate][briefingID];

				for (const el of $('.input-field')) {
					info[el.name] = el.value;
				}
				info.briefing_start = info.briefing_date + ' '  + info.briefing_start_time;
				info.briefing_end = info.briefing_date + ' '  + info.briefing_end_time;
				info.expedition_name = this.expeditionInfo.expeditions[info.expedition_id].expedition_name;
				info.n_members = this.expeditionInfo.expeditions[info.expedition_id].n_members;
				info.routes = (this.expeditionInfo.expeditions[info.expedition_id].routes || '<em>none</em>').replace(/; /g, ', ');
				info.id = briefingID;

				this.briefings[briefingDate][briefingID] = {...info};
				
				const rangerID = info.briefing_ranger_user_id;
				if (rangerID) {
					const rangerName = $(`.input-field[name=briefing_ranger_user_id] option[value=${rangerID}]`).text();
					info.ranger_last_name = rangerName.split(' ').pop();
					info.ranger_first_name = rangerName.split(' ')[0];
				}

				if (isInsert) {
					// Set breifing ID and remove new-briefing class
					$selectedAppointment.attr('data-briefing-id', briefingID)
						.removeClass('new-briefing');

					// Add to the calendar cell
					this.addBriefingToCalendarCell($('.calendar-cell.selected'), info);

					this.onExpeditionChange();
					this.onBriefingTimeChange($('#input-briefing_start_time'));
					this.onBriefingTimeChange($('#input-briefing_end_time'));
					this.onBriefingRangerChange();

				}

				$('.input-field.dirty').removeClass('dirty');

			}
		}).fail((xhr, status, error) => {
			showModal(
				`An unexpected error occurred while saving data to the database: ${error}.` + 
					` Make sure you're still connected to the NPS network and try again. Contact your database` + 
					` adminstrator if the problem persists.`, 
				'Unexpected error'
			);
		}).always(() => {
			hideLoadingIndicator(); 
		})
	}


	discardEdits() {

		const $dirtyInputs = $('.input-field.dirty');

		// If there's a .new-briefing, the appointment can just be removed 
		//	because there's no im-memory data to update
		const $newBriefing = $('.briefing-appointment-container.new-briefing');
		if ($newBriefing.length) {
			$newBriefing.remove();
		}
		// Otherwise, remvoe the appointment container that reflects the 
		//	edited data and re-create it from the in-memory briefing data 
		else {
			// If the current briefing isn't new, then one is necessarily selected
			const $selectedAppointment = $('.briefing-appointment-container.selected');
			const briefingID = $selectedAppointment.data('briefing-id');
			const briefingInfo = this.getBriefingInfo(briefingID);
			if ($dirtyInputs.length) {
				$selectedAppointment.remove();
				this.addBriefingToSchedule(briefingInfo);
				this.setBriefingAppointmentColumns();
			}

		}

		// Remove any edits
		this.edits = {};
		$dirtyInputs.removeClass('dirty');

		// Hide the details drawer
		$('.appointment-details-drawer').removeClass('show');
		$('.briefing-appointment-container.selected').removeClass('selected');
	}

	/*
	Prompt user to confirm or discard edits via modal
	*/
	confirmSaveEdits({afterActionCallbackStr='', afterSaveCallbackStr='', afterDiscardCallbackStr=''}={}) {
		//@param afterActionCallbackStr: string of code to be appended to html onclick attribute for Save and Discard buttons
		//@param afterSaveCallbackStr: string of code to be appended to html onclick attribute for Save and Discard buttons
		//@param afterDiscardCallbackStr: string of code to be appended to html onclick attribute for Save and Discard buttons

		const onConfirmClick = `
			showLoadingIndicator('saveEdits');
			climberDB.saveEdits() 
		`;
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.discardEdits();${afterActionCallbackStr};${afterDiscardCallbackStr}">Discard</button>
			<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onConfirmClick};${afterActionCallbackStr};${afterSaveCallbackStr}">Save</button>
		`;
		// climberDB is a global instance of ClimberDB or its subclasses that should be instantiated in each page
		// 	this is a little un-kosher because the ClimberForm() instance is probably a property of climberDB, but
		//	the only alternative is to make showModal a global function 
		showModal(
			'You have unsaved edits to this briefing. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this briefing.',
			'Save edits?',
			'alert',
			footerButtons
		);
	}


	/*
	Enable or disable edits
	*/
	toggleEditing({allowEdits=null}={}) {

		const $detailsContainer = $('.appointment-details-body')
		const editsAllowed = allowEdits === null ? $detailsContainer.is('.uneditable') : allowEdits;
		$detailsContainer.toggleClass('uneditable', !editsAllowed);
		
		$('#save-button, #delete-button').ariaHide(!editsAllowed);
		
		// This stuff only has to happen when editing is disabled, but it doesn't 
		//	matter if it happens when it's enabled too
		this.edits = {};
		$('.input-field.dirty').removeClass('dirty');
	}

	/*
	Event handler for edit button. Check for unsaved edits. If there are any, 
	ask the user what to do. Otherwise, just toggle editing
	*/
	onEditButtonClick() {
		if (!this.showDenyEditPermissionsMessage()) return;

		const $dirtyInputs = $('.input-field.dirty');
		if ($dirtyInputs.length || $('.briefing-appointment-container.selected.new-briefing').length) {
			this.confirmSaveEdits({afterActionCallbackStr: 'climberDB.toggleEditing()'});
		} else {
			this.toggleEditing();
		}

	}


	/*
	Helper function to remove a briefing from the sidebar schedule UI
	*/
	removeBriefingFromSchedule(briefingID, {briefingDate=''}={}) {
		// remove from daily detail sidebar schedule
		$(`.briefing-appointment-container[data-briefing-id=${briefingID}]`)
			.fadeRemove();

		// remove briefing from calendar
		$(`.briefing-calendar-entry[data-briefing-id=${briefingID}]`)
			.remove();
		if (!briefingDate) briefingDate = $('.calendar-cell.selected').data('date');
		this.toggleBriefingCalendarCellEntries($(`.calendar-cell[data-date="${briefingDate}"]`));

		// Hide appointment details
		this.closeAppointmentDetailsDrawer();
	}


	deleteBriefing(briefingID) {
		// if this is a new briefing, just remove it from the UI
		if ($('.new-briefing').length) {
			this.removeBriefingFromSchedule(briefingID);
		}
		// Otherwise, delete it from the DB
		else {
			this.queryDB(`DELETE FROM briefings WHERE id=${briefingID} RETURNING id, briefing_start::date AS briefing_date`)
				.done(queryResultString => {
					if (this.queryReturnedError(queryResultString)) {
						showModal(`An error occurred while deleting the briefing: ${queryResultString}. Try again and if this problem persists, contact IT for assistance.`, 'Unexpected Error')
					} else {
						const result = $.parseJSON(queryResultString);
						// empty edits
						this.edits = {};

						// add expedition to unscheduled list
						const briefingInfo = this.getBriefingInfo(briefingID);
						this.expeditionInfo.unscheduled.push(briefingInfo.expedition_id);
						
						// remove briefing from info
						const briefingDate = result[0].briefing_date;
						delete this.briefings[briefingDate][briefingID];

						this.removeBriefingFromSchedule(briefingID, {briefingDate: briefingDate});
					}
				}).fail((xhr, status, error) => {
					console.log('Delete failed because ' + error)
				}).always(() => {hideLoadingIndicator()});
		}
	}


	onDeleteButtonClick() {
		const $selectedAppointment = $('.briefing-appointment-container.selected');
		// If this is a new briefing, just delete it
		if ($selectedAppointment.is('.new-briefing')) {
			$selectedAppointment.remove();
			this.closeAppointmentDetailsDrawer();
		} else {
			const briefingID = $selectedAppointment.data('briefing-id');
			const onConfirmClick = `
				showLoadingIndicator();
				climberDB.deleteBriefing(${briefingID}) 
			`;
			
			const footerButtons = `
				<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
				<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick};">Delete</button>
			`;
			const briefingInfo = this.getBriefingInfo(briefingID);
			var briefingStart = '';
			if (briefingInfo) {
				briefingStart = (new Date(briefingInfo.briefing_start))
					.toLocaleTimeString('en-us', {hour: 'numeric', minute: 'numeric'})
					.toLowerCase()
					.replace(/\s|:00/g, '');
			}
			const expeditionNameText = briefingInfo ? ` for <strong>${briefingInfo.expedition_name}</strong>` : '';
			const message = `Are you sure you want to delete ${briefingStart ? 'the ' : 'this'}<strong>${briefingStart}</strong> briefing${expeditionNameText}? This action is permanent and <strong>cannot be undone</strong>.`
			showModal(
				message,
				'Delete This Briefing?',
				'alert',
				footerButtons
			);
		}
	}

	/*
	Record value changes in the .edits property
	*/
	onInputChange(e) {
		const input = e.target;
		const fieldName = input.name;
		const inputValue = input.value;
		this.edits[fieldName] = inputValue;
		const $input = $(input);
		$input.addClass('dirty');
		
		// If this is a new briefing, there's no in-memory data to compare to
		const $selectedAppointment = $('.briefing-appointment-container.selected');
		if ($selectedAppointment.is('.new-briefing')) return;

		// Check if the in-memory data matches the input value. If so, remove .dirty class
		const dateString = $('.calendar-cell.selected').data('date');
		const briefingID = $selectedAppointment.data('briefing-id');
		const dbValue = this.briefings[dateString][briefingID][fieldName];
		if (inputValue == dbValue) {
			$input.removeClass('dirty');
			delete this.edits[fieldName];
		}
		
	}


	/*
	If the given briefing ranger is scheduled for any other briefings that overlap the 
	given startTime and endTime, and make sure they start at the same time and that the 
	total number of people doesn't exceed 20
	@param briefingID :: integer - datbase ID of the breifing that the user is attempting to reschedule
	@param startTime :: string - start time of the briefing to check
	@param endTime   :: string - end time of the briefing to check
	*/
	checkRangerAvailability(briefingID, startTime, endTime, {rangerID=null, date=''}={}) {
		

		// Get the duration of the briefing in question
		const selectedDate = date || $('.calendar-cell.selected').data('date');
		const startDatetime = new Date(`${selectedDate} ${startTime}`);
		const endDatetime = new Date(`${selectedDate} ${endTime}`);
		
		// Loop through all briefings for this date and check if any overlap
		const briefingAppointments = this.briefings[selectedDate];

		// If there are no briefing appointments (only possible if the user changed the date)
		//	the ranger is definitely available
		if (briefingAppointments === undefined || briefingID === undefined) return true;
		if (Object.keys(briefingAppointments).length === 0) return true;

		const nClimbers = parseInt(
			// if the briefingID is in the appointments for the date in question
			briefingID in briefingAppointments ? 
				(
					briefingAppointments[briefingID].n_members || // first try n_members
					this.expeditionInfo.expeditions[$('#input-expedition').val()].n_members || // otherwise try  
					0 // if that all fails default to 0
				) :
				 // if the ID doesn't exist the date is being changed, so get the n_members from the curretnly selected date
				this.briefings[$('.calendar-cell.selected').data('date')].n_members
		);
		rangerID = rangerID || briefingAppointments[briefingID].briefing_ranger_user_id;
		
		// The ranger has not yet been filled in so ignore this
		if (!rangerID) return true;

		const rangerName = $(`#input-ranger option[value=${rangerID}]`).text();
		var isAvailable = true;
		var nClimbersScheduled = 0;
		for (const id in briefingAppointments) {
			if (id == briefingID) continue;
			const info = briefingAppointments[id];
			const thisStartDatetime = new Date(`${selectedDate} ${info.briefing_start_time}`);
			const thisEndDatetime = new Date(`${selectedDate} ${info.briefing_end_time}`);
			const briefingOverlaps = 
				(startDatetime <= thisStartDatetime && thisStartDatetime < endDatetime) || // this start is between the start and end of the briefing in question
				(thisStartDatetime < endDatetime && endDatetime <= thisEndDatetime); // this end is between the start and end of the briefing in question
			// Check if this briefing both overlaps and is for the same ranger
			if (rangerID === info.briefing_ranger_user_id && briefingOverlaps) {
				// it's for the same ranger and it overlaps, so now we need to check if it's ocurring at the exact 
				//	same time and if the number of people exceeds the max
				if (startDatetime.toString() === thisStartDatetime.toString()) {
					nClimbersScheduled += parseInt(info.n_members || 0);
					if (nClimbersScheduled + nClimbers > this.config.max_people_per_briefing) {
						const message = rangerID == this.userInfo.id ? `You're` : `${rangerName} is` +
							` already scheduled for a briefing from ` + 
							thisStartDatetime.toLocaleTimeString('en-us', {hour: 'numeric', minute: 'numeric'}) + 
							` to ${thisEndDatetime.toLocaleTimeString('en-us', {hour: 'numeric', minute: 'numeric'})}` + 
							` with ${nClimbersScheduled} total climbers. The maximum number of climbers allowed in` + 
							` a briefing is ${this.config.max_people_per_briefing}` ;
						showModal(message, 'Scheduling conflict');
						isAvailable = false;
						break;
					}
				// If not, exit and warn the user that this overlaps
				} else {

					const message = rangerID == this.userInfo.id ? `You're` : `${rangerName} is` +
						` already scheduled for a briefing from ` + 
						thisStartDatetime.toLocaleTimeString('en-us', {hour: 'numeric', minute: 'numeric'}) + 
						` to ${thisEndDatetime.toLocaleTimeString('en-us', {hour: 'numeric', minute: 'numeric'})}.` + 
						` Briefings by the same ranger must either start at the same time or not overlap at all.` ;
					showModal(message, 'Scheduling conflict');
					isAvailable = false;
					break;
				}
			}
		}
		return isAvailable;
	}


	/*
	Helper function to make sure in-memory data and DOM values are aligned. Because 
	the current-value of any .revert-on-invalid-briefing-time inputs will update 
	whenever the input receives focus, this only works for reverting values back to 
	the last one before the event that caused the .change() event on the input to fire. 
	*/
	revertInputValue($input, {briefingInfo={}}={}) {
		const oldValue = $input.data('current-value');
		$input.val(oldValue);

		// Check if the reverted value is the same as the in-memory value queried from the DB
		// need the briefing ID if not given
		if (!Object.keys(briefingInfo).length) {
			// const $selectedAppointment = $('.briefing-appointment-container.selected');
			// const briefingID = $selectedAppointment.data('briefing-id');
			// const selectedDate = $('.calendar-cell.selected').data('date');
			briefingInfo = this.getBriefingInfo()
		}
		const fieldName = $input.attr('name');
		
		if (oldValue == briefingInfo[fieldName]) {
			// If the value is the same, delete the .edits property for this field
			delete this.edits[fieldName];
		} else {
			// Otherwise, the .edits property needs to reflect the current state 
			//	with the reverted value
			this.edits[fieldName] = oldValue;
		}
	}	


	/*
	Check that there aren't too many climbers already scheduled. If not, then change the group 
	name and number of climbers in the appointment container when the expedition changes.
	*/
	onExpeditionChange() {
		const appointmentTimes = this.getAppointmentTimes();
		
		const $selectedAppointment = $('.briefing-appointment-container.selected');
		const briefingID = $selectedAppointment.data('briefing-id');
		const selectedDate = $('.calendar-cell.selected').data('date');
		const rangerID = $('#input-ranger').val();
		const startTime = $('#input-briefing_start_time').val();
		var endTime = $('#input-briefing_end_time').val();

		let briefings, info;
		if (selectedDate in this.briefings) {
			briefings = this.briefings[selectedDate];
			if (!Object.keys(briefings).length) return;
			info = briefings[briefingID];
		}

		const $input = $('#input-expedition');
		if (!this.checkRangerAvailability(briefingID, startTime, endTime, {rangerID: rangerID})) {
			this.revertInputValue($input, {briefingInfo: info});
			return;
		}

		// Set the appointment container text
		// 	expedition name header
		const expeditionID = $input.val();
		const expeditionName = $(`#input-expedition option[value="${expeditionID}"]`).text();
		$selectedAppointment.find('.briefing-appointment-header').text(expeditionName);
		//	number of climbers
		const nClimbers = this.expeditionInfo.expeditions[expeditionID].n_members;
		$selectedAppointment.find('.briefing-details-n-climbers').text(nClimbers + ' ');
		
		// Show the word "climber" (this is only necessary for new briefings)
		$('.briefing-details-climber.hidden').removeClass('hidden');
		
		//	make "climber" plural if necessary 
		if (nClimbers > 1) $selectedAppointment.find('.briefing-details-climber-plural').text('s');

	}


	/*
	check ranger availability. If that's good, move the appointment
	*/
	onBriefingTimeChange($target) {

		const appointmentTimes = this.getAppointmentTimes();
		
		const $selectedAppointment = $('.briefing-appointment-container.selected');
		const selectedAppointmentID = $selectedAppointment.data('briefing-id');
		const selectedDate = $('.calendar-cell.selected').data('date');
		const briefingID = $selectedAppointment.data('briefing-id');

		let briefings, info;
		if (selectedDate in this.briefings) {
			briefings = this.briefings[selectedDate];
			if (!Object.keys(briefings).length || !(briefingID in briefings)) return;
			info = briefings[briefingID];
		}
		
		const oldStartTime = info.briefing_start_time;
		const oldEndTime = info.briefing_end_time;
		const oldStartIndex = appointmentTimes.indexOf(oldStartTime) + 1;
		const oldEndIndex = appointmentTimes.indexOf(oldEndTime) + 1;
		
		const newStartTime = $('#input-briefing_start_time').val();
		const newStartIndex = $(`.schedule-background .half-hour-block[data-time="${newStartTime}"]`)
			.index() + 1;
		// The duration of the briefing should only change if the end time changes, so set the end index
		const targetIsStartTime = $target.is('#input-briefing_start_time');
		var endTime = $('#input-briefing_end_time').val();
		const newEndIndex = targetIsStartTime ? 
			newStartIndex + (oldEndIndex - oldStartIndex) : // end time should change with start time
			appointmentTimes.indexOf(endTime) + 1; // just end time should change

		// Check if the start is before the end time. Only check if the end is being changed 
		//	because if it's the begining the briefing will just be bumped up or down
		if (!targetIsStartTime && newStartTime.padStart(5, '0') >= endTime.padStart(5, '0')) {
			const message = `The briefing start time must be before the end time. The start time is currently set to <strong>${newStartTime}</strong> but the end time you selected is <strong>${endTime}</strong>.`;
			showModal(message, 'Invalid Briefing End Time');
			this.revertInputValue($target, {briefingInfo: info});
			return;
		}

		const rangerID = $('#input-ranger').val();
		if (targetIsStartTime) endTime = appointmentTimes[newEndIndex - 1];
		
		if (!this.checkRangerAvailability(selectedAppointmentID, newStartTime, endTime)) { 
			this.revertInputValue($target, {briefingInfo: info});
			return;
		}

		// move appointment
		$selectedAppointment.css({
			'grid-row': `${newStartIndex}/${newEndIndex}`
		});
		$('#input-briefing_end_time').val(endTime);

		// Update this in case the input doesn't lose focus before it the user changes the value 
		//	again. This is so that it can be properly reverted to the last value the user selected
		if (targetIsStartTime) $target.data('current-value', targetIsStartTime ? newStartTime : endTime);

		// update in-memory data
		// if (info !== undefined) { // will be undefined if this is a new briefing
		// 	info.briefing_start_time = newStartTime;
		// 	info.briefing_end_time = endTime;
		// }

	}


	/*
	Only accept change if ranger is available 
	*/
	onBriefingRangerChange(e) {

		const startTime = $('#input-briefing_start_time').val();
		const endTime = $('#input-briefing_end_time').val();
		const $selectedAppointment = $('.briefing-appointment-container.selected');
		const briefingID = $selectedAppointment.data('briefing-id');
		const $input = $('#input-ranger');
		const rangerID = $input.val();
		const selectedDate = $('.calendar-cell.selected').data('date');
		
		let briefings, info;
		if (selectedDate in this.briefings) {
			briefings = this.briefings[selectedDate];
			if (!Object.keys(briefings).length) return;
			info = briefings[briefingID];
		}

		if (!this.checkRangerAvailability(briefingID, startTime, endTime, {rangerID: rangerID})) {
			this.revertInputValue($input, {briefingInfo: info});
			return;
		} 

		// Update this in case the input doesn't lose focus before it the user changes the value 
		//	again. This is so that it can be properly reverted to the last value the user selected
		$input.data('current-value', rangerID);

		// Update the ranger's last name on the schedule (unless the user selected the null option)
		if (rangerID) {
			const newRangerName = $(`#input-ranger option[value=${rangerID}]`).text();
			$selectedAppointment.find('.briefing-details-ranger-name').text(newRangerName.split(' ').pop());
		}
		// Update in-memory data if this is an existing briefing (info will be undefined if it's new)
		//if (info !== undefined) info.briefing_ranger_user_id = rangerID;
	}


	/*
	Check ranger availability. If available, switch to the new date
	*/
	onBriefingDateChange(e) {
		const startTime = $('#input-briefing_start_time').val();
		const endTime = $('#input-briefing_end_time').val();
		const newDateString = $('#input-briefing_date').val();
		const $selectedAppointment = $('.briefing-appointment-container.selected');
		const briefingID = $selectedAppointment.data('briefing-id');
		const $input = $('#input-briefing_date');
		const rangerID =$('#input-ranger').val();
		const selectedDate = $('.calendar-cell.selected').data('date');

		let briefings, info;
		if (selectedDate in this.briefings) {
			briefings = this.briefings[selectedDate];
			if (!Object.keys(briefings).length) return;
			info = briefings[briefingID];
		}
		
		const available = this.checkRangerAvailability(briefingID, startTime, endTime, {rangerID: rangerID, date: newDateString});
		if (!available) {
			this.revertInputValue($input, {briefingInfo: info});
			return;
		}

		// Update .briefings
		// if there are no briefings for this date, add the date
		if (this.briefings[newDateString] === undefined) this.briefings[newDateString] = {};
		// update briefing info only if there's an existing briefing ID
		if (briefingID !== undefined) {
			this.briefings[newDateString][briefingID] = {...info};
			delete this.briefings[selectedDate][briefingID];
			info = this.briefings[newDateString][briefingID];
			info.briefing_date = newDateString;
		}

		// If the appointment has the class date-change-not-called, this is a brand new briefing and this 
		//	.change() event handler is being manually triggered by onTimeSlotClick(). In that case, don't
		//	move the appointment
		if ($selectedAppointment.is('.date-change-not-called')) {
			$selectedAppointment.removeClass('date-change-not-called');
		} else {
			// Add briefing to calendar
			const $calendarCell = $(`.calendar-cell[data-date="${newDateString}"]`).click();
			$(`.briefing-calendar-entry[data-briefing-id=${briefingID}]`).appendTo($calendarCell.find('.calendar-cell-body'));
			//this.addBriefingToCalendarCell($calendarCell, info);

			// Select the new appointment
			$(`.briefing-appointment-container[data-briefing-id="${briefingID}"]`).click();
		}

		
	}


	getTimeSlotEventInfo(e) {
		const $button = $(e.target).closest('button.half-hour-block');
		const appointmentTimes = this.getAppointmentTimes();
		
		const timeIndex = $button.index();//appointmentTimes.indexOf(time);
		const time = appointmentTimes[timeIndex];//$button.data('time');
		const nAppointmenTimes = appointmentTimes.length;

		return [timeIndex, time, nAppointmenTimes];
	}


	onTimeSlotHover(e) {

		const [timeIndex, time, nAppointmenTimes] = this.getTimeSlotEventInfo(e);
		const startIndex = timeIndex + 1;
		const endIndex = Math.min(timeIndex + (this.config.default_briefing_length_hrs * 2) + 1, nAppointmenTimes);
		$('.schedule-ui-container').append(`
			<div class="potential-appointment-container" data-time="${time}" style="grid-row: ${startIndex}/${endIndex}">
			</div>
		`);
	}


	onTimeSlotLostHover(e) {
		const [timeIndex, time, nAppointmenTimes] = this.getTimeSlotEventInfo(e);
		$(`.potential-appointment-container[data-time="${time}"]`).remove();
	}

	/*
	When the user hovers over the schedule, call event handlers for time slot buttons
	*/
	onScheduleHover(e) {
		const $target = $(e.target);
		if ($target.closest('.briefing-appointment-container').length) return;

		const $scheduleSlot = $target.closest('.half-hour-block');
		const timeIndex = $scheduleSlot.index();
		this.onTimeSlotHover({target: $('.time-label-container').children().eq(timeIndex)})

	}

	onScheduleLostHover(e) {
		const time = $(e.target).data('time');
		$(`.potential-appointment-container[data-time="${time}"]`).remove();
	}


	onTimeSlotClick(e) {

		if (!this.showDenyEditPermissionsMessage()) return;

		const [timeIndex, time, nAppointmenTimes] = this.getTimeSlotEventInfo(e);
		const startIndex = timeIndex + 1;
		const endIndex = Math.min(timeIndex + (this.config.default_briefing_length_hrs * 2) + 1, nAppointmenTimes);

		//TODO: Prevent user from adding more than one briefing at a time without saving

		// Add the appointment to the schedule
		//	 Use date-change-not-called utility class to let the date field's .change() event know not to move the briefing
		$(`
			<div class="briefing-appointment-container selected new-briefing date-change-not-called" style="grid-row: ${startIndex} / ${endIndex}" title="New Appointment">
				<label class="briefing-appointment-header">New Briefing</label>
				<p class="briefing-appointment-text">
				<span class="briefing-details-n-climbers"></span> <span class="briefing-details-climber hidden">climber</span><span class="briefing-details-climber-plural"></span><br>
				<span class="briefing-details-ranger-name"></span>
				</p>
			</div>
		`).appendTo('.schedule-ui-container')
		.click(); // select this appointment

		const currentDate = $('.calendar-cell.selected').data('date');
		// Set things that onchange events would set except you can't call .change() 
		//	here because onBriefingDateChange() does stuff you don't want it do
		$('#input-briefing_date').val(currentDate).change();
		// 	.data('current-value', currentDate)
		// 	.addClass('dirty');
		// this.edits.briefing_date = currentDate;

		const appointmentTimes = this.getAppointmentTimes();
		$('#input-briefing_start_time').val(time).change();
		$('#input-briefing_end_time').val(appointmentTimes[endIndex - 1]).change();
			//.data('current-value', time)
			//.addClass('dirty');

		// Undo a couple of .change() event things
		$('.input-field.dirty').removeClass('dirty');
		this.edits = {};


		$('.potential-appointment-container').remove();

		// Make editable
		this.toggleEditing({allowEdits: true});

	}


	onScheduleSlotClick(e) {
		const $scheduleSlot = $(e.target);
		const index = $scheduleSlot.index();
		this.onTimeSlotClick({target: $('button.half-hour-block').eq(index)})
	}

	toggleBriefingCalendarCellEntries($cell) {
		// Check if there are too many briefings to show in the cell without scrolling 
		const $cellBody = $cell.find('.calendar-cell-body');
		const $entries = $cellBody.find('.briefing-calendar-entry:not(.summary)');
		
		// Show entries and hide summary before testing for overflow
		$entries.ariaHide(false)
		const $summaryEntry = $cellBody.find('.briefing-calendar-entry.summary').ariaHide(true);

		// Loop through the entries and show them if the cell height can still accommodate it
		const bodyHeight = $cellBody.height();
		let contentHeight = 36; // height of two lines (one for a visual buffer)
		let visibleEntries = [];
		for (const el of $entries) {
			const entryHeight = el.offsetHeight;
			contentHeight += entryHeight;
			if (bodyHeight < contentHeight) break;
			visibleEntries.push(el);
		}	
		
		const $hiddenEntries = $entries.not($(visibleEntries));
		const nHidden = $hiddenEntries.length;
		if (nHidden) {
			$hiddenEntries.ariaHide(true);
			$summaryEntry.text(`+${nHidden} more appointment${nHidden > 1 ? 's' : ''}`)
				.ariaHide(false)
		}

		// If the content is longer than the height of the cell, show just a summary
		// const contentOverflows = bodyHeight < $cellBody[0].scrollHeight; 
		// $entries.ariaHide(contentOverflows);
		// $cellBody.find('.briefing-calendar-entry.summary')
		// 	.text(`${$entries.length} briefings`)
		// 	.ariaHide(!contentOverflows);
	}


	addBriefingToCalendarCell($cell, info) {
		const startTime = (new Date(info.briefing_start))
			.toLocaleTimeString('en-us', {hour: 'numeric', minute: 'numeric'})
			.toLowerCase()
			.replace(/\s|:00/g, '')
		 $(`
			<p class="briefing-calendar-entry" data-briefing-id="${info.id}">
				<strong>${startTime}</strong> ${info.expedition_name}
			</p>
		`).insertBefore($cell.find('.calendar-cell-body .briefing-calendar-entry.summary'));
		 
		this.toggleBriefingCalendarCellEntries($cell);
	}


	fillCalendarBriefings() {

		for (const el of $('.calendar-cell')) {
			const $cell = $(el);
			const dateString = $cell.data('date');
			// sort appointments by time, then expedition name
			const briefingAppointments = this.briefings[dateString];
			if (briefingAppointments) {
				const sortedAppointments = Object.values(briefingAppointments).sort((a, b) =>  
					a.briefing_start < b.briefing_start ? -1 : 			 // time a is before time b
					a.briefing_start > b.briefing_start ?  1 : 			 // time a is after time b
					a.expedition_name < b.expedition_name ? -1 : // times are the same and expedition name a is first
					a.expedition_name > b.expedition_name ?  1 : // times are the same and expedition name b is first 
					0 											 // times and names are the same (should never happen)
				);
				for (const info of sortedAppointments) {
					//const info = briefingAppointments[briefingID];
					this.addBriefingToCalendarCell($cell, info);
				}
			}
			//this.toggleBriefingCalendarCellEntries($cell);
		}
	}


	/*
	Query all briefings for the given year and store in memory to limit the number 
	of server calls and speed up data loading
	*/
	queryBriefings(year=(new Date()).getFullYear()) {
		const sql = `
			SELECT * FROM briefings_view 
			WHERE extract(year FROM briefing_start) >= ${year}
		`;

		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					console.error('query failed because ' + queryResultString)
				} else {
					// organize briefings by date
					for (const row of $.parseJSON(queryResultString)) {
						const briefingDate = row.briefing_date;
						// If this date hasn't been added to the briefings object, add it
						if (!(briefingDate in this.briefings)) {
							this.briefings[briefingDate] = {};
						}
						
						const expeditionInfo = this.expeditionInfo.expeditions[row.expedition_id];
						if (!expeditionInfo) continue;
						row.routes = expeditionInfo.routes || '<em>none</em>';
						this.briefings[briefingDate][row.id] = row;
					}

					this.fillCalendarBriefings();
					
					// Select today
					//const today = new Date((new Date()).toDateString()); // need to trim time to midnight
					const today = window.location.search.length ? this.getBriefingDateFromURL() : new Date();
					this.selectCalendarCell(today);//year === today.getFullYear() ? today : new Date($('.calendar-cell:not(.disabled)').first().data('date')));

					const briefingID = this.urlQueryParams.id;
					if (briefingID) {
						$(`.briefing-appointment-container[data-briefing-id=${briefingID}]`).click()
					}
				}
			})
			.fail((xhr, status, error) => {
				console.error('query failed because ' + error)
			});
	}


	fillExpeditionsSelectOptions(expeditions) {

		const $input = $('#input-expedition').empty();
		$input.append(`<option class="" value="">Expedition</option>`);
		for (const info of expeditions.sort((a, b) => (a.expedition_name || '**No Expedition Name Entered**').localeCompare(b.expedition_name))) { 
			$input.append(`<option class="" value="${info.expedition_id}">${info.expedition_name} (${info.n_members} climbers)</option>`);
		}
		$input.val('');
	}

	/*
	Fill selects with custom queries
	*/
	fillBriefingDetailSelects(year=(new Date()).getFullYear()) {

		var deferreds = [
			// Fill expeditions
			this.getExpeditionInfo(year)
			,
			// Get rangers 
			this.queryDB(`SELECT id, first_name || ' ' || last_name As full_name FROM users WHERE user_role_code=${this.constants.userRoleCodes.ranger} AND user_status_code=2`)
				.done(queryResultString => {
					const $input = $('#input-ranger');
					for (const row of $.parseJSON(queryResultString)) {
						$input.append(`<option class="" value="${row.id}">${row.full_name}</option>`);
					}
				})
		];

		// Get times
		const times = this.getAppointmentTimes();
		const $inputs = $('#input-briefing_start_time, #input-briefing_end_time');
		for (const timeString of times) {
			$inputs.append(
				$(`<option value="${timeString}">${timeString}</option>`)
			);
		}

		return deferreds;

	}


	getExpeditionInfo(year=(new Date().getFullYear())) {
		const sql = `SELECT * FROM briefings_expedition_info_view WHERE planned_departure_date > '${year}-1-1' AND group_status_code <> 6 ORDER BY expedition_name`;
		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					console.log('Could not get expedition info because ' + queryResultString);
				} else {
					const result = $.parseJSON(queryResultString);
					for (const row of result) {
						this.expeditionInfo.expeditions[row.expedition_id] = {...row};
						if (row.unscheduled === 't') this.expeditionInfo.unscheduled.push(row.expedition_id);
					}
					this.fillExpeditionsSelectOptions(result);
				}
			})
	}

	/*
	Export briefings to Excel. startDateStr and endDateStr should be in ISO 
	date format YYYY-mm-dd
	*/
	exportBriefingSchedule(startDateStr, endDateStr) {
		// $startCalendarCell = $(`.calendar-cell[data-date=${startDateStr}]`);
		// $endCalendarCell = $(`.calendar-cell[data-date=${endDateStr}]`);

		showLoadingIndicator('exportBriefingSchedule');

		var exportData = {
			time_slots: $('.time-label').map((_, el) => el.innerHTML).get(),
			briefings: {}
		};
		const appointmentTimes = this.getAppointmentTimes();

		var currentDate = new Date(startDateStr + ' 00:00');

		while (currentDate <= new Date(endDateStr + ' 00:00')) {
			
			const thisDateStr = getFormattedTimestamp(currentDate);
			const columnIndices = this.setBriefingAppointmentColumns({
				appointmentTimes: appointmentTimes,
				dateString: thisDateStr,
				setUI: false
			});
			 
			let thisExportInfo = [];

			for (const id in this.briefings[thisDateStr] || {}) {
				const briefingInfo = this.briefings[thisDateStr][id];
				const briefingText = `Routes: ${briefingInfo.routes.replace(/; /g, ', ')}
					${briefingInfo.n_members} climber${briefingInfo.n_members > 1 ? 's' : ''}
					${briefingInfo.ranger_last_name || ''}`.replace(/\t/g, '');
				const {startColumn, endColumn} = columnIndices[id]; 
				const [startRow, endRow] = this.getAppointmentRowIndex(briefingInfo, {appointmentTimes: appointmentTimes});
				thisExportInfo.push({
					expedition_name: briefingInfo.expedition_name,
					briefing_text: briefingText,
					// CSS Grid layout indices are inclusive at start and exclusive at end whereas 
					//	openpyxl range indices are all inclusive, so subtract 1 from the end indices
					cell_indices: [startRow, startColumn, endRow - 1, endColumn - 1]
				})
				
			}
			exportData.briefings[thisDateStr] = thisExportInfo;

			currentDate = currentDate.addDays(1);
		}
		
		$.post({
			url: 'flask/reports/briefing_schedule',
			data: { // flask mutilates arrays in JS objects so stringify them
				time_slots: JSON.stringify(exportData.time_slots),
				briefings: JSON.stringify(exportData.briefings)
			}
		}).done(resultString => {
			if (this.pythonReturnedError(resultString)) {
				showModal('An unexpected error occurred while exporting the briefing schedule: ' + resultString, 'Export Error')
			} else {
				window.location.href = resultString;
			}
		}).fail((xhr, status, error) => {
			showModal('An unexpected error occurred while exporting the briefing schedule: ' + error)
		}).always(() => {hideLoadingIndicator()})

	}


	/*
	Export button event handler
	*/
	onExportBriefingsClick() {
		const startDateStr = $('#input-export_start_date').val();
		const endDateStr = $('#input-export_end_date').val();
		this.exportBriefingSchedule(startDateStr, endDateStr);
	}

	init() {
		// Call super.init()
		var deferreds = super.init();
		
		// Do synchronous stuff
		this.configureMainContent();

		deferreds = deferreds.concat(this.fillBriefingDetailSelects());

		$.when(...deferreds).then(() => {
			this.queryBriefings();
		});
	}
}