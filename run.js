var stopping = false;
var intervals = [];

var savedDetails = {};

var stoppingAfter = 0;

var text_done = '(Done)';
var text_already_done = '(Skipped - Already Done)';
var text_visiting_extracting = '(Visiting & Extracting)';
var text_next_to_visit = '(Next To Visit)';

var color_done = '#39D5FF';
var color_already_done = '#F6C4A3';
var color_visiting_extracting = '#5EFAF7';
var color_next_to_visit = '#FFCCBC';

function start() {
	stopping = false;
	$('#extractor-start-button').text('Stop');
	stoppingAfter = parseInt($('#extractor-stopping-number').val()) || 0;
	
	$('#extractor-stopping-after-number').text(stoppingAfter);

	$('#extractor-stopping').fadeIn();
	startVisiting(0);	
}

function stop() {
	stopping = true;
	$('#extractor-start-button').text('Start');
	$('#extractor-stopping').hide();

	for(var i = 0; i < intervals.length; i++) {
		clearInterval(intervals[i]);
	}
}

function startVisiting(i) {
		if(stopping) {
			stop();
			return;
		}

		var peopleRows = $('#results .people');
		var personRow = peopleRows[i];
		
		var personTitle = $(personRow).find('a.title');
		
		if(personRow && personTitle) {
			var nowText = $(personTitle).text();
			var personLink = $(personTitle).attr('href');	
			
			i++;

			//dont visit again if already visited
			if(!personLink || nowText.indexOf('LinkedIn Member') > -1 || nowText.indexOf(text_next_to_visit) > -1 || nowText.indexOf(text_done) > -1 || nowText.indexOf(text_already_done) > -1) {

				if(nowText.indexOf(text_already_done) === -1) {
					nowText = nowText.replace(' ' + text_done, '').replace(' ' + text_next_to_visit, '');
					$(personTitle).text(nowText + ' ' + text_already_done);
					$(personRow).css('background-color', color_already_done);
				}

				startVisiting(i);
				return;
			}
			

			nowText += " " + text_next_to_visit;
			$(personRow).css('background-color', color_next_to_visit);
			$(personTitle).text(nowText);
			
			var delay = Math.round(Math.random() * (25000 - 10000)) + 10000;								
			var delayS = Math.round(delay/1000);

			$('#extractor-next-visit').text(delayS + 's');

			var interval = setInterval(function() {
				delayS--;
				
				$('#extractor-next-visit').text(delayS + 's');

				if(delayS <= 0) {
		
					var intervalIndex = intervals.indexOf(interval);
					if(intervalIndex > -1)
					{
						clearInterval(intervals[intervalIndex]);
						intervals.splice(intervalIndex, 1);
					}
						
					if(nowText.indexOf(text_visiting_extracting) === -1) {
						nowText = nowText.replace(text_next_to_visit, text_visiting_extracting);
						$(personTitle).text(nowText);
						$(personRow).css('background-color', color_visiting_extracting);
					}		

					visitPerson(personLink, function(profileDetails) {
						saveOrPrint(profileDetails);
						
						incrementVisitCount();
	
						if(nowText.indexOf(text_done) === -1) {
							nowText = nowText.replace(text_visiting_extracting, text_done);
							$(personTitle).text(nowText);
							$(personRow).css('background-color', color_done);
						}

						stoppingAfter--;
						$('#extractor-stopping-after-number').text(stoppingAfter);
						
						if(stoppingAfter <= 0) {
							stop();	
						} else {
							startVisiting(i);
						}

						return;
					});
				}
			}, 1000 );
			
			intervals.push(interval);

		} else {
			var next = $('a.page-link[rel="next"]');

			if(next) { 
				$('a.page-link[rel="next"]')[0].click();
				
				setTimeout(function() { 
					startVisiting(0);
				}, 4000);
			} else {
				stop();
			}
		}
}

