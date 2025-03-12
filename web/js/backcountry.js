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

		const $card = $(this.locationCardIndexSelector).eq(locationIndex);
		const $latitudeField = $card.find('.input-field[name=latitude]');
		const $longitudeField = $card.find('.input-field[name=longitude]');
		const latlng = this.maps.main.layers[locationIndex].getLatLng();
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


	/*
	Update the coordinate fields when the location name field changes
	*/
	onLocationNameChange(e) {
		const $input = $(e.target);
		const locationCode = $input.val();
		
		// If the user chose "other", do nothing
		if (locationCode == -1) {
			return;
		}

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
			showModal(message, 'Reset Location coordinates?', 'alert', footerButtons, {eventHandlerCallable: onConfirmClickHandler});
		} else {
			$latitudeField.val(latitude).addClass('dirty');
			$longitudeField.val(longitude).change();
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


	/*
	The expedition.js suprclass's version of this method can handle all card types
	except locations, so override with a special handler for those
	*/
	onDeleteCardButtonClick(e) {

		// 
		const $card = $(e.target).closest('.card');
		const isLocationCard = $card.closest('.accordion').is('#locations-accordion');
		if (isLocationCard) {
			if ($card.is('.new-card')) {
				const index = $card.index(this.locationCardIndexSelector);
				$card.fadeRemove({
					onRemove: () => {
						this.removeLocationFromMap(index);
						this.resetCampMarkerLabels();
					}
				});
			} else {

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

		$(document).on('click', '#add-new-backcountry-group-button', e => {
			this.onNewBCGroupButtonClick();
		});

		// Capture lat/lon values when location name field gets the focus
		$(document).on('focus', '.input-field[name=backcountry_location_code]', e => {
			const $card = $(e.target).closest('.card');
			this.getCoordinateFieldCurrentValues($card);
		});

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
					if (this.pythonReturnedError(result, {errorExplanation: 'An error occurred while retrieving lookup values from the database.'})) {
						//showModal('An error occurred while retrieving lookup values from the database: ' + result, 'Database Error');
						return;
					}
					for (const {code, name, latitude, longitude} of result.data) {
						this.locationCoordinates[code] = {
							name: name,
							latitude: latitude, 
							longitude: longitude
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
		})

	}

}