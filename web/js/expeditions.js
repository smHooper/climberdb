
class ClimberDBExpeditions extends ClimberDB {
	
	constructor() {
		super();
		this.expeditionInfo = {};
		this.routeCodes = {};
		this.emergencyContacts = {}; //db id -> emergency contact pairs
		this.lastSearchQuery = (new Date()).getTime();
		this.totalResultCount;
		this.recordsPerSet = 50; /* how many climbers to show at once */
		this.currentRecordSetIndex = 0;
		this.climberForm;

		return this;
	}


	configureMainContent() {
		$('.main-content-wrapper').append(`
			<div class="fuzzy-search-bar-container">
				<input id="climber-search-bar" class="fuzzy-search-bar" placeholder="Search climbers" autocomplete="off">
				<img src="imgs/search_icon_50px.svg">
			</div>
			<div class="expedition-content">
				<!-- expedition info --> 
				<div id="expedition-data-container" class="expedition-data-wrapper col-md-6">
					<div class="expedition-data-content">
						<div class="expedition-data-header-container">
							<div class="expedition-data-header-content">	
								<input id="input-expedition_name" class="input-field expedition-data-header" value="New Expedition Name" name="expedition_name" data-table-name="expeditons" title="Expedition name" autocomplete="off">
								<select id="input-group_status" class="input-field" name="group_status_code" data-table-name="expeditons" title="Group status" autocomplete="off" data-default-value=6></select>
							</div>
							<div class="expedition-data-header-content">							
								<div id="entered-by-result-summary-item" class="result-details-summary-item col-6">
									<div id="expedition-entered-by-result-summary-item" class="col">
										<label class="result-details-summary-label">Entered by</label>
										<label class="result-details-summary-value"></label>
									</div>
									<div id="expedition-entry-time-result-summary-item" class="col">
										<label class="result-details-summary-label">Entry date</label>
										<label class="result-details-summary-value"></label>
									</div>
								</div>
							</div>
						</div>
						<div class="expedition-data-content-body">
							<div class="field-container-row">
								<div class="field-container col-6">
									<input id="input-planned_departure_date" class="input-field" name="planned_departure_date" data-table-name="expeditions" placeholder="Planned departure" title="Planned departure" type="date" autocomplete="off" required="">
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-planned_departure_date">Planned departure</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>
								<div class="field-container col-6">
									<input id="input-planned_return_date" class="input-field" name="planned_return_date" data-table-name="expeditions" placeholder="Planned return" title="Planned return" type="date" autocomplete="off" required="">
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-planned_return_date">Planned return</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>
							</div>
							<div class="field-container-row collapse">
								<div class="field-container col-6">
									<input id="input-actual_departure_date" class="input-field" name="actual_departure_date" data-table-name="expeditions" placeholder="Actual departure" title="Actual departure" type="date" data-dependent-target="#input-group_status" data-dependent-value="4,5" autocomplete="off" required="">
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-actual_departure_date">Actual departure</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>
								<div class="field-container col-6">
									<input id="input-actual_return_date" class="input-field" name="actual_return_date" data-table-name="expeditions" placeholder="Actual return" title="Actual return" type="date" autocomplete="off" required="">
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-actual_return_date">Actual return</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>
							</div>
							<div class="field-container-row">
								<div class="field-container col-sm-6">
									<select id="input-guide_company" class="input-field" name="guide_company_code" data-table-name="expeditions" title="Guide company" type="text" autocomplete="off" data-default-value="-1"></select>
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-guide_company">Guide company</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>	
								<div class="field-container col-sm-6">
									<select id="input-air_taxi" class="input-field default" name="air_taxi_code" data-table-name="expeditions" placeholder="Air taxi" title="Air taxi" type="text" autocomplete="off" required=""></select>
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-air_taxi">Air taxi</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>	
							</div>
							<div class="field-container-row">
								<div class="field-container col-sm-6">
									<select id="input-special_group_type" class="input-field default" name="special_group_type_code" data-table-name="expeditions" placeholder="Special group type" title="Special group type" type="text" autocomplete="off"></select>
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-special_group_type">Special group type</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>	
								<div class="field-container col-sm-6">
									<input id="input-permit_number" class="input-field" name="permit_number" data-table-name="expeditions" placeholder="Permit number" title="Permit number" type="number" autocomplete="off" required="">
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-permit_number">Permit number</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>	
							</div>
							<div class="field-container-row">
								<div class="field-container checkbox-field-container col-sm">
									<label class="checkmark-container">
										<input id="input-needs_special_use_permit" class="input-field input-checkbox" type="checkbox" name="needs_special_use_permit" data-table-name="expeditions">
										<span class="checkmark data-input-checkmark"></span>
									</label>
									<label class="field-label checkbox-label" for="input-needs_special_use_permit">Requires special use permit (filming, photography, etc.)</label>
								</div>
							</div>

						</div>
					</div>
				</div>

				<div class="expedition-data-wrapper col-md-6">
					<div id="climber-data-container" class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">Expedition members</h3>
							<button class="generic-button add-card-button" data-target="#expedition-members-accordion">Add member</button>
						</div>
						<div class="expedition-data-content-body">
							<div id="expedition-members-accordion" class="accordion">
								<div id="cloneable-card-expedition-members" class="card expedition-card cloneable hidden">
									<div class="card-header" id="cardHeader-expedition-members-cloneable">
										<a class="card-link collapsed col-7" data-toggle="collapse" href="#collapse-expedition-members-cloneable" data-target="collapse-expedition-members-cloneable">
											<div class="card-link-content">
												<h6 class="card-link-label expedition-member-card-link-label"></h6>
											</div>
										</a>
										<div class="card-header-content-container card-header-field-container leader-field-container col-4">
											<label class="checkmark-container">
												<input id="input-is_trip_leader" class="input-field input-checkbox" type="radio" name="is_trip_leader" data-table-name="expedition_members" title="Is trip leader?">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label class="field-label checkbox-label" for="input-is_trip_leader">Leader</label>
										</div>
										<div class="card-header-content-container col-1">
											<i class="fa fa-chevron-down pull-right"></i>
										</div>
									</div>
									<div id="collapse-expedition-members-cloneable" class="collapse card-collapse" aria-labelledby="cardHeader-expedition-members-cloneable" data-parent="#expedition-members-accordion">
										<div class="card-body">
											<ul id="expedition-member-tabs" class="nav nav-tabs" role="tablist">
												<li class="nav-item" role="presentation">
													<a id="expedition-info-tab-button" class="nav-link active" data-toggle="tab" href="#expedition-info-tab-pane" type="button" role="tab" aria-controls="expedition-info-tab-pane" aria-selected="true">Member info</a>
												</li>
												<li class="nav-item" role="presentation">
													<a id="transactions-tab-button" class="nav-link" data-toggle="tab" href="#transactions-tab-pane" type="button" role="tab" aria-controls="transactions-tab-pane" aria-selected="false">Transactions</a>
												</li>
											</ul>
											<div class="tab-content expedition-member-tab-content">
												<div id="expedition-info-tab-pane" class="tab-pane expedition-info-tab-pane fade show active" role="tabpanel" aria-labelledby="expedition-info-tab-button">
													<div class="field-container-row">
														<div class="field-container col">
															<a class="climber-link" href="#" target="_blank"></a>
														</div>
													</div>
													<div class="field-container-row">
														<div class="field-container col-sm-6">
															<select id="input-reservation_status" class="input-field default reservation-status-field" name="reservation_status_code" data-table-name="expedition_members" data-lookup-table="group_status_codes" placeholder="Reservation status" title="Reservation status"></select>
															<label class="field-label" for="input-reservation_status">Reservation status</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>	
														<div class="field-container checkbox-field-container col-sm-6">
															<label class="checkmark-container">
																<input id="input-is_illegal_guide" class="input-field input-checkbox" type="checkbox" name="is_illegal_guide" data-table-name="expedition_members" title="Illegal guide">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-is_illegal_guide">Illegal guide</label>
														</div>
													</div>
													<div class="field-container-row" style="">
														<div class="field-container col-6">
															<input id="input-datetime_reserved" class="input-field" name="datetime_reserved" data-table-name="expedition_members" placeholder="Date reserved" title="Date reserved" type="date"  autocomplete="off" required="">
															<label class="field-label" for="input-datetime_reserved">Date reserved</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
														<div class="field-container collapse col-6">
															<input id="input-datetime_cancelled" class="input-field" name="datetime_cancelled" data-table-name="expedition_members" placeholder="Date cancelled" title="Date cancelled" type="date" data-dependent-target="#input-reservation_status" data-dependent-value="1" autocomplete="off">
															<label class="field-label" for="input-datetime_cancelled">Date cancelled</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
													</div>
													<div class="field-container-row">
														<div class="field-container col-sm-6">
															<input id="input-highest_elevation_ft" class="input-field" name="highest_elevation_ft" data-table-name="expedition_members" data-table-id="" placeholder="Highest Elevation (ft)" title="Highest Elevation in feet" type="number" autocomplete="off">
															<span class="required-indicator">*</span>
															<label class="field-label" for="input-highest_elevation_ft">Highest Elevation (ft)</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>	
														<div class="field-container col-sm-6">
															<select id="input-frostbite_severity" class="input-field default" name="frostbite_severity_code" data-table-name="expedition_members" placeholder="Frostbite severity" title="Frostbite severity"></select>
															<label class="field-label" for="input-frostbite_severity_code">Frostbite severity</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>		
													</div>
													<div class="field-container-row">
														<div class="field-container col collapse">
															<input id="input-frostbite_details" class="input-field" name="frostbite_details" data-table-name="expedition_members" data-table-id="" placeholder="Frostbite details" title="Frostbite details" type="text" autocomplete="off" data-dependent-target="#input-frostbite_severity" data-dependent-value="!<blank>">
															<span class="required-indicator">*</span>
															<label class="field-label" for="input-frostbite_details">Frostbite details</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>	
													</div>
													<div class="field-container-row">
														<div class="field-container checkbox-field-container col-sm-4">
															<label class="checkmark-container">
																<input id="input-had_ams" class="input-field input-checkbox" type="checkbox" name="had_ams" data-table-name="expedition_members" title="Climber had AMS">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-had_ams">AMS</label>
														</div>
														<div class="field-container checkbox-field-container col-sm-4">
															<label class="checkmark-container">
																<input id="input-had_hace" class="input-field input-checkbox" type="checkbox" name="had_hace" data-table-name="expedition_members" title="Climber had HACE">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-had_hace">HACE</label>
														</div>
														<div class="field-container checkbox-field-container col-sm-4">
															<label class="checkmark-container">
																<input id="input-had_hape" class="input-field input-checkbox" type="checkbox" name="had_hape" data-table-name="expedition_members" title="Climber had HAPE">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-had_hape">HAPE</label>
														</div>
													</div>
													<div class="field-container-row">
														<div class="field-container col">
															<label class="field-label" for="input-medical_notes">Medical notes</label>
															<textarea id="input-medical_notes" class="input-field" name="medical_notes" data-table-name="expedition_members" placeholder="Enter notes about medical issues that occurred during this climb" title="Medical notes" type="text" autocomplete="off"></textarea>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
													</div>													
													<div class="field-container-row">
														<div class="field-container col">
															<label class="field-label" for="input-internal_notes">Internal notes about this climb</label>
															<textarea id="input-internal_notes" class="input-field" name="internal_notes" data-table-name="expedition_members" placeholder="Enter notes for other rangers to see about this climb" title="Internal notes" type="text" autocomplete="off"></textarea>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
													</div>													
													<div class="field-container-row">
														<div class="field-container col">
															<label class="field-label" for="input-climber_comments">Climber comments</label>
															<textarea id="input-climber_comments" class="input-field" name="climber_comments" data-table-name="expedition_members" placeholder="Enter comments from the climber" title="Climber comments" type="text" autocomplete="off"></textarea>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
													</div>
												</div>
												<div id="transactions-tab-pane" class="tab-pane transactions-tab-pane fade" role="tabpanel" aria-labelledby="transactions-tab-button">
													<div class="transactions-header-container">
														
														<h5 class="expedition-data-sub-header"></h5>
														<button class="generic-button add-transaction-button" role="button" type="button">Add transaction</button>
													</div>
													<div class="transactions-container-body">
														<div class="data-list-item data-list-item-header">
															<label class="data-list-col data-list-header-label col-3">Type</label>
															<label class="data-list-col data-list-header-label col-3">Value</label>
															<label class="data-list-col data-list-header-label col-6">Transaction notes</label>
														</div>
														<ul id="transactions-list" class="data-list">
															<li class="data-list-item cloneable hidden">
																<div class="col-3">
																	<select id="input-transaction_type" class="input-field" name="transaction_type_code" data-table-name="transactions" title="Transaction type"></select>
																</div>
																<div class="col-3">
																	<span class="unit-symbol">$</span>
																	<input id="input-transaction_value" class="input-field" name="transaction_value" data-table-name="transactions" title="Transaction value"> 
																</div>
																<div class="col-6">
																	<input id="input-transaction_notes" class="input-field" name="transaction_notes" type="text" data-table-name="transactions" title="Transaction type"> 
																</div>
															</li>
														</ul>
														<div class="data-list-item data-list-footer">
															<label class="data-list-col data-list-header-label col-3">Balance</label>
															<label class="data-list-col data-list-header-label total-col col-3">
																<span>$</span><span class="total-span"></span>
															</label>
															<label class="data-list-col data-list-header-label col-6"></label>
														</div>
													</div>
												</div>
											</div>

										</div>
									</div>
								</div> <!-- card -->
							</div> <!-- expedition-members-accordion -->								

						</div>
					</div>

				</div>
				<div class="expedition-data-wrapper col-md-6">
					<div id="routes-data-container" class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">Routes</h3>
							<button class="generic-button add-card-button" data-target="#routes-accordion">Add route</button>
						</div>
						<div class="expedition-data-content-body">
							<div id="routes-accordion" class="accordion">
								<div id="cloneable-card-routes" class="card expedition-card cloneable hidden">
									<div class="card-header" id="cardHeader-routes-cloneable">
										<a class="card-link" data-toggle="collapse" href="#collapse-routes-cloneable" data-target="collapse-routes-cloneable">
											<div class="card-link-content">
												<h6 class="card-link-label expedition-member-card-link-label"></h6>
											</div>
											<div class="card-link-content">
												<i class="fa fa-chevron-down pull-right"></i>
											</div>
										</a>
									</div>
									<div id="collapse-routes-cloneable" class="collapse card-collapse show" aria-labelledby="cardHeader-routes-cloneable" data-parent="#routes-accordion">
										<div class="card-body">
											<div class="data-list-item data-list-item-header">
												<label class="data-list-col data-list-header-label col-4"></label>
												<label class="data-list-col data-list-header-label col-3 text-center">Summited?</label>
												<label class="data-list-col data-list-header-label col-5">Summit date</label>
											</div>
											<ul id="route-member-list" class="data-list route-member-list">
												<li class="data-list-item cloneable hidden">
													<div class="col-4">
														<label class="data-list-header-label name-label"></label>
													</div>
													<div class="col-3 center-checkbox-col">
														<label class="checkmark-container">
															<input id="input-route_summited" class="input-field input-checkbox route-summited-checkbox" type="checkbox" name="route_was_summited" data-table-name="expedition_member_routes" title="Route summitted?">
															<span class="checkmark data-input-checkmark"></span>
														</label>
													</div>
													<div class="col-5">
														<input id="input-summit_date" class="input-field" name="summit_date" type="date" data-table-name="expedition_member_routes" title="Summit date"> 
													</div>
												</li>
											</ul>
											<div class="data-list-item data-list-footer">
												<div class="data-list-col data-list-header-label col-4"></div>
												<div class="data-list-col data-list-header-label center-checkbox-col col-3">
													<button class="text-only-button check-all-summitted-button w-100">check all</button>
												</div>
												<div class="data-list-col data-list-header-label col-5"></div>
											</div>
										</div>
									</div>
								</div> <!-- card -->
							</div> <!-- routes-accordion -->	
						</div>
					</div>
				</div>
				<div class="expedition-data-wrapper col-md-6">
					<div id="cmcs-data-container" class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">CMCs</h3>
							<div class="expedition-data-header-content"></div>
						</div>
						<div class="expedition-data-content-body">
						</div>
					</div>
				</div>
			</div>
		`);

		//$('select.input-field').change(e => {this.onSelectChange(e)})
		$(document).on('click', '.add-transaction-button', e => {
			this.addNewListItem($(e.target).closest('.transactions-tab-pane').find('.transaction-list'))
		});

		// When the leader input checkbox changes, set the transparent class appropriately
		$(document).on('change', '.leader-field-container .input-checkbox', e => {
			const $checkbox = $(e.target).closest('.input-checkbox');
			const isChecked = $checkbox.prop('checked');
			// If this chekcbox is being checked, hide all others
			if (isChecked) {
				$(`.leader-field-container .input-checkbox:not(#${$checkbox.attr('id')})`).closest('.leader-field-container').addClass('transparent');
			}
			$checkbox.closest('.leader-field-container').toggleClass('transparent', !isChecked);
		})

		// Set the cancelled time when the reservation status is set to cancelled
		// also check all other reservation status fields to see if the whole group is ready
		$(document).on('change', '.reservation-status-field', e => {
			const $select = $(e.target);
			const value = $select.val();
			const cardID = $select.attr('id').match(/-\d+$/).toString();
			const now = getFormattedTimestamp();
			$(`#input-datetime_cancelled${cardID}`).val(value == 1 ? now : null).change();

			const reservationStatuses = $select.closest('.accordion').find('.card:not(.cloneable) .reservation-status-field')
				.map((_, el) => el.value)
				.get();
			const firstStatus = reservationStatuses[0];
			const $groupStatusSelect = $('#input-group_status');

			if (reservationStatuses.every(v => v == firstStatus || v == 6) && $groupStatusSelect.val() != firstStatus) { 
				$groupStatusSelect.val(firstStatus).change();
			}

		});

		// Show modal to prompt user to enter summit date
		$('.check-all-summitted-button').click(e => {
			const $button = $(e.target);
			const $card = $button.closest('.card');
			const $checkboxes = $card.find('.data-list-item:not(.cloneable) .center-checkbox-col .input-checkbox');
			const cardID = $card.attr('id');
			const checkboxIDs = '#' + $checkboxes.map((_, el) => el.id).get().join(',#');
			const summitDateInputIDs = '#' + $checkboxes.closest('.center-checkbox-col').next().find('.input-field').map((_, el) => el.id).get().join(',#');
			const allChecked = $checkboxes.filter(':checked').length == $checkboxes.length;
			const expeditionName = this.expeditionInfo.expeditions.expedition_name;//$('#input-expedition_name').val();
			const routeName = this.routeCodes[this.expeditionInfo.routes.order[$card.index() - 1]].name;
			var message, title, onConfirmClick;
			if (allChecked) {
				// Ask user to uncheck all and clear
				message = `Are you sure you want to uncheck all ${routeName} summits for ${expeditionName}?`;
				title = `Uncheck all ${routeName} summits`;
				onConfirmClick = `
					$('${checkboxIDs}').prop('checked', false);
					$('${summitDateInputIDs}').val(null);
					$('#${cardID}').find('.check-all-summitted-button').text('check all');
				`;

			} else {
				message = `<p>Do you want to mark all expedition members for the ${routeName} route` + 
				` with the same summit date? This will overwrite any summit dates currently entered.` + 
				` If so, enter the date below and click 'OK'. Otherwise just click 'OK' and all` + 
				` expedition members will be marked as having summitted but the summit date(s) won't change.</p>
				<div class="field-container col-8 single-line-field">
						<label class="field-label inline-label" for="modal-summit-date-input">Summit date</label>
						<input id="modal-summit-date-input" class="input-field modal-input" type="date">
				</div>
				`;
				title = 'Enter summit date?';
				onConfirmClick = `
					const summitDate = $('#modal-summit-date-input').val();
					$('${checkboxIDs}').prop('checked', true);
					if (summitDate) $('${summitDateInputIDs}').val(summitDate);	
					$('#${cardID}').find('.check-all-summitted-button').text('uncheck all')
				`;
			}
			const footerButtons = `
				<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
				<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">OK</button>
			`;
			showModal(message, title, 'confirm', footerButtons);
		});

		// Set text of check/uncheck all button when 
		$('.route-summited-checkbox').change(e => {
			const $card = $(e.target).closest('.card');
			const $checkboxes = $card.find('.data-list-item:not(.cloneable) .center-checkbox-col .input-checkbox');
			const allChecked = $checkboxes.filter(':checked').length == $checkboxes.length;
			$card.find('.check-all-summitted-button').text(allChecked ? 'uncheck all' : 'check all');
		});


	}


