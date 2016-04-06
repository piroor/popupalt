/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

document.addEventListener('DOMContentLoaded', function onReady() {
	document.removeEventListener('DOMContentLoaded', onReady);
	var textNodes = document.evaluate(
			'descendant::text()[contains(self::text(), "__MSG_")]',
			document,
			null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null
		);
	for (let i = 0, maxi = textNodes.snapshotLength; i < maxi; i++)
	{
		let text = textNodes.snapshotItem(i);
		text.nodeValue = text.nodeValue.replace(/__MSG_(.+?)__/g, function(aMatched) {
			var key = aMatched.slice(6, -2);
			return chrome.i18n.getMessage(key);
		});
	}
});
