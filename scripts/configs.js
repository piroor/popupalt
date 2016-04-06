/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var configs = {
	defaults : {
		attrListEnabled : false,
		attrList : 'alt|src|data|title|href|cite|action|onclick|onmouseover|onsubmit',
		attrListRecursively : false
	},
	load : function()
	{
		this._applyValues(this.defaults);
		return new Promise((function(aResolve, aReject) {
			try {
				chrome.storage.local.get(this.defaults, (function(aValues) {
					this._applyValues(aValues);
					aResolve();
				}).bind(this));
			}
			catch(e) {
				aReject(e);
			}
		}).bind(this));
	},
	_applyValues : function(aValues)
	{	
		Object.keys(aValues).forEach(function(aKey) {
			this[aKey] = aValues[aKey];
		}, this);
	}
};
