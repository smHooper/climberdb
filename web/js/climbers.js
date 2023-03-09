
/* helper class to create a climber form inside the given parent selector*/
class ClimberForm {
	constructor(parent, $parentElement) {
		this.$el; // the jquery .climber-form object
		this.edits = {
			updates: {}
		};
		this.countryCodes = {};
		this.stateCodes = {};
		this.selectedClimberInfo = {}; // used for rolling back edits
		this._parent = parent;
		const $parent = $($parentElement);

		$parent.append(`
			<div class="climber-form" autocomplete="__never">
				<div class="climber-form-content">
					<div class="header-button-container">
						<div class="editing-buttons-container">
							<button id="save-button" class="query-result-edit-button icon-button save-edits-button hidden" type="button" aria-label="Save edits" title="Save edits">
								<i class="fas fa-save"></i>
							</button>
							<button id="delete-button" class="query-result-edit-button icon-button delete-climber-button hidden" type="button" aria-label="Delete selected climber" title="Delete climber">
								<i class="fas fa-trash"></i>
							</button>
							<button id="edit-button" class="query-result-edit-button icon-button toggle-editing-button" type="button" aria-label="Edit selected climber" title="Edit climber">
								<i class="fas fa-edit"></i>
							</button>
						</div>
						<div class="close-button-container">
							<div id="disable-required-switch-container" class="switch-container hidden" aria-hidden="true">
								<label class="switch-label">Disable required fields (<span class="required-indicator">*</span> )</label>
								<label class="switch mx-10">
									<input type="checkbox">
									<span class="slider round"></span>
								</label>
							</div>
							<button id="climber-form-close-button" class="close expedition-modal-hidden" type="button" aria-label="Close">
								<span>&times;</span>
							</button>	
						</div>
						<!-- need a different button for expeditions.html because on-close behavior is different--> 
						<button id="climber-form-modal-close-button" class="close expedition-modal-only hidden" type="button" aria-label="Close" aria-hidden="true">
							<span>&times;</span>
						</button>
					</div>
					<div class="expedition-modal-only expedition-modal-climber-form-header hidden">
						<div class="expedition-modal-search-container" aria-hidden="true">
							<div class="fuzzy-search-bar-container col-6">
								<input id="modal-climber-search-bar" class="fuzzy-search-bar" placeholder="Type text to filter climbers" title="Type text to filter climbers" autocomplete="__never">
								<img class="search-bar-icon" src="imgs/search_icon_50px.svg">
							</div>	
							<div class="modal-climber-select-container collapse">
								<select id="modal-climber-select" class="fuzzy-search-bar default ml-1">
									<option value="">Search climbers to filter results</option>
								</select>
								<button id="refresh-modal-climber-select" class="icon-button" title="Refresh climber search results">
									<i class="fas fa-sync-alt fa-solid fa-arrows-rotate fa-2x"></i>
								</button>
							</div>	
						</div>	
						<div class="expedition-modal-search-container" aria-hidden="true">
							<div class="field-container checkbox-field-container always-editable col-sm-3 pl-3">
								<label class="checkmark-container">
									<input id="guide-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter" type="checkbox" name="guide_only" aria-labelledby="guide-only-filter-label">
									<span class="checkmark data-input-checkmark"></span>
								</label>
								<label id="guide-only-filter-label" class="field-label checkbox-label" for="guide-only-filter">Commercial guide</label>
							</div>	
							<div class="field-container checkbox-field-container always-editable col-sm-3 pl-3">
								<label class="checkmark-container">
									<input id="7-day-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter" type="checkbox" name="7_day_only" aria-labelledby="7-day-only-filter">
									<span class="checkmark data-input-checkmark"></span>
								</label>
								<label id="7-day-only-filter-label" class="field-label checkbox-label" for="7-day-only-filter">7-day only</label>
							</div>
							<div class="col-sm-6 px-0 d-flex justify-content-end">
								<span id="climber-search-result-count" class="pr-5 hidden" aria-hidden="true"></span>
								<div id="climber-search-option-loading-indicator" class="loading-indicator-dot-container pr-5 hidden" aria-hidden="true">
									<div class="loading-indicator-dot dot1"></div>
									<div class="loading-indicator-dot dot2"></div>
									<div class="loading-indicator-dot dot3"></div>
								</div>
							</div>
						</div>
					</div>
					<div class="result-details-header-container">
						<div class="result-details-title-container">
							<h3 id="result-details-header-title"></h3>
							<div class="result-details-badges-container">
								<img id="pro-pin-badge" class="result-details-header-badge hidden" src="imgs/pro_pin_icon_100px.svg" title="Pro Pin">
								<img id="guide-badge" class="result-details-header-badge hidden" src="imgs/guide_icon_100px.svg" title="Commerical guide">
								<img id="7-day-badge" class="result-details-header-badge hidden" src="imgs/7_day_icon_100px.svg" title="Qualifies for 7 Day rule">
							</div>
						</div>
						<div class="result-details-summary-container collapse show">
							<div id="expedition-name-result-summary-item" class="result-details-summary-item col">
								<label class="result-details-summary-label">Most recent/next expedition</label>
								<label class="result-details-summary-value"></label>
								<a class="result-details-summary-value result-details-summary-link hidden" target="_blank" aria-hidden="true"></a>
							</div>								
							<div id="entered-by-result-summary-item" class="result-details-summary-item col">
								<div id="entered-by-result-summary-item" class="col">
									<label class="result-details-summary-label">Entered by</label>
									<label class="result-details-summary-value"></label>
								</div>
								<div id="entry-time-result-summary-item" class="col">
									<label class="result-details-summary-label">Entry date</label>
									<label class="result-details-summary-value"></label>
								</div>
							</div>
						</div>
					</div>
					<ul class="tabs" role="tablist">
						<li id="climber-info-list-item">
							<input id="climber-info-tab" class="tab-button" type="radio" name="tabs" checked="true">
							<label for="climber-info-tab" class="tab-label" role="tab" aria-selected="true" aria-controls="climber-info-tab-content" tabindex="0">
								Climber Info
							</label>
							<div id="climber-info-tab-content" class="tab-content" role="tabpanel" aria-labelledby="climber-info-tab" aria-hidden="false">
								<div class="field-container-row">
									<div class="field-container col-sm-4">
										<input id="input-first_name" class="input-field climber-form-title-field always-required" name="first_name" data-table-name="climbers" placeholder="First name" title="First name" type="text" autocomplete="__never" required="">
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-first_name">First name</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>
									<div class="field-container col-sm-4">
										<input id="input-middle_name" class="input-field climber-form-title-field" name="middle_name" data-table-name="climbers" placeholder="Middle name" title="Middle name" type="text" autocomplete="__never">
										<label class="field-label" for="input-middle_name">Middle name</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>
									<div class="field-container col-sm-4">
										<input id="input-last_name" class="input-field climber-form-title-field always-required" name="last_name" data-table-name="climbers" placeholder="Last name" title="Last name" type="text" autocomplete="__never" required="">
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-last_name">Last name</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>
								</div>
								<div class="field-container-row">
									<div class="field-container col">
										<input id="input-address" class="input-field" name="address" data-table-name="climbers" placeholder="Address" title="Address" type="text" autocomplete="__never" required="">
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-address">Address</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
								</div>
								<div class="field-container-row">
									<div class="field-container col-sm-6">
										<select id="input-country" class="input-field default zip-lookup-field" name="country_code" data-table-name="climbers" placeholder="Country" title="Country" type="text" autocomplete="__never" required=""></select>
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-country">Country</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
									<div class="field-container col-sm-6">
										<input id="input-postal_code" class="input-field zip-lookup-field" name="postal_code" data-table-name="climbers" placeholder="Postal code" title="Postal code" type="text" autocomplete="__never" required="">
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-postal_code">Postal code</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
								</div>
								<div class="field-container-row">
									<div class="field-container col-sm-6">
										<input id="input-city" class="input-field" name="city" data-table-name="climbers" placeholder="City" title="City" type="text" autocomplete="__never" required="">
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-city">City</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
									<div class="field-container col-sm-6 collapse">
										<select id="input-state" class="input-field default" name="state_code" data-table-name="climbers" placeholder="State" title="State" type="text" autocomplete="__never" required="" data-dependent-target="#input-country" data-dependent-value=236></select>
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-state">State</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
								</div>
								<div class="field-container-row">
									<div class="field-container col-sm-6">
										<input id="input-phone" class="input-field" name="phone" data-table-name="climbers" placeholder="Phone" title="Phone" type="text" autocomplete="__never" required="">
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-phone">Phone</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
									<div class="field-container col-sm-6">
										<input id="input-email" class="input-field default" name="email_address" data-table-name="climbers" placeholder="Email" title="Email" type="text" autocomplete="__never" required="">
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-email">Email</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
								</div>
								<div class="field-container-row">
									<div class="field-container col-sm-4">
										<input id="input-dob" class="input-field" name="dob" data-table-name="climbers" placeholder="D.O.B." title="D.O.B." type="date" autocomplete="__never">
										<label class="field-label" for="input-dob">D.O.B.</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
									<div class="field-container col-sm-2">
										<input id="input-age" class="input-field" name="age" data-table-name="climbers" placeholder="Age" title="Age" type="text" autocomplete="__never">
										<!--<span class="required-indicator">*</span>-->
										<label class="field-label" for="input-age">Age</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
									<div class="field-container col-sm-6">
										<select id="input-sex" class="input-field default" name="sex_code" data-table-name="climbers" placeholder="Gender" title="Gender" type="text" autocomplete="__never"></select>
										<!--<span class="required-indicator">*</span>-->
										<label class="field-label" for="input-sex">Gender</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>	
								</div>
								<div class="field-container-row">
									<div class="field-container checkbox-field-container col-sm">
										<label class="checkmark-container">
											<input id="input-is_guide" class="input-field input-checkbox" type="checkbox" name="is_guide" data-table-name="climbers" data-badge-target="#guide-badge" data-badge-target-value="t">
											<span class="checkmark data-input-checkmark"></span>
										</label>
										<label class="field-label checkbox-label" for="input-is_guide">Commercial guide</label>
									</div>
									<!--<div class="field-container checkbox-field-container col-sm">
										<label class="checkmark-container">
											<input id="input-received_pro_pin" class="input-field input-checkbox" type="checkbox" name="received_pro_pin" data-table-name="climbers" data-badge-target="#pro-pin-badge" data-badge-target-value="t">
											<span class="checkmark data-input-checkmark"></span>
										</label>
										<label class="field-label checkbox-label" for="input-received_pro_pin">Received Pro Pin</label>
									</div>-->
								</div>
								<div class="field-container-row">
									<div class="field-container col">
										<label class="field-label" for="input-internal_notes">Notes about this climber</label>
										<textarea id="input-internal_notes" class="input-field" name="internal_notes" data-table-name="climbers" placeholder="Enter notes about climber that other rangers should see" title="Notes about this climber" type="text" autocomplete="__never"></textarea>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>
								</div>
							</div>
						</li>

						<li id="climber-history-list-item">
							<input id="climber-history-tab" class="tab-button" type="radio" name="tabs">
							<label for="climber-history-tab" class="tab-label" role="tab" aria-selected="true" aria-controls="climber-history-tab-content" tabindex="0">
								Climber History
							</label>
							<div id="climber-history-tab-content" class="tab-content uneditable" role="tabpanel" aria-labelledby="climber-history-tab" aria-hidden="false">
								<div id="climber-history-accordion" class="accordion">
									<div id="cloneable-card-climber-history" class="card cloneable hidden">
										<div class="card-header" id="cardHeader-climber-history-cloneable">
											<a class="card-link" data-toggle="collapse" href="#collapse-climber-history-cloneable" data-target="collapse-climber-history-cloneable">
												<div class="card-link-content">
													<h6 class="card-link-label row-details-card-link-label climber-info-card-link-label"></h6>
												</div>
												<div class="card-link-content">
													<i class="fa fa-chevron-down pull-right"></i>
												</div>
											</a>
										</div>
										<div id="collapse-climber-history-cloneable" class="collapse card-collapse show" aria-labelledby="cardHeader-climber-history-cloneable" data-parent="#climber-history-accordion">
											<div class="card-body">
												<div class="field-container-row expedition-link-row">
													<div class="field-container col">
														<a class="expedition-link" href="#" target="_blank"></a>
													</div>
												</div>
												<div class="field-container-row">
													<div class="field-container col-sm-6">
														<input id="input-highest_elevation_ft" class="input-field" name="highest_elevation_ft" data-table-name="expedition_members" data-table-id="" placeholder="Highest Elevation (ft)" title="Highest Elevation in feet" type="number" autocomplete="__never">
														<span class="required-indicator">*</span>
														<label class="field-label" for="input-highest_elevation_ft">Highest Elevation (ft)</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
													<div class="field-container col-sm-6">
														<select id="input-frostbite_severity_history" class="input-field default" name="frostbite_severity_code" data-table-name="expedition_members" placeholder="Frostbite severity" title="Frostbite severity"></select>
														<label class="field-label" for="input-frostbite_severity_history">Frostbite severity</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>		
												</div>
												<div class="field-container-row">
													<div class="field-container col">
														<input id="input-frostbite_details" class="input-field" name="frostbite_details" data-table-name="expedition_members" data-table-id="" placeholder="Frostbite details" title="Frostbite details" type="text" autocomplete="__never">
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
														<textarea id="input-medical_notes" class="input-field" name="medical_notes" data-table-name="expedition_members" placeholder="Enter notes about medical issues that occurred during this climb" title="Medical notes" type="text" autocomplete="__never"></textarea>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>
												</div>													
												<div class="field-container-row">
													<div class="field-container col">
														<label class="field-label" for="input-internal_notes">Internal notes about this climb</label>
														<textarea id="input-internal_notes" class="input-field" name="internal_notes" data-table-name="expedition_members" placeholder="Enter notes for other rangers to see about this climb" title="Internal notes" type="text" autocomplete="__never"></textarea>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>
												</div>													
												<div class="field-container-row">
													<div class="field-container col">
														<label class="field-label" for="input-climber_comments">Climber comments</label>
														<textarea id="input-climber_comments" class="input-field" name="climber_comments" data-table-name="expedition_members" placeholder="Enter comments from the climber" title="Climber comments" type="text" autocomplete="__never"></textarea>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>
												</div>
											</div>
										</div>
									</div> <!-- card -->
								</div> <!-- climber-history-accordion -->
							</div> <!-- tab content -->
						</li> <!-- collapse -->

						<li id="emergency-contacts-list-item">
							<input id="emergency-contacts-tab" class="tab-button" type="radio" name="tabs">
							<label for="emergency-contacts-tab" class="tab-label" role="tab" aria-selected="true" aria-controls="emergency-contacts-tab-content" tabindex="0">
								Emergency Contacts
							</label>
							<div id="emergency-contacts-tab-content" class="tab-content" role="tabpanel" aria-labelledby="emergency-contacts-tab" aria-hidden="false">
								<div class="add-card-container">
									<button class="generic-button add-card-button" data-target="#emergency-contacts-accordion" title="Add emergency contact">Add contact</button>
								</div>
								<div id="emergency-contacts-accordion" class="accordion" data-table-name="emergency_contacts">
									<div class="card cloneable hidden" id="cloneable-card-emergency-contacts" data-label-template="first_name last_name, relationship">
										<div class="card-header" id="cardHeader-emergency-contacts-cloneable">
											<a class="card-link" data-toggle="collapse" href="#collapse-emergency-contacts-cloneable" data-target="collapse-emergency-contacts-cloneable">
												<div class="card-link-content">
													<h5 class="card-link-label row-details-card-link-label climber-info-card-link-label">New Emergency Contact</h5>
												</div>
												<div class="card-link-content">
													<button class="delete-button delete-card-button icon-button hidden" type="button" data-item-name="emergency contact" aria-hidden="true" aria-label="Delete emergency contact" title="Delete emergency contact">
														<i class="fas fa-trash fa-lg"></i>
													</button>
													<i class="fa fa-chevron-down pull-right"></i>
												</div>
											</a>
										</div>
										<div id="collapse-emergency-contacts-cloneable" class="collapse card-collapse" aria-labelledby="cardHeader-emergency-contacts-cloneable" data-parent="#emergency-contacts-accordion">
											<div class="card-body">
												<div class="field-container-row">
													<div class="field-container col-sm-6">
														<input id="input-relationship" class="input-field card-label-field" name="relationship" data-table-name="emergency_contacts" placeholder="Relationship to climber" title="Relationship to climber" type="text" autocomplete="__never">
														<span class="required-indicator">*</span>
														<label class="field-label" for="input-relationship">Relationship to climber</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>		
												</div>
												<div class="field-container-row">
													<div class="field-container col-sm-6">
														<input id="input-first_name_contact" class="input-field card-label-field" name="first_name" data-table-name="emergency_contacts" placeholder="First name" title="First name" type="text" autocomplete="__never" required="required">
														<span class="required-indicator">*</span>
														<label class="field-label" for="input-first_name">First name</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>
													<div class="field-container col-sm-6">
														<input id="input-last_name_contact" class="input-field card-label-field" name="last_name" data-table-name="emergency_contacts" placeholder="Last name" title="Last name" type="text" autocomplete="__never" required="">
														<span class="required-indicator">*</span>
														<label class="field-label" for="input-last_name">Last name</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>
												</div>
												<div class="field-container-row">
													<div class="field-container col">
														<input id="input-address_contact" class="input-field" name="address" data-table-name="emergency_contacts" placeholder="Address" title="Address" type="text" autocomplete="__never">
														<label class="field-label" for="input-address">Address</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
												</div>
												<div class="field-container-row">
													<div class="field-container col-sm-6">
														<select id="input-country_contact" class="input-field default zip-lookup-field" name="country_code" data-table-name="emergency_contacts" placeholder="Country" title="Country" type="text" autocomplete="__never"></select>
														<label class="field-label" for="input-country">Country</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
													<div class="field-container col-sm-6">
														<input id="input-postal_code_contact" class="input-field zip-lookup-field" name="postal_code" data-table-name="emergency_contacts" placeholder="Postal code" title="Postal code" type="text" autocomplete="__never">
														<label class="field-label" for="input-postal_code">Postal code</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
												</div>
												<div class="field-container-row">
													<div class="field-container col-sm-6">
														<input id="input-city_contact" class="input-field" name="city" data-table-name="emergency_contacts" placeholder="City" title="City" type="text" autocomplete="__never">
														<label class="field-label" for="input-city">City</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
													<div class="field-container col-sm-6 collapse">
														<select id="input-state_contact" class="input-field default" name="state_code" data-table-name="emergency_contacts" placeholder="State" title="State" type="text" autocomplete="__never" data-dependent-target="#input-country_contact" data-dependent-value=236></select>
														<label class="field-label" for="input-state">State</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
												</div>
												<div class="field-container-row">
													<div class="field-container col-sm-6">
														<input id="input-phone_contact" class="input-field" name="primary_phone" data-table-name="emergency_contacts" placeholder="Phone" title="Phone" type="text" autocomplete="__never" required="">
														<span class="required-indicator">*</span>
														<label class="field-label" for="input-phone">Phone</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
													<!--<div class="field-container col-sm-6">
														<input id="input-email_contact" class="input-field default" name="email_address" data-table-name="emergency_contacts" placeholder="Email" title="Email" type="text" autocomplete="__never" required="">
														<span class="required-indicator">*</span>
														<label class="field-label" for="input-email">Email</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>-->
												</div>
												<div class="field-container-row">
													<div class="field-container col">
														<label class="field-label" for="input-internal_notes">Notes about this contact</label>
														<textarea id="input-internal_notes_contact" class="input-field" name="internal_notes" data-table-name="emergency_contacts" placeholder="Enter notes about this emergency contact that other rangers should see" title="Notes about this contact" type="text" autocomplete="__never"></textarea>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div> <!-- tab content -->
						</li> 
					</ul>
				</div> <!--climber-form-content-->
				
				<div class="modal-save-button-container">
					<button id="modal-save-climber-button" class="generic-button expedition-modal-hidden" title="Save new climber">Save new climber</button>
					<button id="modal-save-to-expedition-button" class="generic-button expedition-modal-only collapse hidden" aria-hidden="true" title="Add climber to expedition">Add to expedition</button>
					<button id="modal-save-new-climber-button" class="generic-button expedition-modal-only collapse hidden" aria-hidden="true" title="Save new climber">Save new climber</button>
					<a id="expedition-modal-add-new-climber-button" class="generic-button expedition-modal-only hidden" aria-hidden="true" href="climbers.html?addClimber=true" target="_blank">Create new climber</a>
					<a id="edit-climber-info-button" class="generic-button expedition-modal-only collapse hidden" href="climbers.html?" target="_blank">Edit climber info</a>
					<button class="generic-button close-modal-button" title="Close modal climber form">Cancel</button>
				</div>
			
			</div> <!--climber-form-->
		`);
		
		this.$el = $parent.find('.climber-form');


		// Add event handlers that can be added here with the given scope. Some handlers related to the form 
		//	either reference properties of the ClimberDB (or subclass thereof) or otherwise reference variables 
		//	outside the scope of the ClimberForm class
		$('.climber-form button.close:not(.modal-close-button)').click(e => {
			this.confirmCloseClimberForm($(e.target).closest('button.close'));
		});

		$('.climber-form .close-modal-button').click(e => {
			$('.climber-form button.close').click();
		});

		$('.climber-form-title-field').change(e => {
			const firstName = $('#input-first_name').val();
			const middleName = $('#input-middle_name').val();
			const lastName = $('#input-last_name').val();

			if (firstName && lastName) $('#result-details-header-title').text(this.getFullName(firstName, lastName, middleName));
		});

		$('.toggle-editing-button').click(e => {
			this.toggleEditing($('.result-details-pane').is('.uneditable'));
		});

		$('#save-button').click(e => {
			this.saveEdits()
		});

		$('.climber-form .delete-card-button').click(this.onDeleteCardButtonClick);

		$('#disable-required-switch-container input[type=checkbox]').change(e => {
			this.onToggleRequiredChange(e);
		})

		// Country/state lookup from postal code
		$(document).on('change', '.zip-lookup-field', e => {this.onPostalCodeFieldChange(e)});
		// Get country and state short_name/codes for city/state lookup from postal code
		$.post({
			url: 'climberdb.php',
			data: {
				action: 'query',
				queryString: 'TABLE country_codes',
				db: 'climberdb'
			}
		}).done(queryResultString => {
			for (const row of $.parseJSON(queryResultString)) {
				// Need to get abbreviation from code for API call
				this.countryCodes[row.code] = row.short_name;
			};
		});		
		$.post({
			url: 'climberdb.php',
			data: {
				action: 'query',
				queryString: 'TABLE state_codes',
				db: 'climberdb'
			}
		}).done(queryResultString => {
			for (const row of $.parseJSON(queryResultString)) {
				// Need to get code from abbreviation for API response
				this.stateCodes[row.short_name] = row.code;
			};
		});

	}

	
	/*
	Helper method to get the value of in input depedning on whether or not its a checkbox
	*/
	getInputFieldValue($input) {
		return $input.is('.input-checkbox') ? $input.prop('checked') : $input.val();
	}


