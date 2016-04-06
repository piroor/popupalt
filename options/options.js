/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var throttleTimers = {};
function throttledUpdate(aKey, aValue) {
	if (throttleTimers[aKey])
		clearTimeout(throttleTimers[aKey]);
	throttleTimers[aKey] = setTimeout(function() {
		delete throttleTimers[aKey];
		configs[aKey] = aValue;
	}, 250);
}

function bindToCheckbox(aKey) {
	var node = document.getElementById(aKey);
	node.checked = configs[aKey];
	node.addEventListener('change', function() {
		throttledUpdate(aKey, node.checked);
	});
}

function bindToTextField(aKey) {
	var node = document.getElementById(aKey);
	node.value = configs[aKey];
	node.addEventListener('input', function() {
		throttledUpdate(aKey, node.value);
	});
}

document.addEventListener('DOMContentLoaded', function onReady() {
	document.removeEventListener('DOMContentLoaded', onReady);

	configs.load()
		.then(function() {
			bindToCheckbox('attrListEnabled');
			bindToTextField('attrList');
			bindToCheckbox('attrListRecursively');
		});
});
