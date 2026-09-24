EXTENSION_NAME = mx3-control-gnome@enbonnet.github.com
BUILD_DIR = .build
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_NAME)
BUNDLE = $(BUILD_DIR)/$(EXTENSION_NAME).shell-extension.zip
TEST_BUNDLE = $(BUILD_DIR)/$(EXTENSION_NAME).test.zip

.PHONY: install clean build pack pack-test test-headless test-visual

build:
	@echo "Building mx3-control-gnome extension..."
	mkdir -p $(BUILD_DIR)
	mkdir -p $(INSTALL_DIR)/schemas $(INSTALL_DIR)/icons $(INSTALL_DIR)/src
	cp extension.js prefs.js $(INSTALL_DIR)/
	cp src/mx3-manager.js src/status-indicator.js src/types.js $(INSTALL_DIR)/src/
	cp resources/icons/*.svg $(INSTALL_DIR)/icons/
	cp resources/org.gnome.shell.extensions.mx3-control-gnome.gschema.xml $(INSTALL_DIR)/schemas/
	cp metadata.json $(INSTALL_DIR)/
	glib-compile-schemas $(INSTALL_DIR)/schemas/

pack:
	@echo "Packing mx3-control-gnome extension..."
	mkdir -p $(BUILD_DIR)
	rm -f $(BUNDLE)
	@# The release bundle stays clean: extensions.gnome.org compiles schemas
	@# itself at install time (EGO-P-006 flags gschemas.compiled in 45+ zips).
	gnome-extensions pack . --force --out-dir $(BUILD_DIR) \
		--extra-source=src \
		--extra-source=resources/icons \
		--schema=resources/org.gnome.shell.extensions.mx3-control-gnome.gschema.xml

# Local dev/testing only: gnome-extensions install and gnome-shell-test-tool
# extract the bundle without compiling schemas, so getSettings() would fail.
# The compiled file lives in the test bundle, never in the release bundle.
pack-test: pack
	mkdir -p $(BUILD_DIR)/schemas
	glib-compile-schemas --targetdir=$(BUILD_DIR)/schemas resources/
	cp -f $(BUNDLE) $(TEST_BUNDLE)
	cd $(BUILD_DIR) && zip -q $(notdir $(TEST_BUNDLE)) schemas/gschemas.compiled

install: pack
	@echo "Installing mx3-control-gnome extension..."
	gnome-extensions install $(BUNDLE) --force
	@# gnome-extensions install does not compile schemas; do it locally so
	@# getSettings() works (extensions.gnome.org handles this at install).
	glib-compile-schemas $(INSTALL_DIR)/schemas/
	@echo "If GNOME Extensions does not list it immediately, log out and back in once, then run: gnome-extensions enable $(EXTENSION_NAME)"

test-headless: pack-test
	./run-headless-test.sh

test-visual: pack-test
	./run-visual-test.sh

clean:
	rm -rf $(INSTALL_DIR) $(BUILD_DIR)
