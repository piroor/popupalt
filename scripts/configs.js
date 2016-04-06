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
	_lastValues : {},
	get _keys()
	{
		delete this._keys;
		return this._keys = Object.keys(this.defaults);
	},
	get _shouldUseStorage()
	{
		return typeof chrome.storage !== 'undefined';
	},
	_log : function(aMessage, ...aArgs)
	{
		var type = this._shouldUseStorage ? 'storage' : 'bridge' ;
		log('configs[' + type + '] ' + aMessage, ...aArgs);
	},
	load : function()
	{
		this._log('load');
		if (this._promisedLoad)
			return this._promisedLoad;

		this._applyValues(this.defaults);
		chrome.runtime.onMessage.addListener(this._onMessage.bind(this));

		if (this._shouldUseStorage) { // background mode
			this._log('load: try load from storage');
			return this._promisedLoad = new Promise((function(aResolve, aReject) {
				try {
					chrome.storage.local.get(this.defaults, (function(aValues) {
						this._log('load: loaded', aValues);
						this._applyValues(aValues);
						this._notifyLoaded();
						aResolve();
					}).bind(this));
				}
				catch(e) {
					this._log('load: failed', e);
					aReject(e);
				}
			}).bind(this));
		}
		else { // content mode
			this._log('load: initialize promise');
			this._promisedLoad = new Promise((function(aResolve, aReject) {
				this._promisedLoadResolver = aResolve;
			}).bind(this))
				.then((function(aValues) {
					this._log('load: promise resolved');
					this._applyValues(aValues);
				}).bind(this));
			chrome.runtime.sendMessage({
				type : 'configs.load'
			});
			return this._promisedLoad;
		}
	},
	_applyValues : function(aValues)
	{
		Object.keys(aValues).forEach(function(aKey) {
			this._lastValues[aKey] = aValues[aKey];
			if (aKey in this)
				return;
			Object.defineProperty(this, aKey, {
				get: (function() {
					return this._lastValues[aKey];
				}).bind(this),
				set: (function(aValue) {
					this._log('set: ' + aKey + ' = ' + aValue);
					this._lastValues[aKey] = aValue;
					this._notifyUpdated(aKey);
					return aValue;
				}).bind(this)
			});
		}, this);
	},
	_onMessage : function(aMessage)
	{
		this._log('onMessage: ' + aMessage.type);
		switch (aMessage.type)
		{
			// background
			case 'configs.load':
				this.load().then(this._notifyLoaded.bind(this));
				break;
			case 'configs.update':
				this[aMessage.key] = aMessage.value;
				break;

			// content
			case 'configs.load.response':
				if (this._promisedLoadResolver)
					this._promisedLoadResolver(aMessage.values);
				delete this._promisedLoadResolver;
				break;
			case 'configs.updated':
				this._lastValues[aMessage.key] = aMessage.value;
				break;
		}
	},
	_notifyLoaded : function()
	{
		chrome.tabs.query({}, (function(aTabs) {
			aTabs.forEach(function(aTab) {
				chrome.tabs.sendMessage(aTab.id, {
					type   : 'configs.load.response',
					values : this._lastValues
				});
			}, this);
		}).bind(this));
	},
	_notifyUpdated : function(aKey)
	{
		var value = this[aKey];
		if (this._shouldUseStorage) {
			this._log('broadcast updated config: ' + aKey + ' = ' + value);
			chrome.tabs.query({}, (function(aTabs) {
				aTabs.forEach(function(aTab) {
					chrome.tabs.sendMessage(aTab.id, {
						type  : 'configs.updated',
						key   : aKey,
						value : value
					});
				}, this);
			}).bind(this));
		}
		else {
			this._log('request to store config: ' + aKey + ' = ' + value);
			chrome.runtime.sendMessage({
				type  : 'configs.update',
				key   : aKey,
				value : value
			});
		}
	}
};

configs.load();