	/*
	Wrapper for ClimberDB.setInputFieldValue to do any additional stuff necessary for this page
	*/
	setInputFieldValue(el, values, {dbID=null, triggerChange=false}={}) {

		const [$el, fieldName, value] = this._parent.setInputFieldValue(el, values, {dbID: dbID, triggerChange: triggerChange});

		const badgeTarget = $el.data('badge-target');
		if (badgeTarget && $el.data('badge-target-value') == value) $(badgeTarget).ariaHide(false);

		// Record initial data to easily enable rolling back edits
		const tableName = $el.data('table-name');
		const info = this.selectedClimberInfo;
		if (!(tableName in info)) info[tableName] = {};
		if (!(dbID in info[tableName])) info[tableName][dbID] = {};
		info[tableName][dbID][fieldName] = value;
	}


	/*
	When an input field changes, 
	*/
	onInputChange(e) {
		const $input = $(e.target).addClass('dirty').removeClass('error');

		// This is an insert if it's a descendant of either a .new-card or modal .climber-form. In that case,
		//	changes will be captured when the save button is clicked
		if ($input.closest('.new-card, .climber-form.climberdb-modal').length) return;

		// Get data attributes
		const tableName = $input.data('table-name');
		const fieldName = $input.attr('name');//.replace(/-\d+$/g, ''); //card inputs 
		let dbID = $input.data('table-id');

		const editObject = this.edits.updates; // get reference for shorthand
		const dbValue = this.selectedClimberInfo[tableName][dbID][fieldName];
		// If the input value matches the DB value, remove the edit and the .dirty class
		if (dbValue == $input.val()) {
			$input.removeClass('dirty');
			if (editObject[tableName]) {
				if (editObject[tableName][dbID]) {
					if (editObject[tableName][dbID][fieldName]) {
						delete editObject[tableName][dbID][fieldName];
					}
				}
			}
		} 
		// Otherwise record the update in as an edit
		else {
			if (!(tableName in editObject)) editObject[tableName] = {};
			if (!(dbID in editObject[tableName])) editObject[tableName][dbID] = {};
			editObject[tableName][dbID][fieldName] = this.getInputFieldValue($input);
		}
	}


