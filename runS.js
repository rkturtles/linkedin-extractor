var stopping = false;
var intervals = [];

var savedDetails = {};

var stoppingAfter = 0;

var text_done = '(Done)';
var text_already_done = '(Skipped - Already Done)';
var text_visiting_extracting = '(Visiting & Extracting)';
var text_next_to_visit = '(Next To Visit)';

var color_done = '#39D5FF';
var color_already_done = '#E7E7E7';
var color_visiting_extracting = '#5EFAF7';
var color_next_to_visit = '#FFCCBC';

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action == 'update' && message.value) {
    savedDetails = message.value;
  }
});

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

  for (var i = 0; i < intervals.length; i++) {
    clearInterval(intervals[i]);
  }
}

function startVisiting(i) {
  if (stopping) {
    stop();
    return;
  }

  var peopleRows = $('.spotlights-result').parent();
  var personRow = peopleRows[i];

  var personTitle = $(personRow).find('.name > a');

  if (personRow && personTitle) {
    var nowText = $(personTitle).text();
    var personLink = $(personTitle).attr('href');

    i++;

    if (!personLink || personLink.indexOf('/sales/profile') === -1 || nowText.indexOf(
        text_next_to_visit) > -1 || nowText.indexOf(text_done) > -1 ||
      nowText.indexOf(
        text_already_done) > -1 || !canVisit(personLink)) {

      if (nowText.indexOf(text_already_done) === -1) {
        nowText = nowText.replace(' ' + text_done, '').replace(' ' +
          text_next_to_visit, '');
        $(personTitle).text(nowText + ' ' + text_already_done);
        $(personRow).css('background-color', color_already_done);
      }

      startVisiting(i);
      return;
    }


    nowText += " " + text_next_to_visit;
    $(personRow).css(
      'background-color', color_next_to_visit);
    $(personTitle).text(nowText);

    var delay = Math.round(Math.random() * (25000 - 10000)) + 10000;
    var delayS = Math.round(delay / 1000);

    $('#extractor-next-visit').text(delayS + 's');

    var interval = setInterval(function() {
      delayS--;

      $('#extractor-next-visit').text(delayS + 's');

      if (delayS <= 0) {

        var intervalIndex = intervals.indexOf(interval);
        if (intervalIndex > -1) {
          clearInterval(intervals[intervalIndex]);
          intervals.splice(intervalIndex, 1);
        }

        if (nowText.indexOf(text_visiting_extracting) === -1) {
          nowText = nowText.replace(text_next_to_visit,
            text_visiting_extracting);
          $(personTitle).text(nowText);
          $(personRow).css('background-color',
            color_visiting_extracting);
        }

        visitPerson(personLink, function(profileDetails) {
          saveOrPrint(profileDetails);

          incrementVisitCount();

          if (nowText.indexOf(text_done) === -1) {
            nowText = nowText.replace(text_visiting_extracting,
              text_done);
            $(personTitle).text(nowText);
            $(personRow).css('background-color', color_done);
          }

          stoppingAfter--;
          $('#extractor-stopping-after-number').text(stoppingAfter);

          if (stoppingAfter <= 0) {
            stop();
          } else {
            startVisiting(i);
          }

          return;
        });
      }
    }, 1000);

    intervals.push(interval);

  } else {
    var next = $('a.page-link[title*="Next"]');

    if (next && next.length) {
      $('a.page-link[title*="Next"]')[0].click();

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
    type: 'get',
    timeout: 10000
  }).done(function(data) {
    var html = $.parseHTML(data);

    var embeddedJson = $(html).filter('#embedded-json');
    var jsonStr = '{}';

    if (embeddedJson) {
      jsonStr = embeddedJson.html() || '{}';
    }

    jsonStr = jsonStr.replace("<!--", "").replace("-->", "");
    var profileDetails = JSON.parse(jsonStr);

    var positions = ((profileDetails.positionsView || {}).positions) || [];
    var lastPosition = positions[0] || {};
    var lastCompanyLink = lastPosition.companyUrl;

    if (!lastCompanyLink) {
      completed(profileDetails);
      return;
    } else {
      lastCompanyLink = window.location.protocol + lastCompanyLink.replace(
        /^https?:/, '');

      $.ajax({
        url: lastCompanyLink,
        type: 'get',
        timeout: 10000
      }).done(function(data) {
        var htmlAgain = $.parseHTML(data);
        var companyJson = $(htmlAgain).find("code").last();
        var companyJsonStr = '{}';

        if (companyJson) {
          companyJsonStr = companyJson.html() || '{}';
        }

        companyJsonStr = companyJsonStr.replace("<!--", "").replace(
          "-->", "");
        var companyDetails = JSON.parse(companyJsonStr);
        var companyWebsite = ((companyDetails.account || {}).website ||
          '');

        if (companyWebsite)
          profileDetails.companyWebsite = companyWebsite.toLowerCase()
          .trim();

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
  if (day != nowDay) {
    visited = 0;
    savedDetails.day = nowDay;
    savedDetails.visited = 0;
  }

  visited++;

  savedDetails.visited = visited;
  $('#extractor-visited').text(visited);
  chrome.runtime.sendMessage({
    'message': 'save',
    'toSaveDetails': savedDetails
  }, function() {});
}

function saveOrPrint(details) {
  var API = savedDetails.API;

  if (API) {
    try {
      $.ajax({
        url: API,
        type: 'POST',
        data: {
          data: details
        }
      }).complete(function(returned) {

      });
    } catch (e) {}

  }

  console.log(details);
}

function canVisit(viewLink) {
  var idStr = getProfileId(viewLink);

  if (!idStr)
    return true;

  if (typeof savedDetails.idsVisited === 'undefined') {
    savedDetails.idsVisited = {};
  }

  var idsVisited = savedDetails.idsVisited;

  var daysSkip = savedDetails.daysSkip;

  if (typeof daysSkip === 'undefined') {
    daysSkip = 365;
    savedDetails.daysSkip = 365;
  }

  var nowTime = new Date().getTime();
  var visitedAgo = idsVisited[idStr] || 0;

  if ((nowTime - visitedAgo) <= daysSkip * 24 * 60 * 1000) {
    return false;
  } else {
    idsVisited[idStr] = nowTime;

    //saved
    savedDetails.idsVisited[idStr] = nowTime;
    chrome.runtime.sendMessage({
      'message': 'save',
      'toSaveDetails': savedDetails
    }, function() {});

    return true;
  }
}

function getProfileId(viewLink) {
  var matched = viewLink.match(/sales\/profile\/.*?,/i);
  var idStr = '';

  if (matched) {
    idStr = matched[0];
  }

  return idStr.replace(/,/gi, '').replace(/sales\/profile\//i, '').trim();
}

function initialize(complete) {
  chrome.runtime.sendMessage({
    'message': 'load'
  }, function(returnedDetails) {
    if (returnedDetails)
      savedDetails = returnedDetails;

    $.get(chrome.extension.getURL("toolbar.html"), function(toolbarHTML) {
      $('#stream-container').append(toolbarHTML);

      if (API) {
        $('#extractor-save-to').val(API);
      }

      var API = savedDetails.API || '';

      var day = savedDetails.day || 0;
      var visited = savedDetails.visited || 0;

      var nowDay = new Date().getDate();
      if (day != nowDay) {
        visited = 0;
        savedDetails.day = nowDay;
        savedDetails.visited = 0;
        chrome.runtime.sendMessage({
          'message': 'save',
          'toSaveDetails': savedDetails
        }, function() {});
      }

      $('#extractor-visited').text(visited);

      complete();
    });
  });

}

$(function() {
  $('#stream-container').on('click', '#extractor-start-button',
    function() {
      var text = $(this).text();

      if (text === 'Start') {
        start();
      } else {
        stop();
      }
    });

  $('#stream-container').on('click', '#extractor-options', function() {
    chrome.runtime.sendMessage({
      'message': 'options'
    }, function() {});
  });

  $('#stream-container').on('change', '#extractor-stopping-number',
    function() {
      var max = parseInt($(this).attr('max'));
      var min = parseInt($(this).attr('min'));

      if ($(this).val() > max) {
        $(this).val(max);
      } else if ($(this).val() < min) {
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
