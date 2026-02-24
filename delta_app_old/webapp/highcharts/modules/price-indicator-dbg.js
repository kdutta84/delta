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

	var priceIndicator$2 = {exports: {}};

	var priceIndicator$1 = priceIndicator$2.exports;

	var hasRequiredPriceIndicator;

	function requirePriceIndicator () {
		if (hasRequiredPriceIndicator) return priceIndicator$2.exports;
		hasRequiredPriceIndicator = 1;
		(function (module, exports$1) {
			!/**
			 * Highstock JS v12.5.0 (2026-01-12)
			 * @module highcharts/modules/price-indicator
			 * @requires highcharts
			 * @requires highcharts/modules/stock
			 *
			 * Advanced Highcharts Stock tools
			 *
			 * (c) 2010-2026 Highsoft AS
			 * Author: Torstein Honsi
			 *
			 * A commercial license may be required depending on use.
			 * See www.highcharts.com/license
			 */function(s,i){module.exports=i(s._Highcharts);}("u"<typeof window?priceIndicator$1:window,s=>(()=>{var i={944:i=>{i.exports=s;}},e={};function t(s){var r=e[s];if(void 0!==r)return r.exports;var o=e[s]={exports:{}};return i[s](o,o.exports,t),o.exports}t.n=s=>{var i=s&&s.__esModule?()=>s.default:()=>s;return t.d(i,{a:i}),i},t.d=(s,i)=>{for(var e in i)t.o(i,e)&&!t.o(s,e)&&Object.defineProperty(s,e,{enumerable:true,get:i[e]});},t.o=(s,i)=>Object.prototype.hasOwnProperty.call(s,i);var r={};t.d(r,{default:()=>p});var o=t(944),a=t.n(o);let{composed:l}=a(),{addEvent:c,merge:h,pushUnique:n}=a();function d(){let s=this;["lastPrice","lastPriceLabel","lastVisiblePrice","lastVisiblePriceLabel"].forEach(i=>{s[i]?.hide();});}function b(){let s=this.options,i=s.lastVisiblePrice,e=s.lastPrice;if((i||e)&&"highcharts-navigator-series"!==s.id&&this.visible){let t=this.xAxis,r=this.yAxis,o=r.crosshair,a=r.cross,l=r.crossLabel,c=this.points,n=c.length,d=this.dataTable.rowCount,b=this.getColumn("x")[d-1],p=this.getColumn("y")[d-1]??this.getColumn("close")[d-1];if(e&&e.enabled&&(r.crosshair=r.options.crosshair=s.lastPrice,!this.chart.styledMode&&r.crosshair&&r.options.crosshair&&s.lastPrice&&(r.crosshair.color=r.options.crosshair.color=s.lastPrice.color||this.color),r.cross=this.lastPrice,this.lastPriceLabel&&this.lastPriceLabel.destroy(),delete r.crossLabel,r.drawCrosshair(null,{x:b,y:p,plotX:t.toPixels(b,true),plotY:r.toPixels(p,true)}),this.yAxis.cross&&(this.lastPrice=this.yAxis.cross,this.lastPrice.addClass("highcharts-color-"+this.colorIndex),this.lastPrice.y=p),this.lastPriceLabel=r.crossLabel),i&&i.enabled&&n>0){r.crosshair=r.options.crosshair=h({color:"transparent"},s.lastVisiblePrice),r.cross=this.lastVisiblePrice;let i=c[n-1].isInside?c[n-1]:c[n-2];this.lastVisiblePriceLabel&&this.lastVisiblePriceLabel.destroy(),delete r.crossLabel,r.drawCrosshair(null,i),r.cross&&(this.lastVisiblePrice=r.cross,i&&"number"==typeof i.y&&(this.lastVisiblePrice.y=i.y)),this.lastVisiblePriceLabel=r.crossLabel;}r.crosshair=r.options.crosshair=o,r.cross=a,r.crossLabel=l;}}({compose:function(s){n(l,"PriceIndication")&&(c(s,"afterRender",b),c(s,"hide",d));}}).compose(a().Series);let p=a();return r.default})());
		} (priceIndicator$2));
		return priceIndicator$2.exports;
	}

	var priceIndicatorExports = requirePriceIndicator();
	var defExp = /*@__PURE__*/_commonjsHelpers.getDefaultExportFromCjs(priceIndicatorExports);

	var namedExports = /*#__PURE__*/_mergeNamespaces({
		__proto__: null,
		default: defExp
	}, [priceIndicatorExports]);

	const defaultExports = Object.isFrozen(defExp) ? Object.assign({}, defExp?.default || defExp || { __emptyModule: true }) : defExp;
	Object.keys(namedExports || {}).filter((key) => !defaultExports[key]).forEach((key) => defaultExports[key] = namedExports[key]);
	Object.defineProperty(defaultExports, "__" + "esModule", { value: true });
	var priceIndicator = Object.isFrozen(defExp) ? Object.freeze(defaultExports) : defaultExports;

	return priceIndicator;

}));
