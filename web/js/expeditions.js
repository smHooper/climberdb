
class ClimberDBExpeditions extends ClimberDB {
	
	constructor() {
		super();
		this.expeditionInfo = {
			expeditions: {}, // each field is a property
			expedition_members: {data: {}, order: []}, 
			expedition_member_routes: {data: {}, order: []},
			transactions: {}, // props are exp. member IDs
			cmc_checkout: {data: {}, order: []},
			communication_devices: {data: {}, order: []},
			briefings: {} 
		}
		this.routeCodes = {};
		this.mountainCodes = {};
		this.cmcInfo = {
			rfidTags: {}, // keys are RFID tag IDs, vals are db IDs
			cmcCanIDs: {} // keys are db IDs, vals are can IDs
		};
		this.defaultTransactionFees = {};
		this.lastSearchQuery = (new Date()).getTime();
		this.totalResultCount;
		this.climberForm;
		this.edits = {
			updates: {},
			inserts: {}
		}
		this.historyBuffer = []; // for keeping track of browser navigation via back and forward buttons
		this.currentHistoryIndex = 0;

		return this;
	}


	configureMainContent() {
		$('.main-content-wrapper').append(`
			<div id="page-top-bookmark" aria-hidden="true"></div> <!--dummy element to allow scrolling back to top of page-->
			<div class="main-content-header">
				<input id="expedition-id-input" class="hidden" aria-hidden="True">
				<div class="fuzzy-search-bar-container">
					<input id="expedition-search-bar" class="fuzzy-search-bar" placeholder="Type to search expeditions" title="Expedition search bar">
					<img class="search-bar-icon" src="imgs/search_icon_50px.svg">
					<button class="show-query-options-button icon-button" title="Expedition filter options">
						<img class="show-search-options-icon" src="imgs/search_options_icon_100px.svg">
					</button>
					<div id="expedition-options-drawer" class="fuzzy-search-bar-drawer expedition-options-container collapse">
					</div>
					<div id="search-options-drawer" class="fuzzy-search-bar-drawer search-options-container collapse">
						<div class="fuzzy-search-bar-drawer-content">
							<div class="query-option-container col-4">
								<div class="query-option-condition-header">
									<label class="query-option-label" for="query-option-planned_departure">Planned departure</label>
								</div>
								<div class="query-option-condition-container">
									<select class="query-option-operator datetime-query-option" value="equals">
										<option value="=">equals</option>
										<option value="<=">is before</option>
										<option value=">=">is after</option>
										<option value="BETWEEN">is between</option>
									</select>
									<input id="query-option-planned_departure" class="query-option-input-field single-value-field datetime-query-option" type="date" data-field-name="planned_departure_date">
									<div class="query-option-double-value-container hidden">
										<input class="query-option-input-field double-value-field low-value-field datetime-query-option" type="date" data-field-name="planned_departure_date" aria-hidden="true">
										<span>and</span>
										<input class="query-option-input-field double-value-field high-value-field datetime-query-option" type="date" data-field-name="planned_departure_date" aria-hidden="true">
									</div>
								</div>
							</div>

							<div class="query-option-container col-4">
								<div class="query-option-condition-header">
									<label class="query-option-label" for="query-option-planned_return">Planned return</label>
								</div>
								<div class="query-option-condition-container">
									<select class="query-option-operator datetime-query-option" value="equals">
										<option value="=">equals</option>
										<option value="<=">is before</option>
										<option value=">=">is after</option>
										<option value="BETWEEN">is between</option>
									</select>
									<input id="query-option-planned_return" class="query-option-input-field single-value-field datetime-query-option" type="date" data-field-name="planned_return_date">
									<div class="query-option-double-value-container hidden">
										<input class="query-option-input-field double-value-field low-value-field datetime-query-option" type="date" data-field-name="planned_return_date" aria-hidden="true">
										<span>and</span>
										<input class="query-option-input-field double-value-field high-value-field datetime-query-option" type="date" data-field-name="planned_return_date" aria-hidden="true">
									</div>
								</div>
							</div>

							<div class="query-option-container col-4">
								<div class="query-option-condition-header">
									<label class="query-option-label" for="query-option-group_status">Group status</label>
								</div>
								<div class="query-option-condition-container checkbox-option-group">
									<select id="query-option-group_status" class="input-field query-option-input-field select2-no-tag ignore-changes" multiple="multiple" data-field-name="group_status_code" data-lookup-table="group_status_codes">
									</select>
								</div>
							</div>

							<div class="w-100 d-flex justify-content-center align-items-center pt-3">
								<button id="update-search-filter-button" class="generic-button">update filter</button>
							</div>
						</div>
					</div>
				</div>
				<div class="edit-button-container">
					<button id="save-expedition-button" class="expedition-edit-button icon-button save-edits-button hidden" type="button" aria-label="Save edits" title="Save edits" aria-hidden="true">
						<i class="fas fa-2x fa-save"></i>
					</button>
					<button id="delete-expedition-button" class="expedition-edit-button icon-button delete-expedition-button hidden" type="button" aria-label="Delete expedition" title="Delete expedition" aria-hidden="true">
						<i class="fas fa-2x fa-trash"></i>
					</button>
					<button id="edit-expedition-button" class="expedition-edit-button icon-button hidden" type="button" aria-label="Edit expedition" title="Edit expedition">
						<i class="fas fa-2x fa-edit"></i>
					</button>
					<button id="open-reports-modal-button" class="expedition-edit-button icon-button hidden" type="button" aria-label="Open exports menu" title="Open exports menu">
						<i class="fas fa-2x fa-file-export"></i>
					</button>
				</div>
				<button id="add-new-expedition-button" class="generic-button" title="New Expedition">new expedition</button>
			</div>
			<div class="expedition-content uneditable">
				<!-- expedition info --> 
				<div id="expedition-data-container" class="expedition-data-wrapper">
					<div class="expedition-data-content">
						<div class="expedition-data-header-container">
							<div class="expedition-data-header-content">	
								<input id="input-expedition_name" class="input-field expedition-data-header" placeholder="New Expedition Name" name="expedition_name" data-table-name="expeditions" title="Expedition name" autocomplete="off" required="">
								<select id="input-group_status" class="input-field filled-by-default needs-filled-by-default" name="group_status_code" data-table-name="expeditions" title="Group status" autocomplete="off" data-default-value=1 tabindex=-1></select>
							</div>
							<div class="expedition-data-header-content">							
								<div class="result-details-summary-item col-6">
									<div id="expedition-entered-by-result-summary-item" class="col">
										<label class="result-details-summary-label">Entered by</label>
										<label class="result-details-summary-value"></label>
									</div>
									<div id="expedition-entry-time-result-summary-item" class="col">
										<label class="result-details-summary-label">Entry date</label>
										<label class="result-details-summary-value"></label>
									</div>
								</div>							
								<div class="result-details-summary-item col-6">
									<div id="expedition-n-members-result-summary-item" class="col collapse">
										<label class="result-details-summary-label">Current members</label>
										<label class="result-details-summary-value"></label>
									</div>
									<div id="expedition-entry-time-result-summary-item" class="col">
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
									<input id="input-actual_departure_date" class="input-field" name="actual_departure_date" data-table-name="expeditions" placeholder="Actual departure" title="Actual departure" type="date" data-dependent-target="#input-group_status" data-dependent-value="3,4,5" autocomplete="off" required="">
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
									<select id="input-guide_company" class="input-field filled-by-default needs-filled-by-default" name="guide_company_code" data-table-name="expeditions" title="Guide company" type="text" autocomplete="off" data-default-value="-1"></select>
									<span class="required-indicator">*</span>
									<label class="field-label" for="input-guide_company">Guide company</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>	
								<div class="field-container col-sm-6">
									<select id="input-air_taxi" class="input-field default filled-by-default needs-filled-by-default" name="air_taxi_code" data-table-name="expeditions" data-default-value="-1" placeholder="Air taxi" title="Air taxi" type="text" autocomplete="off"></select>
									<label class="field-label" for="input-air_taxi">Air taxi</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>	
							</div>
							<div class="field-container-row">
								<div class="field-container col-sm-6">
									<select id="input-special_group_type" class="input-field default filled-by-default needs-filled-by-default" name="special_group_type_code" data-table-name="expeditions" placeholder="Special group type" title="Special group type" type="text" autocomplete="off"></select>
									<label class="field-label" for="input-special_group_type">Special group type</label>
									<span class="null-input-indicator">&lt; null &gt;</span>
								</div>	
								<div class="field-container checkbox-field-container col-6">
									<label class="checkmark-container">
										<input id="input-needs_special_use_permit" class="input-field input-checkbox" type="checkbox" name="needs_special_use_permit" data-table-name="expeditions">
										<span class="checkmark data-input-checkmark"></span>
									</label>
									<label class="field-label checkbox-label" for="input-needs_special_use_permit">Requires additional permit (photography, etc.)</label>
								</div>
							</div>
							<div class="field-container-row">
								<div class="col-6 pl-0 collapse">
										<label class="field-label expedition-briefing-link-label" for="expedition-briefing-link">No briefing scheduled</label>
										<a id="expedition-briefing-link" class="briefing-link" href="briefings.html" target="_blank" aria-hidden="true">Set briefing time</a>
								</div>
								<div class="col-6 pl-0">
									<a class="page-bottom-jump-link" href="#cmcs-data-container">CMC and Comms Info</a>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div id="expedition-member-data-container" class="expedition-data-wrapper">
					<div class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">Expedition members</h3>
							<button id="show-modal-climber-form-button" class="generic-button add-data-button" data-target="#expedition-members-accordion">Add member</button>
						</div>
						<div class="expedition-data-content-body">
							<div id="expedition-members-accordion" class="accordion" data-table-name="expedition_members" data-item-display-name="expedition member">
								<div id="cloneable-card-expedition-members" class="card expedition-card cloneable hidden">
									<div class="card-header show-children-on-hover" id="cardHeader-expedition-members-cloneable">
										<a class="card-link collapsed col-7 pl-0" data-toggle="collapse" href="#collapse-expedition-members-cloneable" data-target="collapse-expedition-members-cloneable">
											<div class="card-link-content col-8 pl-0">
												<h6 class="card-link-label expedition-member-card-link-label col px-0"></h6>
											</div>
											<div class="expedition-member-badge-container card-link-content col-4 pl-0">
												<img class="result-details-header-badge climber-fee-icon transparent" src="imgs/climber_fee_icon_50px.svg" title="Climber fee paid" aria-hidden="true">
												<img class="result-details-header-badge entrance-fee-icon transparent" src="imgs/entrance_fee_icon_100px.svg" title="Entrance fee paid" aria-hidden="true">
												<img class="result-details-header-badge guide-icon transparent" src="imgs/guide_icon_100px.svg" title="Guiding on this expedition" aria-hidden="true">
											</div>
										</a>
										<div class="card-header-content-container card-header-field-container leader-checkbox-container transparent">
											<label class="checkmark-container">
												<input id="input-is_trip_leader" class="input-field input-checkbox" type="checkbox" name="is_trip_leader" data-table-name="expedition_members" title="Is trip leader?">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label class="field-label checkbox-label" for="input-is_trip_leader">Leader</label>
										</div>
										<div class="card-header-content-container card-header-field-container">
											<label class="checkmark-container">
												<input id="input-application_complete" class="input-field input-checkbox" type="checkbox" name="application_complete" data-table-name="expedition_members" title="Permit application complete?">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label class="field-label checkbox-label" for="input-application_complete">SUP app.</label>
										</div>
										<div class="card-header-content-container card-header-field-container">
											<label class="checkmark-container">
												<input id="input-psar_complete" class="input-field input-checkbox" type="checkbox" name="psar_complete" data-table-name="expedition_members" title="PSAR form complete?">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label class="field-label checkbox-label" for="input-psar_complete">PSAR</label>
										</div>
										<div class="member-card-header-chevron-container col-2 pr-0">
											<button class="change-expedition-button icon-button show-on-parent-hover" title="Move to different expedition">
												<img src="imgs/change_groups_icon_50px.svg">
											</button>
											<button class="delete-card-button icon-button show-on-parent-hover" title="Delete expedition member">
												<i class="fa fa-trash"></i>
											</button>
											<i class="fa fa-chevron-down pull-right"></i>
										</div>
									</div>
									<div id="collapse-expedition-members-cloneable" class="collapse card-collapse" aria-labelledby="cardHeader-expedition-members-cloneable" data-parent="#expedition-members-accordion">
										<div class="card-body">
											<ul id="expedition-member-tabs" class="nav nav-tabs" role="tablist">
												<li class="nav-item" role="presentation">
													<a id="expedition-info-tab-button" class="nav-link active" data-toggle="tab" href="#expedition-info-tab-pane" type="button" role="tab" aria-controls="expedition-info-tab-pane" aria-selected="true">Member info</a>
												</li>
												<li class="nav-item show-transaction-tab-button" role="presentation">
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
															<select id="input-reservation_status" class="input-field default reservation-status-field" name="reservation_status_code" data-table-name="expedition_members" data-lookup-table="group_status_codes" placeholder="Reservation status" title="Reservation status" data-default-value="1" value="1"></select>
															<label class="field-label" for="input-reservation_status">Reservation status</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>	
														<div class="field-container checkbox-field-container col-sm-6">
															<label class="checkmark-container">
																<input id="input-flagged" class="input-field input-checkbox" type="checkbox" name="flagged" data-table-name="expedition_members" title="Flag this expedition member">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-flagged">Flag this expedition member</label>
														</div>
													</div>
													<div class="field-container-row">
														<div class="field-container col collapse">
															<label class="field-label" for="input-flagged_reason">Reason for flagging this expedition member</label>
															<textarea id="input-flagged_reason" class="input-field" name="flagged_reason" data-table-name="expedition_members" placeholder="Describe why you flagged this expedition member" title="Flagged reason" type="text" autocomplete="off" data-dependent-target="#input-flagged" data-dependent-value="true" required=""></textarea>
															<span class="required-indicator">*</span>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>	
														<div class="field-container col-sm-6 hidden">
															<input id="input-flagged_by" class="input-field" name="flagged_by" data-table-name="expedition_members" title="Flagged by" type="text">
														</div>
													</div>
													<div class="field-container-row">
														<div class="field-container col-sm-6">
															<input id="input-permit_number" class="input-field" name="permit_number" data-table-name="expedition_members" placeholder="Permit number" title="Permit number" type="number" autocomplete="off">
															<label class="field-label" for="input-permit_number">Permit number</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>	
														<div class="field-container checkbox-field-container col-sm-6">
															<label class="checkmark-container">
																<input id="input-is_illegal_guide" class="input-field input-checkbox" type="checkbox" name="is_illegal_guide" data-table-name="expedition_members" title="Illegal guide">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-is_illegal_guide">Confirmed illegal guide</label>
														</div>
													</div>
													<div class="field-container-row collapse">
														<div class="field-container col-sm-6">
															<label class="checkmark-container">
																<input id="input-is_guiding" class="input-field input-checkbox" type="checkbox" name="is_guiding" data-table-name="expedition_members" title="Is a guide on this expedition">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-is_guiding">Guiding on this expedition</label>
														</div>	
														<div class="field-container checkbox-field-container col-sm-6">
															<label class="checkmark-container">
																<input id="input-is_interpreter" class="input-field input-checkbox" type="checkbox" name="is_interpreter" data-table-name="expedition_members" title="Interpreter on this expedition">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-is_interpreter">Interpreter on this expedition</label>
														</div>
													</div>
													<div class="field-container-row" style="">
														<div class="field-container col-6">
															<input id="input-datetime_reserved" class="input-field" name="datetime_reserved" data-table-name="expedition_members" placeholder="Date reserved" title="Date reserved" type="date"  autocomplete="off" required="">
															<label class="field-label" for="input-datetime_reserved">Date reserved</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
														<div class="field-container collapse col-6">
															<input id="input-datetime_canceled" class="input-field" name="datetime_canceled" data-table-name="expedition_members" placeholder="Date canceled" title="Date canceled" type="date" data-dependent-target="#input-reservation_status" data-dependent-value="6" autocomplete="off">
															<label class="field-label" for="input-datetime_canceled">Date canceled</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
													</div>
													<div class="field-container-row">
														<!--<div class="field-container col-sm-6">
															<input id="input-highest_elevation_ft" class="input-field" name="highest_elevation_ft" data-table-name="expedition_members" data-table-id="" placeholder="Highest Elevation (ft)" title="Highest Elevation in feet" type="number" autocomplete="off">
															<span class="required-indicator">*</span>
															<label class="field-label" for="input-highest_elevation_ft">Highest Elevation (ft)</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>-->	

														<div class="field-container col-sm-6">
															<select id="input-frostbite_severity" class="input-field default" name="frostbite_severity_code" data-table-name="expedition_members" placeholder="Frostbite severity" title="Frostbite severity"></select>
															<label class="field-label" for="input-frostbite_severity_code">Frostbite severity</label>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>		
														<div class="field-container checkbox-field-container col-sm-6">
															<label class="checkmark-container">
																<input id="input-received_pro_pin" class="input-field input-checkbox" type="checkbox" name="received_pro_pin" data-table-name="expedition_members">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-received_pro_pin">Received Pro Pin</label>
														</div>	
													</div>
													<!--<div class="field-container-row">
														<div class="field-container checkbox-field-container col-sm">
															<label class="checkmark-container">
																<input id="input-received_pro_pin" class="input-field input-checkbox" type="checkbox" name="received_pro_pin" data-table-name="expedition_members">
																<span class="checkmark data-input-checkmark"></span>
															</label>
															<label class="field-label checkbox-label" for="input-received_pro_pin">Received Pro Pin</label>
														</div>	
													</div>-->
													<div class="field-container-row">
														<div class="field-container col collapse">
															<label class="field-label" for="input-reason_for_pro_pin">Reason this climber received a Pro Pin</label>
															<textarea id="input-reason_for_pro_pin" class="input-field" name="reason_for_pro_pin" data-table-name="expedition_members" placeholder="Describe why this climber received a Pro Pin" title="Reason for Pro Pin" type="text" autocomplete="off" data-dependent-target="#input-received_pro_pin" data-dependent-value="true"></textarea>
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
															<label class="field-label" for="input-internal_notes">Internal notes about this expedition member</label>
															<textarea id="input-internal_notes" class="input-field" name="internal_notes" data-table-name="expedition_members" placeholder="Enter notes for other rangers to see about this expedition member" title="Internal notes" type="text" autocomplete="off"></textarea>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
													</div>													
													<div class="field-container-row">
														<div class="field-container col">
															<label class="field-label" for="input-climber_comments">Climber's comments</label>
															<textarea id="input-climber_comments" class="input-field" name="climber_comments" data-table-name="expedition_members" placeholder="Enter comments from the climber" title="Climber comments" type="text" autocomplete="off"></textarea>
															<span class="null-input-indicator">&lt; null &gt;</span>
														</div>
													</div>
												</div>
												<div id="transactions-tab-pane" class="tab-pane transactions-tab-pane fade" role="tabpanel" aria-labelledby="transactions-tab-button">
													<div class="transactions-header-container">
														
														<h5 class="expedition-data-sub-header"></h5>
														<button class="generic-button add-data-button add-transaction-button" role="button" type="button">Add transaction</button>
													</div>
													<div class="transactions-container-body">
														<div class="data-list-item data-list-item-header">
															<label class="data-list-col data-list-header-label col-3">Type</label>
															<label class="data-list-col data-list-header-label col-2">Payment method</label>
															<label class="data-list-col data-list-header-label col col-13-percent"">Value</label>
															<label class="data-list-col data-list-header-label col-2">Date</label>
															<label class="data-list-col data-list-header-label col-4">Transaction notes</label>
														</div>
														<ul id="transactions-list" class="data-list">
															<li class="data-list-item show-children-on-hover cloneable hidden">
																<div class="col-3 d-flex">
																	<select id="input-transaction_type" class="input-field transaction-type-field dirty revertable" name="transaction_type_code" data-table-name="transactions" placeholder="Transaction type" title="Transaction type" required=""></select>
																	<span class="required-indicator">*</span>
																</div>
																<div class="col-2">
																	<div class="w-100 d-flex collapse">
																		<select id="input-payment_method" class="input-field keep-default-option default dirty" name="payment_method_code" data-table-name="transactions" placeholder="Payment method" title="Payment method" required=""></select>
																		<span class="required-indicator">*</span>
																	</div>
																</div>
																<div class="col col-13-percent">
																	<span class="unit-symbol">$</span>
																	<input id="input-transaction_value" class="input-field field-with-units transaction-amount-field dirty" name="transaction_value" data-table-name="transactions" title="Transaction value"> 
																</div>
																<div class="col-2 d-flex">
																	<input id="input-transaction_date" class="input-field" type="date" name="transaction_date" data-table-name="transactions"> 
																</div>
																<div class="col-4 d-flex">
																	<input id="input-transaction_notes" class="input-field" name="transaction_notes" type="text" data-table-name="transactions" title="Transaction type"> 
																	<div class="col-3 pl-1">
																		<button class="icon-button delete-button delete-transaction-button show-on-parent-hover">
																			<i class="fas fa-trash fa-lg"></i>
																		</button>
																	</div>
																</div>
															</li>
														</ul>
														<div class="data-list-item data-list-footer">
															<label class="data-list-col data-list-header-label col-3"></label>
															<label class="data-list-col data-list-header-label col-2 text-right pr-2">Balance</label>
															<label class="data-list-col data-list-header-label col col-13-percent total-col">
																<span>$</span><span class="total-span"></span>
															</label>
															<label class="data-list-col data-list-header-label total-col col-2">
															</label>
															<label class="data-list-col data-list-header-label col-4"></label>
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
				<div id="routes-data-container" class="expedition-data-wrapper">
					<div class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">Routes</h3>
							<button class="generic-button add-card-button" data-target="#routes-accordion">Add route</button>
						</div>
						<div class="expedition-data-content-body">
							<div id="routes-accordion" class="accordion" data-table-name="expedition_member_routes" data-item-display-name="expedition route">
								<div id="cloneable-card-routes" class="card expedition-card cloneable hidden" >
									<div class="card-header" id="cardHeader-routes-cloneable">
										<select id="mountain-code-header-input" class="input-field card-link-label route-code-header-input mountain-code-header-input expedition-member-card-link-label col-2" name="mountain_code">
											<option value="">Select mountain</option>
										</select>
										<select id="route-code-header-input" class="input-field card-link-label route-code-header-input expedition-member-card-link-label no-option-fill col-2" name="route_code">
											<option value="">Select route</option>
										</select>
										<a class="card-link" data-toggle="collapse" href="#collapse-routes-cloneable" data-target="collapse-routes-cloneable">
											<div class="card-link-content">
												<!--<h6 class="card-link-label expedition-member-card-link-label"></h6>-->
											</div>
											<div class="card-link-content">
												<button class="delete-card-button icon-button delete-route-button show-on-parent-hover">
													<i class="fa fa-trash"></i>
												</button>
												<i class="fa fa-chevron-down pull-right"></i>
											</div>
										</a>
									</div>
									<div id="collapse-routes-cloneable" class="collapse card-collapse show" aria-labelledby="cardHeader-routes-cloneable" data-parent="#routes-accordion">
										<div class="card-body">
											<div class="data-list-item data-list-item-header">
												<label class="data-list-col data-list-header-label col-4"></label>
												<label class="data-list-col data-list-header-label col-2 text-center">Summited?</label>
												<label class="data-list-col data-list-header-label col-2 text-center">Summit date</label>
												<label class="data-list-col data-list-header-label col-3">Highest elevation (ft)</label>
												<label class="data-list-col data-list-header-label col-1"></label>
											</div>
											<ul id="route-member-list" class="data-list route-member-list">
												<li class="data-list-item cloneable hidden">
													<!-- route_code and route_order inputs are hidden because the select in the .card-header controls the value for all of them-->
													<input id="input-route_code" class="input-field hidden" type="number" name="route_code" data-table-name="expedition_member_routes">
													<input id="input-route_order" class="input-field hidden" type="number" name="route_order" data-table-name="expedition_member_routes">
													<div class="col-4">
														<label class="data-list-header-label name-label"></label>
													</div>
													<div class="col-2 center-checkbox-col">
														<label class="checkmark-container">
															<input id="input-route_summited" class="input-field input-checkbox route-summited-checkbox" type="checkbox" name="route_was_summited" data-table-name="expedition_member_routes" title="Route summitted?">
															<span class="checkmark data-input-checkmark"></span>
														</label>
													</div>
													<div class="col-2">
														<div class="field-container collapse">
															<input id="input-summit_date" class="input-field text-center" name="summit_date" type="date" data-table-name="expedition_member_routes" title="Summit date"  data-dependent-target="#input-route_summited" data-dependent-value="true"> 
														</div>
													</div>
													<div class="col-3">
														<div class="field-container pr-5">
															<input id="input-highest_elevation" class="input-field" name="highest_elevation_ft" type="number" data-table-name="expedition_member_routes" title="Highest elevation in feet"> 
														</div>
													</div>
													<div class="col-1">
														<button class="icon-button delete-button delete-route-member-button">
															<i class="fas fa-trash fa-lg"></i>
														</button>
													</div>
												</li>
											</ul>
											<div class="data-list-item data-list-footer">
												<div class="data-list-col data-list-header-label col-4">
													<button class="text-only-button route-list-footer-button add-expedition-route-member-button w-100 text-left px-0 mx-0 hidden" aria-hidden="True">Add member to route</button>
												</div>
												<div class="data-list-col data-list-header-label center-checkbox-col col-2">
													<button class="text-only-button route-list-footer-button check-all-summitted-button w-100">check all</button>
												</div>
												<div class="data-list-col data-list-header-label col-6"></div>
											</div>
										</div>
									</div>
								</div> <!-- card -->
							</div> <!-- routes-accordion -->	
						</div>
					</div>
				</div>
				<div class="expedition-data-wrapper">
					<div id="cmcs-data-container" class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">CMCs</h3>
							<button class="generic-button add-data-button add-cmc-button" data-target="#cmc-list">Add CMC</button>
						</div>
						<div class="expedition-data-content-body">
							<div class="data-list-item data-list-item-header">
								<label class="data-list-col data-list-header-label col-2">CMC</label>
								<label class="data-list-col data-list-header-label col-4">Checkout date</label>
								<label class="data-list-col data-list-header-label col-4">Return date</label>
								<label class="data-list-col data-list-header-label col-1"></label>
							</div>
							<ul id="cmc-list" class="data-list cmc-list">
								<li class="data-list-item cloneable hidden">
									<div class="cmc-col col-2">
										<select id="input-cmc_id" class="input-field no-option-fill default" name="cmc_id" data-table-name="cmc_checkout" title="CMC ID" required="required"></select>
										<span class="required-indicator">*</span>
									</div>
									<div class="cmc-col col-4">
										<input id="input-checkout_date" class="input-field" name="checkout_date" type="date" data-table-name="cmc_checkout" title="CMC Checkout Date" required="required"> 
										<span class="required-indicator">*</span>
									</div>
									<div class="cmc-col col-4">
										<input id="input-return_date" class="input-field" name="return_date" type="date" data-table-name="cmc_checkout" title="CMC Return Date"> 
									</div>
									<div class="col-1">
										<button class="icon-button delete-button delete-cmc-button">
											<i class="fas fa-trash fa-lg"></i>
										</button>
									</div>
								</li>
							</ul>
						</div>
						<div class="expedition-data-content-footer w-100">
							<a class="page-top-jump-link" href="#page-top-bookmark">Back To Top</a>
						</div>
					</div>
				</div>
				<div class="expedition-data-wrapper">
					<div id="comms-data-container" class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">Comms Devices</h3>
							<button class="generic-button add-data-button add-comms-button" data-target="#comms-list">Add Comms</button>
						</div>
						<div class="expedition-data-content-body">
							<div class="data-list-item data-list-item-header">
								<label class="data-list-col data-list-header-label col-3">Device type</label>
								<label class="data-list-col data-list-header-label col-4">Number/address</label>
								<label class="data-list-col data-list-header-label col-3">Device owner</label>
								<label class="data-list-col data-list-header-label col-1"></label>
							</div>
							<ul id="comms-list" class="data-list cmc-list">
								<li class="data-list-item cloneable hidden">
									<div class="cmc-col col-3">
										<select id="input-communication_device_type" class="input-field default" name="communication_device_type_code" data-table-name="communication_devices" title="Device Type" placeholder="Device type" required="required"></select>
										<span class="required-indicator">*</span>
									</div>
									<div class="cmc-col col-4">
										<input id="input-number_or_address" class="input-field" name="number_or_address" data-table-name="communication_devices" title="Device number/address" autocomplete="off"> 
									</div>
									<div class="cmc-col col-3">
										<select id="input-owner" class="input-field no-option-fill default" name="expedition_member_id" data-table-name="communication_devices" title="Device owner"></select>
									</div>
									<div class="col-1">
										<button class="icon-button delete-button delete-comms-button">
											<i class="fas fa-trash fa-lg"></i>
										</button>
									</div>
								</li>
							</ul>
						</div>
						<div class="expedition-data-content-footer w-100">
							<a class="page-top-jump-link" href="#page-top-bookmark">Back To Top</a>
						</div>
					</div>
				</div>
			</div>
		`);

		// Show/hide the expedition filter options when the toggle button is clicked
		$('.show-query-options-button').on('click', e => {
			const $expeditionOptions = $('#expedition-options-drawer');
			const $searchOptions = $('#search-options-drawer');
			// If the expedition options drawer is open, wait until is closes before opening the search options
			if ($expeditionOptions.is('.show')) {
				$expeditionOptions.on('hidden.bs.collapse', () => {
					$searchOptions.collapse('show');
					// turn of the event handler so it triggers only once
					$expeditionOptions.off('hidden.bs.collapse');
				}).collapse('hide');
			} 
			// Otherwise, just toggle the search options 
			else {	
				$searchOptions.collapse('toggle');
			}
		});

		// Hide the filter options drawer (if it's shown) when the user clicks outside of it
		// 	Make sure to exclude the modal expedition options drawer because otherwise it will 
		//	be hidden all the time
		$(document).on('click', e => {
			const $drawer = $('.fuzzy-search-bar-drawer:not(#modal-expedition-options-drawer)');
			if (!$(e.target).closest('.collapse.fuzzy-search-bar-drawer').length && $drawer.is('.show')) {
				$drawer.collapse('hide');
			}
		});
		// Handle the modal search bar separately because otherwise the drawer doesn't
		//	open and close properly. When anywhere in the modal is clicked 
		$('#change-expedition-modal').on('click', e => {
			const $drawer = $('#modal-expedition-options-drawer');
			if ($drawer.is('.show')) {
				$drawer.collapse('hide');
			}
		});

		$('#edit-expedition-button').click(e => {
			this.toggleEditing();
		});

		$('#save-expedition-button').click(e => {
			showLoadingIndicator('saveEdits');
			this.saveEdits();
		});

		$('#delete-expedition-button').click(() => {
			this.onDeleteExpeditionButtonClick();
		})

		$('#open-reports-modal-button').click(e => {
			// Check if there are unsaved edits and ask the user to confirm
			if ($('.input-field.dirty:not(#input-export_type)').length) {
				const afterActionCallbackStr = `$('#exports-modal').modal();`
				this.confirmSaveEdits({afterActionCallbackStr: afterActionCallbackStr});
			} else {
				$('#exports-modal').modal();
			}
		});

		$('#create-pdf-button').click(e => {
			const exportType = $('#input-export_type').val();
			const nMembers = $('#expedition-members-accordion .card:not(.cloneable):not(.canceled)').length;
			const nRoutes = $('#routes-accordion .card:not(.cloneable)').length;
			if (nMembers === 0) {
				showModal(
					'There are no active members of this expedition. You must add at least one member or' +
					' set at least one member\'s status to something other than "Canceled".', 
					'No Expedition Members'
				);
				return;
			} else if ((exportType === 'confirmation_letter') && !$('.input-field[name=is_trip_leader]:checked').length) {
				showModal(
					'No expedition member has been designated as the trip leader yet. You must' +
						' specify a trip leader before you can export this expedition\'s confirmation letter.' +
						' To specify the leader for the expedition, hover over the member you want to' + 
						' designate as the leader and check the leader box that appears. ',
					'No Trip Leader Specified'
				);
				return;
			} else if ((exportType === 'registration_card') && (nRoutes === 0)) {
				showModal('You must add at least one route before you can export the expedition\'s registration card', 'No Routes Entered');
				return;
			}	
			this.makePDF();
		})

		$(document).on('change', '.input-field:not(.route-code-header-input)', e => {
			if ($(e.target).closest('.cloneable').length) return;
			this.onInputChange(e);
		});

		// Record current value for .revertable inputs so the value can be reverted after a certain event
		$(document).on('change', '.input-field.revertable', e => {
			const $target = $(e.target);
			$target.data('current-value', $target.val());
		});

		$('#add-new-expedition-button').click(e => {
			this.onNewExpeditionButtonClick();
		});

		$('.accordion .card-collapse').on('shown.bs.collapse', e => {
			const $collapse = $(e.target);
			// FOr some reason this gets triggered on collapses that are childern of a .card-collapse
			if (!$collapse.is('.card-collapse')) return;

			const $contentBody = $collapse.closest('.expedition-data-content-body');
			const contentBodyElement = $contentBody[0]
			if (contentBodyElement.scrollHeight > contentBodyElement.clientHeight) {
				const $cardHeader = $collapse.closest('.card').find('.card-header');
				const scrollToPosition = $contentBody.scrollTop() + $cardHeader.offset().top - $contentBody.offset().top - $cardHeader.height();
				if (scrollToPosition > 0) contentBodyElement.scrollTo(0, scrollToPosition);
			}
		});

		// Fields that are filled by default are filled automatically with a default value. A manually .change() 
		//	event is triggered when the data are loaded to make sure the field values get saved if the user 
		//	clicks the save button. The .filled-by-default utility is used to distinguish between changes the user 
		//	actually made and .change events manually tirggered by the app. If the input is .filled-by-default 
		//	still, that means the user didn't make the change.
		$('.filled-by-default').change(e => {
			if (e.isTrigger) $(e.target).removeClass('filled-by-default');
		})

		// When the user clicks the back or forward browser nav buttons, check to see if there's a state entry with an ID associated. If so, load that expedition
		window.onpopstate = (e) => {
			const state = e.state;
			if (state) {
				if (state.id) {
					// ask user to confirm/discard edits if there are any
					if ($('.input-field.dirty:not(.filled-by-default)').length) {
						this.confirmSaveEdits({
							afterActionCallbackStr: `
								climberDB.loadExpedition(${state.id});
								climberDB.currentHistoryIndex = ${state.historyIndex};
							`,
							afterCancelCallbackStr: `
								const currentExpeditionID = $('#expedition-id-input').val();
								const historyIndex = climberDB.historyBuffer.indexOf(currentExpeditionID);
								window.history.pushState({id: currentExpeditionID, historyIndex: historyIndex}, '', window.location.href)
							`});
					} else {
						this.loadExpedition(state.id);
						this.currentHistoryIndex = state.historyIndex;
					}
				}
			}
		}

		// If the group status changes to "confirmed", make actual departure and actual return dates not required
		$('#input-group_status').change(e => {
			const statusCode = parseInt(e.target.value || 0);
			this.toggleRequiredOnInput($('#input-actual_departure_date'), statusCode !== 3);//3 === confirmed
			this.toggleRequiredOnInput($('#input-actual_return_date'), statusCode === 5);//5 === off mountain
		})

		$(document).on('click', '.delete-card-button', (e) => {
			e.stopPropagation(); // don't close or open the card

			const $card = $(e.target).closest('.card');
			const $accordion = $card.closest('.accordion');
			const displayName = $accordion.data('item-display-name');
			const tableName = $accordion.data('table-name');
			const dbID = $card.data('table-id');
			if ($card.is('.new-card')) {
				if (tableName === 'expedition_members') {
					const climberID = $card.data('climber-id');
					$(`#routes-accordion .route-member-list .data-list-item[data-climber-id="${climberID}"`).fadeRemove(500);
					setTimeout(() => {this.updateExpeditionMemberCount()}, 550);
				}
				$card.fadeRemove();
			} else {
				// confirm delete

				var message = '',
					onConfirmClick = '';

				if  (tableName === 'expedition_members') { 
					onConfirmClick = `
						climberDB.queryDB('DELETE FROM expedition_members WHERE id=${dbID}')
							.done(() => {
								const $card = $('#${$card.attr('id')}');
								delete climberDB.expeditionInfo.expedition_members.data[${dbID}];
								// remove member from in-memory .order
								climberDB.expeditionInfo.expedition_members.order = climberDB.expeditionInfo.expedition_members.order.filter(id => id != ${dbID});
								delete climberDB.expeditionInfo.transactions[${dbID}];
								const memberRoutes = climberDB.expeditionInfo.expedition_member_routes.data;
								for (const routeCode in memberRoutes) {
									const thisRoute = memberRoutes[routeCode];
									delete thisRoute[${dbID}];
								}

								// remove expedition member from all route cards
								const climberID = $card.data('climber-id');
								$('#routes-accordion .route-member-list .data-list-item[data-climber-id=' + climberID + ']').remove();

								 $('#${$card.attr('id')}').fadeRemove(500);

								 // Wait just over a half second for the card to be removed
								 setTimeout(() => {climberDB.updateExpeditionMemberCount(); climberDB.updateCommsDeviceOwnerOptions()}, 550);
							})
							.fail((xhr, status, error) => {
								console.log('delete failed because ' + error)
							});
					`;
					message = 
						`Are you sure you want to delete this expedition member` +
						` and all related transactions and routes for this member? This action` +
						` is permanent and cannot be undone.`;



				} else if (tableName === 'expedition_member_routes') {
					// get DB IDs for all member route records that are saved in the DB
					const memberRouteIDs = $card.find('.route-member-list .data-list-item:not(.cloneable):not(.new-list-item)')
						.map((_, el) => $(el).data('table-id'))
						.get()
						.join(', ');
					const $routeCodeInput = $card.find('.route-code-header-input:not(.mountain-code-header-input)');
					const routeCode = $routeCodeInput.val();
					onConfirmClick = `
						const sql = 'DELETE FROM expedition_member_routes WHERE id IN (${memberRouteIDs})';
						climberDB.queryDB(sql)
							.done(queryResultString => {
								if (climberDB.queryReturnedError(queryResultString)) {
									showModal(
										'And error occurred while attempting to delete this route: ' + queryResultString.trim() + 
											'. Try again and contact your database adminstrator if the problem continues.', 
										'Database Error'
									);
								} else {
									const routeCode = ${routeCode};
									const routeDeleted = delete climberDB.expeditionInfo.expedition_member_routes.data[routeCode];
									if (routeDeleted) {
										// remove the route from in-memory .order
										climberDB.expeditionInfo.expedition_member_routes.order = climberDB.expeditionInfo.expedition_member_routes.order.filter(code => code != routeCode);
									}
									$('#${$card.attr('id')}').fadeRemove();
								}
							}).fail((xhr, status, error) => {

							})
					`;
					const routeName = $routeCodeInput.find(`option[value=${routeCode}]`).text();
					message = `Are you sure you want to delete the ${routeName} route? This action` +
						` is permanent and cannot be undone.`;
				}

				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
					<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">OK</button>
				`;
				showModal(message, `Delete ${displayName}?`, 'confirm', footerButtons);
			}
		})

		// ------------ Query stuff -------------------
		// Set the default expedition query to only show this year's expeditions
		const defaultDepartureQueryDate = new Date( (new Date()).getFullYear(), 0, 1 );
		$('#query-option-planned_departure')
			.val(getFormattedTimestamp(defaultDepartureQueryDate))
			.siblings('.query-option-operator')
				.val('>=');

		//$('.query-option-input-field, .query-option-operator').change(e => {
		$('#update-search-filter-button').click(() => {
			$('#search-options-drawer').collapse('hide');
			this.fillExpeditionSearchSelect({showExpeditionOptions: true});
		});

		$('.query-option-operator.datetime-query-option').change(e => {
			/*toggle the double or single value field*/
			const $target = $(e.target);
			const operatorValue = $target.val();
			const showDoubleValue = operatorValue === 'BETWEEN';
			$target.siblings('.single-value-field')
				.toggleClass('hidden', showDoubleValue)
				.attr('aria-hidden', showDoubleValue);
			$target.siblings('.query-option-double-value-container')
				.toggleClass('hidden', !showDoubleValue)
				.find('.double-value-field')
					.attr('aria-hidden', !showDoubleValue);
		});
		
		// The keyup event on .fuzzy-search-bars is only triggered by the escape key if there's an 
		//	onkeyup event for the whole document
		$(document).keyup(e => {
			// And for some reason, Escape keyup events aren't registered for the modal search bar so handle them here 
			const $modalExpeditionOptions = $('#modal-expedition-options-drawer');
			if ($modalExpeditionOptions.is('.show') && (e.key === 'Escape')) {
				$modalExpeditionOptions.collapse('hide');
			}
		})
		
		$('.fuzzy-search-bar').keyup( e => {
			const $searchBar = $(e.target);
			
			// If the user pressed the escape key, hide the options drawer
			if (e.key === 'Escape') {
				$searchBar.siblings('.fuzzy-search-bar-drawer.collapse').collapse('hide');
				return;
			}

			// Only query the DB for options if the search string's length is more than 5 characters or 0.
			//	0-length will show all options but 1-4 chars will not produce reliable search results.
			//	Also no expedition name should be less than 5 characters long
			const value = $searchBar.val();
			if (value.length >= 5 || value.length === 0) { 
				this.fillExpeditionSearchSelect({$searchBar: $searchBar, showExpeditionOptions: true});
			}
		}).click(e => {
			// Toggle the options drawer when the search bar is clicked
			const $optionsDrawer = $(e.target).siblings('.expedition-options-container.collapse');
			$optionsDrawer.collapse('toggle')
		});

		// When a user selects an option in the main search bar, load the expedition
		$(document).on('click', '#expedition-options-drawer .expedition-search-bar-option', e => {
			const expeditionID = $(e.target).data('expedition-id');
			if ($('.input-field.dirty:not(.filled-by-default)').length) {
				const targetID = '#expedition-id-input';//e.target.id;
				this.confirmSaveEdits({
					afterActionCallbackStr: `climberDB.onExpeditionOptionClick( {target: $('.expedition-search-bar-option[data-expedition-id=${expeditionID}]')} )`,
					afterCancelCallbackStr: `$('#expedition-id-input').val($('#expedition-id-input').data('current-value'))`
				});
			} else {
				this.onExpeditionOptionClick(e);
			}
		})

		// Set the search bar value to the expedition name
		$(document).on('click', '#modal-expedition-options-drawer .expedition-search-bar-option', e => {
			this.onModalExpeditionSearchOptionClick(e);
		})

		$('#confirm-change-expedition-button').click(() => {
			this.onConfirmChangeExpeditionButtonClick();
		})

		// Fill with this year's expeditions to start
		this.fillExpeditionSearchSelect({showExpeditionOptions: !this.parseURLQueryString()});
		// ^^^^^^^^^ Query stuff ^^^^^^^^^^^^^^^^


		// ----------- Expedition -------------------

		// ^^^^^^^^^^^ Expedition ^^^^^^^^^^^^^^^^^^^


		// ---------- Members/transactions ----------

		// for some reason, .collapses surrounding the is_guiding field doesn't 
		$('#input-guide_company').change(e => {
			const guideCompanyCode = $(e.target).val();
			const isGuided = guideCompanyCode != -1;
			const $isGuiding = $('.input-field[name=is_guiding]')
			$isGuiding.closest('.collapse')
				.toggleClass('show', isGuided);
			for (const checkbox of $isGuiding) {
				$(checkbox).closest('.card')
				.find('.guide-icon')
					.ariaTransparent( !(checkbox.checked && isGuided) );
			}
		});

		//$('select.input-field').change(e => {this.onSelectChange(e)})
		$(document).on('click', '.add-transaction-button', e => {
			const $newItem = this.addNewListItem($(e.target).closest('.transactions-tab-pane').find('.data-list'), {newItemClass: 'new-list-item'})
			// 
			$newItem.find('.input-field[name="transaction_type_code"]').change();

			// This field is hidden completely so just fill it silently with the current timestamp
			$newItem.find('.input-field[name=transaction_date]').val( getFormattedTimestamp(new Date()) ).change();
			const $card = $newItem.closest('.card');
			$newItem.attr('data-parent-table-id', $card.data('table-id'));
		});

		// When the leader input checkbox changes, set the transparent class appropriately
		$(document).on('change', '.leader-checkbox-container .input-checkbox', e => {
			const $checkbox = $(e.target).closest('.input-checkbox');
			const isChecked = $checkbox.prop('checked');

			// If this chekcbox is being checked, hide all others
			if (isChecked) {
				$(`.card:not(.cloneable) .leader-checkbox-container .input-checkbox:not(#${$checkbox.attr('id')})`)
					.prop('checked', false)
					.change()
					.closest('.leader-checkbox-container').addClass('transparent');
			}
			$checkbox.closest('.leader-checkbox-container').toggleClass('transparent', !isChecked);
		})

		$(document).on('click', '.change-expedition-button', e => {
			this.showChangeExpeditionModal($(e.target).closest('.card'));
		});

		// Set the canceled time when the reservation status is set to canceled
		// also check all other reservation status fields to see if the whole group is ready
		$(document).on('change', '.reservation-status-field', e => {
			const $select = $(e.target);
			const $card = $select.closest('.card');
			const value = $select.val();
			const isCanceled = value == 6;

			// If this is the group's leader, ask the user to confirm
			/*if ($card.find('.input-field[name=is_trip_leader]').prop('checked')) {
				showModal('Are ')
				return;
			}*/

			// Set the datetime_canceled field
			const now = getFormattedTimestamp();
			const cardID = $select.attr('id').match(/-\d+$/).toString();
			$(`#input-datetime_canceled${cardID}`).val(isCanceled ? now : null).change();

			// Show as canceled and move to bottom
			$card.toggleClass('canceled', isCanceled);
			if (isCanceled) $card.appendTo($card.closest('.accordion'));

			// Hide/show this expedition member in any routes 
			const expeditionMemberID = $card.data('table-id');
			if (expeditionMemberID) {
				$(`.route-member-list .data-list-item[data-expedition-member-id=${expeditionMemberID}]`)
					.ariaHide(isCanceled);
			}

			// Change the group's status if all 
			const reservationStatuses = $select.closest('.accordion').find('.card:not(.cloneable) .reservation-status-field')
				.map((_, el) => el.value)
				.get();
			const firstStatus = reservationStatuses[0];
			const $groupStatusSelect = $('#input-group_status');

			if (reservationStatuses.every(v => v == firstStatus || v == 6) && $groupStatusSelect.val() != firstStatus) { 
				$groupStatusSelect.val(firstStatus).change();
			}
		});

		$(document).on('change', '.input-field[name="flagged"]', e => {
			const $checkbox = $(e.target);
			const isFlagged = $checkbox.prop('checked');
			const $cardBody = $checkbox.closest('.card-body');
			if (isFlagged) {
				$cardBody
					.find('.input-field[name=flagged_by]')
					.val(this.userInfo.ad_username).change();
			}
		});

		// When the is_guiding field changes, show/hide the guide icon on the card header
		$(document).on('change', '.input-field[name=is_guiding]', e => {
			const checkbox = e.target;
			// If the climber isn't a guide, uncheck the box and warn the user
			if (checkbox.checked) {
				// *** figure out if this should query DB or if climber guide boolean should be stored somewhere
			}
			$(checkbox).closest('.card')
				.find('.guide-icon')
					.ariaTransparent(!checkbox.checked);
		});

		// When a transaction type field changes and amount is not already set, fill the amount with the defuault value
		$(document).on('change', '.transaction-type-field', e => {
			const $select = $(e.target);
			const $valueField = $select.closest('li').find('.transaction-amount-field');
			const transactionTypeCode = $select.val();
			if (!transactionTypeCode) return;// && $select.data('current-value') != ) return;
			const info = this.defaultTransactionFees[transactionTypeCode];
			const defaultAmount = info.default_fee;
			const currentValue = $valueField.val();
			if ( (currentValue === '') || (currentValue === '0.00') ) {
				if (defaultAmount !== null) {
					$valueField
						.val(defaultAmount.replace(/\(/, '-').replace(/[$)]/g, ''))
						.change();
				}
			}
			$select.closest('.data-list-item')
				.find('.input-field[name=payment_method_code]')
					.closest('.collapse')
						.collapse(info.is_payment === 't' ? 'show' : 'hide');
		});

		// When a transaction amount field changes, calculate balance
		$(document).on('change', '.transaction-amount-field', e => {
			const $list = $(e.target).closest('.data-list');
			
			// If the field is a credit, set the value to be negative and vice versa
			const $valueField = $(e.target);
			const amount = $valueField.val();
			const transactionType = $valueField.closest('li').find('.transaction-type-field').val();
			const isCredit = this.defaultTransactionFees[transactionType].is_credit === 't';
			if (isCredit && amount > 0) {
				$valueField.val(amount * -1);
			} else if (!isCredit && amount < 0) {
				$valueField.val(amount * -1)
			}

			this.getTransactionBalance($list);
		});

		$(document).on('click', '.delete-transaction-button', e => {
			this.onDeleteTransactionButtonClick(e);
		})
		// ^^^^^^^^^^ Members/transactions ^^^^^^^^^^^

		// ---------- Route stuff ----------

		// When new route card is added, make sure it has all of the (not canceled) expedition members
		$('#routes-data-container .add-card-button').click(e => {

			if (!$('#expedition-members-accordion .card:not(.cloneable)').length) {
				showModal('You must add at least one expedition member before you can add a route.', 'Invalid action');
				return;
			}

			const $newCard = this.addNewCard($($(e.target).data('target')), {accordionName: 'routes', newCardClass: 'new-card'});
			
			// Use the UI to rather than in-memory data to add all active expedition members because
			//	a new card would be in the in-memory data
			const $list = $newCard.find('.route-member-list');
			for (const el of $('#expedition-members-accordion > .card:not(.cloneable)')) {
				const $memberCard = $(el);
				// if this expedition member isn't canceled, add a new row
				if ($memberCard.find('.input-field[name="reservation_status_code"]').val() != 6) {
					const $listItem = this.addNewListItem($list)
						.attr('data-climber-id', $memberCard.data('climber-id'))
						.data('parent-table-id', $memberCard.data('table-id'));
					$listItem.find('.name-label').text($memberCard.find('.expedition-member-card-link-label').text());
				}
			}
		});

		$(document).on('change', '.route-code-header-input', e => {
			const $target = $(e.target);
			var $select; 
			if ($target.attr('name') === 'mountain_code') {
				// Set the route code select options
				const mountainCode = $target.val();
				const $routeHeaderSelect = $target.siblings('.route-code-header-input')
					.empty();//remove all options
				const mountainRoutes = Object.values(this.routeCodes)
					.filter(r => r.mountain_code == mountainCode)
					.sort((a, b) => a.sort_order - b.sort_order);
				for (const route of mountainRoutes) {
					$routeHeaderSelect.append($(`<option value="${route.code}">${route.name}</option>`))
				}
				// Just set to the first one
				$routeHeaderSelect.val(mountainRoutes[0].code).change();
			} else {
				// Set the hidden route code and route order inputs in the card (which are the actual inputs tied to DB values)
				const routeCode = $target.val();
				const $card = $target.closest('.card');
				$card.find('.data-list-item:not(.cloneable) .input-field:not(.route-code-header-input)[name="route_code"]')
						.val(routeCode)
						.change();
				if ($card.is('.new-card')) {
					$card.find('.data-list-item:not(.cloneable) .input-field:not(.route-code-header-input)[name="route_order"]')
							.val($card.index() - 1) // -1 because .cloneable card is 0th
							.change();
				}
			}
			// Remove default placeholder option
			$target.find('option[value=""]').remove();
		});

		$(document).on('click', '.add-expedition-route-member-button', e => {
			// If there's more than one expedition member not on this route, show a modal that allows the user 
			//	to select which member to add
			const $list = $(e.target).closest('.card').find('.route-member-list');
			const routeMemberIDs = $list.find('.data-list-item')
				.map((_, el) => $(el).data('expedition-member-id'))
				.get();
			const expeditionMemberIDs = $('#expedition-members-accordion .card:not(.cloneable)')
				.map((_, el) => $(el).data('table-id'))
				.get()
				.filter(id => !routeMemberIDs.includes(id));

			if (expeditionMemberIDs.length == 1) {
				const memberID = expeditionMemberIDs[0];
				const memberInfo = this.expeditionInfo.expedition_members.data[memberID];
				this.addRouteMember(memberInfo, $list, memberInfo.climber_id, {expeditionMemberID: memberID});
			} else if (expeditionMemberIDs.length > 1) {
				const options = expeditionMemberIDs.map(id => {
					const info = this.expeditionInfo.expedition_members.data[id];
					return `<option value=${id}>${info.first_name} ${info.last_name}</option>`
				}).join('\n');

				const message = `
					<p>Select which expedition member you want to add. If you want to add all remaining expedition members, click <strong>Add All</strong>.</p>
					<div class="field-container col-8 single-line-field">
							<label class="field-label inline-label" for="modal-summit-date-input" for="modal-route-member">Expedition member</label>
							<select id="modal-add-route-member" class="input-field modal-input">
								${options}
							</select>
					</div>
				`;

				const onAddSelectedConfirm = `
					const memberID = $('#modal-add-route-member').val();
					const memberInfo = climberDB.expeditionInfo.expedition_members.data[memberID];
					climberDB.addRouteMember(memberInfo, '#${$list.attr('id')}', memberInfo.climber_id, {expeditionMemberID: memberID});
				`;
				const onAddAllConfirm = `
					const listID = '#${$list.attr('id')}';
					for (const memberID of [${expeditionMemberIDs}]) {
						const memberInfo = climberDB.expeditionInfo.expedition_members.data[memberID];
						climberDB.addRouteMember(memberInfo, listID, memberInfo.climber_id, {expeditionMemberID: memberID});
					}
				`;
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
					<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onAddSelectedConfirm}">Add selected</button>
					<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onAddAllConfirm}">Add All</button>
				`;
				showModal(message, 'Select expedition member(s) to add', 'confirm', footerButtons);
			}

		});

		// Show modal to prompt user to enter summit date
		$(document).on('click', '.check-all-summitted-button', e => {
			const $button = $(e.target);
			const $card = $button.closest('.card');
			const $checkboxes = $card.find('.data-list-item:not(.cloneable):not(.hidden) .center-checkbox-col .input-checkbox');
			const cardID = $card.attr('id');
			const checkboxIDs = '#' + $checkboxes.map((_, el) => el.id).get().join(',#');
			const summitDateInputIDs = '#' + $checkboxes.closest('.center-checkbox-col').next().find('.input-field').map((_, el) => el.id).get().join(',#');
			const allChecked = $checkboxes.filter(':checked').length == $checkboxes.length;
			const expeditionName = this.expeditionInfo.expeditions.expedition_name;//$('#input-expedition_name').val();
			const $routeInput = $button.closest('.card').find('.route-code-header-input:not(.mountain-code-header-input)');
			const routeCode = $routeInput.val();
			if (routeCode === '') {
				showModal('You must select a mountain and route first before you can mark that all climbers summited.', 'No Route Selected');
				return;
			}
			const routeName = $routeInput.find(`option[value=${routeCode}]`).text();
			var message, title, onConfirmClick;
			if (allChecked) {
				// Ask user to uncheck all and clear
				message = `Are you sure you want to uncheck all ${routeName} summits for ${expeditionName}?`;
				title = `Uncheck all ${routeName} summits`;
				onConfirmClick = `
					$('${checkboxIDs}').prop('checked', false);
					$('${summitDateInputIDs}').val(null)
						.closest('.collapse')
							.collapse('hide');
					const $card = $('#${cardID}');
					$card.find('.check-all-summitted-button').text('check all');
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
					const $summitDateInputs = $('${summitDateInputIDs}');
					$('${checkboxIDs}').prop('checked', true).change();
					// If the user entered a summit date, fill the inputs
					if (summitDate) {
						$summitDateInputs.val(summitDate)
					}
					const $card = $('#${cardID}');
					$card.find('.check-all-summitted-button').text('uncheck all');
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
			const $thisCheckbox = $(e.target);
			const $card = $thisCheckbox.closest('.card');
			const $checkboxes = $card.find('.data-list-item:not(.cloneable) .center-checkbox-col .input-checkbox');
			const allChecked = $checkboxes.filter(':checked').length == $checkboxes.length;
			$card.find('.check-all-summitted-button').text(allChecked ? 'uncheck all' : 'check all');

			// if the elevation hasn't been set and the route was summited, set the highest_elevation field
			const mountainCode = $card.find('.input-field[name=mountain_code]').val();
			const $highestElevationInput = $thisCheckbox.closest('li').find('.input-field[name=highest_elevation_ft]')
			// if 1) the mountain is selected, 2) the route was summited, & 3) highest elevation isn't set
			if (mountainCode && $thisCheckbox.prop('checked') && !$highestElevationInput.val()) {
				$highestElevationInput.val(this.mountainCodes[mountainCode].elevation_ft)
			}
		});


		// ask user to confirm removing CMC only if it already exists in the DB
		$(document).on('click', '.delete-route-member-button', e => {
			const $li = $(e.target).closest('li');
			if ($li.is('.new-list-item')) {
				$li.fadeRemove();
			} else {
				const $cmcSelect = $li.find('select');
				const dbID = $li.data('table-id');
				const onConfirmClick = `climberDB.deleteListItem($('#${$li.attr('id')}'), 'expedition_member_routes', ${dbID})`;
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
					<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">OK</button>
				`;
				const {first_name, last_name} = this.expeditionInfo.expedition_members.data[$li.data('expedition-member-id')];
				const memberName = first_name + ' ' + last_name;
				const $routeInput = $li.closest('.card').find('.route-code-header-input:not(.mountain-code-header-input)');
				const routeName = $routeInput.find(`option[value=${$routeInput.val()}]`).text();//this.routeCodes[$li.find('.input-field[name="route_code"]').val()].name;
				showModal(`Are you sure you want to remove <strong>${memberName}</strong> from the <strong>${routeName}</strong> route?`, 'Remove expedition member from this route?', 'alert', footerButtons);
			}
		})
		// ^^^^^^^^^^ Route stuff ^^^^^^^^^

		// ------------ CMCs -------------------
		$('.add-cmc-button').click(e => {
			const $button = $(e.target);
			const $ul = $($button.data('target'));
			const $listItem = this.addNewListItem($ul, {newItemClass: 'new-list-item', parentDBID: $('#input-planned_departure_date').data('table-id')});
			const $checkoutDate = $listItem.find('.input-field[name="checkout_date"]');//.filter((_, el) => el.name === 'checkout_date');
			$checkoutDate.val($('.input-field[name=actual_departure_date]').val() || getFormattedTimestamp())
				.change();
		});

		// ask user to confirm removing CMC only if the cmc_checkout record already exists in the DB
		$(document).on('click', '.delete-cmc-button', e => {
			const $li = $(e.target).closest('li');
			const $cmcSelect = $li.find('select');
			const cmcID = $cmcSelect.val();
			if ($li.is('.new-list-item')) {
				$li.fadeRemove();
			} else {
				
				const dbID = $cmcSelect.data('table-id');
				const tableName = $cmcSelect.data('table-name');
				const onConfirmClick = `climberDB.deleteListItem($('#${$li.attr('id')}'), '${tableName}', ${dbID})`
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
					<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">OK</button>
				`;
				showModal(`Are you sure you want to delete this checkout record for CMC ${cmcID}?`, 'Delete CMC?', 'alert', footerButtons);
			}

			// Add this cmc back to other selects as a selectable option
			if (cmcID) {
				const cmcCanIdentifier = $cmcSelect.find(`option[value=${cmcID}]`).html();
				this.insertCMCOption(cmcID, cmcCanIdentifier);
			}
		});

		$(document).on('change', '.input-field[name=cmc_id]', e => {
 			// If the return date is already set, don't change anything because 
 			//	theoretically the can has already been returned
 			const $returnDateInput = $(e.target).closest('li').find('.input-field[name=return_date]');
 			if ($returnDateInput.val()) return;

			const $cmcSelects = $('.input-field[name=cmc_id]');
			const selectedCMCs = $cmcSelects.map((_, el) => el.value).get();
			for (let [id, identifier] of Object.entries(this.cmcInfo.cmcCanIDs) ) {
				// If one of the selects has this value, find out which one and remove it from all others
				if (selectedCMCs.includes(id)) {
					this.removeCMCOption(id)
				} 
				// Otherwise, make sure it's in all of them. This could happen if, for instance, 
				//	a user changes the value of a CMC select: the previous value would have been 
				//	removed from all the others so add it back in
				else {
					this.insertCMCOption(id, identifier, {$cmcSelects: $cmcSelects});
				}
				
			}
		});

		$(document).on('change', '.input-field[name=return_date]', e => {
			const $target = $(e.target);
			const returnDate = $target.val();
			const $cmcSelect = $target.closest('li').find('.input-field[name=cmc_id]');
			const cmcID = $cmcSelect.val();
			
			if (!cmcID) return; //if it's blank there's nothing we can do

			// If return date is specified and valid, add this CMC back into the select options
			if (returnDate) {
				this.insertCMCOption(cmcID, $cmcSelect.find('option:selected').html())
			} 
			// Otherwise, take it out of the inventory (for this user's session)
			else {
				this.removeCMCOption(cmcID);
			}
		})
		// ^^^^^^^^^^^ CMCs ^^^^^^^^^^^^^^^


		// -----------Comms ---------------
		$('.add-comms-button').click(e => {
			const $button = $(e.target);
			const $ul = $($button.data('target'));
			const $listItem = this.addNewListItem($ul, {newItemClass: 'new-list-item'});
		});

		// ask user to confirm removing CMC only if the cmc_checkout record already exists in the DB
		$(document).on('click', '.delete-comms-button', e => {
			const $li = $(e.target).closest('li');
			if ($li.is('.new-list-item')) {
				$li.fadeRemove();
			} else {
				const dbID = $li.data('table-id');
				const $deviceTypeSelect = $li.find('select[name=communication_device_type_code]');
				const tableName = $deviceTypeSelect.data('table-name');
				const deviceType = $deviceTypeSelect.find('option:selected').text();
				const onConfirmClick = `climberDB.deleteListItem($('#${$li.attr('id')}'), '${tableName}', ${dbID})`;
				const expeditionName = this.expeditionInfo.expeditions.expedition_name; // has to be set since this list item is already saved
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
					<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">OK</button>
				`;
				showModal(`Are you sure you want to delete this ${deviceType} from ${expeditionName}'s communication device list?`, 'Delete Comms Device?', 'alert', footerButtons);
			}
		})
		// ^^^^^^^^^^^ Comms ^^^^^^^^^^^^^^^


		// ------ Climber form stuff ------
		const $climberFormModal = $('<div id="add-climber-form-modal-container" class="climber-form-modal-container uneditable hidden" tabindex="-1" role="dialog" aria-labelledby="" aria-hidden="true"></div>')
			.appendTo('body');
		this.climberForm = new ClimberForm($climberFormModal);
		this.climberForm.lastSearchQuery = (new Date()).getTime();

		// Enable onclick event
		$('#show-modal-climber-form-button').click(e => {
			this.onAddExpeditionMemberButtonClick();
		});

		$('#climber-form-modal-close-button').click(e => {
			$climberFormModal.ariaHide(true);
			this.climberForm.$el.removeClass('climberdb-modal');
			
			// Make the form blank so tha when the user opens it again, 
			//	it's reset to it's original state
			$('#modal-climber-search-bar').val('');
			$('.modal-climber-select-container').collapse('hide')
				.find('select > option:not([value=""])')
					.remove();
			$('#result-details-header-title').text('');
			$('.result-details-summary-container').collapse('hide')

			$('.result-details-header-badge').ariaHide(true);

			$('#edit-climber-info-button').collapse('hide');
		})

		// query climbers to fill select
		$('#modal-climber-search-bar').keyup(() => {
			this.onClimberFormSearchKeyup();
		});

		$('#refresh-modal-climber-select').click(() => {
			// show loading indicator
			// get currently selected climber and reselect it after refresh
			const $select = $('#modal-climber-select');
			const currentSelection = $select.val();
			const $input = $('#modal-climber-search-bar');
			const searchString = $input.val();
			showLoadingIndicator('refresh-modal-climber-select');
			if (searchString.length >= 3) {
				this.refreshClimberSelectOptions(searchString)
					.done(() => {
						// Check every 50 milliseconds if the option has been added to the select
						//	If so, breack out of the interval loop 
						var intervalID;
						const callback = () => {
							if ($select.find(`option[value=${currentSelection}]`).length) {
								$select.val(currentSelection).change();
								clearInterval(intervalID);
								hideLoadingIndicator();
							}
						}
						intervalID = setInterval(callback, 20);
					})
			}
		});

		$('#modal-climber-select').change(e => {
			// Clear climber info regardless of selected climber ID value
			this.climberForm.selectedClimberInfo = {};
			
			const $select = $(e.target);
			const climberID = $select.val();
			const climberIsSelected = climberID !== '';
			$select.toggleClass('default', climberIsSelected);
			if (!climberIsSelected) return;	
			
			const collapseCommand = climberIsSelected ? 'show' : 'hide';
			$('#modal-save-to-expedition-button').collapse(collapseCommand);
			$('.climber-form .result-details-summary-container.collapse').collapse(collapseCommand);

			// Hide all badges
			$('.result-details-header-badge').ariaHide(true);
			
			this.queryDB(`SELECT * FROM climber_info_view WHERE id=${parseInt(climberID)}`)
				.done(queryResultString => {
					const result = $.parseJSON(queryResultString);
					if (this.queryReturnedError(queryResultString)) {
						showModal(`An error occurred while retreiving climbering info: ${queryResultString}. Make sure you're connected to the NPS network and try again.`, 'Database Error');
					} else {
						if (result.length) {
							this.climberForm.fillClimberForm(climberID, result[0]);	
							$('#edit-climber-info-button').attr('href', 'climbers.html?edit=true&id=' + climberID)
								.collapse('show');
						} else {
							console.log('No climber found with ID ' + ClimberID);
						}
					}
				})
			

		});

		$('#modal-save-to-expedition-button').click(e => {
			const currentClimberIDs = Object.values(climberDB.expeditionInfo.expedition_members.data)
				.map(member => member.climber_id);
			const climberID = $('#modal-climber-select').val();
			//const climberID = Object.keys(this.climberForm.selectedClimberInfo.climbers)[0];
			const climberInfo = this.climberForm.selectedClimberInfo.climbers[climberID];
			if (currentClimberIDs.includes(climberID)) {
				showModal(`${climberInfo.first_name} ${climberInfo.last_name} is already a member of the expedition '${this.expeditionInfo.expeditions.expedition_name}'`, 'Climber is already a member');
				return;
			}
			const $memberCard = this.addExpeditionMemberCard(
				{
					firstName: climberInfo.first_name, 
					lastName: climberInfo.last_name, 
					climberID: climberID,
					showCard: true,
					isNewCard: true,
					climberInfo: climberInfo
				}
			);
			// Add the member to each route
			for (const ul of $('.card:not(.cloneable) .route-member-list')) {
				this.addRouteMember(climberInfo, ul, climberID);
			}

			$(e.target).siblings('.close-modal-button').click();
		})
		// ^^^^^ Climber form stuff ^^^^^^
	}

