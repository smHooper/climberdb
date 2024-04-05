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
		this.campCardClass = 'camp-location-card'
		return this;
	}

	// onAddClimberToExpeditionClick(e) {

	// }


	/*
	Configure a Leaflet map given a div HTML ID
	*/
	configureMap(divID, mapObject) {
		
		var mapCenter, mapZoom;
		//const pageName = window.location.pathname.split('/').pop();
		//var currentStorage = window.localStorage[pageName] ? JSON.parse(window.localStorage[pageName]) : {};

		var map = L.map(divID, {
			editable: true,
			scrollWheelZoom: false,
			center: mapCenter || [63, -150.9],
			zoom: mapZoom || 10
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

		const $card = $('#locations-accordion .card:not(.cloneable)').eq(locationIndex);
		const $latitudeField = $card.find('.input-field[name=latitude]');
		const $longitudeField = $card.find('.input-field[name=longitude]');
		const latlng = mapObject.layers[locationIndex].getLatLng();
		const [latDDD, lonDDD] = this.getRoundedDDD(latlng.lat, latlng.lng);
		$latitudeField.val(latDDD).change();
		$longitudeField.val(lonDDD).change();
	}

	/*
	Helper method to add a new location marker to a map

	@param locationIndex: the sequential index of this location (from the card order)
	@param coordinates: LatLng Leaflet object or 2-element array of [lat, lon]
	@param mapObject: either this.maps.main or this.maps.modal
	*/
	addLocationToMap(locationIndex, coordinates, mapObject) {
		const $card = $('#locations-accordion .card:not(.cloneable)').eq(locationIndex);
		const locationType = $card.find('.input-field[name=backcountry_location_type_code]').val()
		const icon = L.icon({
			iconUrl: this.markerIcons[locationType || 2], //default to camp icon
			iconSize: [35, 35],
			className: 'blink' // make it blink until the lat/lon is actually set
		});
		
		const layer = L.marker(coordinates, {icon: icon, draggable: true})
			.addTo(mapObject.map)
			.bindTooltip('', {permanent: true, className: 'leaflet-tooltip-point-label'})
			.on('dragend', () => {
				//set coordinate fields when 
				this.onMarkerDragend(locationIndex)
			});
		mapObject.layers.push(layer);
	}


	onAddLocationButtonClick() {
		const $newCard = this.addNewCard($('#locations-accordion'), {accordionName: 'locations', newCardClass: 'new-card'});
		const index = $newCard.index('#locations-accordion .card:not(.cloneable)');

		// Add a default marker
		const map = this.maps.main.map;
		const mapCenter = map.getCenter();
		this.addLocationToMap(index, mapCenter, this.maps.main);
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
		const index = $card.index('#locations-accordion .card:not(.cloneable)');
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
		const cardIndex = $card.index('#locations-accordion .card:not(.cloneable)');

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
				})
			}
			const footerButtons = 
				'<button class="generic-button modal-button close-modal danger-button confirm-button" data-dismiss="modal">Yes</button>' + 
				'<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">No</button>'
			showModal(message, 'Reset Location coordinates?', 'alert', footerButtons, {eventHandlerCallable: onConfirmClickHandler});
		} else {
			$latitudeField.val(latitude);
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
			const cardIndex = $card.index('#locations-accordion .card:not(.cloneable)');
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
				const index = $card.index('#locations-accordion .card:not(.cloneable)');
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

	}


	init() {
		
		this.showLoadingIndicator('init');
		var initDeferreds = super.init();

		let lookupDeferreds = [];
		lookupDeferreds.push(
			this.queryDB('TABLE backcountry_location_codes')
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
		$.when(...initDeferreds).then(() => {
			lookupDeferreds.push(
				this.queryDB('SELECT code, name FROM group_status_codes WHERE is_bc_status ORDER BY sort_order')
					.done(result => {
						const $groupStatusSelect = $('.input-field[name=reservation_status_code]')
						$groupStatusSelect.append(
							'<option value="">Party member status</option>'
						);
						for (const {code, name} of $.parseJSON(result)) {
							$groupStatusSelect.append(
								$(`<option value="${code}">${name}</option>`)
							);
						}
				})
			)
		})

	}

}