	onPostalCodeFieldChange(e) {
		const $container = $(e.target).closest('.field-container-row').parent();
		const postalCode = $container.find('.input-field[name=postal_code]').val();
		const countryCode = $container.find('.input-field[name=country_code]').val();
		if (!(countryCode && postalCode)) return;

		const countryAbbreviation = this.countryCodes[countryCode]

		$.get(`http://api.zippopotam.us/${countryAbbreviation}/${postalCode}`).done(response => {
			if ('places' in response) {
				const details = response.places[0];
				if ('place name' in details) {
					// Update city. Look within the container since both climber and emerg. 
					//	contact info have fields with the same name attr.
					$container.find('.input-field[name=city]')
						.val(details['place name'])
						.change();
					
					// If the country is the US, update the state
					if (countryAbbreviation == 'US') {
						const stateCode = this.stateCodes[details['state abbreviation']] || '';
						$container.find('.input-field[name=state_code]')
							.val(stateCode)
							.change();
					}
				}
			}
		});

	}


	/*

	*/
	closeClimberForm($button) {
		
		// Collapse the result-details-pane so the climber result list is full-width
		const $resultPane = $('.result-details-pane');
		$resultPane.addClass('collapsed');
		
		$('#disable-required-switch-container').ariaHide(true)
			.find('checkbox')
				.prop('checked', false)
				.change();

		const $climberForm = $button.closest('.climber-form');
		const climberFormWasModal = $climberForm.is('.climberdb-modal');

		// Show climber form in its non-modal form
		$climberForm.removeClass('climberdb-modal');
		
		// Show the edit button again and hide the save button
		this.$el.find('#edit-button').ariaHide(false);
		if (climberFormWasModal) $('#save-button').ariaHide(true);

		// Show the currently selected climber (and show the climber info tab)
		if (climberFormWasModal) {
			$('.query-result-list-item.selected').click();
			$('.climber-info-tab').prop('checked', true);
			$resultPane.addClass('uneditable');
		}

		// Unhide the expedition name
		$('#expedition-name-result-summary-item').ariaHide(false);

		// Show the climber info tab
		$('#climber-info-tab').click();
	}


