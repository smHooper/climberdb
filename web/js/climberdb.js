

function queryDB(sql) {

	return $.ajax({
		url: 'climberdb.php',
		method: 'POST',
		data: {action: 'query', queryString: sql, db: 'climberdb'},
		cache: false
	});
}


function fillSelectOptions(selectElementID, queryString, optionClassName='') {
	
	let deferred = queryDB(queryString)
	deferred.then(
		doneFilter=function(queryResultString){
			
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
		},
		failFilter=function(xhr, status, error) {
			console.log(`fill select failed with status ${status} because ${error} from query:\n${sql}`)
		}
	);

	return deferred;
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
	var thisCaller = caller == undefined ? showLoadingIndicator.caller.name : caller;

	var indicator = $('#loading-indicator').removeClass('hidden')
	$('#loading-indicator-background').removeClass('hidden');

	// check the .data() to see if any other functions called this
	indicator.data('callers', indicator.data('callers') === undefined ? 
		[thisCaller] : indicator.data('callers').concat([thisCaller])
	)

}


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

/*
Helper function to check a Postgres query result for an error
*/
function queryReturnedError(queryResultString) {
	return queryResultString.trim().startsWith('ERROR') || queryResultString.trim() === '["query returned an empty result"]';
}


/*
Copy specified text to the clipboard
*/
function copyToClipboard(text, modalMessage='') {
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
Helper functions to compute the width of a text string with a given font family, size, and weight
(from: https://stackoverflow.com/a/21015393)
*/
function getTextWidth(text, font) {
	// re-use canvas object for better performance
	const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
	const context = canvas.getContext("2d");
	context.font = font;
	const metrics = context.measureText(text);

	return metrics.width;
}

function getCanvasFont(el=document.body) {
	const $el = $(el);
	const fontWeight = $el.css('font-weight') 	|| 'normal';
	const fontSize = $el.css('font-size') 		|| '16px';
	const fontFamily = $el.css('font-family') 	|| 'Times New Roman';

	return `${fontWeight} ${fontSize} ${fontFamily}`;
}



function animateCountUp(el, nFrames, frameDuration, easeFunction=(t) => t, maxVal=null) {
	/*
	Animate counting of an element with numeric text
	*/
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


function verifyPassword(clientPassword) {
	return $.ajax({
		url: 'climberdb.php',
		method: 'POST',
		data: {action: 'verifyPassword', clientPassword: clientPassword},
		cache: false
	}).done()
}


// Run the animation on all elements with a class of ‘countup’
function runCountUpAnimations(animationDuration=500, framesPerSecond=60, easeFunction=(t) => t * ( 2 - t )) {
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
		animateCountUp(el, nFrames, frameDuration);
	}
}

/*jQuery extensions*/
(function( $ ) {
 	// helper method to hide/unhide an element (using the custom utility class, .hidden) AND set the ARIA-hidden attribute appropriately
	$.fn.ariaHide = function(isHiding=true) {
		return this.toggleClass('hidden', isHiding)
			.attr('aria-hidden', isHiding);
	}
 
}( jQuery ));