	onInputChange(e) {
		const $input = $(e.target);

		if ($input.is('.ignore-changes') || $input.closest('.uneditable').length) return;

		// check if the value is different from in-memory data
		var valueChanged = false;
		// 	if it's inside a new card or list item, it has to be an insert
		if ($input.closest('.new-list-item, .new-card').length) {
			valueChanged = true;
		} else {
			var newValue = this.getInputFieldValue($input);
			const dbID = $input.data('table-id');
			const tableName = $input.data('table-name');
			const fieldName = $input.attr('name');
			var dbValue;
			if (tableName === 'expeditions') {
				dbValue = this.expeditionInfo.expeditions[fieldName];
			} else if (tableName === 'expedition_members') {
				dbValue = this.expeditionInfo.expedition_members.data[dbID][fieldName];
			} else if (tableName === 'transactions') {
				const expeditionMemberID = $input.closest('.card').data('table-id');
				dbValue = this.expeditionInfo.transactions[expeditionMemberID].data[dbID][fieldName];
			} else if (tableName === 'expedition_member_routes') {
				const routeCode = $input
					.closest('.data-list-item')
						.find('.input-field[name=route_code]')
							.val();
				const foreignIDs = $input.data('foreign-ids') || {};
				const memberInData =  						
					Object.keys(this.expeditionInfo.expedition_member_routes.data).includes(routeCode) &&
					Object.keys(foreignIDs).includes('expedition_member_id');
				if (memberInData) {
					const memberID = foreignIDs.expedition_member_id;
					if (this.expeditionInfo.expedition_member_routes.data[routeCode][memberID]) {
						dbValue = this.expeditionInfo.expedition_member_routes.data[routeCode][memberID][fieldName];	
					}
				} else {
					// If the route was changed, dbValue will be undefined and therefore similar to newValue
					valueChanged = true;
				}
			} else if (tableName === 'cmc_checkout') {
				dbValue = this.expeditionInfo.cmc_checkout.data[dbID][fieldName];
			}

			// If this is a checkbox, the new value needs to be converted to PostreSQL's boolean as intepreted by PHP
			if ($input.is('.input-checkbox')) newValue = newValue ? 't' : 'f';

			valueChanged = valueChanged || dbValue != newValue;
		}

		$input.toggleClass('dirty', valueChanged);
		$('#save-expedition-button').ariaHide(!$('.input-field.dirty').length);

	}


