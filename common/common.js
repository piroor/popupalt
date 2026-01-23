/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';

export const configs = new Configs({

  attrListEnabled:      false,
  attrList:             'alt|src|data|title|href|cite|action|onclick|onmouseover|onsubmit',
  attrListRecursively:  false,
  supportCoveredImages: true,
  debug:                false
});

export function log(message, ...args) {
  if (!configs || !configs.debug)
    return;

  console.log('popupalt: ' + message, ...args);
}

const RTL_LANGUAGES = new Set([
  'ar',
  'he',
  'fa',
  'ur',
  'ps',
  'sd',
  'ckb',
  'prs',
  'rhg',
]);

export function isRTL() {
  const lang = (
    navigator.language ||
    navigator.userLanguage ||
    //(new Intl.DateTimeFormat()).resolvedOptions().locale ||
    ''
  ).split('-')[0];
  return RTL_LANGUAGES.has(lang);
}
