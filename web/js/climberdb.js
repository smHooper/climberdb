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


function getDefaultModalFooterButtons(modalType) {
	return  modalType === 'confirm' ? 
			'<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">Close</button>' +
			'<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">OK</button>'
		  :
		'<button class="generic-button modal-button close-modal confirm-button" data-dismiss="modal">OK</button>'
		;
}


function showModal(message, title, modalType='alert', footerButtons='', {dismissable=true, eventHandlerCallable=()=>{}}={}) {

	const $modal = $('#alert-modal');

	// If the modal is currently being shown, wait until it's done to show this message
	if ($modal.is('.showing')) {
		$modal.on('hidden.bs.modal', () => {
			const $returnedModal = showModal(message, title, modalType, footerButtons, dismissable);
			if ($returnedModal) $modal.off('hidden.bs.modal');
		})
		return;
	}

	$modal.addClass('showing');

	if (!footerButtons) footerButtons = getDefaultModalFooterButtons(modalType);

	// expired session modal should not be dismissable so only add this if dismissable is false
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
	      	${footerButtons}
	      </div>
	    </div>
	  </div>
	`;
	const options = dismissable ? {} : {backdrop: 'static', keyboard: false};
	$modal.empty()
		.append($(innerHTML))
		.modal(options);
	
	$modal.find('.close-modal').click(() => {$modal.modal('hide')});

	// Remove class that indicates the modal is being shown
	$modal.on('hide.bs.modal', () => {
		$modal.removeClass('showing')
	})

	eventHandlerCallable.call();

	return $modal;
}

// var _$modalSuper = $.fn.modal;
// _$modalSuper.Constructor.prototype.addModal = function (message, title, {modalType='alert', footerButtons='', dismissable=true}={}) {
// 	const $modal = this;
// 	return $modal.on('hidden.bs.modal', () => {
// 		$modal.find('.modal-title').html(title);
// 		$modal.find('.modal-body').html('<p>' + message + '</p>');
// 		$modal.find('.modal-footer').html(footerButtons || getDefaultModalFooterButtons(modalType));
// 	});
// }


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
function toggleCollapseEventHandlers(selector, toggleOn=true) {
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

/* ClimberDB base class*/
class ClimberDB {
	constructor() {
		this.userInfo = {};
		this.tableInfo = {
			tables: {},
			insertOrder: [] // comply with left-right orientation of table relationships
		};
		this.entryMetaFields = ['entry_time', 'entered_by', 'last_modified_time', 'last_modified_by'];
		this.config = {};
		this.loginInfo = {}; //{username: {expires: } }
		this.constants = { // values that aren't configurable but need to be accessible across multiple pages
			millisecondsPerDay: 1000 * 60 * 60 * 24,
			climbingFeeTransactionCodes: [3, 10, 12, 14, 15, 23, 24],
			entranceFeeTransactionCodes: [11, 12, 14, 15, 25, 8, 26]
		}
		this.urlChannels = {}; // for checking if a URL is already open in another tab/window
		this.nonEditingUserRoles = [2]; // for checking if user has edit privs
	}

	getUserInfo() {
		
		const urlParams = this.parseURLQueryString();
		return $.ajax({
			url: 'flask/userInfo',
			method: 'POST',
			data: urlParams.testClientSecret ? {client_secret: urlParams.testClientSecret} : {},
			cache: false
		}).done((resultString) => {
			if (this.queryReturnedError(resultString)) {
				throw 'User role query failed: ' + resultString;
			} else {
				const result = typeof resultString === 'object' ? resultString : $.parseJSON(resultString);
				
				if (!(result.user_status_code && result.user_role_code)) {
					// user isn't authorized 
					const program_admin = this.config.program_admin_email;
					const message = `There is no user account for Windows user <strong>${result.ad_username}</strong>. Contact the program adminstrator at <a href="mailto:${program_admin}">${program_admin}</a> if you have questions.`;
					const footerButtons = '<a class="generic-button" href="index.html">OK</a>';
					showModal(message, 'User Not Authorized', 'alert', footerButtons);
					return;
				}

				this.userInfo = {...result};

				$('#username').text(`Hi, ${this.userInfo.first_name}!`);

				// Set the href attribute of the user account dropdown (if it exists. It won't on pages that are initiated with addMenu: false)
				const $changePasswordButton = $('#change-password-button');
				if ($changePasswordButton.length) $changePasswordButton[0].href = window.encodeURI(
						`${window.location.origin}/index.html?reset=true&id=${this.userInfo.id}&referer=${window.location.href}`
					);
				
				if (this.userInfo.user_role_code >= 3) {
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
		if (this.userInfo.user_role_code < 3) {
			const adminEmail = this.config.program_admin_email;
			const footerButtons = '<a href="dashboard.html" class="generic-button modal-button close-modal confirm-button">OK</a>'
			showModal(`You do not have sufficient permissions to view this page. If you think this is an error, contact the program adminstrator at <a href="mailto:${adminEmail}">${adminEmail}</a>.`, 'Permission Error', 'alert', footerButtons, {dismissable: false})
			deferred.reject();
		} else {
			deferred.resolve();
		}
		return deferred.promise();
	}


	loadConfigValues() {
		this.queryDB('SELECT property, data_type, value FROM config')
			.done(queryResultString => {
				if (this.queryReturnedError(queryResultString)) {
					print('Problem querying config values');
				} else {
					for (const {property, data_type, value, ...rest} of $.parseJSON(queryResultString)) {
						this.config[property] = 
							data_type === 'integer' ? parseInt(value) : 
							data_type === 'float' ? parseFloat(value) : 
							data_type === 'boolean' ? value.toLowerCase().startsWith('t') :
							value; // it's a string
					}
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

			<main id="climberdb-main-content" class="climberdb-main">

				<!-- nav sidebar -->
				<div class="main-container-with-sidebar">
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

					<!--main content -->
					<div class="main-content-wrapper">

					</div> <!--main-content-wrapper-->

				</div> <!--wrapper-->
			</main>
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
				if (events.click) {
					$(target).click();
				}
			}
		})
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
			showModal(message, 'Editing Not Authorized', 'alert', '', {dismissable: false, eventHandlerCallable: eventHandler});
		}

		return allowEditing;
	}

	/*
	Ask user if they really want to log out and warn them that they'll lose unsaved data.
	If they confirm, set the expiration of their login session to now and go to the sign-in page
	*/
	confirmLogout() {
		// Set the expiration for the current user's session to now if they confirm. Then go to the sign-in page
		const onConfirmClick = `
			climberDB.loginInfo.expiration = ${new Date().getTime()};
			window.localStorage.login = JSON.stringify(climberDB.loginInfo);
			window.location.href='index.html';
		`;
		const footerButtons = `
			<button class="generic-button modal-button close-modal" data-dismiss="modal" onclick="${onConfirmClick}">Yes</button>
			<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">No</button>';
		`;
		showModal('Are you sure you want to log out? Any unsaved data will be lost', 'Log out?', 'confirm', footerButtons);
	}


	queryDB(sql, {returnTimestamp=false}={}) {
		var requestData = {action: 'query', queryString: sql, db: 'climberdb'};
		if (returnTimestamp) requestData.queryTime = (new Date()).getTime();
		return $.post({
			url: 'climberdb.php',
			data: requestData,
			cache: false
		});
	}	


	/*
	*/
	fillSelectOptions(selectElementID, queryString, optionClassName='') {
		let deferred = this.queryDB(queryString);
		deferred.done(queryResultString => {
				
				queryResultString = queryResultString.trim();

				var queryResult;
				try {
					queryResult = $.parseJSON(queryResultString);
				} catch {
					//console.log(`error filling in ${selectElementID}: ${queryResultString}`);
				}
				if (queryResult) {
					const $el = $('#' + selectElementID);
					for (const row of queryResult) {
						$el.append(
							`<option class="${optionClassName}" value="${row.value}">${row.name}</option>`
						);
					}
					const defaultValue = $el.data('default-value');
					if (defaultValue !== undefined) $el.val(defaultValue);
				} else {
					console.log(`error filling in ${selectElementID}: ${queryResultString}`);
				}
			})
		.fail((xhr, status, error) => {
				console.log(`fill select failed with status ${status} because ${error} from query:\n${queryString}`)
			}
		);

		return deferred;
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
				return this.fillSelectOptions(id, `SELECT code AS value, name FROM ${lookupTableName} ${$el.is('.include-disabled-options') ? '' : 'WHERE sort_order IS NOT NULL'} ORDER BY sort_order`);
				
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


	addNewListItem($ul, {dbID=null, parentDBID=null, newItemClass=''}={}) {

		const $cloneable = $ul.find('li.cloneable');
		const $newItem = $cloneable.clone(true)//withDataAndEvents=true
			.removeClass('cloneable hidden')

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
		if (dbID !== null) $newItem.data('table-id', dbID);

		for (const el of $newItem.find('.input-field')) {
			el.id = `${el.id}-${dbID || itemIndex}`;
			const $el = $(el);
			if ($el.data('dependent-target')) 
				$el.data('dependent-target', `${$el.data('dependent-target')}-${dbID || itemIndex}`);
			if (!isNaN(dbID)) $el.data('table-id', dbID);
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
		$accordion.find('.card:not(.cloneable) .collapse.show').removeClass('show');/*.each(
			function() {$(this)rem}
		);*/

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

		for (const el of $('#' + newCardID).find('.input-field')) {
			const $el = $(el);
			const newID = `${el.id}-${cardIndex}`;
			const dataTable = $el.data('table-name');
			
			// If this depends on another input AND that input has a .cloneable parent, update the 
			//	dependent target attribute with the card id so the right input will find its dependents
			const $dependentTarget = $($el.data('dependent-target'));
			if ($dependentTarget.length && $dependentTarget.closest('.cloneable').length)
				$el.data('dependent-target', `${$el.data('dependent-target')}-${cardIndex}`);

			$el.removeClass('error')
				.attr('id', newID)
				.siblings('.field-label')
					.attr('for', newID);
			if (dataTable in updateIDs)  $el.data('table-id', updateIDs[dataTable]);
			if ($el.is('select')) {
				$el.val('').addClass('default');
			}
		}

		// if the accordion's data-table-name attribute is in update IDs, 
		//	add the table-id attribute to the card's data
		const accordionTableName = $accordion.data('table-name');
		if (accordionTableName in updateIDs) $newCard.data('table-id', updateIDs[accordionTableName]);

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
				.collapse.field-container .input-field, 
				.collapse.field-container-row .input-field,
				.collapse.accordion, 
				.collapse.add-item-container .add-item-button
			`).filter((_, el) => $(el).data('dependent-target') === selectID);
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
					.split(',').map((s) => {return s.trim()});
				
				var selectVal = ($select.is('.input-checkbox') ? $select.prop('checked') : $select.val() || '').toString().trim();

				var show = dependentValues.includes(selectVal) || 
					(dependentValues[0] === '<blank>' && selectVal == '');
				if (notEqualTo) show = !show;

				if (show) {
					$thisContainer.collapse('show');
					this.toggleDependentFields($thisField)
				} else {
					$thisContainer.collapse('hide');
					this.toggleDependentFields($thisField);
				}
			}
		}
		setTimeout(10);
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


	/*
	Helper function to reset the values/classes of all inputs within a given parent to their defaults
	*/
	clearInputFields({parent='body', triggerChange=true}={}) {
		for (const el of $(parent).find('.input-field:not(.no-option-fill)')) {
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
					el.value = defaultValue || '';
					$el.toggleClass('default', !defaultValue);
						//.change();
			} else {
				el.value = defaultValue || null;
			}

			$el.removeData('table-id');

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

			if (focusOnField) $invalidFields.first().focus();
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


	/*
	Helper function to check a Postgres query result for an error
	*/
	queryReturnedError(queryResultString) {
		
		

		if (typeof queryResultString === 'object') {
			if (Array.isArray(queryResultString)) {
				return !queryResultString.length;
			} else {
				return queryResultString === null;
			}
		} else if (typeof queryResultString === 'string') {
			queryResultString = queryResultString.trim();
		}
		return queryResultString.match(/Query failed: ERROR:/) || queryResultString.startsWith('ERROR:') || queryResultString === '["query returned an empty result"]';
	}


	pythonReturnedError(resultString) {

		return resultString.startsWith('ERROR: Internal Server Error') ?
		   resultString.match(/[A-Z]+[a-zA-Z]*Error: .*/)[0].trim() :
		   false;
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
							return s
						} else {
							// Need to return [key, value]
							return [
								s.slice(0, match.index), 
								s.slice(match.index + 1, s.length) //+1 to skip the = separator
							]
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
	copyToClipboard(text, modalMessage='') {
		const clipboard = navigator.clipboard;
		if (!clipboard) {
			showModal(`Your browser refused access to the clipboard. This feature only works with a HTTPS connection. Right-click and copy from <a href="${text}">this link</a> instead.`, 'Clipboard access denied');
			return;
		}
		clipboard
			.writeText(text)
			.then(() => {
				showModal(modalMessage || `Successfully copied ${text} to clipboard`, 'Copy successful');
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
		return this.queryDB('SELECT * FROM table_info_matview').done(resultString => {
			// the only way this query could fail is if I changed DBMS, 
			//	so I won't bother to check that the result is valid
			var insertOrder = this.tableInfo.insertOrder;
			for (const info of $.parseJSON(resultString)) {
				const tableName = info.table_name;
				if (!insertOrder.includes(tableName)) insertOrder.push(tableName);
				if (!(tableName in this.tableInfo.tables)) {
					this.tableInfo.tables[tableName] = {
						foreignColumns: [],
						columns: {}
					};
				}
				if (info.foreign_table_name) {
					this.tableInfo.tables[tableName].foreignColumns.push({
						foreignTable: info.foreign_table_name,
						column: info.column_name
					});
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
		if (fieldName in values) {
			if (isCheckbox) {
				$el.prop('checked', value === 't'); //bool vals from postgres are returned as either 't' or 'f'
			} else {
				
				if (isSelect) {
					$el.val(value == null ? '' : value); //if the db record isn't filled in, set it to the default
					$el.toggleClass('default', value == null || value == '');
				} else {
					$el.val(value);
				}
			}
		} else if (isSelect) {
			$el.addClass('default')
		}

		$el.data('table-id', dbID);

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
		return $input.is('.input-checkbox') ? $input.prop('checked') : $input.val();
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
									FROM climber_info_view
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
									re_full_name ILIKE '${searchString}%' AND 
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
				JOIN climber_info_view ON gb.id = climber_info_view.id 
				${whereClause}
				ORDER BY first_sort_order::text || full_name
			` :
			`
				SELECT 
					* 
				FROM climber_info_view 
				${whereClause}
			`
			;
	}

	getClimberQuerySQL({searchString='', minIndex=1, climberID=undefined, queryFields='*', coreWhereClause=''} = {}) {
		const withSearchString = searchString.length > 0;
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


	beforeUnloadEventHandler(e) {
		if ($('.input-field.dirty:not(.filled-by-default)').length) {
			const message = 'You have unsaved edits. Are you sure you want to leave this page?';
			e.returnValue = message;
			return message;
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
				// If another tab is responding, telling us the page is already open, focus on that tab
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
					showModal(message, `${pageObjectName} Already Open`);
				}
			}
		}

		// Post a message asking if the page is open elsewhere
		channel.postMessage({message: openQuery});
	}


	/* Return any Deferreds so anything that has to happen after these are done can wait */
	init({addMenu=true}={}) {

		this.loginInfo = $.parseJSON(window.localStorage.getItem('login') || '{}');

		if (addMenu) {
			this.configureMenu();

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

		// Warn the user before they leave the page if they have unsaved edits
		$(window).on('beforeunload', (e) => {return this.beforeUnloadEventHandler(e)});

		// Show the right sidebar nav item as selected
		$('.sidebar-nav-group > .nav-item.selected').removeClass('selected');
		$('.sidebar-nav-group .nav-item > a')
			.filter((_, el) => el.href.endsWith(window.location.pathname.split('/').pop()))
			.parent()
				.addClass('selected');
		
		const userDeferred = this.getUserInfo()
			.done(response => {
				const result = response;
				const username = result.ad_username;
				if (addMenu && username !== 'test') {
					if (this.loginInfo.username !== username || this.loginInfo.expiration < new Date().getTime()) {
						$('#climberdb-main-content').empty();
						hideLoadingIndicator();
						const footerButtons = `<button class="generic-button modal-button close-modal" data-dismiss="modal" onclick="window.location.href='index.html?referer=${encodeURI(window.location.href)}'">OK</button>`;
						showModal('Your session has expired. Click OK to log in again.', 'Session expired', 'alert', footerButtons, {dismissable: false});
					}
				}
				if (window.location.pathname !== '/index.html' && this.userInfo.user_status_code != 2) {
					window.location = 'index.html'
				}
			});
		return [userDeferred, this.getTableInfo(), this.loadConfigValues()];
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
 	$.fn.fadeRemove = function(fadeTime=500) {
 		 return this.fadeOut(fadeTime, () => {this.remove()});
 	}
}( jQuery ));


