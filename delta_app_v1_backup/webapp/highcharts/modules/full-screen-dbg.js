sap.ui.define(['ns/deltaapphost/thirdparty/_commonjsHelpers'], (function (_commonjsHelpers) { 'use strict';

	function _mergeNamespaces(n, m) {
		m.forEach(function (e) {
			e && typeof e !== 'string' && !Array.isArray(e) && Object.keys(e).forEach(function (k) {
				if (k !== 'default' && !(k in n)) {
					var d = Object.getOwnPropertyDescriptor(e, k);
					Object.defineProperty(n, k, d.get ? d : {
						enumerable: true,
						get: function () { return e[k]; }
					});
				}
			});
		});
		return Object.freeze(n);
	}

	var fullScreen$2 = {exports: {}};

	var fullScreen$1 = fullScreen$2.exports;

	var hasRequiredFullScreen;

	function requireFullScreen () {
		if (hasRequiredFullScreen) return fullScreen$2.exports;
		hasRequiredFullScreen = 1;
		(function (module, exports$1) {
			!/**
			 * Highstock JS v12.5.0 (2026-01-12)
			 * @module highcharts/modules/full-screen
			 * @requires highcharts
			 *
			 * Advanced Highcharts Stock tools
			 *
			 * (c) 2010-2026 Highsoft AS
			 * Author: Torstein Honsi
			 *
			 * A commercial license may be required depending on use.
			 * See www.highcharts.com/license
			 */function(e,t){module.exports=t(e._Highcharts,e._Highcharts.AST);}("u"<typeof window?fullScreen$1:window,(e,t)=>(()=>{var n={660:e=>{e.exports=t;},944:t=>{t.exports=e;}},r={};function s(e){var t=r[e];if(void 0!==t)return t.exports;var i=r[e]={exports:{}};return n[e](i,i.exports,s),i.exports}s.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return s.d(t,{a:t}),t},s.d=(e,t)=>{for(var n in t)s.o(t,n)&&!s.o(e,n)&&Object.defineProperty(e,n,{enumerable:true,get:t[n]});},s.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t);var i={};s.d(i,{default:()=>w});var o=s(944),l=s.n(o),c=s(660),u=s.n(c);let{composed:h}=l(),{addEvent:p,fireEvent:a,pushUnique:g}=l();function d(){this.fullscreen=new f(this);}class f{static compose(e){g(h,"Fullscreen")&&p(e,"beforeRender",d);}constructor(e){this.chart=e,this.isOpen=false;const t=e.renderTo;!this.browserProps&&("function"==typeof t.requestFullscreen?this.browserProps={fullscreenChange:"fullscreenchange",requestFullscreen:"requestFullscreen",exitFullscreen:"exitFullscreen"}:t.mozRequestFullScreen?this.browserProps={fullscreenChange:"mozfullscreenchange",requestFullscreen:"mozRequestFullScreen",exitFullscreen:"mozCancelFullScreen"}:t.webkitRequestFullScreen?this.browserProps={fullscreenChange:"webkitfullscreenchange",requestFullscreen:"webkitRequestFullScreen",exitFullscreen:"webkitExitFullscreen"}:t.msRequestFullscreen&&(this.browserProps={fullscreenChange:"MSFullscreenChange",requestFullscreen:"msRequestFullscreen",exitFullscreen:"msExitFullscreen"}));}close(){let e=this,t=e.chart,n=t.options.chart;a(t,"fullscreenClose",void 0,function(){e.isOpen&&e.browserProps&&t.container.ownerDocument instanceof Document&&t.container.ownerDocument[e.browserProps.exitFullscreen](),e.unbindFullscreenEvent&&(e.unbindFullscreenEvent=e.unbindFullscreenEvent()),t.setSize(e.origWidth,e.origHeight,false),e.origWidth=void 0,e.origHeight=void 0,n.width=e.origWidthOption,n.height=e.origHeightOption,e.origWidthOption=void 0,e.origHeightOption=void 0,e.isOpen=false,e.setButtonText();});}open(){let e=this,t=e.chart,n=t.options.chart;a(t,"fullscreenOpen",void 0,function(){if(n&&(e.origWidthOption=n.width,e.origHeightOption=n.height),e.origWidth=t.chartWidth,e.origHeight=t.chartHeight,e.browserProps){let n=p(t.container.ownerDocument,e.browserProps.fullscreenChange,function(){e.isOpen?(e.isOpen=false,e.close()):(t.setSize(null,null,false),e.isOpen=true,e.setButtonText());}),r=p(t,"destroy",n);e.unbindFullscreenEvent=()=>{n(),r();};let s=t.renderTo[e.browserProps.requestFullscreen]();s&&s.catch(function(){alert("Full screen is not supported inside a frame.");});}});}setButtonText(){let e=this.chart,t=e.exporting?.divElements,n=e.options.exporting,r=n&&n.buttons&&n.buttons.contextButton.menuItems,s=e.options.lang;if(n?.menuItemDefinitions&&s?.exitFullscreen&&s.viewFullscreen&&r&&t){let e=t[r.indexOf("viewFullscreen")];e&&u().setElementHTML(e,this.isOpen?s.exitFullscreen:n.menuItemDefinitions.viewFullscreen?.textKey||s.viewFullscreen);}}toggle(){this.isOpen?this.close():this.open();}}let F=l();F.Fullscreen=F.Fullscreen||f,F.Fullscreen.compose(F.Chart);let w=l();return i.default})());
		} (fullScreen$2));
		return fullScreen$2.exports;
	}

	var fullScreenExports = requireFullScreen();
	var defExp = /*@__PURE__*/_commonjsHelpers.getDefaultExportFromCjs(fullScreenExports);

	var namedExports = /*#__PURE__*/_mergeNamespaces({
		__proto__: null,
		default: defExp
	}, [fullScreenExports]);

	const defaultExports = Object.isFrozen(defExp) ? Object.assign({}, defExp?.default || defExp || { __emptyModule: true }) : defExp;
	Object.keys(namedExports || {}).filter((key) => !defaultExports[key]).forEach((key) => defaultExports[key] = namedExports[key]);
	Object.defineProperty(defaultExports, "__" + "esModule", { value: true });
	var fullScreen = Object.isFrozen(defExp) ? Object.freeze(defaultExports) : defaultExports;

	return fullScreen;

}));