	toggleEditing(forceEditingOn=null) {
		const $content = $('.expedition-content');

		// if forceEditingOn is specified, don't confirm the choice. Just toggle editing accordingly
		if (forceEditingOn != null) {
			$content.toggleClass('uneditable', !forceEditingOn);
			$('#delete-expedition-button').ariaHide(!forceEditingOn);
			if ($('.input-field.dirty').length) this.discardEdits();
		} else {
			const allowEdits = $content.is('.uneditable');
			if (!allowEdits && $('.input-field.dirty:not(.filled-by-default)').length) {
				const afterActionCallbackStr = `
					$('.expedition-content').addClass('uneditable');
					$('#delete-expedition-button').ariaHide(true);
				`;
				this.confirmSaveEdits({afterActionCallbackStr: afterActionCallbackStr});
			} else {
				$content.toggleClass('uneditable', !allowEdits);
				$('#delete-expedition-button').ariaHide(!allowEdits);
			}
		}
	}


	/*
	Helper method to load expedition data. Used when either the searchbar val changes or the user clicks the browser back/forward buttons
	*/
	loadExpedition(expeditionID) {
		// const $select = $('#expedition-search-bar');
		// $select.removeClass('default');
		$('.search-options-drawer').removeClass('show');
		this.queryExpedition(expeditionID);
		$('#show-modal-climber-form-button').closest('.collapse').collapse('show');
		this.toggleEditing(false);//make sure editting is turned off

	}


