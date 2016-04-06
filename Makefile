PACKAGE_NAME = popupalt

.PHONY: all xpi signed clean

all: xpi

xpi: makexpi/makexpi.sh extlib/webextensions-lib-configs/Configs.js extlib/webextensions-lib-l10n/l10n.js
	cp extlib/webextensions-lib-configs/Configs.js scripts/
	cp extlib/webextensions-lib-l10n/l10n.js scripts/
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o

makexpi/makexpi.sh:
	git submodule update --init

extlib/webextensions-lib-configs/Configs.js:
	git submodule update --init

extlib/webextensions-lib-l10n/l10n.js:
	git submodule update --init

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi

clean:
	rm $(PACKAGE_NAME).xpi $(PACKAGE_NAME)_noupdate.xpi sha1hash.txt
