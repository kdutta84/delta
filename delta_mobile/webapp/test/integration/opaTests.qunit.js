/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["ns/deltamobilehost/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
