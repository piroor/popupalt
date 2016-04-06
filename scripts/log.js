/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var DEBUG = true;

function log(aMessage, ...aArgs)
{
	if (!DEBUG)
		return;

	if (aArgs.length > 0)
		console.log(aMessage, aArgs);
	else
		console.log(aMessage);
}