function visitPerson(link, completed) {
	$.ajax({
		url: link,
		type: 'post',
		headers: {
			'contentType': 'application/x-www-form-urlencoded'
		},
		timeout: 10000
	}).done(function(data) {
		var html = $.parseHTML(data);

		var name = $($(html).find('.full-name')).text();
		var headline = $($(html).find('#headline')).text();
		var title = $($(html).find('#background-experience .current-position header h4')).map(function() {
				return $(this).text();
			}).get().join(' ,');

		var locality = $($(html).find('#top-card .locality')).text();
		var industry = $($(html).find('#top-card .industry')).text();
		var currentCompanies = $($(html).find('#overview-summary-current ol')).text();
		var previousCompanies = $($(html).find('#overview-summary-past ol')).text();
		var lastCompany = $($(html).find('#overview-summary-current a[href*="/company/"]:first'));

		var lastCompanyLink = '';
		if(lastCompany && lastCompany.attr('href')) {
			lastCompanyLink = 'https://www.linkedin.com' + lastCompany.attr('href');
		}

		var education = $($(html).find('#overview-summary-education ol')).text();

		var connections = $($(html).find('.member-connections > strong')).text();
		var skills = $($(html).find('#profile-skills .endorse-item-name-text')).map(function() {
			return $(this).text();
		}).get().join(', ');

		var interests = $($(html).find('#interests-view li')).text();

		var link = $($(html).find('#top-card .view-public-profile')).text();

		var companyWebsite = '';

		var profileDetails = {
			name: name,
			headline: headline,
			title: title,
			locality: locality,
			industry: industry,
			currentCompanies: currentCompanies,
			previousCompanies: previousCompanies,
			lastCompany: lastCompanyLink,
			education: education,
			connections: connections,
			skills: skills,
			interests: interests,
			link: link,
			companyWebsite: companyWebsite
		};
	
		if(!lastCompanyLink) {
			completed(profileDetails);
			return;
		} else {
			$.ajax({
				url : lastCompanyLink,
				type: 'get',
				timeout: 10000 
			}).done(function(data) {
				var htmlAgain = $.parseHTML(data);
				var code = $($(htmlAgain).find('#stream-about-section-embed-id-content')).html() || '{}';	
				var str = code.replace("<!--", "").replace("-->", "");
				var companyWebsite = JSON.parse(str).website;
				
				if(companyWebsite)
					profileDetails.companyWebsite = companyWebsite.toLowerCase().trim();

				completed(profileDetails);
				return;
			});		
		}
	
	});
}

function incrementVisitCount() {
		var day = savedDetails.day || 0;
		var visited = savedDetails.visited || 0;
		
		var nowDay = new Date().getDate();
		if(day != nowDay) {
			visited = 0;
			savedDetails.day = nowDay;
			savedDetails.visited = 0;
		}

		visited++;

		savedDetails.visited = visited;
		$('#extractor-visited').text(visited);
		chrome.runtime.sendMessage({'message' : 'save', 'toSaveDetails' : savedDetails}, function() {});
}

function saveOrPrint(details) {
	var API = savedDetails.API;

	if(API) {
		try {
			$.ajax({
				url: API,
				type: 'POST',
				data: {
					data: details
				}
			}).complete(function(returned) {
				
			});
		} catch(e) {}

	}
 
	console.log(details);
}

function initialize(complete) {
	chrome.runtime.sendMessage({'message' : 'load'}, function(returnedDetails) {
		if(returnedDetails)
			savedDetails = returnedDetails;

		$.get(chrome.extension.getURL("toolbar.html"), function(toolbarHTML) {
			$('#srp_main_').append(toolbarHTML);
		
			if(API)
			{
				$('#extractor-save-to').val(API);
			}
			
			var API = savedDetails.API || '';
					
			var day = savedDetails.day || 0;
			var visited = savedDetails.visited || 0;
			
			var nowDay = new Date().getDate();
			if(day != nowDay) {
				visited = 0;
				savedDetails.day = nowDay;
				savedDetails.visited = 0;
				chrome.runtime.sendMessage({'message' : 'save', 'toSaveDetails' : savedDetails}, function() {});
			}		
	
			$('#extractor-visited').text(visited);

			complete();
		});
	});
	
}

$(function() {
	$('#srp_main_').on('click', '#extractor-start-button', function() {
		var text = $(this).text();
		
		if(text === 'Start') {
			start();
		} else {
			stop();
		}	
	});
	
	$('#srp_main_').on('click', '#extractor-change-save', function() {
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

	$('#srp_main_').on('click', '#extractor-options', function() {
		chrome.runtime.sendMessage({'message' : 'options'}, function() {});
	});

	$('#srp_main_').on('change', '#extractor-stopping-number', function() {
		var max = parseInt($(this).attr('max'));
		var min = parseInt($(this).attr('min'));

		if($(this).val() > max) {
			$(this).val(max);
		} else if($(this).val() < min) {
			$(this).val(min);
		}
	});

	initialize(function() {
		extend();
	});	
});

//add more functions
function extend() {


}