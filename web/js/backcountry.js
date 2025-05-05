class ClimberDBBackcountry extends ClimberDBExpeditions {
	
	constructor() {
		super();

		this.edits = {};
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
		this.locationCoordinates = {}; // stores lat/lon of named locations
		this.locationMountainCodes = {}; // stores mountain code/names for each location
		this.markerIcons = { // maps location type to an icon image
			1: '../imgs/plane_icon_50px.png',
			2: '../imgs/camp_icon_50px.png',
			3: '../imgs/plane_icon_50px.png'
		}
		this.campCardClass = 'camp-location-card';
		return this;
	}

	// onAddClimberToExpeditionClick(e) {

	// }


	/*
	Set the associated coordinate fields when a marker on the map is moved
	*/
	onMarkerDragend(locationIndex) {
		const layer = this.maps.main.layers[locationIndex];
		const $card = $(this.locationCardIndexSelector).eq(locationIndex);
		const locationID = $card.data('table-id');

		// If editing is disabled, reset the marker and warn the user
		if ($('.uneditable').length) {
			this.showModal(
				'You must first click the edit button to move a backcountry location', 
				'Invalid Operation'
			)
			// reset lat/lon using in-memory data from the DB. If editing is disabled, 
			//	any changes the user would have made in this session would be reflected 
			//	in the in-memory data
			const data = this.expeditionInfo.itinerary_locations.data[locationID];
			layer.setLatLng([data.latitude || 0, data.longitude || 0]);
			
			return;
		};

		
		const $latitudeField = $card.find('.input-field[name=latitude]');
		const $longitudeField = $card.find('.input-field[name=longitude]');
		const latlng = layer.getLatLng();
		const [latDDD, lonDDD] = this.getRoundedDDD(latlng.lat, latlng.lng);
		$latitudeField.val(latDDD).change();
		$longitudeField.val(lonDDD).change();
	}


	onZoomToLocationClick(e) {
		const $card = $(e.target).closest('.card');
		const index = $card.index(this.locationCardIndexSelector);
		const mainMap = this.maps.main;
		mainMap.map.flyTo(mainMap.layers[index].getLatLng())//, {maxZoom: this.maxInitialMapZoom});
	}

	
	onBCMountainCodeChange(e) {
		const $mountainInput = $(e.target);
		const mountainCode = $mountainInput.val();
		const $listItem = $mountainInput.closest('.data-list-item');
		const $routeInput = $listItem.find('[name=route_code]')
			.empty()
			.append('<option value="">Select route</option>');
		this.updateRouteCodeOptions(mountainCode, $routeInput, {setValueToDefault: true});
	}

	/*
	When a BC route changes, update the associated route card in the (hidden) 
	#routes-accordion
	*/
	onBCRouteCodeChange(e) {
		const $input = $(e.target);
		const routeCode = $input.val();
		const $li = $input.closest('.data-list-item');
		let cardID = $li.data('card-id');
		if (!cardID) {
			console.log('no card id for #' + $li.attr('id'))
		}
		const $routeCard = $('#' + cardID);
		$routeCard.find('.route-code-header-input[name=route_code]')
			.val(routeCode)
			.change();
	}


	/*
	Helper method to add a new location marker to a map

	@param locationIndex: the sequential index of this location (from the card order)
	@param coordinates: LatLng Leaflet object or 2-element array of [lat, lon]
	@param mapObject: either this.maps.main or this.maps.modal
	*/
	addLocationToMap(locationIndex, coordinates, mapObject, {isNewLocation=true}={}) {
		const $card = $(this.locationCardIndexSelector).eq(locationIndex);
		const locationType = $card.find('.input-field[name=backcountry_location_type_code]').val()
		const icon = L.icon({
			iconUrl: this.markerIcons[locationType || 2], //default to camp icon
			iconSize: [35, 35],
			className: isNewLocation ? 'blink' : '' // make it blink until the lat/lon is actually set
		});

		const layer = L.marker(coordinates, {icon: icon, draggable: true})
			.addTo(mapObject.map)
			.bindTooltip('', {permanent: true, className: 'leaflet-tooltip-point-label'})
			.on('dragend', () => {
				//set coordinate fields when 
				this.onMarkerDragend(locationIndex)
			}).on('click', () => {
				// Capture lat/lon values when the marker is clicked
				const $card = $(this.locationCardIndexSelector).eq(locationIndex);
				this.getCoordinateFieldCurrentValues($card);
			});
		mapObject.layers.push(layer);

		// Check if the map should be panned or zoomed
		this.fitMapBoundsToLocations(mapObject);
	}


	onAddLocationButtonClick() {
		const $newCard = this.addNewCard($('#locations-accordion'), {accordionName: 'locations', newCardClass: 'new-card'});
		const index = $newCard.index(this.locationCardIndexSelector);

		// Add a default marker
		const map = this.maps.main.map;
		const mapCenter = map.getCenter();
		// offset the point's default location from the center in case the map was already centered 
		//	on a different marker
		const offset = map.getSize().divideBy(10);// 1/10th width and height
		const mapZoom = map.getZoom();
		const targetPoint = map.project(mapCenter, mapZoom) // get pixel coordinates instead of latlong
			.add(offset); // add offset in pixels
    	const targetLatLng = map.unproject(targetPoint, mapZoom);// convert back to latlong

		this.addLocationToMap(index, targetLatLng, this.maps.main);

		// Set the (hidden) display_order field value 
		$newCard.find('.input-field[name=display_order]').val(index + 1).change();

		// Set the BC route list as the target for the add-new-route button
		// set target for "add new route" button
		const $routeList = $newCard.find('.bc-route-list');
		const bcRouteListID = $routeList.attr('id', `${$routeList.attr('id')}-new-${$routeList.index()}`);
		$newCard.find('.add-bc-route-button')
			.data('target', bcRouteListID);
	}


	/*
	Round latitude and longitude by either the 'step' attributes decimal value (from any of the location coordindate fields) or by a default
	*/
	getRoundedDDD(lat, lon) {

		const step = $('.location-coordinate-field').first().attr('step');
		const rounder = Math.round(1 / (step ? step : 0.000001));
		const latDDD = Math.round(lat * rounder) / rounder;
		const lonDDD = Math.round(lon * rounder) / rounder;

		return [latDDD, lonDDD];
	}


	/*
	Helper method called to capture reveratble values of lat/lon fields. This helper method can be reused 
	from either the location name field or from a marker on the map changes
	*/
	getCoordinateFieldCurrentValues($card) {
		const $latitudeField = $card.find('.input-field[name=latitude]');
		const $longitudeField = $card.find('.input-field[name=longitude]');
		$latitudeField.data('current-value', $latitudeField.val());
		$longitudeField.data('current-value', $longitudeField.val());
	}


	/*
	Update the location of a marker on the map when the lat or lon changes
	*/
	onCoordinateFieldChange(e) {
		// Skip manually triggered .change() calls
		// if (!e.originalEvent) return;

		const $input = $(e.target)
		const $card = $input.closest('.card');
		const latitude = $card.find('.input-field[name=latitude]').val();
		const longitude = $card.find('.input-field[name=longitude]').val();
		
		// Check that both latitude and longitude are filled in
		if (!(longitude && latitude)) {
			return;
		}

		const locationType = $card.find('.input-field[name=location_type_code]').val();
		const index = $card.index(this.locationCardIndexSelector);
		const layer = this.maps.main.layers[index];
		if (!layer) {
			// The location hasn't been added yet (this shouldn't really be possible)
			this.addLocationToMap(index, [latitude, longitude], this.maps.main)
		} else {
			// Set the new lat/lon for the marker
			layer.setLatLng([latitude, longitude])
		}

		// Make sure it's not blinking anymore since the location has been set
		$(layer._icon).removeClass('blink');

		// Check if the map should be panned or zoomed
		for (const mapObject of Object.values(this.maps)) {
			this.fitMapBoundsToLocations(mapObject);
		}
	}


	/*
	Update the icon and set the card header text when the location type changes
	*/
	onLocationTypeChange(e) {
		const $input = $(e.target);
		const locationTypeName = $input.find('option:selected').text();
		const locationIsCamp = locationTypeName === 'Camp';

		const $card = $input.closest('.card')
			.toggleClass('camp-location-card', locationIsCamp);
		const cardIndex = $card.index(this.locationCardIndexSelector);

		// Set the card header
		const campIndex = $card.index('.' + this.campCardClass) + 1;
		const locationLabel = locationTypeName + (locationIsCamp ? ' ' + campIndex : '');
		$card.find('.card-link-label').text(locationLabel);

		// Set the icon
		const locationTypeCode = $input.val();
		for (const mapObject of Object.values(this.maps)) {
			const layer = mapObject.layers[cardIndex];
			const isBlinking = $(layer._icon).hasClass('blink');
			const newIcon = L.icon({
				iconUrl: this.markerIcons[locationTypeCode || 2], //default to camp icon
				iconSize: [35, 35],
				className: isBlinking ? 'blink' : '' // make it blink until the lat/lon is actually set
			});
			layer.setIcon(newIcon);

			layer.setTooltipContent(locationLabel);
		}
	}


	updateBCMountainOptions($mountainFields, newMountainCodes) {
		// get values before removing options since that will remove the current selection
		const currentValues = $mountainFields.map(
				(_, el) => ({id: el.id, value: el.value})
			).get()
			.filter(({value}) => newMountainCodes.includes(parseInt(value)));

		// Remove everthing except the default null option
		$mountainFields.find('option').not('[value=""]').remove();

		// Add the new options according to their sort_order from the DB
		const sortedMountainCodes = newMountainCodes.sort((a, b) => {
			return this.mountainCodes[a].name < this.mountainCodes[b].name ? -1 : 1
		})
		for (const mountainCode of sortedMountainCodes) {
			const mountainName = this.mountainCodes[mountainCode].name;
			$mountainFields.append(
				`<option value=${mountainCode}>${mountainName}</option>}`
			)
		}
		
		// Reset values for mountains that were valid for both the previous 
		//	location and this one
		for (const {id, value} of currentValues) {
			$('#' + id).val(value);
		}
	}


	deleteBCRoute($li, {confirm=true}={}) {


		const $routeCard = $('#' + $li.data('card-id'));
		if ($li.is('.new-list-item')) {
			$li.fadeRemove();
			$routeCard.remove();
		} else {
			const routeCode = $routeCard
				.find('.route-code-header-input:not(.mountain-code-header-input)')
					.val();
			const deleteRoute = () => {
				this.deleteRoute($routeCard, routeCode)
					.done(response => {
						if (!this.pythonReturnedError(response)) {
							$li.fadeRemove();
						}
					})
					.fail(print('route deletion failed'));
			}
			if (confirm) {
				const message = 'Are you sure you want to delete this route? This action is permanent and cannot be undone.'
				const onConfirmClickHandler = () => {
					$('#alert-modal .confirm-button').click(() => {
						deleteRoute();
					})
				}
				this.showModal(
					message, 
					'Delete Route?',
					{
						modalType: 'yes/no',
						eventHandlerCallable: onConfirmClickHandler
					}
				)
			} else {
				deleteRoute();
			}
		}
	}


	onDeleteBCRouteButtonClick(e) {
		const $button = $(e.target);
		const $li = $button.closest('.data-list-item');
		
		const routeCode = $li.find('.input-field[name=route_code]')
			.val();
		this.deleteBCRoute($li);
	}


	/*
	Override the super class' saveEdits method to check if there is 
	at least one route saved for the group. If not, warn the user
	that this group won't appear in query results
	*/
	saveEdits({suppressRouteWarning=false}={}) {
		const nRoutes = $('#routes-accordion .card:not(.cloneable)').length;
		const isNewGroup = isNull($('#input-expedition_name').data('table-id'));
		// Show the warning only if 
		//	1. it isn't explicitly suppressed
		//	2. this is a new group (don't show if user is editing an existing group)
		//	3. there aren't any routes
		if (!suppressRouteWarning && isNewGroup && nRoutes === 0) {
			hideLoadingIndicator();
			const message = 'You have not yet selected any routes for this backcountry' +
				' group. You can still save your edits but the group will not appear in' +
				' any query results or on the <strong>Mountain Stats This Season</strong>' +
				' table of the home page. To add a route: ' + 
				`<ol> 
					<li>Click the <strong>Add location</strong> button</li>
					<li>Click the <strong>Add member</strong> button</li>
					<li>Click the <strong>Save</strong> button</li>
					<li>Click the <strong>Add route</strong> button </li>
				</ol>
				` +
				' Would you like to save this backcountry group <strong>without</strong> adding a route?'
			const onConfirmClick = () => {$('#alert-modal .confirm-button').click(() => super.saveEdits())}
			this.showModal(
				message, 
				'No Route Selected', 
				{
					modalType: 'yes/no', 
					eventHandlerCallable: onConfirmClick
				}
			)
		} else {
			super.saveEdits();
		}

	}


	addNewBCRoute($routeList) {
		if ($routeList.closest('.card').is('.new-card')) {
			const message = 
				'You must save this itinerary location before you can add routes to it.' +
				' Would you like to save all of your edits now?';
			const onConfirmClickHandler = () => {
				$('#alert-modal .confirm-button').click(() => {
					// Don't show routes warning because in order to add 
					//	a route, the user has to save the location first
					this.saveEdits({suppressRouteWarning: true})
				});
			}
			this.showModal(
				message, 
				'Save Edits?', 
				{
					modalType: 'yes/no', 
					eventHandlerCallable: onConfirmClickHandler
				}
			);
			$('#alert-modal .confirm-button')
				.removeClass('danger-button');
			return;
		}

		const $li = this.addNewListItem($routeList, {newItemClass: 'new-list-item'});
		
		// update the mountain code select options with the selected location's mountains
		const locationCode = $li.closest('.card')
			.find('.input-field[name=backcountry_location_code]')
				.val();
		this.updateBCMountainOptions(
			$routeList.find('.bc-mountain-field'), 
			this.locationMountainCodes[locationCode]
		);
		
		// add a new corresponding route card
		const $routeCard = this.addNewRoute($('#routes-accordion'));
		
		$li.data('card-id', $routeCard.attr('id'));
		const $locationCard = $li.closest('.card');
		const locationID = $locationCard.data('table-id');
		if (!isNull(locationID)) {
			$routeCard.find('.data-list-item:not(.cloneable) [name=itinerary_location_id]').val(locationID).change();
		}
	}


	onAddRouteButtonClick(e) {
		if (!$('#expedition-members-accordion .card:not(.cloneable)').length) {
			this.showModal('You must add at least one backcountry group member before you can add a route.', 'Invalid Action');
			return;
		}

		this.addNewBCRoute($($(e.target).data('target')));
	}

	/*
	Update the coordinate fields when the location name field changes
	*/
	onLocationNameChange(e) {
		const $input = $(e.target);
		const locationCode = $input.val();
		
		// If the user chose "other", do nothing with location info
		if (locationCode != -1) {

			const $card = $input.closest('.card');
			const $latitudeField = $card.find('.input-field[name=latitude]');
			const $longitudeField = $card.find('.input-field[name=longitude]');
			
			const {name, latitude, longitude} = this.locationCoordinates[locationCode];
			
			if ($latitudeField.val() || $longitudeField.val()) {
				// Check if the user wants to change the values already set
				const message = 
					`You've alread set the latitude and/or longitude. Do you want to` + 
					` reset it with the default coordinates for <strong>${name}</strong>?`;
				const onConfirmClickHandler = () => {
					$('#alert-modal .confirm-button').click(() => {
						$latitudeField.val(latitude);
						$longitudeField.val(longitude).change();
					});
					// $('#alert-modal .deny-button').click(() => {
					// 	// revert
					// 	$latitudeField.val($latitudeField.data('current-value')).addClass('dirty');
					// 	$longitudeField.val($longitudeField.data('current-value')).change();
					// });
				}
				const footerButtons = 
					'<button class="generic-button modal-button close-modal danger-button confirm-button" data-dismiss="modal">Yes</button>' + 
					'<button class="generic-button secondary-button modal-button close-modal deny-button" data-dismiss="modal">No</button>'
				this.showModal(message, 'Reset Location Coordinates?', {footerButtons: footerButtons, eventHandlerCallable: onConfirmClickHandler});
			} else {
				$latitudeField.val(latitude).addClass('dirty');
				$longitudeField.val(longitude).change();
			}
		}

		// if there are any routes already entered, ask he user if they want to get rid of them
		const $routeList = $input.closest('.card').find('.bc-route-list');
		const $mountainFields = $routeList.find('.data-list-item:not(.cloneable) .bc-mountain-field')
		if ($mountainFields.length) {
			// Check if the new location includes the currently selected mountains
			const newMountainCodes = this.locationMountainCodes[locationCode];
			const excludedMountains = $mountainFields
				.map((_, el) => parseInt(el.value || 0))
				.get()
				.filter(v => !newMountainCodes.includes(v) && v !== 0)
			const excludedMountainLength = excludedMountains.length;
			if (excludedMountainLength > 0) {
				const invalidMountainHTML = `
					<ul>
						${excludedMountains.map(c => `<li>${this.mountainCodes[c].name}</li>`)}
					</ul>
				`;
				const s = excludedMountainLength > 1 ? 's' : ''
				const message = 
					`You have already selected the following mountain/route${s},` +
					` which ${s === 's' ? 'are' : 'is'} not valid for the location you just selected: ` +
					invalidMountainHTML +
					` Would you like to remove the invalid mountain/route${s}?` +
					` If you click 'Yes', you will permanently delete the invalid route${s}` + 
					` from this backcountry group. If you click 'No', the invalid mountain/route${s}` +
					' you already selected will remain in place.';
				const onConfirmClickHandler = () => {
					$('#alert-modal .danger-button').click(() => {
						for (const el of $mountainFields.closest('.data-list-item')) {
							this.deleteBCRoute($(el), {confirm: false});
							this.addNewBCRoute($routeList);
							this.updateBCMountainOptions($mountainFields, newMountainCodes);
						}
					});
					// When the user clicks the No button, update mountain options including the 
					//	current selection(s)
					$('#alert-modal .deny-button').click(() => {
						
						// Get id/value pairs of existing mountain fields
						const currentMountains = Object.fromEntries(
							$mountainFields.map((_, el) => [[el.id, el.value]]).get() 
						);

						this.updateBCMountainOptions($mountainFields, [...Object.values(currentMountains), ...newMountainCodes]);
						
						// Set values of mountains since options were wiped
						for (const [id, value] of Object.entries(currentMountains)) {
							$('#' + id).val(value);
						}
					})
				}

				const footerButtons = 
					'<button class="generic-button modal-button close-modal danger-button confirm-button" data-dismiss="modal">Yes</button>' + 
					'<button class="generic-button secondary-button modal-button close-modal deny-button" data-dismiss="modal">No</button>';
				this.showModal(message, 'Remove Invalid Mountain/Route?', {footerButtons: footerButtons, eventHandlerCallable: onConfirmClickHandler, dismissable: false});
			} else {
				this.updateBCMountainOptions($mountainFields, newMountainCodes);
			}
		
		}
	}

	/*
	When a camp location is deleted, readjust all other camp labels 
	with the appropriate sequential index
	*/
	resetCampMarkerLabels() {
		for (const el of $('.' + this.campCardClass)) {
			const $card = $(el);
			// Index of the card/layer for all locations
			const cardIndex = $card.index(this.locationCardIndexSelector);
			// Index for all camps
			const campIndex = $card.index('.' + this.campCardClass) + 1;

			const label = 'Camp ' + campIndex;
			// Set card label
			$card.find('.card-link-label').text(label);

			// Set map marker label
			for (const mapObject of Object.values(this.maps)) {
				const layer = mapObject.layers[cardIndex];
				layer.setTooltipContent(label);
			}
		}
	}


	/*
	Remove layer from map
	*/
	removeLocationFromMap(locationIndex) {
		// Remove the marker from both maps
		for (const mapObject of Object.values(this.maps)) {
			mapObject.map.removeLayer(mapObject.layers[locationIndex]);
			mapObject.layers.splice(locationIndex, 1);
		}

	}


	removeLocationCard($locationCard) {
		const locationCardIndex = $locationCard.index(this.locationCardIndexSelector);
		$locationCard.fadeRemove({
			onRemove: () => {
				this.removeLocationFromMap(locationCardIndex);
				this.resetCampMarkerLabels();
			}
		});
	}

	/*
	The expedition.js suprclass's version of this method can handle all card types
	except locations, so override with a special handler for those
	*/
	onDeleteCardButtonClick(e) {

		// 
		const $locationCard = $(e.target).closest('.card');
		const isLocationCard = $locationCard.closest('.accordion').is('#locations-accordion');

		if (isLocationCard) {
			
			if ($locationCard.is('.new-card')) {
				for (const el of $locationCard.find('.bc-route-list > .data-list-item:not(.cloneable)')) {
					this.deleteBCRoute($(el))
				}
				this.removeLocationCard($locationCard);

			} else {
				// Get location ID and expedition_member_route IDs to delete
				const locationID = $locationCard.data('table-id');
				const $routeCards = $(
						$locationCard
							.find('.bc-route-list > .data-list-item:not(.cloneable)')
								.map((_, li) => '#' + $(li).data('card-id'))
									.get()
									.join(',')
					);
				const routeIDs = $routeCards
					.find('.route-member-list .input-field[name=route_code]').map(
						(_, el) => $(el).data('table-id')
				).get()
					.filter(id => !isNull(id));

				const message = 
					'Are you sure you want to delete this itinerary location' +
					' and any related routes for this expedition? This action' +
					' is permanent and cannot be undone.';
				const onConfirmClickHandler = () => {
					$('#alert-modal .confirm-button').click(() => {
						this.deleteFromMultipleTables({
							itinerary_locations: [locationID],
							expedition_member_routes: routeIDs
						}).done(response => {
							if (this.pythonReturnedError(response, {errorExplanation: 'The itinerary location could not be deleted because of an unexpected error.'})) {
								return;
							} else {
								// delete in-memory location
								delete this.expeditionInfo.itinerary_locations.data[locationID];
								this.expeditionInfo.itinerary_locations.order = this.expeditionInfo.itinerary_locations.order.filter(id => id != locationID);
								for (const el of $routeCards) {
									// in-memory data has to be removed per route so loop through each card
									const $routeCardToDelete = $(el);
									const routeCode = $routeCardToDelete.find('.card-header [name=route_code]').val();
									this.removeRouteUI(routeCode, $routeCardToDelete);
								}
								// remove from map
								this.removeLocationCard($locationCard);
							}
						})
					})
				}
				this.showModal(
					message, 
					'Delete Itinerary Location?', 
					{
						modalType: 'yes/no', 
						eventHandlerCallable: onConfirmClickHandler
					}
				);

			}
		} else {
			// Pass to the superclass's method for everything else
			super.onDeleteCardButtonClick(e);
		}
	}


	onNewBCGroupButtonClick() {
		super.onNewExpeditionButtonClick();

		// Clear layers from map
		for (const mapName of Object.keys(this.maps)) {
			const map = this.maps[mapName].map;
			for (const layer of this.maps[mapName].layers) {
				map.removeLayer(layer);
			}

			// Reset map view
			map.setView(this.defaultMapCenter, this.defaultMapZoom);
		}

		//TODO: some fields trigger save edits confirmation even though nothing has been changed 


	}


	configureMainContent() {
		super.configureMainContent();
		this.configureMap('main-map', {mapObject: this.maps.main});

		// Location handlers
		$('#add-location-button').click(() => {
			this.onAddLocationButtonClick()
		});

		
		$(document).on('change', '.location-coordinate-field', e => {
			this.onCoordinateFieldChange(e);
		});

		$(document).on('change', '.input-field[name=backcountry_location_type_code]', e => {
			this.onLocationTypeChange(e);
		});

		$(document).on('change', '.input-field[name=backcountry_location_code]', e => {
			this.onLocationNameChange(e);
		});

		$(document).on('click', '.zoom-to-location-button', e => {
			this.onZoomToLocationClick(e);
		});

		$(document).on('change', '.bc-route-list .input-field[name=mountain_code]', e => {
			this.onBCMountainCodeChange(e);
		})

		$(document).on('change', '.bc-route-list .input-field[name=route_code]', e => {
			this.onBCRouteCodeChange(e);
		})

		$(document).on('click', '#add-new-backcountry-group-button', e => {
			this.onNewBCGroupButtonClick();
		});

		$(document).on('click', '.add-bc-route-button', e => {
			this.onAddRouteButtonClick(e);
		});

		$(document).on('click', '.delete-bc-route-button', e => {
			this.onDeleteBCRouteButtonClick(e);
		})
		// Capture lat/lon values when location name field gets the focus
		$(document).on('focus', '.input-field[name=backcountry_location_code]', e => {
			const $card = $(e.target).closest('.card');
			this.getCoordinateFieldCurrentValues($card);
		});

	}


	clearExpeditionInfo({hideEditButtons=true, triggerChange=false}={}) {

		const mainMap = this.maps.main;
		// clear map layers
		for (const layer of mainMap.layers) {
			mainMap.map.removeLayer(layer);
		}
		mainMap.layers = [];

		super.clearExpeditionInfo({hideEditButtons: hideEditButtons, triggerChange: triggerChange})
	}

	/*
	Thin wrapper for ClimberDBExpeditions to set the locations on the map and 
	update card headers
	*/
	fillFieldValues(triggerChange=true) {

		super.fillFieldValues(triggerChange);

		// Set location card labels
		for (const el of $('#locations-accordion .card:not(.cloneable) ')) {
			const $card = $(el);
			
			const index = $card.index(this.locationCardIndexSelector);
			const coordinates = [$card.find('.input-field[name=latitude]').val(), $card.find('.input-field[name=longitude]').val()];
			for (const mapObject of Object.values(this.maps)) {
				this.addLocationToMap(index, coordinates, mapObject, {isNewLocation: false});
			}
			
			this.onLocationTypeChange({target: $card.find('.input-field[name=backcountry_location_type_code]')})
		}

		// // Set the map's extent to either the default or the minimum bounding box of all locations
		// const locationData = Object.values(this.expeditionInfo.itinerary_locations.data)
		// const latitudes = locationData.map(({latitude}) => latitude);
		// const longitudes = locationData.map(({longitude}) => longitude);
		// const minLat = 
	}
	

	init() {
		
		this.showLoadingIndicator('init');
		super.init().then(() => {
			let lookupDeferreds = [];
			lookupDeferreds.push(
				this.queryDB({
					tables: ['backcountry_location_codes'], 
					order_by: [{table_name: 'backcountry_location_codes', column_name: 'sort_order'}]
				}).done(result => {
					if (!this.pythonReturnedError(result, {errorExplanation: 'An error occurred while retrieving lookup values from the database.'})) {
						for (const {code, name, latitude, longitude} of result.data) {
							this.locationCoordinates[code] = {
								name: name,
								latitude: latitude, 
								longitude: longitude
							}
						}
					}
				}),
				// get location/mountain cross-ref
				this.queryDB({
					tables: ['backcountry_locations_mountains_xref']
				}).done(result => {
					if (!this.pythonReturnedError(result, {errorExplanation: 'An error occurred while retrieving lookup values from the database.'})) {
						const bcMtns = this.locationMountainCodes; // for shorthand refernce
						for (const {backcountry_location_code, mountain_code} of result.data) {
							bcMtns[backcountry_location_code] = [...(bcMtns[backcountry_location_code] || []), mountain_code];	
						}
					}
				})
			);

			lookupDeferreds.push(
				this.queryDB({
					where: {group_status_codes: [{column_name: 'is_bc_status'}]},
					orderBy: [{table_name: 'group_status_codes', column_name: 'sort_order'}]
				}).done(result => {
					const $selects = $('.group-status-option-field')
					
					$selects.append(
						'<option value="">Party member status</option>'
					);
					for (const {code, name} of result.data) {
						$selects.append(
							$(`<option value="${code}">${name}</option>`)
						);
					}

					$selects.val($selects.data('default-value'));
				})
			)

			// load only backcountry mountains as options
			const $mountainCodeInput = $('[name=mountain_code]');
			const backcountryMountains = Object.values(this.mountainCodes).filter(({is_backcountry}) => is_backcountry);
			for (const {code, name} of backcountryMountains) {
				$mountainCodeInput.append(
					$(`<option value="${code}">${name}</option>`)
				)
			}

			// set the route-code-header-input options to every route code
			//	because the route-accordion is hidden and the route code
			//	is controlled by the bc-route-list. To make sure each route option
			//	is available as a <select> option, make sure all route codes
			//	are availeble
			const $routHeaderInputs = $('.route-code-header-input[name=route_code]')
				.empty()
				.append(
					Object.keys(this.routeCodes)
						.map(code => `<option value=${code}>${code}</option>`)
						.join('')
				)
			$('abs')
		})

	}

}