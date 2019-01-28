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
 * Portions created by the Initial Developer are Copyright (C) 2002-2019
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

  let delayedUpdate = null;
  const PopupALT = {
    IMAGES_SELECTOR: '*|img[alt]:not([alt=""])',

    findParentNodeByAttr(node, attr) {
      if (!node) return null;

      return node.ownerDocument.evaluate(
        'ancestor-or-self::*[@'+attr+' and not(@'+attr+' = "")][1]',
        node,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    },
    findParentNodesByAttr(node, attr) {
      if (!node)
        return [];

      const nodes = [];
      const result = node.ownerDocument.evaluate(
        'ancestor-or-self::*[@'+attr+' and not(@'+attr+' = "")]',
        node,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      for (let i = 0, maxi = result.snapshotLength; i < maxi; i++) {
        nodes.push(result.snapshotItem(i));
      }
      return nodes;
    },

    get attrlist() {
      return configs.attrListEnabled ? configs.attrList : null ;
    },

    handleEvent(event) {
      const target = event.target;
      const window = (target.ownerDocument || target).defaultView;

      switch (event.type) {
        case 'mousemove':
          if (delayedUpdate)
            window.clearTimeout(delayedUpdate);
          delayedUpdate = window.setTimeout((function() {
            delayedUpdate = null;
            this.onHover(target);
          }).bind(this), 100);
          return;

        case 'unload':
          document.removeEventListener('mousemove', PopupALT, true);
          window.removeEventListener('unload', PopupALT);
          this.observer.disconnect();
          this.observer = undefined;
          PopupALT = undefined;
          return;
      }
    },

    startObserve() {
      this.observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          this.onMutated(mutation);
        }
      });
      this.observer.observe(
        document.body || document.documentElement,
        { attributes: true,
          attributeFilter: ['alt'],
          childList: true,
          subtree: true }
      );
    },

    onMutated(mutation) {
      log('mutation ', mutation);
      switch (mutation.type) {
        case 'attributes':
          if (mutation.attributeName == 'alt' &&
              mutation.target.matches(this.IMAGES_SELECTOR))
            this.updateTooltiptext(mutation.target);
          break;

        case 'childList':
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.matches(this.IMAGES_SELECTOR))
                this.updateTooltiptext(node);
              else if (node.hasChildNodes())
                this.updateTooltipOfAllImages(node);
            }
          }
          break;
      }
    },

    updateTooltipOfAllImages(parent) {
      log('updateTooltipOfAllImages ', parent);
      const images = parent.querySelectorAll(this.IMAGES_SELECTOR);
      log('  images: ', images);
      for (const image of images) {
        this.updateTooltiptext(image);
      }
    },

    onHover(target) {
      while (target &&
             (target.nodeType != Node.ELEMENT_NODE ||
              target.attributes.length == 0)) {
        target = target.parentNode;
      }

      if (!target)
        return;

      this.updateTooltiptext(target, { hover: true });
    },

    updateTooltiptext(target, options = {}) {
      log('updateTooltiptext ', target);

      let tooltiptext;
      if (this.attrlist) {
        if (!target.hasAttribute('data-popupalt-original-title'))
          target.setAttribute('data-popupalt-original-title', target.getAttribute('title') || '');

        tooltiptext = this.constructTooltiptextFromAttributes(target);
      } else {
        tooltiptext = this.constructTooltiptextForAlt(target);
      }
      log('  tooltiptext: ', tooltiptext);

      if (!tooltiptext || !tooltiptext.match(/\S/))
        return;

      this.setTooltiptext(target, tooltiptext, options);
    },

    setTooltiptext(target, tooltiptext, options = {}) {
      target.setAttribute('title', tooltiptext);

      if (options.hover)
        return;

      const rect = target.getBoundingClientRect();
      const x = rect.left + (rect.width / 2);
      const y = rect.top + (rect.height / 2);
      const targetFromPoint = document.elementFromPoint(x, y);
      log('  targetFromPoint: ', target, rect, { x, y }, targetFromPoint);
      if (targetFromPoint &&
          targetFromPoint != target &&
          !targetFromPoint.hasAttribute('title')) {
        if (this.attrlist &&
            !targetFromPoint.hasAttribute('data-popupalt-original-title'))
          targetFromPoint.setAttribute('data-popupalt-original-title', targetFromPoint.getAttribute('title') || '');
        targetFromPoint.setAttribute('title', tooltiptext);
        log('  targetFromPoint => set ');
      }
    },

    formatTooltipText(string) {
      return string.replace(/[\r\t]/g, ' ').replace(/\n/g, '');
    },

    constructTooltiptextForAlt(target) {
      if (target.ownerDocument.contentType.indexOf('image') == 0 ||
          !target.alt ||
          target.title)
        return null;

      return this.findParentNodeByAttr(target, 'title') ?
        null :
        this.formatTooltipText(String(target.alt)) ;
    },

    constructTooltiptextFromAttributes(target) {
      const attrlist = this.attrlist.split(/[\|,\s]+/);
      const recursive = configs.attrListRecursively;
      const foundList = {};
      for (let attr of attrlist) {
        if (!attr) continue;

        let nodes = this.findParentNodesByAttr(target, attr);
        if (!nodes.length) continue;

        for (const node of nodes) {
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

      let leaf;
      const list = [];
      for (const target in foundList) {
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

      const tooltiptext = [];
      if (list.length) {
        list.sort((a, b) => {
          return (a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING) ? 1 : -1 ;
        });

        for (let item of list)
          tooltiptext.push(item.text);
      }
      return tooltiptext.length ? tooltiptext.join('\n') : null ;
    }
  };

  log('load configs');
  configs.$loaded
    .catch(e => {
      log('error: ' + e);
    })
    .then(() => {
      log('configs loaded');
      document.addEventListener('mousemove', PopupALT, true);
      window.addEventListener('unload', PopupALT);
      PopupALT.updateTooltipOfAllImages(document.documentElement);
      PopupALT.startObserve();
    });
});