	fillFieldValues() {
		
		const expeditionData = this.expeditionInfo.expeditions;
		for (const el of $('#expedition-data-container .input-field')) {
			this.fillInputField(el, expeditionData, {dbID: expeditionData.id, triggerChange: true});
		}
		$('#expedition-entered-by-result-summary-item > .result-details-summary-value').text(expeditionData.entered_by);
		$('#expedition-entry-time-result-summary-item > .result-details-summary-value').text(expeditionData.entry_time);

		// add expedition member cards
		const members = this.expeditionInfo.members;
		for (const memberID of members.order) {
			const thisMember = members.data[memberID];
			const $newCard = this.addNewCard($('#expedition-members-accordion'), 
				{
					accordionName: 'expedition_members', 
					cardLinkText: `${thisMember.last_name}, ${thisMember.first_name}`,
					updateIDs: {expedition_members: memberID},
					show: false
				}
			);
			$newCard.find('.climber-link')
				.attr('href', `climbers.html?id=${thisMember.climber_id}`)
				.text(`View ${thisMember.first_name} ${thisMember.last_name}'s climber info`);
			const cardID = $newCard.attr('id').match(/-\d+$/).toString()
			
			// Update other IDs and attributes that addNewCard() doesn't adjust
			for (const el of $newCard.find('.nav.nav-tabs a.nav-link')) {
				el.id = el.id + cardID;
				// Use the .attr(href) instead of el.href because the latter 
				//	copies the complete url which doesn't work
				const $el = $(el);
				$el.attr('href', $el.attr('href') + cardID); 
				$el.attr('aria-controls', $el.attr('aria-controls') + cardID);
			};
			for (const el of $newCard.find('.tab-pane')) {
				el.id = el.id + cardID;
				const $el = $(el);
				$el.attr('aria-labelledby', $el.attr('aria-labelledby') + cardID);
			};
			for (const el of $newCard.find('.nav-tabs, .tab-content')) {
				el.id = el.id + cardID;
			}
			const $transactionsList = $newCard.find('.data-list');
			$transactionsList.attr('id', $transactionsList.attr('id') + '-' + memberID);
			
			// Fill inputs
			for (const el of $newCard.find('.card-header .input-field, .expedition-info-tab-pane .input-field')) {
				this.fillInputField(el, thisMember, {dbID: memberID, triggerChange: true})
			}
			// Add transaction rows
			const transactions = this.expeditionInfo.transactions[memberID];
			var transactionTotal = 0;
			for (const transactionID of transactions.order) {
				const $item = this.addNewListItem($transactionsList, {dbID: transactionID});
				const thisTransaction = transactions.data[transactionID];
				for (const el of $item.find('.input-field')) {
					this.fillInputField(el, thisTransaction, {dbID: transactionID});
				}
				transactionTotal = transactionTotal + parseFloat(thisTransaction.transaction_value || 0);
			}
			$transactionsList.siblings('.data-list-footer')
				.find('.data-list-header-label.total-col .total-span')
				.text(transactionTotal.toFixed(2));
		}

		// routes
		const routes = 	this.expeditionInfo.routes;
		for (const routeCode of routes.order) {
			const thisRoute = routes.data[routeCode];
			const routeName = this.routeCodes[routeCode].name;
			// add card
			const $newCard = this.addNewCard($('#routes-accordion'), 
				{
					accordionName: 'routes', 
					cardLinkText: routeName
				}
			);
			const $list = $newCard.find('.route-member-list');
			$list.attr('id', $list.attr('id') + '-' + routeCode);
			// List items should be in alphabetical order, so add them in order of the members
			for (const memberID of members.order) {
				// Not all expedition members climb necessarily climb all routes
				if (memberID in thisRoute) {
					const memberRouteRecord = thisRoute[memberID];
					const $listItem = this.addNewListItem($list, {dbID: memberRouteRecord.expedition_member_route_id});
					const thisMember = members.data[memberID];
					$listItem.find('.name-label').text(`${thisMember.last_name}, ${thisMember.first_name}`);
					for (const el of $listItem.find('.input-field')) {
						this.fillInputField(el, memberRouteRecord, {dbID: memberRouteRecord.expedition_member_route_id});
					}
				}
				
				
			}
		}
	}

