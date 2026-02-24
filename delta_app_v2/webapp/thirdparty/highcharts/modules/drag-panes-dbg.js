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

	var dragPanes$2 = {exports: {}};

	var dragPanes$1 = dragPanes$2.exports;

	var hasRequiredDragPanes;

	function requireDragPanes () {
		if (hasRequiredDragPanes) return dragPanes$2.exports;
		hasRequiredDragPanes = 1;
		(function (module, exports$1) {
			!/**
			 * Highstock JS v12.5.0 (2026-01-12)
			 * @module highcharts/modules/drag-panes
			 * @requires highcharts
			 * @requires highcharts/modules/stock
			 *
			 * Drag-panes module
			 *
			 * (c) 2010-2026 Highsoft AS
			 * Author: Kacper Madej
			 *
			 * A commercial license may be required depending on use.
			 * See www.highcharts.com/license
			 */function(e,t){module.exports=t(e._Highcharts);}("u"<typeof window?dragPanes$1:window,e=>(()=>{var t={944:t=>{t.exports=e;}},s={};function i(e){var o=s[e];if(void 0!==o)return o.exports;var r=s[e]={exports:{}};return t[e](r,r.exports,i),r.exports}i.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return i.d(t,{a:t}),t},i.d=(e,t)=>{for(var s in t)i.o(t,s)&&!i.o(e,s)&&Object.defineProperty(e,s,{enumerable:true,get:t[s]});},i.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t);var o={};i.d(o,{default:()=>M});var r=i(944),n=i.n(r);let{addEvent:h,clamp:a,isNumber:l,relativeLength:d}=n(),c=class{constructor(e){this.init(e);}init(e,t){this.axis=e,this.options=e.options.resize||{},this.render(),t||this.addMouseEvents();}render(){let e=this.axis,t=e.chart,s=this.options,i=s.x||0,o=s.y,r=a(e.top+e.height+o,t.plotTop,t.plotTop+t.plotHeight),n={};t.styledMode||(n={cursor:s.cursor,stroke:s.lineColor,"stroke-width":s.lineWidth,dashstyle:s.lineDashStyle}),this.lastPos=r-o,this.controlLine||(this.controlLine=t.renderer.path().addClass("highcharts-axis-resizer")),this.controlLine.add(e.axisGroup);let h=t.styledMode?this.controlLine.strokeWidth():s.lineWidth;n.d=t.renderer.crispLine([["M",e.left+i,r],["L",e.left+e.width+i,r]],h),this.controlLine.attr(n);}addMouseEvents(){let e,t,s,i=this,o=i.controlLine.element,r=i.axis.chart.container,n=[];i.mouseMoveHandler=e=e=>i.onMouseMove(e),i.mouseUpHandler=t=e=>i.onMouseUp(e),i.mouseDownHandler=s=()=>i.onMouseDown(),n.push(h(r,"mousemove",e),h(r.ownerDocument,"mouseup",t),h(o,"mousedown",s),h(r,"touchmove",e),h(r.ownerDocument,"touchend",t),h(o,"touchstart",s)),i.eventsToUnbind=n;}onMouseMove(e){if(!e.touches||0!==e.touches[0].pageX){let t=this.axis.chart.pointer;this.grabbed&&t&&(this.hasDragged=true,this.updateAxes(t.normalize(e).chartY-(this.options.y||0)));}}onMouseUp(e){let t=this.axis.chart.pointer;this.hasDragged&&t&&this.updateAxes(t.normalize(e).chartY-(this.options.y||0)),this.grabbed=this.hasDragged=this.axis.chart.activeResizer=void 0;}onMouseDown(){this.axis.chart.pointer?.reset(false,0),this.grabbed=this.axis.chart.activeResizer=true;}updateAxes(e){let t=this.axis.chart,s=this.options.controlledAxis,i=0===s.next.length?[t.yAxis.indexOf(this.axis)+1]:s.next,o=[this.axis].concat(s.prev),r=[],n=t.plotTop,h=t.plotHeight,c=n+h,p=e=>100*e/h+"%",u=(e,t,s)=>Math.round(a(e,t,s));e=a(e,n,c);let f=false,x=e-this.lastPos;if(x*x<1)return;let g=true;for(let s of [o,i])for(let o of s){let a,y,v=l(o)?t.yAxis[o]:g?o:t.get(o),m=v&&v.options;if(!m||m.isInternal){g=false;continue}y=v.top;let z=Math.round(d(m.minLength||NaN,h)),M=Math.round(d(m.maxLength||NaN,h));if(g||s!==i)(a=u(e-y,z,M))===M&&(f=true),e=y+a,r.push({axis:v,options:{height:p(a)}});else {if(x=e-this.lastPos,a=u(v.len-x,z,M),(y=v.top+x)+a>c){let t=c-a-y;e+=t,y+=t;}y<n&&(y=n)+a>c&&(a=h),a===z&&(f=true),r.push({axis:v,options:{top:p(y-n),height:p(a)}});}g=false;}if(!f){for(let e of r)e.axis.update(e.options,false);t.redraw(false);}}destroy(){let e=this.axis;for(let t of(delete e.resizer,this.eventsToUnbind&&this.eventsToUnbind.forEach(e=>e()),this.controlLine.destroy(),Object.keys(this)))this[t]=null;}},p={minLength:"10%",maxLength:"100%",resize:{controlledAxis:{next:[],prev:[]},enabled:false,cursor:"ns-resize",lineColor:"#cccccc",lineDashStyle:"Solid",lineWidth:4,x:0,y:0}},{defaultOptions:u}=n(),{addEvent:f,merge:x,wrap:g}=n();function y(){let e=this.resizer,t=this.options.resize;if(t){let s=false!==t.enabled;e?s?e.init(this,true):e.destroy():s&&(this.resizer=new c(this));}}function v(e){!e.keepEvents&&this.resizer&&this.resizer.destroy();}function m(e){this.chart.activeResizer||e.apply(this,[].slice.call(arguments,1));}function b(e){this.chart.activeResizer||e.apply(this,[].slice.call(arguments,1));}let z=n();({compose:function(e,t){e.keepProps.includes("resizer")||(x(true,u.yAxis,p),e.keepProps.push("resizer"),f(e,"afterRender",y),f(e,"destroy",v),g(t.prototype,"runPointActions",b),g(t.prototype,"drag",m));}}).compose(z.Axis,z.Pointer);let M=n();return o.default})());
		} (dragPanes$2));
		return dragPanes$2.exports;
	}

	var dragPanesExports = requireDragPanes();
	var defExp = /*@__PURE__*/_commonjsHelpers.getDefaultExportFromCjs(dragPanesExports);

	var namedExports = /*#__PURE__*/_mergeNamespaces({
		__proto__: null,
		default: defExp
	}, [dragPanesExports]);

	const defaultExports = Object.isFrozen(defExp) ? Object.assign({}, defExp?.default || defExp || { __emptyModule: true }) : defExp;
	Object.keys(namedExports || {}).filter((key) => !defaultExports[key]).forEach((key) => defaultExports[key] = namedExports[key]);
	Object.defineProperty(defaultExports, "__" + "esModule", { value: true });
	var dragPanes = Object.isFrozen(defExp) ? Object.freeze(defaultExports) : defaultExports;

	return dragPanes;

}));
