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

document.addEventListener('DOMContentLoaded', function onReady() {
	document.removeEventListener('DOMContentLoaded', onReady);

	var delayedUpdate = null;
	var PopupALT = {
		findParentNodeByAttr : function(aNode, aAttr) {
			if (!aNode) return null;

			return aNode.ownerDocument.evaluate(
					'ancestor-or-self::*[@'+aAttr+' and not(@'+aAttr+' = "")][1]',
					aNode,
					null,
					XPathResult.FIRST_ORDERED_NODE_TYPE,
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
					XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
					null
				);
			for (var i = 0, maxi = result.snapshotLength; i < maxi; i++)
			{
				nodes.push(result.snapshotItem(i));
			}
			return nodes;
		},

		get attrlist() {
			return configs.attrListEnabled ?
				 configs.attrList : null ;
		},

		handleEvent : function(aEvent) {
			var target = aEvent.target;
			var window = (target.ownerDocument || target).defaultView;

			switch (aEvent.type)
			{
				case 'mousemove':
					if (delayedUpdate)
						window.clearTimeout(delayedUpdate);
					delayedUpdate = window.setTimeout((function() {
						delayedUpdate = null;
						this.updateTooltiptext(target);
					}).bind(this), 100);
					return;

				case 'unload':
					document.removeEventListener('mousemove', PopupALT, true);
					document.removeEventListener('unload', PopupALT);
					PopupALT = undefined;
					return;
			}
		},

		updateTooltiptext : function(aTarget) {
			while (
				aTarget &&
				(
					aTarget.nodeType != Node.ELEMENT_NODE ||
					!aTarget.attributes.length
				)
				)
				aTarget = aTarget.parentNode;

			if (!aTarget)
				return;

			if (!aTarget.hasAttribute('data-popupalt-original-title'))
				aTarget.setAttribute('data-popupalt-original-title', aTarget.getAttribute('title') || '');

			var tooltiptext = this.attrlist ?
					this.constructTooltiptextFromAttributes(aTarget) :
					this.constructTooltiptextForAlt(aTarget) ;

			if (!tooltiptext || !tooltiptext.match(/\S/))
				return;

			aTarget.setAttribute('title', tooltiptext);
		},

		formatTooltipText : function(aString) {
			return aString.replace(/[\r\t]/g, ' ').replace(/\n/g, '');
		},

		constructTooltiptextForAlt : function(aTarget) {
			if (
				aTarget.ownerDocument.contentType.indexOf('image') == 0 ||
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
			var recursive = configs.attrListRecursively;
			var foundList = {};
			for (let attr of attrlist) {
				if (!attr) continue;

				let nodes = this.findParentNodesByAttr(aTarget, attr);
				if (!nodes.length) continue;

				for (let node of nodes) {
					if (!node) continue;

					let realAttrName = attr;
					if (attr == 'title')
						realAttrName = 'data-popupalt-original-title';
					if (!node.getAttribute(realAttrName))
						continue;

					if (!(node.nodeName in foundList))
						foundList[node.nodeName] = {
							_node : node
						};

					foundList[node.nodeName][attr] = node.getAttribute(realAttrName);

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
					return (aA.node.compareDocumentPosition(aB.node) & Node.DOCUMENT_POSITION_FOLLOWING) ? 1 : -1 ;
				});

				for (let item of list)
					tooltiptext.push(item.text);
			}
			return tooltiptext.length ? tooltiptext.join('\n') : null ;
		}
	};

	log('load configs');
	configs.$loaded
		.catch(function(e) {
			log('error: ' + e);
		})
		.then(function() {
			log('configs loaded');
			document.addEventListener('mousemove', PopupALT, true);
			document.addEventListener('unload', PopupALT);
		});
});
