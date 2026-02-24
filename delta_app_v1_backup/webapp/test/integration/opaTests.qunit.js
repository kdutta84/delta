/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["ns/deltaapphost/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
