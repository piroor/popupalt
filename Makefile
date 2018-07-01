PACKAGE_NAME = popupalt

.PHONY: all xpi signed clean update_extlib install_extlib

all: xpi

xpi: update_extlib install_extlib makexpi/makexpi.sh
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o

update_extlib:
	git submodule update --init

makexpi/makexpi.sh:
	git submodule update --init

install_extlib:
	cp extlib/webextensions-lib-configs/Configs.js common/
	cp extlib/webextensions-lib-options/Options.js options/
	cp extlib/webextensions-lib-l10n/l10n.js options/

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi

clean:
	rm $(PACKAGE_NAME).xpi $(PACKAGE_NAME)_noupdate.xpi sha1hash.txt