	/*
	Helper method to add a new history entry for navigating between expeditions
	*/
	updateURLHistory(expeditionID, $input) {
		// Update URL with new expedition ID and add a history entry so the back 
		//	and forward buttons will move to and from expeditions
		const url = new URL(window.location);
		url.searchParams.set('id', expeditionID);
		const previouslySelectedID = $input.data('current-value');
		
		// Push the new entry here because loadExpedition() is also called when the user clicks the back or forward button, and adding a history entry then will muck up the history sequence 
		this.historyBuffer.push(expeditionID);
		window.history.pushState({id: expeditionID, historyIndex: this.currentHistoryIndex + 1}, '', url);
	}


	onExpeditionOptionClick(e) {
		const $option = $(e.target);
		const expeditionID = $option.data('expedition-id');
		const $input = $('#expedition-id-input');
		if (expeditionID != '') {
			this.loadExpedition(expeditionID);
			this.updateURLHistory(expeditionID, $input);
		} else {
			$input.addClass('default');
		}
		$input.val(expeditionID)
			.data('current-value', expeditionID);
	}


	/*
	Helper method to add an expedition member to a give unordered list
	*/
	addRouteMember(memberInfo, $list, climberID, {expeditionMemberID=null}={}) {
		
		// Make sure this can be called from a modal with adhoc onclick events. In this case, just an html id would be given so make sure it's a jquery object
		$list = $($list);

		const $listItem = this.addNewListItem($list, {newItemClass: 'new-list-item', parentDBID: expeditionMemberID});
		$listItem.data('expedition-member-id', expeditionMemberID);
		$listItem.find('.name-label').text(`${memberInfo.last_name}, ${memberInfo.first_name}`);

		// Set the climber ID so when edits are saved, this route's SQL can be added with the corresponding newly-added expedition_member
		// use .attr() instead of .data() so we can use the css selector [data-climber-id=<id>] later
		$listItem.attr('data-climber-id', climberID);

		// Make sure the route is set for the hidden input for this list item
		const routeCode = $listItem.closest('.card').find('select.route-code-header-input:not(.mountain-code-header-input)').val();
		$listItem.find('.input-field[name="route_code"]').val(routeCode).change();

		// set the route order because this field is only managed by order of the cards in the routes-accordion
		const routeOrder = $listItem.closest('.card').index();
		$listItem.find('.input-field[name="route_order"]').val(routeOrder).change();

		// Toggle the add-expedition-route-member-button If there are any expedition members that aren't assigned to a route
		const nMembers = this.expeditionInfo.expedition_members.order.length;
		const $card = $list.closest('.card');
		$card.find( $('.add-expedition-route-member-button') ).ariaHide(
			$card.find('.route-member-list .data-list-item:not(.cloneable)').length >= nMembers 
		);

		//$('#save-expedition-button').ariaHide(false); 
	}


