PACKAGE_NAME = popupalt

.PHONY: all xpi signed clean update_extlib install_extlib

all: xpi

xpi: update_extlib install_extlib makexpi/makexpi.sh
	rm -f ./*.xpi
	zip -r -0 $(PACKAGE_NAME).xpi manifest.json _locales common content_scripts extlib options >/dev/null 2>/dev/null

update_extlib:
	git submodule update --init

makexpi/makexpi.sh:
	git submodule update --init

install_extlib:
	cp submodules/webextensions-lib-configs/Configs.js extlib/
	cp submodules/webextensions-lib-options/Options.js extlib/
	cp submodules/webextensions-lib-l10n/l10n.js extlib/

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi

clean:
	rm $(PACKAGE_NAME).xpi $(PACKAGE_NAME)_noupdate.xpi sha1hash.txt
