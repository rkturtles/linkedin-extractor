chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.create({
		url: "https://www.linkedin.com/vsearch/p"
	});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message === "load") {
		var savedDetails = JSON.parse(localStorage.getItem('savedDetails') || "{}");
		sendResponse(savedDetails);
	} else if (request.message === "save") {
		if (request.toSaveDetails && Object.keys(request.toSaveDetails).length) {
			localStorage.setItem('savedDetails', JSON.stringify(request.toSaveDetails));
			if (request.shouldUpdate) {
				updateScript(request.toSaveDetails);
			}
		}


		sendResponse();
	} else if (request.message === "options") {
		chrome.runtime.openOptionsPage(function() {});
	}

	return false;

});

function updateScript(updateValue) {
	chrome.tabs.query({
		url: ["*://www.linkedin.com/vsearch/*",
			"*://www.linkedin.com/sales/search*"
		]
	}, function(tabs) {
		for (var i = 0; i < tabs.length; i++) {
			chrome.tabs.sendMessage(tabs[i].id, {
				action: "update",
				value: updateValue
			}, function(response) {});
		}
	});
}
