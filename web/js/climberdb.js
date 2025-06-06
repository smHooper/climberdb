/* Global functions */
function getFormattedTimestamp(date, {format='date'}={}) {

	if (date === undefined) date = new Date();

	// Get 0-padded minutes
	const minutes = ('0' + date.getMinutes()).slice(-2)
	const dateString = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
	const timeString = `${date.getHours()}:${minutes}`;
	return (
		format === 'date' 		? dateString : 
		format === 'time' 		? timeString :
		format === 'datetime' 	? dateString + ' ' + timeString :
			dateString + ' ' + timeString //default
	);
}


function print(i) {
	console.log(i);
}


function showLoadingIndicator(caller, timeout=15000) {

	//set a timer to turn off the indicator after a max of 15 seconds because 
	//  sometimes hideLoadingIndicator doesn't get called or there's some mixup 
	//  with who called it
	/*if (timeout) {
		setTimeout(hideLoadingIndicator, timeout);
	}*/
	
	// For anonymous functions, the caller is undefined, so (hopefully) the 
	//	function is called with the argument given
	//caller = caller || this.showLoadingIndicator.caller.name;

	var indicator = $('#loading-indicator').removeClass('hidden');
	$('#loading-indicator-background').removeClass('hidden');

	// check the .data() to see if any other functions called this
	indicator.data('callers', 
		indicator.data('callers') === undefined ? 
			[caller] : 
			indicator.data('callers').concat([caller])
	);

}


/*
*/
function hideLoadingIndicator(caller) {


	var indicator = $('#loading-indicator')
	// if no caller was given, just remove the indicator
	if (caller === undefined || indicator.data('callers') == undefined) {
		 indicator.data('callers', [])
	} else if (indicator.data('callers').includes(caller)) {
		indicator.data(
			'callers', 
			indicator.data('callers').filter(thisCaller => thisCaller != caller)
		);
	}

	// Hide the indicator if there are no more callers
	if (!indicator.data('callers').length) {
		$('#loading-indicator-background').addClass('hidden');
		indicator.addClass('hidden');
	}

}

function deepCopy(inObject) {
	let outObject, value, key;

	if (typeof inObject !== "object" || inObject === null) {
		return inObject; // Return the value if inObject is not an object
	}

	// Create an array or object to hold the values
	outObject = Array.isArray(inObject) ? [] : {};

	for (key in inObject) {
		value = inObject[key];

		// Recursively (deep) copy for nested objects, including arrays
		outObject[key] = deepCopy(value);
	}

	return outObject;
}

/*
Helper function to debug issues with collapses
*/
function toggleCollapseEventMonitoring(selector, toggleOn=true) {
	const $collapse = $(selector).closest('.collapse');

	if (toggleOn) {
		$collapse.on('show.bs.collapse', e => {
			const a = 1;
		});
		$collapse.on('shown.bs.collapse', e => {
			const a = 1;
		});
		$collapse.on('hide.bs.collapse', e => {
			const a = 1;
		});
		$collapse.on('hidden.bs.collapse', e => {
			const a = 1;
		});
	} else {
		$collapse.off('show.bs.collapse');
		$collapse.off('shown.bs.collapse');
		$collapse.off('hide.bs.collapse');
		$collapse.off('hidden.bs.collapse');
	}
}


/*
Helper function to turn modal event monitoting on or off
*/
function toggleModalEventMonitoring(toggleOn=true) {
	const $modal = $('#alert-modal');

	if (toggleOn) {
		$modal.on('show.bs.modal', e => {
			print('modal show')
		});
		$modal.on('shown.bs.modal', e => {
			print('modal shown')
		});
		$modal.on('hide.bs.modal', e => {
			print('modal hide')
		});
		$modal.on('hidden.bs.modal', e => {
			print('modal hidden')
		});
	} else {
		$modal.off('show.bs.collapse');
		$modal.off('shown.bs.collapse');
		$modal.off('hide.bs.collapse');
		$modal.off('hidden.bs.collapse');
	}
}


function isNull(value) {

	return (
		value === null ||
		value === undefined ||
		value === ''
	);

}


/*
Check if two values are equal. For this purpose, null, undefined, and '' are all null and 
therefore equal. This is important because getting element.value or $element.val() will 
both return '' regardless of the data type. When saving a value to the database, this will 
throw an error for non-string database fields
*/
function valuesAreEqual(value1, value2) {

	const value1NotNUll = !isNull(value1);
	const value2NotNull = !isNull(value2);
	const nullSum = value1NotNUll + value2NotNull;
	// Check if both values are null-y
	if (nullSum === 0) {
		return true;
	}
	// One of them is null but the other isn't
	else if (nullSum === 1) {
		// if one of the values is null and one of them is false, consider them equal
		return [value1, value2].includes(false);
	} 
	// neither is null-y so compare their string representations
	else {
		// check if they're both objects. If so, toString() will return '[object Object]'
		//	which would yeild a false positive from the comparison
		if (typeof(value1) === 'object' && typeof(value2) === 'object') return false;

		// if either is an array, sort them first
		if (Array.isArray(value1)) value1 = value1.sort();
		if (Array.isArray(value2)) value2 = value2.sort();
		
		return value1.toString() === value2.toString();
	}
}


/* ClimberDB base class*/
class ClimberDB {
	constructor() {
		this.modalMessageQueue = [];
		this.userInfo = {};
		this.tableInfo = {
			tables: {},
			insertOrder: [] // comply with left-right orientation of table relationships
		};
		this.entryMetaFields = ['entry_time', 'entered_by', 'last_modified_time', 'last_modified_by'];
		this.currentURL = '';// for de-registering a BroadcastChannel listener
		this.config = {};
		this.loginInfo = {}; //{username: {expires: } }
		this.constants = { // values that aren't configurable but need to be accessible across multiple pages
			millisecondsPerDay: 1000 * 60 * 60 * 24,
			climbingFeeTransactionCodes: [3, 10, 12, 14, 15, 23, 24],
			entranceFeeTransactionCodes: [11, 12, 14, 15, 25, 8, 26],
			groupStatusCodes: {
				pending: 1,
				readyForReview: 2,
				confirmed: 3,
				onMountain: 4,
				offMountain: 5,
				cancelled: 6
			},
			userRoleCodes: {
				dataEntry: 1,
				ranger: 2,
				admin: 3,
				superUser: 4,
				readOnly: 5,
				noLoginRanger: 6
			},
			userStatusCodes: {
				active: 2,
				inactive: 1,
				disabled: -1
			}
		}
		this.urlChannels = {}; // for checking if a URL is already open in another tab/window
		this.nonEditingUserRoles = [5]; // for checking if user has edit privs
		this.environment = '';
		this.dbSchema = '';
		this.defaultMapCenter = [63, -150.9];
		this.defaultMapZoom = 10;
		this.maxInitialMapZoom = 12; // don't zoom in past this level when fitting map bounds to marker
		this.maxMapZoom = 15;
		this.duplicatePageNotifications = [
			'/backcountry.html',
			'/briefings.html',
			'/climbers.html',
			'/config.html',
			'/expeditions.html'
		]
	}


	getDefaultModalFooterButtons(modalType) {
		/* 
		Helper method to return HTML for modal footer buttons based on type 
		of modal 'confirm', 'yes/no', or 'alert'. 'confirm' and 'yes/no' are for asking the user to 
		confirm or discard changes or some action while 'alert' just provides 
		information and an 'OK' button
		*/
		
		return  modalType === 'confirm' ? 
				'<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">Cancel</button>' +
				'<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">OK</button>'
			: modalType === 'yes/no' ? 
				'<button class="generic-button secondary-button modal-button close-modal deny-button" data-dismiss="modal">No</button>' +
				'<button class="generic-button modal-button close-modal danger-button confirm-button" data-dismiss="modal">Yes</button>'
			:
			'<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">OK</button>'
			;
	}

	/*
	Add a modal message to the queue and process the queue
	*/
	showModal(
	    message, 
	    title, 
	    {
	    	modalType='alert', 
	    	footerButtons='', 
	        dismissable=true, 
	        eventHandlerCallable=() => {},
	        modalMessageQueue=null
	    } = {}
	) {
	    const $modal = $('#alert-modal');

	    // Modal queue to store pending messages. For ClimberForm to be able to call showModal, it needs access to the ClimberDB class property, which is passed explicitly
	    var queue = Array.isArray(modalMessageQueue) ? modalMessageQueue : this.modalMessageQueue;
	    
	    //this.modalMessageQueue = this.modalMessageQueue || [];

	    // Add the current modal request to the queue
	    queue.push({ message, title, modalType, footerButtons, dismissable, eventHandlerCallable });

	    // If modal is already showing, let it close naturally, then show the next modal in queue
	    if ($modal.hasClass('showing')) {
	        return;
	    }

	    const processQueue = () => {
	        if (queue.length === 0) return;

	        // Get the next modal request
	        const { message, title, modalType, footerButtons, dismissable, eventHandlerCallable } = queue.shift();
	        
	        $modal.addClass('showing');

	        const finalFooterButtons = footerButtons || this.getDefaultModalFooterButtons(modalType);

	        const closeButton = `
	            <button type="button" class="close close-modal" data-dismiss="modal" aria-label="Close">
	                <span aria-hidden="true">&times;</span>
	            </button>
	        `;

	        const innerHTML = `
	            <div class="modal-dialog" role="document">
	                <div class="modal-content">
	                    <div class="modal-header">
	                        <h5 class="modal-title">${title}</h5>
	                        ${dismissable ? closeButton : ''}
	                    </div>
	                    <div class="modal-body">
	                        <p>${message}</p>
	                    </div>
	                    <div class="modal-footer">
	                        ${finalFooterButtons}
	                    </div>
	                </div>
	            </div>
	        `;

	        const options = dismissable ? {} : { backdrop: 'static', keyboard: false };

	        $modal.html(innerHTML).modal(options);

	        // Ensure clicking close button hides the modal
	        $modal.find('.close-modal').click(() => {
	            $modal.modal('hide');
	        });

	        // Ensure we remove the 'showing' class and process the next modal in queue
	        $modal.one('hidden.bs.modal', () => {
	            $modal.removeClass('showing');
	            processQueue(); // Show the next modal if any
	        });

	        // Call external event handler
	        eventHandlerCallable.call();
	    }

	    // Process the queue immediately if no modal is currently displayed
	    processQueue();
	}


