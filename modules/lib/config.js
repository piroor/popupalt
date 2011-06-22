/**
 * @fileOverview Configuration dialog module for restartless addons
 * @author       SHIMODA "Piro" Hiroshi
 * @version      8
 *
 * @license
 *   The MIT License, Copyright (c) 2011 SHIMODA "Piro" Hiroshi.
 *   http://www.cozmixng.org/repos/piro/restartless-addon/trunk/license.txt
 * @url http://www.cozmixng.org/repos/piro/restartless-addon/trunk/
 */

const EXPORTED_SYMBOLS = ['config'];

'open,register,unregister,setDefault'.split(',').forEach(function(aSymbol) {
	exports[aSymbol] = function() {
		if (!config)
			throw new Error('config module was already unloaded!');
		return config[aSymbol].apply(config, arguments);
	};
});

/**
 * @class
 *   Provides features to manage custom configuration dialog.
 */
var config = {
	_configs : {},

	/**
	 * Opens a registered dialog bound to the given URI as a "non-modal"
	 * window. If there is existing window, then focus to it.
	 *
	 * @param {String} aURI
	 *   A URI which is bould to any configuration dialog.
	 * @param {nsIDOMWindow} aOwner
	 *   An owner window of the dialog.
	 *
	 * @returns {nsIDOMWindow}
	 *   The window object of the configuration dialog.
	 */
	open : function(aURI, aOwner)
	{
		aURI = this._resolveResURI(aURI);
		if (!(aURI in this._configs))
			return null;

		var current = this._configs[aURI];

		if (current.openedWindow && !current.openedWindow.closed) {
			current.openedWindow.focus();
			return current.openedWindow;
		}

		var source = Cc['@mozilla.org/variant;1']
						.createInstance(Ci.nsIWritableVariant);
		source.setFromVariant([this._builder.toSource(), current.source, aURI]);

		if (aOwner) {
			let parent = aOwner.top
							.QueryInterface(Ci.nsIInterfaceRequestor)
							.getInterface(Ci.nsIWebNavigation)
							.QueryInterface(Ci.nsIDocShell)
							.QueryInterface(Ci.nsIDocShellTreeNode)
							.QueryInterface(Ci.nsIDocShellTreeItem)
							.parent;
			if (parent)
				aOwner = parent.QueryInterface(Ci.nsIWebNavigation)
							.document
							.defaultView;
			else
				aOwner = null;
		}

		var features = 'chrome,titlebar,toolbar,centerscreen' +
						(Prefs.getBoolPref('browser.preferences.instantApply') ?
							',dialog=no' :
						aOwner ?
							',modal' :
							''
						);
		var window = Cc['@mozilla.org/embedcomp/window-watcher;1']
							.getService(Ci.nsIWindowWatcher)
							.openWindow(
								aOwner || null,
								'data:application/vnd.mozilla.xul+xml,'+encodeURIComponent(
									current.container
								),
								'_blank',
								features,
								source
							);
		if (features.indexOf('modal') < 0)
			return window;
	},

	/**
	 * Registers a source code of a XUL document for a configuration dialog
	 * to the given URI. It is used by open().
	 *
	 * @param {String} aURI
	 *   A URI which is the target URI. When the URI is loaded in a browser
	 *   window, then this system automatically opens a generated XUL window
	 *   from the source.
	 * @param {XML} aXML
	 *   A source of a XUL document for a configuration dialog defined as an
	 *   E4X object (XML object). Typical headers (<?xml version="1.0"?> and
	 *   an <?xml-stylesheet?> for the default theme) are automatically added.
	 *   Note: Any <script/> elements must be written as XHTML script elements.
	 *   (ex. <script xmlns="http://www.w3.org/1999/xhtml" ...> )
	 *   If you put XUL <script/>s in your dialog, they won't be evaluated
	 *   because they are inserted to the document dynamically. Only XHTML
	 *   script elements are evaluated by dynamic insertion.
	 */
	register : function(aURI, aXML)
	{
		var root = aXML.copy();
		delete root.*;
		var attributes = root.attributes();
		for each (let attribute in attributes)
		{
			delete root['@'+attribute.name()];
		}
		root.script = <script type="application/javascript">{ this._loader }</script>;

		var header = '<?xml version="1.0"?>\n'+
					'<!-- ' + aURI + ' -->\n'+
					'<?xml-stylesheet href="chrome://global/skin/"?>\n';

		var originalSettings = XML.settings();
		XML.ignoreWhitespace = true;
		XML.prettyPrinting = false;

		this._configs[this._resolveResURI(aURI)] = {
			container    : header+((new XMLList(root.toXMLString())).toXMLString()),
			source       : (new XMLList(aXML.toXMLString())).toXMLString(),
			openedWindow : null
		};

		XML.setSettings(originalSettings);
	},
	_loader : <![CDATA[
		eval('f='+arguments[0][0]);
		f(document, arguments[0][1], arguments[0][2]);
	]]>.toString()
		.replace(/\s\s+/g, ' '),
	_builder : function(aDocument, aSource, aSourceURI)
	{
		var root = aDocument.documentElement;
		var range = aDocument.createRange();
		range.selectNode(root);
		aDocument.replaceChild(range.createContextualFragment(aSource), root);
		range.detach();
		aDocument.defaultView._sourceURI = aSourceURI;
	},

	/**
	 * Unregisters a registeed dialog for the given URI.
	 *
	 * @param {String} aURI
	 *   A URI which have a registered dialog.
	 */
	unregister : function(aURI)
	{
		delete this._configs[this._resolveResURI(aURI)];
	},

	/**
	 * Unregisters a default value for the preference.
	 *
	 * @param {String} aKey
	 *   A key of preference.
	 * @param {nsIVariant} aValue
	 *   The default value. This must be a string, integer, or boolean.
	 */
	setDefault : function(aKey, aValue)
	{
		switch (typeof aValue)
		{
			case 'string':
				return DefaultPrefs.setCharPref(aKey, unescape(encodeURIComponent(aValue)));

			case 'number':
				return DefaultPrefs.setIntPref(aKey, parseInt(aValue));

			default:
				return DefaultPrefs.setBoolPref(aKey, !!aValue);
		}
	},

	observe : function(aSubject, aTopic, aData)
	{
		var uri = aSubject.location.href;
		if (
			uri == 'about:addons' ||
			uri == 'chrome://mozapps/content/extensions/extensions.xul' // Firefox 3.6
			) {
			this._onLoadManager(aSubject);
			return;
		}

		uri = this._resolveResURI(uri);
		if (uri in this._configs) {
			aSubject.setTimeout('window.close();', 0);
			this.open(uri);
		}
	},

	_resolveResURI : function(aURI)
	{
		if (aURI.indexOf('resource:') == 0)
			return ResProtocolHandler.resolveURI(IOService.newURI(aURI, null, null));
		return aURI;
	},

	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
			case 'unload':
				this._onUnloadManager(aEvent.currentTarget);
				return;

			case 'command':
				let target = aEvent.originalTarget;
				let uri;
				if (target.getAttribute('anonid') == 'preferences-btn' ||
					target.id == 'cmd_showItemPreferences')
					uri = target.ownerDocument.defaultView
							.gViewController
							.currentViewObj
							.getSelectedAddon()
							.optionsURL;
				else if (target.id == 'cmd_options') // Firefox 3.6
					uri = target.ownerDocument.defaultView
							.gExtensionsView
							.currentItem
							.getAttribute('optionsURL');
				if (uri &&
					(uri = this._resolveResURI(uri)) &&
					uri in this._configs) {
					this.open(uri, target.ownerDocument.defaultView);
					aEvent.stopPropagation();
					aEvent.preventDefault();
				}
				return;
		}
	},
	_onLoadManager : function(aWindow)
	{
		aWindow.addEventListener('command', this, true);
		aWindow.addEventListener('unload', this, true);
		this._managers.push(aWindow);
	},
	_onUnloadManager : function(aWindow)
	{
		aWindow.removeEventListener('command', this, true);
		aWindow.removeEventListener('unload', this, true);
		this._managers.splice(this._managers.indexOf(aWindow), 1);
	},
	_managers : []
};

