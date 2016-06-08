var savedDetails = {};

$(function() {

	chrome.runtime.sendMessage({'message' : 'load'}, function(returnedDetails) {
		if(returnedDetails)
			savedDetails = returnedDetails;
		
		var API = savedDetails.API || '';
		
		if(API) {
			$('#extractor-save-to').val(API);
		}
	});

	
	$('#extractor-change-save').on('click', function() {
		var text = $(this).text();
		var self = this;
		
		var API = $('#extractor-save-to').val();
		
		if(API) {
			savedDetails.API = API;
			chrome.runtime.sendMessage({'message' : 'save', 'toSaveDetails' : savedDetails}, function() {});	
			$(this).text("Saved!").attr('disabled', true);	
		} else 
			$(this).text("Invalid API Endpoint").attr('disabled', true);

		setTimeout(function() {
			$(self).text(text).attr('disabled', false);			
		}, 2000);
	});

});