	getUserInfo() {
		
		const urlParams = this.parseURLQueryString();
		return $.ajax({
			url: 'flask/user_info',
			method: 'POST',
			data: urlParams.testClientSecret ? {client_secret: urlParams.testClientSecret} : {},
			cache: false
		}).done((resultString) => {
			if (this.pythonReturnedError(resultString)) {
				throw 'User role query failed: ' + resultString;
			} else {
				const result = typeof resultString === 'object' ? resultString : $.parseJSON(resultString);
				
				if (!(result.user_status_code && result.user_role_code)) {
					// user isn't authorized 
					const programAdmin = this.config.program_admin_email;
					// if config has not yet been retrieved, program_admin_email will be undefined
					const adminEmailLink = programAdmin ? `at <a href="mailto:${programAdmin}">${programAdmin}</a> ` : '';
					const message = `There is no user account for Windows user <strong>${result.ad_username}</strong>. Contact the climbing permit program adminstrator ${adminEmailLink}if you have questions.`;
					const footerButtons = '<a class="generic-button" href="index.html">OK</a>';
					this.showModal(message, 'User Not Authorized', {footerButtons: footerButtons});
					return;
				}

				this.userInfo = {...result};

				$('#username').text(`Hi, ${this.userInfo.first_name}!`);

				// Set the href attribute of the user account dropdown (if it exists. It won't on pages that are initiated with addMenu: false)
				const $changePasswordButton = $('#change-password-button');
				if ($changePasswordButton.length) $changePasswordButton[0].href = window.encodeURI(
						`${window.location.origin}/index.html?reset=true&id=${this.userInfo.id}&referer=${window.location.href}`
					);
				
				this.userInfo.isAdmin = 
					this.userInfo.user_role_code == this.constants.userRoleCodes.admin || 
					this.userInfo.user_role_code == this.constants.userRoleCodes.superUser;
				if (this.userInfo.isAdmin) {
					// Make fields only editable by admins editable
					$('.admin-only-edit').removeClass('admin-only-edit');
					$('.admin-only-nav-item').removeClass('hidden');
				} else {
					//*****TODO: add info button explaining that this field isn't editable
					$('.admin-only-edit').insertAfter('')

					
				}
			}
		});
	}

	/*
	For admin only pages, check that the user has the admin role. This function should be chained on admin pages with subsequent admin-only content getting loaded only after the promise is successfully resolved
	*/
	checkUserRole() {
		const deferred = $.Deferred();
		if (!this.userInfo.isAdmin) {
			const adminEmail = this.config.program_admin_email;
			const message = 'You do not have sufficient permissions to view this page. If you think this is an' +
				` error, contact the program adminstrator at <a href="mailto:${adminEmail}">${adminEmail}</a>.`
			const footerButtons = '<a href="dashboard.html" class="generic-button modal-button close-modal confirm-button">OK</a>'
			this.showModal(message, 'Permission Error', {footerButtons: footerButtons, dismissable: false});
			deferred.reject();
		} else {
			deferred.resolve();
		}
		return deferred.promise();
	}


	loadConfigValues() {
		return $.post({
			url: '/flask/config'
		}).done(response => {
			if (this.pythonReturnedError(response, {errorExplanation: 'There was a problem retrieving the app configuration.'})) {
				return;
			} else {
				this.config = {...response}
			}
		})
	}


	configureMenu() {
		$('body').prepend(`
			<nav class="climberdb-header-menu">
				<div class="header-menu-item-group">
					<button class="icon-button sidebar-collapse-button" title="Toggle sidebar menu">
						<div class="sidebar-collapse-button-line"></div>
						<div class="sidebar-collapse-button-line"></div>
						<div class="sidebar-collapse-button-line"></div>
					</button>
					<a class="home-button" role="button" href="dashboard.html">
						<img src="imgs/climberdb_icon_50px.svg" alt="home icon">
					</a>
					<h4 class="page-title">DENA Climbing Permit Portal</h4>
				</div>
				<div class="header-menu-item-group" id="username-container">
					<button id="show-user-options-button" class="generic-button icon-button" title="User account">
						<img id="username-icon" src="imgs/account_icon_50px.svg" alt="account icon">
						<label id="username"></label>
					</button>
					<div class="user-account-dropdown" role="">
						<button id="log-out-button" class="generic-button text-only-button w-100 centered-text account-button" title="Log out">Log out</button>
						<a id="change-password-button" class="generic-button text-only-button w-100 centered-text account-button" title="Reset password">Reset password</a>
					</div>
				</div>
			</nav>
		`);

		$('.main-container-with-sidebar').prepend(`
			<!-- nav sidebar -->
			<nav class="sidebar" role="navigation" role="navigation">
				<div class="sidebar-sticky">
					<div class="sidebar-background"></div>
					<ul class="sidebar-nav-group">

						<li class="nav-item selected">
							<a href="dashboard.html">
								<img class="sidebar-nav-item-icon" src="imgs/home_icon_50px.svg">
								<span class="sidebar-nav-item-label">home</span>
							</a>
						</li>

						<li class="nav-item">
							<a href="climbers.html">
								<img class="sidebar-nav-item-icon" src="imgs/climber_icon_50px.svg">
								<span class="sidebar-nav-item-label">climbers</span>
							</a>
						</li>

						<li class="nav-item">
							<a href="expeditions.html">
								<img class="sidebar-nav-item-icon" src="imgs/groups_icon_50px.svg">
								<span class="sidebar-nav-item-label">expeditions</span>
							</a>
						</li>

						<li class="nav-item">
							<a href="backcountry.html">
								<img class="sidebar-nav-item-icon" src="imgs/bc_icon_50px.svg">
								<span class="sidebar-nav-item-label">backcountry</span>
							</a>
						</li>

						<li class="nav-item">
							<a href="query.html">
								<img class="sidebar-nav-item-icon" src="imgs/query_icon_50px.svg">
								<span class="sidebar-nav-item-label">query data</span>
							</a>
						</li>

						<li class="nav-item">
							<a href="briefings.html">
								<img class="sidebar-nav-item-icon" src="imgs/calendar_icon_50px.svg">
								<span class="sidebar-nav-item-label">briefing calendar</span>
							</a>
						</li>

						<li class="nav-item admin-only-nav-item hidden">
							<a href="users.html">
								<img class="sidebar-nav-item-icon" src="imgs/user_icon_50px.svg">
								<span class="sidebar-nav-item-label">manage users</span>
							</a>
						</li>

						<li class="nav-item admin-only-nav-item hidden">
							<a href="config.html">
								<img class="sidebar-nav-item-icon" src="imgs/settings_icon_50px.svg">
								<span class="sidebar-nav-item-label">configure app</span>
							</a>
						</li>

					</ul>

				</div>
			</nav>
		`);

		$('.sidebar-collapse-button').click((e) => {
			$('.sidebar-collapse-button, nav.sidebar').toggleClass('collapsed');
		});


		$(window).resize(() => {
			// Only collapse the menu automatically if it's less than 992 pixels plus the width of the sidebar (250 px)
			const windowIsSmall =  $(window).width() < 1242;
			const shouldCollapse = windowIsSmall || (!windowIsSmall && $('nav.sidebar').is('.collapsed'));
			$('.sidebar-collapse-button, nav.sidebar').toggleClass('collapsed', shouldCollapse);
		}).resize();//trigger it manuall in case the window is already small

		$('#show-user-options-button').click(() => {
			$('.user-account-dropdown').toggleClass('show');
		});

		$('#log-out-button').click(() => {
			this.confirmLogout();
		})

		// Hide the group status dropdowns when the user clicks outside of it
		$(document).on('click', e => {
			const $openDrawer = $('.user-account-dropdown.show');
			const $target = $(e.target);
			if (!$target.is('.user-account-dropdown') && !$target.parents('#show-user-options-button').length && $openDrawer.length) {
				$openDrawer.collapse('hide');
			}
		});

		var tabIndex = 0;
		for (const el of $('nav a, nav button')) {
			el.tabIndex = tabIndex;
			tabIndex ++;
		}

		// Add ctrl + s hotkey for saving. Use keydown to prevent the default broswer behavior 
		//	(showing save file dialog) 
		$(document).keydown(e => {
			if (e.ctrlKey && e.key.toLowerCase() === 's') {
				// Stop save dialog
				e.preventDefault();
				e.returnValue = false;
				
				this.saveEdits();
				return false;
			}
		})

		// Add keyup event on all elements to make any click event on a focusable element 
		//	triggerable from the keyboard
		$(document).keyup( e => {
			e.stopPropagation();
			const target = e.target;
			// check if it has a .click event
			let events = $._data(target, 'events')

			if (e.key === 'Enter' && events) {
				const $target = $(target);
				if (events.click && !$target.is('.no-click-trigger-on-enter')) {
					$target.click();
				}
			}
		})
	}