var Prefs = Cc['@mozilla.org/preferences;1']
						.getService(Ci.nsIPrefBranch);
var DefaultPrefs = Cc['@mozilla.org/preferences-service;1']
						.getService(Ci.nsIPrefService)
						.getDefaultBranch(null);

var IOService = Cc['@mozilla.org/network/io-service;1']
						.getService(Ci.nsIIOService);
var ResProtocolHandler = IOService
						.getProtocolHandler('resource')
						.QueryInterface(Ci.nsIResProtocolHandler);

var ObserverService = Cc['@mozilla.org/observer-service;1']
						.getService(Ci.nsIObserverService);
ObserverService.addObserver(config, 'chrome-document-global-created', false);
ObserverService.addObserver(config, 'content-document-global-created', false);

var WindowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
						.getService(Ci.nsIWindowMediator)
let (managers = WindowMediator.getEnumerator('Addons:Manager')) {
	while (managers.hasMoreElements())
	{
		config._onLoadManager(managers.getNext().QueryInterface(Ci.nsIDOMWindow));
	}
}
let (browsers = WindowMediator.getEnumerator('navigator:browser')) {
	while (browsers.hasMoreElements())
	{
		let browser = browsers.getNext().QueryInterface(Ci.nsIDOMWindow);
		if (browser.gBrowser)
			Array.slice(browser.gBrowser.mTabContainer.childNodes)
				.forEach(function(aTab) {
				if (aTab.linkedBrowser.currentURI.spec == 'about:addons')
					config._onLoadManager(aTab.linkedBrowser.contentWindow);
			});
	}
}
let (managers = WindowMediator.getEnumerator('Extension:Manager')) { // Firefox 3.6
	while (managers.hasMoreElements())
	{
		config._onLoadManager(managers.getNext().QueryInterface(Ci.nsIDOMWindow));
	}
}

function shutdown()
{
	var windows = WindowMediator.getEnumerator(null);
	while (windows.hasMoreElements())
	{
		let window = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		if (window._sourceURI && window._sourceURI in config._configs)
			window.close();
	}

	config._managers.forEach(config._onUnloadManager, config);

	ObserverService.removeObserver(config, 'chrome-document-global-created');
	ObserverService.removeObserver(config, 'content-document-global-created');

	Prefs = void(0);
	DefaultPrefs = void(0);
	IOService = void(0);
	ResProtocolHandler = void(0);
	ObserverService = void(0);
	WindowMediator = void(0);

	config._configs = void(0);
	config._managers = void(0);
	config = void(0);
}
