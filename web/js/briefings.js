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
		this.guideCompanyColors = {};
		return this;
	}


	getFormattedMonth(date=new Date()) {
		return date.toLocaleDateString(
			'en-us', 
			{
				month: 'long', 
				year: 'numeric'
			}
		);
	}


	getFormattedWeekday(date=new Date(), {weekday=undefined}={}) {
		return date.toLocaleDateString(
			'en-us', 
			{
				weekday: weekday,
				month: 'long', 
				day: 'numeric' 
			}
		);
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

		// Define a function to call this code in multiple places
		const addShowModalButton = () => {
			$calendarBody.append(`
				<button 
					class="show-weekly-view-modal-button icon-button" 
					aria-label="Expand expedition members content" 
					title="Expand expedition members content"
				>
					<i class="expand-card-icon fa-solid fas fa-2x fa-expand-alt"></i>
					<label class="icon-button-label">expand</label>
				</button>
			`)
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
			// Put an expand week button at the end of each row
			if ($('.calendar-cell').length % 7 === 0) { 
				addShowModalButton();
			}
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

		// If the month ended on any other day than Saturday, the show modal 
		//	button wasn't added
		if (endDayOfWeek < 6) {
			addShowModalButton();
		}

	}


	/*
	Helper method to select a given date
	*/
	selectCalendarCellByDate(date=new Date()) {
		$(`.calendar-cell[data-date="${getFormattedTimestamp(date)}"]`).click();
	}


	/*
	If a date was given in the query params of the URL, return the JS Date. 
	Date formats must have a valid ISO date format before the first space. 
	Anything after that space is ignored.
	*/
	getBriefingDateFromURL() {

		// Default to today
		var date = new Date();

		const params = Object.keys(this.urlQueryParams).length ? 
			this.urlQueryParams : 
			this.parseURLQueryString();

		// Try to create the date from the given params. Accept dates in both
		//	YYYY-mm-dd and YYYY-mm-dd HH:MM formats
		const paramDate = new Date(params.date.split(' ')[0] + ' 00:00');

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
		
		$(document).on('click', '.calendar-cell:not(.disabled)', e => {
			this.onCalendarCellClick(e);
		});

		// Configure dates
		$('#current-month-label')
			.data('current-date', getFormattedTimestamp(calendarDate))
			.text(this.getFormattedMonth(calendarDate));
		$('.briefing-details-sidebar-header').text(
			this.getFormattedWeekday(calendarDate, {weekday: 'long'})
		);
		$('#input-briefing_date')
			.prop('min', `${calendarDate.getFullYear()}-1-1`)
			.prop('max', `${calendarDate.getFullYear()}-12-31`);
		
		// Set calendar for this month
		this.setCalendarDates(calendarDate.getMonth(), calendarDate.getFullYear());

		// Advance to next or previous month's calendar
		$('.show-previous-month-button, .show-next-month-button').click(e => {
			this.onShowPreviousNextMonthButtonClick(e);
		});

		$('button.half-hour-block:not(:last-child)')
			.hover(e => {this.onTimeSlotHover(e)}, e => {this.onTimeSlotLostHover(e)})
			.click(e => {this.onTimeSlotClick(e)});
		$('#briefing-details-sidebar .schedule-background .half-hour-block')
			.hover(e => {this.onScheduleHover(e)}, e => {this.onScheduleLostHover(e)})
			.click(e => {this.onScheduleSlotClick(e)})

		// When the user clicks the expand or contract sidebar button, expand or contract it accordingly
		$('.change-briefing-details-size-button').click(e => {
			const $target = $(e.target);
			const $sideBar = $('#briefing-details-sidebar');
			const isExpanded = $sideBar.is('.expanded');
			$sideBar.toggleClass('expanded', $target.closest('button').is('.expand-briefing-details-button'));
		})

		// bind click events to any .briefing-appointment-containers that might be clicked
		$(document).on('click', '#briefing-details-sidebar .briefing-appointment-container', e => {
			this.onBriefingAppointmentClick(e);
		});

		// hide the details drawer when the close button is clicked
		$('.appointment-details-header-container button.close').click(() => {
			if ($('.input-field.dirty, .briefing-appointment-container.new-briefing').length) {
				// Only close the drawer if the user saves or discards, not cancels
				this.confirmSaveEdits({
					afterActionCallback: () => {
						this.toggleEditing(false); 
						$('.appointment-details-drawer').removeClass('show'); 
						$('.briefing-appointment-container.selected').removeClass('selected')
					}
				});
			} else {
				this.closeAppointmentDetailsDrawer();
			}
		});

		$('.appointment-details-body .input-field').change(e => {
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
		});

		$(document).on('mouseenter', '.calendar-cell', e => {
			const $cell = $(e.target).closest('.calendar-cell');
			this.toggleCalendarCellHover($cell, {show: true});
		});
		$(document).on('mouseleave', '.calendar-cell', e => {
			const $cell = $(e.target).closest('.calendar-cell');
			this.toggleCalendarCellHover($cell, {show: false});
		});

		$(document).on('mouseenter', '.show-weekly-view-modal-button', e => {
			const $button = $(e.target);
			this.toggleShowWeeklyViewModalButtonHover(
				$button, 
				{addClass: true}
			)
		});

		$(document).on('mouseleave', '.show-weekly-view-modal-button', e => {
			const $button = $(e.target);
			this.toggleShowWeeklyViewModalButtonHover(
				$button, 
				{addClass: false}
			)
		});

		$(document).on('click', '.show-weekly-view-modal-button', e => {
			const $button = $(e.target).closest('button');
			this.onShowWeeklyViewModalButtonClick($button);
		});

		// Hide the tooltip by focusing on a different element
		$(document).on('click', '.close-tooltip', e => {
			$('#open-export-modal-button').focus();
		});
	
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
			this.selectCalendarCellByDate(today);
		} else {
			this.selectCalendarCellByDate(newDate);
		}

		// Fill appointments on calendar
		this.fillCalendarBriefings();

		$monthLabel.data('current-date', getFormattedTimestamp(newDate));
		$monthLabel.text(this.getFormattedMonth(newDate));
	}


	onShowPreviousNextMonthButtonClick(e) {
		const nextButtonWasClicked = $(e.target).closest('button').is('.show-next-month-button');

		// Because the selected date is going to change, if there are unsaved edits, check what the user wants to do
		if ($('.input-field.dirty, .briefing-appointment-container.new-briefing').length) {
			// Only close the drawer if the user saves or discards, not cancels
			this.confirmSaveEdits({
				afterActionCallback: () => {
					this.closeAppointmentDetailsDrawer();
					this.getPreviousNextMonth(nextButtonWasClicked);
				}
			});
		} else {
			// No edits to worry about so just close the drawer (if it's open) and go to the next month
			this.closeAppointmentDetailsDrawer();
			this.getPreviousNextMonth(nextButtonWasClicked);
		}
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
		2. Set columns in order of start time and duration
		3. For each column, find the first slot that isn't already occupied
	This metqhod is called when the daily schedule details need to be loaded/changed 
	and when exporting to Excel. The setUI parameter should be set to true unless
	exporting to Excel
	*/
	setBriefingAppointmentColumns({appointmentTimes=[], dateString='', setUI=true, scheduleContainer='#briefing-details-sidebar .schedule-ui-container'}={}) {
		
		if (!appointmentTimes.length) appointmentTimes = this.getAppointmentTimes();
		

		dateString = dateString || $('.calendar-cell.selected').data('date');

		// First, loop through the briefings and determine the number of briefings per time slot
		//	Sort the briefings in descending order of duration first so that long briefings display
		//	first (further left), which is more visually coherent
		const sortedBriefings = Object.values(this.briefings[dateString] || [])
			.sort((a, b) => {
				const startDiff = new Date(a.briefing_start) - new Date(b.briefing_start);
				if (startDiff !== 0) return startDiff;

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

		// Keep track of what cells are free
		const nRows = appointmentTimes.length;
		let columnOccupancy = Array.from({length: nRows}, () => Array(nColumns).fill(null));
		
		// Helper function to set an appointment in the columnOccupancy array
		const fillSlot = (value, rowStart, rowEnd, colStart, colEnd) => {
			for (let row=rowStart; row < rowEnd; row++) {
				columnOccupancy[row].fill(value, colStart, colEnd); // fill inclusive
			}
		}

		const $scheduleContainer = $(scheduleContainer);
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
			
			
			// // Because the briefings were initially sorted by length in the first for loop,
			// //	the start column can be reliably calculated by getting this briefing's index
			// //	in the longest row without the possibility of any briefing containers overlapping
			// let startColumn = longestRow.indexOf(briefingID) * briefingWidth + 1,
			// 	endColumn = startColumn + briefingWidth;
			
			let startArrayColumn = -1;
			for (let col = 0; col < nColumns; col += briefingWidth) {
				const isFree = columnOccupancy.slice(rowStart, rowEnd)
					.map(row => row.slice(col, col + briefingWidth))
					.flat()
					.every(v => v === null);
				if (isFree) {
					startArrayColumn = col;
					break;
				}
			}
			if (startArrayColumn === -1) {
				console.log('could not find a free spot for briefing ID ' + briefingID);
				startArrayColumn = nColumns;
			}
			const endArrayColumn = startArrayColumn + briefingWidth,
				startGridColumn = startArrayColumn + 1,
				endGridColumn = endArrayColumn + 1;

			if (setUI) {
				$scheduleContainer
					.find(`.briefing-appointment-container[data-briefing-id=${briefingID}]`)
						.css('grid-column', `${startGridColumn} / ${endGridColumn}`);
			}
			const id = parseInt(briefingID);
			fillSlot(id, rowStart, rowEnd, startArrayColumn, endArrayColumn)
			placedBriefings[id] = {startColumn: startGridColumn, endColumn: endGridColumn} //1-based index
			
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
	Set tootlip text and toggle button visibility
	*/
	setViewNotesTooltip($viewNotesButton, notes) {
		$viewNotesButton.ariaHide(isNull(notes))
			.find('.notes-tooltip')
				.text(notes);
	}


	/*
	Helper function to standardize the HTML of an appointment container
	*/
	getBriefigAppointmentHTML(briefingInfo, rowIndexStart, rowIndexEnd) {
		
		const guideCompanyCode = briefingInfo.guide_company_code;
		const colorClass = this.guideCompanyColors[guideCompanyCode]?.class || '';
		const $appointment = $(`
			<div class="briefing-appointment-container ${colorClass}" style="grid-row: ${rowIndexStart} / ${rowIndexEnd}"">
				<label class="briefing-appointment-header"></label>
				<p class="briefing-appointment-text">
					<span class="briefing-details-routes"></span><br>
					<span class="briefing-details-n-climbers"></span> climber<span class="briefing-details-climber-plural"></span><br>
					<span class="briefing-details-ranger-name"></span>
				</p>
				<button class="text-only-button view-notes-button tooltip-container" aria-live="off">
					<span>View notes</span>
					<div class="tooltip notes-tooltip" role="status"></div>
				</button>
			</div>
		`);


		if (!isNull(briefingInfo.id)) {
			$appointment.attr('data-briefing-id', briefingInfo.id);
		}
		if (!isNull(briefingInfo.expedition_name)) {
			$appointment.attr('title', briefingInfo.expedition_name)
				.attr('aria-label', briefingInfo.expedition_name)
				.find('.briefing-appointment-header').text(briefingInfo.expedition_name);
		}
		if (!isNull(briefingInfo.routes)) {
			$appointment.find('.briefing-details-routes')
				.html(`Routes: ${briefingInfo.routes.replace(/; /g, ', ')}`);
		}
		if (!isNull(briefingInfo.n_members)) {
			$appointment.find('.briefing-details-n-climbers')
				.text(briefingInfo.n_members)
				.siblings('.briefing-details-climber-plural')
					.text(briefingInfo.n_members > 1 ? 's' : '');
		}
		if (!isNull(briefingInfo.ranger_last_name)) {
			$appointment.find('.briefing-details-ranger-name')
				.text(briefingInfo.ranger_last_name);
		}

		return $appointment;
	}


	/*
	Helper method to add an appointment container to the sidebar schedule UI. This is 
	only called when a new cell is selected and the schedule needs to be filled in and 
	when discarding edits.
	*/
	addBriefingToSchedule(
		briefingInfo, 
		{
			scheduleContainer='#briefing-details-sidebar .schedule-ui-container', 
			appointmentTimes=[]
		}={}
	) {
		
		const [rowIndexStart, rowIndexEnd] = this.getAppointmentRowIndex(briefingInfo, {appointmentTimes: appointmentTimes});

		const notes = briefingInfo.briefing_notes;
	
		const $appointment = this.getBriefigAppointmentHTML(briefingInfo, rowIndexStart, rowIndexEnd)
			.appendTo(scheduleContainer);

		this.setViewNotesTooltip($appointment.find('.view-notes-button'), notes);
	}

	/*
	Helper method to select a cell after a user click. This is necessary to handle 
	potentially unsaved edits
	*/
	selectCalendarCellByClick($cell) {
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

		// Make sure the briefing details drawer is closed
		this.closeAppointmentDetailsDrawer();
	}


	/*
	Get the first and last day the week based on the index of the 
	.show-weekly-view-modal button clicked. Each button is the 7th element in the 
	row, so it's index * 7 will give the index of the last calendar cell for the 
	corresponding week
	*/
	getWeekdayIndexRangeFromButton($button) {
		const buttonIndex = $button
			.closest('button') // make sure it's always the button, not a child
			.index('.show-weekly-view-modal-button');
		const lastIndexOfWeek = (buttonIndex + 1) * 7 - 1;  // 6 because index is 0-based
		const firstIndexOfWeek = lastIndexOfWeek - 6;
		
		return {
			firstIndexOfWeek: firstIndexOfWeek,
			lastIndexOfWeek:  lastIndexOfWeek
		}
	}

	/*
	Toggle the .show class .show-weekly-view-modal button for the week corresponding 
	to the calendar cell that the user is hovering/ending hover over 
	*/
	toggleCalendarCellHover($cell, {show=true}={}) {
		const index = $cell.index('.calendar-cell');
		const weekIndex = Math.floor(index / 7);
		//const shownIndex = $('.show-weekly-view-modal-button.show').index('.show-weekly-view-modal-button');
		$('.show-weekly-view-modal-button').eq(weekIndex).toggleClass('show', show);
	}

	/*
	Event handler for both mouseover and mouseout events on .show-weekly-view-modal-button
	*/
	toggleShowWeeklyViewModalButtonHover($button, {addClass=true}) {

		const {firstIndexOfWeek, lastIndexOfWeek} = this.getWeekdayIndexRangeFromButton($button);
		const $calendarElements = $('.calendar-cell');
		for (let i=firstIndexOfWeek; i <= lastIndexOfWeek; i++) {
			$calendarElements.eq(i).toggleClass('expand-button-hover', addClass);
		}
	}

	/*
	Handler for .show-weekly-view-modal buttons
	*/
	onShowWeeklyViewModalButtonClick($button) {

		const {firstIndexOfWeek, lastIndexOfWeek} = this.getWeekdayIndexRangeFromButton($button);
		const $calendarElements = $('.calendar-cell');
		const $modalColumns = $('.weekly-view-modal-day-col');
		const appointmentTimes = this.getAppointmentTimes();
		let firstDate,
			lastDate;
		for (let i=firstIndexOfWeek; i <= lastIndexOfWeek; i++) {
			const $calendarCell = $calendarElements.eq(i);
			const $column = $modalColumns.eq(i - firstIndexOfWeek);
			
			// Set date
			const dateString = $calendarCell.data('date');
			const cellDate = this.getDateFromCalendarCell($calendarCell);
			const month = cellDate.getMonth() + 1; //0-based index so add 1
			const dayOfMonth = cellDate.getDate();
			$column.find('.weekly-view-modal-day-label > .short-date')
				.text(`${month}/${dayOfMonth}`);

			// Set briefings
			const briefingAppointments = this.briefings[dateString];
			const $scheduleContainer = $column.find('.schedule-ui-container');
			if (briefingAppointments) {
				for (const expeditionID in briefingAppointments) {
					const info = briefingAppointments[expeditionID];
					this.addBriefingToSchedule(
						info, 
						{
							appointmentTimes: appointmentTimes,
							scheduleContainer: $scheduleContainer
						}
					)
				}
				this.setBriefingAppointmentColumns({
					appointmentTimes: appointmentTimes, 
					dateString: dateString,
					scheduleContainer: $scheduleContainer
				});
			}

			if (i === firstIndexOfWeek) {
				firstDate = cellDate;
			} else if (i === lastIndexOfWeek) {
				lastDate = cellDate;
			}

		}

		const firstDateString = this.getFormattedWeekday(firstDate);
		const lastDateString = this.getFormattedWeekday(lastDate);
		$('#weekly-view-modal').find('.month-label')
			.text(`Briefings for ${firstDateString} to ${lastDateString}`);

		$('#weekly-view-modal').modal();


	}

	/*
	Select the date when a calendar cell is clicked and fill any appointments on the sidebar schedule
	*/
	onCalendarCellClick(e) {
		
		// if the cell is already selected, do nothing
		const $cell = $(e.target).closest('.calendar-cell');
		if ($cell.is('.selected')) return;

		// If there are any unsaved edits, ask the user what they want to do
		if ($('.input-field.dirty').length) {
			const callback = () => {
				this.selectCalendarCellByClick($cell);
			}
			this.confirmSaveEdits({afterActionCallback: callback})
		} else {
			this.selectCalendarCellByClick($cell);
		}
	}


	/*
	*/
	selectBriefingAppointment($appointmentContainer) {
		$('.briefing-appointment-container.selected').removeClass('selected');

		$appointmentContainer.addClass('selected');
		const selectedDate = $('.calendar-cell.selected').data('date');
		const briefingID = $appointmentContainer.data('briefing-id');
		const $routeList = $('#appointment-details-route-list').empty();
		var info; 
		if (briefingID) {
			info = this.briefings[selectedDate][briefingID];
			const expeditionID = info.expedition_id;
			const expeditionOptions = Object.values(this.expeditionInfo.expeditions)
				.filter(i => this.expeditionInfo.unscheduled.includes(i.expedition_id) || i.expedition_id == expeditionID);
			this.fillExpeditionsSelectOptions(expeditionOptions);
			for (const el of $('.appointment-details-drawer .input-field')) {
				this.setInputFieldValue(el, info)
			}
			for (const routeName of info.routes.split('; ')) {
				$routeList.append(`<li>${routeName}</li>`)
			}
			if (!isNull(expeditionID)) {
				this.setExpeditionInfoLink(expeditionID);
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
		setTimeout(() => {$appointmentContainer[0].scrollIntoView()}, 50);

		// clear data-current-value properties
		for (const input of $('.input-field')) {
			$(input).data('currentValue', '');
		}

		// Capture original values of the briefing so they can be reverted
		this.currentBriefing = {...info};
	}


	/*Show the briefing appointment details when clicked*/
	onBriefingAppointmentClick(e) {

		const $appointmentContainer = $(e.target).closest('.briefing-appointment-container');

		// If there are any unsaved edits, ask the user what they want to do
		if ($('.input-field.dirty').length) {
			const callback = () => {
				this.selectBriefingAppointment($appointmentContainer);
				// Make sure edits aren't allowed after switching to the selected appointment
				// 	This should be called here _and_ below within the if/else block so that if the
				//	user clicks the "cancel" button, editing will still be open
				this.toggleEditing({allowEdits: false}); 
			}
			this.confirmSaveEdits({afterActionCallback: callback})
		} else {
			this.selectBriefingAppointment($appointmentContainer);
			this.toggleEditing({allowEdits: false});
		}
	}


	/*
	When a user selects a different expedition's briefing appointment, update
	the expedition page link and show the link
	*/
	setExpeditionInfoLink(expeditionID) {
		$('#expedition-info-link')
			.attr('href', `expeditions.html?id=${expeditionID}`)
			.closest('.collapse')
				.collapse('show');
	}


	/*
	Hide the expedition page link and set it back to the default URL
	*/
	resetExpeditionInfoLink() {
		const $link = $('#expedition-info-link');
		$link.attr('href', 'expeditions.html')
			.closest('.collapse')
				.collapse('hide');
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

		this.resetExpeditionInfoLink();


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
			this.showModal('You have not made any edits to save yet.', 'No edits to save');
			hideLoadingIndicator();
			return;
		}

		for (const el of $('.input-field:required')) {
			if (el.value === '') {
				const $input = $(el);
				const labelText = $input.siblings('.field-label').text();
				$input.addClass('error').focus();
				this.showModal(`Before you can save this briefing, all fields except "Briefing ranger" must be filled in and the '${labelText}' field is blank. Fill in this and any other blank fields, then try to save your changes.`, 'Empty field');
				hideLoadingIndicator();
				return;
			}
		}

		const now = getFormattedTimestamp(new Date(), {format: 'datetime'});
		var values = {
			last_modified_time: now,
			last_modified_by: this.userInfo.ad_username
		};
		const briefingDate = $('#input-briefing_date').val();
		for (const el of $('.input-field:not(#input-briefing_date, .ignore-on-save)')) {
			const $input = $(el);
			// briefing start and end are actually datetimes in the database, but since the user 
			//	has already selected a date, they're just selects with different times as options. 
			//	The INSERT/UPDATE value needs to include the date too though
			if (el.id.endsWith('_time')) {
				values[el.name.replace(/_time$/, '')] = `${briefingDate} ${el.value}`;
			} else {
				values[el.name] = el.value === '' ? null : el.value;
			}
		}

		const $selectedAppointment = $('.briefing-appointment-container.selected');
		const isInsert = $selectedAppointment.is('.new-briefing');
		var formData = new FormData();
		var briefingID = $selectedAppointment.data('briefing-id');
		if (isInsert) {
			// This is a new entry so add "entered by" fields
			values = {
				...values,
				entry_time: now, 
				entered_by: this.userInfo.ad_username
			}
			formData.append('data', JSON.stringify({
				inserts: {
					briefings: [{
						values: values, 
						// the actual HTML ID doesn't matter. The existence of this 
						//	property (with a truthy value) will get the backend to 
						//	return the INSERTed ID
						html_id: 'a'
					}]
				}
			}) )
		} else {
			formData.append('data', JSON.stringify({
				updates: {
					briefings: {
						[briefingID]: values
					}
				}
			}) )
		}

		return $.post({
			url: '/flask/db/save',
			data: formData,
			contentType: false,
			processData: false
		}).done(response => {
			const errorMessage = 'An unexpected error occurred while saving data to the database.';
			if (this.pythonReturnedError(response, {errorExplanation: errorMessage})) {
				return;
			} else {
				const result = response.data || [];
				if (result.length) briefingID = result[0].db_id;

				// Update in-memory data
				// 	make sure the briefing date and briefingID exist first
				this.briefings[briefingDate] = this.briefings[briefingDate] || {};
				this.briefings[briefingDate][briefingID] = this.briefings[briefingDate][briefingID] || {};
				
				var info = this.briefings[briefingDate][briefingID];

				for (const el of $('.input-field')) {
					info[el.name] = el.value;
				}
				info.briefing_start = info.briefing_date + ' ' + info.briefing_start_time;
				info.briefing_end =   info.briefing_date + ' ' + info.briefing_end_time;
				info.expedition_name = this.expeditionInfo.expeditions[info.expedition_id].expedition_name;
				info.n_members = this.expeditionInfo.expeditions[info.expedition_id].n_members;
				info.routes = (this.expeditionInfo.expeditions[info.expedition_id].routes || '<em>none</em>').replace(/; /g, ', ');
				info.id = briefingID;
				
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
					this.setViewNotesTooltip($selectedAppointment.find('.view-notes-button'), info.briefing_notes);

				}
				// Reset the appointment layout
				this.setBriefingAppointmentColumns({setUI: true});

				$('.input-field.dirty').removeClass('dirty');
				this.toggleBeforeUnload(false);

			}
		}).fail((xhr, status, error) => {
			this.showModal(
				`An unexpected error occurred while saving data to the database: ${error}.` + 
					` Make sure you're still connected to the NPS network and try again. ` + 
					this.getBriefingDateFromURL(), 
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

		this.toggleBeforeUnload(false);
	}

	/*
	Prompt user to confirm or discard edits via modal
	*/
	confirmSaveEdits({afterActionCallback=()=>{}}={}) {
		//@param afterActionCallback: a callable function to be called after either the Save or Discard button is clicked
	
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
			<button class="generic-button modal-button danger-button discard-button close-modal" data-dismiss="modal">Discard</button>
			<button class="generic-button modal-button primary-button confirm-button close-modal" data-dismiss="modal">Save</button>
		`;
		const eventHandler = () => {
			$('#alert-modal .discard-button').click(() => {
				this.discardEdits();
				afterActionCallback.call()
			});
			$('#alert-modal .confirm-button').click(() => {
				this.saveEdits().done(() => {
					afterActionCallback.call()
				});
			})
		}
		this.showModal(
			'You have unsaved edits to this briefing. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this briefing.',
			'Save edits?',
			{
				footerButtons: footerButtons,
				eventHandlerCallable: eventHandler
			}
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
		this.toggleBeforeUnload(false);
	}

	/*
	Event handler for edit button. Check for unsaved edits. If there are any, 
	ask the user what to do. Otherwise, just toggle editing
	*/
	onEditButtonClick() {
		if (!this.showDenyEditPermissionsMessage()) return;

		const $dirtyInputs = $('.input-field.dirty');
		if ($dirtyInputs.length || $('.briefing-appointment-container.selected.new-briefing').length) {
			this.confirmSaveEdits({afterActionCallback: () => {this.toggleEditing()}});
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
			const deleteOptions = {
				returning: {
					briefings: ['briefing_start']
				}
			}
			this.deleteByID('briefings', briefingID, deleteOptions)
				.done(response => {
					const errorMessage = 'An error occurred while deleting the briefing.'
					if (this.pythonReturnedError(response, {errorExplanation: errorMessage})) {
						return;
					} else {
						const result = response.data || {};
						if (Object.keys(result).length === 0) {
							this.showModal(message, 'Record Does Not Exist in Database');
							return;
						}

						// empty edits
						this.edits = {};

						// add expedition to unscheduled list
						const briefingInfo = this.getBriefingInfo(briefingID);
						this.expeditionInfo.unscheduled.push(briefingInfo.expedition_id);

						// remove briefing from info
						const briefingDateString = result.briefings[0].briefing_start;
						const briefingDate = getFormattedTimestamp(new Date(briefingDateString));
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
			const eventHandler = () => {
				$('#alert-modal .delete-button').click(() => {
					showLoadingIndicator();
					this.deleteBriefing(briefingID) 
				})
			}
			
			const footerButtons = `
				<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
				<button class="generic-button modal-button danger-button delete-button close-modal" data-dismiss="modal">Delete</button>
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
			this.showModal(
				message,
				'Delete This Briefing?',
				{
					footerButtons: footerButtons,
					eventHandlerCallable: eventHandler
				}
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
		
		this.toggleBeforeUnload(true)

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

		// If there are no more dirty inputs, toggle beforeunload event
		if (!$('.input-field.dirty:not(.filled-by-default)').length) {
			this.toggleBeforeUnload(false);
		}

		// If this is a notes field, update the notes tooltip
		if ($input.is('[name=briefing_notes]')) {
			this.setViewNotesTooltip($selectedAppointment.find('.view-notes-button'), inputValue)
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
						this.showModal(message, 'Scheduling conflict');
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
					this.showModal(message, 'Scheduling conflict');
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
		if (!isNull(expeditionID)) {
			this.setExpeditionInfoLink(expeditionID);
		}

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
			this.showModal(message, 'Invalid Briefing End Time');
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

		this.getBriefigAppointmentHTML({}, startIndex, endIndex)
			.addClass('selected new-briefing date-change-not-called')
			.appendTo('.schedule-ui-container')
			.click()
			.find('.briefing-appointment-header')
				.text('New Briefing'); // select this appointment

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

		return this.queryDB({
			where: {
				briefings_view: [
					{
						column_name: 'briefing_start', 
						operator: 'between', 
						comparand: [`${year}-1-1`, `${year}-12-31`]
					}
				]
			}
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				console.error('query failed because ' + response)
			} else {
				const briefings = response.data || [];
				// organize briefings by date
				for (const row of briefings) {
					// row.briefing_date needs to be returned as YYYY-mm-dd 00:00, so safely chop off the time
					const briefingDate = getFormattedTimestamp(new Date(row.briefing_date));
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
				this.selectCalendarCellByDate(today);//year === today.getFullYear() ? today : new Date($('.calendar-cell:not(.disabled)').first().data('date')));

				const briefingID = this.urlQueryParams.id;
				if (briefingID) {
					$(`.briefing-appointment-container[data-briefing-id=${briefingID}]`).click()
				}
			}
		})
		.fail((xhr, status, error) => {
			console.error('query failed because ' + error)
		})
		.always(() => {hideLoadingIndicator()});
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

		const rangerRoleCodes = `${this.constants.userRoleCodes.ranger}, ${this.constants.userRoleCodes.noLoginRanger}`
		var deferreds = [
			// Fill expeditions
			this.getExpeditionInfo(year)
			,
			$.post({url: '/flask/db/select/rangers'})
				.done(response => {
					const errorMessage = 'An unexpected error occurred while retrieving briefing details.';
					if (this.pythonReturnedError(response, {errorExplanation: errorMessage})) {
						return;
					} else {
						const rangers = response.data || [];
						const $input = $('#input-ranger');
						for (const row of rangers) {
							$input.append(`<option class="" value="${row.id}">${row.full_name}</option>`);
						}
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

		return this.queryDB({where:
			{
				briefings_expedition_info_view: [
					{column_name: 'planned_departure_date', operator: '>', comparand: `${year}-1-1`},
					{column_name: 'group_status_code', operator: '<>', comparand: this.constants.groupStatusCodes.cancelled}
				]
			}
		}).done(response => {
				if (this.pythonReturnedError(response)) {
					console.log('Could not get expedition info because \n' + response);
				} else {
					const result = response.data || [];
					for (const row of result) {
						this.expeditionInfo.expeditions[row.expedition_id] = {...row};
						if (row.unscheduled) this.expeditionInfo.unscheduled.push(row.expedition_id);
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
					comment: briefingInfo.briefing_notes || '',
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
			const errorMessage = 'An unexpected error occurred while exporting the briefing schedule.';
			if (this.pythonReturnedError(resultString)) {
				return;
			} else {
				window.location.href = resultString;
			}
		}).fail((xhr, status, error) => {
			this.showModal('An unexpected error occurred while exporting the briefing schedule: ' + error)
		}).always(() => {hideLoadingIndicator()})

	}


	/*
	Export button event handler
	*/
	onExportBriefingsClick() {
		const startDateStr = $('#input-export_start_date').val();
		const endDateStr = $('#input-export_end_date').val();

		// Check that the export doesn't span more than a year
		const startDate = new Date(startDateStr);
		const endDate = new Date(endDateStr);
		const rangeLengthDays = (endDate - startDate) / this.constants.millisecondsPerDay;
		if (rangeLengthDays > 366) {
			const message = 'You entered a date range of more than one year. Change either' + 
				' the start or the end date so that the total range is less than one year.'
			this.showModal(message, 'Date Range Too Large');
			return;
		}

		this.exportBriefingSchedule(startDateStr, endDateStr);
	}


	getGuideCompanyColors() {
		return this.queryDB({
			where: {
				guide_company_codes: [
					{
						column_name: 'sort_order', 
						operator: 'is not', 
						comparand: 'null'
					},
					{
						column_name: 'code', 
						operator: '<>', 
						comparand: -1
					}

				]
			}
		}).then(result => {
			if (!this.pythonReturnedError(result)) {
				for (const i in result.data) {
					const info = result.data[i];
					const colorClass = `alt-color-${parseInt(i) + 1}`;
					this.guideCompanyColors[info.code] = {
						guideCompanyName: info.name,
						class: colorClass
					}
					const $li = $('#default-color-guide-item').clone();
					$li.find('.color-swatch').addClass(colorClass);
					$li.find('.color-guide-swatch-label').text(info.name);
					$li.appendTo('.color-guide-tooltip ul');

				}
			}
		})
	}


	init() {

		showLoadingIndicator('init');

		// Call super.init()
		var initDeferreds = super.init()

		// Do synchronous stuff
		this.configureMainContent();

		
		$.when(this.getGuideCompanyColors(), initDeferreds)
			.then(() => {
			$.when(...this.fillBriefingDetailSelects())
				.then(() => {
					this.queryBriefings();
				});
		});
	}
}