	/*
	Wrapper for closeClimberForm to conditionally ask the user to confirm their edits
	*/
	confirmCloseClimberForm($button) {
		// If this form is being shown to add a new climbers, check for unfilled required fields.
		// 	Check this by seeing if any inputs have their table-id set. If they do, this is an 
		//	update and the form can just be collapsed/dismissed. Otherwise, it's an insert and 
		//	any data entered will be lost
		const isInsert = $('.climber-form .input-field').get().some(
			el => {
				const $el = $(el);
				return $el.data('table-id') === undefined || $el.data('table-id') === ''
			});
		const closeCallbackString = `climberDB.climberForm.closeClimberForm($('#${$button.attr('id')}'));`
		if ($('.climber-form .input-field.dirty').length) {
			// Don't offer a save option, just discard and cancel
			if (isInsert) {
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
					<button 
						class="generic-button modal-button danger-button close-modal" 
						data-dismiss="modal" 
						onclick="${closeCallbackString}"
					>Discard</button>
				`;
				const message = 
					`You've made changes to the cliimber form. Are you sure you want to close` + 
					' the form and discard these edits? To continue editing or save your edits, click cancel.';
				showModal(message, 'Discard climber edits?', 'confirm', footerButtons)
			} else {
				// User can save, discard, or cancel
				this.confirmSaveEdits(closeCallbackString);
			}
		} else {
			this.closeClimberForm($button);
		}
	}


	/*
	Helper function to get full name as last name first. Mostly this just simplifies dealing with the space in the middle name
	*/
	getFullName(firstName, lastName, middleName='') {
		return `${lastName}, ${firstName}${middleName ? ' ' + middleName : ''}`;
	}


	fillClimberForm(climberID, climberInfo) {
		
		const $inputs = $('.climber-form-content .input-field');
		for (const el of $inputs) {
			this.setInputFieldValue(el, climberInfo, {dbID: climberID});
		}

		$('#result-details-header-title').text(this.getFullName(climberInfo.first_name, climberInfo.last_name, climberInfo.middle_name));

		if (climberInfo.expedition_name) {
			$('#expedition-name-result-summary-item > .result-details-summary-link')
				.ariaHide(false)
				.attr('href', 'expeditions.html?id=' + climberInfo.expedition_id)
				.html(climberInfo.expedition_name + ' - ' + climberInfo.expedition_date)
				.siblings('.result-details-summary-value:not(a)')
					.ariaHide(true);
		} else {
			$('#expedition-name-result-summary-item > .result-details-summary-value:not(a)')
				.ariaHide(false)
				.text('None')
				.siblings('.result-details-summary-link')
					.ariaHide(true);
		}
		$('#entered-by-result-summary-item > .result-details-summary-value').text(climberInfo.entered_by);
		$('#entry-time-result-summary-item > .result-details-summary-value').text(climberInfo.entry_time);

		const $formParent = this.$el.parent();
		const $firstCollapse = $formParent.children('.accordion').find('.card-collapse').first();
		if (!$firstCollapse.is('.show')) {
			$firstCollapse.closest('.card').find('.card-link').click();
		}

		this.queryClimberHistory(climberID);

		// Show the details pane
		$formParent
			.removeClass('collapsed')
			.attr('aria-hidden', false);
		
		// .change() events on .input-fields will add dirty class
		$('.climber-form .input-field').removeClass('dirty');
	}


	fillClimberHistory(climberHistory) {

		//$('.result-details-header-badge').addClass('hidden');

		const $accordion = $('#climber-history-accordion');
		$accordion.find('.card:not(.cloneable)').remove();
		const historyIndex = 0;
		var expeditionMemberIDs = {};
		var qualifiesFor7DayPermit = false,
			receivedProPin = false;
		const now = new Date();
		for (const i in climberHistory) {
			const row = climberHistory[i];
			const formattedDeparture = (new Date(row.actual_departure_date + ' 12:00')).toLocaleDateString(); //add a time otherwise the date will be a day before
			const actualReturnDate = new Date(row.actual_return_date + ' 12:00');
			const formattedReturn = row.actual_return_date ? actualReturnDate.toLocaleDateString() : '';
			//TODO: handle routes that don't have a sort_order (and aren't in route_codes)
			const cardTitle = `${this._parent.routeCodes[row.route_code].name}: ${row.expedition_name},  ${formattedDeparture} - ${formattedReturn}`;
			const $card = this._parent.addNewCard(
				$accordion, 
				{
					accordionName: 'climber-history', 
					cardLinkText: cardTitle, 
					updateIDs: {
						'climbers': row.climber_id,
						'expeditions': row.expedition_id,
						'expedition_members': row.expedition_member_id,
						'expedition_member_routes': row.expedition_member_route_id
					},
					show: false
				}
			);
			for (const el of $card.find('.input-field')) {
				this.setInputFieldValue(el, row);
			}

			// Set the anchor url to this group
			$card.find('.expedition-link')
				.attr('href', `expeditions.html?id=${row.expedition_id}`)
				.text(`View expedition '${row.expedition_name}'`);

			// Map expedition_member_id to index so the card can be retrieved from the member_id
			expeditionMemberIDs[row.expedition_member_id] = i;

			// If a previous climb didn't already qualify this climber as a 7-dayer, check that 
			//	1. The return date is before now
			//	2. formattedReturn is truthy because null value passed to Date() will return the unix epoch
			// 	OR
			//	the group status is "Checked back from mountain"
			qualifiesFor7DayPermit = qualifiesFor7DayPermit || 
				(
					((actualReturnDate <= now && formattedReturn) || row.group_status_code == 5) &&
					row.highest_elevation_ft >= this._parent.config.minimum_elevation_for_7_day || 10000
				)

			receivedProPin = receivedProPin || row.received_pro_pin === 't';
		}	

		// Only show badges if this the climber form is NOT being shpwn as a modal and this is on the
		//	climbers page. Without this extra criterion, fillClimberHistory() is often called after the 
		//	showModalClimberForm() stuff that hides badges. So if the climber page is opened with the 
		//	addClimber=true URL query, any badges from the first climber loaded will be shown
		const isShowingModal = $('.result-details-pane').is('.collapsed');
		$('#7-day-badge').ariaHide(isShowingModal || !qualifiesFor7DayPermit);
		$('#pro-pin-badge').ariaHide(isShowingModal || !receivedProPin);

		// .change() events on .input-fields will add dirty class
		$('.climber-form .input-field').removeClass('dirty');

		// Check if any of this climber's expeditions were solo. If so, mark them as such
		if (climberHistory.length) {
			const $newCards = $accordion.find('.card:not(.cloneable)');
			const soloSQL = `SELECT * FROM solo_climbs_view WHERE climber_id=${climberHistory[0].climber_id}`;
			const soloDeferred = this._parent.queryDB(soloSQL)
				.done(resultString => {
					if (this._parent.queryReturnedError(resultString)) {
						console.log('could not get solo info because ' + resultString)
					} else {
						const result = $.parseJSON(resultString);
						for (const row of result) {
							// Mark the history card as a solo climb
							const cardIndex = expeditionMemberIDs[row.expedition_member_id];
							const $card = $newCards.eq(cardIndex);
							$card.find('.card-link-label').text($card.find('.card-link').text() + ' - solo');

							// Unhide the solo-climber badge
						}
					}
				})
				.fail((xhr, status, error) => {
					showModal('Retrieving climber history from the database failed because because ' + error, 'Database Error')
				});

		}
	}


	fillEmergencyContacts(emergencyContacts) {

		const $accordion = $('#emergency-contacts-accordion');
		$accordion.find('.card:not(.cloneable)').remove();
		const historyIndex = 0;
		for (const row of emergencyContacts) {
			const $card = this._parent.addNewCard(
				$accordion, 
				{
					accordionName: 'emergency-contacts', 
					cardLinkText: `${row.first_name} ${row.last_name}, ${row.relationship || 'unknown relationship'}`, 
					updateIDs: {
						'climbers': row.climber_id,
						'emergency_contacts': row.id
					},
					show: false
				}
			);
			for (const el of $card.find('.input-field')) {
				this.setInputFieldValue(el, row, {dbID: row.id});
			}
		}

		// .change() events on .input-fields will add dirty class
		$('.climber-form .input-field').removeClass('dirty');
	}


	/*

	*/
	queryClimberHistory(climberID) {
		const historySQL = `SELECT * FROM climber_history_view WHERE climber_id=${climberID}`;
		//`SELECT * FROM WHERE  climbers.id=${climberID} `
		const contactsSQL = `SELECT * FROM emergency_contacts WHERE climber_id=${climberID}`;

		const historyDeferred = this._parent.queryDB(historySQL)
			.done(resultString => {
				if (this._parent.queryReturnedError(resultString)) {
					showModal('Retrieving climber history from the database failed because because ' + resultString, 'Database Error');
				} else {
					this.fillClimberHistory($.parseJSON(resultString));
				}
			})
			.fail((xhr, status, error) => {
				showModal('Retrieving climber history from the database failed because because ' + error, 'Database Error')
			});
		const contactsDeferred = this._parent.queryDB(contactsSQL)
			.done(resultString => {
				if (this._parent.queryReturnedError(resultString)) {
					showModal('Retrieving emergency contact info from the database failed because because ' + resultString, 'Database Error');
				} else {
					this.fillEmergencyContacts($.parseJSON(resultString));
				}
			})
			.fail((xhr, status, error) => {
				showModal('Retrieving emergency contact info from the database failed because because ' + error, 'Database Error')
			});


		return [historyDeferred, contactsDeferred]
	}