	queryExpedition(expeditionID) {
		
		this.expeditionInfo = {
			expeditions: {}, // each field is a property
			members: {data: {}, order: []}, // array of objects. For each object, each field is a prop 
			routes: {data: {}, order: []}, // props are exp. member IDs and values are arrays
			transactions: {}, // props are exp. member IDs and values are arrays
		}

		const sql = `
			SELECT 
				*
			FROM expedition_info_view 
			WHERE expedition_id=${expeditionID} 
		`

		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while querying the database: ${queryResultString.trim()}.`, 'Unexpected error');
					return;
				} else {
					const result = $.parseJSON(queryResultString);
					// Get expedition info
					if (result.length) {
						const firstRow = result[0];//there should only be one
						for (const fieldName in this.tableInfo.tables.expeditions.columns) {
							const queryField = this.entryMetaFields.includes(fieldName) ? 'expeditions_' + fieldName : fieldName;
							this.expeditionInfo.expeditions[fieldName] = firstRow[queryField];
						}
						this.expeditionInfo.expeditions.id = firstRow.expedition_id;
					} else {
						showModal(`There are no expeditions with the database ID '${expeditionID}'.`, 'Unexpected error');
					}

					// Get data for right-side tables
					let members = this.expeditionInfo.members;
					let transactions = this.expeditionInfo.transactions;
					let routes = this.expeditionInfo.routes;
					for (const row of result) {
						// get expedition members
						const memberID = row.expedition_member_id;
						if (!(memberID in members.data) && memberID != null) {
							members.data[memberID] = {};
							members.order.push(memberID);
							transactions[memberID] = {data: {}, order: []};
							for (const fieldName in this.tableInfo.tables.expedition_members.columns) {
								const queryField = this.entryMetaFields.includes(fieldName) ? 'expedition_members_' + fieldName : fieldName;
								members.data[memberID][fieldName] = row[queryField];
							}
							members.data[memberID].first_name = row.first_name;
							members.data[memberID].last_name = row.last_name;
						}
						const transactionID = row.transaction_id;
						if (transactionID != null) {
							if (!(transactionID in transactions[memberID])) {
								transactions[memberID].data[transactionID] = {};
								transactions[memberID].order.push(transactionID);
								for (const fieldName in this.tableInfo.tables.transactions.columns) {
									const queryField = this.entryMetaFields.includes(fieldName) ? 'transactions_' + fieldName : fieldName;
									//transactions[memberID].data[transactionID][fieldName] = row[queryField];
									transactions[memberID].data[transactionID][fieldName] = 
										queryField === 'transaction_value' ? 
										row[queryField].replace(/\(/, '-').replace(/[$)]/g, '') :
										row[queryField];
								}
							}
						}

						/* this.expeditionInfo.routes = {
							data: {
								routeCode: {
									memberID: {...}
								}
							},
							order: [
								routeID
							]
						}
						*/
						const routeCode = row.route_code;
						if (!(routeCode in routes.data) && routeCode != null) {
							routes.data[routeCode] = {};
							routes.order.push(routeCode);
						}
						if (!(memberID in routes.data[routeCode])) { // don't need to check if memberID is null because it can't be if routeCode isn't
							routes.data[routeCode][memberID] = {};
							for (const fieldName in this.tableInfo.tables.expedition_member_routes.columns) {
								routes.data[routeCode][memberID][fieldName] = row[fieldName];
							}
							routes.data[routeCode][memberID].expedition_member_route_id = row.expedition_member_route_id;
						}

						
					}

					this.fillFieldValues();
				}
			})
		/*// Query each table separately since there are cascading one-to-many relationships
		return $.when(
			this.queryDB(`SELECT * FROM expeditions WHERE id=${parseInt(expeditionID)}`)
				.done(queryResultString => {
					if (this.queryReturnedError(queryResultString)) {
						showModal(`An unexpected error occurred while querying data from the expeditions table: ${queryResultString.trim()}.`, 'Unexpected error');
						return;
					} else {
						let result = $.parseJSON(queryResultString);
						if (result.length) {
							result = result[0];//there should only be one
							this.expeditionInfo.expeditions = {...result};
						} else {
							showModal(`There are no expeditions with the database ID '${expeditionID}'.`, 'Unexpected error');
						}
					} 
				}),
			this.queryDB(`SELECT id AS expedition_member_id, * FROM expedition_members WHERE id=${parseInt(expeditionID)}`)
				.done(queryResultString => {
					if (this.queryReturnedError(queryResultString)) {
						showModal(`An unexpected error occurred while querying data from the expedition_members table: ${queryResultString.trim()}.`, 'Unexpected error');
						return;
					} else {
						const result = $.parseJSON(queryResultString);
						for (const row of result) {
							this.expeditionInfo.members[row.expedition_member_id] = {...row};
						}
					}
				}),
			this.queryDB(`
				SELECT expedition_member_routes.* 
				FROM expedition_member_routes JOIN expedition_members ON expedition_member_routes.expedition_member_id=expedition_members.id
				WHERE expedition_id=${parseInt(expeditionID)}
			`).done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while querying data from the expedition_member_routes table: ${queryResultString.trim()}.`, 'Unexpected error');
					return;
				} else {
					const result = $.parseJSON(queryResultString);
					let routes = this.expeditionInfo.routes;
					for (const row of result) {
						// Add the expedition member ID if it doesn't already exist. This will be an array of route info objects
						if (!(row.expedition_member_id in routes)) routes[row.expedition_member_id] = [];
						// Add all route fields
						routes[row.expedition_member_id].push(row);
					}
				}
			}),
			this.queryDB(`
				SELECT transactions.* 
				FROM transactions JOIN expedition_members ON transactions.expedition_member_id=expedition_members.id
				WHERE expedition_id=${parseInt(expeditionID)}
			`).done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while querying data from the transactions table: ${queryResultString.trim()}.`, 'Unexpected error');
					return;
				} else {
					const result = $.parseJSON(queryResultString);
					let transactions = this.expeditionInfo.expedition_member_routes;
					for (const row of result) {
						// Add the expedition member ID if it doesn't already exist. This will be an array of route info objects
						if (!(row.expedition_member_id in transactions)) transactions[row.expedition_member_id] = [];
						// Add all route fields
						transactions[row.expedition_member_id].push(row);
					}
				}
			})
		)*/
	}


	parseURLQueryString(queryString) {
		decodeURIComponent(window.location.search.slice(1))
	}

	init() {
		// Call super.init()
		this.showLoadingIndicator('init');
		var initDeferreds = super.init();

		// Do additional synchronous initialization stuff
		this.configureMainContent();

		// Get route codes first if they haven't been queried yet.
		//	This needs to happen before filling the result-summary-pane
		//	because fillResultList() substitue state_codes for the short_name
		const lookupDeferreds = [];
		if (Object.keys(this.routeCodes).length === 0) {
			lookupDeferreds.push(
				this.queryDB('SELECT * FROM route_codes')
					.done((queryResultString) => {
						if (!this.queryReturnedError(queryResultString)) {
							for (const route of $.parseJSON(queryResultString)) {
								this.routeCodes[route.code] = {...route};
							}
						}
					})
			)
		} 
		// ******** get transaction default amounts

		$.when(this.fillAllSelectOptions(), initDeferreds, ...lookupDeferreds).then(() => {
			if (window.location.search.length) {
				const params = Object.fromEntries(
					decodeURIComponent(window.location.search.slice(1))
						.split('&')
						.map(s => s.split('=')
					)
				);
				if ('id' in params) {
					this.queryExpedition(params.id);
				}
			} else {

			}
		}).always(() => {
			hideLoadingIndicator()
		});

		return initDeferreds;
	}
}