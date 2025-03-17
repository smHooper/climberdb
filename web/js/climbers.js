
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
							<button id="edit-button" class="query-result-edit-button icon-button toggle-editing-button" type="button" aria-label="Edit selected climber" title="Edit climber">
								<i class="fas fa-edit"></i>
								<label class="icon-button-label">edit</label>
							</button>
							<button id="save-button" class="query-result-edit-button icon-button save-edits-button hidden" type="button" aria-label="Save edits" title="Save edits">
								<i class="fas fa-save"></i>
								<label class="icon-button-label">save</label>
							</button>
							<button id="delete-button" class="query-result-edit-button icon-button delete-climber-button hidden" type="button" aria-label="Delete selected climber" title="Delete climber">
								<i class="fas fa-trash"></i>
								<label class="icon-button-label">delete</label>
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
								<textarea id="modal-climber-search-bar" class="fuzzy-search-bar climber-search-select-filter no-click-trigger-on-enter" placeholder="Type to filter climbers" title="Type to filter climbers" autocomplete="__never"></textarea>
								<img class="search-bar-icon" src="imgs/search_icon_50px.svg">
							</div>	
							<div class="modal-climber-select-container collapse">
								<select id="modal-climber-select" class="fuzzy-search-bar climber-select default ml-1">
									<option value="">Search climbers to filter results</option>
								</select>
								<button id="refresh-modal-climber-select" class="icon-button" title="Refresh climber search results">
									<i class="fas fa-sync-alt fa-solid fa-arrows-rotate fa-2x"></i>
									<label class="icon-button-label">reload</label>
								</button>
							</div>	
						</div>	
						<div class="expedition-modal-search-container" aria-hidden="true">
							<div class="field-container checkbox-field-container always-editable col-sm-3 pl-3">
								<label class="checkmark-container">
									<input id="guide-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter guide-only-filter" type="checkbox" name="guide_only" aria-labelledby="guide-only-filter-label">
									<span class="checkmark data-input-checkmark"></span>
								</label>
								<label id="guide-only-filter-label" class="field-label checkbox-label" for="guide-only-filter">Commercial guide</label>
							</div>	
							<div class="field-container checkbox-field-container always-editable col-sm-3 pl-3">
								<label class="checkmark-container">
									<input id="7-day-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter 7-day-only-filter" type="checkbox" name="7_day_only" aria-labelledby="7-day-only-filter">
									<span class="checkmark data-input-checkmark"></span>
								</label>
								<label id="7-day-only-filter-label" class="field-label checkbox-label" for="7-day-only-filter">7-day only</label>
							</div>
							<div class="col-sm-6 px-0 d-flex justify-content-end">
								<span id="climber-search-result-count" class="climber-search-result-count pr-5 hidden" aria-hidden="true"></span>
								<div id="climber-search-option-loading-indicator" class="climber-search-option-loading-indicator loading-indicator-dot-container pr-5 hidden" aria-hidden="true">
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
										<select id="input-state" class="input-field default" name="state_code" data-table-name="climbers" placeholder="State/province" title="State" type="text" autocomplete="__never" required="" data-dependent-target="#input-country" data-dependent-value="236|40"></select>
										<span class="required-indicator">*</span>
										<label class="field-label" for="input-state">State/province</label>
										<span class="null-input-indicator">&lt; null &gt;</span>
									</div>		
									<div class="field-container col-sm-6 collapse">
										<input id="input-other_state_name" class="input-field" type="text" name="other_state_name" data-table-name="climbers" placeholder="State/province" title="State" type="text" autocomplete="__never" data-dependent-target="#input-country" data-dependent-value="!236|40">
										<label class="field-label" for="input-other_state_name">State/province</label>
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
										<input id="input-dob" class="input-field record-current-value" name="dob" data-table-name="climbers" placeholder="D.O.B." title="D.O.B." type="date" autocomplete="__never">
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
									<div class="card cloneable hidden" id="cloneable-card-emergency-contacts" data-table-name="emergency_contacts" data-label-template="first_name last_name, relationship">
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
														<select id="input-state_contact" class="input-field default" name="state_code" data-table-name="emergency_contacts" placeholder="State/province" title="State/province" data-dependent-target="#input-country_contact" data-dependent-value="236,40"></select>
														<label class="field-label" for="input-state_contact">State</label>
														<span class="null-input-indicator">&lt; null &gt;</span>
													</div>	
													<div class="field-container col-sm-6 collapse">
														<input id="input-other_state_contact" class="input-field default" name="other_state_name" data-table-name="emergency_contacts" placeholder="State/province" title="State" type="text" autocomplete="__never" data-dependent-target="#input-country_contact" data-dependent-value="!236,40">
														<label class="field-label" for="input-other_state_contact">State/province</label>
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

						<li id="merge-climber-list-item" class="hidden" aria-hidden="true">
							<input id="merge-climber-tab" class="tab-button" type="radio" name="tabs">
							<label for="merge-climber-tab" class="tab-label" role="tab" aria-selected="false" aria-controls="merge-climber-tab-content" tabindex="0">
								Merge Climbers
							</label>
							<div id="merge-climber-tab-content" class="tab-content" role="tabpanel" aria-labelledby="merge-climber-tab" aria-hidden="true">
								<div id="merge-climber-tab-content-header">
									<div id="merge-climber-instructions-container">
										<p id="merge-climber-instructions-text" class="w-100">Search for a climber profile to merge with 
											<span class="merge-climber-selected-name"></span>. After merging climber profiles, 
												<em>all expeditions associated with the climber selected below will be transferred to 
													<span class="merge-climber-selected-name"></span>
												</em> and 
												<span class="merge-climber-selected-name"></span>'s information will be retained.
												<button id="merge-climber-instructions-less-button" class="text-only-button merge-climber-instructions-button"> Less...</button>
											</span>
										</p>
										<div id="merge-climber-instructions-screen"></div>
									</div>
									<button id="merge-climber-instructions-more-button" class="text-only-button merge-climber-instructions-button" role="button" aria-hidden="false">More...</button> 
									<div class="climber-fuzzy-search-select-container" aria-hidden="true">
										<div class="fuzzy-search-bar-container col-6">
											<textarea id="merge-climber-search-bar" class="fuzzy-search-bar climber-search-select-filter no-click-trigger-on-enter" placeholder="Type to search for climbers" title="Type to filter climbers" autocomplete="__never"></textarea>
											<img class="search-bar-icon" src="imgs/search_icon_50px.svg">
										</div>	
										<div class="climber-select-container collapse">
											<select id="merge-climber-select" class="fuzzy-search-bar climber-select default ml-1">
												<option value="">Search climbers to filter results</option>
											</select>
										</div>	
									</div>	
									<div class="climber-fuzzy-search-select-container" aria-hidden="true">
										<div class="field-container checkbox-field-container always-editable col-md-6 pl-3">
											<label class="checkmark-container">
												<input id="merge-guide-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter guide-only-filter merge-climber-filter" type="checkbox" name="guide_only" aria-labelledby="guide-only-filter-label">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label id="merge-guide-only-filter-label" class="field-label checkbox-label" for="merge-guide-only-filter">Commercial guide</label>
										</div>	
										<!--<div class="field-container checkbox-field-container always-editable col-sm-3 pl-3">
											<label class="checkmark-container">
												<input id="merge-7-day-only-filter" class="input-field input-checkbox ignore-on-change climber-search-filter 7-day-only-filter merge-climber-filter" type="checkbox" name="7_day_only" aria-labelledby="merge-7-day-only-filter-label">
												<span class="checkmark data-input-checkmark"></span>
											</label>
											<label id="merge-7-day-only-filter-label" class="field-label checkbox-label" for="merge-7-day-only-filter">7-day only</label>
										</div>-->
										<div class="col-sm-6 px-0 d-flex justify-content-end">
											<span class="climber-search-result-count pr-5 hidden" aria-hidden="true"></span>
											<div id="climber-search-option-loading-indicator" class="climber-search-option-loading-indicator loading-indicator-dot-container pr-5 hidden" aria-hidden="true">
												<div class="loading-indicator-dot dot1"></div>
												<div class="loading-indicator-dot dot2"></div>
												<div class="loading-indicator-dot dot3"></div>
											</div>
										</div>
									</div>
								</div>
								<div class="merge-climber-details-container collapse mt-3">
									<div class="w-100 d-flex justify-content-between">
										<h4 class="col pl-0 merge-climber-name selected-merge-climber-text"></h4>
										<label class="col text-right result-details-summary-value merge-climber-entry-metadata-label"></label>
									</div>
									<p class="merge-climber-address selected-merge-climber-text mb-2"></p>
									<div class="w-100 d-flex"> 
										<label class="merge-climber-phone-label mr-5" class="merge-info-icon-label">
											<i class="fa fa-solid fas fa-phone"></i>
											<span class="ml-2"></span>
										</label> 
										<label class="merge-climber-email-label" class="merge-info-icon-label">
											<i class="fa fa-solid fas fa-envelope"></i>
											<span class="ml-2"></span>
										</label>
									</div>
									<label class="merge-climber-dob-label"></label>
									<h5 class="mt-3">Previous Expeditions</h5>
									<ul class="merge-climber-history-list">
									</ul>
									<div class="w-100 d-flex justify-content-center mt-3">
										<button id="merge-climber-button" class="generic-button" role="button">Merge climbers</button>
									</div>
								</div>
							</div>
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
			this.onEditButtonClick(e);
		});

		$('#save-button').click(e => {
			this.saveEdits()
		});

		$('.climber-form .delete-card-button').click(e => {
			this.onDeleteCardButtonClick(e)
		});

		$('#disable-required-switch-container input[type=checkbox]').change(e => {
			this.onToggleRequiredChange(e);
		})

		$('.input-field[name=dob]').blur(e => {
			this.onDateOfBirthBlur(e);
		});
		$('.input-field[name=age]').change(e => {
			this.onAgeFieldChange(e);
		})

		// Country/state lookup from postal code
		$(document).on('change', '.zip-lookup-field', e => {this.onPostalCodeFieldChange(e)});
		
		// Get country and state short_name/codes for city/state lookup from postal code
		// 	The constructor for the climber form is called syncronously so the DB schema
		//	has not yet been queried. Since these are unlikely to differ from the default
		//	schema (i.e., public), just query the default
		this._parent.queryDB({tables: ['country_codes']})
			.done(response => {
				for (const row of response.data || []) {
					this.countryCodes[row.code] = row.short_name;
				}
			});	
		this._parent.queryDB({tables: ['state_codes']})
			.done(response => {
				for (const row of response.data || []) {
					// Need to get code from abbreviation for API response
					this.stateCodes[row.short_name] = row.code;
				}
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

		this._parent.toggleBeforeUnload(true);

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
		if (valuesAreEqual(dbValue, $input.val())) {
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

		// If there are no more dirty inputs, toggle beforeunload event
		if (!$('.input-field.dirty:not(.filled-by-default)').length) {
			this._parent.toggleBeforeUnload(false);
		}
	}


	onPostalCodeFieldChange(e) {
		const $container = $(e.target).closest('.field-container-row').parent();
		const countryCode = $container.find('.input-field[name=country_code]').val();
		var postalCode = $container.find('.input-field[name=postal_code]').val();
		// Canadian postal codes look-ups only work with the first 3 characters
		if (countryCode == 40) postalCode = postalCode.slice(0, 3);
		
		if (!(countryCode && postalCode)) return;

		const countryAbbreviation = this.countryCodes[countryCode]

		$.get(`https://api.zippopotam.us/${countryAbbreviation}/${postalCode}`).done(response => {
			if ('places' in response) {
				const details = response.places[0];
				if ('place name' in details) {
					// Update city. Look within the container since both climber and emerg. 
					//	contact info have fields with the same name attr.
					$container.find('.input-field[name=city]')
						.val(details['place name'].split('(')[0].trim())
						.change();
					
					// If the country is the US or Canada, update the state
					if (['US', 'CA'].includes(countryAbbreviation)) {
						const stateCode = this.stateCodes[details['state abbreviation']] || '';
						$container.find('.input-field[name=state_code]')
							.val(stateCode)
							.change();
					// If it's somewhere else, make sure 'state' is in the response JSON. If so,
					//	set the international state name field
					} else if ('state' in details) {
						$container.find('.input-field[name=other_state_name]')
							.val(details.state)
							.change();
					}
				}
			}
		});

	}

	/*
	Update age field when DOB changes. This happens when the field loses focus so that 
	when the user types, the age doesn't change with each key stroke
	*/
	onDateOfBirthBlur(e) {
		if (!e.originalEvent) return;

		const $dobField = $(e.target);
		const dob = $dobField.val();
		const $ageField = $('.input-field[name="age"]');

		// Don't do anything if the DOB is null or didn't change
		if (!dob || dob === $dobField.data('current-value')) return;

		const birthdate = new Date(dob + ' 00:00');
		const calculatedAge = Math.floor((new Date() - birthdate) / (this.constants || this._parent.constants).millisecondsPerDay / 365);
		const enteredAge = $ageField.val();
		if (enteredAge && enteredAge != calculatedAge) {
			const message = `You changed this climber's D.O.B. to a date that conflicts with the currently entered age. Would you like to update the climber's age to ${calculatedAge}?`;
			const footerButtons = 
				'<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">No</button>' +
				'<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">Yes</button>';
			const eventHandler = () => {
				$('#alert-modal .confirm-button').click(() => {
					$ageField.val(calculatedAge).change();
				})
			}
			const modalArgs = {
				modalType: 'confirm', 
				footerButtons: footerButtons, 
				eventHandlerCallable: eventHandler, 
				modalMessageQueue: this._parent.modalMessageQueue
			}
			this._parent.showModal(message, 'Update Climber Age?', modalArgs);
		} else {
			$ageField.val(calculatedAge).change();
		}

	}


	/*
	Warn the user when the age changes and it differs from the calculated age according to the DOB
	*/
	onAgeFieldChange(e) {
		// To avoid an endless loop, make sure this isn't a manually triggered event	
		if (!e.originalEvent) return;

		const $ageField = $(e.target);
		const age = $ageField.val();
		const $dobField = $('.input-field[name="dob"]');
		const dob = $dobField.val();

		if (!dob || !age) return;

		const birthdate = new Date(dob + ' 00:00');
		const calculatedAge = Math.floor((new Date() - birthdate) / (this.constants || this._parent.constants).millisecondsPerDay / 365);
		const enteredAge = $ageField.val();

		if (calculatedAge != enteredAge) {
			const message = `You entered this climber's age as ${enteredAge}, but this conflicts with the climber's D.O.B. Make sure the data you've entered in both of these fields is correct.`;
			this._parent.showModal(message, 'WARNING: Age Conflicts with D.O.B.', {modalMessageQueue: this._parent.modalMessageQueue});
		}

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
		const isInsert = $('.climber-form .input-field')
			.get()
			.every(el => !$(el).data('table-id'));

		const afterCloseCallBack = () => {
			this.closeClimberForm($button);
		}
		if ($('.climber-form .input-field.dirty').length) {
			// Don't offer a save option, just discard and cancel
			if (isInsert) {
				const footerButtons = `
					<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
					<button 
						class="generic-button modal-button danger-button close-modal discard-button" 
						data-dismiss="modal">Discard</button>
				`;
				const message = 
					`You've made changes to the cliimber form. Are you sure you want to close` + 
					' the form and discard these edits? To continue editing or save your edits, click cancel.';
				const eventHandler = () => ($('#alert-modal .discard-button').click(() => {afterCloseCallBack.call()}))
				const modalArgs = {
					modalType: 'confirm', 
					footerButtons: footerButtons, 
					eventHandlerCallable: eventHandler,
					modalMessageQueue: this._parent.modalMessageQueue
				}
				this._parent.showModal(message, 'Discard climber edits?', modalArgs);
			} else {
				// User can save, discard, or cancel
				this.confirmSaveEdits(afterCloseCallBack);
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

		this.queryClimberHistory(parseInt(climberID));

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
			const formattedDeparture = (new Date(row.actual_departure_date)).toLocaleDateString(); //add a time otherwise the date will be a day before
			const actualReturnDate = new Date(row.actual_return_date);
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

			receivedProPin = receivedProPin || row.received_pro_pin;
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
			const soloDeferred = this._parent.queryDB({
				where: {
					solo_climbs_view: [
						{column_name: 'climber_id', operator: '=', comparand: climberHistory[0].climber_id}
					]
				}
			}).done(response => {
				if (this._parent.pythonReturnedError(response)) {
					console.log('could not get solo info because ' + response)
				} else {
					const result = response.data || [];
					for (const row of result) {
						// Mark the history card as a solo climb
						const cardIndex = expeditionMemberIDs[row.expedition_member_id];
						const $card = $newCards.eq(cardIndex);
						$card.find('.card-link-label').text($card.find('.card-link').text() + ' - solo');
					}
				}
			}).fail((xhr, status, error) => {
				this._parent.showModal('Retrieving climber history from the database failed because ' + error, 'Database Error')
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
		const historyDeferred = this._parent.queryDB({
				where: {
					climber_history_view: [
						{column_name: 'climber_id', operator: '=', comparand: climberID}
					]
				}
			}).done(response => {
				if (!this._parent.pythonReturnedError(response, {errorExplanation: 'Retrieving climber history from the database failed.'})) {
					this.fillClimberHistory(response.data || []);
				}
			})
			.fail((xhr, status, error) => {
				this._parent.showModal('Retrieving climber history from the database failed.' + this._parent.getDBContactMessage(), 'Database Error')
			});

		const contactsDeferred = this._parent.queryDB({
				where: {
					emergency_contacts: [
						{column_name: 'climber_id', operator: '=', comparand: climberID}
					]
				}
			}).done(response => {
				if (!this._parent.pythonReturnedError(response, {errorExplanation: 'Retrieving emergency contacts from the database failed.'})) {
					this.fillEmergencyContacts(response.data || []);
				}
			})
			.fail((xhr, status, error) => {
				this._parent.showModal('Retrieving emergency contact info from the database failed.' + this._parent.getDBContactMessage(), 'Database Error')
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

		// turn off the beforeunload event listener
		this._parent.toggleBeforeUnload(false);
	}


	/*
	Save edits to climber info. Edits are either changes to a climber's information 
	or related records (i.e., emergency contacts) or completely new 
	climber inserts (if the form is being shown as a modal)
	*/
	saveEdits() {

		const now = getFormattedTimestamp(new Date(), {format: 'datetime'});
		const userName = this._parent.userInfo.ad_username;
		
		const inputSelector = '.input-field.dirty';
		if ($(inputSelector).length === 0) {
			this._parent.showModal("You have not made any edits to save yet. Add or change this climber's information and then try to save it.", "No Edits To Save");
			return $.Deferred().resolve('');
		}

		// If the user disabled required fields, still validate first and last name fields. Otherwise, validate all
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
			this._parent.showModal(message, 'Required Field Is Empty');
			return;
		};

		showLoadingIndicator('saveEdits');

		let inserts = {},
			updates = {},
			lastModifiedAttributes = {
				last_modified_by: userName,
				last_modified_time: now
			},
			climberEdits = {...lastModifiedAttributes};
		// Get edits to climber
		const $climberInputs = $(`#climber-info-tab-content ${inputSelector}`)
		for (const el of $climberInputs) {
			climberEdits[el.name] = this._parent.getInputFieldValue($(el));
		}

		var climberID = $('#climber-info-tab-content').data('table-id');
		const climberHasEdits = !!Object.keys(climberEdits).length;
		if (climberHasEdits) {
			if (climberID) {
				updates.climbers = {[climberID]: climberEdits}
			} else {
				inserts.climbers = [{
					values: {
						...climberEdits,
						entered_by: userName,
						entry_time: now
					},
					html_id: 'climber-info-tab-content',
					children: {}
				}]
			}
		}

		// get edits to each emergency contact
		for (const el of $('#emergency-contacts-accordion .card:not(.cloneable)').has(inputSelector)) {
			const $card = $(el);
			const $inputs = $card.find(inputSelector);
			const dbID = $card.data('table-id');
			var values = {...lastModifiedAttributes};
			for (const el of $inputs) {
				values[el.name] = this._parent.getInputFieldValue($(el));
			}
			
			if (dbID) {
				(updates.emergency_contacts = updates.emergency_contacts || {})[dbID] = values;
			} else {
				// if there were no edits to the climber info, inserts.climbers won't exist
				if (!inserts.climbers) {
					inserts.climbers = [{
						id: climberID,
						children: {emergency_contacts: []}
					}]
				}
				// If this is the first emergency contact, create the array
				(inserts.climbers[0].children.emergency_contacts = inserts.climbers[0].children.emergency_contacts || [])
					// then add the changes for this contact
					.push({
						values: {
							...values,
							entered_by: userName,
							entry_time: now
						},
						html_id: $card.attr('id')
					})
			}
		}

		const requestData = {
			inserts: inserts,
			updates: updates,
			foreignColumns: this._parent.tableInfo.tables.emergency_contacts.foreignColumns
		}
		const formData = new FormData();
		formData.append('data', JSON.stringify(requestData));

		return $.post({
			url: '/flask/db/save',
			data: formData,
			contentType: false,
			processData: false
		}).done(response => {
			const errorMessage = 'An unexpected error occurred while saving data to the database.';
			if (this._parent.pythonReturnedError(response, {errorExplanation: errorMessage})) {
				return false;
			} else {
				const result = response.data || [];
				// add IDs to .data() attributes of HTML elements for each newly inserted record
				for (const {table_name, html_id, db_id} of result) {
					if (db_id == null || db_id === '') continue;

					// Set the card's class and inputs' attributes so it changes will register as updates
					//const {container, tableName} = inserts[i];
					const $container = $('#' + html_id)
						.removeClass('new-card')
						.data('table-name', table_name)
						.data('table-id', db_id);
					$container
						.find('.input-field')
							.data('table-name', table_name)
							.data('table-id', db_id);
					if (!(table_name in this.selectedClimberInfo)) this.selectedClimberInfo[table_name] = {};
					this.selectedClimberInfo[table_name][db_id] = {};
					for (const el of $container.find('.input-field')) {
						this.selectedClimberInfo[table_name][db_id][el.name] = el.value;
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

				// turn off the beforeunload event listener
				this._parent.toggleBeforeUnload(false);
			}
		}).fail((xhr, status, error) => {
			this._parent.showModal(`An unexpected error occurred while saving data to the database: ${error}.${this._parent.getDBContactMessage()}`, 'Unexpected error');
		}).always(() => {
			this._parent.hideLoadingIndicator();
		});
	}


	/*
	Prompt user to confirm or discard edits via modal
	*/
	confirmSaveEdits(afterActionCallback=()=>{}) {
		//@param afterActionCallbackStr: string of code to be appended to html onclick attribute
		const onConfirmClick = `

		`;
		const eventHandler = () => {
			// 
			$('#alert-modal .discard-button').click(() => {
				this.discardEdits();
				afterActionCallback.call();
			});
			$('#alert-modal .save-button').click(() => {
				showLoadingIndicator();
				this.saveEdits(); 
				afterActionCallback.call();
			});
		}
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal discard-button" data-dismiss="modal">Discard</button>
			<button class="generic-button modal-button primary-button close-modal save-button" data-dismiss="modal">Save</button>
		`;
		// climberDB is a global instance of ClimberDB or its subclasses that should be instantiated in each page
		// 	this is a little un-kosher because the ClimberForm() instance is probably a property of climberDB, but
		//	the only alternative is to make showModal a global function 
		this._parent.showModal(
			`You have unsaved edits to this climber. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this climber's info.`,
			'Save edits?',
			{
				modalType: 'alert',
				footerButtons: footerButtons,
				eventHandlerCallable: eventHandler,
				modalMessageQueue: this._parent.modalMessageQueue
			}
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
			const tableName = $card.data('table-name');
			if (!tableName) {
				print('No data-table-name attribute for #' + cardID);
				return $.Deferred().resolve(false);
			}

			const dbID = $card.data('table-id');
			if (!dbID) {
				print('No data-table-id attribute for #' + cardID);
				return $.Deferred().resolve(false);
			}

			return this._parent.deleteByID(tableName, dbID)
				.done(response => {
					if (!this._parent.pythonReturnedError(response, {errorExplanation: 'An unexpected error occurred while deleting data from the database.'})) {
						$card.fadeOut(500, () => {$card.remove()});
					}
				}).fail((xhr, status, error) => {
					this._parent.showModal(`An unexpected error occurred while deleting data from the database: ${error}.${this._parent.getDBContactMessage()}`, 'Unexpected error');
				}).always(() => {
					hideLoadingIndicator();
				});

		}
		
	}


	onDeleteCardButtonClick(e, afterActionCallbackStr='') {
		const $button = $(e.target).closest('.delete-card-button');
		const $card = $button.closest('.card');
		const itemName = $button.data('item-name') || $card.data('item-name');
		const onConfirmClickHandler = () => {
			$('#alert-modal .confirm-button').click(() => {
				this.deleteCard($card.attr('id'));
			});
		}
		
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button confirm-button danger-button close-modal" data-dismiss="modal">Yes</button>
		`;
		this._parent.showModal(
			`Are you sure you want to delete this ${itemName}?`, 
			`Delete ${itemName}?`, 
			{
				modalType: 'confirm', 
				footerButtons: footerButtons, 
				eventHandlerCallable: onConfirmClickHandler,
				modalMessageQueue: this._parent.modalMessageQueue
			}
		);

	}

	/*
	*/
	deleteClimber(climberID) {
		return this._parent.deleteByID('climbers', climberID)
			.done(response => {
				if (this._parent.pythonReturnedError(response, {errorExplanation: 'An unexpected error occurred while deleting data from the database.'})) {
					return;
				} 
			}).fail((xhr, status, error) => {
				this._parent.showModal(`An unexpected error occurred while deleting data from the database: ${error}.${this._parent.getDBContactMessage()}`, 'Unexpected error');
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
	toggleEditing({allowEdits=null, confirm=true}={}) {
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

		// toggle merge-climber-tab visibility
		const $mergeTabButton = $('#merge-climber-list-item').ariaHide(!allowEdits)
			.find('.tab-button');
		if ($mergeTabButton.is(':checked')) $('#climber-info-tab').click();
	}


	onEditButtonClick(e) {
		if (!this._parent.showDenyEditPermissionsMessage()) return;

		this.toggleEditing({allowEdits: $('.result-details-pane').is('.uneditable')});
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
		this.historyBuffer = []; // for keeping track of browser navigation via back and forward buttons
		this.currentHistoryIndex = 0;

		return this;
	}


	/* Set up containers for showing data/content*/
	configureMainContent() {
		
		this.climberForm = new ClimberForm(this, '.query-result-pane.result-details-pane');

		// Set tab indices
		var liTabIndex = this.getNextTabIndex();
		for (const el of $('#climber-search-bar,  .result-navigation-container button')) {
			el.tabIndex = liTabIndex;
			liTabIndex++;
		}

		// When a .input-field changes, register the change in the .edits object
		// 	add event handler here so that expeditions (which also adds a ClimberForm()) page doesn't register events twice
		$('.climber-form .input-field:not(.ignore-on-change)').change(e => {
			this.climberForm.onInputChange(e);
		});

		// When a user types anything in the search bar, filter the climber results.
		$('#climber-search-bar').keyup(e => {
			this.onClimberSearchKeyup(e)
		})
		// Prevent user from adding carriage return by pressing the enter key
		.keydown(e => {
			// If the user hit the enter to key, trying to submit, just ignore it becauae the search 
			//	will happen regardless and the enter key will add a carriage return
			if (e.key === 'Enter') return false;
		});

		$('.climber-search-filter').change(e => {
			// prevent 'Merge Climber' search from triggering a global climber search
			if ($(e.target).is('.merge-climber-filter')) return;

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

		window.onpopstate = e => {
			this.onPopState(e)
		}

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

		$(document).on('click', '.query-result-list-item:not(.header-row)', e => {
			this.onClimberResultItemClick(e)
		}).on('focus', '.query-result-list-item:not(.header-row)', e => { // user tabbed to another result-item
			this.onClimberResultItemFocus(e)
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
		
		$('.record-current-value').focus(e => {
			const $el = $(e.target);
			$el.data('current-value', $el.val());
		});

		// Show/hide the merge climber instructions in full
		$('.merge-climber-instructions-button').click(e => {
			const $button = $(e.target).ariaHide(true);
			$('#merge-climber-instructions-container').toggleClass('show');
			const $otherButton = $('.merge-climber-instructions-button').not($button)
				.ariaHide(false);
		});

		$('#merge-climber-search-bar').keyup(() => {
			this.onMergeClimberSearchKeyup();
		}).keydown(e => {
			// If the user hit the enter to key, trying to submit, just ignore it becauae the search 
			//	will happen regardless and the enter key will add a carriage return
			if (e.key === 'Enter') return false;
		});
		// guide and 7-day filters
		$('#merge-climber-tab-content .climber-search-filter').change(() => {
			this.onMergeClimberSearchKeyup();
		});

		$('#merge-climber-select').change(e => {
			this.onMergeClimberSelectChange(e);
		});

		$('#merge-climber-button').click(() => {
			this.onMergeClimberButtonClick();
		})
	}


	/*
	*/
	showModalClimberForm($climberForm=null) {
		
		if ($climberForm === null) $climberForm = $('.climber-form');

		$climberForm.addClass('climberdb-modal');

		// hide the merge climber tab
		$('#merge-climber-list-item').ariaHide(true);

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

		// clear the climber-id data attribute
		$('#climber-info-tab-content').data('table-id', '');
	}


	/*
	Search for climbers
	*/
	onClimberSearchKeyup(e) {
		const $input = $('#climber-search-bar');
		const searchString = $input.val();
		
		// Only query the DB if the search bar is either empty or has at least 3 characters
		if (searchString.length >= 3 || searchString.length === 0) {
			this.queryClimbers({searchString: searchString});
			this.currentRecordSetIndex = 1;
		}
	}


	/*
	Handle modal-save-climber-button events here because the things that need to happen 
	after a successful save will be different depending on where the modal form is shown
	from.
	*/
	saveModalClimber() {
		const deferred = this.climberForm.saveEdits();
		if (deferred) {	
			deferred.done(response => {
				if (!this.pythonReturnedError(response)) {
					const firstName = $('#input-first_name').val();
					const lastName = $('#input-last_name').val();
					const climberName = `${firstName} ${lastName}`;
					$('#climber-search-bar').val(climberName);//.change();
					// Uncheck the filters in case this climber was marked as not a guide
					$('#7-day-only-filter, #guide-only-filter').prop('checked', false);

					// query climbers by name. This will return multiple climbers, but one of them
					//	will be the newly created climber
					this.queryClimbers({searchString: climberName})
						.done(() => {
							// Select the new climber from the climber ID
							//	The climber ID will always be the first returned ID
							const climberID = response.data[0].db_id;
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
		const lastName = $('#input-last_name').val();
		const fullName = `${firstName} ${lastName}`;
		this.queryDB({
			where: {
				climber_info_view: [{
					column_name: 'full_name', operator: '=', comparand: fullName
				}]
			}
		}).done(response => {
			if (!this.pythonReturnedError(response)) {
				const result = response.data || [];
				const nClimbers = result.length;
				if (nClimbers) {
					// show modal
					const message = `Are you sure you want to create another climber with this name. There ${nClimbers > 1 ? 'are' : 'is'} already ${nClimbers} climber${nClimbers > 1 ? 's' : ''} with this name in the database. If you click yes, make sure you are not creating a duplicate climber.`
					const footerButtons = `
						<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
						<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal">Yes</button>
					`;
					const onConfirmClick = () => {
						$('#alert-modal .danger-button').click(
							() => {this.saveModalClimber()}
						)
					}
					const modalArgs = {
						modalType: 'confirm', 
						footerButtons: footerButtons, 
						eventHandlerCallable: onConfirmClick
					}
					this.showModal(message, 'Possible Duplicate Climber', modalArgs);
				} else {
					this.saveModalClimber();
				}
			} else {
				this.saveModalClimber();
			}
		})
	}

	onAddNewClimberClick(e) {

		if (!this.showDenyEditPermissionsMessage()) return;

		const $climberForm = this.climberForm.$el;
		if ($climberForm.find('.input-field.dirty').length) {
			const callback = () => {this.showModalClimberForm()};
			this.climberForm.confirmSaveEdits(callback);
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
	When the user clicks the back or forward browser nav buttons, check to see if there's a state 
	entry with an ID associated. If so, load that expedition
	*/
	onPopState(e) {
		
		// Create an anonymous function to be called if the user has to confirm any edits
		const loadPreviousClimber = () => {
			const state = e.state || {};
			const climberID = state.id;
			this.currentRecordSetIndex = (state.recordSetIndex || 1) - 1;
			if (!climberID) {
				// If this is just the base climbers.html url (no custom state with a climber ID)
				//	or the climber doesn't exist, just load the default climber result set
				$('#climber-search-bar').val('');
				this.getResultSet();

				// If there is a query string in the URL, reset it to the base URL
				if (window.location.search) this.resetURL();

			} else {
				// Otherwise, load the specific climber
				// Set the search string to whatever it was when the URL changed
				$('#climber-search-bar').val(state.searchString);
				this.currentHistoryIndex = state.historyIndex;
				// Make sure getResultSet() doesn't add a new history entry
				this.getResultSet({selectClimberID: climberID, newHistoryEntry: false});

				// Check if this climber is already open in another Window
				this.startListeningForOpenURL();
			}
		}

		// ask user to confirm/discard edits if there are any
		if ($('.input-field.dirty:not(.filled-by-default)').length) {
			this.confirmSaveEdits(loadPreviousClimber);
		} else {
			loadPreviousClimber.call();
		}
	}


	/*
	Helper method to add a new history entry for navigating between expeditions
	*/
	updateURLHistory(climberID) {

		// Don't add the same climber to the history buffer twice in a row
		const previousClimberID = this.historyBuffer[this.currentHistoryIndex - 1];
		if (previousClimberID == climberID) return;

		// since we're adding a new history entry, bump the buffer index
		this.currentHistoryIndex += 1;

		// Update URL with new expedition ID and add a history entry so the back 
		//	and forward buttons will move to and from expeditions
		const url = new URL(window.location);
		url.searchParams.set('id', climberID);
		
		// Add the climber's URL to the history
		const state = {
			id: climberID, 
			historyIndex: this.currentHistoryIndex, 
			searchString: $('#climber-search-bar').val(), //get the current search string so it can be reset
			recordSetIndex: this.currentRecordSetIndex // store the result set index so the same one can be opened
		}
		window.history.pushState(state, '', url);

		// This is a different expedition, so make sure it's not open elsewhere
		this.startListeningForOpenURL();
	}


	/*
	Select a climber from the list
	*/
	selectResultItem($item, {updateURLHistory=true}={}) {

		// Reset because this will get filled with the selected climber's data by setInputFieldValue()
		this.climberForm.selectedClimberInfo = {};
		
		//hide badges because they'll be shown later if necessary
		$('.result-details-header-badge').ariaHide(true); 

		// If currently editing (and this item is not currently selected, turn editing off
		if ($('.result-details-pane').is('*:not(.uneditable)') && $item.is('*:not(.selected)')) {
			this.climberForm.toggleEditing({allowEdits: false}); //turn editing off
		}
		// Deselect currently selected record
		$('.query-result-list-item.selected').removeClass('selected');
		
		// Select this record
		$item.addClass('selected');
		
		const climberID = $item.attr('id').replace('item-', '');
		const climberIndex = this.climberIDs[climberID];
		const climberInfo = this.climberInfo[climberIndex];
		this.climberForm.fillClimberForm(climberID, climberInfo);

		$('#climber-info-tab-content').data('table-id', climberID);

		// Make sure required fields are required
		$('#disable-required-switch-container input[type=checkbox]').prop('checked', false).change();

		$('.merge-climber-selected-name').text(
			$('.query-result-list-item.selected .result-label-climber-name').text()
		)

		if (updateURLHistory) this.updateURLHistory(climberID);

		return $item;
		
	}


	/*
	Wrapper for selectResultItem to handle unsaved edits if there are any
	*/
	confirmSelectResultItem($item) {
		if ($('.climber-form .input-field.dirty').length) {
			const afterActionCallback = () => {this.selectResultItem($(`#${$item.attr('id')}`))};
			this.climberForm.confirmSaveEdits(afterActionCallback);
		} else {
			this.selectResultItem($item)
		}
	}


	/*
	Event handler for climber result item click
	*/
	onClimberResultItemClick(e) {
		// Only select the item if it isn't already selected
		const $item = $(e.target).closest('.query-result-list-item');
		if ($item.is('.selected')) {
			this.selectResultItem($item);
		} else {
			this.confirmSelectResultItem($item);
		}
		e.stopImmediatePropagation(); // prevent focus
	}

	/*
	Handle when a climber result item gets the focus from tabbing
	*/
	onClimberResultItemFocus(e) {
		// Only select the item if it isn't already selected
		const $item = $(e.target);
		if ($item.is('.selected')) return;
		this.confirmSelectResultItem($(e.target));
	}

	/*
	Add climber query results to the UI
	@param climberInfo: query result object
	@param autoSelectID [optional]: indicates which climber ID to automatically select from 
		the query result. Can be boolean indicating, if true, to select the first climber in
		the result set, or it can be a numeric climber ID. If set to -1, the first climber in
		the result set will be selected
	*/
	fillResultList(climberInfo, {autoSelectID=false}={}) {

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
				<li id="item-${climber.id}" class="query-result-list-item ${climber.id == currentSelectedID ? 'selected' : ''}" role="row" data-climber-id=${climber.id} tabindex=${liTabIndex}>
					<label class="result-summary-label result-label-climber-name col" role="gridcell">${climber.full_name}</label>
					<label class="result-summary-label col" role="gridcell">${localeString || '<em>no locale entered</em>'}</label>
					<label class="result-summary-label col" role="gridcell">${climber.expedition_name || '<em>None</em>'}</label>
				</li>
			`);
			liTabIndex ++;
		}

		const $selectedItem = $('.query-result-list-item.selected');
		// See if there's a climber to automatically select
		if (autoSelectID) {
			
			if (autoSelectID === true || autoSelectID == -1) {
				// Select first
				const $first = $('.query-result-list-item:not(.header-row)').first();
				this.selectResultItem($first, {updateURLHistory: false});
				$first[0].scrollIntoView();
			} else {
				// Otherwise, select the specified climber
				const $item = $(`.query-result-list-item[data-climber-id=${autoSelectID}]`)
				// Don't update the window.history because this function could be called from onpopstate, which would create a duplicate entry. 
				this.selectResultItem($item, {updateURLHistory: false})
				$item[0].scrollIntoView();
			}
		} 
		// Otherwise, don't do anything
		else if (!$selectedItem.length) {
			$('.result-details-pane .input-field').val(null);
			$('.result-details-pane')
				.addClass('collapsed')
				.attr('aria-hidden', true);
		} else {
			$selectedItem[0].scrollIntoView();
		}
	}


	/*Get climber data*/
	queryClimbers({searchString='', minIndex=1, climberID=undefined, selectClimberID=null} = {}) {
		const withSearchString = searchString.length > 0;
		var minIndex = minIndex; // not sure why but for some reason this needs to be used here to be defined later
		
		const returnCount = isNaN(climberID);
		return $.post({
			url: '/flask/db/select/climbers',
			data: JSON.stringify({
				search_string: searchString,
				is_guide: $('#guide-only-filter').prop('checked'),
				is_7_day: $('#7-day-only-filter').prop('checked'),
				min_index: minIndex,
				n_records: this.recordsPerSet,
				climber_id: climberID,
				queryTime: (new Date()).getTime(),
				return_count: returnCount
			}),
			contentType: 'application/json'
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				// result was empty so let the user know
				if (withSearchString) {
					$('.query-result-list-item:not(.header-row)').remove()
					$('.empty-result-message').ariaHide(false);
					$('.hidden-on-invalid-result').ariaHide(true);
					$('.result-details-pane').addClass('collapsed');
				} else if (response.match(`No climber with ID ${climberID} found`)){ 
					this.showModal(
						`There is no climber with the database ID '${climberID}'. This climber was either deleted or the URL you are trying to use is invalid.`, 
						'Invalid Climber ID'
					);
					// Reset URL, then load the default result set but don't add a new history entry because it would duplicate the base URL in the history
					this.resetURL();
					this.getResultSet({newHistoryEntry: false});
				} else {
					this.showModal('Retrieving climber info from the database failed with the following error: <br>' + response, 'Database Error');
				}
			} else {  
				var result = response.data || [];
				
				// Check if this result is older than the currently displayed result. This can happen if the user is 
				//	typing quickly and an older result happens to get returned after a newer result. If so, exit 
				//	since we don't want the older result to overwrite the newer one
				const queryTime = response.queryTime;
				if (queryTime < this.lastSearchQuery) {
					return;
				} else {
					this.lastSearchQuery = queryTime;
				}
				if (!result.length) {
					$('.query-result-list-item:not(.header-row)').remove();
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
				// Add climbers to the list. If a climberID was given, it will automatically be selected. 
				//	If not, only select the first climber if there was no search string provided
				this.fillResultList(this.climberInfo, {autoSelectID: selectClimberID || !withSearchString});

				// Update index
				if (returnCount) {
					const rowNumbers = this.climberInfo.map(i => parseInt(i.row_number));
					minIndex = minIndex || Math.min(...rowNumbers);
					let maxIndex = Math.max(...rowNumbers);
					if (response.count) {
						// Show the currently loaded range of climber results
						const count = response.count;
						$('#min-record-index-span').text(minIndex);
						$('#max-record-index-span').text(Math.min(maxIndex, count));
						$('#total-records-span').text(count);
						$('.result-index-label').ariaHide(false);
						$('.show-next-result-set-button').prop('disabled', maxIndex === parseInt(count));
						$('.show-previous-result-set-button').prop('disabled', minIndex === 1);
					}
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
			this.showModal('Retrieving climber info from the database failed because ' + error, 'Database Error')
		})
	}


	queryClimberByID(climberID) {
		const deferred = this.queryClimbers({climberID: climberID})
			.done(queryResultString => {
				if (!this.pythonReturnedError(queryResultString)) {
					this.currentRecordSetIndex = 1;
				}
			});
		
		return deferred;
	}

	/*
	Helper method to get next (or previous) set of results
	*/
	getResultSet({isNext=true, selectClimberID=null, newHistoryEntry=true}={}) {

		this.currentRecordSetIndex += isNext ? 1 : -1
		const maxIndex = this.currentRecordSetIndex * this.recordsPerSet;
		const minIndex = maxIndex - this.recordsPerSet + 1;

		const $input = $('#climber-search-bar');
		const value = $input.val();
		var searchString = value.length >= 3 || value.length === 0 ? value : '';

		if (newHistoryEntry && selectClimberID && selectClimberID > 0) this.updateURLHistory(selectClimberID);

		return this.queryClimbers({searchString: searchString, minIndex: minIndex, selectClimberID: selectClimberID});
	}


	/*
	Do stuff specific to climbers.html when the result is returned succesfully.
	This CLimberForm.detelClimber() handles generic errors
	*/
	deleteClimber(climberID) {

		this.climberForm.deleteClimber(climberID)
			.done(queryResultString => {
				if (!this.pythonReturnedError(queryResultString, {errorExplanation: 'The climber could not be deleted because of an unexpected error.'})) {
					const $item = $(`#item-${climberID}`);
					const deletedClimberIsSelected = $item.is('.selected');
					const $nextItem = $item.next().length ? $item.next() : $item.prev();
					$item.fadeOut(500, () => {$item.remove()});
					
					if (deletedClimberIsSelected) {
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

							// Set URL to base climbers.html without search
							this.resetURL();
						}
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
		if (!this.userInfo.isAdmin) {
			if (climberInfo.expedition_name) { // will be null if climber isn't/wasn't on any expeditions
				this.showModal(
					`You can't delete ${climberInfo.first_name} ${climberInfo.last_name}'s climber profile` + 
						' because they are a member of at least one expedition. You must remove them from all' + 
						' expeditions they\'re a member of before their profile can be deleted.', 
					'Invalid Operation'
				);
				return;
			}
		}

		const climberID = $('.query-result-list-item.selected').attr('id').replace('item-','');
		const onConfirmClickHandler = () => {
			$('#alert-modal .confirm-button').click(() => {
				this.deleteClimber(climberID);
			});
		}
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button danger-button close-modal confirm-button" data-dismiss="modal">Yes</button>
		`;
		let message = `Are you sure you want to <strong>permanently delete this climber</strong>? This action cannot be undone`;
		if (climberInfo.expedition_name) {
			message += ' and all information about their climbs will be delete including transaction history,' + 
				' medical issues, and whether or not they summited.';
		}
		const modalArgs = {
			modalType: 'confirm', 
			footerButtons: footerButtons, 
			eventHandlerCallable: onConfirmClickHandler
		}
		this.showModal(message, `Delete climber?`, modalArgs);
	}


	/*
	Event hander for the search bar in the 'Merge Climbers' tab
	*/
	onMergeClimberSearchKeyup() {
		const $searchContainer = $('#merge-climber-tab-content-header');

		// Exclude the currently selected climber
		const selectedClimberID = $('.query-result-list-item.selected').data('climber-id');
		this.onFuzzySearchSelectKeyup($searchContainer, {excludeID: selectedClimberID});
	}


	/*
	Event handler for when the user selects a climber to potentially merge with the
	selected climber
	*/
	onMergeClimberSelectChange(e) {
		const $tabContent = $('#merge-climber-tab-content');
		
		const $select = $(e.target);
		const climberID = $select.val();

		// Show/hide the climber-to-merge info depending on whether the user
		//	actually selected a climber or the default placeholder option
		const climberIsSelected = climberID !== '';
		$select.toggleClass('default', !climberIsSelected);
		const $detailsContainer = $tabContent.find('.merge-climber-details-container')
			.collapse(climberIsSelected ? 'show' : 'hide');

		// if the user selected the default placeholder option, exit
		if (!climberID) return;

		// Reset text
		$detailsContainer.find('.selected-merge-climber-text').text('')
		$detailsContainer.find('.merge-climber-history-list').empty();

		// Query the climber's info
		this.queryDB({
			where: {
				climber_info_view: [{column_name: 'id', operator: '=', comparand: parseInt(climberID)}]
			}
		}).done(response => {
			if (!this.pythonReturnedError(response, {errorExplanation: 'An error occurred while retrieving climbering info.'})) {
				const result = response.data || [];
				if (result.length) {
					const climberInfo = result[0];
					const {
						first_name,
						middle_name,
						last_name,
						address, 
						city, 
						state_code, 
						country_code, 
						postal_code,
						phone,
						email_address,
						dob,
						age,
						entered_by,
						entry_time
					} = {...climberInfo}

					// Fill in name
					$detailsContainer.find('.merge-climber-name').text(
						this.climberForm.getFullName(first_name, last_name, middle_name)
					)
					$detailsContainer.find('.merge-climber-entry-metadata-label').text(
						`Entered by ${entered_by} on ${entry_time}`
					)
					// Completeness of address is highly variable so format defensively
					const addressText = (address || '').trim() ? address + '<br>' : '';
					const cityText = (city || '').trim() ? city : '';
					const state = Object.keys(this.stateCodes[state_code] || {}).length ? 
						(cityText ? ', ' : '') + this.stateCodes[state_code].short_name : 
						'';
					const country = this.climberForm.countryCodes[country_code] ? (cityText || state ? ', ' : '') + this.climberForm.countryCodes[country_code] : '';
					const postalCode = postal_code ? ' ' + postal_code : '';
					$detailsContainer.find('.merge-climber-address').html(
						addressText + 
						cityText + state + country + postalCode
					)

					// Fill phone and email
					$detailsContainer.find('.merge-climber-phone-label')
						.ariaHide(!phone)
						.find('span')
							.text(phone)
					$detailsContainer.find('.merge-climber-email-label')
						.ariaHide(!email_address)
						.find('span')
							.text(email_address)
					
					// Fill in D.O.B. and/or age
					var dobText = '', 
						ageText = '';
					const yearsPlural = age > 1 ? 's' : '';
					if (dob) {
						dobText = 'D.O.B.: ' + dob;
						if (age) ageText = ` (${age} year${yearsPlural} old)`;
					} else {
						if (age) ageText = `${age} year${yearsPlural} old`;
					}
					$detailsContainer.find('.merge-climber-dob-label').text(dobText + ageText)

					// get climber hsitory
					const $historyList = $detailsContainer.find('.merge-climber-history-list');
					this.queryDB({
						where: {
							climber_history_view: [
								{column_name: 'climber_id', operator: '=', comparand: climberID}
							]
						}
					}).done(response => {
						if (!this.pythonReturnedError(response, {errorExplanation: 'Retrieving climber history from the database failed.'})) {
							const result = response.data || [];
							for (const row of result) {
								const formattedDeparture = (new Date(row.actual_departure_date)).toLocaleDateString(); //add a time otherwise the date will be a day before
								const actualReturnDate = new Date(row.actual_return_date);
								const formattedReturn = row.actual_return_date ? actualReturnDate.toLocaleDateString() : '';
								$historyList.append(`<li><label>${this.routeCodes[row.route_code].name}: ${row.expedition_name},  ${formattedDeparture} - ${formattedReturn}</label></li>`);
							}
						}
					})
					.fail((xhr, status, error) => {
						const message = 'Retrieving climber history from the database' + 
							` failed with the error ${error}.${this.getDBContactMessage()}`;
						this.showModal(message, 'Database Error')
					});
				} else {
					console.log('No climber found with ID ' + ClimberID);
				}
			}
		})

	}



	/*
	Confirm that the user wants to merge the selected climber profiles
	*/
	onMergeClimberButtonClick() {

		const $selectedClimberItem = $('.query-result-list-item.selected');
		const selectedClimberID = $selectedClimberItem.data('climber-id');
		const selectedClimberName = $selectedClimberItem.find('.result-label-climber-name').text();

		const $mergeClimberSelect = $('#merge-climber-tab-content .climber-select');
		const mergeClimberID = $mergeClimberSelect.val();
		const $mergeClimberOption = $mergeClimberSelect.find(`option[value=${mergeClimberID}]`)
		const mergeClimberName = $mergeClimberOption.text();
		// Check that the user has actually selected a climber. This shouldn't be necessary beceause
		//	 the button should only be visible if a climber *is* selected, but just in case...
		if (!mergeClimberID) {
			this.showModal(`You must select a climber to merge with ${selectedClimberName}`, 'Invalid Operation');
		}

		// Same buttons for either deleting an empty climber profile or merging
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button danger-button confirm-button close-modal" data-dismiss="modal">Yes</button>
		`

		// If the merged climber doesn't have any history to merge, ask the user if they 
		//	just want to delete it
		if (!$('.merge-climber-history-list li').length) {
			const message = `<strong>${mergeClimberName}</strong>, the climber you selected to` +
				` merge with <strong>${selectedClimberName}</strong>,` + 
				' does not have any climbing history to merge. Would you like to simply delete' +
				' this climber profile instead? Deleting this profile is a permanent action that' + 
				' cannot be undone';
			const onConfirmClickHandler = () => {
				$('#alert-modal .confirm-button').click(() => {
					showLoadingIndicator('mergeClimbers');
					this.deleteClimber(mergeClimberID)
						.done(response => {
							if (!this.pythonReturnedError(response)) {
								// Update .climber-select
								this.onMergeClimberSearchKeyup();
								$('.merge-climber-details-container').collapse('hide');
							}
					});
				});
			}
			const modalArgs = {
				modalType: 'confirm', 
				footerButtons: footerButtons, 
				eventHandlerCallable: onConfirmClickHandler
			}
			this.showModal(message, 'Premanently Delete Climber Profile?', modalArgs);
			return;
		}


		const message = `Are you sure you want to transfer all of <strong>${mergeClimberName}'s</strong>` +
			` climber history to <strong>${selectedClimberName}'s</strong> profile? This action is` + 
			' permanent and cannot be undone.'
;
		const onConfirmClickHandler = () => { 
			$('#alert-modal .confirm-button').click(() => {
				showLoadingIndicator('mergeClimbers');
				$.post({
					url: 'flask/merge_climbers',
					data: {
						selected_climber_id: selectedClimberID,
						merge_climber_id: mergeClimberID
					}
				}).done(response => {
					if (this.pythonReturnedError(response, {errorExplanation: 'An error occurred while trying to merge climber profiles.'})) {
						return;
					} else if ('update_result' in response) {
						const nExpeditions = response.update_result.length;
						const message = 'The two climber profiles were successfully merged.' + 
						` ${nExpeditions} expedition${nExpeditions > 1 ? 's were' : ' was'} transfered from <strong>${mergeClimberName}'s</strong>` + 
						` profile to <strong>${selectedClimberName}'s</strong>.`;
						// Between dismissing the confirmation modal and showing this one, wires are getting 
						//	crossed so pause for a half second before showing this one
						setTimeout(()=>{this.showModal(message, 'Climber Profiles Succesfully Merged')}, 500);
						
						// Reload the currently selected climber by either 
						const maxIndex = this.currentRecordSetIndex * this.recordsPerSet;
						const minIndex = maxIndex - this.recordsPerSet + 1;
						this.queryClimbers({
							searchString: $('#climber-search-bar').val() || selectedClimberName, 
							minIndex: minIndex, 
							autoSelectID: selectedClimberID
						});
						// Update .climber-select
						this.onMergeClimberSearchKeyup();
						// Hide the details because the selected climber to merge should no longer exist
						$('.merge-climber-details-container').collapse('hide');
					} else {
						this.showModal('An unkown error occurred while trying to merge climber profiles.' + this.getDBContactMessage(), 'Unexpected Error');
					}
				}).fail((xhr, status, error) => {
					const message = 
						'An error occurred while trying to merge climber' + 
						` profiles: ${error}.${this.getDBContactMessage()}`;
					this.showModal(message, 'Unexpected Error');
				}).always(() => {hideLoadingIndicator()})
			})
		}
		const modalArgs = {
			modalType: 'confirm', 
			footerButtons: footerButtons, 
			eventHandlerCallable: onConfirmClickHandler
		}
		this.showModal(message, 'Confirm Climber Profile Merge', modalArgs);
	}


	init() {

		// Call super.init()
		this.showLoadingIndicator('init');
		var initDeferred = super.init();

		// Do additional synchronous initialization stuff
		this.configureMainContent();

		initDeferred.then(() => {
			// Get state and route codes first if they haven't been queried yet.
			//	This needs to happen before filling the result-summary-pane
			//	because fillResultList() substitue state_codes for the short_name
			const lookupDeferreds = this.fillAllSelectOptions();
			if (Object.keys(this.stateCodes).length === 0) {
				lookupDeferreds.push(
					this.queryDB({tables: ['state_codes']})
						.done(response => {
							if (!this.pythonReturnedError(response)) {
								for (const state of response.data || []) {
									this.stateCodes[state.code] = {...state};
								}
							}
						})
				)
			}
			if (Object.keys(this.routeCodes).length === 0) {
				lookupDeferreds.push(
					this.queryDB({tables: ['route_codes']})
						.done(response => {
							if (!this.pythonReturnedError(response)) {
								for (const route of response.data || []) {
									this.routeCodes[route.code] = {...route};
								}
							}
						})
				)
			}
			return $.when(...lookupDeferreds)
		}).then(() => {
			var urlParams = this.parseURLQueryString();
			const queryDeferred = urlParams.id  ?
				this.queryClimberByID(urlParams.id) :
				this.getResultSet({selectClimberID: -1});// select the first climber

			queryDeferred.always(() => {
				if (urlParams.id) {
					if (urlParams.edit && this.checkEditPermissions()) {
						this.climberForm.toggleEditing({allowEdits: true});
					}
				} else if (urlParams.addClimber) {
					this.showModalClimberForm(this.climberForm.$el);
				}
					
			});
			return queryDeferred

		}).always(() => {this.hideLoadingIndicator()});

		return initDeferred;
	}
}