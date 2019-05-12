/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

document.addEventListener('DOMContentLoaded', function onReady() {
  document.removeEventListener('DOMContentLoaded', onReady);

  let delayedUpdate = null;
  const PopupALT = {
    IMAGES_SELECTOR: '*|img[alt]:not([alt=""])',
    imageCovers: new WeakMap(),

    findParentNodeWithOwnTitle(node) {
      if (!node)
        return null;

      return node.ownerDocument.evaluate(
        `ancestor-or-self::*[
           @title and
           not(@title = "") and
           (not(@data-popupalt-original-title) or
            @title = @data-popupalt-original-title)
         ][1]`,
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
            this.onHover(event);
          }).bind(this), 100);
          return;

        case 'unload':
          document.removeEventListener('mousemove', PopupALT, true);
          window.removeEventListener('unload', PopupALT);
          PopupALT = undefined;
          return;
      }
    },

    async onHover(event) {
      let target = event.target;
      while (target &&
             target.nodeType != Node.ELEMENT_NODE) {
        target = target.parentNode;
      }

      if (!target)
        return;

      const coveringElements = new Set();
      if (configs.supportCoveredImages) {
        log('finding coveringElements');
        for (const element of document.elementsFromPoint(event.clientX, event.clientY)) {
          log('  element: ', element);
          if (element.matches(this.IMAGES_SELECTOR)) {
            target = element;
            break;
          }
          coveringElements.add(element);
        }
      }

      const tooltiptext = this.updateTooltiptext(target);

      if (this.imageCovers.has(target)) {
        const covers = this.imageCovers.get(target);
        for (const element of covers) {
          this.clearTitle(element);
        }
      }

      if (coveringElements.size > 0 && tooltiptext) {
        for (const element of coveringElements) {
          this.overrideTitle(element, tooltiptext);
        }
        this.imageCovers.set(target, coveringElements);
      }
    },
    overrideTitle(element, title) {
      const originalTitle = element.getAttribute('title');
      if (!element.dataset.popupaltOriginalTitle && originalTitle != '')
        element.dataset.popupaltOriginalTitle = originalTitle;
      // There is only one way to override tooltip of an element is: using its "title" attribute.
      // See also: https://hg.mozilla.org/mozilla-central/file/bd9c3f3f61b1/toolkit/components/tooltiptext/TooltipTextProvider.js
      element.setAttribute('title', title);
    },
    clearTitle(element) {
      if (element.dataset.popupaltOriginalTitle) {
        element.setAttribute('title', element.dataset.popupaltOriginalTitle);
      }
      else {
        element.removeAttribute('title');
      }
    },

    updateTooltiptext(target) {
      log('updateTooltiptext ', target);

      let tooltiptext;
      if (this.attrlist) {
        while (target &&
               target.attributes.length == 0) {
          target = target.parentNode;
        }
        if (!target)
          return null;
        tooltiptext = this.constructTooltiptextFromAttributes(target);
      } else {
        tooltiptext = this.constructTooltiptextForAlt(target);
      }
      log('  tooltiptext: ', tooltiptext);

      if (!tooltiptext || !tooltiptext.match(/\S/))
        return null;

      if (target.getAttribute('title') != tooltiptext)
        this.overrideTitle(target, tooltiptext);
      return tooltiptext;
    },

    formatTooltipText(string) {
      return string.replace(/[\r\t]/g, ' ').replace(/\n/g, '');
    },

    constructTooltiptextForAlt(target) {
      if (target.ownerDocument.contentType.indexOf('image') == 0 ||
          !target.alt ||
          (target.title &&
           target.title != target.alt)) {
        return null;
      }
      return this.findParentNodeWithOwnTitle(target) ?
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
    });
});
