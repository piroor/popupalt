var version     = '1.3.2008052801',
	displayName = 'Popup ALT Attribute',
	appName     = 'popupalt',
	author      = 'SHIMODA Hiroshi',
	hasLangPack = false;


var err         = initInstall(
		displayName,
		appName,
		version
		),
	UChrome     = getFolder('Chrome'),
	messages    = loadResources('locale.inf'),
	optionsMsg  = ('options' in this && options.length ? loadResources('options.inf') : null ),
	installedOptions = [],
	files       = [],
	jarName     = appName+'.jar',
	contentFlag = CONTENT | DELAYED_CHROME,
	localeFlag  = LOCALE | DELAYED_CHROME,
	skinFlag    = SKIN | DELAYED_CHROME,
	i;


var existsInGlobal  = File.exists(getFolder(UChrome, jarName));
var existsInProfile = File.exists(getFolder(getFolder('Current User', 'chrome'), jarName));
var isNewType       = File.exists(getFolder(UChrome, 'browser.jar'));

if ('newTypeOnly' in this && newTypeOnly && !isNewType) {
	alert(messages.newTypeOnly);
	cancelInstall(err);
}
else if (existsInGlobal && existsInProfile) {
	cancelInstall(err);
}
else {

	if (existsInProfile ||
		(!existsInGlobal && confirm(messages.installToProfile))) {
		UChrome = getFolder('Current User', 'chrome');
		contentFlag = CONTENT | PROFILE_CHROME;
		localeFlag  = LOCALE | PROFILE_CHROME;
		skinFlag    = SKIN | PROFILE_CHROME;
	}


	logComment('initInstall: ' + err);
	setPackageFolder(UChrome);

//	if (File.exists(getFolder(UChrome, jarName))) {
//		alert(messages.exists);
//		cancelInstall(err);
//	}
//	else {
	var i = 0;
		addFile(author, 'chrome/'+jarName, UChrome, '');
		var folder = getFolder(UChrome, jarName);
		files.push(folder);

		registerChrome(contentFlag, folder, 'content/'+appName+'/');


		if ('options' in this && options.length) {
			for (i = 0; i < options.length; i++)
			{
				if (confirm(optionsMsg[options[i]])) {
					registerChrome(contentFlag, folder, 'content/'+options[i]+'/');
					installedOptions.push(options[i]);
				}
			}
		}


		// Language packs
		if ('hasLangPack' in this && hasLangPack) {
			registerChrome(localeFlag, folder, 'locale/en-US/'+appName+'/');
			for (i = 0; i < installedOptions.length; i++)
				registerChrome(localeFlag, folder, 'locale/en-US/'+installedOptions[i]+'/');

			if ('hasJLP' in this && hasJLP && confirm(messages.JLP)) {
				registerChrome(localeFlag, folder, 'locale/ja-JP/'+appName+'/');

				for (i = 0; i < installedOptions.length; i++)
					registerChrome(localeFlag, folder, 'locale/ja-JP/'+installedOptions[i]+'/');
			}
		}

		if ('hasSkin' in this && hasSkin) {
			registerChrome(skinFlag, folder, 'skin/classic/'+appName+'/');
		}

		err = getLastError();
		if (err == SUCCESS) {
			performInstall();
			alert(
				'Ver.'+version+'\n\n'+
				messages.installed+'\n'+
				files.join('\n')+'\n\n\n'+
				messages.complete+
				(contentFlag & PROFILE_CHROME ? '' : '\n\n'+messages.permissionNotes)
			);
		}
		else {
			cancelInstall(err);
		}
//	}
}
