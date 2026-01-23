/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  isRTL,
} from '/common/common.js';

import Options from '/extlib/Options.js';
import '/extlib/l10n.js';

/*const options = */new Options(configs);

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.toggle('rtl', isRTL());
}, { once: true });