	/*
	Configure a Leaflet map given a div HTML ID
	*/
	configureMap(divID, {mapObject={}, showBackcountryUnits=true}={}) {

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

		// Prevent user from zooming beyond topo layer's max zoom
		mapObject.map = map.setMaxZoom(this.maxMapZoom);

		// if not showing backcountry units, set the  return value to be a resolved promise
		var deferred = $.Deferred().resolve();
		if (showBackcountryUnits) {
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

			
			deferred = $.get({url: 'assets/backcountry_units.json'})
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
		}

		return deferred;
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
				{maxZoom: this.maxInitialMapZoom || 15}
			);
		}
	}


	/*
	Dummy function so that this.saveEdits() doesn't throw an error for any pages 
	in the document.keydown event listner 
	*/
	saveEdits() {
		// override in subclasses
	}
	
	/*
	Dummy function so showDenyEditPermissionsMessage() can safely call toggleEditing
	*/
	toggleEditing({allowEdits=null}={}) {
		//override in subclasses
	}


	/*
	Helper method to check user role and prevent editing if role is not either data entry or admin
	*/
	checkEditPermissions() {
		return !this.nonEditingUserRoles.includes(this.userInfo.user_role_code)
	}


	/*
	If the user doesn't have an editing role, let them know
	*/
	showDenyEditPermissionsMessage() {
		const allowEditing = this.checkEditPermissions();
		if (!allowEditing) {
			const eventHandler = () => {
				$('#alert-modal button.close-modal').click(() => {
					this.toggleEditing({allowEdits: false})
				})
			}
			const program_admin = this.config.program_admin_email;
			const message = 
				`Your account does not have editing privileges. If you need edit privileges, contact` + 
				` the program adminstrator at <a href="mailto:${program_admin}">${program_admin}</a>`
			this.showModal(message, 'Editing Not Authorized', {modalType: 'alert', dismissable: false, eventHandlerCallable: eventHandler});
		}

		return allowEditing;
	}

	/*
	Ask user if they really want to log out and warn them that they'll lose unsaved data.
	If they confirm, set the expiration of their login session to now and go to the sign-in page
	*/
	confirmLogout() {
		// Set the expiration for the current user's session to now if they confirm. Then go to the sign-in page
		const onConfirmClickHandler = () => {
			$('#alert-modal .confirm-button').click(() => {
				this.loginInfo.expiration = new Date().getTime();
				window.localStorage.login = JSON.stringify(this.loginInfo);
				window.location.href = 'index.html';
			});
		}
		const footerButtons = `
			<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">Yes</button>
			<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">No</button>
		`;
		this.showModal(
			'Are you sure you want to log out? Any unsaved data will be lost', 
			'Log out?', 
			{ 
				footerButtons: footerButtons,
				eventHandlerCallable: onConfirmClickHandler
			}
		);
	}


	/*
	Run a SELECT query by either sending WHERE (and possibly ORDER BY) parameters to use the 
	SQLAlchemy ORM or raw SQL and parameters to execute parameterized SQL
	*/
	queryDB({tables=[], selects={}, joins=[], where={}, orderBy=[], sql='', sqlParameters={}, returnTimestamp=false}={}) {
		
		var requestData = Object.keys({...selects, ...where}).length || tables.length ? 
			{	
				tables: tables,
				select: selects,
				joins: joins,
				where: where,
				order_by: orderBy
			} : 
			{sql: sql, params: sqlParameters};

		if (returnTimestamp) requestData.queryTime = (new Date()).getTime();
		
		return $.post({
			url: '/flask/db/select',
			data: JSON.stringify(requestData),
			contentType: 'application/json'
		});
	}	


	/*
	Collect edits organized in a heirarchical structure to send to the server. 
	The ORM will add the necessary foreign keys, but the ORM objects need to 
	be created in reverse one-to-many order. This function will sequentially
	step through the containerSelectors array to get the values of .input-fields
	as nested objects 
	*/
	getEdits({containerSelectors=[], editedFieldSelector='.input-field.dirty'}) {

		var inserts = {},
			updates = {};
		var $fields = $(editedFieldSelector);
		//const reverseInsertOrder = this.tableInfo.tables.insertOrder;
		// for (const selector of containerSelectors) {
		// 	for (const container of $(selector).has(editedFieldSelector)) {
		// 		const $container = $(container);
		// 		const containerDBID = $container.data('table-id');
		// 		const $containerFields = $container.find($fields);
		// 		const containerValues = {};
		// 		for (const tableName of reverseInsertOrder) {
		// 			const $containerTableFields = $containerFields.find(`[data-table-id="${tableName}"]`);
		// 			const containerValues = Object.fromEntries(
		// 				$containerTableFields.map((_, el) => [el.name, el.value])
		// 			);
		// 			const dbID = containerDBID || $containerTableFields
		// 				.map((_, el) => $(el).data('table-id'))
		// 				.get()
		// 					.filter(id => id)[0];
		// 			if (!dbID) {
		// 				containerValues[tableName] = {
		// 					container: $container,
		// 					values: containerValues
		// 				};
		// 			} else {
		// 				updates[tableName] = {...(updates[tableName] || {}), ...containerValues}
		// 			}

		// 		}
		// 		$fields = $fields.not($containerFields);
				
		// 	}
		// }

		
		// Get all containers that have edits
		const joinedSelector = containerSelectors.join(',');
		const $containers = $(joinedSelector).has(editedFieldSelector);
		
		// Get just containers that will be INSERTed rather than UPDATEd
		var $insertContainers = $containers.map((_, el) => !$(el).data('table-id'));
		

		const nSelectors = containerSelectors.length;
		/*
		{
			table1: [
				{
					id: 1,
					children: {
						table2: [
							{
								values: {field1: val1, field2: val2}
								children: {
									table3: [
										{
											values: {f1: v1, f2: f3}
										},
										{
											values: {f1: v1, f2: f3}
										}
									]
								}
							}
						]
					}
				},
				{
					id: 2,
					children: 
				}
			]
		}

		{
			tables: [
				{tableName: 'transactions', selector: '.transactions-tab-pane .data-list-item'},
				{tableName: 'attachments'}
			],
			parent: {
				tableName: 'expedition_members',
				selector: '#expedition-members-accordion .card',
				parent: 
			}
		}
		*/
		var values = {};
			//currentValues = {}; 
		
		// Helper function to get values from a container
		const getContainerValues = $container => {
			const $containerFields = $container.find($fields);
			// Drop the container and the fields from the master selection objects
			//	because a subsequent search higher up in the DOM tree will find them
			$insertContainers = $insertContainers.not($container);
			$fields = $fields.not($containerFields);
			
			const containerValues = Object.fromEntries(
				$containerFields.map((_, el) => [el.name, el.value])
			); 
			return containerValues 
		} 

		// Loop through each container selector and accumulate the edits by traversing 
		//	up the DOM tree, stopping at the first element that already exists in the DB
		for (const i = 0; i < nSelectors; i++) {
			let selector = containerSelectors[i];
			for (const c of $insertContainers.find(selector)) {
				let $container = $(c);
				
				// IF there's no table name, throw and error. This is only necessary for development
				//	becasuse this shouldn't happen in production
				const tableName = $container.data('table-name');
				if (!tableName) throw `no 'table-name' data attribute for #${$container.attr('id')}`;

				const containerValues = getContainerValues($container);

				currentValues = {
					[tableName]: [
						...(currentValues[tableName] || []), 
						{
							values: containerValues
						}
					]
				};

				// Traverse the DOM upwards to get edits from the $container's parents
				for (const parentSelector of containerSelectors.slice(i + 1, nSelectors)) {
					const $parentContainer = $container.closest(parentSelector);
					const parentDBID = $parentContainer.data('table-id');
					const parentTableName = $parentContainer.data('table-name');
					if (parentDBID) {
						values[parentTableName] = [
							...(values[parentTableName] || []),
							{
								id: parentDBID,
								children: {
									...((values[parentTableName] || {}).children || {}), 
									...currentValues
								}
							}
						]
						break;
					} else {
						const parentContainerValues = getContainerValues($parentContainer);
						currentValues[parentTableName] = [
							...(currentValues[parentTableName] || []),
							{
								values: parentContainerValues,
								children: {
									...((currentValues[parentTableName] || {}).children || {}),
									...currentValues
								}
							}
						]
					}
					// Set for the next iteration to get this parent's parent
					$container = $parentContainer;

				}
			}
		}

		return values;

	}


	/*
	Delete one or more rows from a database table. id is either a single ID or a list of IDs
	*/
	deleteByID(tableName, id, {returning={}}={}) {

		var requestData = {
			table_name: tableName,
			db_ids: id
		};
		if (Object.keys(returning).length) 
			requestData.returning = returning;
		

		return $.post({
			url: '/flask/db/delete/by_id',
			data: JSON.stringify(requestData),
			contentType: 'application/json'
		});
	}

	/*
	Delete rows by ID from one or more tables.
	@param deleteIDs - object in the form {tableName: [id1, id2]}
	@param returning [optional] - object in the form {tableName: [column1, column2]}
		to specify 
	*/
	deleteFromMultipleTables(deleteIDs, {returning={}}={}) {

		var requestData = deleteIDs;
		if (Object.keys(returning).length)
				requestData.returning = returning;

		return $.post({
			url: '/flask/db/delete/from_multiple_tables',
			data: JSON.stringify(requestData),
			contentType: 'application/json'
		})

	}

	/*
	*/
	fillSelectOptions(selectElementID, sqlArgs, optionClassName='') {
		return this.queryDB(sqlArgs)
			.done(response => {
				if (this.pythonReturnedError(response)) {
					print(`fillSelectOptions() failed for ${selectElementID} with error: ` + response);
				} else {
					const queryResult = response.data || [];
					const $el = $('#' + selectElementID);
					for (const row of queryResult) {
						$el.append(
							`<option class="${optionClassName}" value="${row.value || row.code}">${row.name}</option>`
						);
					}
					const defaultValue = $el.data('default-value');
					if (defaultValue !== undefined) $el.val(defaultValue);
				} 
			})
		.fail((xhr, status, error) => {
				console.log(`fill select failed with status ${status} because ${error} from query:\n${queryString}`)
			}
		);
	}

	/*

	*/
	fillAllSelectOptions(noFillClass='no-option-fill') {

		return $(`select:not(.${noFillClass})`).map( (_, el) => {
			const $el = $(el);
			const placeholder = $el.attr('placeholder');
			const lookupTable = $el.data('lookup-table');
			const lookupTableName = lookupTable ? lookupTable : $el.attr('name') + 's';
			const id = el.id;
			if (lookupTableName != 'undefineds') {//if neither data-lookup-table or name is defined, lookupTableName === 'undefineds' 
				if (placeholder) $('#' + id).append(`<option class="" value="">${placeholder}</option>`);
				
				let sqlArgs = {orderBy: [{table_name: lookupTableName, column_name: 'sort_order'}]};
				if ($el.is('.include-disabled-options')) { 
					sqlArgs.tables = [lookupTableName];
				} else {
					sqlArgs.where = {[lookupTableName]: [{
						column_name: 'sort_order', 
						operator: 'IS NOT', 
						comparand: 'NULL'}
					]};
				}

				return this.fillSelectOptions(id, sqlArgs);
				
			}
		});
	}


	/*
	*/
	showLoadingIndicator(caller, timeout=15000) {

		showLoadingIndicator(caller, timeout);
	}


	/*
	*/
	hideLoadingIndicator(caller) {
		hideLoadingIndicator(caller);
	}


	/*
	Helper function to get human-readable database values from selects
	*/
	selectValueToText(name, value) {
		return value ? $(`select.input-field[name="${name}"] option[value="${value}"]`).first().text() : '';
	}


	addNewListItem($ul, {dbID=null, parentDBID=null, newItemClass=''}={}) {

		const $cloneable = $ul.find('li.cloneable');
		const $newItem = $cloneable.clone(true)//withDataAndEvents=true
			.removeClass('cloneable hidden')
			.attr('aria-hidden', false);

		var itemIndex = $ul.find('li:not(.cloneable)').length;
		var newItemID = `${$ul.attr('id')}-${itemIndex}`;
		if (isNaN(dbID) || dbID === null) {
			while ($('#' + newItemID).length) {
				itemIndex++;
				newItemID = `${$ul.attr('id')}-${itemIndex}`;
			}
		} else {
			newItemID = `${$ul.attr('id')}-${dbID}`;
		}
		$newItem.attr('id', newItemID);

		if (parentDBID !== null) $newItem.data('parent-table-id', parentDBID);
		if (dbID !== null) $newItem.attr('data-table-id', dbID);

		const itemTag = (dbID ? dbID + '-' : '') + itemIndex;
		for (const el of $newItem.find('.input-field, .attachment-input')) {
			el.id = `${el.id}-${itemTag}`;
			const $el = $(el);
			if ($el.data('dependent-target')) 
				$el.attr('data-dependent-target', `${$el.data('dependent-target')}-${itemTag}`);
			if (!isNaN(dbID)) $el.attr('data-table-id', dbID);
		}

		for (const el of $newItem.find('label.generic-button')) {
			const $el = $(el);
			if ($el.prop('for')) {
				$el.prop('for', `${$el.prop('for')}-${itemTag}`);
			}
		}

		return $newItem.addClass(newItemClass).insertBefore($cloneable);

	}


	/* Add a card to an accordion by cloning a .cloneable template card */
	addNewCard($accordion, {cardIndex=null, accordionName=null, cardLinkText='', updateIDs={}, show=true, newCardClass=''}={}) {
		
		$accordion = $($accordion);// In case selector string was given

		const $dummyCard = $accordion.find('.card.cloneable');
		if ($dummyCard.length === 0) {
			console.log('No dummy card found');
			return;
		}

		// Close any open cards
		$accordion.find('.card:not(.cloneable) .collapse.show').removeClass('show');

		// Get ID suffix for all children elements. Suffix is the 
		//	<element_identifier>-<section_index>-<card_index>.
		//	This is necessary to distinguish elements from others in 
		//	other cards within the section
		accordionName = accordionName || $accordion.data('table-name');
		if (!cardIndex) {
			var cardIndex = $accordion.find('.card').length - 1;// - 1 because cloneable is 0th
			while ($(`#card-${accordionName}-${cardIndex}`).length) {
				cardIndex++;
			}
		}

		const idSuffix = `${accordionName}-${cardIndex}`;

		const newCardID = `card-${idSuffix}`;
		const $newCard = $dummyCard.clone(true)//withDataAndEvents=true
			.removeClass('cloneable hidden')
			.attr('id', newCardID);
		
		//Set attributes of children
		const $newHeader = $newCard.find('.card-header');
		$newHeader
			.attr('id', `cardHeader-${idSuffix}`)
			.find('.card-link')
				.attr('href', `#collapse-${idSuffix}`)
				.attr('data-target', `#collapse-${idSuffix}`)
				.find('.card-link-label:not(select)')
					.text(cardLinkText || $dummyCard.find('.card-link-label').text());

		const $newCollapse = $newCard.find('.card-collapse')
			.attr('id', `collapse-${idSuffix}`)
			.attr('aria-labelledby', `cardHeader-${idSuffix}`)
			.addClass('validate-field-parent');
		
		// Add to the accordion
		$newCard.addClass(newCardClass).appendTo($accordion).fadeIn();

		for (const el of $newCard.find('.input-field, .attachment-input')) {
			const $el = $(el);
			const newID = `${el.id}-${cardIndex}`;
			const dataTable = $el.data('table-name');
			
			// If this depends on another input AND that input has a .cloneable parent, update the 
			//	dependent target attribute with the card id so the right input will find its dependents
			const $dependentTarget = $($el.attr('data-dependent-target'));
			if ($dependentTarget.length && $dependentTarget.closest('.cloneable').length)
				$el.attr('data-dependent-target', `${$el.attr('data-dependent-target')}-${cardIndex}`);

			$el.removeClass('error')
				.attr('id', newID)
				.siblings('.field-label')
					.attr('for', newID);
			if (dataTable in updateIDs)  $el.attr('data-table-id', updateIDs[dataTable]);
			if ($el.is('select')) {
				const defaultValue = $el.data('default-value');
				if (defaultValue) {
					$el.val(defaultValue);
				} else {	
					$el.val('').addClass('default');
				}
			}
		}

		for (const el of $newCard.find('label.generic-button, .field-label.checkbox-label')) {
			const $el = $(el);
			if ($el.prop('for')) {
				$el.prop('for', `${$el.prop('for')}-${cardIndex}`);
			}			
		}

		// if the accordion's data-table-name attribute is in update IDs, 
		//	add the table-id attribute to the card's data
		const accordionTableName = $accordion.data('table-name');
		if (accordionTableName in updateIDs) $newCard.attr('data-table-id', updateIDs[accordionTableName]);

		// Open the card after a brief delay
		//$newCard.find('.collapse:not(.show)').click();
		if (show) {
			setTimeout(function(){
				$newCard.find('.collapse:not(.show, .row-details-card-collapse)').siblings('.card-header').find('.card-link').click();
			}, 500);
		}
		return $newCard;
	}


	/*
	Helper function to set the label on a card
	*/
	setCardLabel($card, names, {defaultText='', joinCharacter=' '}) {
		var labelComponents = {};
		var labelText = '';
		const template = $card.data('label-template');
		const $cardLabel = $card.find('.card-link-label');
		if (template) {
			labelText = template;
			for (const field in names) {
				labelText = labelText.replace(field, names[field]);
			}
		} else {
			$card.find('.input-field.card-label-field').each((i, el) => {
				const $el = $(el);
				const thisValue = $el.is('select') && ($el.val() || '').trim() != '' ? 
					$el.find(`option[value="${$el.val()}"]`).html() : 
					$el.val();
				if (!thisValue && thisValue !== '') {
					console.log($el.attr('id'))
				}
				const thisName = $el.attr('name');
				if (names.includes(thisName) && (thisValue || '').length && thisValue != ' ') {
					// If the 
					let index = $el.data('card-label-index');
					index = index == undefined ? names.indexOf(thisName) : index;
					// Make sure a component isn't overwritten if the card-label-index 
					//	property is inconsistently set
					while (Object.keys(labelComponents).includes(index)) { 
						index ++;
					}
					labelComponents[index] = thisValue;
				}
			})

			// Sort the indices in case the card-label-index properties were set and 
			//	don't match the natural order of the card-label-component elements
			var sortedComponents = [];
			Object.keys(labelComponents).sort().forEach((k, i) => {
			    sortedComponents[i] = labelComponents[k];
			});

			// If the data-label-sep attribute is defined, use that. Otherwise, use the default
			const cardHeaderSeparator = $cardLabel.data('label-sep');
			joinCharacter = cardHeaderSeparator != undefined ? cardHeaderSeparator : joinCharacter;

			const indexText = $cardLabel.is('.label-with-index') ? //if true, add the index to the label
				`${$card.index()} - ` : '';//`${parseInt($card.attr('id').match(/\d+$/)) + 1} - ` : ''
			joinedText = indexText + sortedComponents.join(joinCharacter);

			if (sortedComponents.length === names.length) {
				labelText = joinedText;
			} else if ($cardLabel.text() !== defaultText) {
				labelText = defaultText;
			}
		}

		$cardLabel.fadeOut(250).fadeIn(250).delay(300).text(labelText);
	}


	/*
	Handler for when a .card-label-field changes -> updates the card header text
	*/
	onCardLabelFieldChange($field) {

		const $card = $field.closest('.card');
		if ($card.is('.cloneable')) return;

		var names = {};
		if ($card.data('label-template')) {
			for (const el of $card.find('.card-label-field')) {
				if (el.value == null || el.value === '') return;
				names[el.name] = el.value;
			}
		} else {
			names = [];
			for (const el of  $card.find('.card-label-field')) {
				if (el.value == null || el.value === '') return;
				names.push(el.value);
			}
		}
		//const defaultText = $card.closest('.accordion').find('.card.cloneable.hidden .card-link-label').text();
		const defaultText = $card.find('.card-link-label').text();


		this.setCardLabel($card, names, defaultText);
	}

	/*
	Recursively hide/show input fields whose visibility should depend on the value of a select
	*/
	toggleDependentFields = function($select) {

		const selectID = '#' + $select.attr('id');

		// Get all the elements with a data-dependent-target 
		const $dependentElements = $(`
				.collapse.field-container .input-field[data-dependent-target="{target}"], 
				.collapse.field-container-row .input-field[data-dependent-target="{target}"],
				.collapse.accordion[data-dependent-target="{target}"], 
				.collapse.add-item-container .add-item-button[data-dependent-target="{target}"]
			`.replace(/\{target\}/g, selectID));
		//const dependentIDs = $select.data('dependent-target');
		//var dependentValues = $select.data('dependent-value');
		for (const el of $dependentElements) {
			const $thisField = $(el);
			var dependentValues = $thisField.data('dependent-value').toString();
			if (dependentValues) {
				var $thisContainer = $thisField.closest('.collapse.field-container, .collapse.field-container-row, .collapse.accordion, .collapse.add-item-container');
				
				// If there's a ! at the beginning, 
				const notEqualTo = dependentValues.startsWith('!');
				dependentValues = dependentValues
					.toString()
					.replace('!', '')
					.split('|').map((s) => {return s.trim()});
				
				var selectVal = $select.is('.input-checkbox') ? $select.prop('checked').toString() : // checkbox
					$select.is('select') && $select.prop('multiple') ? $select.val() || [] : // select with multiple values
					($select.val() || '').toString().trim(); // select with single value

				var show = dependentValues.some(v => Array.isArray(selectVal) ? selectVal.includes(v) : selectVal == v) || 
					(dependentValues[0] === '<blank>' && selectVal == '');
				if (notEqualTo) show = !show;

				$thisContainer.collapse(show ? 'show' : 'hide');
				if (show && $thisField.is('select, .input-checkbox')) this.toggleDependentFields($thisField);
			}
		}
		setTimeout(10);
	}


	/*
	When the user changes the a date .input-field, make sure the date is from the current year.
	If entering the date via keyboard, people often want to enter a 2-digit year, which results 
	in a date from the first century AD. Also make sure that dates aren't for more than a year 
	into the future. Only date fields with the associated utility class will trigger a warning
	*/
	onDateFieldChange(e) {
		// only do stuff if the user triggered the change directly, not via .change()
		if (!e.originalEvent) return;

		const $input = $(e.target);
		const isoDateString = $input.val();
		// Only check the value if it's not a null string
		if (!isoDateString) return;
		
		// javascript can't handle years between 0-100 AD correctly
		var [year, month, day] = isoDateString.split('-'); // get year parts
		year = parseInt(year);
		const date = new Date(year, month - 1, day); // create a date
		date.setFullYear(year); // set the year directly

		const now = new Date();

		const prettyDateString = date.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
		var message = `You entered the date ${prettyDateString} for the year <strong>${year}</strong>.`;
		if ($input.is('.warn-future-year-date') && (now.getFullYear() + 1) < year) {
			message += ' Make sure this is the correct date before saving your edits.';
			this.showModal(message, 'WARNING: Date Entered for the Year ' + year);
		} else if ($input.is('.warn-previous-year-date') && year < now.getFullYear()) {
			message += ' If entering a date using the keyboard, <strong>you must enter the full 4-digit year</strong>.';
			this.showModal(message, 'WARNING: Date Entered for Previous Year');
		}
		
	}


	/*
	Generic event handler for selects
	*/
	onSelectChange(e) {
		// Set style depending on whether the default option is selected
		const $select = $(e.target);

		const value = $select.val();
		if (value == null || value == '') {
			$select.addClass('default');
		} else {
			$select.removeClass('default error');

			// if the user selected an actual option, remove the empty default option
			if (!$select.is('.keep-default-option')) {
				$select.find('option[value=""]').remove();
			}
		
		}

		// If there are any dependent fields that should be shown/hidden, 
		//	toggle its visibility as necessary
		this.toggleDependentFields($select);
	}


	/*
	Generic event handler for input checkboxes
	*/
	onCheckboxChange(e) {
		this.toggleDependentFields($(e.target));
	}


	/* 
	Helper method to toggle the required property on an input field
	*/
	toggleRequiredOnInput($input, isRequired) {
		$input = $($input);
		$input.prop('required', isRequired);
		$input.siblings('.required-indicator').ariaHide(!isRequired);
	}


	resetOpenURLListener() {
		// Check if this expedition is already open
		this.stopListeningForOpenURL(this.currentURL);
		this.startListeningForOpenURL();
	}

	/*
	Helper method to reset a URL to its base url (without search or hash)
	*/
	resetURL() {
		const url = new URL(window.location.origin + window.location.pathname);
		window.history.replaceState({}, '', url);

		this.resetOpenURLListener();
	}


	/*
	Helper function to reset the values/classes of all inputs within a given parent to their defaults
	*/
	clearInputFields({
		parent='body', 
		triggerChange=true, 
		removeAccordionCards=false,
		excludeClass='.ignore-on-clear'
	}={}) {
		
		const $parent = $(parent);

		// if removing cards, do that first since that might remove 
		if (removeAccordionCards) {
			$parent.find('.accordion .card:not(.cloneable)').remove();
		}

		for (const el of $parent.find(`.input-field:not(${excludeClass})`)) {
			const $el = $(el);

			// Skip any input-fields with a cloneable parent can't filter these out in .find() 
			//	because inputs that are the descendants of .cloneables aren't the **immediate** 
			//	descendants of .cloneables so there's always a non-.clineable parent in 
			//	between the .cloneable and the input. Those inputs, therefore, don't get filtered out
			if ($el.closest('.cloneable').length) continue;

			const defaultValue = $el.data('default-value')
			if ($el.is('.input-checkbox')) {
				$el.prop('checked', defaultValue || false); 
			} else if ($el.is('select')) {
				// add the default option back in
				const placeholderText = $el.attr('placeholder')
				if (placeholderText && !$el.find('option[value=""]').length) {
					$(`<option value="">${placeholderText}</option>`)
						.insertBefore(
							$el.find('option:first-child')
						);
				}
				el.value = defaultValue || '';
				$el.toggleClass('default', !defaultValue);
					//.change();
			} else {
				el.value = defaultValue || null;
			}

			$el.removeData('table-id')
				// call this too because removeData() only removes things that 
				//	were set via .data(), not attr('data-*'): 
				//	https://api.jquery.com/removeData/
				.removeAttr('data-table-id'); 

			if (triggerChange) $el.change();
		}
	}


	validateFields($parent, {focusOnField=true}={}) {
		const $invalidFields = $parent
			.find('.input-field:required')
			.not('.hidden')
			.each((_, el) => {
				const $el = $(el);
				const $hiddenParent = $el.parents('.collapse:not(.show, .card-collapse), .card.cloneable, .hidden');
				$el.toggleClass('error', !($el.is('.climberdb-select2') ? $el.val().length : $el.val()) && $hiddenParent.length === 0)
			})
			.filter('.error');

		if ($invalidFields.length) {
			// If any are descendents of a card in an accordion, open the card
			$invalidFields.parents('.card-collapse:not(.show)')
				.siblings('.card-header')
				.find('.card-link')
					.click();

			if (focusOnField) {	
				const $firstError = $invalidFields.first().focus();

				const parentTabID = $invalidFields.closest('.tab-pane').attr('id');
				// If the field is contained within a tab, open that tab
				if (parentTabID) {
					$(`.nav-tabs .nav-link[href="#${parentTabID}"]`).click();
				}
				// If it's in a card, open it
				$firstError.closest('.card').collapse('show');

				
			}
			return false;
		} else {
			return true;
		}
	}

	/*
	Use the current-value data property to reset an input's value
	*/
	resetRevertableField($input, {triggerChange=true}={}) {
		const previousValue = $input.data('current-value');
		if ($input.is('[type=checkbox]')) {
			$input.prop('checked', previousValue === 'true')
		} else if ($input.is('select')) {
			if (previousValue) {
				$input.val(previousValue)
			}
		} else {
			$input.val(previousValue)
		}
		if (triggerChange) $input.change();
	}


	getDBContactMessage() {
		return ' Make sure you\'re still connected to the NPS network and try again.' +
			` <a href="mailto:${this.config.db_admin_email}">Contact your database` +
			' adminstrator</a> if the problem persists.';
	}


	pythonReturnedError(resultString, {errorExplanation=''}={}) {
		resultString = String(resultString); // force as string in case it's something else
		if (resultString.startsWith('ERROR: Internal Server Error')) {
			// almost all Python excetions have a class anme in the form *Error (e.g., ValueError).
			//	That's not a hard and fast rule, however, and so if the match is null, return something generic
			const pythonException = (resultString.match(/[A-Z]+[a-zA-Z]*Error: .*/) || ['unknown custom exception thrown']
			)[0].trim();
			
			const dbContact = this.getDBContactMessage();
			// Show the 
			if (errorExplanation !== '') {
				const messageBody = `
					${errorExplanation}${dbContact} 
					<div class="w-100 d-flex justify-content-between">
						<button 
							role="button"
							class="text-only-button pl-0" 
							type="button" 
							data-toggle="collapse" data-target=".modal-error-details-target" aria-expanded="false" aria-controls="modal-error-details-collapse"
						>
							Error details
						</button>
						<button 
							role="button"
							class="text-only-button modal-error-details-target copy-error-text-button collapse"
							data-toggle="tooltip"
							data-placement="bottom"
						>
							Copy error text
						</button>
					</div>
					<p id="modal-error-details-collapse" class="collapse modal-error-details-target modal-error-text-container pt-3">
						${resultString}
					</p>`;
				this.showModal(messageBody, 'Unexpected Error');
			}

			return pythonException;
		} else {
			return false;
		}
	}


	onCopyErrorButtonClick(e) {
		const $button = $(e.target).closest('button');
		const error = $button
			.closest('.modal-body')
			.find('.modal-error-text-container')
			.text();
		this.copyToClipboard(error, {triggeringElement: $button, tooltipContainer: '#alert-modal'})
	}


	/*
	Parse URL query string into a dictionary
	*/
	parseURLQueryString(queryString=window.location.search) {
		if (queryString.length) {
			return Object.fromEntries(
				decodeURIComponent(queryString.slice(1))
					.split('&')
					.map(s => {
						const match = s.match(/=/)
						if (!match) {
							// Even if there's no value, .fromEntries() needs [key, value]
							//	so just set the value equal to true
							return [s, true];
						} else {
							// Need to return [key, value]
							return [
								s.slice(0, match.index), 
								s.slice(match.index + 1, s.length) //+1 to skip the = separator
							];
						}
					}
				)
			);
		} else {
			// no search string so return an empty object
			return {};
		}
	}

	/*
	Copy specified text to the clipboard
	*/
	copyToClipboard(text, {modalMessage='', triggeringElement=null, tooltipContainer='body'}={}) {
		const clipboard = navigator.clipboard;
		if (!clipboard) {
			this.showModal(`Your browser refused access to the clipboard. This feature only works with a HTTPS connection. Right-click and copy from <a href="${text}">this link</a> instead.`, 'Clipboard access denied');
			return;
		}
		const $trigger = $(triggeringElement);
		clipboard
			.writeText(text)
			.then(() => {
				if (modalMessage) {
					this.showModal(modalMessage || `Successfully copied ${text} to clipboard`, 'Copy successful');
				} 
				// check if 'tooltip' is in the triggering element's data-toggle 
				//	(if the attribute is defined)
				else if (($trigger.data('toggle') || '').match('tooltip')) {
					// Show it
					$trigger.tooltip({
						title: 'Copied!',
						container: tooltipContainer,
						trigger: 'focus'
					}).tooltip('show');
					// Then remove it after a set amount of time
					setTimeout(() => {$trigger.tooltip('dispose')}, 2000);

				}
			})
			.catch((err) => {
				console.error(`Error copying text to clipboard: ${err}`);
			});
	}


	/*
	Helper method to get the current max tab index
	*/
	getNextTabIndex() {
		return Math.max(...$('*').map((_, el) => el.tabIndex)) + 1;
	}

	/*
	Animate counting of an element with numeric text
	*/
	animateCountUp(el, nFrames, frameDuration, easeFunction=(t) => t, maxVal=null) {

		let frame = 0;
		const countTo = maxVal || parseInt(el.innerHTML, 10);
		// Start the animation running 60 times per second
		const counter = setInterval( () => {
			frame++;
			// Calculate our progress as a value between 0 and 1
			// Pass that value to our easing function to get our
			// progress on a curve
			const progress = easeFunction(frame / nFrames);
			// Use the progress value to calculate the current count
			const currentCount = Math.round(countTo * progress);

			// If the current count has changed, update the element
			if (parseInt(el.innerHTML, 10) !== currentCount) {
				el.innerHTML = currentCount;
			}

			// If we’ve reached our last frame, stop the animation
			if (frame === nFrames) {
				clearInterval(counter);
			}
		}, frameDuration );
	}

	/*
	Run the animation on all elements with a class of ‘countup’
	*/
	runCountUpAnimations(animationDuration=500, framesPerSecond=60, easeFunction=(t) => t * ( 2 - t )) {
		/*
		From: https://jshakespeare.com/simple-count-up-number-animation-javascript-react/
		animationDuration: How long you want the animation to take, in ms
		framesPerSecond: number of times the number will change per second
		easeFunction: 
		*/

		// Calculate how long each ‘frame’ should last if we want to update the animation 60 times per second
		const frameDuration = 1000 / framesPerSecond;
		// Use that to calculate how many frames we need to complete the animation
		const nFrames = Math.round(animationDuration / frameDuration);
		for (const el of $('.count-up')) {
			this.animateCountUp(el, nFrames, frameDuration);
		}
	}

	/*
	Return an array of objects sorted by a given field
	*/
	sortDataArray(data, sortField, {ascending=true}={}) {
		return data.sort( (a, b) => {
			// If the values are integers, make them numeric before comparing because string 
			//	numbers have a different result than actual numbers when comparing values
			const comparandA = a[sortField].toString().match(/^\d+$/, a[sortField]) ? parseInt(a[sortField]) : a[sortField];
			const comparandB = b[sortField].toString().match(/^\d+$/, b[sortField]) ? parseInt(b[sortField]) : b[sortField];
			return ((comparandA > comparandB) - (comparandB > comparandA)) * (ascending ? 1 : -1);
		})
	}

	/*
	Sort an HTML table's rows by a given sort field
	*/
	sortDataTable($table, data, {sortField=null, ascending=true, $rowCounter=$('')}={}) {
		// Clear the table
		const $tableBody = $table.find('tbody');
		$tableBody.find('tr:not(.cloneable)').remove();

		if (sortField) {
			data = this.sortDataArray(data, sortField, {ascending: ascending});
		}

		const cloneableHTML = $tableBody.find('tr.cloneable').prop('outerHTML');
		for (const info of data) {
			let html = cloneableHTML.slice(); // copy string
			for (const fieldName in info) {
				html = html.replaceAll(`{${fieldName}}`, info[fieldName] || '');
			}
			$(html).appendTo($tableBody).removeClass('hidden cloneable');
		}

		if (!$rowCounter.length) {
			$rowCounter = $table.closest('.dashboard-card').find('.dashboard-card-header > .table-row-counter');
		}
		if ($rowCounter.length) {
			$rowCounter.text(data.length);
		}

		return data;
	}


	verifyPassword(clientPassword) {
		return $.ajax({
			url: '/flask/checkPassword',
			method: 'POST',
			dataType: 'JSON',
			data: {client_password: clientPassword, username: this.userInfo.ad_username},
			cache: false
		});
	}


	getTableInfo() {
		return this.queryDB({tables: ['table_info_matview']}).done(response => {
			// the only way this query could fail is if I changed DBMS, 
			//	so I won't bother to check that the result is valid
			var insertOrder = this.tableInfo.insertOrder;
			for (const info of response.data || []) {
				const tableName = info.table_name;
				if (!insertOrder.includes(tableName)) insertOrder.push(tableName);
				if (!(tableName in this.tableInfo.tables)) {
					this.tableInfo.tables[tableName] = {
						foreignColumns: [],
						columns: {}
					};
				}
				const foreignColumnInfo = {
					foreignTable: info.foreign_table_name,
					column: info.column_name
				}
				if (
						info.foreign_table_name && 
						!this.tableInfo.tables[tableName].foreignColumns.map(JSON.stringify).includes(JSON.stringify(foreignColumnInfo))
					) {
					this.tableInfo.tables[tableName].foreignColumns.push(foreignColumnInfo);
				}

				this.tableInfo.tables[tableName].columns[info.column_name] = {...info};

				// If this is an entry metadata field, also save it with the table name prepended to make it distinguishable
				if (this.entryMetaFields.includes(info.column_name)) {
					let metaInfo = deepCopy(info);
					metaInfo.column_name = `${info.table_name}_${info.column_name}`;
					this.tableInfo.tables[tableName].columns[metaInfo.column_name] = {...metaInfo};
				}
			}
		})
	}

	/*
	Helper method to set the value of an input field. The 'name' attribute needs to 
	correspond to a key in the values object. 
	@parameter:
	*/
	setInputFieldValue(el, values, {dbID=null, triggerChange=false, elementData=null}={}) {
		el.value = null; // clear value regardless
		
		const $el = $(el);

		// If this is a child of a cloneable card, skip it
		if ($el.closest('.card.cloneable').length || !values) return [$(null), null, null];

		// If this is being called to roll back edits, the table-id should already be filled
		if (dbID === null) dbID = $el.data('table-id');

		const isSelect = $el.is('select');
		const isCheckbox = $el.is('.input-checkbox');
		const fieldName = el.name.replace(/-\d+$/g, '');
		const value = values[fieldName];
		const valueIsNull = isNull(value);
		if (fieldName in values) {
			if (isCheckbox) {
				$el.prop('checked', value);
			} else {
				
				if (isSelect) {
					$el.val(valueIsNull ? '' : value); //if the db record isn't filled in, set it to the default
					$el.toggleClass('default', valueIsNull || value == '');
				} else if ($el.is('[type=date]') && !valueIsNull) {
					$el.val(getFormattedTimestamp(new Date(value)));
				} else {
					$el.val(value);
				}
			}
		} else if (isSelect) {
			$el.addClass('default')
		}

		$el.attr('data-table-id', dbID);

		if (elementData !== null) {
			for (const property in elementData) {
				$el.data(property, elementData[property]);
			}
		}

		if (triggerChange) {
			$el.change();
		} else if (isSelect || isCheckbox) {
			this.toggleDependentFields($el);
		}

		return [$el, fieldName, value];
	}

	
	/*
	Helper method to get the value of in input depedning on whether or not its a checkbox
	*/
	getInputFieldValue($input) {
		const val = $input.val();
		const returnValue = 
			// if it's a checkbox, return the 'checked' property, which is a boolean
			$input.is('.input-checkbox') ? $input.prop('checked') : 
			
			// if it's a datetime type and the value is null, return null because 
			//	sending '' to the server throws an error when saving
			$input.is('[type=date], [type=datetime-local], [type=time], select') && val === '' ? null : 
			
			// otherwise, just return the value
			val;
		
		return returnValue;
	}
	

	/*
	Helper function to revert an input field back to a previous value. The input needs to 
	have the current-value data attribute set. This works best if it's set when the input 
	receives focus so that the value is always set before .change() event is triggered, 
	which might call this function
	*/
	revertInputValue($input, {removeDirty=false, triggerChange=false}={}) {
		$input = $($input);
		const oldValue = $input.data('current-value');
		// reset to old value
		$input.val(oldValue);

		if (removeDirty) $input.removeClass('dirty');
		if (triggerChange) $input.change();
		
		return $input;
	}

	/*
	Helper methods to generate SQL statement for querying climber_info_view
	*/
	getCoreClimberSQL({searchString='', queryFields='*', whereClause=''} = {}) {
		if (queryFields !== '*') {
			if (!queryFields.includes('id')) queryFields = queryFields + ', id';
			if (!queryFields.includes('first_name')) queryFields = queryFields + ', first_name';
			if (!queryFields.includes('first_name')) queryFields = queryFields + ', middle_name';
			if (!queryFields.includes('last_name')) queryFields = queryFields + ', last_name';
			if (!queryFields.includes('full_name')) queryFields = queryFields + ', full_name';
		}
		searchString = searchString.replace(/\W/g, '')
		return  searchString.length > 0 ? 
			`	
				SELECT
					*	
				FROM 
					( 
						SELECT 
							id, 
							min(sort_order) AS first_sort_order
						FROM 
							(
								WITH climber_names AS (
									SELECT 
										regexp_replace(first_name, '\\W', '', 'g') AS re_first_name, 
										regexp_replace(middle_name, '\\W', '', 'g') AS re_middle_name, 
										regexp_replace(last_name, '\\W', '', 'g') AS re_last_name,
										regexp_replace(full_name, '\\W', '', 'g') AS re_full_name,
										${queryFields}
									FROM ${this.dbSchema}.climber_info_view
								)
								SELECT ${queryFields}, 1 AS sort_order FROM climber_names WHERE 
									re_first_name ILIKE '${searchString}%' 
								UNION ALL 
								SELECT ${queryFields}, 2 AS sort_order FROM climber_names WHERE 
									re_first_name || re_middle_name ILIKE '${searchString}%' AND
									re_first_name NOT ILIKE '${searchString}%'
								UNION ALL 
								SELECT ${queryFields}, 3 AS sort_order FROM climber_names WHERE 
									re_first_name || re_last_name ILIKE '${searchString}%' AND
									(
										re_first_name NOT ILIKE '${searchString}%' OR
										re_first_name || re_middle_name NOT ILIKE '${searchString}%'
									)
								UNION ALL
								SELECT ${queryFields}, 4 AS sort_order FROM climber_names WHERE 
									re_last_name ILIKE '${searchString}%' AND
									(
										re_first_name NOT ILIKE '${searchString}%' OR
										re_first_name || re_middle_name NOT ILIKE '${searchString}%' OR
										re_first_name || re_last_name NOT ILIKE '${searchString}%'
									)
								UNION ALL 
								SELECT ${queryFields}, 5 AS sort_order FROM climber_names WHERE 
									re_middle_name || re_last_name ILIKE '${searchString}%' AND 
									re_middle_name IS NOT NULL AND 
									(
										re_first_name NOT ILIKE '${searchString}%' OR
										re_first_name || re_middle_name NOT ILIKE '${searchString}%' OR
										re_first_name || re_last_name NOT ILIKE '${searchString}%' OR 
										re_last_name NOT ILIKE '${searchString}%'
									)
								UNION ALL
								SELECT ${queryFields}, 6 AS sort_order FROM climber_names WHERE 
									similarity(re_full_name, '${searchString}%') > 0.5 AND 
									(
										re_first_name NOT ILIKE '${searchString}%' OR
										re_first_name || re_middle_name NOT ILIKE '${searchString}%' OR
										re_first_name || re_last_name NOT ILIKE '${searchString}%' OR 
										re_last_name NOT ILIKE '${searchString}%' OR
										re_middle_name || re_last_name NOT ILIKE '${searchString}%'
									)
							) t 
						GROUP BY full_name, id
					) gb 
				JOIN ${this.dbSchema}.climber_info_view ON gb.id = climber_info_view.id 
				${whereClause}
				ORDER BY first_sort_order::text || full_name
			` :
			`
				SELECT 
					* 
				FROM ${this.dbSchema}.climber_info_view 
				${whereClause}
			`
			;
	}

	getClimberQuerySQL({searchString='', minIndex=1, climberID=undefined, queryFields='*', coreWhereClause=''} = {}) {
		
		const coreQuery = this.getCoreClimberSQL({searchString: searchString, queryFields: queryFields, whereClause: coreWhereClause});
		var maxIndex = minIndex + this.recordsPerSet - 1;
		const whereClause = isNaN(maxIndex) ? 
			'' : 
			isNaN(climberID) ? 
				`WHERE row_number BETWEEN ${minIndex} AND ${maxIndex}` : 
				`WHERE id=${parseInt(climberID)}`
		;

		const sql = 
			`SELECT * FROM (
				SELECT 
					row_number() over(), 
					* 
				FROM (
					${coreQuery}
				) t1 
			) t2
			${whereClause} 
			ORDER BY row_number
			;`
		;

		return [sql, coreQuery];
	}


	/*
	For fuzzy search bar/select combos for searching and selecting a climber, this helper 
	function takes the user input searchString and fills the .climber-select element with 
	the resulting options. This pattern is used in both the expeditions page for the 'Add
	Member' modal and on the climbers page for merging climber profiles. The $searchContainer
	is the wrapper containing all search/select elements
	*/
	fillClimberFuzzySearchSelectOptions(searchString, $searchContainer, {excludeID=null}={}) {
		// Show the select bar
		$searchContainer.find('.climber-select')
			.closest('.collapse')
				.collapse('show');
		const $loadingIndicator = $searchContainer.find('.climber-search-option-loading-indicator')
			.ariaHide(false);
		const $climberCount = $('.climber-search-result-count').text('')
			.ariaHide(true);

		return $.post({
			url: '/flask/db/select/climbers',
			data: JSON.stringify({
				search_string: searchString,
				is_guide: $searchContainer.find('.7-day-only-filter').prop('checked'),
				is_7_day: $searchContainer.find('.guide-only-filter').prop('checked'),
				queryTime: (new Date()).getTime()
			}),
			contentType: 'application/json'
		}).done(response => {
			if (this.pythonReturnedError(response)) {
				print(response);
				return;
			} else {
				var result = response.data || [];
				// Check if this result is older than the currently displayed result. This can happen if the user is 
				//	typing quickly and an older result happens to get returned after a newer result. If so, exit 
				//	since we don't want the older result to overwrite the newer one
				const queryTime = result.queryTime;
				if (queryTime < this.climberForm.lastSearchQuery) {
					return;
				} else {
					this.climberForm.lastSearchQuery = queryTime;
				}
				const $select = $searchContainer.find('.climber-select').empty();
				var resultCount = result.length;
				if (resultCount === 0) {
					$select.append('<option value="">No climbers match your search</option>')

					// Because results are asynchonous, make sure result count is hidden
					$climberCount.text('')
						.ariaHide(true);
				} else {
					// Still show placeholder option because a climber should not be selected automatically
					$select.append('<option value="">Select climber to view</option>')
					for (const row of result) {
						if (row.id == excludeID) {
							resultCount --;
							continue;
						}
						$select.append(`<option value="${row.id}">${row.full_name}</option>`);
					}
					// Because the result is retrieved asynchonously and when a user types no search is done, 
					//	
					if ($searchContainer.find('.climber-search-select-filter').val().length >= 3 || $guideOnlyCheckbox.prop('checked')) {
						$climberCount.text(
								`${resultCount} climber${resultCount > 1 ? 's' : ''} found`
							)
							.ariaHide(false);
					}
				}
			}
		})
		.fail((xhr, status, error) => {
			console.log('fillFuzzySearchSelectOptions query failed: ' + sql);
		})
		.always(() => {$loadingIndicator.ariaHide(true)});
	}


	/*
	Generic event handler for keyup events on the fuzzy search bar of a fuzzy search/select
	combination. This pattern is used in both the expeditions page for the 'Add
	Member' modal and on the climbers page for merging climber profiles.
	*/
	onFuzzySearchSelectKeyup($searchContainer, {excludeID=null}={}) {
		const $input = $searchContainer.find('.climber-search-select-filter');
		const searchString = $input.val();
		// If a search string was entered or the guide filter was checked, search
		if (searchString.length >= 3 || $searchContainer.find('.guide-only-filter').prop('checked')) { 
			return this.fillClimberFuzzySearchSelectOptions(searchString, $searchContainer, {excludeID: excludeID});
		} 
		// Otherwise, hide the select
		else {
			$searchContainer.find('.climber-select')
				.empty()
				.closest('.collapse')
				.collapse('hide');
			$('.climber-search-result-count').text('');
			$input.focus();
		}
	}


	/*
	Most modern browsers don't allow you to customize this event handler so the code inside 
	it is basically irrelevant. To trigger the canned alert only at the appropriate times, 
	the event listener needs to be registered or deregistered appropriately
	*/
	beforeUnloadEventHandler(e) {
		
		e.preventDefault();
		const message = 'You have unsaved edits. Are you sure you want to leave this page?';
		e.returnValue = message;
	}


	/*
	Since modern browsers don't allow you to customize the beforeunload alert message,
	the event listener needs to be turned on and off as appropriate. This method
	isn't explicitly used in this base class, but each subclass can call it if necessary
	*/	
	toggleBeforeUnload(shouldTurnOn=false) {

		// To ensure only one beforeunload event is registered, store the event 
		//	as a class property
		if (!this._beforeUnloadHandler) {
			this._beforeUnloadHandler = (e) => this.beforeUnloadEventHandler(e);
		}

		// register/de-register the stored handler
		if (shouldTurnOn) {
			window.addEventListener('beforeunload', this._beforeUnloadHandler);
		} else {
			window.removeEventListener('beforeunload', this._beforeUnloadHandler);
		}
	}


	/*
	Prevent multiple tabs with the same URL from opening by sending message on a channel with 
	the page URL as the title. The URL includes the search string so the URL has to be the exact same
	*/
	startListeningForOpenURL() {
		const url = window.location.href;

		// If this is a fresh window, assign an ID
		const tabID = window.name || Math.random().toString(36).substr(2, 10);
		window.name = tabID;

		const openQuery = `is ${url} open?`,
			  openResponse = `${url} is open`;

		// Keep a reference to each url channel this tab is listening to. This is to 
		//	prevent creating multiple channels that each emit and receive responses for 
		//	the same message
		let channel = this.urlChannels[url];
		this.currentURL = url;

		if (!channel) {
			channel = new BroadcastChannel(url);
			this.urlChannels[url] = channel;
			
			channel.onmessage = e => {
				const eventData = e.data;
				// If another tab is asking if this page is already open, send back a message saying that it is
				if (eventData.message === openQuery) { 
					// We already have the page open so tell the other tab that it is
					channel.postMessage({message: openResponse, url: url, tabID: tabID})
				} 
				// If another tab is responding, telling us the page is already open, warn the user
				else if (
						eventData.message === openResponse && 
						eventData.url === url && 
						eventData.tabID !== tabID
					) {

					const pathName = window.location.pathname.replace(/\//g, '')
					const pageObjectName = 
						!this.parseURLQueryString().id ? 'Page' : 
						pathName === 'expeditions.html' ? 'Expedition' : 
						pathName === 'climbers.html' ? 'Climber' :
						pathName === 'briefings.html' ? 'Briefing' :
						'Page';
					const lowerCaseName = pageObjectName.toLowerCase();
					//window.open('', e.data.tabID).focus(); // this doesn't work -- just opens a new blank tab
					const message = `You already have this ${lowerCaseName} open in another browser tab/window.` + 
						` You can have the same ${lowerCaseName} open multiple times simultaneously, but changes` + 
						' you make will not be automatically synchronized. You must reload a' + 
						' tab/window to see changes you make in another browser tab/window.';
					this.showModal(message, `${pageObjectName} Already Open`);
				}
			}
		}

		// Post a message asking if the page is open elsewhere
		channel.postMessage({message: openQuery});
	}

	/*
	Stop listening to the given URL for duplicate tabs
	*/
	stopListeningForOpenURL(url) {
		url = url || this.currentURL;
		this.urlChannels[url].close();
		delete this.urlChannels[url];
	}


	/* Return any Deferreds so anything that has to happen after these are done can wait */
	init({addMenu=true}={}) {

		this.loginInfo = $.parseJSON(window.localStorage.getItem('login') || '{}');

		const envDeferred = $.get('/flask/environment')
			.done(response => {
				if (!this.pythonReturnedError(response)) {
					this.environment = response;
					this.dbSchema = response === 'dev' ? response : 'public';
				}
			})

		if (addMenu) {
			this.configureMenu();
		}

		if (this.duplicatePageNotifications.includes(window.location.pathname)) {
			// Only check if the page is open if this is NOT the index page
			this.urlChannel = this.startListeningForOpenURL();
		}

		// Bind events on dynamically (but not yet extant) elements
		$(document).on('change', 'select.input-field', e => {
			//const $select = $(e.target);
			//$select.toggleClass('default', $select.val() == null);
			this.onSelectChange(e);
		});		
		$(document).on('change', '.input-checkbox', e => {
			//const $select = $(e.target);
			//$select.toggleClass('default', $select.val() == null);
			this.onCheckboxChange(e);
		});

		// check for valid date when date field loses focus
		$(document).on('blur', '.input-field[type=date]', e => {
			if ($(e.target).closest('.cloneable').length) return;
			this.onDateFieldChange(e);
		});

		$(document).on('click', '#alert-modal .copy-error-text-button', e => {
			this.onCopyErrorButtonClick(e);
		})
		
		// Warn the user before they leave the page if they have unsaved edits
		//$(window).on('beforeunload', (e) => {return this.beforeUnloadEventHandler(e)});

		// Show the right sidebar nav item as selected
		$('.sidebar-nav-group > .nav-item.selected').removeClass('selected');
		$('.sidebar-nav-group .nav-item > a')
			.filter((_, el) => el.href.endsWith(window.location.pathname.split('/').pop()))
			.parent()
				.addClass('selected');
		
		const userDeferred = this.getUserInfo()
		//const finalDeferred = $.when(envDeferred, userDeferred)
		return $.when(envDeferred, userDeferred)
			.then((_, [userInfoResult, userInfoStatus, userInfoXHR]) => {
				const username = userInfoResult.ad_username;
				if (addMenu && username !== 'test') {
					if (this.loginInfo.username !== username || this.loginInfo.expiration < new Date().getTime()) {
						$('#climberdb-main-content').empty();
						hideLoadingIndicator();
						const onConfirmClickHandler = () => {
							$('#alert-modal .modal-button').click(() => {
								window.location.href = `index.html?referer=${encodeURI(window.location.href)}`
							})
						}
						const footerButtons = `<button class="generic-button modal-button close-modal" data-dismiss="modal">OK</button>`;
						this.showModal(
							'Your session has expired. Click OK to log in again.', 
							'Session Expired', 
							{	
								footerButtons: footerButtons,
								eventHandlerCallable: onConfirmClickHandler,
								dismissable: false
							}
						);
					}
				}
				if (window.location.pathname !== '/index.html' && this.userInfo.user_status_code != 2) {
					window.location = 'index.html'
				}
			
				return $.when(this.getTableInfo(), this.loadConfigValues());
			});
	}
};



