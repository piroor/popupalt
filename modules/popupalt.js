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
 * The Initial Developer of the Original Code is SHIMODA Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2002-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): SHIMODA Hiroshi <piro@p.club.ne.jp>
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

const EXPORTED_SYMBOLS = ['PopupALT'];

var prefs = require('lib/prefs').prefs;

function PopupALT(aWindow) {
	this._window = aWindow;
	this.init();
}
PopupALT.prototype = {
	findParentNodeByAttr : function(aNode, aAttr) {
		if (!aNode) return null;

		return aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[@'+aAttr+' and not(@'+aAttr+' = "")][1]',
				aNode,
				null,
				Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},
	findParentNodesByAttr : function(aNode, aAttr) {
		if (!aNode) return [];

		var nodes = [];
		var result = aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[@'+aAttr+' and not(@'+aAttr+' = "")]',
				aNode,
				null,
				Ci.nsIDOMXPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
		for (var i = 0, maxi = result.snapshotLength; i < maxi; i++)
		{
			nodes.push(result.snapshotItem(i));
		}
		return nodes;
	},

	get tooltip() {
		return this._window.document.getElementById('aHTMLTooltip');
	},

	get attrlist() {
		return prefs.getPref('browser.chrome.tooltips.attrlist.enabled') ?
				prefs.getPref('browser.chrome.tooltips.attrlist') : null ;
	},


	onPopupShowing : function(aEvent) {
		var target = this._window.document.tooltipNode;
		while (
			target &&
			(
				target.nodeType != Ci.nsIDOMNode.ELEMENT_NODE ||
				!target.attributes.length
			)
			)
			target = target.parentNode;

		if (!target)
			return;

		var tooltiptext = this.attrlist ?
				this.constructTooltiptextFromAttributes(target) :
				this.constructTooltiptextFromImage(target) ;

		if (!tooltiptext || !tooltiptext.match(/\S/))
			return;

		var tooltip = this.tooltip;

		// hack for Google Toolbar
		if ('GTB_Tooltip' in window)
			tooltip.isGoogleTooltip = false;

		tooltip.removeAttribute('label');
		tooltip.setAttribute('label', tooltiptext);

		aEvent.stopPropagation();
	},

	formatTooltipText : function(aString) {
		return aString.replace(/[\r\t]/g, ' ').replace(/\n/g, '');
	},

	constructTooltiptextFromImage : function(aTarget) {
		if (
			aTarget.ownerDocument.contentType.indexOf('image') == 0 ||
			aTarget.localName.toLowerCase() != 'img' ||
			!aTarget.alt ||
			aTarget.title
			)
			return null;

		return this.findParentNodeByAttr(aTarget, 'title') ?
			null :
			this.formatTooltipText(String(aTarget.alt)) ;
	},

	constructTooltiptextFromAttributes : function(aTarget) {
		var attrlist = this.attrlist.split(/[\|,\s]+/);
		var recursive = prefs.getPref('browser.chrome.tooltips.attrlist.recursively');
		var foundList = {};
		for each (let attr in attrlist) {
			if (!attr) continue;

			let nodes = this.findParentNodesByAttr(aTarget, attr);
			if (!nodes.length) continue;

			for each (let node in nodes) {
				if (!node) continue;

				if (!node.getAttribute(attr))
					continue;

				if (!(node.nodeName in foundList))
					foundList[node.nodeName] = {
						_node : node
					};

				foundList[node.nodeName][attr] = node.getAttribute(attr);

				if (!recursive) break;
			}
		}

		var leaf;
		var list = [];
		for (let target in foundList) {
			let leaf = ['< '+target+' >'];
			let item = foundList[target];
			for (let attr in item)
				if (attr != '_node')
					leaf.push('  '+attr+' : '+this.formatTooltipText(item[attr]));

			list.push({
				node : item._node,
				text : leaf.join('\n')
			});
		}

		var tooltiptext = [];
		if (list.length) {
			list.sort(function(aA, aB) {
				return (aA.node.compareDocumentPosition(aB.node) & Ci.nsIDOMNode.DOCUMENT_POSITION_FOLLOWING) ? 1 : -1 ;
			});

			for each (let item in list)
				tooltiptext.push(item.text);
		}
		return tooltiptext.length ? tooltiptext.join('\n') : null ;
	},


	handleEvent : function(aEvent) {
		if (aEvent.target.id == 'aHTMLTooltip' &&
			aEvent.type == 'popupshowing')
			this.onPopupShowing(aEvent);
	},

	init : function() {
		this.tooltip.parentNode.addEventListener('popupshowing', this, true);
	},
	destroy : function() {
		this.tooltip.parentNode.removeEventListener('popupshowing', this, true);
		delete this._window;
	}
};


function shutdown() {
	prefs = undefined;
	PopupALT = undefined;
}

