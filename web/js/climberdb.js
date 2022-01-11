

class ClimberDB {
	constructor() {
		this.userInfo = {};
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

			<main class="dashboard-main">

				<!-- nav sidebar -->
				<div class="main-container-with-sidebar">
					<nav class="sidebar" role="navigation" role="navigation">
						<div class="sidebar-sticky">
							<div class="sidebar-background"></div>
							<ul class="sidebar-nav-group">

								<li class="nav-item selected">
									<a href="climberdb-dashboard.html">
										<img class="sidebar-nav-item-icon" src="imgs/home_icon_50px.svg">
										<span class="sidebar-nav-item-label">home</span>
									</a>
								</li>

								<li class="nav-item">
									<a href="query.html">
										<img class="sidebar-nav-item-icon" src="imgs/climber_icon_50px.svg">
										<span class="sidebar-nav-item-label">climbers</span>
									</a>
								</li>

								<li class="nav-item">
									<a href="query.html">
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

	queryDB(sql) {
		return $.ajax({
			url: 'climberdb.php',
			method: 'POST',
			data: {action: 'query', queryString: sql, db: 'climberdb'},
			cache: false
		});
	}	


	/*
	*/
	fillSelectOptions(selectElementID, queryString, optionClassName='') {
		let deferred = this.queryDB(queryString)
		deferred.done(queryResultString => {
				
				queryResultString = queryResultString.trim();

				var queryResult;
				try {
					queryResult = $.parseJSON(queryResultString);
				} catch {
					//console.log(`error filling in ${selectElementID}: ${queryResultString}`);
				}
				if (queryResult) {
					queryResult.forEach(function(object) {
						$('#' + selectElementID).append(
							`<option class="${optionClassName}" value="${object.value}">${object.name}</option>`
						);
					})
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

		return $('select').map( (_, el) => {
			const $el = $(el);
			const placeholder = $el.attr('placeholder');
			const lookupTable = $el.data('lookup-table');
			const lookupTableName = lookupTable ? lookupTable : $el.attr('name') + 's';
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

		//set a timer to turn off the indicator after a max of 15 seconds because 
		//  sometimes hideLoadingIndicator doesn't get called or there's some mixup 
		//  with who called it
		/*if (timeout) {
			setTimeout(hideLoadingIndicator, timeout);
		}*/
		
		// For anonymous functions, the caller is undefined, so (hopefully) the 
		//	function is called with the argument given
		var thisCaller = caller == undefined ? showLoadingIndicator.caller.name : caller;

		var indicator = $('#loading-indicator').removeClass('hidden')
		$('#loading-indicator-background').removeClass('hidden');

		// check the .data() to see if any other functions called this
		indicator.data('callers', indicator.data('callers') === undefined ? 
			[thisCaller] : indicator.data('callers').concat([thisCaller])
		)

	}


	/*
	*/
	hideLoadingIndicator(caller) {
	

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


	addNewCard($accordion, {cardIndex=null, accordionName=null, cardLinkText='', updateIDs={}, show=true}={}) {

		const $dummyCard = $accordion.find('.card.cloneable');
		if ($dummyCard.length === 0) {
			console.log('No dummy card found');
			return;
		}

		// Close any open cards
		$accordion.find('.card:not(.cloneable) .collapse.show').each(
			function() {$(this).siblings('.card-header').find('.card-link').click()}
		);

		// Get ID suffix for all children elements. Suffix is the 
		//	<element_identifier>-<section_index>-<card_index>.
		//	This is necessary to distinguish elements from others in 
		//	other form sections and other cards within the section
		/*const sectionIndex = $accordion.closest('.form-page')
			.data('page-index');*/
		accordionName = accordionName || $accordion.data('table-name');
		if (!cardIndex) {
			var cardIndex = $accordion.find('.card').length - 1;// - 1 because cloneable is 0th
			while ($(`#card-${accordionName}-${cardIndex}`).length) {
				cardIndex++;
			}
		}

		const idSuffix = `${accordionName}-${cardIndex}`;

		const $newCard = $dummyCard.clone(true)//withDataAndEvents=true
			.removeClass('cloneable hidden')
			.attr('id', `card-${idSuffix}`);
		
		//Set attributes of children
		const $newHeader = $newCard.find('.card-header');
		$newHeader
			.attr('id', `cardHeader-${idSuffix}`)
			.find('.card-link')
				.attr('href', `#collapse-${idSuffix}`)
				.attr('data-target', `#collapse-${idSuffix}`)
				.find('.card-link-label')
					.text(cardLinkText);

		const $newCollapse = $newCard.find('.card-collapse')
			.attr('id', `collapse-${idSuffix}`)
			.attr('aria-labelledby', `cardHeader-${idSuffix}`)
			.addClass('validate-field-parent');

		$newCollapse.find('.card-body')
			.find('.input-field')
			.each((i, el) => {
				const $el = $(el);
				const newID = `${el.id}-${cardIndex}`;
				const dataTable = $el.data('table-name');
				if (dataTable in updateIDs)  $el.data('db-id', updateIDs[dataTable]);
				$el.data('dependent-target', `${$el.data('dependent-target')}-${cardIndex}`);
				$el.attr('id', newID)
					.siblings()
					.find('.field-label')
						.attr('for', newID);
			})
			.filter('.error')
				.removeClass('error');
		
		// Add to the accordion
		$newCard.appendTo($accordion).fadeIn();

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
		
		var names = {}
		if ($card.data('label-template')) {
			for (const el of $card.find('.card-label-field')) {
				names[el.name] = el.value;
			}
		} else {
			names = $card.find('.card-label-field')
			.map(function(_, el) {
	    		return $(el).attr('name');
			})
			.get(); // get returns the underlying array
		}
		//const defaultText = $card.closest('.accordion').find('.card.cloneable.hidden .card-link-label').text();
		const defaultText = $card.find('.card-link-label').text();

		this.setCardLabel($card, names, defaultText);
	}


	showModal(message, title, modalType='alert', footerButtons='') {

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

	/* Return any Deferreds so anything that has to happen after these are done can wait */
	init() {
		this.configureMenu();
		return [this.getUserInfo()];
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
