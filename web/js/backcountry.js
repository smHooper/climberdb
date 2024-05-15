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
		this.defaultMapCenter = [63, -150.9];
		this.defaultMapZoom = 10;
		this.maxInitialMapZoom = 12; // don't zoom in past this level when fitting map bounds to marker
		this.locationCardIndexSelector = '#locations-accordion .card:not(.cloneable)';
		return this;
	}

	// onAddClimberToExpeditionClick(e) {

	// }


	/*
	Configure a Leaflet map given a div HTML ID
	*/
	configureMap(divID, mapObject) {

		var map = L.map(divID, {
			editable: true,
			scrollWheelZoom: false,
			center: this.defaultMapCenter,
			zoom: this.defaultMapZoom
		});

		const baseMaps = {
			'USGS Topos': L.tileLayer(
				'https://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}', 
				{
					attribution: `Tiles &copy; Esri &mdash; Source: <a href="http://goto.arcgisonline.com/maps/USA_Topo_Maps" target="_blank">Esri</a>, ${new Date().getFullYear()}`
				}
			).addTo(map),
			'Satellite':  L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
				{
					attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
				}
			)
		};
		const layerControl = L.control.layers(baseMaps).addTo(map);

		// Helper function to load geojson data to avoid repeating
		const onGeoJSONLoad = function(geojson, defaultStyle, layerName, {tooltipHandler={}, hoverStyle={}}={}) {
			const onMouseover = (e) => {
				let layer = e.target;

				layer.setStyle(hoverStyle)

				if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
					layer.bringToFront();
				}
			}
			const onMouseout = (e) => {
				layer.resetStyle(e.target);
			}
			const onEachFeature = (feature, layer) => {
				layer.on({
					mouseover: onMouseover,
					mouseout: onMouseout
				})
			}

			let geojsonOptions = {
				style: defaultStyle,
				onEachFeature: onEachFeature //add mouseover and mouseout listeners
			}

			var layer; // define before calling L.geoJSON() so onMouseout event can reference
			layer = L.geoJSON(geojson, geojsonOptions)
				.bindTooltip(
					tooltipHandler,
					{
						sticky: true
					}
				).addTo(map);
			layerControl.addOverlay(layer, layerName);

			return layer;
		}

		$.get({url: 'assets/backcountry_units.json'})
			.done(geojson => {
				const defaultStyle = {
					color: '#000',
					opacity: 0.2,
					fillColor: '#000',
					fillOpacity: 0.15 
				}
				const hoverStyle = {
					color: '#000',
					opacity: 0.4,
					fillColor: '#000',
					fillOpacity: 0.05 
				}
				const tooltipHandler = layer => layer.feature.properties.Unit + ': ' + layer.feature.properties.Name;
				onGeoJSONLoad(geojson, defaultStyle, 'Backcountry Units', {tooltipHandler: tooltipHandler, hoverStyle: hoverStyle})
			}).fail((xhr, error, status) => {
				console.log('BC unit geojson read failed: ' + error);
			})

		// Make the encounter marker drag/droppable onto the map
		// $('#encounter-marker-img').draggable({opacity: 0.7, revert: true});//helper: 'clone'});
		// $('#encounter-location-map').droppable({drop: this.markerDroppedOnMap});

		mapObject.map = map;
	}


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
	Helper method to zoom/pan to all BC locations only if one or more of them is
	outside the vurrent view 
	*/
	fitMapBoundsToLocations(mapObject) {
		// check if the all layers are inside the current view
		const mapBounds = mapObject.map.getBounds();
		const outsideCurrentView = mapObject.layers.filter(layer => !mapBounds.contains(layer.getLatLng()));
		
		// If so, move the map
		if (outsideCurrentView.length) {
			mapObject.map.fitBounds(
				(new L.featureGroup(mapObject.layers)).getBounds(), 
				{maxZoom: this.maxInitialMapZoom}
			);
		}
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
		this.configureMap('main-map', this.maps.main);

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


	saveEdits() {
		
		var sqlStatements = [],
			sqlParameters = [];

		if (!this.validateEdits()) return; // Error message already shown in validateEdits()

		const now = getFormattedTimestamp(new Date(), {format: 'datetime'});
		const username = this.userInfo.ad_username;
		
		// collect info about inserts so attributes can be changes such that future edits are treated as updates
		var inserts = [];

		const attachmentsDeferred = this.processAttachments();

		// determine if this is a new expedition or not
		const expeditionID = $('#input-expedition_name').data('table-id') || null;
		const isNewExpedition = expeditionID === undefined;

		// get expedition table edits
		var expeditionValues = [true]; 
		var expeditionFields = ['is_backcountry']; 
		for (const el of $('#expedition-data-container .input-field.dirty')) {
			expeditionValues.push(this.getInputFieldValue($(el)));
			expeditionFields.push(el.name);
		}
		if (expeditionValues.length) {
			// If this is a new expedition, make sure group status gets saved
			if (!expeditionID) $('#input-group_status').addClass('dirty');

			let fieldValues = Object.fromEntries(expeditionFields.map((f, i) => [f, expeditionValues[i]]));
			let [sql, parameters] = this.valuesToSQL(fieldValues, 'expeditions', now, username, {updateID: expeditionID || null});
			sqlStatements.push(sql);
			sqlParameters.push(parameters);

			if (sql.startsWith('INSERT')) {
				inserts.push({container: $('#expedition-data-container'), tableName: 'expeditions'})
			}
		}

		// Transactions and routes might have edits without expedition members having any, so loop 
		//	through each expedition member card, regardless of whether it has any dirty inputs
		for (const el of $('#expedition-members-accordion .card:not(.cloneable)')) {
			const $card = $(el);
			const [statements, params] = this.getExpeditionMemberSQL($card, expeditionID, inserts, now, username);
			sqlStatements = [...sqlStatements, ...statements];
			sqlParameters = [...sqlParameters, ...params];
		}

		// Itinerary locations
		for (const el of $(this.locationCardIndexSelector)) {
			const $card = $(el);
			const $inputs = $card.find('.input-field.dirty');
			if ($inputs.length) {
				const [sql, parameters] = this.inputsToSQL(
					$card.find('.card-body'),
					'itinerary_locations', 
					now, 
					username, 
					{
						updateID: $card.data('table-id') || null, 
						foreignIDs: {
							expeditions: expeditionID, 
						},
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
				username, 
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
				username, 
				{
					updateID: dbID || null,
					foreignIDs: {expeditions: expeditionID},
					insertArray: inserts
				}
			);
			sqlStatements.push(sql);
			sqlParameters.push(parameters);
		}
		
		// Wait until attachments finish
		return $.when(attachmentsDeferred).then(attachmentResponse => {
			// If the only changes were new attachments, exit
			if (!$('.dirty').length) {
				hideLoadingIndicator();
				const expeditionID = this.expeditionInfo.expeditions.id;
				if (expeditionID) this.queryExpedition(expeditionID, {showOnLoadWarnings: false}); //suppress flagged expedition member warnings
				return $.Deferred().resolve();
			}
			if (attachmentResponse.failed_files.length) {
				hideLoadingIndicator();
				return $.Deferred().reject();
			}

			return $.post({ 
				url: 'climberdb.php',
				data: {action: 'paramQuery', queryString: sqlStatements, params: sqlParameters},
				cache: false
			}).done(queryResultString => {
				if (climberDB.queryReturnedError(queryResultString)) { 
					showModal(`An unexpected error occurred while saving data to the database: ${queryResultString.trim()}. Make sure you're still connected to the NPS network and try again. <a href="mailto:${this.config.db_admin_email}">Contact your database adminstrator</a> if the problem persists.`, 'Unexpected error');
					return;
				} else {
					const result = $.parseJSON(queryResultString)
						.filter(row => row != null);
					const expeditionID = this.setInsertedIDs(result, inserts);

					// update in-memory data for each edited input
					this.queryExpedition(expeditionID, {showOnLoadWarnings: false}) //suppress flagged expedition member warnings


					// Hide the save button again since there aren't any edits
					$('#save-expedition-button').ariaHide(true);
					// but open the reports modal button since there's something to show
					$('#open-reports-modal-button, #show-cache-tag-modal-button, #edit-expedition-button, #delete-expedition-button').ariaHide(false);

				}
			}).fail((xhr, status, error) => {
				showModal(`An unexpected error occurred while saving data to the database: ${error}. Make sure you're still connected to the NPS network and try again. Contact your database adminstrator if the problem persists.`, 'Unexpected error');
				// roll back in-memory data
			}).always(() => {
			 	this.hideLoadingIndicator();
			});
		})
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
				this.queryDB(`TABLE ${this.dbSchema}.backcountry_location_codes`)
					.done(result => {
						// No need to check for errors
						for (const {code, name, latitude, longitude} of $.parseJSON(result)) {
							this.locationCoordinates[code] = {
								name: name,
								latitude: latitude, 
								longitude: longitude
							}
						}
					})
			);

			lookupDeferreds.push(
				this.queryDB(`SELECT code, name FROM ${this.dbSchema}.group_status_codes WHERE is_bc_status ORDER BY sort_order`)
					.done(result => {
						const $selects = $('.group-status-option-field')
						
						$selects.append(
							'<option value="">Party member status</option>'
						);
						for (const {code, name} of $.parseJSON(result)) {
							$selects.append(
								$(`<option value="${code}">${name}</option>`)
							);
						}

						$selects.val($selects.data('default-value'));
				})
			)
		})

	}

}