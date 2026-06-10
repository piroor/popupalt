/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

document.addEventListener('DOMContentLoaded', async function onReady() {
  document.removeEventListener('DOMContentLoaded', onReady);

  const { configs, log } = await import(browser.runtime.getURL('/common/common.js'));

  let delayedUpdate = null;
  const PopupALT = {
    IMAGES_SELECTOR: '*|img[alt]:not([alt=""])',
    imageCovers:     new WeakMap(),

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
        'ancestor-or-self::*[@' + attr + ' and not(@' + attr + ' = "")]',
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
      return configs.attrListEnabled ? configs.attrList : null;
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
      }
      else {
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
        this.formatTooltipText(String(target.alt));
    },

    constructTooltiptextFromAttributes(target) {
      const attrlist = this.attrlist.split(/[\|,\s]+/);
      const recursive = configs.attrListRecursively;
      const foundList = {};
      for (const attr of attrlist) {
        if (!attr) continue;

        const nodes = this.findParentNodesByAttr(target, attr);
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
              $node: node
            };

          foundList[node.nodeName][attr] = node.getAttribute(realAttrName);

          if (!recursive) break;
        }
      }

      const list = [];
      for (const target in foundList) {
        const leaf = ['< ' + target + ' >'];
        const item = foundList[target];
        for (const attr in item)
          if (attr != '$node')
            leaf.push('  ' + attr + ' : ' + this.formatTooltipText(item[attr]));

        list.push({
          node: item.$node,
          text: leaf.join('\n')
        });
      }

      const tooltiptext = [];
      if (list.length) {
        list.sort((a, b) => {
          return (a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING) ? 1 : -1;
        });

        for (const item of list)
          tooltiptext.push(item.text);
      }
      return tooltiptext.length ? tooltiptext.join('\n') : null;
    },

    // --- Mobile (touch) support: native "title" tooltips are not shown on
    // Firefox for Android, so we render our own popup element. ---

    getAltText(node) {
      // Read-only text extraction, reusing existing logic without
      // mutating the "title" attribute (no overrideTitle side effect).
      while (node && node.nodeType != Node.ELEMENT_NODE)
        node = node.parentNode;
      if (!node)
        return null;
      return this.attrlist ?
        this.constructTooltiptextFromAttributes(node) :
        this.constructTooltiptextForAlt(node);
    },

    popupElement:     null,
    popupTextElement: null,
    popupLinkElement: null,
    touchActive:      false,

    ensurePopup() {
      if (this.popupElement && this.popupElement.isConnected)
        return this.popupElement;

      const popup = document.createElement('div');
      // Inline styles to stay independent from the page stylesheet.
      popup.style.cssText = [
        'position: fixed',
        'z-index: 2147483647',
        'box-sizing: border-box',
        'max-width: 80vw',
        'padding: 8px 10px',
        'border-radius: 6px',
        'background: rgba(0,0,0,0.88)',
        'color: #fff',
        'font: 14px/1.4 sans-serif',
        'pointer-events: auto',
        'box-shadow: 0 2px 8px rgba(0,0,0,0.4)',
        'display: none'
      ].join(';');

      const text = document.createElement('div');
      text.style.cssText = 'white-space: pre-wrap;';

      // Tappable link shown below the ALT text when the image is inside <a>.
      // Long-press on it triggers the native Android context menu.
      const link = document.createElement('a');
      link.style.cssText = [
        'display: block',
        'margin-top: 6px',
        'color: #7ec8f7',
        'font-size: 12px',
        'word-break: break-all',
        'text-decoration: underline'
      ].join(';');
      // Tap hides the popup so the native navigation can proceed cleanly.
      link.addEventListener('click', () => this.hidePopup());

      popup.appendChild(text);
      popup.appendChild(link);
      (document.body || document.documentElement).appendChild(popup);

      this.popupElement = popup;
      this.popupTextElement = text;
      this.popupLinkElement = link;
      return popup;
    },

    showPopup(target, text, x, _y) {
      this.ensurePopup();
      this.popupTextElement.textContent = text;

      // Show the link element only when the image is inside an <a href>.
      const anchor = target.closest ? target.closest('a[href]') : null;
      if (anchor) {
        this.popupLinkElement.href = anchor.href;
        this.popupLinkElement.textContent = anchor.href;
        this.popupLinkElement.style.display = 'block';
      }
      else {
        this.popupLinkElement.style.display = 'none';
      }

      // Position at the bottom of the viewport so the native context menu
      // (which appears in the middle/top) does not cover our popup.
      this.popupElement.style.display = 'block';
      const rect = this.popupElement.getBoundingClientRect();
      let left = x - rect.width / 2;
      left = Math.max(4, Math.min(left, window.innerWidth - rect.width - 4));
      this.popupElement.style.left = left + 'px';
      this.popupElement.style.top = (window.innerHeight - rect.height - 12) + 'px';
    },

    hidePopup() {
      if (this.popupElement)
        this.popupElement.style.display = 'none';
    },

    isPopupOpen() {
      return !!this.popupElement && this.popupElement.style.display != 'none';
    },

    handleTouchEvent(event) {
      switch (event.type) {
        case 'touchstart':
          // Dismiss an open popup when tapping outside of it.
          if (this.isPopupOpen() && !this.popupElement.contains(event.target))
            this.hidePopup();
          // Flag the gesture as touch so onContextMenu acts on it.
          this.touchActive = true;
          return;

        case 'touchend':
        case 'touchcancel':
          // Cleared after the long-press contextmenu has already fired.
          this.touchActive = false;
          return;
      }
    },

    onContextMenu(event) {
      // Only act on touch-originated long-press, never on desktop right-click.
      if (!this.touchActive)
        return;
      let target = null;
      for (const element of document.elementsFromPoint(event.clientX, event.clientY)) {
        if (element.matches(this.IMAGES_SELECTOR)) {
          target = element;
          break;
        }
      }
      if (!target)
        return;
      const text = this.getAltText(target);
      if (!text || !text.match(/\S/))
        return;
      // Show our ALT popup alongside the native context menu.
      // Note: preventDefault() is not honored by Firefox Android from content
      // scripts, so we let the native menu appear naturally.
      this.showPopup(target, text, event.clientX, event.clientY);
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
      // Touch handlers for mobile (Firefox for Android).
      const touchHandler = PopupALT.handleTouchEvent.bind(PopupALT);
      document.addEventListener('touchstart', touchHandler, { capture: true, passive: true });
      document.addEventListener('touchend', touchHandler, true);
      document.addEventListener('touchcancel', touchHandler, true);
      // Non-passive so preventDefault() can suppress the native menu on links.
      document.addEventListener('contextmenu', PopupALT.onContextMenu.bind(PopupALT), { capture: true, passive: false });
    });
});