	/*
	Helper function to convert unordered parameters 
	into pre-prepared SQL statement and params
	*/
	valuesToSQL(values, tableName, timestamp, userName, {updateID=null, foreignIDs={}}={}) {

		
		var sortedFields = Object.keys(values).sort();
		var parameters = sortedFields.map(f => values[f]);
		
		var returningClause = '', 
			parametized = '',
			currvalClauseString = '',
			foreignColumnReturnString = '',
			currvalCount = 0;

		// Add edit meta fields if they exist in this table
		const columnInfo = this.tableInfo.tables[tableName].columns;
		if ('last_modified_by' in columnInfo) {
			sortedFields = sortedFields.concat(['last_modified_by', 'last_modified_time']);
			parameters = parameters.concat([userName, timestamp]);
		}

		var sql;
		if (updateID === null) { // it's an INSERT
			// Add entry meta fields if the table has them
			if ('entered_by' in columnInfo) {
				sortedFields = sortedFields.concat(['entered_by', 'entry_time']);
				parameters = parameters.concat([userName, timestamp]);
			}

			// For tables that are related to other fields by a foreign key, make sure those foreign keys make it into the INSERT
			//	Needs to be the last fields added so the currval() clause can be tacked onto the end of the VALUES in the SQL
			const foreignColumnInfo = this.tableInfo.tables[tableName].foreignColumns || [];
			if (foreignColumnInfo.length) {
				// find the ID
				for (const {foreignTable, column} of foreignColumnInfo) {
					// Can't duplicate or the query will throw an SQL error (only a problem for cmc_id)
					if (column in values) continue;

					// if the foreignID is given, the parent db record already exists
					const foreignID = foreignIDs[foreignTable];
					if (foreignID) {
						parameters.push(foreignID);
					// if it doesn't, the ID value will have to be retrieved with a currval clause. This will only
					//	work if the parent and child records are inserted in the proper order
					} else {
						// insert a value to get what will be the foreign table ID 
						currvalClauseString += `, currval(pg_get_serial_sequence('${foreignTable}', 'id'))`;
						currvalCount ++;
					} 
					// The foreign column will have to be returned for INSERTs so the in-memory data (expeditionInfo) can be updated
					foreignColumnReturnString += `, ${column}`;
					sortedFields.push(column);

				}
			}
		

			// Make the parametized SQL for an INSERT
			let parametized = sortedFields.map(f => '$' + (sortedFields.indexOf(f) + 1))
				.slice(0, sortedFields.length - currvalCount) // drop the currvalClause parametized values because they don't need to be parametized
				.join(', ');
			sql = `INSERT INTO ${tableName} (${sortedFields.join(', ')}) VALUES (${parametized}${currvalClauseString}) RETURNING id${foreignColumnReturnString}`;
		} else {
			// Just make the parametized SQL for an UPDATE
			let parametized = sortedFields.map(f => `${f}=$${sortedFields.indexOf(f) + 1}`)
				.slice(0, sortedFields.length)
				.join(', ');
			sql = `UPDATE ${tableName} SET ${parametized} WHERE id=${updateID}`;
		}
		

		return [sql, parameters];

	}


	/* Thin wrapper for valuesToSQL that includes getting values from inputs*/
	inputsToSQL(parentElement, tableName, timestamp, userName, {updateID=null, foreignIDs={}, insertArray=null}={}) {
		const $inputs = $(parentElement).find('.input-field.dirty');
		const fieldValues = Object.fromEntries(
			$inputs
				.get() // get plain array of JS elements because jQuery's .map() returns flattened array
				.map(el => [el.name, this.getInputFieldValue($(el))])
		);

		const [sql, parameters] = this.valuesToSQL(
				fieldValues, 
				tableName, 
				timestamp, 
				userName, 
				{
					updateID: updateID || null, 
					foreignIDs: foreignIDs
				}
			);
		if (insertArray !== null && sql.startsWith('INSERT')) 
			insertArray.push({container: parentElement, tableName: tableName});
		
		return [sql, parameters];
	}


