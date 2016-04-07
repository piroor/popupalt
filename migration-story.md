# Migration story of the Popup ALT Attribute from XUL/XPCOM to WebExtensions

Hello, addon developers. I'm [YUKI Hiroshi aka Piro](https://github.com/piroor/), a developer of Firefox addon.

For long years (before Firefox 1.0 was released) I developed many number of Firefox/Thunderbird addons [personally](https://addons.mozilla.org/ja/firefox/user/piro-piro_or/#my-submissions) and [on business](https://addons.mozilla.org/en-US/firefox/user/clearcode-inc/#my-submissions), based on XUL and XPCOM.
By some reasons I didn't migrate my addons from such a legacy style to SDK-based, but recently I started to research [what APIs are required to migrate my addons to WebExtensions](https://docs.google.com/spreadsheets/d/1gn8fFl4iseOqLEz_UIEbHCEZ7R01VW2eDlxJaFRNKEo), because [Mozilla announced that XUL/XPCOM addons will be ended at end of 2017](https://wiki.mozilla.org/Add-ons/developer/communication).
And I realized that there are limited APIs on WebExtensions for me but some addons are possibly migretable only with [currently available APIs](https://developer.mozilla.org/en-US/Add-ons/WebExtensions).
The [Popup ALT Attribute](https://addons.mozilla.org/firefox/addon/popup-alt-attribute/) is one of such addons.

Recently I've successfully done it, so let's describe how I did that.


## What's the addon?

At first I explain what the addon Popup ALT Attribute is.
It is one of ancient addons [started on 2002](http://piro.sakura.ne.jp/xul/_popupalt.html.en#focused-folding-item%28folding-item-history-1%29), to show what is written at the `alt` attribute of `img` HTML elements in webpages.
By default Firefox shows only the `title` attribute of an HTML element as a tooltip.
For example:

    <img src="dog.jpg" title="a photo of a dog">:
      A tooltip is shown with a text "a photo of a dog".
    <img src="dog.jpg" alt="(a photo of a dog)">:
      No tooltip is shown by default.
      With the addon, a tooltip appears with a text "(a photo of a dog)"
      like ancient Netscape Navigator 4 or MSIE.

Initially the addon was [implemented to replace a global function `FillInHTMLTooltip()` defined by Firefox itself, with my custom version.](https://github.com/piroor/popupalt/blob/3615892354fe05f2cae6bab89708ee62854f36b8/content/popupalt/popupalt.xul)


## Step 1: Made dyanmically installable/uninstallable

At April 2011 I migrated it to [a bootstrapped extension, without any function replacement.](https://github.com/piroor/popupalt/blob/3615892354fe05f2cae6bab89708ee62854f36b8/content/popupalt/popupalt.xul)

I think it was the baseline of the migration for WebExtensions.
If your addon is not bootstrapped yet, *I strongly recommend you to rewrite your addon only with dynamic changes by JavaScript codes, without XUL overlaying.*

Anyway, in those days, the addon still hooked its custom operation to Firefox's internal operation flow to build a tooltip text from hover-ed HTML element, and canceled Firefox's original operation.
That is a major way to do something on a XUL/XPCOM addon.

(In other words, if your addon is not migratable to bootstrapped, then you possibly have to wait that some new WebExtensions APIs are landed on Firefox itself. Sadly some my addons are here...)


## Step 2: Isolation from Firefox's internal functions

At Febrary 2016 I migrated it to ready for e10s.
To be honest *it was the largest barrier on my case*.
Through migration of Firefox itself for e10s, implementation to fill the tooltip was moved to [the lower layer written in C++](http://mxr.mozilla.org/mozilla-esr45/source/embedding/browser/nsDocShellTreeOwner.cpp#1050) and *I had to give up the old approach which overrides the behavior around content tooltip of Firefox itself*, because a bootstrapped extension written in JavaScript cannot access to such operations in low layer.

Instead I noticed that Firefox always shows tooltip for an HTML element when it has own `title` attribute.
So, I decided to copy the value of `alt` attribute to the `title` attribute for hover-ed HTML elements themselves, when any `mousemove` event is fired in web pages.
For example:

    Before:
    <img src="dog.jpg" alt="(a photo of a dog)">:
    
    After:
    <img src="dog.jpg" alt="(a photo of a dog)" title="(a photo of a dog)">:

As the result, most codes were successfully separated from the main script (which is executed in the chrome process) to [a frame script](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/content/content-utils.js) (executed in the content process), and [the main script became just a loader for the frame script.](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/modules/popupalt.js)

Possibly you may not need to migrate your addon for e10s, because your addon will become e10s friendly after successful migration to WebExtensions.
*But you still must isolate your codes from Firefox's internal functions.*
We XUL/XPCOM-based addon authors know Firefox's internal implementation deeply, so sometimes we think like a developer of Firefox itself and try to implement an addon just like a "patch".
However, in WebExtensions world we are not allowed to access low level internal implementations of Firefox itself.
*Please forget your existing knowledge about inside of Firefox* - now you must think how to get what you want only via standard Web APIs and WebExtensions APIs.
In other workds, you must change your mind from "how to inject my *operations* into the operations flow of Firefox itself?" to "how to reuse Firefox's known behavior and get *the result* what I really want, only with existing APIs?"

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
          "js": ["content_scripts/content.js"],
          "run_at": "document_start" }
      ]
    }

At the previous step I separated the main script to [a frame script](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/content/content-utils.js) and [a loader for it.](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/modules/popupalt.js)
On the other hand, `manifest.json` can have some manifest keys to describe how scripts are loaded.
It means that I don't need to put my custom loaders in the package anymore.
Actually, a script for any web page can be loaded with the `content_scripts` rule in the above sample.

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

[My frame script](https://github.com/piroor/popupalt/blob/ec119f8b56fb5b9680030ab1f25f5ff3f170dfbe/content/content-utils.js) was designed to work in the content process, with special permissions to use XPCOM.
The script touched to `nsIPrefBranch` and some XPCOM components via XPConnect, so they were temporarily commented out.
User preferences were not available and only default configurations were there as fixed values.
Moreover, some constant properties accessed like `Ci.nsIDOMNode.ELEMENT_NODE` had to be replaced as `Node.ELEMENT_NODE`.
The listener for `mousemove` events from web pages was attached to the global namespace for a frame script, but it was re-attached to the `document` itself of an web page, because it was now executed on web pages directly.


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


## Step 5: User preferences

Currently WebExtensions does not provide any feature compatible to `nsIPrefBranch`.
Instead there are [simple storage APIs](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage).
It can be used like an alternative of `nsIPrefBranch` to set/get user preferences.

However there is a large limitation: *it is not available in content scripts.*
I had to create a background script to access the storage, and communicate with it [via the inter-sandboxes messaging system](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime).

Finally, [I created a tiny library to do that](https://github.com/piroor/webextensions-lib-configs).
I don't describe how I did it here, but if you hope to know details, please see [the source](https://github.com/piroor/webextensions-lib-configs/blob/master/Configs.js).
There are just 177 lines for now.



## Step 6: Options UI




    

## Conclusion