	/*

	*/
	discardEdits() {
		// Reset the values of inputs that were changed
		const climberInfo = this.selectedClimberInfo;
		const $dirtyInputs = $('.input-field.dirty');
		for (const input of $dirtyInputs) {
			const $input = $(input);
			
			if ($input.closest('.card.cloneable').length) continue;
			
			const tableName = $input.data('table-name');
			const dbID = $input.data('table-id');
			const fieldName = input.name;
			$input.val(climberInfo[tableName][dbID][fieldName]); 
		}

		$('.result-details-pane').addClass('uneditable');
		$dirtyInputs.removeClass('dirty');

		// Remove any new cards
		$('.new-card').remove();

		// Reset edits
		this.edits.updates = {};

	}


	/*
	Save edits to climber info. Edits are either changes to a climber's information 
	or related records (climber history or emergency contacts) or completely new 
	climber inserts (if the form is being shown as a modal)
	*/
	saveEdits({chainInserts=false}={}) {

		showLoadingIndicator('saveEdits');

		var sqlStatements = [];
		var sqlParameters = [];
		const now = getFormattedTimestamp(new Date(), {format: 'datetime'});
		const userName = this._parent.userInfo.ad_username;
		
		// Deep copy to be able to roll back changes to in-memory data (climberDB.climberInfo)
		const originalDataValues = deepCopy(this.selectedClimberInfo.climbers);
		const currentIndex = $('.query-result-list-item.selected').index();
		var climberInfo = {};
		if (this._parent.climberInfo) { // will be undefined if this is a new climber
			climberInfo = this._parent.climberInfo[currentIndex];
		}

		// If the user disabled required fields, still make validate first and last name fields. Otherwise, validate all
		const requiredFieldsDisabled = $('#disable-required-switch-container input[type=checkbox]').prop('checked');
		const $editParents = requiredFieldsDisabled ? 
			$('.input-field.always-required.dirty').closest('.field-container-row') : 
			$(`
				#climber-info-tab-content,
				#emergency-contacts-tab-content .card:not(.cloneable)
			`)
			.has('.input-field.dirty');
		
		if (!this._parent.validateFields($editParents)) {
			let message = 
				'One or more required fields are not filled. All required fields' + 
				' must be filled before you can save your edits.'
			if (requiredFieldsDisabled) message += 
				' Even though you disabled required fields,' + 
				' first and last name are always required.'
			showModal(message, 'Required field is empty');
			hideLoadingIndicator();
			return;
		};

		// collect inserts
		let inserts = [];
		for (const container of $('.climberdb-modal #climber-info-tab-content, .new-card:not(.cloneable)')) { 
			let tableParameters = {}
			for (const el of $(container).find('.input-field.dirty')) {
				const $input = $(el);
				const tableName = $input.data('table-name');
				const fieldName = el.name;

				if (!(tableName in tableParameters)) tableParameters[tableName] = {fields: [], values: []};
				tableParameters[tableName].fields.push(fieldName);
				tableParameters[tableName].values.push(this.getInputFieldValue($input));
			}
			// Loop through tables in their insert order
			let currvalClauseString = '';
			let currvalCount = 0;
			for (const tableName in this._parent.tableInfo.tables) {
				// If the table doesn't have any fields that were edited, skip it
				if (!(tableName in tableParameters)) continue;

				const columnInfo = this._parent.tableInfo.tables[tableName].columns;
				let values = tableParameters[tableName].values;
				let fields = tableParameters[tableName].fields;
				if ('entered_by' in columnInfo) {
					values = values.concat([now, userName]);
					fields = fields.concat(['entry_time', 'entered_by']);
				}
				if ('last_modified_by' in columnInfo) {
					values = values.concat([now, userName]);
					fields = fields.concat(['last_modified_time', 'last_modified_by']);
				}
				const foreignColumnInfo = this._parent.tableInfo.tables[tableName].foreignColumns || [];
				if (foreignColumnInfo.length) {
					// find the ID
					for (const {foreignTable, column} of foreignColumnInfo) {
						// Assume this is an insert whose parent (left-side) table is also being inserted.
						//	In that case, the parent record should have already been inserted and currval would return its ID.
						//	This only works, however, if only 1 record is being inserted into the parent table
						var foreignID;//= ;
						// Loop through all input fields and look for the parent ID in the input's .data().
						//	If found, the parent record already exists and the ID can just be retrieved from
						//	the .data()
						for (const el of $('.input-field')) {
							const $el = $(el);
							if ($el.data('table-name') === foreignTable && $el.data('table-id') !== undefined) {
								foreignID = parseInt($el.data('table-id')); // the ID is set on an input, meaning this field belongs to an existing record
								break;
							}
						}
						if (foreignID === undefined) {
							// insert a value to get what will be the foreign table ID 
							currvalClauseString += `, currval(pg_get_serial_sequence('${foreignTable}', 'id'))`;
							currvalCount ++;
							//showModal(`Foreign row ID could not be found for the table '${tableName}' and column '${column}' with foreign table '${foreignTable}'`, 'Database Error')
							//return;
						} else {
							values.push(foreignID);
						}
						fields.push(column);
						//}

					}
				}

				let parametized = fields.map(f => '$' + (fields.indexOf(f) + 1))
					.slice(0, fields.length - currvalCount) // drop the currvalClause parametized values
					.join(', ');
				sqlStatements.push(`INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${parametized}${currvalClauseString}) RETURNING id`);
				sqlParameters.push(values);
				// Record so table-id data attribute can be set from RETURNING statement
				inserts.push({container: container, tableName: tableName});
			}
		}

		// collect updates
		const updates = this.edits.updates;
		for (const tableName in updates) {
			const columnInfo = this._parent.tableInfo.tables[tableName].columns;
			const hasLastModifiedBy = 'last_modified_by' in columnInfo;
			for (const id in updates[tableName]) {
				let parameters = hasLastModifiedBy ? [now, userName] : [];
				let parametized = hasLastModifiedBy ? ['last_modified_time=$1', 'last_modified_by=$2'] : [];
				let hasUpdates = false;
				for (const fieldName in updates[tableName][id]) {
					const value = updates[tableName][id][fieldName];
					parameters.push(value);
					parametized.push(`${fieldName}=$${parametized.length + 1}`);

					if (fieldName in climberInfo) climberInfo[fieldName] = value;
					hasUpdates = true;
				}
				
				if (hasUpdates) {
					sqlStatements.push(`UPDATE ${tableName} SET ${parametized.join(', ')} WHERE id=${id} RETURNING id`);
					sqlParameters.push(parameters);
				}
			}
		}


		 if (!sqlStatements.length) {
		 	showModal("You have not made any edits to save yet. Add or change this climber's information and then try to save it.", "No edits to save");
		 	hideLoadingIndicator();
		 	return $.Deferred().resolve('');
		 }

		return $.ajax({ 
			url: 'climberdb.php',
			method: 'POST',
			data: {action: 'paramQuery', queryString: sqlStatements, params: sqlParameters},
			cache: false
		}).done(queryResultString => {
			if (this._parent.queryReturnedError(queryResultString)) { 
				showModal(`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
				// roll back in-memory data
				for (const dbID in updates.climbers) {
					for (const fieldName in updates.climbers[dbID]) {
						climberInfo[fieldName] = originalDataValues[dbID][fieldName];
					}
				}
				return;
			} else {
				const returnedIDs = $.parseJSON(queryResultString);
				for (const i in inserts) {
					const id = returnedIDs[i].id;
					if (id == null || id === '') continue;

					// Set the card's class and inputs' attributes so it changes will register as updates
					const {container, tableName} = inserts[i];
					const $container = $(container)
						.removeClass('new-card');
					$container
						.find('.input-field')
							.data('table-name', tableName)
							.data('table-id', id);
					if (!(tableName in this.selectedClimberInfo)) this.selectedClimberInfo[tableName] = {};
					this.selectedClimberInfo[tableName][id] = {};
					for (const el of $container.find('.input-field')) {
						this.selectedClimberInfo[tableName][id][el.name] = el.value;
					}
				}

				// Make sure the .selectedClimberInfo is updated
				for (const tableName in updates) {
					for (const id in updates[tableName]) {
						for (const fieldName in updates[tableName][id]) {
							this.selectedClimberInfo[tableName][id][fieldName] = updates[tableName][id][fieldName];
						}
					}
				}


				$('.climber-form .input-field.dirty').removeClass('dirty');
			}
		}).fail((xhr, status, error) => {
			showModal(`An unexpected error occurred while saving data to the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			// roll back in-memory data
			for (const dbID in updates.climbers) {
				for (const fieldName in updates.climbers[dbID]) {
					climberInfo[dbID][fieldName] = updates.climbers[dbID];
				}
			}
		}).always(() => {
			this._parent.hideLoadingIndicator();
		});
	}


	/*
	Prompt user to confirm or discard edits via modal
	*/
	confirmSaveEdits(afterActionCallbackStr='') {
		//@param afterActionCallbackStr: string of code to be appended to html onclick attribute
		const onConfirmClick = `
			showLoadingIndicator();
			climberDB.climberForm.saveEdits(); 
		`;
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.climberForm.discardEdits();${afterActionCallbackStr}">Discard</button>
			<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}${afterActionCallbackStr}">Save</button>
		`;
		// climberDB is a global instance of ClimberDB or its subclasses that should be instantiated in each page
		// 	this is a little un-kosher because the ClimberForm() instance is probably a property of climberDB, but
		//	the only alternative is to make showModal a global function 
		showModal(
			`You have unsaved edits to this climber. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this climber's info.`,
			'Save edits?',
			'alert',
			footerButtons
		);
	}

