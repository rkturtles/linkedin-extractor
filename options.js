var savedDetails = {};

$(function() {

	chrome.runtime.sendMessage({
		'message': 'load'
	}, function(returnedDetails) {
		if (returnedDetails)
			savedDetails = returnedDetails;

		var API = savedDetails.API || '';

		if (API) {
			$('#extractor-save-to').val(API);
		}

		var idsVisited = savedDetails.idsVisited || {};
		var daysSkip = savedDetails.daysSkip;

		if (typeof daysSkip === 'undefined') {
			daysSkip = 365;
		}

		$('#extractor-skip-days').text(daysSkip);
		$('#extractor-skip-number').text(calculateCurrentlySkip(idsVisited,
			daysSkip));
	});

	$('#extractor-change-save').on('click', function() {
		var text = $(this).text();
		var self = this;

		var API = $('#extractor-save-to').val() || '';
		savedDetails.API = API;
		chrome.runtime.sendMessage({
			'message': 'save',
			'toSaveDetails': savedDetails,
			'shouldUpdate': true
		}, function() {});
		$(this).text("Saved!").attr('disabled', true);

		setTimeout(function() {
			$(self).text(text).attr('disabled', false);
		}, 2000);
	});
});

$('#extractor-skip-days-save').on('click', function() {
	var text = $(this).text();
	var self = this;

	var daysSkip = $('#extractor-skip-days').val();

	savedDetails.daysSkip = daysSkip;
	chrome.runtime.sendMessage({
		'message': 'save',
		'toSaveDetails': savedDetails,
		'shouldUpdate': true
	}, function() {});
	$(this).text("Saved!").attr('disabled', true);
	$('#extractor-skip-number').text(calculateCurrentlySkip(savedDetails.idsVisited,
		savedDetails.daysSkip));

	setTimeout(function() {
		$(self).text(text).attr('disabled', false);
	}, 2000);
});

$('#extractor-skip-clear').on('click', function() {
	var text = $(this).text();
	var self = this;

	savedDetails.idsVisited = {};
	chrome.runtime.sendMessage({
		'message': 'save',
		'toSaveDetails': savedDetails,
		'shouldUpdate': true
	}, function() {});
	$(this).text("Cleared!").attr('disabled', true);

	$('#extractor-skip-number').text(calculateCurrentlySkip(savedDetails.idsVisited,
		savedDetails.daysSkip));

	setTimeout(function() {
		$(self).text(text).attr('disabled', false);
	}, 2000);
});


function calculateCurrentlySkip(idsVisited, daysSkip) {
	var now = new Date().getTime();

	var counter = 0;

	for (var id in idsVisited) {
		var timestamp = idsVisited[id];
		if ((now - timestamp) <= daysSkip * 24 * 60 * 1000) {
			counter++;
		}
	}

	return counter;
}
