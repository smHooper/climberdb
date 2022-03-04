/* Global functions */
function getFormattedTimestamp(date, {format='date'}={}) {

	if (date === undefined) date = new Date();

	// Get 0-padded minutes
	const minutes = ('0' + date.getMinutes()).slice(-2)
	const dateString = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
	const timeString = `${date.getHours()}:${minutes}`;
	return format === 'date' ? dateString : 
		format === 'time' ? timeString :
		format === 'datetime' ? dateString + ' ' + timeString :
			dateString + ' ' + timeString;

}


function showModal(message, title, modalType='alert', footerButtons='') {

	var modalID = title
		.replace(/[^\w]/g, '-') // replace non-alphanumeric chars with '-'
		.replace(/^-|-+$/g, '') // remove any hyphens from beginning or end

	if (!footerButtons) {
		switch(modalType) { 
			case 'alert': 
				footerButtons = '<button class="generic-button modal-button close-modal" data-dismiss="modal">Close</button>';
				break;
			case 'confirm':
				footerButtons = `
					<button class="generic-button secondary-button modal-button close-modal" data-dismiss="modal">Close</button>';
					<button class="generic-button modal-button close-modal" data-dismiss="modal">OK</button>
				`;
				break;
		}
	}

	const innerHTML = `
	  <div class="modal-dialog" role="document">
	    <div class="modal-content">
	      <div class="modal-header">
	        <h5 class="modal-title">${title}</h5>
	        <button type="button" class="close close-modal" data-dismiss="modal" aria-label="Close">
	          <span aria-hidden="true">&times;</span>
	        </button>
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
	const $modal = $('#alert-modal').empty()
		.append($(innerHTML))
		.modal();
	
	$modal.find('.close-modal').click(function() {
		$modal.modal('hide');
	})
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

/* ClimberDB base class*/
class ClimberDB {
	constructor() {
		this.userInfo = {};
		this.tableInfo = {
			tables: {},
			insertOrder: [] // comply with left-right orientation of table relationships
		};
		this.entryMetaFields = ['entry_time', 'entered_by', 'last_modified_time', 'last_modified_by'];
	}

	getUserInfo() {
		return $.ajax({
			url: 'climberdb.php',
			method: 'POST',
			data: {action: 'getUser'},
			cache: false
		}).done((resultString) => {
			if (this.queryReturnedError(resultString)) {
				throw 'User role query failed: ' + resultString;
			} else {
				const result = $.parseJSON(resultString);
				this.userInfo = {...result[0]};
				$('#username').text(`Hi, ${this.userInfo.first_name}!`);
			}
		});
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
					<a class="home-button" role="button" href="climberdb-index.html">
						<img src="imgs/climberdb_icon_50px.svg" alt="home icon">
					</a>
					<h4 class="page-title">DENA Climbing Permit Portal</h4>
				</div>
				<div class="header-menu-item-group" id="username-container">
					<img id="username-icon" src="imgs/account_icon_50px.svg" alt="account icon">
					<label id="username"></label>
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

								<li class="nav-item">
									<a href="manage-users.html">
										<img class="sidebar-nav-item-icon" src="imgs/user_icon_50px.svg">
										<span class="sidebar-nav-item-label">manage users</span>
									</a>
								</li>

								<li class="nav-item">
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

		var tabIndex = 0;
		for (const el of $('nav a, nav button')) {
			el.tabIndex = tabIndex;
			tabIndex ++;
		}
	}

	queryDB(sql, {returnTimestamp=false}={}) {
		var requestData = {action: 'query', queryString: sql, db: 'climberdb'};
		if (returnTimestamp) requestData.queryTime = (new Date()).getTime();
		return $.ajax({
			url: 'climberdb.php',
			method: 'POST',
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
					queryResult.forEach(function(object) {
						$el.append(
							`<option class="${optionClassName}" value="${object.value}">${object.name}</option>`
						);
					})
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
	fillAllSelectOptions(noFillClass='.no-option-fill') {

		return $('select:not(.no-option-fill)').map( (_, el) => {
			const $el = $(el);
			const placeholder = $el.attr('placeholder');
			const lookupTable = $el.data('lookup-table');
			const lookupTableName = lookupTable ? lookupTable : $el.attr('name') + 's';
			//const lookupCodeColumn = $el.data('lookup-code-column') || 'code';
			//const lookupNameColumn = $el.data('lookup-name-column') || 'name';
			const id = el.id;
			if (lookupTableName != 'undefineds') {//if neither data-lookup-table or name is defined, lookupTableName === 'undefineds' 
				if (placeholder) $('#' + id).append(`<option class="" value="">${placeholder}</option>`);
				if (!$el.is(noFillClass)) {
					return this.fillSelectOptions(id, `SELECT code AS value, name FROM ${lookupTableName} WHERE sort_order IS NOT NULL ORDER BY sort_order`);
				}
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


	addNewListItem($ul, {dbID=null, newItemClass=''}={}) {

		const $cloneable = $ul.find('li.cloneable');
		const $newItem = $cloneable.clone(true)//withDataAndEvents=true
			.removeClass('cloneable hidden')


		var itemdIndex = $ul.find('li:not(.cloneable)').length;
		var newItemID = `${$ul.attr('id')}-${itemdIndex}`;
		if (isNaN(dbID)) {
			while ($('#' + newItemID).length) {
				itemdIndex++;
				newItemID = `${$ul.attr('id')}-${itemdIndex}`;
			}
		} else {
			newItemID = `${$ul.attr('id')}-${dbID}`;
		}
		$newItem.attr('id', newItemID);

		for (const el of $newItem.find('.input-field')) {
			el.id = `${el.id}-${dbID || itemdIndex}`;
			if (!isNaN(dbID)) $(el).attr('table-id', dbID);
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
				.find('.card-link-label')
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
					$el.find('option').filter((_, option) => {return $(option).val() === $el.val()}).html() : 
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
		const dependentElements = $(`
			.collapse.field-container .input-field, 
			.collapse.field-container-row .input-field,
			.collapse.accordion, 
			.collapse.add-item-container .add-item-button
			`).filter((_, el) => {return $(el).data('dependent-target') === selectID});
		//const dependentIDs = $select.data('dependent-target');
		//var dependentValues = $select.data('dependent-value');
		dependentElements.each((_, el) => {
			const $thisField = $(el);
			if (el.id == 'input-input-recovered_value-0') {
				let a=0;
			}
			var dependentValues = $thisField.data('dependent-value').toString();
			if (dependentValues) {
				var $thisContainer = $thisField.closest('.collapse.field-container, .collapse.field-container-row, .collapse.accordion, .collapse.add-item-container');
				
				// If there's a ! at the beginning, 
				const notEqualTo = dependentValues.startsWith('!');
				dependentValues = dependentValues
					.toString()
					.replace('!', '')
					.split(',').map((s) => {return s.trim()});
				
				var selectVal = ($select.val() || '').toString().trim();

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
		});
	}


	/*
	Generic event handler for selects
	*/
	onSelectChange = function(e) {
		// Set style depending on whether the default option is selected
		const $select = $(e.target);

		const value = $select.val();
		if (value == null || value == '') {
			$select.addClass('default');
		} else {
			$select.removeClass('default error');
			// the user selected an actual option so remove the empty default option
			/*for (const el of $select.find('option')) {//.each(function(){
				const $option = $(el);
				if ($option.val() == '') {
					$option.remove();
				}
			}*/
		}

		// If there are any dependent fields that should be shown/hidden, 
		//	toggle its visibility as necessary
		this.toggleDependentFields($select);
	}


	/**/
	clearInputFields({parent='body', triggerChange=true}={}) {
		for (const el of $(parent).find('*:not(.card.cloneable) .input-field')) {
			const $el = $(el);
			if ($el.is('.input-checkbox')) {
				$el.prop('checked', false); //bool vals from postgres are returned as either 't' or 'f'
			} else if ($el.is('select')) {
					$el.addClass('default');
					el.value = '';
			} else {
				el.value = null;
			}

			$el.removeData('table-id');

			if (triggerChange) $el.change();
		}
	}


	/*
	Helper function to check a Postgres query result for an error
	*/
	queryReturnedError(queryResultString) {
		return queryResultString.trim().startsWith('ERROR') || queryResultString.trim() === '["query returned an empty result"]';
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


	verifyPassword(clientPassword) {
		return $.ajax({
			url: 'climberdb.php',
			method: 'POST',
			data: {action: 'verifyPassword', clientPassword: clientPassword},
			cache: false
		}).done()
	}


	getTableInfo() {
		return this.queryDB('SELECT * FROM table_info_matview').done(resultString => {
			// the only way this query could fail is if I changed DBMS, 
			//	so I won't bother to check that the result is valid
			var insertOrder = this.tableInfo.insertOrder;
			for (const info of $.parseJSON(resultString)) {
				const tableName = info.table_name;
				if (!(tableName in this.tableInfo.tables)) {
					this.tableInfo.tables[tableName] = {
						foreignColumns: [],
						columns: {}
					};
				}
				if (info.column_name == 'climber_id') {
					const a=1;
				}
				if (info.foreign_table_name) {
					this.tableInfo.tables[tableName].foreignColumns.push({
						foreignTable: info.foreign_table_name,
						column: info.column_name
					});

					// Place this table in the insert order
					var thisIndex = insertOrder.indexOf(tableName);
					const foreignTableIndex = insertOrder.indexOf(info.foreign_table_name);
					if (thisIndex < foreignTableIndex) thisIndex = foreignTableIndex + 1;
					// If it's already in the inser order, remove it
					if (insertOrder.includes(tableName)) insertOrder.splice(thisIndex, 1); 
					// inset it in the next position to the right of the last foreign table it references
					insertOrder.splice(thisIndex, 0, tableName); 

				} else if (!insertOrder.includes(tableName)) {
					// This table either doesn't participate in any foreign key relationships or it's all the way to the left. 
					//	Either way, add table to the beginning of the insert order
					insertOrder.unshift(tableName); 
				}
				this.tableInfo.tables[tableName].columns[info.column_name] = {...info};
			}
			
			/*for (tableName in this.tableInfo) {
			    const foreignColumns = climberDB.tableInfo[tableName].foreignColumns;
			    if (!foreignColumns.length && !insertOrder.includes(tableName)) {
			        insertOrder.unshift(tableName); 
			    } else {
			        var thisIndex = insertOrder.indexOf(tableName);
			        for (const {foreignTable} of foreignColumns) {
			            const foreignTableIndex = insertOrder.indexOf(foreignTable);
			            if (thisIndex < foreignTableIndex) thisIndex = foreignTableIndex + 1;
			            if (insertOrder.includes(tableName)) insertOrder.splice(thisIndex, 1); // remove it
			            insertOrder.splice(thisIndex, 0, tableName); // inset it in the next position to the right
			        }
			    }
			}*/
		})
	}

	/*
	Helper method to set the value of an input field. The 'name' attribute needs to 
	correspond to a key in the values object. 
	@parameter:
	*/
	fillInputField(el, values, {dbID=null, triggerChange=false}={}) {
		el.value = null; // clear value regardless
		
		const $el = $(el);

		// If this is a child of a cloneable card, skip it
		if ($el.closest('.card.cloneable').length) return [$(null), null, null];

		// If this is being called to roll back edits, the table-id should already be filled
		if (dbID === null) dbID = $el.data('table-id');

		const isSelect = $el.is('select');
		const fieldName = el.name.replace(/-\d+$/g, '');
		const value = values[fieldName];
		if (fieldName in values) {
			if ($el.is('.input-checkbox')) {
				$el.prop('checked', value === 't'); //bool vals from postgres are returned as either 't' or 'f'
			} else {
				$el.val(value);
				if (isSelect) {
					$el.toggleClass('default', value == null || value == '');
				}
			}
		} else if (isSelect) {
			$el.addClass('default')
		}

		$el.data('table-id', dbID);

		if (triggerChange) $el.change();

		return [$el, fieldName, value];
	}

	
	/* Return any Deferreds so anything that has to happen after these are done can wait */
	init({addMenu=true}={}) {
		if (addMenu) this.configureMenu();
		
		// Bind events on dynamically (but not yet extant) elements
		$(document).on('change', 'select.input-field', e => {
			//const $select = $(e.target);
			//$select.toggleClass('default', $select.val() == null);
			this.onSelectChange(e);
		});

		// Show the right sidebar nav item as selected
		$('.sidebar-nav-group > .nav-item.selected').removeClass('selected');
		$('.sidebar-nav-group .nav-item > a')
			.filter((_, el) => el.href.endsWith(window.location.pathname.split('/').pop()))
			.parent()
				.addClass('selected');
		
		return [this.getUserInfo(), this.getTableInfo()];
	}
};



/*jQuery extensions*/
(function( $ ) {
 	// helper method to hide/unhide an element (using the custom utility class, .hidden) AND set the ARIA-hidden attribute appropriately
	$.fn.ariaHide = function(isHiding=true) {
		return this.toggleClass('hidden', isHiding)
			.attr('aria-hidden', isHiding);
	}
 
}( jQuery ));


