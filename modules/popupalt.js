/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Popup ALT Attribute.
 *
 * The Initial Developer of the Original Code is YUKI "Piro" Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2002-2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ['PopupALT'];

function PopupALT(aWindow) {
	this._window = aWindow;
	this.init();
}
PopupALT.prototype = {
	MESSAGE_TYPE: '{61FD08D8-A2CB-46c0-B36D-3F531AC53C12}',
	SCRIPT_URL: 'chrome://popupalt/content/content-utils.js',

	init : function() {
		this._window.messageManager.loadFrameScript(this.SCRIPT_URL, true);
		this.handleMessage = this.handleMessage.bind(this);
		this._window.messageManager.addMessageListener(this.MESSAGE_TYPE, this.handleMessage);
	},
	destroy : function() {
		this._window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
			command : 'shutdown'
		});
		this._window.messageManager.removeDelayedFrameScript(this.SCRIPT_URL);
		this._window.messageManager.removeMessageListener(this.MESSAGE_TYPE, this.handleMessage);
		this.handleMessage = undefined;

		delete this._window;
	},

	handleMessage : function(aMessage)
	{
		var browser = aMessage.target;
		if (!browser || browser.localName != 'browser')
			return;

		switch (aMessage.json.command)
		{
			case 'tooltiptext':
				/*
				if (aMessage.json.text)
					browser.setAttribute('tooltiptext', aMessage.json.text);
				else
					browser.removeAttribute('tooltiptext');
				*/
				return;
		}
	}
};


function shutdown() {
	PopupALT = undefined;
}

