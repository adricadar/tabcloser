
function saveOptions(e) {
  var minutes = document.querySelector("#minutes").value || 0;
  var hours = document.querySelector("#hours").value || 0;
  var days = document.querySelector("#days").value || 0;

  var intervalCheck = document.querySelector("#intervalCheck").value;
    
  chrome.storage.local.set({
    minutes: minutes,
    hours: hours,
    days: days,
    intervalCheck: intervalCheck
  });
}

function restoreOptions() {
  chrome.storage.local.get(['minutes', 'hours', 'days', 'intervalCheck'], (res) => {
    document.querySelector("#minutes").value = res.minutes || 0;
	document.querySelector("#hours").value = res.hours || 0;
	document.querySelector("#days").value = res.days || 7;
	document.querySelector("#intervalCheck").value = res.intervalCheck || 5;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);