	saveEdits() {

		var sqlStatements = [];
		var sqlParameters = [];
		
		const $editParents = $(`
				.data-list-item:not(.cloneable), 
				.card:not(.cloneable) .tab-pane,
				#expedition-members-accordion .card:not(.cloneable) .card-header,
				#expedition-data-container
			`)
			.has('.input-field.dirty');
		if (!this.validateFields($editParents)) {
			showModal('One or more required fields are not filled. All required fields must be filled before you can save your edits.', 'Required field is empty');
			hideLoadingIndicator();
			return;
		};

		if (!$editParents.length) {
			showModal('You have not made any edits to save yet.', 'No edits to save');
			hideLoadingIndicator();
			return;
		}

		const now = getFormattedTimestamp(new Date(), {format: 'datetime'});
		const userName = this.userInfo.ad_username;
		const lastModified = [userName, now];
		
		// determine if this is a new expedition or not
		const expeditionID = $('#input-planned_departure_date').data('table-id') || null;
		const isNewExpedition = expeditionID === undefined;

		// collect info about inserts so attributes can be changes such that future edits are treated as updates
		var inserts = []; //{container: container, tableName: tableName}

		// get expedition table edits
		var expeditionValues = [];
		var expeditionFields = []; 
		for (const el of $('#expedition-data-container .input-field.dirty')) {
			expeditionValues.push(el.value);
			expeditionFields.push(el.name);
		}
		if (expeditionValues.length) {
			let fieldValues = Object.fromEntries(expeditionFields.map((f, i) => [f, expeditionValues[i]]));
			let [sql, parameters] = this.valuesToSQL(fieldValues, 'expeditions', now, userName, {updateID: expeditionID || null});
			sqlStatements.push(sql);
			sqlParameters.push(parameters);

			if (sql.startsWith('INSERT')) {
				inserts.push({container: $('#expedition-data-container'), tableName: 'expeditions'})
			}
		}

		// Get expedition members and member transactions
		//	Transactions and routes might have edits without expedition members having any, so loop 
		//	through each expedition member card, regardless of whether it has any dirty inputs
		for (const el of $('#expedition-members-accordion .card:not(.cloneable)')) {
			const $card = $(el);

			// expedition member
			const dbID = $card.data('table-id');
			const climberID = $card.data('climber-id');
			if ($card.find('.input-field.dirty').length) {
				const [sql, parameters] = this.inputsToSQL(
					$card.find('.expedition-info-tab-pane, .card-header'),
					'expedition_members', 
					now, 
					userName, 
					{
						updateID: dbID || null, 
						foreignIDs: {
							expeditions: expeditionID, 
							climbers: climberID
						},
						insertArray: inserts
					}
				);
				sqlStatements.push(sql);
				sqlParameters.push(parameters);
			}

			// transactions
			for (const li of $card.find('.transactions-tab-pane .data-list > li.data-list-item:not(.cloneable)').has('.input-field.dirty')) {
				const dbID = $(li).data('table-id');
				const [sql, parameters] = this.inputsToSQL(
					li, 
					'transactions', 
					now, 
					userName, 
					{
						updateID: dbID || null,
						foreignIDs: {expedition_members: $(li).data('parent-table-id')},
						insertArray: inserts
					}
				);
				sqlStatements.push(sql);
				sqlParameters.push(parameters);
			}

			// Insert any routes with the corresponding expedition member so that the currval() clause will work 
			//	when a new expedition member has been added
			const memberRouteItems = $(`#routes-accordion .card:not(.cloneable) li.data-list-item[data-climber-id=${climberID}]`)
				.has('.input-field.dirty');
			for (const li of memberRouteItems) {
				const dbID = $(li).data('table-id');
				const [sql, parameters] = this.inputsToSQL(
					li, 
					'expedition_member_routes', 
					now, 
					userName, 
					{
						updateID: dbID || null,
						foreignIDs: {expedition_members: $(li).data('expedition-member-id')},
						insertArray: inserts
					}
				);
				sqlStatements.push(sql);
				sqlParameters.push(parameters);

			}
		}

		// CMCs
		for (const li of $('#cmc-list li.data-list-item:not(.cloneable)').has('.input-field.dirty')) {
			const dbID = $(li).data('table-id');
			const [sql, parameters] = this.inputsToSQL(
				li, 
				'cmc_checkout', 
				now, 
				userName, 
				{
					updateID: dbID || null,
					foreignIDs: {expeditions: expeditionID},
					insertArray: inserts
				}
			);
			sqlStatements.push(sql);
			sqlParameters.push(parameters);
		}
		
		// Comms
		for (const li of $('#comms-list li.data-list-item:not(.cloneable)').has('.input-field.dirty')) {
			const dbID = $(li).data('table-id');
			$(li).find('.input-field[name=expedition_member_id]')
				.addClass('dirty'); // force expedition_member_id field to appear in values so it isn't included in foregin table clauses
			const [sql, parameters] = this.inputsToSQL(
				li, 
				'communication_devices', 
				now, 
				userName, 
				{
					updateID: dbID || null,
					foreignIDs: {expeditions: expeditionID},
					insertArray: inserts
				}
			);
			sqlStatements.push(sql);
			sqlParameters.push(parameters);
		}
		

		return $.ajax({ 
			url: 'climberdb.php',
			method: 'POST',
			data: {action: 'paramQuery', queryString: sqlStatements, params: sqlParameters},
			cache: false
		}).done(queryResultString => {
			if (climberDB.queryReturnedError(queryResultString)) { 
				showModal(`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
				return;
			} else {
				const result = $.parseJSON(queryResultString)
					.filter(row => row != null);
				var expeditionID = this.expeditionInfo.expeditions.id;
				for (const i in result) {
					const returnedIDs = result[i];
					const id = returnedIDs.id;
					if (id == null || id === '') continue;

					// Set the card's/list item's class and inputs' attributes so changes will register as updates
					const {container, tableName} = inserts[i];
					if (tableName === 'expeditions') expeditionID = id;
					const $container = $(container).closest('.data-list-item, .card');
					const parentTableID = (this.tableInfo.tables[tableName].foreignColumns[0] || {}).column;
					if ($container.is('.data-list-item')) $container.attr('data-parent-table-id', parentTableID); 
					const $inputs = $container.closest('.data-list-item, .card')
						.removeClass('new-card')
						.removeClass('new-list-item')
						.attr('data-table-id', id)
						.attr('data-table-name', tableName)
						.find('.input-field.dirty')
							.data('table-name', tableName)
							.data('table-id', id);
					const foreignIDs = Object.entries(returnedIDs).filter(([column, _]) => column !== 'id');
					if (Object.keys(foreignIDs).length) $inputs.data('foreign-ids', Object.fromEntries(foreignIDs));
					
				}


				// update in-memory data for each edited input
				const edits = this.edits;
				const expeditionInfo = this.expeditionInfo;
				const $editedInputs =  $('.input-field.dirty').removeClass('dirty');
				this.queryExpedition(expeditionID, {showOnLoadWarnings: false}) //suppress flagged expedition member warnings
					// .done(() => {
					// 	//
					// 	setTimeout(() => {$('#input-group_status').change()}, 500);
					// });

				// Hide the save button again since there aren't any edits
				$('#save-expedition-button').ariaHide(true);
				// but open the reports modal button since there's something to show
				$('#open-reports-modal-button').ariaHide(false);
				// show other edit buttons
				$('#edit-expedition-button, #delete-expedition-button').ariaHide(false);
			}
		}).fail((xhr, status, error) => {
			showModal(`An unexpected error occurred while saving data to the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			// roll back in-memory data
		}).always(() => {
		 	climberDB.hideLoadingIndicator();
		});

	}
	

	discardEdits() {
		
		// remove any new cards or new list items. This means that only updates (not inserts) need to be reset
		$('.new-card, .new-list-item').fadeRemove();

		//expeditions
		for (const el of $('#expedition-data-container .input-field.dirty')) {
			this.setInputFieldValue(el, this.expeditionInfo.expeditions);
		}

		// expedition_members
		const $memberInputs = $('#expedition-members-accordion .card:not(.cloneable)')
			.find('.card-header .input-field.dirty, .expedition-info-tab-pane .input-field.dirty');
		for (const el of $memberInputs) {
			const memberInfo = this.expeditionInfo.expedition_members.data[$(el).data('table-id')];
			this.setInputFieldValue(el, memberInfo)
		}

		// transactions
		const $transactionInputs = $('.card:not(.cloneable) .transactions-tab-pane .data-list-item:not(.cloneable):not(.new-list-item) .input-field.dirty');
		for (const el of $transactionInputs) {
			const memberID = $(el).closest('card').data('table-id');
			const transactionInfo = this.expeditionInfo.transactions.data[memberID];
			this.setInputFieldValue(el, transactionInfo);
		}

		// routes
		for (const el of $('#routes-accordion .card:not(.cloneable) .input-field.dirty')) {
			const $listItem = $(el).closest('.data-list-item')
			const routeCode = $listItem.find('.input-field[name=route_code]').val();
			const memberID = $listItem.data('expedition-member-id');
			const routeMemberInfo = this.expeditionInfo.expedition_member_routes.data[routeCode][memberID];
			this.setInputFieldValue(el, routeMemberInfo);
		}

		//cmcs
		for (const el of $('#cmc-list li.data-list-item:not(.cloneable) .input-field.dirty')) {
			const cmcInfo = this.expeditionInfo.cmc_checkout.data[$(el).data('table-id')];
			this.setInputFieldValue(el, cmcInfo);
		}

		$('.input-field.dirty').removeClass('dirty');
		$('#save-expedition-button').ariaHide(true);
	}


	/*
	Ask the user to confirm/discard edits
	*/
	confirmSaveEdits({afterActionCallbackStr='', afterCancelCallbackStr=''}={}) {
		//@param afterActionCallbackStr: string of code to be appended to html onclick attribute

		const onConfirmClick = `
			showLoadingIndicator('saveEdits');
			climberDB.saveEdits(); 
		`;
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal" onclick="${afterCancelCallbackStr}">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.discardEdits();${afterActionCallbackStr}">Discard</button>
			<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}${afterActionCallbackStr}">Save</button>
		`;

		showModal(
			`You have unsaved edits to this expedition. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this expedition.`,
			'Save edits?',
			'alert',
			footerButtons
		);
	}


	deleteExpedition() {
		const expeditionID = this.expeditionInfo.expeditions.id;
		// If this is a new expedition, just discard UI edits
		if (!expeditionID) {
			this.discardEdits();
			return $.Deferred().resolve(true);
		} else {
			showLoadingIndicator('deleteExpedition');
			const sql = `DELETE FROM expeditions WHERE id=${expeditionID} RETURNING id`;
			return this.queryDB(sql).done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while deleting data from the database: ${queryResultString.trim()}.`, 'Unexpected error');
					return;
				} else {
					// Remove the expedition from the search bar (if it exists, i.e., is from the current year)
					//$(`#expedition-search-bar option[value=${expeditionID}]`).remove();
					$(`#expedition-search-bar .expedition-search-bar-option[data-expedition-id=${expeditionID}]`).remove();
					this.createNewExpedition();
				}
			}).fail((xhr, status, error) => {
				showModal(`An unexpected error occurred while deleting data from the database: ${error}.`, 'Unexpected error');
			}).always(() => {
				hideLoadingIndicator();
			});

		}
	}

	onDeleteExpeditionButtonClick() {
		const message = this.expeditionInfo.expeditions.id ? 
			'Are you sure you want to delete this expedition? All expedition member, transaction,' + 
				' and route information for this expedition will be deleted. <strong>This action'  + 
				' is permanent and cannot be undone.</strong>' :
			'Are you sure you want to delete this new expedition? If you click "Delete", all your' + 
				' edits will be removed.';
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.deleteExpedition()">Delete</button>
		`;
		showModal(message, 'Delete Expedition?', 'confirm', footerButtons);
	} 

	/*
	@param $card: the parent .card of the clicked change-expedition-button 
	*/
	showChangeExpeditionModal($card) {
		if ($card.is('.new-card')) {
			showModal('You can\'t move this expedition member to a different expedition until you have saved their information. Either save their information first or delete this expedition member and enter add them to the correct expedition.', 'Invalid operation');
			return;
		}
		// default to -1 because ID will never equal -1, although a fallback option shouldn't 
		//	ever be needed because the only way the the current-value wouldn't be set is 
		//	if this is a new expedition, and that wouldn't happen because of the above 
		//	if {} block
		const expeditionID = $('#input-expedition_name').data('table-id') || '-1'; 

		const $searchBar = $('#modal-expedition-search-bar').val('')//make sure it's empty;

		// fill the select by default with all 
		this.fillExpeditionSearchSelect({
			$searchBar: $searchBar, 
			queryStrings: {
				planned_departure_date: `planned_departure_date >= '${new Date().getFullYear()}-01-01'`,
				expedition_id: `expedition_id <> ${expeditionID}`
			}
		})
		const expeditionMemberID = $card.data('table-id');
		const memberInfo = this.expeditionInfo.expedition_members.data[expeditionMemberID];
		const fullName = `${memberInfo.first_name} ${memberInfo.last_name}`;
		const $label = $('#modal-expedition-search-bar-label').html(`Search for the expedition to move <span><strong>${fullName}</strong></span> to`);
		const $modal = $('#change-expedition-modal').modal({keyboard: false,  backdrop: 'static'});

		// Save the expedition member ID in the data of the confirm button
		$('#confirm-change-expedition-button').data('expedition-member-id', expeditionMemberID);
	}


	/*
	*/
	onModalExpeditionSearchOptionClick(e) {
		const $option = $(e.target)
		const $searchBar = $('#modal-expedition-search-bar');
		const selectedExpeditionName = $option.text();

		// check that the climber isn't already a member of this expedition
		const expeditionID = $option.data('expedition-id');
		const expeditionMemberID = $('#confirm-change-expedition-button').data('expedition-member-id');
		const climberID = this.expeditionInfo.expedition_members.data[expeditionMemberID].climber_id;
		this.queryDB(`SELECT * FROM expedition_members WHERE expedition_id=${expeditionID} AND climber_id=${climberID}`)
			.done(queryResultString => {
				if (!this.queryReturnedError(queryResultString)) {
					const result = $.parseJSON(queryResultString);
					if (result.length) {
						const climberName = $('#modal-expedition-search-bar-label > span').text();
						showModal(`${climberName} is already a member of ${selectedExpeditionName}. If you think this is an error, check which expedition member record has the most complete or up-to-date information and delete the other one. Then change their expedition if necessary.`, 'Duplicate Expedition Member');
					} else {
						const $searchBar = $('#modal-expedition-search-bar');
						
						// Select the clicked option so that it can be easily located if the user clicks the 
						//	confirm-change-expedition-button
						$searchBar.find('.expedition-search-bar-option.selected').removeClass('selected');
						$option.addClass('selected');

						// Set the search bar value
						$searchBar.val(selectedExpeditionName);
					}
				}
			})

	} 

	/*

	*/
	moveExpeditionMember() {

		showLoadingIndicator('moveExpeditionMember');

		const selectedExpeditionID = $('#modal-expedition-options-drawer .expedition-search-bar-option.selected')
			.data('expedition-id');
		const expeditionMemberID = $('#confirm-change-expedition-button').data('expedition-member-id');

		const sql = `UPDATE expedition_members SET expedition_id=${selectedExpeditionID} WHERE id=${expeditionMemberID} RETURNING expedition_id`;
		this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal('The expedition member could not be moved to a new expedition. Error: ' + queryResultString, 'Database Error');
				} else {
					this.loadExpedition(selectedExpeditionID);
					this.updateURLHistory(selectedExpeditionID, $('#expedition-id-input'));
					$('#change-expedition-modal').modal('hide');
				}
			}).fail((xhr, status, error) => {
				showModal('The expedition member could not be moved to a new expedition. Error: ' + error, 'Database Error');
			}).always(() => {
				hideLoadingIndicator();
			});

	}

	/*
	Event handler for modal confirm-change-expedition-button
	*/
	onConfirmChangeExpeditionButtonClick() {
		// Confirm edits if there are any
		if ($('.input-field.dirty:not(.filled-by-default)').length) {
			this.confirmSaveEdits({afterActionCallbackStr: `climberDB.moveExpeditionMember()`});
		} 
		// Otherwise just do the move
		else {
			this.moveExpeditionMember();
		}
	}

	/*
	Dynamically make a PDF of the specified type. Send a request to the Flask backend 
	to make the PDF from a Jinja template filled in with the current expedition's data
	*/
	makePDF(exportType) {


		if (!exportType) exportType = $('#input-export_type').val();
		
		// Most of the necessary data will be in these two objects
		var pdfData = {...this.expeditionInfo.expeditions, ...this.config};
		
		// Get human-readable values from selects
		for (const property of Object.keys(climberDB.expeditionInfo.expeditions).filter(k => k.endsWith('_code'))) {
			pdfData[property.replace('_code', '')] = $(`select.input-field[name="${property}"]`)
				.find(`option[value="${pdfData[property]}"]`).text();
		}

		pdfData.cancellation_fee = pdfData.cancellation_fee.toFixed(2);

		// Get climber and leader info
		const climbers = Object.values(this.expeditionInfo.expedition_members.data).flatMap(info => {
			// Skip canceled climbers
			if (info.reservation_status_code == 6) return []; // flatmap will remove this

			// destructure the climber's info and get just first_name and last_name
			const climberInfo = (({ first_name, last_name }) => ({ first_name, last_name }))(info);
			
			// Get full name for ease of use
			const fullName = info.first_name + ' ' + info.last_name;
			climberInfo.full_name = fullName;

			// Get leader info since we're looping through values anyway
			climberInfo.is_trip_leader = info.is_trip_leader === 't' || info.is_trip_leader === true;
			if (climberInfo.is_trip_leader) pdfData.leader_full_name = fullName;
			

            return climberInfo;

		}).sort((a, b) => {
			return a.last_name < b.last_name ? -1 : //last name 1 is before last name 2
				a.last_name > b.last_name ? 1 : 	//last name 1 is after last name 2
				a.first_name < b.first_name ? -1 : 	// last names the same so compare first name
				a.first_name > b.first_name ? 1 : 	// last names the same so compare first name
				0 									// names are the same
		});
		pdfData.climbers = JSON.stringify(climbers);
		pdfData.total_climbers = climbers.length;

		// Get total payment
		var totalPayment = 0;
		for (const transactions of Object.values(climberDB.expeditionInfo.transactions)) {
			for (const info of Object.values(transactions.data)) {
				// only add negative-value tranactions because the rest are charges
				if ( (info.transaction_value < 0) && (info.transaction_type_code == 24) ) 
					totalPayment -= parseFloat(info.transaction_value); // -= because payments are negative
			}
		}
		// Format string as float
		pdfData.total_payment = totalPayment.toFixed(2);

		if (exportType == 'registration_card') {
			// Get route data: for each card, get the mountain name
			pdfData.routes = [];
			for (const card of  $('#routes-accordion > .card:not(.cloneable)')) {
				const $card = $(card);
				const route = this.routeCodes[$card.find('.route-code-header-input[name="route_code"]').val()];
				const mountainName = $card.find(`.route-code-header-input[name="mountain_code"] option[value="${route.mountain_code}"]`).text();
				pdfData.routes.push({mountain: mountainName, route: route.name});
			} 	
			// pdfData.routes = $('#routes-accordion > .card:not(.cloneable)').map(
			// 	(_, card) => Object.fromEntries(
			// 			new Map(
			// 				$(card).find('.route-code-header-input')
			// 					.get()
			// 					.map(el => [el.name, el.value])
			// 			)
			// 		)
			// ).get()
		}
		pdfData.routes = JSON.stringify(pdfData.routes);

		this.showLoadingIndicator('makePDF');

		print(pdfData);

		return $.post({
			url: `flask/reports/${exportType}/${this.expeditionInfo.expeditions.id}.pdf`,
            data: pdfData,
        	xhrFields: {responseType: 'blob'}, 
			cache: false
		}).done(responseData => {
            var fileURL = URL.createObjectURL(responseData);
            window.open(fileURL);
            this.hideLoadingIndicator();
        });

	}


	/*Show modal climber form to allow the user to select a climber to add to the expedition*/
	showModalAddMemberForm() {

		// If the climber select has a valid value (climber ID from a previous query)
		//	load the currently selected climber
		const $select = $('#modal-climber-select');
		const climberID = $select.val();
		

		$('#add-climber-form-modal-container').ariaHide(false);
		this.climberForm.$el.addClass('climberdb-modal');

		const $climberForm = this.climberForm.$el;
		this.clearInputFields({parent: $climberForm, triggerChange: false});

		if (climberID === '') {
			$('.climber-form .result-details-summary-container.collapse').collapse('hide');
		} else {
			$select; 
		}

		$('.climber-form .expedition-modal-hidden').ariaHide(true);
		$('.climber-form .expedition-modal-only').ariaHide(false);

		$('.climber-form .delete-card-button').ariaHide(false);

		$climberForm.find('.card:not(.cloneable)').remove();

		// Show the climber info tab
		$('#climber-info-tab').click();

		$('#modal-climber-search-bar').focus();
	}


	/* Event handler for add expedition member button. If the user has a new expedition member 
	they haven't saved, ask them to confirm those edits before showing the form*/
	onAddExpeditionMemberButtonClick() {
		this.showModalAddMemberForm();

	}


	/*
	Populate the modal climber select options
	*/
	fillClimberFormSelectOptions(searchString) {
		const queryFields = 'id, full_name';
		const sql = this.getCoreClimberSQL({searchString: searchString,  queryFields: queryFields});
		return this.queryDB(sql, {returnTimestamp: true})
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {

				} else {
					var result = $.parseJSON(queryResultString);
					// Check if this result is older than the currently displayed result. This can happen if the user is 
					//	typing quickly and an older result happens to get returned after a newer result. If so, exit 
					//	since we don't want the older result to overwrite the newer one
					const queryTime = result.queryTime;
					if (queryTime < this.climberForm.lastSearchQuery) {
						return;
					} else {
						this.climberForm.lastSearchQuery = queryTime;
					}
					const $select = $('#modal-climber-select').empty();
					result = result.data;
					if (result.length === 0) {
						$select.append('<option value="">No climbers match your search</option>');
					} else {
						for (const row of result) {
							$select.append(`<option value="${row.id}">${row.full_name}</option>`);
						}
						$select.val(result[0].id).change();
					}
				}
			})
			.fail((xhr, status, error) => {
				console.log('fillClimberFormSelectOptions query failed: ' + sql);
			})
	}


	/*
	Helper function called by either keyup event on modal climber search bar or select refresh button
	This allows access to the deferred result of fillClimberFormSelectOptions
	*/
	refreshClimberSelectOptions(searchString) {

		$('#modal-climber-select').closest('.collapse').collapse('show');
		return this.fillClimberFormSelectOptions(searchString);
	}

	/*
	Event hander for the search bar on the modal "add expedition member" form
	*/
	onClimberFormSearchKeyup() {
		const $input = $('#modal-climber-search-bar');
		const searchString = $input.val();
		if (searchString.length >= 3) this.refreshClimberSelectOptions(searchString);
	}

	queryOptionToWhereClause(field, operatorValue, searchValue) {
		
		var searchString;
		switch (operatorValue) {
			case 'equals':
				searchString = `${field} = '${searchValue}'`;
				break;
			case 'startsWith':
				searchString = `${field} LIKE '${searchValue}%'`;
				break;
			case 'endsWith':
				searchString = `${field} LIKE '%${searchValue}'`;
				break;
			case 'contains': 
				searchString = `${field} LIKE '%${searchValue}'%`; 
				break;
			case 'BETWEEN':
				searchString = `${field} BETWEEN '${searchValue[0]}' AND '${searchValue[1]}'`;
				break;
			default:
				searchString = `${field} ${operatorValue} '${searchValue}'`
		}
		return searchString;
	}


	fillExpeditionSearchSelect({$searchBar='#expedition-search-bar', showExpeditionOptions=false, queryStrings={}}={}) {
		
		$searchBar = $($searchBar);

		const $queryOptions = $searchBar.siblings('.search-options-container').find('.query-option-container'); //empty for modal
		if (!Object.keys(queryStrings).length) {
			for (const el of $queryOptions ) {
				const $container = $(el);
				const $inputs = $container.find('*:not(.hidden) > .query-option-input-field:not(.hidden)');
				const fieldName = $inputs.first().data('field-name');
				let searchValues = $inputs.map((_, el) => {
					const value = el.value;
					if (value !== null && value.length > 0) return el.value
				}).get();
				
				if (searchValues.length === 0 || fieldName in queryStrings) continue; //2 value option (i.e. operaor === BETWEEN) and field already captured

				const operator = $container.find('.query-option-operator').val();

				if ($inputs.is('.datetime-query-option') && operator == 'BETWEEN') {
					queryStrings[fieldName] = (this.queryOptionToWhereClause(fieldName, operator, searchValues));
				} else if ($inputs.first().is('.string-match-query-option, .datetime-query-option')) {
					queryStrings[fieldName] = (this.queryOptionToWhereClause(fieldName, operator, searchValues[0]));
				} else if ($inputs.is('.select2-no-tag')) {
					queryStrings[fieldName] = (`${fieldName} IN (${searchValues.join(',')})`)
				}
			}
		}

		// If a search string is given and the expedition_name filter isn't filled, use Postgres trigram fuzzy search
		const searchString = $searchBar.val();
		var orderBy, 
			similarity = '';
		if (searchString && !queryStrings.expedition_name) {
			// Make sure options that start with the search string appear first
			similarity = `
				CASE 
					WHEN expedition_name ILIKE '${searchString}%' THEN 1 + similarity(lower(expedition_name), lower('${searchString}'))
					ELSE similarity(lower(expedition_name), lower('${searchString}'))
				END`;
			queryStrings.expedition_id = similarity + ' > 0.3';
			orderBy = 'search_score DESC, expedition_name';
		} else {
			orderBy = 'expedition_name'
		}
		if (Object.keys(queryStrings).length === 0) {
			queryStrings = {planned_departure_date: `planned_departure_date >= '${new Date().getFullYear()}-1-1'`}
		};
		if (!('expedition_id' in queryStrings)) {
			// Exclude the current expedition. If this is a new expedition and table-id isn't set, 
			//	ID should never = -1 so it will return everything
			const currentExpeditionID = $('#input-expedition_name').data('table-id') || '-1';
			queryStrings.expedition_id = `expedition_id <> ${currentExpeditionID}`;
		}

		const whereClause = `WHERE ${Object.values(queryStrings).join(' AND ')}`;

		const sql = `
			SELECT DISTINCT 
				expedition_id, 
				expedition_name 
				${similarity ? `, ${similarity} AS search_score` : ''} 
			FROM expedition_info_view 
			${whereClause} 
			ORDER BY ${orderBy}`;
		this.queryDB(sql, {returnTimestamp: true})
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {

				} else {
					var result = $.parseJSON(queryResultString);
					
					// Check if this result is older than the currently displayed result. This can happen if the user is 
					//	typing quickly and an older result happens to get returned after a newer result. If so, exit 
					//	since we don't want the older result to overwrite the newer one
					const queryTime = result.queryTime;
					if (queryTime < this.lastSearchQuery) {
						return;
					} else {
						this.lastSearchQuery = queryTime;
					}
					result = result.data;

					const $drawer = $searchBar.siblings('.expedition-options-container').empty();
					if (result.length) {
						//$drawer.append('<option value="">Click to select an expedition</option>')
						for (const row of result) {
							$drawer.append(`<div class="expedition-search-bar-option" data-expedition-id="${row.expedition_id}">${row.expedition_name}</div>`)
						}
					} else {
						$drawer.append('<div class="expedition-search-bar-option">No expeditions match your search</div>');
					}
					if (showExpeditionOptions) $drawer.collapse('show');
				}
			})
			.fail((xhr, status, error) => {
				console.log('Failed to query expeditions for search select with sql ' + sql)
			});
		
	}


	/*
	Helper function to clear UI for creating a new expedition. Mostly necessary to ask user 
	to save edits if there are any and for after a successful expedition delete
	*/
	createNewExpedition() {
		// Reset the search bar value to the default 
		const $searchBar = $('#expedition-search-bar').val('');
		// var $defaultOption = $searchBar.find('option[value=""]'); 
		// if (!$defaultOption.length) {
		// 	$defaultOption = $searchBar.prepend('<option value="">Select an expedition to view</option>')
		// } 
		// $searchBar.val('').addClass('default');
		
		$('#show-modal-climber-form-button').closest('.collapse').collapse('show');

		// For some reason, setting the focus doesn't work unless there's a delay
		setTimeout( ()=>{ $('#input-expedition_name').focus() }, 100);

		// Hide all expedition buttons except delete
		$('.expedition-edit-button').ariaHide(true);
		this.toggleEditing(true);

		// Clear fields and data
		this.clearExpeditionInfo({triggerChange: true});

		// Set header values
		$('#expedition-entered-by-result-summary-item .result-details-summary-value')
			.text(this.userInfo.ad_username);
		$('#expedition-entry-time-result-summary-item .result-details-summary-value')
			.text((new Date()).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}));	
		$('#expedition-n-members-result-summary-item').collapse('hide');

		$('.needs-filled-by-default').addClass('filled-by-default')
	}


	/*
	Event handler for add-new-expedition-button
	*/
	onNewExpeditionButtonClick() {

		if ($('.input-field.dirty:not(.filled-by-default)').length) {
			this.confirmSaveEdits({afterActionCallbackStr: 'climberDB.createNewExpedition();'})
		} else {
			this.createNewExpedition()
		}
	}


	updateExpeditionMemberCount() {
		const nMembers = $('#expedition-members-accordion > .card:not(.cloneable):not(.canceled)').length;
		$('#expedition-n-members-result-summary-item > .result-details-summary-value').text(nMembers)
			.closest('.collapse').collapse(nMembers ? 'show' : 'hide');
	}

	addExpeditionMemberCard({expeditionMemberID=null, firstName=null, lastName=null, climberID=null, showCard=false, isNewCard=false, climberInfo={}}={}) {
		const expeditionMemberInfo = this.expeditionInfo.expedition_members.data[expeditionMemberID];
		if (expeditionMemberInfo) {
			firstName = expeditionMemberInfo.first_name;
			lastName = expeditionMemberInfo.last_name;
			climberID = expeditionMemberInfo.climber_id;
		}
		const options = {
				accordionName: 'expedition_members', 
				cardLinkText: `${lastName}, ${firstName}`,
				updateIDs: expeditionMemberID ? {expedition_members: expeditionMemberID} : {},
				show: showCard,
				newCardClass: isNewCard ? 'new-card' : ''
		}
		const $newCard = this.addNewCard($('#expedition-members-accordion'), options);

		// necessary for UPDATES and INSERTS
		//$newCard.data('table-id', expeditionMemberID);

		$newCard.data('climber-id', climberID);

		$newCard.find('.climber-link')
			.attr('href', `climbers.html?id=${climberID}`)
			.text(`View ${firstName} ${lastName}'s climber info`);
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
		$transactionsList.attr('id', $transactionsList.attr('id') + '-' + climberID);
		
		// Fill inputs
		if (expeditionMemberInfo) {
			for (const el of $newCard.find('.card-header .input-field, .expedition-info-tab-pane .input-field')) {
				this.setInputFieldValue(el, expeditionMemberInfo, {dbID: expeditionMemberID, triggerChange: isNewCard})
			}

			if (expeditionMemberInfo.reservation_status_code == 6) $newCard.addClass('canceled');
			if (expeditionMemberInfo.is_guiding) $newCard.find('.guide-icon').ariaTransparent(false);

			// Add transaction rows
			const transactions = this.expeditionInfo.transactions[expeditionMemberID];
			//var transactionTotal = 0;
			for (const transactionID of transactions.order) {
				const $item = this.addNewListItem(
					$transactionsList, 
					{
						dbID: transactionID, 
						parentDBID: expeditionMemberID, 
						newItemClass: isNewCard ? 'new-list-item' : ''
					}
				);
				const thisTransaction = transactions.data[transactionID];
				for (const el of $item.find('.input-field')) {
					this.setInputFieldValue(el, thisTransaction, {dbID: transactionID});
				}
				//show the payment method field if this transactions is a payment
				const $paymentMethod = $item.find('.input-field[name=payment_method_code]');
				$paymentMethod.closest('.collapse').collapse(thisTransaction.payment_method_code ? 'show' : 'hide');//.toggleClass('show', thisTransaction.payment_method_code !== null);
				
				//transactionTotal = transactionTotal + parseFloat(thisTransaction.transaction_value || 0);
			}
			// $transactionsList.siblings('.data-list-footer')
			// 	.find('.data-list-header-label.total-col .total-span')
			// 	.text(transactionTotal.toFixed(2));
			this.getTransactionBalance($transactionsList);
		} else {
			// Set deault values for new members
			$newCard.find('.input-field[name="reservation_status_code"]')
				.val(1)//pending
				.change();
			$newCard.find('.input-field[name="datetime_reserved"]')
				.val(getFormattedTimestamp())
				.change();

			// set default tansactions (debits)
			const now = getFormattedTimestamp(new Date(), {format: 'datetime'})
			const $supFee = this.addNewListItem($transactionsList);
			$supFee.find('.input-field[name=transaction_type_code]')
				.val(10)//code for SUP fee
				.change();
			$supFee.find('.input-field[name=transaction_date]')
				.val(now)
				.change();
			const $entranceFee = this.addNewListItem($transactionsList);
			$entranceFee.find('.input-field[name=transaction_type_code]')
				.val(11)//code for entrance fee
				.change();
			$entranceFee.find('.input-field[name=transaction_date]')
				.val(now)
				.change();

			// If the climber is a minor, flag the expedition member
			const climberAge = climberInfo.age;
			if (!((climberAge === undefined) || (climberAge === null)) && (climberAge < 18) ) {
				$newCard.find('.input-field[name=flagged]')
					.prop('checked', true)
					.change();
				$newCard.find('.input-field[name=flagged_reason]')
					.val('Climber is under 18.')
					.change();
			}

		}


		this.updateExpeditionMemberCount();
		this.updateCommsDeviceOwnerOptions();

		return $newCard;
	}


	/*Helper method to fill the data-list after adding a new route card*/
	fillRouteMemberList(memberInfo, routeInfo) {
		// List items should be in alphabetical order, so add them in order of the members
		for (const memberID of memberInfo.order) {
			// Not all expedition members climb necessarily climb all routes
			if (memberID in routeInfo) {
				const memberRouteRecord = routeInfo[memberID];
				const memberRouteID = memberRouteRecord.expedition_member_route_id || null;
				const $listItem = this.addNewListItem($list, {dbID: memberRouteID, parentDBID: memberID});
				const thisMember = memberInfo.data[memberID];
				$listItem.find('.name-label').text(`${thisMember.last_name}, ${thisMember.first_name}`);
				if (memberRouteID) {
					for (const el of $listItem.find('.input-field')) {
						this.setInputFieldValue(el, memberRouteRecord, {dbID: memberRouteID, triggerChange: true});
					}
				}
			}
		}
	}


	fillFieldValues(triggerChange=true) {
		
		const expeditionData = this.expeditionInfo.expeditions;
		for (const el of $('#expedition-data-container .input-field')) {
			this.setInputFieldValue(el, expeditionData, {dbID: expeditionData.id, triggerChange: true});
		}
		$('#expedition-entered-by-result-summary-item > .result-details-summary-value').text(expeditionData.entered_by);
		$('#expedition-entry-time-result-summary-item > .result-details-summary-value').text(expeditionData.entry_time);

		// add expedition member cards
		const members = this.expeditionInfo.expedition_members;
		for (const memberID of members.order) {
			//const thisMember = members.data[memberID];
			this.addExpeditionMemberCard({expeditionMemberID: memberID});
			//$card.find('.show-transaction-tab-button').ariaHide(Object.keys(transactions).length === 0);
		}
		// Set the one checked leader checkbox to be visible all the time
		$('#expedition-members-accordion')
			.find('.leader-checkbox-container')
				.has('.input-checkbox:checked')
				.removeClass('transparent');

		// routes
		const routes = this.expeditionInfo.expedition_member_routes;
		for (const routeCode of routes.order) {
			const thisRoute = routes.data[routeCode];
			const routeName = this.routeCodes[routeCode].name;
			const mountainCode = this.routeCodes[routeCode].mountain_code;
			// add card
			const $newCard = this.addNewCard($('#routes-accordion'), 
				{
					accordionName: 'routes'
				}
			);
			$newCard.find('.mountain-code-header-input')
				.val(mountainCode)
				.removeClass('default')//set in addNewCard()
				.change()
					.siblings('.route-code-header-input, .input-field[name="route_code"]')
					.val(routeCode)
					.removeClass('default');

			const $list = $newCard.find('.route-member-list');
			$list.attr('id', $list.attr('id') + '-' + routeCode);
			// List items should be in alphabetical order, so add them in order of the members
			for (const memberID of members.order) {
				// Not all expedition members necessarily climb all routes
				if (memberID in thisRoute) {
					const memberRouteRecord = thisRoute[memberID];
					const memberRouteID = memberRouteRecord.expedition_member_route_id || null;
					const $listItem = this.addNewListItem($list, {dbID: memberRouteID});
					const thisMember = members.data[memberID];
					
					$listItem.attr('data-climber-id', thisMember.climber_id);

					// Set name of member
					$listItem.find('.name-label').text(`${thisMember.last_name}, ${thisMember.first_name}`);

					// Add the member ID to the list-item's data so the in-memory data can be linked back to the list item
					$listItem.attr('data-expedition-member-id', memberID); 

					// If the expedition member is canceled, hide the list item
					if (thisMember.reservation_status_code == 6) $listItem.ariaHide(true);

					if (memberRouteID) {
						const inputData = {'foreign-ids': {expedition_member_id: memberID}}
						for (const el of $listItem.find('.input-field')) {
							// trigger change for dependent collpases
							this.setInputFieldValue(el, memberRouteRecord, {dbID: memberRouteID, triggerChange: true, elementData: inputData});
						}
					}
				}
			}
		}

		const cmcs = this.expeditionInfo.cmc_checkout;
		const $cmcList = $('#cmc-list');
		for (const cmcCheckoutID of cmcs.order) {
			const thisCMC = cmcs.data[cmcCheckoutID];
			const $listItem = this.addNewListItem($cmcList, {dbID: cmcCheckoutID});
			for (const el of $listItem.find('.input-field')) {
				this.setInputFieldValue(el, thisCMC, {dbID: cmcCheckoutID});
			}
		}

		const comms = this.expeditionInfo.communication_devices;
		const $commsList = $('#comms-list');
		for (const commsID of comms.order) {
			const thisDevice = comms.data[commsID];
			const $listItem = this.addNewListItem($commsList, {dbID: commsID, parentDBID: expeditionData.id});
			for (const el of $listItem.find('.input-field')) {
				this.setInputFieldValue(el, thisDevice, {dbID: commsID});
			}
		}

		// Show edit toggle button
		$('#edit-expedition-button, #open-reports-modal-button').ariaHide(false);

		// .change() events trigger onInputChange() so undo that stuff
		$('.input-field.dirty').removeClass('dirty');
		$('#save-expedition-button').ariaHide(true);

		// set briefing link 
		const $briefingLink = $('#expedition-briefing-link');
		const briefingInfo = this.expeditionInfo.briefings;
		const briefingDate = briefingInfo.briefing_date;
		if (briefingDate) {
			$briefingLink.attr('href', `briefings.html?date=${briefingDate}&id=${briefingInfo.id}`).text('View/Change');
			$('.field-label[for=expedition-briefing-link]').text('Briefing time: ' + briefingInfo.briefing_datetime);
		} else if (expeditionData.planned_departure_date) {
			$briefingLink.attr('href', `briefings.html?date=${expeditionData.planned_departure_date}`);
		}//*/
		setTimeout(() => {$briefingLink.closest('.collapse').collapse('show')}, 500);

		// Data were loaed so make sure they're not obscured
		$('#expedition-options-drawer').collapse('hide');

		// Toggle the is_guiding collapse
		$('#input-guide_company').change();
	}


	clearExpeditionInfo({hideEditButtons=true, triggerChange=false}={}) {
		// Clear any previously loaded data
		$('.accordion .card:not(.cloneable), .data-list li:not(.cloneable)').remove();

		// Reset expetion data with just fields with defaults. Set them to null so that when .clearInputFields() 
		//	calls .change() the value is different and the .dirty class is added
		const defaultExpeditionValues = Object.fromEntries(
			$('#expedition-data-container .input-field[data-default-value]').map(
				(_, el) => [[el.name, null]] // for some stupid reason, jQuery flattens the array, so a 2D array becomes 1D
			).get()
		);
		// Clear in-memory data
		this.expeditionInfo = {
			expeditions: {...defaultExpeditionValues}, // each field is a property
			expedition_members: {data: {}, order: []}, 
			expedition_member_routes: {data: {}, order: []},
			transactions: {}, // props are exp. member IDs
			cmc_checkout: {data: {}, order: []},
			communication_devices: {data: {}, order: []},
			briefings: {}
		}

		this.clearInputFields({triggerChange: triggerChange});
		
		// clearInputFields sets the class to default if the value = '', and these unputs are currently empty 
		$('.route-code-header-input').removeClass('default');

		for (const el of $('.result-details-summary-value')) {
			$(el).text('');
		}

		//$('#input-expedition_name').val('New Expedition Name');
		$('#input-group_status').val(1);//=pending

		// Hide edit/export buttons
		$('.expedition-edit-button').ariaHide(hideEditButtons);

		// Not sure why, but a few selects in the climber form get .change triggered so turn the .dirty class off
		$('#add-climber-form-modal-container .input-field.dirty').removeClass('dirty');

		// reset briefing link
		$('.field-label[for=expedition-briefing-link]').text('No briefing scheduled');
		$('#expedition-briefing-link').attr('href', `briefings.html`).text('Set briefing time')
			.closest('.collapse').collapse('hide');
	}


	queryExpedition(expeditionID, {showOnLoadWarnings=true, triggerChange=null}={}) {

		const sql = `
			SELECT 
				*
			FROM expedition_info_view 
			WHERE expedition_id=${expeditionID} 
		`
		showLoadingIndicator('queryExpedition');

		// Query comms separate from all other expedition info because expedition_member_id 
		//	needs to be optional and, therefore, potentially null. This means that comms are 
		//	only related to other data by expedition_id. Using this relationship to join 
		//	communication_decices to other expedition info produces multiple comms device 
		//	records in the result without any way of determining which is right record. 
		//	Querying them separately eliminates this issue
		return $.when(
			this.queryDB(sql),
			this.queryDB(`SELECT * FROM communication_devices WHERE expedition_id=${expeditionID} ORDER BY entry_time, id`)
		).done( (expeditionInfoResult, commsResult) => {
				if (this.queryReturnedError(expeditionInfoResult)) {
					showModal(`An unexpected error occurred while querying expedition info with ID ${expeditionID}: ${expeditionInfoResult.trim()}.`, 'Unexpected error');
					return;
				} else if (this.queryReturnedError(commsResult)) {
					showModal(`An unexpected error occurred while querying the comms info with ID ${expeditionID}: ${commsResult.trim()}.`, 'Unexpected error');
					return;
				} else {
					const expeditionResult = $.parseJSON(expeditionInfoResult[0]);
					const openCardIDs = '#' + $('.card:not(.cloneable) .card-collapse.show').map((_, el) => el.id).get().join(',#');
					
					// Get expedition info
					if (expeditionResult.length) {
						this.clearExpeditionInfo(
							// don't hide expedition buttons when reloading data. Toggling edits for other cases will happen otherwise
							{hideEditButtons: showOnLoadWarnings} 
						);  

						const firstRow = expeditionResult[0];//there should only be one
						for (const fieldName in this.tableInfo.tables.expeditions.columns) {
							const queryField = this.entryMetaFields.includes(fieldName) ? 'expeditions_' + fieldName : fieldName;
							this.expeditionInfo.expeditions[fieldName] = firstRow[queryField];
						}
						this.expeditionInfo.expeditions.id = firstRow.expedition_id;
					} else {
						const footerButton = '<button class="generic-button modal-button close-modal" onclick="climberDB.createNewExpedition()" data-dismiss="modal">Close</button>';
						showModal(`There are no expeditions with the database ID '${expeditionID}'. This expedition was either deleted or the URL you are trying to use is invalid.`, 'Invalid Expedition ID', 'alert', footerButton);
					}

					// Get data for right-side tables
					let members = this.expeditionInfo.expedition_members;
					let transactions = this.expeditionInfo.transactions;
					let routes = this.expeditionInfo.expedition_member_routes;
					let cmcs = this.expeditionInfo.cmc_checkout;
					let briefingInfo = this.expeditionInfo.briefings;
					for (const row of expeditionResult) {
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

						/* this.expeditionInfo.expedition_member_routes = {
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
						if (memberID !== null && routeCode in routes.data && !(memberID in routes.data[routeCode])) { 
							routes.data[routeCode][memberID] = {};
							for (const fieldName in this.tableInfo.tables.expedition_member_routes.columns) {
								routes.data[routeCode][memberID][fieldName] = row[fieldName];
							}
							routes.data[routeCode][memberID].expedition_member_route_id = row.expedition_member_route_id;
						}

						const cmcCheckoutID = row.cmc_checkout_id;
						if (!(cmcCheckoutID in cmcs.data) && row.cmc_id !== null) {
							cmcs.data[cmcCheckoutID] = {};
							cmcs.order.push(cmcCheckoutID);
							for (const fieldName in this.tableInfo.tables.cmc_checkout.columns) {
								cmcs.data[cmcCheckoutID][fieldName] = row[fieldName];
							}
						}
						
						if (row.briefing_date && !briefingInfo.briefing_date) {
							briefingInfo.id = row.briefing_id;
							briefingInfo.briefing_date = row.briefing_date;
							briefingInfo.briefing_time = row.briefing_time;
							briefingInfo.briefing_datetime = row.briefing_datetime;
						}
					}

					// Process comms results
					let comms = this.expeditionInfo.communication_devices;
					for (const row of $.parseJSON(commsResult[0])) {
						comms.data[row.id] = {...row};
						comms.order.push(row.id);
					}
					
					this.fillFieldValues(false);//don't trigger change
					// If the data are being re-loaded after a save, show the cards that were open before
					if (!showOnLoadWarnings) $(openCardIDs).addClass('show');

					// if the expedition is from this year, then set the value of the search bar. If it's not, it won't exist in the select's options so set it to the null option
					const $searchBar = $('#expedition-search-bar');
					const $idInput = $('#expedition-id-input').val(expeditionID)
						.data('current-value', expeditionID)
						.change();

					//$select.toggleClass('default', $select.val() === '');

					// If there are any expedition members that aren't assigned to a route, show that .add-expedition-route-member-button 
					const nMembers = this.expeditionInfo.expedition_members.order.length;
					for (const el of $('#routes-accordion .card:not(.cloneable)') ) {
						const $card = $(el);
						$card.find( $('.add-expedition-route-member-button') ).ariaHide(
							$card.find('.route-member-list .data-list-item:not(.cloneable)').length === nMembers 
						)
					}

					hideLoadingIndicator('queryExpedition');

					// If any expedition members have been flagged, notify the user so they'll be prompted to look at the comments
					if (showOnLoadWarnings) {
						const $flaggedCheckboxes = $('.input-checkbox[name="flagged"]:checked');
						const nFlagged = $flaggedCheckboxes.length
						if (nFlagged) {
							const flaggedMemberListItems = $flaggedCheckboxes.map((_, el) => {
								const $el = $(el);
								//$el.closest('.card').find('.card-link').click();
								const dbID = $el.data('table-id');
								const info = this.expeditionInfo.expedition_members.data[dbID];
								return `<li>${info.last_name}, ${info.first_name}</li>`; //******* add reason for flagged
							}).get().join('')
							const message = `${nFlagged} ${nFlagged === 1 ? ' member of this expedition has' : ' members of this expedition have'}` +
								' been flagged. You might want to review the reason they were flagged. Flagged expedition member(s):\n' +
								`<ul>${flaggedMemberListItems}</ul>`
							showModal(message, 'Flagged expedition member(s)');
						}
					}
				}
			});
	}



	deleteListItem($listItem, tableName, tableID) {
		$listItem = $($listItem); // make sure it's a jQuery object

		if ($listItem.is('.new-list-item')) {
			$listItem.fadeRemove();
			return $.Deferred().resolve(true);
		}
		this.showLoadingIndicator('deleteListItem');
		var sql = `DELETE FROM ${tableName} WHERE id=${parseInt(tableID)} RETURNING id, '${tableName}' AS table_name`;
		return this.queryDB(sql)
			.always(() => {
				this.hideLoadingIndicator();
			}).then(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while deleting data from the database: ${queryResultString.trim()}.`, 'Unexpected error');
					return false;
				} else {
					const failedDeletes = [];
					for (const {id, tableName} of $.parseJSON(queryResultString)) {
						if (id == null) {
							failedDeletes.push(tableName);
						}
					}
					if (failedDeletes.length) {
						showModal(
							`There was a problem deleting objects from the table '${tableName}'.` +
								` Contact your database adminstrator to resolve this issue.<br><br>Attempted SQL:<br>${sql}`, 
							'Database Error');
						return false;
					} else {
						
						if (tableName === 'transactions') {
							const parentID = $listItem.data('parent-table-id');
							delete this.expeditionInfo[tableName][parentID].data[tableID];
						} 
						$listItem.fadeRemove();
						return true;
					}
				}
			}, (xhr, status, error) => {
				showModal(`An unexpected error occurred while deleting data from the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			})
	}


	/*
	Helper method to update the transaction balance in a transaction list footer
	*/
	getTransactionBalance($list) {
		const $transactionAmounts = $list.find('li:not(.cloneable) .transaction-amount-field');
		const transactionListEmpty = $transactionAmounts.length === 0;
		const sum = transactionListEmpty ? 0 :
			$transactionAmounts
				.map((_, el) => el.value === '' ? 0 : parseFloat(el.value))
				.get()
				.reduce((runningTotal, value) => runningTotal + value)
				.toFixed(2);
		if (!isNaN(sum)) $list.siblings('.data-list-footer').find('.total-col .total-span').text(sum);

		// Because this function is called every time transaction value changes,
		//	check to see if the fee icons in the card's header should be toggled
		// climber fee
		const $transactionTypes = $list.find('li:not(.cloneable) .transaction-type-field');
		var climbingFeeBalance = 0,
			entranceFeeBalance = 0;
		if (!transactionListEmpty) {
			for (const el of $transactionTypes) {
				const $valueField = $(el)
					.closest('.data-list-item')
						.find('.transaction-amount-field');
				const transactionValue = parseFloat($valueField.val() || 0)
				const transactionTypeCode = parseInt(el.value);
				if ([3, 10, 12, 14, 15, 23, 24].includes(transactionTypeCode)) { // climbing permit fee
					climbingFeeBalance += transactionValue;
				} else if ([11, 25, 8, 26].includes(transactionTypeCode)) {
					entranceFeeBalance += transactionValue;
				}
			}
		}
		
		// If the transaction list is empty, hide both icons. Otherwise, check the balance
		const $cardHeader = $list.closest('.card').find('.card-header');
		$cardHeader.find('.climber-fee-icon').ariaTransparent(transactionListEmpty || climbingFeeBalance > 0);
		$cardHeader.find('.entrance-fee-icon').ariaTransparent(transactionListEmpty || entranceFeeBalance > 0);

	}


	/*

	*/
	deleteTransactionItem($listItem) {
		$listItem = $($listItem);//make sure it's a jQuery object
		
		// Get a reference to the transaction list now because once the list item 
		//	is removed from the DOM, the list can't be located using it
		const $transactionsList = $listItem.closest('.data-list');

		const dbID = $listItem.data('table-id');
		// If the delete succeeds, update the transaction balance 
		this.deleteListItem($listItem, 'transactions', dbID)
			.then(success => {
				// Wait a half second because .fadeRemove() takes that 
				//	long to actually remove the item from the DOM
				setTimeout(
					() => {this.getTransactionBalance($transactionsList)},
					550
				)
			})
	}


	onDeleteTransactionButtonClick(e) {
		const $li = $(e.target).closest('.data-list-item');
		// If this is a newly added transaction, just delete it
		if ($li.is('.new-list-item')) {
			this.deleteTransactionItem($li);
		} else {
			const transactionType = $li.find('.input-field[name=transaction_type_code]')[0].selectedOptions[0].text;
			const transactionValue = $li.find('.input-field[name=transaction_value]').val();
			const chargeType = transactionValue < 0 ? 'credit' : 'charge'
			const message = `Are you sure you want to delete this <strong>${transactionType}</strong>` + 
				` ${chargeType} of <strong>$${Math.abs(transactionValue)}</strong>? Clicking 'OK' will` +
				' permanently delete this transaction record, which cannot be undone.';
			const footerButtons = `
				<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
				<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.deleteTransactionItem('#${$li.attr('id')}')">OK</button>
			`
			showModal(message, 'Permanently Delete Transaction?', 'confirm', footerButtons);
		}
	}


	getCMCInfo() {
		const sql = `
			SELECT DISTINCT cmc_inventory.* FROM cmc_inventory 
			LEFT JOIN cmc_checkout ON cmc_inventory.id=cmc_id 
			WHERE return_date IS NOT NULL 
			ORDER BY cmc_inventory.id
		;`
		const $select = $('#input-cmc_id') // this is the select from the .cloneable <li>
			.append(`<option class="" value="">CMC #</option>`); 
		return this.queryDB(sql)
			.done(queryResultString => {
				for (const row of $.parseJSON(queryResultString)) {
					this.cmcInfo.cmcCanIDs[row.id] = row.cmc_can_identifier;
					this.cmcInfo.rfidTags[row.rfid_taf_id] = row.id;
					$select.append(`<option class="" value="${row.id}">${row.cmc_can_identifier}</option>`);
				}
			})
			.fail((xhr, status, error) => {
				console.log(`getCMCInfo() failed with status ${status} because ${error}`)
			});
	}
	
	/*
	Insert a CMC select option in the correct sequential order
	*/
	insertCMCOption(cmcID, cmcCanIdentifier, {$cmcSelects=$('.input-field[name=cmc_id]')}={}) {
		// Loop through each select missing the option and determine where it should be 
		//	inserted to be in sequential order for the user
		const $missingCMC = $cmcSelects.not($cmcSelects.has(`option[value=${cmcID}]`));
		for (const el of $missingCMC) {
			const $options = $(el).find('option');
			const identifierOrder = $options.map((i, el) => parseInt(el.innerHTML)).get();//innerHTML is the can identifier
			cmcCanIdentifier = parseInt(cmcCanIdentifier);//for correct sorting all have to be ints
			identifierOrder.push(cmcCanIdentifier);
			// Get the index of the new identifier once it's been inserted
			const index = identifierOrder.sort((a, b) => (a > b) - (b > a)).indexOf(cmcCanIdentifier);
			// Select the option at that index. Because the null option is always first, in the select's 
			//	options the index will refer to the option just before this element should be added
			$(`<option class="" value="${cmcID}">${cmcCanIdentifier}</option>`)
				.insertBefore($options.eq(index));
		}
	}

	/*
	Remove a CMC select option from all CMC selects except any whose values are set
	*/
	removeCMCOption(cmcID, {$cmcSelects=$('.input-field[name=cmc_id]')}={}) {
		let $select;
		for (const el of $cmcSelects) {
			if (parseInt(el.value) === parseInt(cmcID)) {
				$select = $(el);
				break;
			}
		}
		// Remove the option from all selects whose value !== id
		$cmcSelects.not($select).find(`option[value=${cmcID}]`).remove();
	}

	updateCommsDeviceOwnerOptions() {
		// Record the current values because removing the old options will make the value null
		const $selects = $(`#comms-list .input-field[name=expedition_member_id]`);
		const values = Object.fromEntries($selects.map((_, el) => [[el.id, el.value]] ));
		
		// Build new options
		var options = '<option value="">Device owner</option>';
		for (const card of $('#expedition-members-accordion .card:not(.cloneable)')) {
			const $card = $(card);
			const expeditionMemberID = $card.data('table-id');
			const climberName = $card.find('.expedition-member-card-link-label').text();
			options += `<option value=${expeditionMemberID}>${climberName}</option>`;
		}
		// Remove old options and add the new ones
		$selects.empty();
		$selects.append(options);

		// reset original values
		for (const selectID in values) {
			$(selectID).val(values[selectID]);
			// check if value is blank and assign default value

		}

	}

	init() {
		// Call super.init()
		this.showLoadingIndicator('init');
		var initDeferreds = super.init();

		// Do additional synchronous initialization stuff
		this.configureMainContent();

		// Get route codes first if they haven't been queried yet.
		const lookupDeferreds = [this.getCMCInfo()];
		if (Object.keys(this.routeCodes).length === 0) {
			lookupDeferreds.push(
				this.queryDB('SELECT * FROM route_codes WHERE sort_order IS NOT NULL')
					.done(queryResultString => {
						const $select = $('.route-code-header-input:not(.mountain-code-header-input)');
						if (!this.queryReturnedError(queryResultString)) {
							for (const route of $.parseJSON(queryResultString)) {
								this.routeCodes[route.code] = {...route};
								$select.append($(`<option value="${route.code}">${route.name}</option>`));
							}
						}
					})
			)
		} 
		lookupDeferreds.push(
			this.queryDB('SELECT * FROM mountain_codes')
				.done(queryResultString => {
					for (const row of $.parseJSON(queryResultString)) {
						this.mountainCodes[row.code] = {...row};
					}
				})
		);
		lookupDeferreds.push(
			this.queryDB('SELECT code, default_fee, is_credit, is_payment FROM transaction_type_codes')
				.done(queryResultString => {
					if (!this.queryReturnedError(queryResultString)) {
						for (const row of $.parseJSON(queryResultString)) {
							this.defaultTransactionFees[row.code] = {
								default_fee: row.default_fee,
								is_credit: row.is_credit,
								is_payment: row.is_payment
							};
						}
					}
				})
		);

		$.when(
			this.fillAllSelectOptions(), 
			initDeferreds, 
			...lookupDeferreds
		).then(() => {
			if (window.location.search.length) {
				const params = this.parseURLQueryString();
				if ('id' in params) {
					this.queryExpedition(params.id).done(() => {
						// add to history buffer for keeping track of browser nav via back/forward buttons
						this.historyBuffer.push(params.id);
					});
					window.history.replaceState({id: params.id, historyIndex: 0}, '', window.location.href);
					$('#expedition-search-bar').data('current-value', params.id);
				}
			} else {

			}
			$('.select2-no-tag').select2({
				width: '100%'
			});
		}).always(() => {
			hideLoadingIndicator()
		});

		return initDeferreds;
	}
}