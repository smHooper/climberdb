class ClimberDBBackcountry extends ClimberDBExpeditions {
	
	constructor() {
		super();
		this.briefings = {};
		this.expeditionInfo = {
			expeditions: {},
			unscheduled: []
		};
		this.edits = {};
		this.maps = {
			main: {},
			modal: {}
		}
		return this;
	}


	/*
	Configure a Leaflet map given a div HTML ID
	*/
	configureMap(divID, mapObject) {
		
		var mapCenter, mapZoom;
		const pageName = window.location.pathname.split('/').pop();
		var currentStorage = window.localStorage[pageName] ? JSON.parse(window.localStorage[pageName]) : {};
		if (currentStorage.encounterMapInfo) {
			mapCenter = currentStorage.encounterMapInfo.center;
			mapZoom = currentStorage.encounterMapInfo.zoom;
		}

		var map = L.map(divID, {
			editable: true,
			scrollWheelZoom: false,
			center: mapCenter || [63.2, -150.7],
			zoom: mapZoom || 7
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
			onEachFeature = (feature, layer) => {
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
					fillOpacity: 0.15 
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


	configureMainContent() {
		this.configureMap('')
	}

	init() {
		// Call super.init()
		this.showLoadingIndicator('init');
		var initDeferreds = super.init();

		// Do additional synchronous initialization stuff
		this.configureMainContent();


	}

}