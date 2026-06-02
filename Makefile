EXTENSION_NAME = mx3-control-gnome@enbonnet.github.com
BUILD_DIR = .build
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_NAME)
BUNDLE = $(BUILD_DIR)/$(EXTENSION_NAME).shell-extension.zip

.PHONY: install clean build pack test-headless test-visual

build:
	@echo "Building mx3-control-gnome extension..."
	mkdir -p $(BUILD_DIR)
	mkdir -p $(INSTALL_DIR)/schemas $(INSTALL_DIR)/icons $(INSTALL_DIR)/styles $(INSTALL_DIR)/src
	cp extension.js prefs.js $(INSTALL_DIR)/
	cp src/mx3-manager.js src/status-indicator.js src/types.js $(INSTALL_DIR)/src/
	cp resources/icons/*.svg $(INSTALL_DIR)/icons/
	cp styles/*.css $(INSTALL_DIR)/styles/
	cp resources/org.gnome.shell.extensions.mx3-control-gnome.gschema.xml $(INSTALL_DIR)/schemas/
	cp metadata.json $(INSTALL_DIR)/
	glib-compile-schemas $(INSTALL_DIR)/schemas/

pack:
	@echo "Packing mx3-control-gnome extension..."
	mkdir -p $(BUILD_DIR)
	rm -f $(BUNDLE)
	gnome-extensions pack . --force --out-dir $(BUILD_DIR) \
		--extra-source=src \
		--extra-source=resources/icons \
		--extra-source=styles \
		--schema=resources/org.gnome.shell.extensions.mx3-control-gnome.gschema.xml

install: pack
	@echo "Installing mx3-control-gnome extension..."
	gnome-extensions install $(BUNDLE) --force
	@echo "If GNOME Extensions does not list it immediately, log out and back in once, then run: gnome-extensions enable $(EXTENSION_NAME)"

test-headless: pack
	./run-headless-test.sh

test-visual: pack
	./run-visual-test.sh

clean:
	rm -rf $(INSTALL_DIR) $(BUILD_DIR)
