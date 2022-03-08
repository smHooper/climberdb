
class ClimberDBExpeditions extends ClimberDB {
	
	constructor() {
		super();
		this.expeditionInfo = {};
		this.routeCodes = {};
		this.cmcInfo = {
			rfidTags: {}, // keys are RFID tag IDs, vals are db IDs
			cmcCanIDs: {} // keys are db IDs, vals are can IDs
		};
		this.defaultTransactionFees = {};
		this.lastSearchQuery = (new Date()).getTime();
		this.totalResultCount;
		this.climberForm;

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
				<button id="add-new-expedition-button" class="generic-button">new expedition</button>
			</div>
			<div class="expedition-content">
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
							<button id="show-modal-climber-form-button" class="generic-button collapse" data-target="#expedition-members-accordion">Add member</button>
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
												<label class="data-list-col data-list-header-label col-4">Summit date</label>
											</div>
											<ul id="route-member-list" class="data-list route-member-list">
												<li class="data-list-item cloneable hidden">
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
							<button class="generic-button add-cmc-button" data-target="#cmc-list">Add CMC</button>
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
									<div class="col-2">
										<select id="input-cmc_id" class="input-field no-option-fill" name="cmc_id" data-table-name="cmc_checkout" title="CMC ID"></select>
									</div>
									<div class="col-4">
										<input id="input-checkout_date" class="input-field" name="checkout_date" type="date" data-table-name="cmc_checkout" title="CMC Checkout Date"> 
									</div>
									<div class="col-4">
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
			const $select = $(e.target);
			const expeditionID = $select.val();
			if (expeditionID != '') {
				$select.removeClass('default')
				$('.search-option-drawer').removeClass('show');
				this.queryExpedition(expeditionID);
				$('#show-modal-climber-form-button').closest('.collapse').collapse('show');
			} else {
				$select.addClass('default');
			}
		});
		// Fill with this year's expeditions to start
		this.fillExpeditionSearchSelect();
		// ^^^^^^^^^ Query stuff ^^^^^^^^^^^^^^^^

		// ---------- Members/transactions ----------
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

		$(document).on('change', '.transaction-type-field', e => {
			const $select = $(e.target);
			const $valueField = $select.closest('li').find('.transaction-amount-field');
			const defaultAmount = this.defaultTransactionFees[$select.val()];
			if ($valueField.val() === '' || $valueField.val() === null && defaultAmount !== null) {
				$valueField.val(defaultAmount.replace(/\(/, '-').replace(/[$)]/g, ''));
			}
		});

		$(document).on('change', '.transaction-amount-field', e => {
			const $list = $(e.target).closest('.data-list');
			const sum = $list.find('li:not(.cloneable) .transaction-amount-field')
				.map((_, el) => el.value === '' ? 0 : parseFloat(el.value))
				.get()
				.reduce((runningTotal, value) => runningTotal + value)
				.toFixed(2);
			if (!isNaN(sum)) $list.siblings('.data-list-footer').find('.total-col .total-span').text(sum);
		});
		// ^^^^^^^^^^ Members/transactions ^^^^^^^^^^^

		// ---------- Route stuff ----------
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
		// ^^^^^^^^^^ Route stuff ^^^^^^^^^

		// ------------ CMCs -------------------
		$('.add-cmc-button').click(e => {
			// ************* chek if the cmc is already checked out to another group ******************
			const $button = $(e.target);
			const $ul = $($button.data('target'));
			const $listItem = this.addNewListItem($ul, {newItemClass: 'new-list-item'});
			const $checkoutDate = $listItem.find('.input-field').filter((_, el) => el.name === 'checkout_date');
			$checkoutDate.val(getFormattedTimestamp());
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
			this.showModalAddMemberForm();
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
			const currentClimberIDs = Object.values(climberDB.expeditionInfo.members.data)
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
					showCard: true
				}
			);
			// Add the member to each route
			for (const ul of $('.route-member-list')) {
				const $listItem = this.addNewListItem($(ul));
				$listItem.find('.name-label').text(`${climberInfo.last_name}, ${climberInfo.first_name}`);
			}

			$(e.target).siblings('.close-modal-button').click();
		})
		// ^^^^^ Climber form stuff ^^^^^^
	}

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
			$select.change(); 
		}

		$('.climber-form .expedition-modal-hidden').ariaHide(true);
		$('.climber-form .expedition-modal-only').ariaHide(false);

		$('.climber-form .delete-card-button').ariaHide(false);

		$climberForm.find('.card:not(.cloneable)').remove();

		// Show the climber info tab
		$('#climber-info-tab').click();
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


	addExpeditionMemberCard({expeditionMemberID=null, firstName=null, lastName=null, climberID=null, showCard=false}={}) {
		const expeditionMemberInfo = this.expeditionInfo.members.data[expeditionMemberID];
		if (expeditionMemberInfo) {
			firstName = expeditionMemberInfo.first_name;
			lastName = expeditionMemberInfo.last_name;
			climberID = expeditionMemberInfo.climber_id;
		}
		const $newCard = this.addNewCard($('#expedition-members-accordion'), 
			{
				accordionName: 'expedition_members', 
				cardLinkText: `${lastName}, ${firstName}`,
				updateIDs: expeditionMemberID ? {expedition_members: expeditionMemberID} : {},
				show: showCard
			}
		);
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
		$transactionsList.attr('id', $transactionsList.attr('id') + '-' + expeditionMemberID);
		
		// Fill inputs
		if (expeditionMemberInfo) {
			for (const el of $newCard.find('.card-header .input-field, .expedition-info-tab-pane .input-field')) {
				this.fillInputField(el, expeditionMemberInfo, {dbID: expeditionMemberID, triggerChange: true})
			}
			// Add transaction rows
			const transactions = this.expeditionInfo.transactions[expeditionMemberID];
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
			//const thisMember = members.data[memberID];
			this.addExpeditionMemberCard({expeditionMemberID: memberID});
			//$card.find('.show-transaction-tab-button').ariaHide(Object.keys(transactions).length === 0);
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
						this.fillInputField(el, memberRouteRecord, {dbID: memberRouteRecord.expedition_member_route_id, triggerChange: true});
					}
				}
			}
		}

		const cmcs = this.expeditionInfo.cmcs;
		const $cmcList = $('#cmc-list');
		for (const cmcCheckoutID of cmcs.order) {
			const thisCMC = cmcs.data[cmcCheckoutID];
			const $listItem = this.addNewListItem($cmcList, {dbID: cmcCheckoutID});
			for (const el of $listItem.find('.input-field')) {
				this.fillInputField(el, thisCMC, {dbID: cmcCheckoutID});
			}
		}
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
		for (const el of $('.result-details-summary-value')) {
			$(el).text('');
		}
		//$('#input-expedition_name').val('New Expedition Name');
		$('#input-group_status').val(1);//=pending
	}


	queryExpedition(expeditionID) {
		
		this.expeditionInfo = {
			expeditions: {}, // each field is a property
			members: {data: {}, order: []}, 
			routes: {data: {}, order: []},
			transactions: {}, // props are exp. member IDs
			cmcs: {data: {}, order: []}
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
					let members = this.expeditionInfo.members;
					let transactions = this.expeditionInfo.transactions;
					let routes = this.expeditionInfo.routes;
					let cmcs = this.expeditionInfo.cmcs;
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

						const cmcCheckoutID = row.cmc_checkout_id;
						if (!(cmcCheckoutID in cmcs.data) && row.cmc_id !== null) {
							cmcs.data[cmcCheckoutID] = {};
							cmcs.order.push(cmcCheckoutID);
							for (const fieldName in this.tableInfo.tables.cmc_checkout.columns) {
								cmcs.data[cmcCheckoutID][fieldName] = row[fieldName];
							}
						}
						
					}

					this.fillFieldValues();
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
		const lookupDeferreds = [this.getCMCInfo()];
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
		lookupDeferreds.push(
			this.queryDB('SELECT code, default_fee FROM transaction_type_codes')
				.done((queryResultString) => {
					if (!this.queryReturnedError(queryResultString)) {
						for (const row of $.parseJSON(queryResultString)) {
							this.defaultTransactionFees[row.code] = row.default_fee;
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
			$('.select2-no-tag').select2({
				width: '100%'
			});
		}).always(() => {
			hideLoadingIndicator()
		});

		return initDeferreds;
	}
}