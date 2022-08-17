
class ClimberDBExpeditions extends ClimberDB {
	
	constructor() {
		super();
		this.expeditionInfo = {
			expeditions: {}, // each field is a property
			expedition_members: {data: {}, order: []}, 
			expedition_member_routes: {data: {}, order: []},
			transactions: {}, // props are exp. member IDs
			cmc_checkout: {data: {}, order: []}
		}
		this.routeCodes = {};
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
			<div class="main-content-header">
				<div class="fuzzy-search-bar-container">
					<select id="expedition-search-bar" class="fuzzy-search-bar no-option-fill default" placeholder="Search climbers" title="Expedition search bar">
						<option value="">Click to select an expedition</option>
					</select>
					<img class="search-bar-icon" src="imgs/search_icon_50px.svg">
					<button class="show-query-options-button icon-button">
						<img class="show-search-options-icon" src="imgs/search_options_icon_100px.svg">
					</button>
					<div class="search-option-drawer collapse">
						<div class="search-option-drawer-content">
							<div class="query-option-container col-4">
								<div class="query-option-condition-header">
									<label class="query-option-label" for="query-option-expedition_name">Expedition name</label>
								</div>
								<div class="query-option-condition-container">
									<select class="query-option-operator string-match-query-option text-string-query-option" value="equals">
										<option value="equals">equals</option>
										<option value="startsWith">starts with</option>
										<option value="endsWith">ends with</option>
										<option value="contains">contains</option>
									</select>
									<input id="query-option-expedition_name" class="query-option-input-field string-match-query-option" type="text" data-field-name="expedition_name">
								</div>
							</div>

							<div class="query-option-container col-4">
								<div class="query-option-condition-header">
									<label class="query-option-label" for="query-option-group_status">Group status</label>
								</div>
								<div class="query-option-condition-container checkbox-option-group">
									<select id="query-option-group_status" class="input-field query-option-input-field select2-no-tag" multiple="multiple" data-field-name="group_status_code" data-lookup-table="group_status_codes">
									</select>
								</div>
							</div>

							<div class="w-100"></div>

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
					<button id="edit-expedition-button" class="expedition-edit-button icon-button hidden" type="button" aria-label="Edit expedition" title="Edit expediton">
						<i class="fas fa-2x fa-edit"></i>
					</button>
					<button id="open-reports-modal-button" class="expedition-edit-button icon-button" type="button" aria-label="Open exports menu" title="Open exports menu">
						<i class="fas fa-2x fa-file-export"></i>
					</button>
				</div>
				<button id="add-new-expedition-button" class="generic-button">new expedition</button>
			</div>
			<div class="expedition-content uneditable">
				<!-- expedition info --> 
				<div id="expedition-data-container" class="expedition-data-wrapper col-md-6">
					<div class="expedition-data-content">
						<div class="expedition-data-header-container">
							<div class="expedition-data-header-content">	
								<input id="input-expedition_name" class="input-field expedition-data-header" placeholder="New Expedition Name" name="expedition_name" data-table-name="expeditons" title="Expedition name" autocomplete="off">
								<select id="input-group_status" class="input-field" name="group_status_code" data-table-name="expeditons" title="Group status" autocomplete="off" data-default-value=1></select>
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
					<div id="expedition-member-data-container" class="expedition-data-content">
						<div class="expedition-data-header-container">
							<h3 id="expedition-data-header" class="expedition-data-header">Expedition members</h3>
							<button id="show-modal-climber-form-button" class="generic-button add-data-button" data-target="#expedition-members-accordion">Add member</button>
						</div>
						<div class="expedition-data-content-body">
							<div id="expedition-members-accordion" class="accordion" data-table-name="expedition_members" data-item-display-name="expedition member">
								<div id="cloneable-card-expedition-members" class="card expedition-card cloneable hidden">
									<div class="card-header" id="cardHeader-expedition-members-cloneable">
										<a class="card-link collapsed col-4 pl-0" data-toggle="collapse" href="#collapse-expedition-members-cloneable" data-target="collapse-expedition-members-cloneable">
											<div class="card-link-content">
												<h6 class="card-link-label expedition-member-card-link-label"></h6>
											</div>
										</a>
										<div class="card-header-content-container card-header-field-container leader-checkbox-container transparent col">
											<label class="checkmark-container">
												<input id="input-is_trip_leader" class="input-field input-checkbox" type="checkbox" name="is_trip_leader" data-table-name="expedition_members" title="Is trip leader?">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label class="field-label checkbox-label" for="input-is_trip_leader">Leader</label>
										</div>
										<div class="card-header-content-container card-header-field-container col">
											<label class="checkmark-container">
												<input id="input-application_complete" class="input-field input-checkbox" type="checkbox" name="application_complete" data-table-name="expedition_members" title="Permit application complete?">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label class="field-label checkbox-label" for="input-application_complete">SUP</label>
										</div>
										<div class="card-header-content-container card-header-field-container col">
											<label class="checkmark-container">
												<input id="input-psar_complete" class="input-field input-checkbox" type="checkbox" name="psar_complete" data-table-name="expedition_members" title="PSAR form complete?">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label class="field-label checkbox-label" for="input-psar_complete">PSAR</label>
										</div>
										<div class="card-header-content-container member-card-header-chevron-container">
											<button class="delete-card-button icon-button">
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
															<input id="input-datetime_cancelled" class="input-field" name="datetime_cancelled" data-table-name="expedition_members" placeholder="Date cancelled" title="Date cancelled" type="date" data-dependent-target="#input-reservation_status" data-dependent-value="6" autocomplete="off">
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
														<button class="generic-button add-data-button add-transaction-button" role="button" type="button">Add transaction</button>
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
																	<select id="input-transaction_type" class="input-field transaction-type-field" name="transaction_type_code" data-table-name="transactions" title="Transaction type"></select>
																</div>
																<div class="col-3">
																	<span class="unit-symbol">$</span>
																	<input id="input-transaction_value" class="input-field field-with-units transaction-amount-field" name="transaction_value" data-table-name="transactions" title="Transaction value"> 
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
										<select id="mountain-code-header-input" class="input-field card-link-label route-code-header-input mountain-code-header-input expedition-member-card-link-label" name="mountain_code">
											<option value="">Select mountain</option>
										</select>
										<select id="route-code-header-input" class="input-field card-link-label route-code-header-input expedition-member-card-link-label" name="route_code">
											<option value="">Select route</option>
										</select>
										<a class="card-link" data-toggle="collapse" href="#collapse-routes-cloneable" data-target="collapse-routes-cloneable">
											<div class="card-link-content">
												<!--<h6 class="card-link-label expedition-member-card-link-label"></h6>-->
											</div>
											<div class="card-link-content">
												<button class="delete-card-button icon-button">
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
												<label class="data-list-col data-list-header-label col-3 text-center">Summited?</label>
												<label class="data-list-col data-list-header-label col-4">Summit date</label>
												<label class="data-list-col data-list-header-label col-1"></label>
											</div>
											<ul id="route-member-list" class="data-list route-member-list">
												<li class="data-list-item cloneable hidden">
													<!-- route_code and route_order inputs are hidden because the select in the .card-header controls the value for all of them-->
													<input id="input-route_code" class="input-field hidden" type="number" name="route_code" data-table-name="expedition_member_routes">
													<input id="input-route_order" class="input-field hidden" type="number" name="route_order" data-table-name="expedition_member_routes">
													<div class="col-5">
														<label class="data-list-header-label name-label"></label>
													</div>
													<div class="col-2 center-checkbox-col">
														<label class="checkmark-container">
															<input id="input-route_summited" class="input-field input-checkbox route-summited-checkbox" type="checkbox" name="route_was_summited" data-table-name="expedition_member_routes" title="Route summitted?">
															<span class="checkmark data-input-checkmark"></span>
														</label>
													</div>
													<div class="col-4">
														<div class="field-container collapse">
															<input id="input-summit_date" class="input-field" name="summit_date" type="date" data-table-name="expedition_member_routes" title="Summit date"  data-dependent-target="#input-route_summited" data-dependent-value="true"> 
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
													<button class="text-only-button route-list-footer-button add-expedition-route-member-button w-100 text-left px-0 mx-0 hidden" aria-hidden="True">Add expedition member</button>
												</div>
												<div class="data-list-col data-list-header-label center-checkbox-col col-3">
													<button class="text-only-button route-list-footer-button check-all-summitted-button w-100">check all</button>
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
					</div>
				</div>
			</div>
		`);
		
		$('.show-query-options-button').on('click', e => {
			$('.search-option-drawer').collapse('toggle');
		});

		$('#edit-expedition-button').click(e => {
			this.toggleEditing();
		});

		$('#save-expedition-button').click(e => {
			showLoadingIndicator('saveEdits');
			this.saveEdits();
		});

		$('#open-reports-modal-button').click(e => {
			$('#exports-modal').modal();
		});

		$('#create-pdf-button').click(e => {
			// Check if there are unsaved edits
			if ($('.input-field.dirty:not(#input-export_type)').length) {
				// ask user to save edits

			}

			this.makePDF();

		})

		$(document).on('change', '.input-field:not(.route-code-header-input)', e => {
			this.onInputChange(e);
		});

		$('#add-new-expedition-button').click(e => {
			this.clearExpeditionInfo();
			$('#expedition-entered-by-result-summary-item .result-details-summary-value')
				.text(this.userInfo.ad_username);
			$('#expedition-entry-time-result-summary-item .result-details-summary-value')
				.text((new Date()).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}));	
			$('#expedition-search-bar')
				.prepend('<option value="">Select an expedition to view</option>')
				.val('')
				.addClass('default');
			$('#show-modal-climber-form-button').closest('.collapse').collapse('show');
			$('#input-expedition_name').focus();

			// Show edit toggle button
			$('#edit-expedition-button').ariaHide(false);
			this.toggleEditing(true);
		});

		$('.accordion .card-collapse').on('shown.bs.collapse', e => {
			const $collapse = $(e.target);
			const $contentBody = $collapse.closest('.expedition-data-content-body');
			const contentBodyElement = $contentBody[0]
			if (contentBodyElement.scrollHeight > contentBodyElement.clientHeight) {
				const $cardHeader = $collapse.closest('.card').find('.card-header');
				const scrollToPosition = $contentBody.scrollTop() + $cardHeader.offset().top - $contentBody.offset().top - $cardHeader.height();
				if (scrollToPosition > 0) contentBodyElement.scrollTo(0, scrollToPosition);
			}
		});

		// When the user clicks the back or forward browser nav buttons, check to see if there's a state entry with an ID associated. If so, load that expedition
		window.onpopstate = (e) => {
			const state = e.state;
			if (state) {
				if (state.id) {
					// ask user to confirm/discard edits if there are any
					if ($('.input-field.dirty').length) {
						this.confirmSaveEdits({
							afterActionCallbackStr: `
								climberDB.loadExpedition(${state.id});
								climberDB.currentHistoryIndex = ${state.historyIndex};
							`,
							afterCancelCallbackStr: `
								const currentExpeditionID = $('#expedition-search-bar').val();
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


		$(document).on('click', '.delete-card-button', (e) => {
			const $card = $(e.target).closest('.card');
			if ($card.is('.new-card')) {
				const climberID = $card.data('climber-id');
				$(`#routes-accordion .route-member-list .data-list-item[data-climber-id="${climberID}"`).remove();
				$card.remove();
			} else {
				// confirm delete
				const $accordion = $card.closest('.accordion');
				const displayName = $accordion.data('item-display-name');
				const tableName = $accordion.data('table-name');
				const dbID = $card.data('table-id');
				var deleteDataStr ='';

				if  (tableName === 'expedition_members') { 
					deleteDataStr = `
						const $card = $('#${$card.attr('id')}');
						delete climberDB.expeditionInfo.expedition_members.data[${dbID}];
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
					`;
				} else if (tableName === 'expedition_member_routes') {
					deleteDataStr = `
						const routeCode = $('#${$card.attr('id')}').find('.route-code-header-input:not(.mountain-code-header-input').val();
						const routeDeleted = delete climberDB.expeditionInfo.expedition_member_routes.data[routeCode];
						if (routeDeleted) climberDB.expeditionInfo.expedition_member_routes.order = climberDB.expeditionInfo.expedition_member_routes.order.filter(code => code != routeCode);
					`;
				}

				const onConfirmClick = `
					climberDB.queryDB('DELETE FROM ${tableName} WHERE id=${dbID}')
						.done(() => {
							${deleteDataStr}
							$('#${$card.attr('id')}').remove();
						})
						.fail((xhr, status, error) => {
							console.log('delete failed because ' + error)
						})`;
				const message = 
					`Are you sure you want to delete this ${displayName}` +
					` and all related data (e.g., transactions)? This action` +
					` is permanent and cannot be undone.`;
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
					<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">OK</button>
				`;
				showModal(message, `Delete ${displayName}?`, 'confirm', footerButtons);
			}
		})

		// ------------ Query stuff -------------------
		// Set the default expedition query to only show this year's expeditions
		const defaultDepartureQueryDate = new Date((new Date()).getFullYear() - 1, 0, 1);//new Date((new Date()).getFullYear(), 0, 1);
		$('#query-option-planned_departure')
			.val(getFormattedTimestamp(defaultDepartureQueryDate))
			.siblings('.query-option-operator')
				.val('>=');

		$('.query-option-input-field, .query-option-operator').change(e => {
			this.fillExpeditionSearchSelect();
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

		$('#expedition-search-bar').change(e => {
			// If there are any unsaved edits, ask the user to save or discard them
			if ($('.input-field.dirty').length) {
				this.confirmSaveEdits({
					afterActionCallbackStr: `climberDB.onExpeditionSearchBarChange({target: $('#${e.target.id}')})`,
					afterCancelCallbackStr: `$('#${e.target.id}').val($('#${e.target.id}').data('current-value'))`
				});
			} else {
				this.onExpeditionSearchBarChange(e);
			}
		});

		// Fill with this year's expeditions to start
		this.fillExpeditionSearchSelect();
		// ^^^^^^^^^ Query stuff ^^^^^^^^^^^^^^^^

		// ---------- Members/transactions ----------
		//$('select.input-field').change(e => {this.onSelectChange(e)})
		$(document).on('click', '.add-transaction-button', e => {
			const $newItem = this.addNewListItem($(e.target).closest('.transactions-tab-pane').find('.data-list'), {newItemClass: 'new-list-item'})
			$newItem.find('.input-field[name="transaction_type_code"]').change();
		});

		// When the leader input checkbox changes, set the transparent class appropriately
		$(document).on('change', '.leader-checkbox-container .input-checkbox', e => {
			const $checkbox = $(e.target).closest('.input-checkbox');
			const isChecked = $checkbox.prop('checked');

			// If this checkbox was checked and it's now unchecked, tell the user they can't do that
			if ($('#expedition-members-accordion .card:not(.cloneable) .input-checkbox[name=is_trip_leader]:checked').length === 0) {	
				$checkbox.prop('checked', true);
				const message =
					'One expedition member must be selected as the leader. To change the leader' +
					' for the expedition, hover over the member you want to designate as the leader' +
					' and check the leader box that appears. The currently selected leader checkbox' +
					' will automatically be unchecked.';
				showModal(message, 'Invalid operation', 'alert');
				return;
			}

			// If this chekcbox is being checked, hide all others
			if (isChecked) {
				$(`.leader-checkbox-container .input-checkbox:not(#${$checkbox.attr('id')})`)
					.prop('checked', false)
					.change()
					.closest('.leader-checkbox-container').addClass('transparent');
			}
			$checkbox.closest('.leader-checkbox-container').toggleClass('transparent', !isChecked);
		})

		// Set the cancelled time when the reservation status is set to cancelled
		// also check all other reservation status fields to see if the whole group is ready
		$(document).on('change', '.reservation-status-field', e => {
			const $select = $(e.target);
			const value = $select.val();
			const cardID = $select.attr('id').match(/-\d+$/).toString();
			const now = getFormattedTimestamp();
			// 6 === cancelled
			$(`#input-datetime_cancelled${cardID}`).val(value == 6 ? now : null).change();

			const reservationStatuses = $select.closest('.accordion').find('.card:not(.cloneable) .reservation-status-field')
				.map((_, el) => el.value)
				.get();
			const firstStatus = reservationStatuses[0];
			const $groupStatusSelect = $('#input-group_status');

			if (reservationStatuses.every(v => v == firstStatus || v == 6) && $groupStatusSelect.val() != firstStatus) { 
				$groupStatusSelect.val(firstStatus).change();
			}
		});

		// When a transaction type field changes and amount is not already set, fill the amount with the defuault value
		$(document).on('change', '.transaction-type-field', e => {
			const $select = $(e.target);
			const $valueField = $select.closest('li').find('.transaction-amount-field');
			const defaultAmount = this.defaultTransactionFees[$select.val()].default_fee;
			if ($valueField.val() === '' || $valueField.val() === null && defaultAmount !== null) {
				$valueField
					.val(defaultAmount.replace(/\(/, '-').replace(/[$)]/g, ''))
					.change();
			}
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

			// Get balance
			const sum = $list.find('li:not(.cloneable) .transaction-amount-field')
				.map((_, el) => el.value === '' ? 0 : parseFloat(el.value))
				.get()
				.reduce((runningTotal, value) => runningTotal + value)
				.toFixed(2);
			if (!isNaN(sum)) $list.siblings('.data-list-footer').find('.total-col .total-span').text(sum);
		});
		// ^^^^^^^^^^ Members/transactions ^^^^^^^^^^^

		// ---------- Route stuff ----------

		// When new route card is added, make sure it has all of the (not canceled) expedition members
		$('#routes-data-container .add-card-button').click(e => {
			const $newCard = this.addNewCard($($(e.target).data('target')), {accordionName: 'routes', newCardClass: 'new-card'});
			
			// Use the UI to rather than in-memory data to add all active expedition members because
			//	a new card would be in the in-memory data
			const $list = $newCard.find('.route-member-list');
			for (const el of $('#expedition-members-accordion > .card:not(.cloneable)')) {
				const $memberCard = $(el);
				// if this expedition member isn't canceled, add a new row
				if ($memberCard.find('.input-field[name="reservation_status_code"]').val() != 6) {
					const $listItem = this.addNewListItem($list);
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
				const mountainRoutes = Object.values(this.routeCodes).filter(r => r.mountain_code == mountainCode);
				for (const route of mountainRoutes) {
					$routeHeaderSelect.append($(`<option value="${route.code}">${route.name}</option>`))
				}
				// Just set to the first one
				$routeHeaderSelect.val(mountainRoutes[0].code).change();
			} else {
				// Set the hidden route code inputs in the card (which are the actual inputs tied to DB values)
				const routeCode = $target.val();
				for (const el of $target.closest('.card').find('.input-field:not(.route-code-header-input)[name="route_code"]')) {
					$(el).val(routeCode).change();
				}
			}
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
			const $checkboxes = $card.find('.data-list-item:not(.cloneable) .center-checkbox-col .input-checkbox');
			const cardID = $card.attr('id');
			const checkboxIDs = '#' + $checkboxes.map((_, el) => el.id).get().join(',#');
			const summitDateInputIDs = '#' + $checkboxes.closest('.center-checkbox-col').next().find('.input-field').map((_, el) => el.id).get().join(',#');
			const allChecked = $checkboxes.filter(':checked').length == $checkboxes.length;
			const expeditionName = this.expeditionInfo.expeditions.expedition_name;//$('#input-expedition_name').val();
			const routeName = this.routeCodes[this.expeditionInfo.expedition_member_routes.order[$card.index() - 1]].name;
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


		// ask user to confirm removing CMC only if it already exists in the DB
		$(document).on('click', '.delete-route-member-button', e => {
			const $li = $(e.target).closest('li');
			if ($li.is('.new-list-item')) {
				$li.fadeOut(500, () => {$li.remove()});
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
				const routeName = this.routeCodes[$li.find('.input-field[name="route_code"]').val()].name;
				showModal(`Are you sure you want to remove <strong>${memberName}</strong> from the <strong>${routeName}</strong> route?`, 'Remove expedition member from this route?', 'alert', footerButtons);
			}
		})
		// ^^^^^^^^^^ Route stuff ^^^^^^^^^

		// ------------ CMCs -------------------
		$('.add-cmc-button').click(e => {
			// ************* chek if the cmc is already checked out to another group ******************
			const $button = $(e.target);
			const $ul = $($button.data('target'));
			const $listItem = this.addNewListItem($ul, {newItemClass: 'new-list-item', parentDBID: $('#input-planned_departure_date').data('table-id')});
			const $checkoutDate = $listItem.find('.input-field[name="checkout_date"]');//.filter((_, el) => el.name === 'checkout_date');
			$checkoutDate.val(getFormattedTimestamp())
				.change();
		});

		// ask user to confirm removing CMC only if it already exists in the DB
		$(document).on('click', '.delete-cmc-button', e => {
			const $li = $(e.target).closest('li');
			if ($li.is('.new-list-item')) {
				$li.fadeOut(500, () => {$li.remove()});
			} else {
				const $cmcSelect = $li.find('select');
				const dbID = $cmcSelect.data('table-id');
				const tableName = $cmcSelect.data('table-name');
				const cmcID = $cmcSelect.val();
				const onConfirmClick = `climberDB.deleteListItem($('#${$li.attr('id')}'), '${tableName}', ${dbID})`
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
					<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">OK</button>
				`;
				showModal(`Are you sure you want to delete this checkout record for CMC ${cmcID}?`, 'Delete CMC?', 'alert', footerButtons);
			}
		})
		// ^^^^^^^^^^^ CMCs ^^^^^^^^^^^^^^^


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
		})

		// query climbers to fill select
		$('#modal-climber-search-bar').keyup(() => {
			const $input = $('#modal-climber-search-bar');
			const searchString = $input.val();
			
			if (searchString.length >= 3) {
				$('#modal-climber-select').closest('.collapse').collapse('show');
				this.fillClimberFormSelectOptions(searchString);
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

			this.queryDB(`SELECT * FROM climber_info_view WHERE id=${parseInt(climberID)}`)
				.done(queryResultString => {
					const result = $.parseJSON(queryResultString);
					if (this.queryReturnedError(queryResultString)) {
						showModal(`An error occurred while retreiving climbering info: ${queryResultString}. Make sure you're connected to the NPS network and try again.`, 'Database Error');
					} else {
						if (result.length) {
							this.climberForm.fillClimberForm(climberID, result[0]);	
						} else {
							console.log('No climber found with ID ' + ClimberID);
						}
					}
				})
				
		});

		$('#modal-save-to-expedition-button').click(e => {
			const currentClimberIDs = Object.values(climberDB.expeditionInfo.expedition_members.data)
				.map(member => member.climber_id);
			const selectedClimberID = $('#modal-climber-select').val();
			const climberID = Object.keys(this.climberForm.selectedClimberInfo.climbers)[0];
			const climberInfo = this.climberForm.selectedClimberInfo.climbers[climberID];
			if (currentClimberIDs.includes(selectedClimberID)) {
				showModal(`${climberInfo.first_name} ${climberInfo.last_name} is already a member of the expedition '${this.expeditionInfo.expeditions.expedition_name}'`, 'Climber is already a member');
				return;
			}
			const $memberCard = this.addExpeditionMemberCard(
				{
					firstName: climberInfo.first_name, 
					lastName: climberInfo.last_name, 
					climberID: climberID,
					showCard: true,
					isNewCard: true
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
		const $input = $(e.target).addClass('dirty');
		$('#save-expedition-button').ariaHide(false);
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
			if (!allowEdits && $('.input-field.dirty').length) {
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
		const $select = $('#expedition-search-bar');
		$select.removeClass('default');
		$('.search-option-drawer').removeClass('show');
		this.queryExpedition(expeditionID);
		$('#show-modal-climber-form-button').closest('.collapse').collapse('show');
		this.toggleEditing(false);//make sure editting is turned off
	}


	onExpeditionSearchBarChange(e) {
		const $select = $(e.target);
		const expeditionID = $select.val();
		if (expeditionID != '') {
			this.loadExpedition(expeditionID);
			// Update URL with new expedition ID and add a history entry so the back 
			//	and forward buttons will move to and from expeditions
			const url = new URL(window.location);
			url.searchParams.set('id', expeditionID);
			const previouslySelectedID = $select.data('current-value');
			// Push the new entry here because loadExpedition() is also called when the user clicks the back or forward button, and adding a history entry then will muck up the history sequence 
			this.historyBuffer.push(expeditionID);
			window.history.pushState({id: expeditionID, historyIndex: this.currentHistoryIndex + 1}, '', url);
		} else {
			$select.addClass('default');
		}
		$select.data('current-value', expeditionID);
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
			$card.find('.route-member-list .data-list-item:not(.cloneable)').length === nMembers 
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
					const foriegnID = foreignIDs[foreignTable];
					if (foriegnID) {
						parameters.push(foriegnID);
					// if it doesn't, the ID value will have to be retrieved with a currval clause. This will only
					//	work if the parent and child records are inserted in the proper order
					} else {
						// insert a value to get what will be the foreign table ID 
						currvalClauseString += `, currval(pg_get_serial_sequence('${foreignTable}', 'id'))`;
						currvalCount ++;
					} 
					// The foriegn column will have to be returned for INSERTs so the in-memory data (expeditionInfo) can be updated
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
						foreignIDs: {expedition_members: $(li).data('parent-table-id')},
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
		
		// update query now returns null and causes an error
		

		return $.ajax({ 
			url: 'climberdb.php',
			method: 'POST',
			data: {action: 'paramQuery', queryString: sqlStatements, params: sqlParameters},
			cache: false
		}).done(queryResultString => {
			//****** error catching helper no longer works for some reason
			if (climberDB.queryReturnedError(queryResultString)) { 
				showModal(`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
				// roll back in-memory data
				for (const dbID in updates.climbers) {
					for (const fieldName in updates.climbers[dbID]) {
						climberInfo[fieldName] = originalDataValues[dbID][fieldName];
					}
				}
				return;
			} else {
				const result = $.parseJSON(queryResultString)
					.filter(row => row != null);
				for (const i in result) {
					const returnedIDs = result[i];
					const id = returnedIDs.id;
					if (id == null || id === '') continue;

					// Set the card's/list item's class and inputs' attributes so changes will register as updates
					const {container, tableName} = inserts[i];
					const $inputs = $(container).closest('.data-list-item, .card')
						.removeClass('new-card')
						.removeClass('new-list-item')
						.attr('data-table-id', id)
						.attr('data-table-name', tableName)
						.find('.input-field.dirty')
							.data('table-name', tableName)
							.data('table-id', id);
					const foreignIDs = Object.entries(returnedIDs).filter(([column, _]) => column !== 'id');
					if (Object.keys(foreignIDs).length) $inputs.data('foriegn-ids', Object.fromEntries(foreignIDs));
					
				}


				// update in-memory data for each edited input
				const edits = this.edits;
				const expeditionInfo = this.expeditionInfo;
				const $editedInputs =  $('.input-field.dirty').removeClass('dirty');
				for (const el of $editedInputs) {
					const $input = $(el);
					const fieldName = $input.attr('name');
					const value = this.getInputFieldValue($input);
					const dbID = $input.data('table-id');
					const tableName = $input.data('table-name');
					if (tableName === 'expeditions') {
						expeditionInfo.expeditions[fieldName] = value;
					} else if (tableName === 'transactions') {
						const expeditionMemberID = $input.closest('.card').data('table-id');
						let memmberTransactions = expeditionInfo.transactions[expeditionMemberID]
						if (!memmberTransactions) { // new member was added
							const transactionOrder = $input.closest('.data-list')
								.find('.data-list-item:not(.cloneable)')
									.map((_, el) => $(el).data('table-id'))
									.get();
							expeditionInfo.transactions[expeditionMemberID] = {data: {}, order: transactionOrder};
							memmberTransactions = expeditionInfo.transactions[expeditionMemberID];
						}
						if (!memmberTransactions.data[dbID]) memmberTransactions.data[dbID] = {};
						expeditionInfo.transactions[expeditionMemberID].data[dbID][fieldName] = value;
					} else if (tableName === 'expedition_member_routes') {
						// expedition member routes are organized by {data: {route_code: {expedition_memmber_id: {}}}, order: []}
						//	order is route order and expedition members in route card are organized on the fly with expedition_members.order

						const $listItem = $input.closest('.data-list-item');
						const routeCode = $listItem.find('.input-field[name=route_code]').val();
						let routeMembers = expeditionInfo.expedition_member_routes.data[routeCode];
						if (!routeMembers) { // a new route was added
							// add all expedition members
							expeditionInfo.expedition_member_routes.data[routeCode] = Object.fromEntries(
								$('#expedition-members-accordion .card').get().map(el => [$(el).data('table-id'), {}])
							)
							routeMembers = expeditionInfo.expedition_member_routes.data[routeCode];
						}
						const memberID = $input.data('foriegn-ids').expedition_member_id;

						if (!routeMembers[memberID]) routeMembers[memberID] = {};
						routeMembers[memberID][fieldName] = value;

						// necessary for linking in-memory data to the list item later on (e.g., in discardEdits())
						if (!$listItem.data('expedition-member-id')) $listItem.data('expedition-member-id', memberID);
					} else { // expedition_members, or cmc_checkout
						const $parent = $input.closest('#expedition-members-accordion').length ? 
							$input.closest('.card') :
							$input.closest('.data-list-item');
						const dbID = $parent.data('table-id');
						if (!(dbID in expeditionInfo[tableName].data)) {
							expeditionInfo[tableName].data[dbID] = {};
							// this will overwrite the .order that already exists, but that's OK
							expeditionInfo[tableName].order = $parent.siblings()
								.not('.cloneable')
								.add($parent)
								.map((_, el) => $(el).data('table-id'))
						}
						let thisData = expeditionInfo[tableName].data[dbID];
						thisData[fieldName] = value;
					}
				}

				// Hide the save button again since there aren't any edits
				$('#save-expedition-button').ariaHide(true);
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
		$('.new-card, .new-list-item').remove();

		//expeditions
		for (const el of $('#expedition-members-accordion .card:not(.cloneable) .input-field.dirty')) {
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
		const $transactionInputs = $('#expedition-members-accordion .card:not(.cloneable) .transactions-tab-pane .data-list > li.data-list-item:not(.cloneable) .input-field.dirty');
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
	}


	/*
	Ask the user to confirm/discard edits
	*/
	confirmSaveEdits({afterActionCallbackStr='', afterCancelCallbackStr=''}={}) {
		//@param afterActionCallbackStr: string of code to be appended to html onclick attribute

		const onConfirmClick = `
			showLoadingIndicator();
			climberDB.saveEdits(); 
		`;
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal" onclick="${afterCancelCallbackStr}">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.discardEdits();${afterActionCallbackStr}">Discard</button>
			<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}${afterActionCallbackStr}">Save</button>
		`;

		showModal(
			`You have unsaved edits to this expedition. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this climber's info.`,
			'Save edits?',
			'alert',
			footerButtons
		);
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
			// Skip cancelled climbers
			if (info.reservation_status_code == 6) return []; // flatmap will remove this

			// destructure the climber's info and get just first_name and last_name
			const climberInfo = (({ firt_name, last_name }) => ({ firt_name, last_name }))(info);
			
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
				// only add positive-value tranactions because the rest are charges
				if (info.transaction_value > 0) totalPayment += parseFloat(info.transaction_value);
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


	fillClimberFormSelectOptions(searchString) {
		const queryFields = 'id, full_name';
		const coreSQL = this.getCoreClimberSQL({searchString: searchString,  queryFields: queryFields});
		const sql = `
			SELECT ${queryFields} FROM
				(${coreSQL}) t 
			ORDER BY 
				CASE  
					WHEN search_column='first_name' THEN '1' || first_name || last_name 
					WHEN search_column='first_name' THEN '2' || last_name 
					ELSE '3' 
				END 
			`;
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


	fillExpeditionSearchSelect() {
		var queryStrings = {};
		for (const el of $('.query-option-container')) {
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
		
		if (queryStrings.length === 0) return;

		const searchBy = $('#search-by-select').val() || 'expedition_name';
		const whereClause = `WHERE ${Object.values(queryStrings).join(' AND ')}`;
		const sql = `SELECT DISTINCT expedition_id, expedition_name, permit_number FROM expedition_info_view ${whereClause} ORDER BY ${searchBy}`;
		this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {

				} else {
					const result = $.parseJSON(queryResultString);
					const $select = $('#expedition-search-bar').empty().addClass('default');
					if (result.length) {
						$select.append('<option value="">Click to select an expedition</option>')
						for (const row of result) {
							$select.append(`<option value="${row.expedition_id}">${row[searchBy]}</option>`)
						}
					} else {
						$select.append('<option value="">No expeditions match your search</option>');
					}
				}
			})
			.fail((xhr, status, error) => {
				console.log('Failed to query expeditions for search select with sql ' + sql)
			});
		
	}


	addExpeditionMemberCard({expeditionMemberID=null, firstName=null, lastName=null, climberID=null, showCard=false, isNewCard=false}={}) {
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

			// Add transaction rows
			const transactions = this.expeditionInfo.transactions[expeditionMemberID];
			var transactionTotal = 0;
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
				transactionTotal = transactionTotal + parseFloat(thisTransaction.transaction_value || 0);
			}
			$transactionsList.siblings('.data-list-footer')
				.find('.data-list-header-label.total-col .total-span')
				.text(transactionTotal.toFixed(2));
		} else {
			// Set deault values for new members
			$newCard.find('.input-field[name="reservation_status_code"]')
				.val(1)//pending
				.change();
			$newCard.find('.input-field[name="datetime_reserved"]')
				.val(getFormattedTimestamp())
				.change();
		}

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
			this.setInputFieldValue(el, expeditionData, {dbID: expeditionData.id, triggerChange: triggerChange});
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
					.siblings('.route-code-header-input, .input-field[name="route_code"]')
					.val(routeCode)
					.removeClass('default');
			// if (triggerChange) {
			// 	$mountainCodeInput.change()
			// 	$routeCodeInput.change();
			// }

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
					
					// Set name of member
					$listItem.find('.name-label').text(`${thisMember.last_name}, ${thisMember.first_name}`);

					// Add the member ID to the list-item's data so the in-memory data can be linked back to the list item
					$listItem.data('expedition-member-id', memberID); 

					if (memberRouteID) {
						for (const el of $listItem.find('.input-field')) {
							this.setInputFieldValue(el, memberRouteRecord, {dbID: memberRouteID, triggerChange: triggerChange});
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

		// Show edit toggle button
		$('#edit-expedition-button').ariaHide(false);

	}


	clearExpeditionInfo() {
		// Clear any previously loaded data
		$('.accordion .card:not(.cloneable), .data-list li:not(.cloneable)').remove();

		/*for (const el of $('*:not(.cloneable) .input-field')) {
			const $input = $(el);
			$input.data('table-id', null)
				.val(null);
			if ($input.is('select')) {
				$input.addClass('default')
					.val($input.data('default-value'));
			}
		}*/
		this.clearInputFields({triggerChange: false});
		
		// clearInputFields sets the class to default if the value = '', and these unputs are currently empty 
		$('.route-code-header-input').removeClass('default');


		for (const el of $('.result-details-summary-value')) {
			$(el).text('');
		}
		//$('#input-expedition_name').val('New Expedition Name');
		$('#input-group_status').val(1);//=pending
		
		// Clear in-memory data
		this.expeditionInfo = {
			expeditions: {}, // each field is a property
			expedition_members: {data: {}, order: []}, 
			expedition_member_routes: {data: {}, order: []},
			transactions: {}, // props are exp. member IDs
			cmc_checkout: {data: {}, order: []}
		}

	}


	queryExpedition(expeditionID) {

		const sql = `
			SELECT 
				*
			FROM expedition_info_view 
			WHERE expedition_id=${expeditionID} 
		`
		showLoadingIndicator('queryExpedition');

		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while querying the database: ${queryResultString.trim()}.`, 'Unexpected error');
					return;
				} else {
					const result = $.parseJSON(queryResultString);
					// Get expedition info
					if (result.length) {
						this.clearExpeditionInfo();

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
					let members = this.expeditionInfo.expedition_members;
					let transactions = this.expeditionInfo.transactions;
					let routes = this.expeditionInfo.expedition_member_routes;
					let cmcs = this.expeditionInfo.cmc_checkout;
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
						
					}

					this.fillFieldValues(false);//don't trigger change

					// if the expedition is from this year, then set the value of the search bar. If it's not, it won't exist in the select's options so set it to the null option
					const $select = $('#expedition-search-bar');
					$select.val(
						$select.find(`option[value=${expeditionID}]`).length ? 
						expeditionID :
						'' // set it to the null option
					);
					$select.toggleClass('default', $select.val() === '');

					// If there are any expedition members that aren't assigned to a route, show that .add-expedition-route-member-button 
					const nMembers = this.expeditionInfo.expedition_members.order.length;
					for (const el of $('#routes-accordion .card:not(.cloneable)') ) {
						const $card = $(el);
						$card.find( $('.add-expedition-route-member-button') ).ariaHide(
							$card.find('.route-member-list .data-list-item:not(.cloneable)').length === nMembers 
						)
					}

					hideLoadingIndicator('queryExpedition');
				}
			});
	}



	deleteListItem($listItem, tableName, tableID) {
		this.showLoadingIndicator('deleteListItem');
		var sql = `DELETE FROM ${tableName} WHERE id=${parseInt(tableID)} RETURNING id, '${tableName}' AS table_name`;
		return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while delete data from the database: ${queryResultString.trim()}.`, 'Unexpected error');
					return;
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
							'Database Error')
					} else {
						$listItem.fadeOut(500, () => {$listItem.remove()});
						// ***** remove in-memory data *******
					}
				}
			}).fail((xhr, status, error) => {
				showModal(`An unexpected error occurred while deleting data from the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			}).always(() => {
				this.hideLoadingIndicator();
			});
	}


	getCMCInfo() {
		const sql = 'SELECT id, cmc_can_identifier, rfid_tag_id FROM cmc_inventory';
		const $select = $('#input-cmc_id') // this is the select from the .cloneable <li>
			.append(`<option class="" value=""></option>`); 
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
				this.queryDB('SELECT * FROM route_codes')
					.done((queryResultString) => {
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
			this.queryDB('SELECT code, default_fee, is_credit FROM transaction_type_codes')
				.done((queryResultString) => {
					if (!this.queryReturnedError(queryResultString)) {
						for (const row of $.parseJSON(queryResultString)) {
							this.defaultTransactionFees[row.code] = {
								default_fee: row.default_fee,
								is_credit: row.is_credit
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