	/*
	Delete each table
	*/
	deleteCard(cardID) {
		// If this is a new card, just remove it because there are no database edits to confirm. Otherwise, confirm with the user 
		const $card = $('#' + cardID);
		if ($card.is('.new-card')) {
			$card.fadeOut(500, () => {$card.remove()})
		} else {
			showLoadingIndicator('deleteCard');
			var tablesToDeleteFrom = [];
			var deleteStatements = [];
			for (const el of $card.find('.input-field')) {
				const $input = $(el);
				const tableName = $input.data('table-name');
				const dbID = $input.data('table-id');
				if (!tablesToDeleteFrom.includes(tableName) && tableName && dbID != undefined) {
					tablesToDeleteFrom.push(tableName);
					deleteStatements.push(`DELETE FROM ${tableName} WHERE id=${parseInt(dbID)} RETURNING id, '${tableName}' AS table_name`);
				}
			}

			return this._parent.queryDB(deleteStatements)
				.done(queryResultString => {
					if (this._parent.queryReturnedError(queryResultString)) {
						showModal(`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}.`, 'Unexpected error');
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
								`There was a problem deleting objects from the table${failedDeletes.length > 1 ? 's' : ''} ${failedDeletes.join(', ')}.` +
									`Contact your database adminstrator to resolve this issue.<br><br>Attempted SQL statements:<br>${deleteStatements.join('<br>')}`, 
								'Database Error')
						} else {
							$card.fadeOut(500, () => {$card.remove()});
						}
					}
				}).fail((xhr, status, error) => {
					showModal(`An unexpected error occurred while deleting data from the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
				}).always(() => {
					hideLoadingIndicator();
				});

		}
		
	}


	onDeleteCardButtonClick(e, afterActionCallbackStr='') {
		const $button = $(e.target).closest('.delete-card-button');
		const $card = $button.closest('.card');
		const itemName = $button.data('item-name') || $card.data('item-name');
		const onConfirmClick = `
			climberDB.climberForm.deleteCard('${$card.attr('id')}');
			${afterActionCallbackStr} 
		`;
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">Yes</button>
		`;
		showModal(`Are you sure you want to delete this ${itemName}?`, `Delete ${itemName}?`, 'confirm', footerButtons);

	}

	/*
	*/
	deleteClimber(climberID) {
		return this._parent.queryDB(`DELETE FROM climbers WHERE id=${parseInt(climberID)} RETURNING id`)
			.done(queryResultString => {
				if (this._parent.queryReturnedError(queryResultString)) {
					showModal(`An unexpected error occurred while deleting data from the database: ${queryResultString.trim()}.`, 'Unexpected error');
					return;
				} 
			}).fail((xhr, status, error) => {
				showModal(`An unexpected error occurred while deleting data from the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
			}).always(() => {
				hideLoadingIndicator();
			});
	}


	onToggleRequiredChange(e) {
		$('.input-field.error:not(.always-required)').removeClass('error');
		const $switch = $(e.target);
		$('.input-field:not(.always-required) ~ .required-indicator').ariaHide($switch.prop('checked'));
	}


	/* 
	Helper method to turn editing mode on or off
	*/
	toggleEditing(allowEdits, {confirm=true}={}) {
		const $detailsPane = this.$el.closest('.result-details-pane');
		
		// If editing is being disabled, check for .dirty inputs and make the user decide if they want to discard or save edits
		if (!allowEdits && $('.climber-form .input-field.dirty').length && confirm) {
			this.confirmSaveEdits();
		} else {
			$('.save-edits-button, .delete-climber-button, .climber-form .delete-card-button, #disable-required-switch-container').ariaHide(!allowEdits);
			$detailsPane.toggleClass('uneditable', !allowEdits);
		}
		// If edits are being turned off, reset switch
		if (!allowEdits) $('#disable-required-switch-container input[type=checkbox]').prop('checked', false).change();
	}
}


class ClimberDBClimbers extends ClimberDB {
	
	constructor() {
		super();
		this.climberInfo = {}; // all climbers from db query
		this.climberIDs = {}; // index -> db ID pairs
		this.stateCodes = {};
		this.routeCodes = {};
		this.emergencyContacts = {}; //db id -> emergency contact pairs
		this.lastSearchQuery = (new Date()).getTime();
		this.totalResultCount;
		this.recordsPerSet = 50; /* how many climbers to show at once */
		this.currentRecordSetIndex = 0;
		this.climberForm;

		return this;
	}


	/* Set up containers for showing data/content*/
	configureMainContent() {
		$('.main-content-wrapper').append(`
			<div class="fuzzy-search-bar-container">
				<input id="climber-search-bar" class="fuzzy-search-bar" placeholder="Search climbers" autocomplete="__never">
				<img class="search-bar-icon" src="imgs/search_icon_50px.svg">
				<div class="climber-search-filter-container">	
					<div class="field-container checkbox-field-container">
						<label class="checkmark-container">
							<input id="guide-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter" type="checkbox" name="guide_only">
							<span class="checkmark data-input-checkmark"></span>
						</label>
						<label class="field-label checkbox-label text-nowrap" for="guide-only-filter">Commercial guide</label>
					</div>	
					<div class="field-container checkbox-field-container ml-4">
						<label class="checkmark-container">
							<input id="7-day-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter" type="checkbox" name="7_day_only">
							<span class="checkmark data-input-checkmark"></span>
						</label>
						<label class="field-label checkbox-label" for="7-day-only-filter">7-day only</label>
					</div>
				</div>
			</div>
			<div class="query-result-container">
				<!-- order is switched between result and details pane so I can use .collapsed ~ -->
				<div class="query-result-pane result-details-pane collapsed uneditable" aria-hidden="true">
					<div class="query-result-edit-button-container">
						<button id="add-new-climber-button" class="generic-button" title="Create new climber">Add new climber</button>
					</div>

				</div>
				<div class="query-result-pane result-summary-pane">
					<div id="result-navigation-header" class="hidden-on-invalid-result">
						<div class="result-navigation-container">
							<button class="icon-button show-previous-result-set-button disabled" role="button" title="Show previous page">
								<i class="fa fa-chevron-left"></i>
							</button>
							<label class="result-index-label hidden" aria-live="polite" aria-hidden="true">
								<span id="min-record-index-span"></span>-<span id="max-record-index-span"></span> of <span id="total-records-span"></span>
							</label>
							<button class="icon-button show-next-result-set-button" role="button" title="Show next page">
								<i class="fa fa-chevron-right"></i>
							</button>
						</div>
					</div>

					<div class="query-result-list-container hidden-on-invalid-result">
						<div id="result-summary-header-row" class="query-result-list-item header-row hidden-on-invalid-result" role="row">
							<label class="result-summary-label col" role="gridcell">Full Name</label>
							<label class="result-summary-label col" role="gridcell">Locale</label>
							<label class="result-summary-label col" role="gridcell">Last Group Name</label>
						</div>
						<ul class="query-result-list" role="grid" aria-live="polite">
						</ul>
					</div>
					<div class="empty-result-message hidden" aria-hidden="true">Oops! No climbers match your search.</div>
				</div>
			</div>
		`);
		
		this.climberForm = new ClimberForm(this, '.query-result-pane.result-details-pane');

		// Set tab indices
		var liTabIndex = this.getNextTabIndex();
		for (const el of $('#climber-search-bar,  .result-navigation-container button')) {
			el.tabIndex = liTabIndex;
			liTabIndex++;
		}

		// When a .input-field changes, register the change in the .edits object
		// 	add event handler here so that expeditions (which also adds a ClimberForm()) page doesn't register events twice
		$('.climber-form .input-field').change(e => {
			this.climberForm.onInputChange(e);
		});

		// When a user types anything in the search bar, filter the climber results.
		$('#climber-search-bar').keyup(() => {
			const $input = $('#climber-search-bar');
			const searchString = $input.val();
			
			if (searchString.length >= 3 || searchString.length === 0) {
				this.queryClimbers({searchString: searchString});
				this.currentRecordSetIndex = 1;
			}
		});

		$('.climber-search-filter').change(e => {
			const $input = $('#climber-search-bar');
			const searchString = $input.val();
			// If the search string is empty, search without a search string
			if (searchString.length === 0) {
				this.queryClimbers();
				this.currentRecordSetIndex = 1;
			} 
			// Otherwise, only search if the search string is >=3 characters 
			else if (searchString.length >= 3) {
				this.queryClimbers({searchString: searchString});
				this.currentRecordSetIndex = 1;
			}
		});

		// Configure click events for the result nav buttons
		$('.show-previous-result-set-button, .show-next-result-set-button').click(e => {
			// Check if the next button was clicked. If not, then the "previous" button was clicked
			const nextButtonWasClicked = $(e.target).closest('button').is('.show-next-result-set-button');
			this.getResultSet({isNext: nextButtonWasClicked});
		});

		// Handle global keydown events
		$(window).keydown(e => {
			// Detect ctrl + enter events
			if (e.which === 13 && e.ctrlKey) {
				// If the user has focus on an input in the resul-details-pane, move focus to 
				if ($('.result-details-pane :focus') && e.shiftKey) {
					$('.query-result-list-item.selected').focus()
				} 
				// Otherwise, focus on the first .input-field in the resul-details-pane
				else {
					$('.result-details-pane:not(.collapsed) .input-field').first().focus();
				}
			}
		});

		$('.card-label-field').change(e => {
			this.onCardLabelFieldChange($(e.target).closest('.input-field'));
		});

		// $('#input-received_pro_pin').change(e => {
		// 	$('#pro-pin-badge').ariaHide(!$(e.target).prop('checked'));
		// });
		$('#input-is_guide').change(e => {
			$('#guide-badge').ariaHide(!$(e.target).prop('checked'));
		});

		$('.add-card-button').click(e => {
			const $button = $(e.target).closest('button');
			const $accordion = $($button.data('target'));
			const $card = this.addNewCard($accordion, {cardLinkText: 'New Emergency Contact', newCardClass: 'new-card'});
		});

		$('#add-new-climber-button').click(e => {
			this.onAddNewClimberClick(e)
		});

		$('#modal-save-climber-button').click(e => {this.onSaveModalClimberClick(e)});
		$('.delete-climber-button').click(e => {this.onDeleteClimberClick(e)})
	}


	/*
	*/
	showModalClimberForm($climberForm=null) {
		
		if ($climberForm === null) $climberForm = $('.climber-form');

		$climberForm.addClass('climberdb-modal');

		$('.result-details-pane')
			.removeClass('uneditable')
			.addClass('collapsed');
		this.clearInputFields({parent: $climberForm, triggerChange: false});

		// Make sure required fields are not required for new climbers because
		//	all the info isn't given at first
		$('#disable-required-switch-container').ariaHide(false);
		$('#disable-required-switch-container input[type=checkbox]').prop('checked', true).change();

		$climberForm.find('.result-details-header-badge').addClass('hidden');

		//$climberForm.find('#edit-button, #delete-button').ariaHide(true);

		//$('#save-button, .climber-form .delete-card-button').ariaHide(false);
		$('.climber-form .delete-card-button').ariaHide(false);

		$('#result-details-header-title').text('New Climber');
		$('#expedition-name-result-summary-item').ariaHide(true);
		$('#entered-by-result-summary-item > .result-details-summary-value').text(this.userInfo.ad_username);
		$('#entry-time-result-summary-item > .result-details-summary-value').text(
			(new Date()).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year:'numeric'})
		);

		const $contactsAccordion = $('#emergency-contacts-accordion');
		$contactsAccordion.find('.card:not(.cloneable)').remove();
		this.addNewCard($contactsAccordion, {newCardClass: 'new-card'});

		// Show the climber info tab
		$('#climber-info-tab').click();
	}


	/*
	Handle modal-save-climber-button events here because the things that need to happen 
	after a successful save will be different depending on where the modal form is shown
	from.
	*/
	saveModalClimber() {
		const deferred = this.climberForm.saveEdits();
		if (deferred) {	
			deferred.done(resultString => {
				if (!this.queryReturnedError(resultString) && resultString.length) {
					const firstName = $('#input-first_name').val();
					const lastName = $('#input-last_name').val();
					const climberName = `${firstName} ${lastName}`;
					$('#climber-search-bar').val(climberName);//.change();
					// Uncheck the filters in case this climber was marked as not a guide
					$('#7-day-only-filter, #guide-only-filter').prop('checked', false);

					this.queryClimbers({searchString: climberName})
						.done(() => {
							// Select 
							const climberID = $.parseJSON(resultString)[0].id;
							this.selectResultItem($(`#item-${climberID}`));
							this.climberForm.closeClimberForm($('.climber-form button.close'));
						});
					this.currentRecordSetIndex = 1;

				}
			});
		}
	}

	/*
	Check if a climber with the same name already exists. If so, make the user confrim that they want to create a climber with the same name
	*/
	onSaveModalClimberClick(e) {
		const firstName = $('#input-first_name').val(); 
		const middleName = $('#input-middle_name').val();
		const lastName = $('#input-last_name').val();
		const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`;
		this.queryDB(`SELECT id FROM climber_info_view WHERE full_name='${fullName}'`)
			.done(resultString => {
				if (!this.queryReturnedError(resultString)) {
					const result = $.parseJSON(resultString);
					const nClimbers = result.length;
					if (nClimbers) {
						// show modal
						const message = `Are you sure you want to create another climber with this name. There ${nClimbers > 1 ? 'are' : 'is'} already ${nClimbers} climber${nClimbers > 1 ? 's' : ''} with this name in the database. If you click yes, make sure you are not creating a duplicate climber.`
						const footerButtons = `
							<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
							<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.saveModalClimber()">Yes</button>
						`;
						showModal(message, 'Possible Duplicate Climber', 'confirm', footerButtons);
					} else {
						this.saveModalClimber();
					}
				} else {
					this.saveModalClimber();
				}
			})
	}

	onAddNewClimberClick(e) {

		const $climberForm = this.climberForm.$el;
		if ($climberForm.find('.input-field.dirty').length) {
			this.climberForm.confirmSaveEdits('climberDB.showModalClimberForm()');
		} else {
			this.showModalClimberForm($climberForm);
		}
	}


	saveEdits() {
		this.climberForm.saveEdits();
	}

	/*
	Helper method to get the display value of a code-value pair from a select using the 
	given code value
	*/
	getValueFromOption($select, code) {
		return $select
			.find('option')
			.filter((_, el) => el.value == code) // user css [value=""]
			.text();
	}


	/*
	Select a climber from the list
	*/
	selectResultItem($item) {

		// Reset because this will get filled with the selected climber's data by setInputFieldValue()
		this.climberForm.selectedClimberInfo = {};
		
		//hide badges because they'll be shown later if necessary
		$('.result-details-header-badge').ariaHide(true); 

		// If currently editing (and this item is not currently selected, turn editing it off
		if ($('.result-details-pane').is('*:not(.uneditable)') && $item.is('*:not(.selected)')) {
			this.climberForm.toggleEditing(false); //turn editing off
		}
		// Deselect currently selected record
		$('.query-result-list-item.selected').removeClass('selected');
		
		// Select this record
		$item.addClass('selected');
		
		const climberID = $item.attr('id').replace('item-', '');
		const climberIndex = this.climberIDs[climberID];
		const climberInfo = this.climberInfo[climberIndex];
		this.climberForm.fillClimberForm(climberID, climberInfo);

		// Make sure required fields are required
		$('#disable-required-switch-container input[type=checkbox]').prop('checked', false).change();
		
	}


	confirmSelectResultItem($item) {

		if ($('.climber-form .input-field.dirty').length) {
			const afterActionCallbackStr = `climberDB.selectResultItem($('#${$item.attr('id')}'))`;
			this.climberForm.confirmSaveEdits(afterActionCallbackStr);
		} else {
			this.selectResultItem($item)
		}
	}

	/*
	*/
	fillResultList(climberInfo, autoSelectFirst=false) {

		const currentSelectedID = ($('.query-result-list-item.selected').attr('id') || '').replace('item-', '');

		// Empty the list
		const $list = $('.query-result-list');
		$('.query-result-list-item:not(.header-row)').remove();

		// Hide the no-result message
		$('.empty-result-message').ariaHide(true);
		$('.hidden-on-invalid-result').ariaHide(false);

		// Add the climbers
		var liTabIndex = this.getNextTabIndex();
		for (const i in climberInfo) {
			const climber = climberInfo[i];
			const state = Object.keys(this.stateCodes).includes(climber.state_code) && climber.city ?
				this.stateCodes[climber.state_code].short_name :
				this.getValueFromOption($('#input-state'), climber.state_code);
			const stateOrCountry = state || this.getValueFromOption($('#input-country'), climber.country_code);
			var localeString = `${climber.city ? climber.city + ', ' : ''}${stateOrCountry}`;

			$list.append(`
				<li id="item-${climber.id}" class="query-result-list-item ${climber.id == currentSelectedID ? 'selected' : ''}" role="row" tabindex=${liTabIndex}>
					<label class="result-summary-label col" role="gridcell">${climber.full_name}</label>
					<label class="result-summary-label col" role="gridcell">${localeString || '<em>no locale entered</em>'}</label>
					<label class="result-summary-label col" role="gridcell">${climber.expedition_name || '<em>None</em>'}</label>
				</li>
			`);
			liTabIndex ++;
		}

		$('.query-result-list-item:not(.header-row)')
			.click(e => {
				// Only select the item if it isn't already selected
				const $item = $(e.target).closest('.query-result-list-item');
				if ($item.is('.selected')) {
					this.selectResultItem($item);
				} else {
					this.confirmSelectResultItem($item);
				}
				e.stopImmediatePropagation(); // prevent focus
			}).focus(e => { // user tabbed to another result-item
				// Only select the item if it isn't already selected
				const $item = $(e.target);
				if ($item.is('.selected')) return;
				this.confirmSelectResultItem($(e.target));
			});

		const $selectedItem = $('.query-result-list-item.selected');
		// Select first
		if (autoSelectFirst) {
			const $first = $('.query-result-list-item:not(.header-row)').first();
			this.selectResultItem($first);
			$first[0].scrollIntoView();
		} else if (!$selectedItem.length) {
			$('.result-details-pane .input-field').val(null);
			$('.result-details-pane')
				.addClass('collapsed')
				.attr('aria-hidden', true);
		} else {
			$selectedItem[0].scrollIntoView();
		}
	}


	/*Get climber data*/
	queryClimbers({searchString='', minIndex=1, climberID=undefined} = {}) {
		const withSearchString = searchString.length > 0;
		var minIndex = minIndex; // not sure why but for some reason this needs to be used here to be defined later
		
		var whereClause = '';
		if ($('#7-day-only-filter').prop('checked')) 
			whereClause += ' WHERE climber_info_view.id IN (SELECT climber_id FROM seven_day_rule_view)';
		if ($('#guide-only-filter').prop('checked')) 
			whereClause += whereClause ? ' AND is_guide' : ' WHERE is_guide';

		const [sql, coreQuery] = this.getClimberQuerySQL({
			searchString: searchString, 
			minIndex: minIndex, 
			climberID: climberID,
			coreWhereClause: whereClause
		});
		return this.queryDB(sql, {returnTimestamp: true})
		//return this.queryDB(sql)
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					// result was empty so let the user know
					if (withSearchString) {
						$('.query-result-list-item:not(.header-row)').remove()
						$('.empty-result-message').ariaHide(false);
						$('.hidden-on-invalid-result').ariaHide(true);
						$('.result-details-pane').addClass('collapsed');
					} else { // some other problem
						showModal('Retrieving climber info from the database failed because because ' + queryResultString, 'Database Error');
					}
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
					if (!result.length) {
						$('.query-result-list-item:not(.header-row)').remove()
						$('.empty-result-message').ariaHide(false);
						$('.hidden-on-invalid-result').ariaHide(true);
						$('.result-details-pane').addClass('collapsed');
						return;
					}

					this.climberInfo = [...result];
					for (const i in this.climberInfo) {
						let id = this.climberInfo[i].id;
						this.climberIDs[id] = i;
					}
					this.fillResultList(this.climberInfo, !withSearchString);

					// Update index
					if (isNaN(climberID)) {
						const rowNumbers = this.climberInfo.map(i => parseInt(i.row_number));
						minIndex = minIndex || Math.min(...rowNumbers);
						let maxIndex = Math.max(...rowNumbers);
						const countSQL = `SELECT count(*) FROM (${coreQuery}) t;`
						this.queryDB(countSQL).done((resultString) => {
							if (this.queryReturnedError(resultString)) {

							} else {
								const countResult = $.parseJSON(resultString);
								if (countResult.length) {
									// Show the currently loaded range of climber results
									const count = countResult[0].count;
									$('#min-record-index-span').text(minIndex);
									$('#max-record-index-span').text(Math.min(maxIndex, count));
									$('#total-records-span').text(count);
									$('.result-index-label').ariaHide(false);
									$('.show-next-result-set-button').prop('disabled', maxIndex === parseInt(count));
									$('.show-previous-result-set-button').prop('disabled', minIndex === 1);
								}

							}
						});
					} else {
						$('#min-record-index-span').text(1);
						$('#max-record-index-span').text(1);
						$('#total-records-span').text(1);
						$('.result-index-label').ariaHide(false);
						$('.show-next-result-set-button').prop('disabled', true);
						$('.show-previous-result-set-button').prop('disabled', true);
					}
					
				}
			}).fail((xhr, status, error) => {
				showModal('Retrieving climber info from the database failed because because ' + error, 'Database Error')
			})
	}


	queryClimberByID(climberID) {
		const deferred = this.queryClimbers({climberID: climberID})
			.done(queryResultString => {
				if (!this.queryReturnedError(queryResultString)) {
					this.currentRecordSetIndex = 1;
				}
			});
		
		return deferred;
	}

	/*
	Helper method to get next (or previous) set of results
	*/
	getResultSet({isNext=true}={}) {

		this.currentRecordSetIndex += isNext ? 1 : -1
		const maxIndex = this.currentRecordSetIndex * this.recordsPerSet;
		const minIndex = maxIndex - this.recordsPerSet + 1;

		const $input = $('#climber-search-bar');
		const value = $input.val();
		var searchString = value.length >= 3 || value.length === 0 ? value : '';

		return this.queryClimbers({searchString: searchString, minIndex: minIndex});
	}


	/*
	Do stuff specific to climbers.html when the result is returned succesfully.
	This CLimberForm.detelClimber() handles generic errors
	*/
	deleteClimber(climberID) {

		this.climberForm.deleteClimber(climberID)
			.done(queryResultString => {
				if (!this.queryReturnedError(queryResultString)) {
					const $item = $(`#item-${climberID}`);
					const $nextItem = $item.next().length ? $item.next() : $item.prev();
					$item.fadeOut(500, () => {$item.remove()});
					
					if ($nextItem.length) {
						this.selectResultItem($nextItem);
						$nextItem[0].scrollIntoView();

						// Adjust record set
						const $minSpan = $('#min-record-index-span');
						const $maxSpan = $('#max-record-index-span');
						const $totalSpan = $('#total-records-span');
						$maxSpan.text($maxSpan.text() - 1);
						$totalSpan.text($totalSpan - 1);	
					} else { // This was the last climber so get the next result set
						$('.empty-result-message').ariaHide(false);
						this.getResultSet();
					}
					
		

				}
			})
	}


	/*
	Ask the user to confirm deleting the selected climber
	*/
	onDeleteClimberClick(e) {
		const currentIndex = $('.query-result-list-item.selected').index();
		const climberInfo = this.climberInfo[currentIndex];

		// If this isn't an admin, check if the climber belongs to any expeditions
		if (this.userInfo.user_role_code < 3) {
			if (climberInfo.expedition_name) { // will be null if climber isn't/wasn't on any expeditions
				showModal(`You can't delete ${climberInfo.first_name} ${climberInfo.last_name}'s climber profile because they are a member of at least one expedition. You must remove them from all expeditions they're a member of before their profile can be deleted.`, 'Invalid Operation')
				return;
			}
		}

		const climberID = $('.query-result-list-item.selected').attr('id').replace('item-','');
		const onConfirmClick = `
			climberDB.deleteClimber(${climberID});
		`;
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">Yes</button>
		`;
		let message = `Are you sure you want to <strong>permanently delete this climber</strong>? This action cannot be undone`;
		if (climberInfo.expedition_name) message += ' and all information about their climbs will be delete including transaction history, medical issues, and whether or not they summited.'
		showModal(message, `Delete climber?`, 'confirm', footerButtons);
	}

	init() {

		// Call super.init()
		this.showLoadingIndicator('init');
		var deferreds = super.init();
		
		// $('.sidebar-nav-group > .nav-item.selected').removeClass('selected');
		// $('.sidebar-nav-group .nav-item > a')
		// 	.filter((_, el) => el.href.endsWith('climbers.html'))
		// 	.parent()
		// 		.addClass('selected');

		// Do additional synchronous initialization stuff
		this.configureMainContent();

		// Get state and route codes first if they haven't been queried yet.
		//	This needs to happen before filling the result-summary-pane
		//	because fillResultList() substitue state_codes for the short_name
		const lookupDeferreds = [];
		if (Object.keys(this.stateCodes).length === 0) {
			lookupDeferreds.push(
				this.queryDB('SELECT * FROM state_codes')
					.done((queryResultString) => {
						if (!this.queryReturnedError(queryResultString)) {
							for (const state of $.parseJSON(queryResultString)) {
								this.stateCodes[state.code] = {...state};
							}
						}
					})
			)
		}
		if (Object.keys(this.stateCodes).length === 0) {
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
		$.when(this.fillAllSelectOptions(), ...lookupDeferreds).then(() => {
			var urlParams = this.parseURLQueryString();
			const queryDeferred = urlParams.id  ?
				this.queryClimberByID(urlParams.id) :
				this.getResultSet();

			queryDeferred.always(()=>{
				$.when(...deferreds)
					.done(() => {
						if (urlParams.id) {
							if (urlParams.edit) {
								this.climberForm.toggleEditing(true);
							}
						} else if (urlParams.addClimber) {
							this.showModalClimberForm(this.climberForm.$el);
						}
					})
					.always(() => {this.hideLoadingIndicator()});
			});
		});

		return deferreds;
	}
}