/*jQuery extensions*/
(function( $ ) {
 	// helper method to hide/unhide an element (using the custom utility class, .hidden) AND set the ARIA-hidden attribute appropriately
	$.fn.ariaHide = function(isHiding=true) {
		return this.toggleClass('hidden', isHiding)
			.attr('aria-hidden', isHiding);
	}	
	// Toggle opacity: 0 with .transparent class rather than display: none as with the .hidden
	$.fn.ariaTransparent = function(isHiding=true) {
		return this.toggleClass('transparent', isHiding)
			.attr('aria-hidden', isHiding);
	}
 	
 	/* 
 	For late binding (i.e., delegated) events added with something like 
 	$(document).on('change', 'selector', (e)=>{...}),
 	add a function to trigger the event manually 
 	*/
 	$.fn.triggerDelegatedEvent = function(eventType, delegate=document) {
 		const e = $.Event(eventType);
 		e.target = this[0];
 		$(delegate).trigger(e);

 		return this;
 	}

 	/*
 	Helper function to remove a DOM element with a fade
 	*/
 	$.fn.fadeRemove = function({fadeTime=500, onRemove=()=>{}}={}) {
 		 return this.fadeOut(fadeTime, () => {
 		 	this.remove();
 		 	onRemove.call();
 		 });
 	}
}( jQuery ));


// Extend Date class to increment by a given number of days
Date.prototype.addDays = function(days) {
	var date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
}
