# Migration story of the Popup ALT Attribute from XUL/XPCOM to WebExtensions

Hello, addon developers. My name is [YUKI Hiroshi aka Piro](https://github.com/piroor/), a developer of Firefox addon.

For long years I developed Firefox/Thunderbird addons [personally](https://addons.mozilla.org/firefox/user/piro-piro_or/#my-submissions) and [on business](https://addons.mozilla.org/firefox/user/clearcode-inc/#my-submissions), based on XUL and XPCOM.
By some reasons I didn't migrate my addons from such a legacy style to SDK-based, but recently I've started to research [what APIs are required to migrate my addons to WebExtensions](https://docs.google.com/spreadsheets/d/1gn8fFl4iseOqLEz_UIEbHCEZ7R01VW2eDlxJaFRNKEo), because [Mozilla announced that XUL/XPCOM addons will be ended at the end of 2017](https://wiki.mozilla.org/Add-ons/developer/communication).
And I realized that some addons are possibly migretable only with [currently available APIs](https://developer.mozilla.org/en-US/Add-ons/WebExtensions).
The [Popup ALT Attribute](https://addons.mozilla.org/firefox/addon/popup-alt-attribute/) is one of such addons.

Recently [I've successfully done it](https://github.com/piroor/popupalt/tree/webextensions), so let's describe how I did that.


## What's the addon?

At first I explain what the addon Popup ALT Attribute is.
It is one of ancient addons [started on 2002](http://piro.sakura.ne.jp/xul/_popupalt.html.en#focused-folding-item%28folding-item-history-1%29), to show what is written at the `alt` attribute of `img` HTML elements in webpages.
By default Firefox shows only the `title` attribute as a tooltip.
For example:

    <img src="dog.jpg" title="a photo of a dog">:
      A tooltip is shown with a text "a photo of a dog".
    <img src="dog.jpg" alt="(a photo of a dog)">:
      No tooltip is shown by default.
      With the addon, a tooltip appears with a text "(a photo of a dog)"
      like ancient Netscape Navigator 4 or MSIE.

Initially the addon was [implemented to replace an internal function `FillInHTMLTooltip()` of Firefox itself, with my custom version.](https://github.com/piroor/popupalt/blob/3615892354fe05f2cae6bab89708ee62854f36b8/content/popupalt/popupalt.xul)


## Step 1: Isolation from destructive changes - made dyanmically installable/uninstallable

At April 2011 I migrated it to [a bootstrapped extension.](https://github.com/piroor/popupalt/blob/6cc2e980f7b7d275defb49848eb3ab82d8b905bf/modules/popupalt.js)
Instead of replacing/redefining the internal function directly, it became to be triggered by the `popupshowing` DOM event, and canceled the event by `Event.prototype.stopPropagation()` to override Firefox's default behaviors.
*Because the change is not destructive, it could be uninstalled safely.*

I think it was the baseline of the migration for WebExtensions.
Even if you don't migrate to bootsrapped, *I strongly recommend you to rewrite your addon only with such safer method, without any destructive changes - XUL overlaying, function replacement, and so on.*

(In other words, if your addon is not migratable to bootstrapped, then you possibly have to wait that some new WebExtensions APIs are landed on Firefox itself. Sadly some my addons are here...)


## Step 2: Isolation from Firefox's internal functions

At Febrary 2016 I migrated it to ready for e10s.
To be honest *it was the largest barrier on my case*.
Through migration of Firefox itself for e10s, implementation to fill the tooltip was moved to [the lower layer written in C++](http://mxr.mozilla.org/mozilla-esr45/source/embedding/browser/nsDocShellTreeOwner.cpp#1050) and *I had to give up the old approach which overrides the partial operation to construct tooltip content*, because all operations to construct tooltip were completely enclosed in the low layer.

Instead I noticed that Firefox always shows tooltip when an HTML element has its own `title` attribute.
So, I decided to copy the value of `alt` attribute to the `title` attribute for hover-ed HTML elements themselves, when any `mousemove` event is fired in webpages.
For example:

    Before:
    <img src="dog.jpg" alt="(a photo of a dog)">:
    
    After:
    <img src="dog.jpg" alt="(a photo of a dog)" title="(a photo of a dog)">:

As the result, most codes were successfully separated from the main script (executed in the chrome process) to [a frame script](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/content/content-utils.js) (executed in the content process), and [the main script became just a loader for the frame script.](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/modules/popupalt.js)

You may not need to migrate your addon for e10s for now, because your addon will become e10s friendly after successful migration to WebExtensions.
*But you still need to isolate your codes from Firefox's internal operation flow.*
We XUL/XPCOM-based addon authors know Firefox's internal implementation deeply, so sometimes we think like a developer of Firefox and try to implement an addon just like a "patch".
However, in WebExtensions world we are not allowed to access internal opeartions of Firefox itself.
*Please forget your existing knowledge about inside of Firefox* - now you must think how to get what you want only via public APIs.
In other workds, you must change your mind from "how to *inject my operations* into the operations flow of Firefox itself partially?" to "how to reuse Firefox's known behavior and get *the result* what I really want, only with public APIs?"

(Yes, if your addon strongly depends on Firefox's internal functions, then you have to wait new standard Web APIs or Web Extensions APIs. Most of my addons are here.)


## Step 3: Re-format in the WebExtensions style

I read [the tutorial to build a new simple WebExtensions-based addon from scratch](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Your_first_WebExtension) before migration.
And I realized that bootstrapped extensions are similar to WebExtensions addons:

 * They are dynamically installed and uninstalled.
 * Mainly based on JavaScript codes and some static manifest files.

My addon was easily re-formatted as an WebExtensions addon, because I already migrated it to bootstrapped.

This is the initial version of the `manifest.json` I wrote.
There were no localization and options UI:

    {
      "manifest_version": 2,
      "name": "Popup ALT Attribute",
      "version": "4.0a1",
      "description": "Popups alternate texts of images or others like NetscapeCommunicator(Navigator) 4.x, and show long descriptions in the multi-row tooltip.",
      "icons": { "32": "icons/icon.png" },
      "applications": {
        "gecko": { "id": "{61FD08D8-A2CB-46c0-B36D-3F531AC53C12}",
                   "strict_min_version": "48.0a1" }
      },
      "content_scripts": [
        { "all_frames": true,
          "matches": ["<all_urls>"],
          "js": [
            "content_scripts/content.js"
          ],
          "run_at": "document_start" }
      ]
    }

Now the addon has [a frame script](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/content/content-utils.js) and [a loader for it](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/modules/popupalt.js).
On the other hand, `manifest.json` can have some manifest keys to describe how scripts are loaded.
It means that I don't need to put my custom loaders in the package anymore.
Actually, a script for any webpage can be loaded with the `content_scripts` rule in the above sample.
See [the spec of `content_scripts`](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/content_scripts) for more details.

So finally only 3 files were left.
Before:

    + install.rdf
    + icon.png
    + [components]
    + [modules]
    + [content]
        + content-utils.js

And after:

    + manifest.json (migrated from install.rdf)
    + [icons]
    |   + icon.png (moved)
    + [content_scripts]
        + content.js (moved and migrated from content-utils.js)

And I still had to isolate [my frame script](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/content/content-utils.js) from XPCOM.

 * The script touched to `nsIPrefBranch` and some XPCOM components via XPConnect, so they were temporarily commented out.
 * User preferences were not available and only default configurations were there as fixed values.
 * Some constant properties accessed like `Ci.nsIDOMNode.ELEMENT_NODE` had to be replaced as `Node.ELEMENT_NODE`.
 * The listener for `mousemove` events from webpages was attached to the global namespace for a frame script, but it was re-attached to the `document` itself of each webpage, because the script was now executed on each webpage directly.


## Step 4: Localization

For the old `install.rdf` I put localized description.
In WebExtensions addons I had to do it in different way.
See [how to localize messages](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Internationalization) for details.
In short I did followings.

Added files to define localized descriptions:

    + manifest.json
    + [icons]
    + [content_scripts]
    + [_locales]
        + [en_US]
        |   + messages.json (added)
        + [ja]
            + messages.json (added)

Note, `en_US` is different from `en-US` in `install.rdf`.

English locale, `_locales/en_US/messages.json` was:

    {
      "name": { "message": "Popup ALT Attribute" },
      "description": { "message": "Popups alternate texts of images or others like NetscapeCommunicator(Navigator) 4.x, and show long descriptions in the multi-row tooltip." }
    }

Japanese locale, `_locales/ja/messages.json` was also.
And, I had to update my `manifest.json` to embed localized messages:

    {
      "manifest_version": 2,
      "name": "__MSG_name__",
      "version": "4.0a1",
      "description": "__MSG_description__",
      "default_locale": "en_US",
      ...

`__MSG_****__` in string values are automatically replaced to localized messages.
You need to specify the default locale manually via the `default_locale` key.

Sadly Firefox 45 does not support the localization feature.
You need to use Nightly 48.0a1 or newer to try localization.


## Step 5: User preferences

Currently WebExtensions does not provide any feature completely compatible to `nsIPrefBranch`.
Instead there are [simple storage APIs](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage).
It can be used like an alternative of `nsIPrefBranch` to set/get user preferences.
This addon had no configuration UI but had some secret preferences to control its advanced features, so I did it for future migrations of my other addons, as a trial.

Then I encountered a large limitation: *the storage API is [not available in content scripts](https://bugzilla.mozilla.org/show_bug.cgi?id=1197346).*
I had to create a background script just to access the storage, and communicate with it [via the inter-sandboxes messaging system](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime).

Finally, [I created a tiny library to do that](https://github.com/piroor/webextensions-lib-configs).
I don't describe how I did it here, but if you hope to know details, please see [the source](https://github.com/piroor/webextensions-lib-configs/blob/master/Configs.js).
There are just 177 lines.

I had to update my `manifest.json` to use the library from both the background page and the content script, like:

      "background": {
        "scripts": [
          "common/Configs.js", /* the library itself */
          "common/common.js"   /* codes to use the library */
        ]
      },
      "content_scripts": [
        { "all_frames": true,
          "matches": ["<all_urls>"],
          "js": [
            "common/Configs.js", /* the library itself */
            "common/common.js",  /* codes to use the library */
            "content_scripts/content.js"
          ],
          "run_at": "document_start" }
      ]

Scripts listed in a same section share a namespace for the section.
I didn't have to write any code like `require()` to load a script from others.
Instead I had to be careful about the listing order of scripts - put a script requiring a library after the library itself, in each list.

One left problem is: how to do something like the `about:config` or the [MCD](https://developer.mozilla.org/en-US/docs/MCD,_Mission_Control_Desktop_AKA_AutoConfig) - general methods to control secret preferences across addons.
For my business clients, I ordinarily provide addons and use MCD to lock their configurations.
(There are some common requirements on business use of Firefox, so combinations of addons and MCD are reasonable than creating private builds of Firefox with different configuration for each client.)
I think I still have to research around this point.


## Step 6: Options UI

WebExtensions provides [a feature to create options pages for addons](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/options_ui).
It is also not supported on Firefox 45, so you need to use Nightly 48.0a1 for now.
As previously I told, this addon didn't have its configuration UI, but I newly implemented it as a trial.

In XUL/XPCOM addons rich UI elements - `<checkbox>`, `<textbox>`, `<menulist>`, and more - are available, but as I told, XUL is going to end.
So I had to implement custom configuration UI based on pure HTML and JavaScript.
(If you need more rich UI elements, some known libraries for web applications will help you.)

On this step I created two libraries:

 * [A helper to bind configurations to UI elements](https://github.com/piroor/webextensions-lib-options).
 * [A helper to apply localized messages to a static HTML](https://github.com/piroor/webextensions-lib-l10n).


## Conclusion

As above, I've successfully migrated my Popup ALT Attribute addon from XUL/XPCOM to WebExtensions.
Now it is [just a branch](https://github.com/piroor/popupalt/tree/webextensions) but I'll release it after Firefox 48 is released.

Here are reasons why I could do it:

 * It was a bootstrapped addon.
   I already isolated the addon from all destructive changes.
 * Core implementation of the addon was similar to a simple user script (after e10s migration.)
   Essential actions of the addon were enclosed inside the content area, and no privilege was required to do that.

However, it is a rare case for me.
My other 40+ addons require some privilege, and/or they work outside the content area.
For example:

 * [Open Bookmarks in New Tabs](https://addons.mozilla.org/firefox/addon/open-bookmarks-in-new-tab/) forces Firefox to open any bookmark in a new tab with simple left click.
   To migrate it to WebExtensions, I need something API to control where a bookmark is opened in.
   [New Tab from Location Bar](https://addons.mozilla.org/firefox/addon/new-tab-from-location-bar/) also requires similar API for the location bar.
 * [Text Link](https://addons.mozilla.org/firefox/addon/text-link/) provides ability to open a URL text like a link via lazy double-click without carefully selecting, and ability to copy only URL texts extracted from the selection.
   It requires some XPCOM components to detect URL-like text correctly.
   To migrate it to WebExtensions completely, something API to get selection string as rendered (for example, `<br>`s will produce virtual line break. `Range.prototype.toSring()` does not refrect them.) and something like [RangeFinder](http://w3c.github.io/web-annotation/api/rangefinder/).
 * [Tree Style Tabs](https://addons.mozilla.org/firefox/addon/tree-style-tab/) changes the orientation of Firefox's tab bar itself to provide vertical tab bar.
   As the result it could be combined with other tab-related addons like [ColorfulTabs](https://addons.mozilla.org/firefox/addon/colorfultabs/).
   Sadly I have no idea what API can do that yet...
   (So possibly I need to give up some essential features of the addon.)

Currently supplied WebExtensions are based on Google Chrome's spec, and they are designed just to implement some typical type extensions.
On the other hand, we sometimes developed non-typical addons based on our imagination, because XUL-based addons can work like dynamic "patch" around running codes of Firefox.
[Most of my cases are such non-typical addons](https://docs.google.com/spreadsheets/d/1gn8fFl4iseOqLEz_UIEbHCEZ7R01VW2eDlxJaFRNKEo).
I have to do triage, plan, and request [new APIs](https://wiki.mozilla.org/WebExtensions/NewAPIs) not only for me but for other XUL/XPCOM addon developers also.

Thank you for reading.
