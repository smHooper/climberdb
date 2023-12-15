/*
expeditions.js
author: Sam Hooper
*/

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
		this.climberInfo = {};
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
		this.attachments = {};

		return this;
	}


	configureMainContent() {

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
			this.onEditButtonClick(e);
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
			this.onCreatePDFButtonClick();
		})

		$('#print-cache-tag-button').click(() => {
			this.onPrintCacheTagButtonClick();
		});

		$(document).on('change', '.input-field:not(.route-code-header-input)', e => {
			if ($(e.target).closest('.cloneable').length) return;
			this.onInputChange(e);
		});
		// check for valid date when date field loses focus
		$(document).on('blur', '.input-field[type=date]', e => {
			if ($(e.target).closest('.cloneable').length) return;
			this.onDateFieldChange(e);
		});

		// Record current value for .revertable inputs so the value can be reverted after a certain event
		$(document).on('focus', '.input-field.revertable', e => {
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

		window.onpopstate = (e) => {
			this.onPopState(e)
		}

		// Use buttons instead of anchor tag for scrolling to top and bottom of page 
		//	to avoid adding to window.history
		$('.text-only-button.jump-link').click(e => {
			const $button = $(e.target).closest('button');
			document.querySelector($button.data('target')).scrollIntoView() 
		})

		// If the group status changes to "confirmed", make actual departure and actual return dates not required
		// $('#input-group_status').change(e => {
		// })

		$(document).on('click', '.delete-card-button', (e) => {
			this.onDeleteCardButtonClick(e)
		})
		

		$('.expand-card-button').click(e => {
			this.onExpandCardButtonClick(e);
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
			// If the user hit the enter to key, trying to submit, just ignore it
			if (e.key === 'Enter') return;

			// And for some reason, Escape keyup events aren't registered for the modal search bar so handle them here 
			const $modalExpeditionOptions = $('#modal-expedition-options-drawer');
			
			if ($modalExpeditionOptions.is('.show') && (e.key === 'Escape')) {
				$modalExpeditionOptions.collapse('hide');
			}
		})
		
		// Handle keyboard and click events for expedition search bar
		$('.fuzzy-search-bar.expedition-search-bar').keyup( e => {
			this.onExpeditionSearchBarKeyUp(e);
		}).keydown(e => {
			// If the user hit the enter to key, trying to submit, just ignore it becauae the search 
			//	will happen regardless and the enter key will add a carriage return
			if (e.key === 'Enter') return false;
		}).click(e => {
			// Toggle the options drawer when the search bar is clicked
			const $optionsDrawer = $(e.target).siblings('.expedition-options-container.collapse');
			$optionsDrawer.collapse('toggle')
		});

		// Handle when the user presses either the up/down arrow key or the enter key and an 
		//	expedition-search-option is selected. Use keydown so the user can hold the up or down 
		//	key to scroll down continuously
		$(document).on('keydown', '.expedition-search-bar-option', e => {
			this.onExpeditionSearchOptionKeydown(e);
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

		$('#modal-expedition-search-bar').keyup(e => {
			this.onModalSearchBarInputKeyUp(e);
		})

		$('#confirm-change-expedition-button').click(() => {
			this.onConfirmChangeExpeditionButtonClick();
		})

		// Fill with this year's expeditions to start
		this.fillExpeditionSearchSelect({showExpeditionOptions: !this.parseURLQueryString()});
		// ^^^^^^^^^ Query stuff ^^^^^^^^^^^^^^^^


		// ----------- Expedition -------------------
		//TODO: allow group status to change all members' status at once
		$('#input-group_status').change(e => {
			this.onGroupStatusFieldChange(e)
		});

		$('#input-date_confirmed').change(e => {
			this.onDateConfirmedChange(e);
		});
		// When an expedition changes, check that the name is unique for the current year
		$('#input-expedition_name').blur(e => {
			this.onExpeditionNameLostFocus(e)
		})

		$('#input-guide_company').change(e => {
			this.onGuideCompanyInputChange(e);
		});

		$('#input-special_group_type').change(e => {
			this.onSpecialGroupTypeChange(e)
		})
		//TODO: when date changes, make sure it's a reasonable value

		// ^^^^^^^^^^^ Expedition ^^^^^^^^^^^^^^^^^^^


		// ---------- Members/transactions ----------

		// for some reason, .collapse surrounding the is_guiding field doesn't toggle automatically
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

		// Set the frostbite severity to null when the user unchecks the frostbite checkbox
		$('#input-had_frostbite').change(e => {
			const $target = $(e.target);
			if (!$target.prop('checked')) {
				$target.closest('.expedition-member-tab-content')
				.find('.input-field[name=frostbite_severity_code]')
					.val('')
					.change();
			}
		})

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

		$(document).on('click', '.add-attachment-button', e => {
			this.onAddAttachmentItemButtonClick(e);
		});

		$(document).on('click', '.delete-attchment-button', e => {
			this.onDeleteAttachmentButtonClick(e);
		})

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

		// Set the cancelled time when the reservation status is set to cancelled
		// also check all other reservation status fields to see if the whole group is ready
		$(document).on('change', '.reservation-status-field', e => {
			this.onReservationStatusFieldChange(e);
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
			const $checkbox = $(e.target);
			const $card = $checkbox.closest('.card')
			
			// If the climber isn't a guide, uncheck the box and warn the user
			const isChecked = $checkbox.prop('checked');
			if (isChecked) {
				const climberID = $card.data('climber-id');
				const climberInfo = this.climberInfo[climberID] || {};
				const isCommercialGuide = climberInfo.isCommercialGuide;
				if (!isCommercialGuide) {
					//TODO: could ask the user if they want to update the climber table record
					const message = `${climberInfo.firstName} ${climberInfo.lastName} isn't marked as a`
						+ ` guide in the database so they can't serve as a guide on this expedition. If the`
						+ ` climber is actually a commercial guide, <a href="climbers.html?id=${climberID}`
						+ `&edit=true" target="_blank">edit their climber profile</a>. You can then reload`
						+ ` this page and mark them as a guide on this expedition.`;
					showModal(message, 'Climber Is Not A Guide');
					$checkbox.prop('checked', false).change();
				}
			}
			$card.find('.guide-icon')
				.ariaTransparent(!isChecked);
		});

		// When a transaction type field changes and amount is not already set, fill the amount with the defuault value
		$(document).on('change', '.transaction-type-field', e => {
			this.onTransactionTypeChange(e);
		});

		// When a transaction amount field changes, calculate balance
		$(document).on('change', '.transaction-amount-field', e => {
			this.onTransactionAmountChange(e);
		});

		$(document).on('click', '.delete-transaction-button', e => {
			this.onDeleteTransactionButtonClick(e);
		})

		$(document).on('change', '.attachment-input', e => {
			this.onAttachmentInputChange(e);
		});

		$(document).on('click', '.preview-attachment-button', e => {
			this.onPreviewAttachmentButtonClick(e)
		})
		// ^^^^^^^^^^ Members/transactions/attachments ^^^^^^^^^^^

		// ---------- Route stuff ----------

		// When new route card is added, make sure it has all of the (not cancelled) expedition members
		$('#routes-data-container .add-card-button').click(e => {
			this.onAddRouteButtonClick(e)
		});

		$(document).on('change', '.route-code-header-input', e => {
			this.onRouteCardHeaderInputChange(e)
		});

		$(document).on('click', '.add-expedition-route-member-button', e => {
			this.onModalAddRouteMemberClick(e);

		});

		// Show modal to prompt user to enter summit date
		$(document).on('click', '.check-all-summitted-button', e => {
			this.onCheckAllSummitedButtonClick(e);
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
				$highestElevationInput.val(this.mountainCodes[mountainCode].elevation_ft).change();
				
				// If this was a user click, check that this expedition member's status is "off mountain"
				const expeditionMemberID = ($highestElevationInput.data('foreign-ids') || {}).expedition_member_id;
				if (expeditionMemberID && e.originalEvent) {
					const $memberCard = $(`#expedition-members-accordion .card[data-table-id=${expeditionMemberID}]`);
					const $reservationStatusInput = $memberCard.find('.input-field[name=reservation_status_code]');
					const reservationStatusCode = $reservationStatusInput.val();
					const offMountainCode = this.constants.groupStatusCodes.offMountain;
					if (reservationStatusCode != offMountainCode) {
						$reservationStatusInput.val(offMountainCode).change();
					}
				}
			}
		});

		// When a user changes the highest_elevation_ft field, check/uncheck the Summited checkbox
		$('.input-field[name=highest_elevation_ft]').change(e => {
			this.onHighestElevationChange(e);
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

		$(document).on('click', 'add-expedition-route-member-button', e => {
			this.onAddRouteMemberButtonClick(e);
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
			
			if (!$('#expedition-members-accordion .card:not(.cloneable)').length) {
				showModal('You must add at least one expedition member before you can add a communcation device.', 'Invalid Action');
				return;
			}

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
		//$('<div id="add-climber-form-modal-container" class="climber-form-modal-container uneditable hidden" tabindex="-1" role="dialog" aria-labelledby="" aria-hidden="true"></div>')
		const $climberFormModal = $('#add-climber-form-modal-container').appendTo('body');
		this.climberForm = new ClimberForm(this, $climberFormModal);
		this.climberForm.lastSearchQuery = (new Date()).getTime();

		// Enable onclick event
		$('#show-modal-climber-form-button').click(e => {
			this.onAddExpeditionMemberButtonClick();
		});

		$('.close-modal-button').off('click');
		$('#climber-form-modal-close-button, .close-modal-button').click(e => {
			this.onCloseClimberFormModalClick(e)
		})

		// query climbers to fill select
		$('#modal-climber-search-bar').keyup(() => {
			this.onClimberFormSearchKeyup();
		}).keydown(e => {
			// If the user hit the enter to key, trying to submit, just ignore it becauae the search 
			//	will happen regardless and the enter key will add a carriage return
			if (e.key === 'Enter') return false;
		});
		// guide and 7-day filters
		$('.climber-search-filter').change(() => {
			this.onClimberFormSearchKeyup();
		});

		$('#refresh-modal-climber-select').click(() => {
			this.onRefreshModalClimberSelectClick()
		});

		$('#modal-climber-select').change(e => {
			this.onModalClimberSelectChange(e);
		});

		$('#modal-save-to-expedition-button').click(e => {
			this.onAddClimberToExpeditionClick(e);
		})
		// ^^^^^ Climber form stuff ^^^^^^
	}

	/*
	Helper function to determine if the value of an input field changed
	*/
	inputValueDidChange($input) {
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

		}

		return valueChanged || dbValue != newValue;
	}


	onInputChange(e) {
		const $input = $(e.target);

		if ($input.is('.ignore-changes') || $input.closest('.uneditable').length) return;

		$input.toggleClass('dirty', this.inputValueDidChange($input));
		$('#save-expedition-button').ariaHide(!$('.input-field.dirty').length);

	}

	/*
	When the user changes the a date .input-field, make sure the date is from the current year.
	If entering the date via keyboard, people often want to enter a 2-digit year, which results 
	in a date from the first century AD
	*/
	onDateFieldChange(e) {
		// only do stuff if the user triggered the change directly, not via .change()
		if (e.originalEvent) {
			const $input = $(e.target);
			const isoDateString = $input.val();
			// Only check the value if it's not a null string
			if (isoDateString) {
				// javascript can't handle years between 0-100 AD correctly
				const [year, month, day] = isoDateString.split('-'); // get year parts
				const date = new Date(year, month - 1, day); // create a date
				date.setFullYear(year); // set the year directly
				
				if (year < new Date().getFullYear()) {
					const prettyDateString = date.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
					const message = `You entered the date ${prettyDateString} for the year <strong>${year}</strong>. If entering a date using the keyboard, <strong>you must enter the full 4-digit year</strong>.`;
					showModal(message, 'WARNING: Date Entered for Previous Year')
				}
			}
		}
	}


	/*
	Before toggling edits, check if this is legacy data. If so, warn the user in case they think 
	they're editing a group of the same name from the current or a future year
	*/
	onEditButtonClick(e) {

		if (!this.showDenyEditPermissionsMessage()) return;

		const turnEditingOn = $('.expedition-content.uneditable').length;
		
		// If the group is from a previous year, warn the user
		const plannedDeparture = $('#input-planned_departure_date').val();
		if (turnEditingOn && plannedDeparture) {
			const departureDate = new Date(plannedDeparture + ' 00:00')
			const departureYear = departureDate.getFullYear();
			const currentYear = new Date().getFullYear();
			if (departureYear < currentYear) {
				const formattedDeparture = departureDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
				showModal(
					`This expedition was scheduled to depart on <strong>${formattedDeparture}</strong>.` + 
					' Make sure this is the group you intended to edit.', 
					'WARNING: Editing Legacy Data'
				);
			}
		} 

		this.toggleEditing();
	}


	/*
	Turn editing on or off
	*/
	toggleEditing({forceEditingOn=null, allowEdits=null}={}) {
		const $content = $('.expedition-content');

		// if forceEditingOn is specified, don't confirm the choice. Just toggle editing accordingly
		if (forceEditingOn != null) {
			$content.toggleClass('uneditable', !forceEditingOn);
			$('#delete-expedition-button').ariaHide(!forceEditingOn);
			if ($('.input-field.dirty').length) this.discardEdits();
		} else {
			allowEdits = allowEdits === null ? $content.is('.uneditable') : allowEdits;
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
		// Show in case this user didn't have edit permitssions just loaded the expedition page without a specific expedition
		$('.expedition-content, .hide-when-content-hidden').ariaHide(false);

		$('.search-options-drawer').removeClass('show');
		this.queryExpedition(expeditionID);
		$('#show-modal-climber-form-button').closest('.collapse').collapse('show');
		this.toggleEditing({forceEditingOn: false});//make sure editting is turned off
		
	}


	/*
	When the user clicks the back or forward browser nav buttons, check to see if there's a state 
	entry with an ID associated. If so, load that expedition
	*/
	onPopState(e) {
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
					// Check if this expedition is already open
					this.startListeningForOpenURL();
				}
			}
		} 
	}


	/*
	Helper method to add a new history entry for navigating between expeditions
	*/
	updateURLHistory(expeditionID, $input) {
		// Update URL with new expedition ID and add a history entry so the back 
		//	and forward buttons will move to and from expeditions
		const url = new URL(window.location);
		url.searchParams.set('id', expeditionID);
		
		// Push the new entry here because loadExpedition() is also called when the user clicks the back or forward button, and adding a history entry then will muck up the history sequence 
		this.historyBuffer.push(expeditionID);
		window.history.pushState({id: expeditionID, historyIndex: this.currentHistoryIndex + 1}, '', url);

		// This is a different expedition, so make sure it's not open elsewhere
		this.startListeningForOpenURL();
	}

	/*
	Keyboard event handler while expedition search bar has focus.
	*/
	onExpeditionSearchBarKeyUp(e) {

		const $searchBar = $(e.target);
		const $searchOptionDrawer = $searchBar.siblings('.expedition-options-container');
		const $searchBarOptions = $searchOptionDrawer.find('.expedition-search-bar-option')

		// If the user pressed the escape key, hide the options drawer
		if (e.key === 'Escape') {
			$searchOptionDrawer.collapse('hide');
			return;
		} 
		else if (e.key === 'ArrowDown') {
			const scrollIndex = $searchOptionDrawer[0].scrollTop / $searchBarOptions[0].scrollHeight;
			$searchBarOptions.eq(scrollIndex).focus();
			return;
		}

		// Only query the DB for options if the search string's length is more than 5 characters or 0.
		//	0-length will show all options but 1-4 chars will not produce reliable search results.
		//	Also no expedition name should be less than 5 characters long
		const searchString = $searchBar.val();
		if (searchString.length >= 5) { 
			this.fillExpeditionSearchSelect({$searchBar: $searchBar, showExpeditionOptions: true});
		} 
		// If character length < 5, make sure all expeditions are options, then scroll to the 
		//	first option whose start matches the search string
		else {
			this.fillExpeditionSearchSelect({$searchBar: $searchBar, searchString: '', showExpeditionOptions: true})
				.done(() => {
					const $options = $searchOptionDrawer.find('.expedition-search-bar-option');
					const expeditionNames = $options.map((_, el) => el.innerHTML).get();
					for (const i in expeditionNames) {
						if (expeditionNames[i].toLowerCase().startsWith(searchString.toLowerCase())) {
							// Scroll the drawer instead of .scrollIntoView(), which will move all ancestor 
							//	scroll bars
							$searchOptionDrawer.collapse('show');
							const scrollPosition =  $options[0].scrollHeight * i;
							$searchOptionDrawer[0].scrollTo({top: scrollPosition});
							break;
						}
					}
				});

		}

	}

	/*
	Focus/simulate clicks for expedition options using keyboard
	*/
	onExpeditionSearchOptionKeydown(e) {
		const $focusedExpeditionOption = $('.expedition-search-bar-option:focus');
		if ($focusedExpeditionOption.length) {
			e.preventDefault();
			const keyName = e.key;
			// If the user pressed the up or down key, focus next/previous option
			if (keyName === 'ArrowDown' || keyName === 'ArrowUp' ) {
				// :nth-child css selector is a 1-based index whereas .index() is 0 based, so either 
				//	add 2 or nothing depending on whether the user is moving up or down in the options
				const nthChildAdjustment = keyName === 'ArrowDown' ? 2 : 0
				const nextIndex = $focusedExpeditionOption.index() + nthChildAdjustment;
				$(`.expedition-search-bar-option:nth-child(${nextIndex})`).focus();
			}
			// if the user pressed the enter key, load that expedition
			else if (e.key === 'Enter') {
				$focusedExpeditionOption.click();
			}
		}
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
	Expand a card to take the whole screen as a modal when the expand button is clicked
	*/
	onExpandCardButtonClick(e) {

		const $button = $(e.target).closest('button');
		//const isExpanded = $button.find('.expand-button-icon').is('.fa-compress-alt');
		const $wrapper = $button.closest('.expedition-data-wrapper');
		const shouldExpand = !$wrapper.is('.expedition-modal');

		// This probably isn't possible, but just in case, make sure there's only one modal card at once
		$('.expedition-modal').not($wrapper).removeClass('expedition-modal');
		
		// Toggle modal
		$wrapper.toggleClass('expedition-modal');
		$('.main-content-header').toggleClass('modal-card-shown', shouldExpand);//keep hidden from screen readers so don't use .ariaHide()

		// Show any elements that only appear in modal view
		$wrapper.find('.modal-only').ariaHide(!shouldExpand);

		// Font awesome classes don't neatly override each other by last-in-wins so toggle each class separately
		$button.find('.expand-card-icon')
			.toggleClass('fa-expand-alt', !shouldExpand)
			.toggleClass('fa-compress-alt', shouldExpand);

		$button.find('.icon-button-label').text(shouldExpand ? 'minimize' : 'maximize');
	}


	/*
	Helper method to add an expedition member to a give unordered list
	*/
	addRouteMember($list, climberName, climberID, {expeditionMemberID=null}={}) {
		
		// Make sure this can be called from a modal with adhoc onclick events. In this case, just an html id would be given so make sure it's a jquery object
		$list = $($list);

		const $listItem = this.addNewListItem($list, {newItemClass: 'new-list-item', parentDBID: expeditionMemberID})
			.data('expedition-member-id', expeditionMemberID);
		
		$listItem.find('.name-label').text(climberName);

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
		const nMembers = $('#expedition-members-accordion .card:not(.cloneable)').length//this.expeditionInfo.expedition_members.order.length;
		const $card = $list.closest('.card');
		$card.find( $('.add-expedition-route-member-button') ).ariaHide(
			$card.find('.route-member-list .data-list-item:not(.cloneable)').length >= nMembers 
		);
	
	}


	onDeleteCardButtonClick(e) {
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
	}

	onModalAddRouteMemberClick(e) {
		// If there's more than one expedition member not on this route, show a modal that allows the user 
		//	to select which member to add
		const $list = $(e.target).closest('.card').find('.route-member-list');

		var unassignedClimbers = [];
		for (const el of $('#expedition-members-accordion .card:not(.cloneable)')) {
			const $card = $(el);
			const climberID = $card.data('climber-id');
			if ($list.find(`li[data-climber-id=${climberID}]`).length === 0) {
				const climberName = $card.find('.expedition-member-card-link-label').text();
				unassignedClimbers.push({climberID: climberID, climberName: climberName})// += `<option value=${climberID}>${climberName}</option>`;
			}
		}

		if (unassignedClimbers.length === 1) {
			//const memberID = ;
			const climberInfo = unassignedClimbers[0];//this.expeditionInfo.expedition_members.data[memberID];
			const climberID = climberInfo.climberID;
			const memberData = this.expeditionInfo.expedition_members.data;
			const memberID = Object.keys(memberData).filter(id => parseInt(memberData[id].climber_id) === parseInt(climberID)).pop()
			this.addRouteMember($list, climberInfo.climberName, climberID, {expeditionMemberID: memberID});
		} else if (unassignedClimbers.length > 1) {
			const options = unassignedClimbers.map(info => `<option value=${info.climberID}>${info.climberName}</option>`).join('\n');

			const message = `
				<p>Select which expedition member you want to add. If you want to add all remaining expedition members, click <strong>Add All</strong>.</p>
				<div class="field-container col-8 single-line-field">
						<label class="field-label inline-label" for="modal-summit-date-input" for="modal-route-member">Expedition member</label>
						<select id="modal-add-route-member" class="input-field modal-input">
							${options}
						</select>
				</div>
			`;

			// Snippet for when the user wants to add just the currently selected climber
			const onAddSelectedConfirm = `
				const climberID = $('#modal-add-route-member').val();
				const climberName = $('#modal-add-route-member option[value=' + climberID + ']').text();
				const memberData = climberDB.expeditionInfo.expedition_members.data;
				const memberID = Object.keys(memberData).filter(id => parseInt(memberData[id].climber_id) === parseInt(climberID)).pop()
				climberDB.addRouteMember('#${$list.attr('id')}', climberName, climberID, {expeditionMemberID: memberID});
			`;
			// Snippet to add all unassigned climbers
			const onAddAllConfirm = `
				const listID = '#${$list.attr('id')}';
				const memberData = climberDB.expeditionInfo.expedition_members.data;
				for (const el of $('#modal-add-route-member option')) {
					const climberID = el.value;
					const climberName = el.innerHTML;
					const memberID = Object.keys(memberData).filter(id => parseInt(memberData[id].climber_id) === parseInt(climberID)).pop()
					climberDB.addRouteMember(listID, climberName, climberID, {expeditionMemberID: memberID});
				}
			`;
			const footerButtons = `
				<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
				<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onAddSelectedConfirm}">Add selected</button>
				<button class="generic-button modal-button primary-button close-modal" data-dismiss="modal" onclick="${onAddAllConfirm}">Add All</button>
			`;
			showModal(message, 'Select expedition member(s) to add', 'confirm', footerButtons);
		}
	} 


	onCheckAllSummitedButtonClick(e) {
		const $button = $(e.target);
		const $card = $button.closest('.card');
		const $checkboxes = $card.find('.data-list-item:not(.cloneable):not(.hidden) .center-checkbox-col .input-checkbox');
		const $summitDateInputs = $checkboxes.closest('.center-checkbox-col').next().find('.input-field');
		const allChecked = $checkboxes.filter(':checked').length == $checkboxes.length;
		const expeditionName = this.expeditionInfo.expeditions.expedition_name;//$('#input-expedition_name').val();
		const $routeInput = $button.closest('.card').find('.route-code-header-input:not(.mountain-code-header-input)');
		const routeCode = $routeInput.val();
		if (routeCode === '') {
			showModal('You must select a mountain and route first before you can mark that all climbers summited.', 'No Route Selected');
			return;
		}
		const routeName = $routeInput.find(`option[value=${routeCode}]`).text();
		var message, title, onConfirmClickHandler;
		if (allChecked) {
			// Ask user to uncheck all and clear
			message = `Are you sure you want to uncheck all ${routeName} summits for ${expeditionName}?`;
			title = `Uncheck all ${routeName} summits`;
			onConfirmClickHandler = () => {
				$('.confirm-button').click( () => {
					// Set summit checkboxes
					$checkboxes.prop('checked', false).change();
					// Set highest elevation to null
					$card.find('.data-list-item:not(.cloneable) .input-field[name=highest_elevation_ft]')
						.val(null)
						.change();
					// Set summit date to null
					$summitDateInputs.val(null);
					$card.find('.check-all-summitted-button').text('check all');
				})
			}

		} else {
			message = `<p>Do you want to mark all expedition members for the ${routeName} route` + 
				` with the same summit date? This will overwrite any summit dates currently entered.` + 
				` If so, enter the date below and click 'OK'. Otherwise just click 'OK' and all` + 
				` expedition members will be marked as having summitted but the summit date(s) won't change.</p>
				<div class="field-container col-8 single-line-field">
						<label class="field-label inline-label" for="modal-summit-date-input">Summit date</label>
						<input id="modal-summit-date-input" class="input-field modal-input" type="date">
				</div>` +
				'<p> Note that when you click <strong>OK</strong>, this group\'s status will be changed' + 
				' to <strong>Done and off mountain</strong></p>'
			;
			title = 'Enter summit date?';
			onConfirmClickHandler = () => {
				$('.confirm-button').click( () => {
					const summitDate = $('#modal-summit-date-input').val();
					$checkboxes.prop('checked', true).change();
					// If the user entered a summit date, fill the inputs
					if (summitDate) {
						$summitDateInputs.val(summitDate).change();
					}
					$card.find('.check-all-summitted-button').text('uncheck all');

					$('.input-field[name=group_status_code]').val(this.constants.groupStatusCodes.offMountain).change();

				})
			}
		}
		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal confirm-button" data-dismiss="modal">OK</button>
		`;
		showModal(message, title, 'confirm', footerButtons, {eventHandlerCallable: onConfirmClickHandler});
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

		var sqlStatements = [],
			sqlParameters = [],
			attachmentDeferreds = [];
		
		const $editParents = $(`
				.data-list-item:not(.cloneable), 
				.card:not(.cloneable) .tab-pane,
				#expedition-members-accordion .card:not(.cloneable) .card-header,
				#expedition-data-container
			`)
			.has('.input-field.dirty, .input-field:required:invalid');
		if (!this.validateFields($editParents)) {
			const errorFieldList = $('.input-field.error').map((_, el) => {
				const $el = $(el);
				let fieldName = '';
				if ($el.is('select')) {
					fieldName = $el.find('option[value=""]').text();
				} else {
					fieldName = $el.attr('placeholder');
				}
				return `<li>${fieldName}</li>`
			}).get()
			.join('');

			setTimeout(
				() => {showModal(`The following fields are not filled. All required fields must be filled before you can save your edits:<ul>${errorFieldList}</ul>`, 'Required field is empty')},
				500
			);
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
			expeditionValues.push(this.getInputFieldValue($(el)));
			expeditionFields.push(el.name);
		}
		if (expeditionValues.length) {
			// If this is a new expedition, make sure group status gets saved
			if (!expeditionID) $('#input-group_status').addClass('dirty');

			let fieldValues = Object.fromEntries(expeditionFields.map((f, i) => [f, expeditionValues[i]]));
			let [sql, parameters] = this.valuesToSQL(fieldValues, 'expeditions', now, userName, {updateID: expeditionID || null});
			sqlStatements.push(sql);
			sqlParameters.push(parameters);

			if (sql.startsWith('INSERT')) {
				inserts.push({container: $('#expedition-data-container'), tableName: 'expeditions'})
			}
		}

		// Get expedition members and member transactions
		const year = new Date($('#input-planned_departure_date').val()).getFullYear();
		let permitCount;
		const permitNumbersFilled = $('input[name=permit_number]').map((_, el) => el.value).get().every(v => v);
		const permitCountDeferred = permitNumbersFilled ? 
			$.Deferred().resolve() : // resolve the promise immediately so the SQL save request doesn't wait
			$.post({
				url: 'flask/next_permit_number',
				data: {year: year}
			}).done(response => {
				if (this.pythonReturnedError(response)) {
					print('Failed to get next permit number with error: ' + response);
				} else {
					permitCount = response;
				}
			}).fail((xhr, status, error) => {
				print('Failed to get next permit number with error: ' + error)
			});

		// Make a convenience function to get SQL for expedition members because the method 
		//	for doing so differs depending on whether the permit number needs to be filled 
		//	for each individual expedition member in the for loop below. This needs to 
		//	include transactions and route memebers so the SQL statements are in order. That is,
		//	transactions and routes for an expedition member can't be INSERTed before the member
		const getExpeditionMemberSQL = ($card) => {
			const climberID = $card.data('climber-id');
			// members
			if ($card.find('.card-header .input-field.dirty, .expedition-info-tab-pane .input-field.dirty').length) {
				const [sql, parameters] = this.inputsToSQL(
					$card.find('.expedition-info-tab-pane, .card-header'),
					'expedition_members', 
					now, 
					userName, 
					{
						updateID: $card.data('table-id') || null, 
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
			const $transactionItems = $card.find('.transactions-tab-pane .data-list > li.data-list-item:not(.cloneable)')
				.has('.input-field.dirty');
			for (const li of $transactionItems) {
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

		// Transactions and routes might have edits without expedition members having any, so loop 
		//	through each expedition member card, regardless of whether it has any dirty inputs
		for (const el of $('#expedition-members-accordion .card:not(.cloneable)')) {
			const $card = $(el);

			// expedition member
			const $permitNumberField = $card.find('input[name=permit_number]');
			const permitNumberEmpty = !$permitNumberField.val();
			// If the permit number field is empty, wait for the permit count request before getting SQL
			if (permitNumberEmpty) {
				permitCountDeferred.then(() => {
					const thisPermitNumber = `TKA-${year.toString().slice(2,4)}-${String(permitCount).padStart(4, '0')}`;
					$permitNumberField.val(thisPermitNumber)
							.change();
					permitCount ++; //increment for next permit
					getExpeditionMemberSQL($card);
				})
			} 
			// Otherwise, if there are other edits, just get the SQL immediately
			else {
				getExpeditionMemberSQL($card);
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
		
		// Make sure, if permit numbers had to be created, that the request was 
		//	answered first. If it wasn't necessary, the permitCountDeferred was
		//	resolved immediately and the request to save the data will fire 
		//	immediately as well
		return $.when(permitCountDeferred, ...attachmentDeferreds).then(() => {

			return $.post({ 
				url: 'climberdb.php',
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

						const {container, tableName} = inserts[i];
						if (tableName === 'expeditions') {
							expeditionID = id;
							
							// this was a new expedition, so add the expedition to the URL history
							this.updateURLHistory(expeditionID, $('#expedition-id-input'));
						}

						// Set the card's/list item's class and inputs' attributes so changes will register as updates
						const $container = $(container).closest('.data-list-item, .card');
						const parentTableID = (this.tableInfo.tables[tableName].foreignColumns[0] || {}).column;
						if ($container.is('.data-list-item')) $container.attr('data-parent-table-id', parentTableID); 
						const $inputs = $container.closest('.data-list-item, .card')
							.removeClass('new-card')
							.removeClass('new-list-item')
							.attr('data-table-id', id)
							.attr('data-table-name', tableName)
							.find('.input-field.dirty')
								.attr('data-table-name', tableName)
								.attr('data-table-id', id);
						const foreignIDs = Object.entries(returnedIDs).filter(([column, _]) => column !== 'id');
						if (Object.keys(foreignIDs).length) $inputs.data('foreign-ids', Object.fromEntries(foreignIDs));
						
					}


					// update in-memory data for each edited input
					const edits = this.edits;
					const expeditionInfo = this.expeditionInfo;
					const $editedInputs =  $('.input-field.dirty').removeClass('dirty');
					this.queryExpedition(expeditionID, {showOnLoadWarnings: false}) //suppress flagged expedition member warnings


					// Hide the save button again since there aren't any edits
					$('#save-expedition-button').ariaHide(true);
					// but open the reports modal button since there's something to show
					$('#open-reports-modal-button, #print-cache-tag-button, #edit-expedition-button, #delete-expedition-button').ariaHide(false);

				}
			}).fail((xhr, status, error) => {
				showModal(`An unexpected error occurred while saving data to the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
				// roll back in-memory data
			}).always(() => {
			 	climberDB.hideLoadingIndicator();
			});
		})
	}
	

	discardEdits() {
		
		// remove any new cards or new list items. This means that only updates (not inserts) need to be reset
		$('.new-card, .new-list-item, .refund-post-item').fadeRemove();

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
			const $el = $(el);
			const memberID = $el.closest('.card').data('table-id');
			const transactionID = $el.data('table-id'); 
			const transactionInfo = this.expeditionInfo.transactions[memberID].data[transactionID];
			this.setInputFieldValue(el, transactionInfo);
		}

		// routes
		const memberRoutes = this.expeditionInfo.expedition_member_routes;
		for (const card of $('#routes-accordion .card:not(.cloneable)')) {
			const $card = $(card);
			// get the route code from the card's data because if the user has changed the route, the input value won't match the in-memory route code
			const routeCode = $card.data('route-code');//memberRoutes.order[$card.index() - 1]
			const mountainCode = this.routeCodes[routeCode].mountain_code;
			
			// Manually revert mountain and route code fields
			const $mountainCodeInput = $card.find('.input-field[name=mountain_code]')
			if (mountainCode != $mountainCodeInput.val()) {
				// don't use .change event so that this runs synchronously
				$mountainCodeInput.val(mountainCode).removeClass('dirty');
				this.onRouteCardHeaderInputChange({target: $mountainCodeInput});
			}
			$card.find('.input-field[name=route_code]').val(routeCode);

			// Reset all other input field values using in-memory data
			for (const el of  $card.find('.input-field.dirty')) {
				const $listItem = $(el).closest('.data-list-item')
				//const routeCode = $listItem.find('.input-field[name=route_code]').val();
				const memberID = $listItem.data('expedition-member-id');
				const routeMemberInfo = this.expeditionInfo.expedition_member_routes.data[routeCode][memberID];
				this.setInputFieldValue(el, routeMemberInfo);
			}
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
	confirmSaveEdits({afterActionCallbackStr='', afterCancelCallbackStr='', afterActionCallback=()=>{}}={}) {
		//@param afterActionCallbackStr: string of code to be appended to html onclick attribute

		const onConfirmClick = `
			showLoadingIndicator('saveEdits');
			climberDB.saveEdits(); 
		`;
		
		// will have to update each confirmSaveEdsits call
		// const onConfirmEventHandler = () => { 
		// 		$('#alert-modal .confirm-button').click(
		// 			() => {
		// 				showLoadingIndicator('saveEdits');
		// 				this.saveEdits()
		// 					.done(() => {
		// 						afterActionCallback();
		// 					})
		// 			}
		// 		)
		// 		$('#alert-modal .discard-button').click(
		// 			() => {
		// 				// happens synchronously so no need to wait to call afterActionCallback
		// 				this.discardEdits();
		// 				afterActionCallback()
		// 			}
		// 		)
		// 	}

		const footerButtons = `
			<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal" onclick="${afterCancelCallbackStr}">Cancel</button>
			<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="climberDB.discardEdits();${afterActionCallbackStr}">Discard</button>
			<button class="generic-button modal-button primary-button confirm-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}${afterActionCallbackStr}">Save</button>
		`;

		showModal(
			`You have unsaved edits to this expedition. Would you like to <strong>Save</strong> or <strong>Discard</strong> them? Click <strong>Cancel</strong> to continue editing this expedition.`,
			'Save edits?',
			'alert',
			footerButtons,
			{eventHandlerCallable: afterActionCallback}
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
					$(`#expedition-options-drawer .expedition-search-bar-option[data-expedition-id=${expeditionID}]`).remove();
					this.createNewExpedition();
				}
			}).fail((xhr, status, error) => {
				showModal(`An unexpected error occurred while deleting data from the database: ${error}.`, 'Unexpected error');
			}).always(() => {
				hideLoadingIndicator();
			});

		}
	}

	/*
	Event handler for #delete-expedition-button
	*/
	onDeleteExpeditionButtonClick() {
		let message,
			title = 'Delete Expedition?',
			footerButtons = 
				'<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>' +
				'<button class="generic-button modal-button danger-button close-modal confirm-delete" data-dismiss="modal">Delete</button>',
			eventHandler = () => {$('.confirm-delete').click(() => {this.deleteExpedition()})}
			; 
		// Check the 
		const hasData = $(`
			#expedition-members-accordion .card:not(.cloneable), 
			.transactions-tab-pane .data-list-item:not(.cloneable), 
			#cmc-list .data-list-item:not(.cloneable)
		`).filter((_, el) => $(el).data('table-id')).length;

		// If expeditions.id is in memory, this expedition has already been saved to the database 
		if (this.expeditionInfo.expeditions.id && hasData) {
			// if the user is an administar, let them know they'll be deleting all related records
			if (this.userInfo.isAdmin) { 
				message = 'Are you sure you want to delete this expedition? All expedition member, transaction,' + 
					' and route information for this expedition will also be deleted. <strong>This action'  + 
					' is permanent and cannot be undone.</strong>';
			} 
			// if not, prevent them from deleting it
			else {
				message = 'You can\'t delete this expedition because it already has expedition member information' +
				' saved to it like transaction history, route information, etc. Only an adminstrator can delete it.';
				title = 'Insufficient Permissions'
				footerButtons = ''
			}
		} 
		// Let any user delete a new expedition. This should only ever be possible when 
		//	the user is deleting a saved expedition that doesn't have any related table 
		//	information (expedition members, etc) because the delete button is hidden 
		//	for new expeditions
		else {
			message = 'Are you sure you want to delete this expedition? If you click "Delete", all your' + 
				' edits will be removed.';
		}
		
		showModal(message, title, 'alert', footerButtons, {eventHandlerCallable: eventHandler});
	} 


	/*
	@param $card: the parent .card of the clicked change-expedition-button 
	*/
	showChangeExpeditionModal($card) {
		if ($card.is('.new-card')) {
			showModal('You can\'t move this expedition member to a different expedition until you have saved their information. Either save their information first or delete this expedition member and enter add them to the correct expedition.', 'Invalid Operation');
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
	When the user changes the expedition name, check to make sure it doesn't already exist for this year
	*/
	onExpeditionNameLostFocus(e) {
		const $input = $(e.target);
		if ($input.is('.ignore-duplicates')) return;

		const expeditionName = $input.val();
		
		// If the the name matches the current expedition name, do nothing because the user didn't change anything
		const currentExpeditionName = this.expeditionInfo.expeditions.expedition_name;
		if (expeditionName === currentExpeditionName) return;

		const $expeditionOptions = $('.expedition-search-bar-option');
		const existingExpeditions = $expeditionOptions.map((i, el) => el.innerHTML).get();
		const existingIndex = existingExpeditions.indexOf(expeditionName);
		if (existingIndex !== -1) {
			const expeditionID = $expeditionOptions.eq(existingIndex).data('expedition-id');
			const message = `An expedition with the name "${expeditionName}" has already been created. <a href="expeditions.html?id=${expeditionID}">Click here</a> to open that expedition. To change the name to something unique like "${expeditionName}-1", click <strong>OK</strong>. To disable this message for this session, click <strong>Disable warning</strong>.`;
			const footerButtons =
				'<button class="generic-button danger-button modal-button close-modal disable-warning-button" data-dismiss="modal">Disable warning</button>' +
				'<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">OK</button>'
			
			const eventHandler = () => {
				$('.modal-footer .confirm-button').click(e => {
					$('#input-expedition_name').focus();
				});
				$('.modal-footer .disable-warning-button').click(e => {
					$('#input-expedition_name').addClass('ignore-duplicates');
				});
			}
			showModal(message, 'Duplicate Expedition Name', 'alert', footerButtons, {eventHandlerCallable: eventHandler});
		}
	}


	/*
	For some reason making the PSAR checkbox container a .collapse doesn't work, so just .ariaHide() it
	*/
	onGuideCompanyInputChange(e) {
		const guideCompanyCode = $(e.target).val();
		$('.input-checkbox[name=psar_complete]')
			.closest('.card-header-field-container')
				.ariaTransparent(guideCompanyCode != -1);
	}

	/*
	Change the color of card headers to green for NPS groups
	*/
	onSpecialGroupTypeChange(e) {
		// Toggle the nps-patrol class, depending on whether the special group type is set to NPS
		$('.expedition-content').toggleClass('nps-patrol', $(e.target).val() == 3)
	}

	onDateConfirmedChange(e) {
		const dateConfirmed = e.target.value;
		
		// When clearing form for new expedition, dateConfirmed changes before planned departure 
		//	does, but it's the planned departure value that determines whether the user should 
		//	be prompted. So if dateConfirmed is null, just exit
		if (!dateConfirmed) return;

		const $plannedDepartureInput = $('#input-planned_departure_date');
		const departureDate = new Date($plannedDepartureInput.val() + ' 00:00');
		const now = new Date();
		const minDaysAfterConfirm = this.config.minimum_days_after_confirm;
		const daysToDeparture = parseInt(Math.round((departureDate - now) / this.constants.millisecondsPerDay));
		if (daysToDeparture < minDaysAfterConfirm) { // if minimum_days_after_confirm is not in the config table, do nothing
			const newDepartureDate = new Date(now.getTime() //timestamp in milliseconds
				+ (minDaysAfterConfirm * this.constants.millisecondsPerDay) // add milliseconds in minDaysAfterConfirm
				//+ (60000 * now.getTimezoneOffset()) // add timezone offset (.getTimezoneOffset() returns offset in minutes)
			);
			const message = `You've marked this expedition as confirmed on ${now.toLocaleDateString('en-US', {month: 'long', day: 'numeric', timezone: 'UTC'})} but they're scheduled to depart <strong>${daysToDeparture} days</strong> from now. Would you like to set the departure date to <strong>${newDepartureDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', timezone: 'UTC'})}</strong>, ${minDaysAfterConfirm} days from now?`
			const eventHandlerCallable = () => {
				$('#alert-modal .confirm-button').click(() => { 
					$('#input-planned_departure_date')
						.val(getFormattedTimestamp(newDepartureDate))
						.change(); 
				})
			}
			//showModal(message, 'Update Planned Departure?', 'confirm', '', {eventHandlerCallable: eventHandlerCallable});
		}
	}


	/*
	Helper method to check if a climber can be confirmed. Shows message and reverts 
	value if not. Called in reservation and group status change events 
	*/
	climberCanBeConfirmed($card, $select) {

		// Check if this is a guided group. If so, PSAR checkbox doesn't need to be checked
		const isGuided = $('#input-guide_company').val() != -1;

		// Check that the climber is actually being confirmed
		const isBeingConfirmed = $select.val() == 3;
		if (!isBeingConfirmed) return true;

		let reasons = '';
		if ($card.find('.climbing-fee-icon').is('.transparent')) 
			reasons += '<li>have not paid their climber fee</li>';
		if ($card.find('.input-field[name=application_complete]').is(':not(:checked)')) 
			reasons += '<li>have not completed their SUP application</li>';
		// only check for PSAR form if the group is guided and the user is being marked as confirmed
		if (!isGuided && isBeingConfirmed && $card.find('.input-field[name=psar_complete]').is(':not(:checked)')) 
			reasons += '<li>have not completed their PSAR form</li>';
		// If any conditions aren't met, tell the user and revert the res. status field's value
		if (reasons) {
			const memberInfo = this.expeditionInfo.expedition_members.data[$card.data('table-id')] || {};
			const climberName = memberInfo.first_name ? `${memberInfo.first_name} ${memberInfo.last_name}` : 'This expedition member';
			const statusDescription = $select.find(`option[value=${$select.val()}]`).text();
			const message = 
				`${climberName}'s status can't be changed to '${statusDescription}' because they: <ul>${reasons}</ul> All climbers` +
				` must have a climbing fee payment or waiver in their transaction history and the <strong>SUP app</strong> and` +
				` <strong>PSAR</strong> checkboxes must be checked before they can be marked as '${statusDescription}'.`;
			const eventHandlerCallable = () => {
				$('#alert-modal button').click(() => {this.revertInputValue($select)})
			}
			showModal(message, 'Missing Payment/Information', 'alert', '', {eventHandlerCallable: eventHandlerCallable})
			return false;
		} else {
			return true;
		}
	}


	onReservationStatusFieldChange(e) {
		const $select = $(e.target);
		const $card = $select.closest('.card');
		const value = parseInt($select.val());
		const isCancelled = value === this.constants.groupStatusCodes.cancelled;
		const isConfirmed = value === this.constants.groupStatusCodes.confirmed;

		// Set the datetime_cancelled field
		const now = getFormattedTimestamp();
		const cardID = $select.attr('id').match(/-\d+$/).toString();
		$(`#input-datetime_cancelled${cardID}`).val(isCancelled ? now : null).change();

		// Show as cancelled and move to bottom
		$card.toggleClass('cancelled', isCancelled);
		if (isCancelled) {
			$card.appendTo($card.closest('.accordion'));
		}
		// If the user is confirming this expedition member, check that they've paid and turned everything in 
		else if (isConfirmed) {
			const $card = $select.closest('.card');
			if (!this.climberCanBeConfirmed($card, $select)) return;
		}

		if (!e.preventStatusPropagation) {
			// Hide/show this expedition member in any routes 
			const expeditionMemberID = $card.data('table-id');
			if (expeditionMemberID) {
				$(`.route-member-list .data-list-item[data-expedition-member-id=${expeditionMemberID}]`)
					.ariaHide(isCancelled);
			}

			// Change the group's status if all equal the same value
			const reservationStatuses = $select.closest('.accordion').find('.card:not(.cloneable) .reservation-status-field')
				.map((_, el) => el.value)
				.get();
			const minStatus = Math.min(...reservationStatuses);//[0];
			const $groupStatusSelect = $('#input-group_status');

			//if (reservationStatuses.every(v => v == firstStatus || v == 6) && $groupStatusSelect.val() != firstStatus) { 
			if ($groupStatusSelect.val() != minStatus) {
				$groupStatusSelect.val(minStatus).change();

				// If the date_confirmed field isn't blank, fill it 
				const $dateConfirmedField = $('#input-date_confirmed'); 
				if (isConfirmed && !$dateConfirmedField.val()) {
					$dateConfirmedField.val(getFormattedTimestamp()).change();
				}
			}
		}
	}


	/*
	Reset the briefing link (and associated text) to the default (indicating there is no briefing). 
	If planned departure is set, default to opening the briefings page with that date at least
	*/
	resetBriefingLink() {
		const expeditionData = this.expeditionInfo.expeditions;
		
		const $briefingLink = $('#expedition-briefing-link')
			.text('Set briefing time');
		$('.field-label[for=expedition-briefing-link]').text('No briefing scheduled');

		if (expeditionData.planned_departure_date) {
			$briefingLink.attr('href', `briefings.html?date=${expeditionData.planned_departure_date}`);
		} else {
			$briefingLink.attr('href', `briefings.html`);
		}
	}


	onGroupStatusFieldChange(e) {
		const statusCode = parseInt(e.target.value || 0);
		
		// Toggle required fields
		this.toggleRequiredOnInput(
			$('#input-planned_return_date'), 
			statusCode > this.constants.groupStatusCodes.pending && statusCode !== this.constants.groupStatusCodes.cancelled
		);
		this.toggleRequiredOnInput(
			$('#input-actual_departure_date'), 
			statusCode !== this.constants.groupStatusCodes.confirmed
		);
		this.toggleRequiredOnInput(
			$('#input-air_taxi'), 
			statusCode === this.constants.groupStatusCodes.onMountain || statusCode === this.constants.groupStatusCodes.offMountain
		);
		this.toggleRequiredOnInput(
			$('#input-actual_return_date'), 
			statusCode === this.constants.groupStatusCodes.offMountain
		);

		// Only do stuff if the event was triggered by the user, not with .change()
		if (e.originalEvent) {
			const $select = $(e.target);
			//const statusCode = $select.val();
			const status = $select.find(`option[value=${statusCode}]`).text();
			const $memberCards = $('#expedition-members-accordion .card:not(.cloneable, .cancelled)');
			const expeditionInfo =  this.expeditionInfo;
			
			if ($memberCards.length === 0) {
				showModal(`You have not added any (non-canceled) expedition members yet, so this expedition's status can't be changed to ${status}.`, 'No Expedition Members');
				this.revertInputValue($select, {triggerChange: true})
				return;
			} else if ($memberCards.length === 1) {
				const $reservationStatus = $memberCards.find('.input-field[name=reservation_status_code]');
				if ($reservationStatus.val() != this.constants.groupStatusCodes.cancelled) {
					$reservationStatus
						.val(statusCode)
						.change();
				}
			} else {
				for (const el of $memberCards) {
					const $card = $(el);

					if (!this.climberCanBeConfirmed($card, $select)) {
						// ^ warning already issued so just revert the group status field
						this.revertInputValue($select, {triggerChange: true})
						return;
					} else {
						const $reservationStatus = $card.find('.input-field[name=reservation_status_code]');
						// Only change the value if this climber isn't canceled
						if ($reservationStatus.val() == this.constants.groupStatusCodes.cancelled) continue;
						
						// Don't trigger change
						$reservationStatus.val(statusCode);
						// Instead, call the change handler manually so that things that downstream 
						//	things that the group status shouldn't influence are unaffected. This also avoids 
						//	and endless loop because onReservationStatusFieldChange also calls .change() on 
						//	the group status field
						this.onReservationStatusFieldChange({
							target: $reservationStatus[0], 
							preventStatusPropagation: true
						});
						this.toggleDependentFields($reservationStatus); // this also needs to be called manually

						// If the value is different from the in-memory value, manually add the .dirty class
						if (this.inputValueDidChange($reservationStatus)) $reservationStatus.addClass('dirty');

					}
				}	
			}

			// If the date_confirmed field isn't blank, fill it 
			const $dateConfirmedField = $('#input-date_confirmed'); 
			if (statusCode == this.constants.groupStatusCodes.confirmed && !$dateConfirmedField.val()) {
				$dateConfirmedField.val(getFormattedTimestamp()).change();
			}

			
			const isCancelled = statusCode == 6;
			// Show the search bar drawer option as cancelled (or not)
			$(`.expedition-search-bar-option[data-expedition-id=${expeditionInfo.expedition_id}]`).toggleClass('cancelled', isCancelled);

			// If the expedition is being cancelled, ask if the briefing should also be cancelled
			const briefingInfo = expeditionInfo.briefings;
			if (isCancelled && briefingInfo.briefing_datetime) {
				const expeditionName = $('#input-expedition_name').val();
				const message = `Do you also want to cancel the briefing for ${expeditionName} scheduled` + 
					` for ${briefingInfo.briefing_datetime}? <strong> This action is permanent and` + 
					` cannot be undone</strong>.`
				const footerButtons = 
					'<button class="generic-button modal-button close-modal danger-button confirm-button" data-dismiss="modal">Yes</button>' + 
					'<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">No</button>'
				const eventHandler = () => {
					$('#alert-modal .confirm-button').click(() => {
						this.queryDB(`DELETE FROM briefings WHERE id=${briefingInfo.id} RETURNING id`)
							.done(queryResultString => {
								if (this.queryReturnedError(queryResultString)) {
									showModal('Failed to delete briefing because ' + queryResultString, 'Unexpected Error')
								} else {
									this.resetBriefingLink()
								}
							})
					})
				}
				showModal(message, 'Cancel Briefing?', 'confirm', footerButtons, {eventHandlerCallable: eventHandler})
			}
		}
	}


	/*
	When the user types anything in the modal search bar, hide the confirm button because it should only be shown when a user clicks an expedition option
	*/
	onModalSearchBarInputKeyUp(e) {
		$('#confirm-change-expedition-button').ariaHide(true);
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
						$searchBar.siblings('.fuzzy-search-bar-drawer')
							.find('.expedition-search-bar-option.selected').removeClass('selected');
						$option.addClass('selected');

						// Set the search bar value
						$searchBar.val(selectedExpeditionName);

						// If this is the modal search bar, show/hide the confirm button
						$('#confirm-change-expedition-button').ariaHide(false);
					}
				}
			})
		// Warn the user if this expedition is from a previous year
		this.queryDB(`SELECT planned_departure_date FROM expeditions WHERE id=${expeditionID}`)
			.done(queryResultString => {
				if (!this.queryReturnedError(queryResultString)) {
					const result = $.parseJSON(queryResultString);
					if (result.length) {
						const departureYear = new Date(result[0].planned_departure_date + ' 00:00').getFullYear();
						if (departureYear < new Date().getFullYear()) {
							showModal(`You selected the expedition <strong>${selectedExpeditionName}</strong> which has a planned departure from <strong>${departureYear}</strong>. Make sure you selected the right expedition before confirming the expedition change.`, 'Selected Expedition From Previous Year')
						}
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
					$('#confirm-change-expedition-button').ariaHide(true);
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
	Check conditions before calling makePDF
	*/
	onCreatePDFButtonClick() {
		const exportType = $('#input-export_type').val();
		const nMembers = $('#expedition-members-accordion .card:not(.cloneable):not(.cancelled)').length;
		const nRoutes = $('#routes-accordion .card:not(.cloneable)').length;
		if (nMembers === 0) {
			showModal(
				'There are no active members of this expedition. You must add at least one member or' +
				' set at least one member\'s status to something other than "cancelled".', 
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
	}


	/*
	Dynamically make a PDF of the specified type. Send a request to the Flask backend 
	to make the PDF from a Jinja template filled in with the current expedition's data
	*/
	makePDF(exportType) {


		if (!exportType) exportType = $('#input-export_type').val();
		
		// Most of the necessary data will be in these two objects
		var pdfData = {
			...this.expeditionInfo.expeditions, 
			...this.config
		};
		
		// Get human-readable values from selects
		for (const property of Object.keys(climberDB.expeditionInfo.expeditions).filter(k => k.endsWith('_code'))) {
			pdfData[property.replace('_code', '')] = this.selectValueToText(property, pdfData[property]);
		}

		pdfData.cancellation_fee = pdfData.cancellation_fee || '100.00';

		if (exportType === 'transaction_history') {
			// Format data into array of objects like 
			/*
			[
				{
					climber_prop_1: ...,
					transactions: {
						transaction_prop_1: ...
					}
				}
			]
			*/
			let transactionHistory = []
			const members = this.expeditionInfo.expedition_members;
			for (const memberID of members.order) {
			    const memberInfo = members.data[memberID];
			    const transactionInfo = this.expeditionInfo.transactions[memberID];
			    const transactions = [];
			    for (const id of transactionInfo.order) {
			    	const transactionData = transactionInfo.data[id];
			    	// convert codes to human-readable text
			    	for (const property of Object.keys(transactionData).filter(k => k.endsWith('_code'))) {
			    		transactionData[property.replace('_code', '')] = this.selectValueToText(property, transactionData[property]);
			    	}
			    	// Format transaction date as text
			    	transactionData.transaction_date = new Date(transactionData.transaction_date + ' 00:00')
			    		.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
			    	
			    	transactions.push(transactionData);
			    }
			    const balance = transactions.map(t => !t.transaction_value ? 0 : parseFloat(t.transaction_value))
					.reduce((runningTotal, value) => runningTotal + value)
					.toFixed(2)
			    const memberData = {
			        climber_name: memberInfo.first_name + ' ' + memberInfo.last_name,
			        status: $(`#input-group_status option[value=${memberInfo.reservation_status_code}]`).text(),
			        transactions: transactions,
			        balance: balance
			    }
			    transactionHistory.push(memberData);
			}
			pdfData.transaction_history = JSON.stringify(transactionHistory);
		} 
		// Reg. card and confirm. letter
		else {
			// Get climber and leader info
			const climbers = Object.values(this.expeditionInfo.expedition_members.data).flatMap(info => {
				// Skip cancelled climbers
				if (info.reservation_status_code == 6) return []; // flatmap will remove this

				// destructure the climber's info and get just first_name and last_name
				const climberInfo = (({ first_name, last_name }) => ({ first_name, last_name }))(info);
				
				// Get full name for ease of use
				const fullName = info.first_name + ' ' + info.last_name;
				climberInfo.full_name = fullName;

				// Get leader info since we're looping through values anyway
				climberInfo.is_trip_leader = info.is_trip_leader === 't' || info.is_trip_leader === true;
				climberInfo.is_guiding = 
					info.is_guiding === 't' || info.is_guiding === true
					info.is_interpreter === 't' || info.is_interpreter === true;		
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

			// Get briefing time
			const briefingInfo = this.expeditionInfo.briefings;
			if (briefingInfo.briefing_date && briefingInfo.briefing_time) {
				const options = {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric'
				};
				pdfData.briefing_time = new Date(`${briefingInfo.briefing_date} ${briefingInfo.briefing_time}`)
					.toLocaleString('en-US', options);
			}
		}

		if (exportType == 'registration_card') {
			// Get route data: for each card, get the mountain name
			pdfData.routes = [];
			for (const card of  $('#routes-accordion > .card:not(.cloneable)')) {
				const $card = $(card);
				const route = this.routeCodes[$card.find('.route-code-header-input[name="route_code"]').val()];
				const mountainName = $card.find(`.route-code-header-input[name="mountain_code"] option[value="${route.mountain_code}"]`).text();
				pdfData.routes.push({mountain: mountainName, route: route.name});
			} 	
			pdfData.routes = JSON.stringify(pdfData.routes);
		}

		this.showLoadingIndicator('makePDF');

		return $.post({
			url: `flask/reports/${exportType}/${this.expeditionInfo.expeditions.id}.pdf`,
			data: pdfData,
			cache: false
		}).done(responseData => {
			if (this.pythonReturnedError(responseData)) {
				showModal('Your PDF could not be exported because of an unexpected error: ' + responseData, 'Unexpected Error');
				return;
			}
			window.open(responseData, '_blank')
        }).always(() => {
        	this.hideLoadingIndicator()
        });

	}


	/*
	Update the source Excel file for Label Matrix server-side
	*/
	writeToLabelMatrix() {
		let tripLeaderInfo = Object.values(this.expeditionInfo.expedition_members.data).filter(info => info.is_trip_leader === 't')
		if (!tripLeaderInfo.length) {
			showModal('You have not selected a trip leader yet. You select a trip leader before you can create cache tags', 'No Trip Leader Specified');
			return;
		} else {
			tripLeaderInfo = tripLeaderInfo[0];
		}

		const airTaxiCode = this.expeditionInfo.expeditions.air_taxi_code;
		const airTaxiName = $('#input-air_taxi option').filter((_, el) => el.value == airTaxiCode).text();
		const labelData = {
			expedition_name: this.expeditionInfo.expeditions.expedition_name,
			leader_name: tripLeaderInfo.first_name + ' ' + tripLeaderInfo.last_name,
			air_taxi_name: airTaxiName,
			planned_return_date: this.expeditionInfo.expeditions.planned_return_date,
			expedition_id: this.expeditionInfo.expeditions.id
		}

		$.post({
			url: 'flask/cache_tags/write_label_matrix',
			data: labelData,
			cache: false
		}).done((response) => {
			if (this.pythonReturnedError(response)) {
				showModal('This expedition\'s data could not be transferred to Label Matrix because of an unexpected error: ' + response, 'Unexpected Error')
			} else {
				showModal('Expedition data was successfully transferred to Label Matrix. Open the Label Matrix program and print your labels from there.', 'Data Transferred to Label Matrix')
			}
		}).fail((xhr, status, error) => {
			showModal('This expedition\'s data could not be transferred to Label Matrix because of an unexpected error: ' + error, 'Unexpected Error')
		})
	}


	/*
	onclick event handler for print-cache-tag-button. Right now, it just updates an Excel file that the Label Matrix software points to
	*/
	onPrintCacheTagButtonClick() {

		if (!this.showDenyEditPermissionsMessage()) return;

		// Only allow printing cache tags if the group is either confirmed, on mountain, or off mountain
		const groupStatusCode = parseInt($('#input-group_status').val());
		if (![3, 4, 5].includes(groupStatusCode)) {
			showModal(`The group status for this expedition is not 'Confirmed', 'On Mountain', or 'Off Mountain', so cache tags can't be printed.`, 'Invalid Group Status');
			return;
		}

		// If there are unsaved edits, prompt the user to either save or discard them
		if ($('.dirty').length) {
			//this.confirmSaveEdits({afterActionCallback: () => {this.writeToLabelMatrix()} })
			showModal(`You have unsaved edits. Either click the <strong>Save</strong> button to keep your edits or click the <strong>Edit</strong> button and choose <strong>Discard</strong> to undo your edits. Then you can print cache tags.`, 'Unsaved Edits')
			return;
		} 
		// Or if not, just print
		else {
			this.writeToLabelMatrix();
		}
	}


	/*Show modal climber form to allow the user to select a climber to add to the expedition*/
	showModalAddMemberForm({limitToPreviousClimbers=false}={}) {

		$('#add-climber-form-modal-container').ariaHide(false);
		this.climberForm.$el.addClass('climberdb-modal');

		const $climberForm = this.climberForm.$el;
		this.clearInputFields({parent: $climberForm, triggerChange: false});

		$('#7-day-only-filter').prop('checked', limitToPreviousClimbers);

		// If the climber select has a valid value (climber ID from a previous query)
		//	load the currently selected climber
		const $select = $('#modal-climber-select');
		const climberID = $select.val();
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
		
		const departureDateString = $('#input-planned_departure_date').val();
		const departureDate = new Date(departureDateString + ' 00:00');
		const now = new Date();
		const isPrivate = $('#input-guide_company').val() === '';
		const climberAdditionDayRestriction = this.config.days_before_climber_addition_restriction;

		// If this is not a guided expedtion and the group is confirmed
		if (climberAdditionDayRestriction && isPrivate) {
			const dateConfirmed = new Date($('$input-date_confirmed').val() + ' 00:00');
			
			// check that another member hasn't been added within 30 days
			for (const el of $('.input-field[name=datetime_reserved]')) {
				const dateAdded = new Date(el.value + ' 00:00');
				const daysReservedToDeparture = (departureDate - dateAdded) / this.constants.millisecondsPerDay;
				if (daysReservedToDeparture < climberAdditionDayRestriction) {
					const message = `An expedition member has already been added within`
						+ ` ${climberAdditionDayRestriction} days of this group's planned departure of ` 
						+ departureDateString.toLocaleDateString('en-US', {month: 'long', day: 'numeric', timezone: 'UTC'});
					showModal(message, 'WARNING: 30-Day Rule Violation');
					break;
				}
			}

		}

		// Check if there's already the max number of climbers
		const nMembers = $('#expedition-members-accordion .card:not(.cloneable):not(.cancelled)').length;
		let maxClimbers = this.config.max_expedition_members
		if ($('#input-guide_company')) maxClimbers ++;
		if (nMembers >= maxClimbers) {
			showModal(
				`This group has reached or exceeded the maximum group size of ${maxClimbers} with ${nMembers} expedition members`,
				'WARNING: Group Size Violation'
			)
		}

		// If this is within seven days (and not an NPS expedition, automatically limit results to just 
		//	climbers who have already been on Denali or Foraker this year
		const daysToDeparture = (departureDate - now) / this.constants.millisecondsPerDay;
		const previousClimberAdditionDays = this.config.days_before_previous_climber_addition_restriction;
		const specialGroupType = $('#input-special_group_type').val();
		const limitToPreviousClimbers = 
			specialGroupType != 3 && // 3 === NPS and not subject to 7-day rule
			previousClimberAdditionDays && 
			daysToDeparture > 0 && 
			daysToDeparture <= previousClimberAdditionDays;
		
		if (limitToPreviousClimbers)	{
			showModal('This expedition is scheduled to depart in ' + previousClimberAdditionDays + ' days or less. Only climbers who have previously climbed Denali or Foraker can be added to this expedition. When you search for climbers, the results will automatically be limited to only climbers who meet this criteria.', 
				'WARNING: 7-Day Rule in Effect',
				'alert',
				'',
				{
					eventHandlerCallable: () => {
						$('.confirm-button').click(() => {$('#modal-climber-search-bar').focus()})
					}
				}
			);
			
		}	

		this.showModalAddMemberForm({limitToPreviousClimbers: limitToPreviousClimbers});

	}


	/*
	Populate the modal climber select options
	*/
	fillClimberFormSelectOptions(searchString) {

		let whereClause = '';
		if ($('#7-day-only-filter').prop('checked')) 
			whereClause += ' WHERE climber_info_view.id IN (SELECT climber_id FROM seven_day_rule_view) ';
		if ($('#guide-only-filter').prop('checked')) 
			whereClause += whereClause ? ' AND is_guide' : ' WHERE is_guide';
		
		const queryFields = 'id, full_name';
		const sql = this.getCoreClimberSQL({searchString: searchString,  queryFields: queryFields, whereClause: whereClause});

		$('#climber-search-result-count').text('')
			.ariaHide(true);

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
					const resultCount = result.length;
					if (resultCount === 0) {
						$select.append('<option value="">No climbers match your search</option>')

						// Because results are asynchonous, make sure result count is hidden
						$('#climber-search-result-count').text('')
							.ariaHide(true);
					} else {
						// Still show placeholder option because a climber should not be selected automatically
						$select.append('<option value="">Select climber to view</option>')
						for (const row of result) {
							$select.append(`<option value="${row.id}">${row.full_name}</option>`);
						}
						// Because the result is retrieved asynchonously and when a user types no search is done, 
						//	
						if ($('#modal-climber-search-bar').val().length >= 3 || $('#guide-only-filter').prop('checked')) {
							$('#climber-search-result-count').text(
									`${resultCount} climber${resultCount > 1 ? 's' : ''} found`
								)
								.ariaHide(false);
						}
					}
				}
			})
			.fail((xhr, status, error) => {
				console.log('fillClimberFormSelectOptions query failed: ' + sql);
			})
	}


	/*
	Event handler for a .close button on the modal climber form
	*/
	onCloseClimberFormModalClick(e) {
		const $climberFormModal = $('#add-climber-form-modal-container')
			.ariaHide(true);
		this.climberForm.$el.removeClass('climberdb-modal');
		
		// Make the form blank so tha when the user opens it again, 
		//	it's reset to it's original state
		$('#modal-climber-search-bar').val('');
		$('.modal-climber-select-container').collapse('hide')
			.find('select > option:not([value=""])')
				.remove();
		$('#climber-search-result-count').text('')
			.ariaHide(true);
		$('#climber-search-option-loading-indicator').ariaHide(true);
		$('#result-details-header-title').text('');
		$('.result-details-summary-container').collapse('hide')

		$climberFormModal.find('.result-details-header-badge').ariaHide(true);

		$('#edit-climber-info-button').collapse('hide');
	}

	/*
	Helper function called by either keyup event on modal climber search bar or select refresh button
	This allows access to the deferred result of fillClimberFormSelectOptions
	*/
	refreshClimberSelectOptions(searchString) {

		$('#modal-climber-select').closest('.collapse').collapse('show');

		const $loadingIndicator = $('#climber-search-option-loading-indicator').ariaHide(false);
		return this.fillClimberFormSelectOptions(searchString)
			.always(() => {$loadingIndicator.ariaHide(true)});
	}

	/*
	Event hander for the search bar on the modal "add expedition member" form
	*/
	onClimberFormSearchKeyup() {
		const $input = $('#modal-climber-search-bar');
		const searchString = $input.val();
		// If a search string was entered or the guide filter was checked, search
		if (searchString.length >= 3 || $('#guide-only-filter').prop('checked')) { 
			this.refreshClimberSelectOptions(searchString);
		} 
		// Otherwise, hide the select
		else {
			$('#modal-climber-select')
				.empty()
				.closest('.collapse')
				.collapse('hide');
			$('#climber-search-result-count').text('');
			$input.focus();
		}
	}

	onRefreshModalClimberSelectClick() {

		// get currently selected climber and reselect it after refresh
		const $select = $('#modal-climber-select');
		const currentSelection = $select.val();
		const $input = $('#modal-climber-search-bar');
		const searchString = $input.val();
		showLoadingIndicator('onRefreshModalClimberSelectClick');
		if (searchString.length >= 3) {
			this.refreshClimberSelectOptions(searchString)
				.done(resultString => {
					// Try to reselect the previously selected climber, if one was selected
					
					// If there was no selection, just exit
					if (!currentSelection) {
						hideLoadingIndicator();
						return;
					}
					// Otherwise, check every 20 milliseconds if the option has been added to the select
					else {
						var intervalID;
						const callback = () => {
							if ($select.find(`option[value=${currentSelection}]`).length) {
								// Select the option again
								$select.val(currentSelection).change();
								//	If so, breack out of the interval loop 
								clearInterval(intervalID);
								hideLoadingIndicator();
							}
						}
						intervalID = setInterval(callback, 20);
					}
				})
		}
	}


	/*
	Event handler for modal form climber select
	*/
	onModalClimberSelectChange(e) {
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
		$('.climber-form .result-details-header-badge').ariaHide(true);
		
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
	}


	/*
	Get info from climber form's currently selected climber and add a new card
	*/
	onAddClimberToExpeditionClick(e) {

		// Check if the climber is already a member of this expedition
		const currentClimberIDs = Object.values(climberDB.expeditionInfo.expedition_members.data)
			.map(member => member.climber_id);
		const climberID = $('#modal-climber-select').val();
		const climberInfo = this.climberForm.selectedClimberInfo.climbers[climberID];
		if (currentClimberIDs.includes(climberID)) {
			showModal(`${climberInfo.first_name} ${climberInfo.last_name} is already a member of the expedition '${this.expeditionInfo.expeditions.expedition_name}'`, 'Climber is already a member');
			return;
		}

		// add the card
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

		// Save climber info to memory so it can be referenced later
		this.climberInfo[climberID] = {
			firstName: climberInfo.first_name, 
			lastName: climberInfo.last_name, 
			isCommercialGuide: climberInfo.is_guide
		}

		// Add the member to each route
		for (const ul of $('.card:not(.cloneable) .route-member-list')) {
			this.addRouteMember(ul, `${climberInfo.last_name}, ${climberInfo.first_name}`, climberID);
		}

		// The guide fields are hidden by default so show them if this climber is a guide
		$memberCard.find('.input-field[name=is_guiding]')
			.closest('.collapse')
				.collapse(climberInfo.is_guide ? 'show' : 'hide');

		// If the climber is a guide and this is a guided expedition, ask if the climber is guiding on this expedition
		if (climberInfo.is_guide && $('#input-guide_company').val() != -1) {
			const message = 'This climber is marked as a guide in the database. Would you like to mark them as a guide on this expedition?'
			const footerButtons = `
			<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">No</button>
			<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">Yes</button>
			`;
			const eventHandler = () => {
				$('#alert-modal .confirm-button').click(() => {
					$memberCard.find('.input-checkbox[name=is_guiding]')
						.prop('checked', true)
						.change();
				})
			}
			showModal(message, 'Is This Climber Guiding?', 'confirm', footerButtons, {eventHandlerCallable: eventHandler});
		}
		
		$(e.target).siblings('.close-modal-button').click();
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


	fillExpeditionSearchSelect({$searchBar='#expedition-search-bar', searchString=null, showExpeditionOptions=false, queryStrings={}}={}) {
		
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
		if (searchString === null) searchString = $searchBar.val();
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
				expedition_name,
				group_status_code  
				${similarity ? `, ${similarity} AS search_score` : ''} 
			FROM expedition_info_view 
			${whereClause} 
			ORDER BY ${orderBy}`;
		return this.queryDB(sql, {returnTimestamp: true})
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
							const cancelledClass = row.group_status_code == 6 ? 'cancelled' : '';
							$drawer.append(`<div class="expedition-search-bar-option ${cancelledClass}" data-expedition-id="${row.expedition_id}" tabindex="0">${row.expedition_name}</div>`)
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
	createNewExpedition({triggerChange=true}={}) {
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
		$('.expedition-edit-button:not(#print-cache-tag-button)').ariaHide(true);
		this.toggleEditing({forceEditingOn: true});

		// Clear fields and data
		this.clearExpeditionInfo({triggerChange: triggerChange});

		// Set header values
		$('#expedition-modified-by-result-summary-item .result-details-summary-value')
			.text(this.userInfo.ad_username);
		$('#expedition-modified-time-result-summary-item .result-details-summary-value')
			.text((new Date()).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}));	
		$('#expedition-n-members-result-summary-item').collapse('hide');
		$('#expedition-number-result-summary-item').collapse('hide')
			.find('.result-details-summary-value').text('');

		$('.needs-filled-by-default').addClass('filled-by-default')
	}


	/*
	Event handler for add-new-expedition-button
	*/
	onNewExpeditionButtonClick() {
		
		if (!this.showDenyEditPermissionsMessage()) return;

		if ($('.input-field.dirty:not(.filled-by-default)').length) {
			this.confirmSaveEdits({afterActionCallbackStr: 'climberDB.createNewExpedition();'})
		} else {
			this.createNewExpedition()
		}
	}


	updateExpeditionMemberCount() {
		const nMembers = $('#expedition-members-accordion > .card:not(.cloneable):not(.cancelled)').length;
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
		const climberName = `${lastName}, ${firstName}`;
		const options = {
				accordionName: 'expedition_members', 
				cardLinkText: climberName,
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
		const $transactionsList = $newCard.find('.transactions-tab-pane	.data-list');
		$transactionsList.attr('id', $transactionsList.attr('id') + '-' + climberID);
		
		// Fill inputs
		if (expeditionMemberInfo) {
			for (const el of $newCard.find('.card-header .input-field, .expedition-info-tab-pane .input-field')) {
				this.setInputFieldValue(el, expeditionMemberInfo, {dbID: expeditionMemberID, triggerChange: isNewCard})
			}

			if (expeditionMemberInfo.reservation_status_code == 6) $newCard.addClass('cancelled');
			if (expeditionMemberInfo.is_guiding) $newCard.find('.guide-icon').ariaTransparent(false);

			// Add transaction rows
			const transactions = this.expeditionInfo.transactions[expeditionMemberID];
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
				for (const el of $item.find('.input-field:not(.entry-metadata-field)')) {
					this.setInputFieldValue(el, thisTransaction, {dbID: transactionID, triggerChange: true});
				}

				// Fill metadata field, which is only shown in the modal view
				$item.find('.last-modified-by-field').text(thisTransaction.transactions_last_modified_by || '');
				$item.find('.last-modified-time-field').text(thisTransaction.transactions_last_modified_time || '');
			}
			this.getTransactionBalance($transactionsList);

			// Since the frostbite checbox is not a field in the database, it needs to be manually set when loading data
			const frostbiteSeverity = $newCard.find('.input-field[name=frostbite_severity_code]').val();
			$newCard.find('.input-field[name=had_frostbite]').prop('checked', frostbiteSeverity !== '').change();

		} else {
			const today = getFormattedTimestamp()

			// Set deault values for new members
			$newCard.find('.input-field[name="reservation_status_code"]')
				.val(1)//pending
				.change();
			$newCard.find('.input-field[name="datetime_reserved"]')
				.val(today)
				.change();

			// set default tansactions (debits)
			const $supFee = this.addNewListItem($transactionsList);
			$supFee.find('.input-field[name=transaction_type_code]')
				.val(10)//code for SUP fee
				.change();
			$supFee.find('.input-field[name=transaction_date]')
				.val(today)
				.change();
			const $entranceFee = this.addNewListItem($transactionsList);
			$entranceFee.find('.input-field[name=transaction_type_code]')
				.val(11)//code for entrance fee
				.change();
			$entranceFee.find('.input-field[name=transaction_date]')
				.val(today)
				.change();

			// Add default waivers for NPS exp. memebrs
			const specialGroupType = $('#input-special_group_type').val();
			if (specialGroupType == 3) {
				const $npsWaiver = this.addNewListItem($transactionsList);
				$npsWaiver.find('.input-field[name=transaction_type_code]')
					.val(15)
					.change();
				$npsWaiver.find('.input-field[name=transaction_date]')
					.val(today)
					.change();
			}

			// If the climber is a minor, flag the expedition member
			const climberAge = climberInfo.age;
			if (!((climberAge === undefined) || (climberAge === null)) && (climberAge > 0 && climberAge < 18) ) {
				$newCard.find('.input-field[name=flagged]')
					.prop('checked', true)
					.change();
				$newCard.find('.input-field[name=flagged_reason]')
					.val('Climber is under 18.')
					.change();
			}

		}

		// Add this expedition member as a select option for the cloneable route-member list item
		// 	When this member is added to a given route, they'll be removed from the select options
		//	for this route
		$('.route-member-name-field').append(`<option value=${climberID}>${climberName}</option>`);

		this.updateExpeditionMemberCount();
		this.updateCommsDeviceOwnerOptions();


		return $newCard;
	}


	/*Helper method to fill the data-list after adding a new route card*/
	/*fillRouteMemberList(memberInfo, routeInfo) {
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
					for (const el of $listItem.find('.input-field:not(.route-member-name-field)')) {
						this.setInputFieldValue(el, memberRouteRecord, {dbID: memberRouteID, triggerChange: true});
					}
					// Remove as an option for all expedition member name fields for this route
					$listItem.closest('.card').find(`.route-member-name-field option[value=${thisMember.climber_id}]`).remove();
				}
			}
		}

	}*/


	fillFieldValues(triggerChange=true) {
		
		const expeditionData = this.expeditionInfo.expeditions;
		for (const el of $('#expedition-data-container .input-field')) {
			this.setInputFieldValue(el, expeditionData, {dbID: expeditionData.id, triggerChange: true});
		}
		$('#expedition-number-result-summary-item > .result-details-summary-value').text(expeditionData.id).closest('.collapse').collapse('show');
		$('#expedition-modified-by-result-summary-item > .result-details-summary-value').text(expeditionData.expeditions_last_modified_by);
		$('#expedition-modified-time-result-summary-item > .result-details-summary-value').text(expeditionData.expeditions_last_modified_time);

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
			)
			// store the in-memory route code in the card's data because if the user changes the route and then tries to discard the edits, the input value of the route code and the in-meemory data won't match
			.data('route-code', routeCode);

			const $mountainCodeInput = $newCard.find('.mountain-code-header-input')
				.val(mountainCode)
				.removeClass('default')//set in addNewCard()
				.change()
			$newCard.find('.route-code-header-input, .input-field[name="route_code"]')
				.not($mountainCodeInput)
				.val(routeCode)
				.removeClass('default');

			const $routeMemberList = $newCard.find('.route-member-list');
			$routeMemberList.attr('id', $routeMemberList.attr('id') + '-' + routeCode);
			// List items should be in alphabetical order, so add them in order of the members
			let nRouteMembers = 0;
			for (const memberID of members.order) {
				// Not all expedition members necessarily climb all routes
				if (memberID in thisRoute) {
					const memberRouteRecord = thisRoute[memberID];
					const memberRouteID = memberRouteRecord.expedition_member_route_id || null;
					const $listItem = this.addNewListItem($routeMemberList, {dbID: memberRouteID});
					const thisMember = members.data[memberID];
					
					$listItem.attr('data-climber-id', thisMember.climber_id);

					// Set name of member
					$listItem.find('.name-label').text(`${thisMember.last_name}, ${thisMember.first_name}`);

					// Add the member ID to the list-item's data so the in-memory data can be linked back to the list item
					$listItem.attr('data-expedition-member-id', memberID); 

					// If the expedition member is cancelled, hide the list item
					if (thisMember.reservation_status_code == 6) $listItem.ariaHide(true);

					if (memberRouteID) {
						const inputData = {'foreign-ids': {expedition_member_id: memberID}}
						for (const el of $listItem.find('.input-field')) {
							// trigger change for dependent collpases
							this.setInputFieldValue(el, memberRouteRecord, {dbID: memberRouteID, triggerChange: true, elementData: inputData});
						}
					}
					nRouteMembers ++;
				}
			}

			// Show the add route member button if there are less route members than expedition members
			$newCard.find('.add-expedition-route-member-button').toggleClass(
				'hidden',
				$('#expedition-members-accordion .card').length !== nRouteMembers
			)
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
		$('#edit-expedition-button, #open-reports-modal-button, #print-cache-tag-button').ariaHide(false);

		// .change() events trigger onInputChange() so undo that stuff
		$('.input-field.dirty').removeClass('dirty');
		$('#save-expedition-button').ariaHide(true);

		// set briefing link 
		const $briefingLink = $('#expedition-briefing-link');
		const briefingInfo = this.expeditionInfo.briefings;
		const briefingDate = briefingInfo.briefing_date;
		if (briefingDate) {
			$briefingLink.attr('href', `briefings.html?date=${briefingDate}&id=${briefingInfo.id}`).text(briefingInfo.briefing_datetime);
			$('.field-label[for=expedition-briefing-link]').text('Briefing time:');
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
		$('.expedition-edit-button:not(#print-cache-tag-button)').ariaHide(hideEditButtons);

		// Not sure why, but a few selects in the climber form get .change triggered so turn the .dirty class off
		$('#add-climber-form-modal-container .input-field.dirty').removeClass('dirty');

		// reset briefing link
		this.resetBriefingLink()
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

					// Gather IDs of open cards and tabs in case this is being reloaded after the user saves. 
					//	Get the IDs, in particular, because .clearExpeditionInfo() wipes the cards and jQuery 
					//	references go with them. The element IDs will be the same once the data are reloaded, 
					//	though, so use those to re-reference the elements
					const $openCards = $('.card:not(.cloneable) .card-collapse.show');
					const openCardIDs = '#' + $openCards.map((_, el) => el.id).get().join(',#');
					const $activeTabs = $('.card:not(.cloneable) .nav-tabs .nav-link.active');
					const activeTabIDs = '#' + $activeTabs.map((_, el) => el.id).get().join(',#');
					
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
							this.climberInfo[row.climber_id] = {
								firstName: row.first_name,
								lastName: row.last_name,
								isCommercialGuide: row.is_guide
							}
						}
						const transactionID = row.transaction_id;
						if (transactionID != null) {
							if (!(transactionID in transactions[memberID].data)) {
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
					// If the data are being re-loaded after a save, show the cards and tabs that were open before
					if (!showOnLoadWarnings && $openCards.length) {
						$(openCardIDs).addClass('show');
						//$('.nav-tabs .nav-link.active').removeClass('active');
						$(activeTabIDs).click();
					}

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
						this.showFlaggedMemberWarning();
						this.show60DayWarning();
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
				if (this.constants.climbingFeeTransactionCodes.includes(transactionTypeCode)) { // climbing permit fee
					climbingFeeBalance += transactionValue;
				} if (this.constants.entranceFeeTransactionCodes.includes(transactionTypeCode)) {
					entranceFeeBalance += transactionValue;
				}
			}
		}
		
		// If the transaction list is empty, hide both icons. Otherwise, check the balance
		const $cardHeader = $list.closest('.card').find('.card-header');
		$cardHeader.find('.climbing-fee-icon').ariaTransparent(transactionListEmpty || climbingFeeBalance > 0);
		$cardHeader.find('.entrance-fee-icon').ariaTransparent(transactionListEmpty || entranceFeeBalance > 0);

	}


	/*

	*/
	deleteTransactionItem($listItem) {
		$listItem = $($listItem);//make sure it's a jQuery object

		// Get a reference to the transaction list now because once the list item 
		//	is removed from the DOM, the list can't be located using it
		const $transactionsList = $listItem.closest('.data-list');

		const transactionType = $listItem.find('.transaction-type-field').val();
		const relatedTransactionID = $listItem.data('related-transaction');
		const $relatedTransactionItem = relatedTransactionID ? $('#' + relatedTransactionID) : $();

		const dbID = $listItem.data('table-id');
		// If the delete succeeds, update the transaction balance 
		this.deleteListItem($listItem, 'transactions', dbID)
			.then(success => {
				// If this was a refund, remove the associated refund post
				if ($relatedTransactionItem.length) {
					$relatedTransactionItem.remove();
				}

				// Wait a half second because .fadeRemove() takes that 
				//	long to actually remove the item from the DOM
				setTimeout(
					() => {this.getTransactionBalance($transactionsList)},
					550
				)
			})
	}

	onTransactionTypeChange(e) {
		const $select = $(e.target);
		const $listItem = $select.closest('li');
		const $valueField = $listItem.find('.transaction-amount-field');
		const transactionTypeCode = parseInt($select.val());
		const previousTransactionType = parseInt($select.data('current-value'));
		
		// Prevent the user from creating a refund post manually because 
		//	a refund post should be managed automatically
		if (transactionTypeCode === 27 || transactionTypeCode === 28) {
			showModal('You can\'t add a refund post directly to the transaction history. If you want to add a refund, just add a "Climbing fee refund" or "Entrance fee refund" and the refund post will be added automatically.', 'Invalid Operation')
			$select.val(previousTransactionType);
			return;
		}

		// Record the current value in the field's data so it can be retrieved after 
		//	the .change event has been triggered
		$select.data('current-value', transactionTypeCode)

		// If the transaction type is null, don't do anything else
		if (!transactionTypeCode) return;

		// Set default transaction amount
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

		// If this is a payment, show the payment type collapse
		$select.closest('.data-list-item')
			.find('.input-field[name=payment_method_code]')
				.closest('.collapse')
					.collapse(info.is_payment === 't' ? 'show' : 'hide');

		// if this was a refund, remove the refund post
		if (previousTransactionType === 3 || previousTransactionType === 26) {
			$('#' + $listItem.data('related-transaction')).remove();
		}
		// If this is now a refund, add a corresponding uneditable refund post 
		if (transactionTypeCode === 3 || transactionTypeCode === 26) {
			// Add a refund post transaction
			const $newItem = this.addNewListItem($listItem.closest('.data-list'), {newItemClass: 'refund-post-item'})
				.removeClass('new-list-item')
				.insertAfter($listItem);
			
			// Set the transaction amount to be the opposite of the refund
			$newItem.find('.transaction-amount-field')
				.val(($valueField.val() * -1).toFixed(2));

			// if this is a climbing fee refund, set the refund post code to climbing refund post. Otherwise set it 
			//	to an entrance fee refund post
			$newItem.find('.transaction-type-field')
				.val(transactionTypeCode === 3 ? 27 : 28)
				.removeClass('default');

			$newItem.find('.input-field[name=transaction_date]')
				.val(getFormattedTimestamp());

			// Save the new list item's id so it can be manipulated in concert with 
			$listItem.data('related-transaction', $newItem.attr('id'));

		} else {
			// If this isn't a refund, make sure the related transaction data attribut is null
			$listItem.data('related-transaction', '');
		}

		// Always recalculate since amounts could change from adding/removing refund posts
		this.getTransactionBalance($listItem.closest('.data-list'));
	}

	onTransactionAmountChange(e) {
		const $valueField = $(e.target);
		const $list = $valueField.closest('.data-list');
		
		// If the field is a credit, set the value to be negative and vice versa
		const amount = $valueField.val();
		const $transactionTypeField = $valueField.closest('li').find('.transaction-type-field');
		const transactionType = parseInt($transactionTypeField.val());
		if (!transactionType) return;
		const isCredit = this.defaultTransactionFees[transactionType].is_credit === 't';
		if (isCredit && amount > 0) {
			$valueField.val(amount * -1);
		} else if (!isCredit && amount < 0) {
			$valueField.val(amount * -1)
		}

		// if the transaction is a refund, change the corresponding refund post
		if (transactionType === 3 || transactionType === 26) {
			const $refundPostItem = $('#' + $valueField.closest('li').data('related-transaction'));
			$refundPostItem.find('.transaction-amount-field')
				.val(($valueField.val() * -1).toFixed(2));
		}

		this.getTransactionBalance($list);
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


	/*
	Add new attachment unless this expedition member has yet to be saved
	*/
	onAddAttachmentItemButtonClick(e) {
		const $button = $(e.target);
		// Prevent the user from adding an attachment to a new expedition member. This is so that, 
		//	when saving an attachment, there is already an expedition_member_id to be able to relate 
		//	the new attachment record to an expedition_member record. In this case, saving the attachment 
		//	file and db record can be handled completely server-side 
		if ($button.closest('.card').is('.new-card')) {
			showModal('You must save this expedition member before you can add an attachment.', 'Invalid Operation');
			return;
		}
		const $newItem = this.addNewListItem($button.closest('.attachments-tab-pane').find('.data-list'), {newItemClass: 'new-list-item'})
		const $card = $newItem.closest('.card');
		$newItem.attr('data-parent-table-id', $card.data('table-id'));
	}


	/*
	Handler for when the user changes the attachment type
	*/
	onAttachmentTypeChange(e) {

		const $fileTypeSelect = $(e.target);
		const fileTypeSelectID = $fileTypeSelect.attr('id');
		const previousFileType = $fileTypeSelect.data('previous-value');//should be undefined if this is the first time this function has been called
		const $fileInput = $fileTypeSelect.closest('.card-body').find('.file-input-label ~ input[type=file]');
		const $fileInputLabel = $fileTypeSelect.closest('.card-body').find('.file-input-label');
		const fileInputID = $fileInput.attr('id');

		if ($fileTypeSelect.val()) {
			$fileInput.removeAttr('disabled')
			$fileInputLabel.removeAttr('disabled')
		}
		else {
			$fileInput.attr('disabled', true)
			$fileInputLabel.attr('disabled', true)
		}

		// If the data-previous-value attribute has been set and there's already a file uploaded, that means the user has already selected a file
		if (previousFileType && $fileInput.get(0).files[0]) {
			const onConfirmClick = `
				entryForm.updateAttachmentAcceptString('${fileTypeSelectID}');
				$('#${fileInputID}').click();
			`;
			const footerButtons = `
				<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal" onclick="$('#${fileTypeSelectID}').val('${previousFileType}');">No</button>
				<button class="generic-button modal-button danger-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">Yes</button>
			`;
			const fileTypeCode = $fileTypeSelect.val();
			const fileType = $fileTypeSelect.find('option')
				.filter((_, option) => {return option.value === fileTypeCode})
				.html()
				.toLowerCase();
			showModal(`You already selected a file. Do you want to upload a new <strong>${fileType}</strong> file instead?`, `Upload a new file?`, 'confirm', footerButtons);
		} else {
			_this.updateAttachmentAcceptString($fileTypeSelect.attr('id'));
		}
	}


	/*
	Read an image or PDF
	*/
	readAttachment(sourceInput, $progressIndicator) {

		const $barContainer = $progressIndicator.closest('.attachment-progress-bar-container');
	 	const file = sourceInput.files[0];
		
		if (sourceInput.files && file) {
			var reader = new FileReader();
			const fileName = file.name;

			reader.onprogress = function(e) {
				// Show progress
				// **** unfortunately a browser bug seems to prevent onprogress from being
				//		called until the file is completely loaded *****
				if (e.lengthComputable) {
					const progress = e.loaded / e.total;
					$progressIndicator.css('width', `${$barContainer.width() * progress}px`)
				}
			}

			reader.onerror = function(e) {
				// Hide preview and progress bar and notify the user
				$progressBar.ariaHide();
				showModal(`The file '${fileName}' failed to upload correctly. Make sure your internet connection is consistent and try again.`, 'Upload failed');
			}

			// Get local reference to .attachments attribute because `this` refers to the FieReader 
			//	when used within a method of the Reader's 
			const attachments = this.attachments;
			reader.onload = function(e) {
				
				// Hide the progress bar
				$barContainer.ariaHide(true);
				
				// Reset the progress indicator
				$progressIndicator.css('width', '0px');

				// Store in memory for now
				attachments[sourceInput.id] = {
					file: file,
					src: e.target.result,
					url: URL.createObjectURL(file)
				};
				
				const $listItem = $barContainer.closest('.data-list-item');
				
				// hide the select-file button (label)
				$listItem.find('.file-input-label')
					.ariaHide(true);
				
				// Show the filename field and the preview button
				$listItem.find('.file-name-field')
					.val(fileName)
					.ariaHide(false);
				$listItem.find('.preview-attachment-button')
					.ariaHide(false);

			}

			reader.readAsDataURL(file); 
			
		}
	}


	/*
	Event handler for attachment input
	*/
	onAttachmentInputChange(e) {

		const el = e.target; 
		const $input = $(el);

		// If the user cancels, it resets the input files attribute to null 
		//	which is dumb. Reset it to the previous file and exit
		if (el.files.length === 0) {
			el.files = _this.attachmentFiles[el.id];
			return
		}

		$input.siblings('.file-input-label').ariaHide(true);
		const $progressIndicator = $input.closest('.data-list-item')
			.find('.attachment-progress-bar-container')
				.ariaHide(false) // unhide
				.find('.attachment-progress-indicator');

		$input.siblings('.file-name-field')
			.val(el.files[0].name)
			.change();
		
		this.readAttachment(el, $progressIndicator);
	}


	/*
	Show the attachment when the user clicks its 'open' button
	*/
	onPreviewAttachmentButtonClick(e) {
		const $listItem = $(e.target).closest('.data-list-item');
		const fileInput = $listItem.find('input[type=file]').get(0);
		const attachment = this.attachments[fileInput.id];

		// Check that the attachment has been loaded. This should always be the case
		//	because the preview button shouldn't be visible otherwise, but best to 
		//	check anyway
		if (!attachment) return;

		const src = attachment.src;
			
		const $attachmentModal = $('#attachment-modal');
		if (attachment.file.type.toLowerCase().endsWith('pdf')) {
			// hide the image
			$attachmentModal.find('img').ariaHide(true);

			// For some stupid reason, loading a different PDF doesn't work so remove the 
			//	old object and replace it if this is a different PDF
			const $modalBody = $attachmentModal.find('.modal-img-body')//.remove()
			let $object = $modalBody.find('object');
			const currentData = $object.attr('data');
			if (currentData !== attachment.url) {
				$object.remove();
				$object = $modalBody.append(
					`<object type="application/pdf" data="${attachment.url}" width="100%" height="100%">Sorry, your browser doesn't support viewing a PDF</object>`
				);
			}

			// Reset the modal width in case an image was shown before and manually set it
			$modalBody.css('width', '');
			
		} 
		// otherwise, it's an image
		else {
			// Hide the PDF object element
			$attachmentModal.find('object').ariaHide(true);
			
			// Show the pdf <object> and set its 'data' attribute
			const $img = $attachmentModal.find('img')
				.ariaHide(false)
				.attr('src', attachment.src);
			//$img.siblings(':not(.modal-header-container)').addClass('hidden');
			const img = $img.get(0);
			const imgWidth = Math.min(
				window.innerHeight * .8 * img.naturalWidth/img.naturalHeight,//img.height doesn't work because display height not set immediately
				window.innerWidth - 40
			);
			$img.closest('.modal').find('.modal-img-body').css('width', imgWidth);
		}

		// Show the modal
		$attachmentModal.modal();
		
	}


	/*
	Attachment delete button handler
	*/
	onDeleteAttachmentButtonClick(e) {
		const $li = $(e.target).closest('.data-list-item');
		if ($li.is('.new-list-item')) {
			this.deleteListItem($li);
		} else {			
			const onConfirmClickHandler = () => {
				$('.modal-button.confirm-delete').click( () => {
					const dbID = $li.data('table-id');
					this.deleteListItem($li, 'attachments', dbID);
				})
			}
			const message = 
				'Are you sure you want to delete this Attachment? This action is permanent' + 
				' and cannot be undone.';
			const title = 'Delete Attachment?';
			const footerButtons = 
				'<button class="generic-button modal-button secondary-button close-modal" data-dismiss="modal">Cancel</button>' +
				'<button class="generic-button modal-button danger-button close-modal confirm-delete" data-dismiss="modal">Delete</button>';
			showModal(message, title, 'confirm', footerButtons, {eventHandlerCallable: onConfirmClickHandler});	
		}
	}


	onAddRouteButtonClick(e) {
		if (!$('#expedition-members-accordion .card:not(.cloneable)').length) {
			showModal('You must add at least one expedition member before you can add a route.', 'Invalid Action');
			return;
		}

		const $newCard = this.addNewCard($($(e.target).data('target')), {accordionName: 'routes', newCardClass: 'new-card'});
		
		// Use the UI to rather than in-memory data to add all active expedition members because
		//	a new card wouldn't be in the in-memory data
		const $list = $newCard.find('.route-member-list');
		for (const el of $('#expedition-members-accordion > .card:not(.cloneable)')) {
			const $memberCard = $(el);
			// if this expedition member isn't cancelled, add a new row
			if ($memberCard.find('.input-field[name="reservation_status_code"]').val() != 6) {
				const expeditionMemberID = $memberCard.data('table-id');
				const $listItem = this.addNewListItem($list)
					.attr('data-climber-id', $memberCard.data('climber-id'))
					.data('parent-table-id', expeditionMemberID)
					.data('expedition-member-id', expeditionMemberID);
				$listItem.find('.name-label').text($memberCard.find('.expedition-member-card-link-label').text());
			}
		}
	}


	onRouteCardHeaderInputChange(e) {
		const $target = $(e.target);
		var $select; 
		if ($target.attr('name') === 'mountain_code') {
			// Set the route code select options
			const mountainCode = $target.val();
			const $routeHeaderSelect = $target.closest('.card-header').find('.input-field[name=route_code]')
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
	}


	/*
	Make separate event handler method so it can be easily triggered, while controlling presence of e.originalEvent
	*/
	onHighestElevationChange(e) {
		const $highestElevationInput = $(e.target);
		const highestElevation = $highestElevationInput.val();
		const $card = $highestElevationInput.closest('.card');
		const mountainCode = $card.find('.input-field[name=mountain_code]').val();
		const summitElevation = this.mountainCodes[mountainCode].elevation_ft;
		const $checkbox = $highestElevationInput.closest('.data-list-item').find('[name=route_was_summited]');

		// Check to make sure the elvation entered is not greater than the summit elevation
		if (parseInt(highestElevation) > parseInt(summitElevation)){
			const message = `You entered a <em>Highest elevation</em> of <strong>${highestElevation}</strong>,` + 
				` which is greater than the summit elevation of <strong>${summitElevation}</strong>. If the elevation you entered` + 
				` is correct, you will have to manually check the <em>Summited?</em> checkbox. Otherwise,` +
				` correct the <em>Highest elevation</em>`;
			showModal(message, 'Invalid Highest Elevation')
			return;
		}

		// Set the summitted checkbox based on whether the highest elev. value matches the
		//	summit elev. Only do this if highest elevation is truthy
		if (highestElevation && e.originalEvent) $checkbox.prop('checked', highestElevation == summitElevation).change();
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


	showFlaggedMemberWarning() {
		const $flaggedCheckboxes = $('.input-checkbox[name="flagged"]:checked');
		const nFlagged = $flaggedCheckboxes.length
		if (nFlagged) {
			const flaggedMemberListItems = $flaggedCheckboxes.map((_, el) => {
				const $el = $(el);
				//$el.closest('.card').find('.card-link').click();
				const dbID = $el.data('table-id');
				const info = this.expeditionInfo.expedition_members.data[dbID];
				return `<li>${info.last_name}, ${info.first_name} (${info.flagged_reason})</li>`;
			}).get().join('')
			const message = `${nFlagged} ${nFlagged === 1 ? ' member of this expedition has' : ' members of this expedition have'}` +
				' been flagged. You might want to review the reason they were flagged. Flagged expedition member(s):\n' +
				`<ul>${flaggedMemberListItems}</ul>`
			return showModal(message, 'Flagged Epedition Member(s)');
		}
	}


	show60DayWarning() {
		const departureDate = new Date($('#input-planned_departure_date').val() + ' 00:00');
		const now = new Date();
		const daysToDeparture = (departureDate - now) / this.constants.millisecondsPerDay;
		const isGuided = $('#input-guide_company').val() !== '';
		// If this expedition's departure has already passed or it's more than 60 days away, do nothing
		if (isGuided || daysToDeparture < 0 || daysToDeparture > 60) {
			return;
		}

		const groupStatusCode = parseInt($('#input-group_status').val());
		const $cards = $('#expedition-members-accordion .card:not(.cancelled)');
		const nClimbingFeesNotPaid = $cards.find('.climbing-fee-icon.transparent').length;
		const nSUPsNotComplete = $cards.find('.input-field[name=application_complete]:not(:checked)').length;
		const nPSARNotComplete = $cards.find('.input-field[name=psar_complete]:not(:checked)').length;

		const climbingFeesNotPaid = nClimbingFeesNotPaid !== 0;
		const supsNotComplete = nSUPsNotComplete !== 0;
		const psarNotComplete = nPSARNotComplete !== 0;
		if (
				(groupStatusCode === 1 || groupStatusCode === 2) && //group is not confirmed
				(climbingFeesNotPaid || supsNotComplete || psarNotComplete)
			) {
			const newDepartureDate = new Date(departureDate.getTime() + this.constants.millisecondsPerDay * 60)
				.toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
			let reasons = '';
			if (climbingFeesNotPaid) reasons += `<li>${nClimbingFeesNotPaid} climber${nClimbingFeesNotPaid > 1 ? 's have' : ' has'} not paid their climbing permit fee</li>`;
			if (supsNotComplete) 	 reasons += `<li>${nSUPsNotComplete} climber${nSUPsNotComplete > 1 ? 's have' : ' has'} not submitted their SUP application</li>`;
			if (psarNotComplete)	 reasons += `<li>${nPSARNotComplete} climber${nPSARNotComplete > 1 ? 's have' : ' has'} not submitted their PSAR form</li>`;
			const message = `This expedition is 60 days or less from their scheduled departure date on <strong>${departureDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric'})}</strong>, but not all expedition members have completed the requirements to receive a permit. These unfulfilled requirements include: <ul>${reasons}</ul>You should verify that these requirements have not been fulfilled, and if not, change the groups departure date to on or after <strong>${newDepartureDate}</strong>.`;
			showModal(message, 'WARNING: 60-Day Rule Violation');
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
			this.queryDB('SELECT code, default_fee, is_credit, is_payment FROM transaction_type_view')
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
			...initDeferreds, 
			...lookupDeferreds
		).then(() => {
			const params = this.parseURLQueryString();
			// if the URL specifies a specific expedition (id) to load, do so
			if ('id' in params) {
				this.queryExpedition(params.id).done(() => {
					// add to history buffer for keeping track of browser nav via back/forward buttons
					this.historyBuffer.push(params.id);
				});
				window.history.replaceState({id: params.id, historyIndex: 0}, '', window.location.href);
				$('#expedition-search-bar').data('current-value', params.id);
			} 
			// Otherwise, prepare the page for creating a new expedition
			else if (this.checkEditPermissions()) {
				this.createNewExpedition({triggerChange: false});
				// Make sure all things that depend on group status are in their proper state 
				//	for a new expedition
				$('#input-group_status').change().removeClass('dirty');
			} else {
				// hide the expedition info
				$('.expedition-content, .hide-when-content-hidden').ariaHide(true);
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