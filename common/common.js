/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

function log(aMessage, ...aArgs)
{
	if (!configs.debug)
		return;

	if (aArgs.length > 0)
		console.log('popupalt: ' + aMessage, aArgs);
	else
		console.log('popupalt: ' + aMessage);
}

var configs = new Configs({
	attrListEnabled : false,
	attrList : 'alt|src|data|title|href|cite|action|onclick|onmouseover|onsubmit',
	attrListRecursively : false,
	debug : false
});
