/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

function bindBoolean(aKey, aId) {
	var node = document.getElementById(aId);
	node.checked = configs[aKey];
	node.addEventListener('change', function() {
		configs[aKey] = node.checked;
	});
}

document.addEventListener('DOMContentLoaded', function onReady() {
	document.removeEventListener('DOMContentLoaded', onReady);

	configs.load()
		.then(function() {
			bindBoolean('attrListEnabled', 'configs.attrListEnabled');
			document.getElementById('configs.attrList')
				.value = configs.attrList;
			bindBoolean('attrListRecursively', 'configs.attrListRecursively');
		});
});
