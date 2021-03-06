define([
	"davinci/Runtime",
	"dojo/_base/connect",
	"davinci/ve/tools/CreateTool",
	"davinci/commands/CompoundCommand",
	"davinci/ve/commands/ModifyCommand",
	"davinci/ve/commands/StyleCommand",
	"davinci/ve/widget"
], function(Runtime, connect, CreateTool, CompoundCommand, ModifyCommand, StyleCommand, widgetUtils) {

var _ShapeHelper = function() {};
_ShapeHelper.prototype = {
		
	_connects: [],
	
	/*
	 * Called by Focus.js right after Maqetta shows selection chrome around a widget.
	 * @param {object} obj  Data passed into this routine is found on this object
	 *    obj.widget: A davinci.ve._Widget which has just been selected
	 *    obj.customDiv: DIV into which widget can inject its own selection chrome
	 * @return {boolean}  Return false if no problems.
	 * FIXME: Better if helper had a class inheritance setup
	 */
	onShowSelection: function(obj){
		if(!obj || !obj.widget || !obj.widget.dijitWidget || !obj.customDiv){
			return true;
		}
		// Need to pull back by 3 because total size is 6 (4px inside, plus 2*1px for border)
		// FIXME: Note that this assumes onscreen selection boxes are a hardcoded size
		// Somehow need to compute this dynamically at run-time
		var centeringShift = 6;
		
		this._widget = obj.widget;
		var dijitWidget = obj.widget.dijitWidget;
		
		var div = obj.customDiv;
		var l,t;

		// The focus selection DIV is sometimes pulled in from left/top
		// so that it won't get clipped off the screen. Need to unadjust the adjustments.
		div.innerHTML = '';

		var draggables = this.getDraggables();
		var points = draggables.points;
		if(points){
			this._dragNobs = [];
			var handle;
			for (var i=0; i<points.length; i++){
				l = points[i].x - centeringShift;
				t = points[i].y - centeringShift;
				this._dragNobs[i] =  handle = dojo.create('span',{
					className:'editFocusNob',
					style:{ position:'absolute', display:'block', left:l+'px', top:t+'px' }	
				},div);
				handle._shapeDraggable = {point:i};
				this._connects.push(connect.connect(handle, 'mousedown', dojo.hitch(this,this.onMouseDown)));
			}
		}else{
			this._dragNobs = null;
		}
		return false;
	},

	/**
	 * Called by Focus.js right after Maqetta hides selection chrome on a widget.
	 * @param {object} obj  Data passed into this routine is found on this object
	 *    obj.widget: A davinci.ve._Widget which has just been selected
	 *    obj.customDiv: DIV into which widget can inject its own selection chrome
	 * @return {boolean}  Return false if no problems.
	 * FIXME: Better if helper had a class inheritance setup
	 */
	onHideSelection: function(obj){
		for(var i=0; i<this._connects.length; i++){
			connect.disconnect(this._connects[i]);
		}
		this._connects = [];
	},

	onMouseDown: function(e){
		// Don't process this event if current tool is CreateTool because
		// that means that mouse operations are adding points.
		var currentEditor = Runtime.currentEditor;
		var context = (currentEditor.getContext && currentEditor.getContext());
		if(context){
			var tool = (context.getActiveTool && context.getActiveTool());
			if(!tool || tool.isInstanceOf(davinci.ve.tools.CreateTool)){
				return;
			}
		}
		
		e.stopPropagation();
		var domNode = this._widget.domNode;
		this._origSpanPos = dojo.position(domNode, true);
		var handle = e.currentTarget;
		this._dragging = handle;
		this._dragx = e.pageX;
		this._dragy = e.pageY;
		this._left = handle.style.left;
		this._top = handle.style.top;
		this._origLeft = domNode.style.left;
		this._origTop = domNode.style.top;
		this._origWidth = domNode.style.width;
		this._origHeight = domNode.style.height;
		var doc = domNode.ownerDocument;
		var body = doc.body;
		
		this._connects.push(connect.connect(doc, 'mousemove', dojo.hitch(this,this.onMouseMoveOut)));
		this._connects.push(connect.connect(doc, 'mouseout', dojo.hitch(this,this.onMouseMoveOut)));
		this._connects.push(connect.connect(doc, 'mouseup', dojo.hitch(this,this.onMouseUp)));
		if(this.onMouseDown_Widget){
			this.onMouseDown_Widget({handle:handle, e:e});
		}
	},
	
	onMouseMoveOut: function(e){
		if(this._dragging){
			e.stopPropagation();
			var x = e.pageX,
				y = e.pageY;
			var dx = x - this._dragx;
			var dy = y - this._dragy;
			if(dx!=0||dy!=0){
				this._dragx = x;
				this._dragy = y;
				var handle = this._dragging;
				var oldLeft = parseFloat(handle.style.left);
				var oldTop = parseFloat(handle.style.top);
				handle.style.left = (oldLeft + dx) + 'px';
				handle.style.top = (oldTop + dy) + 'px';
				if(this.onMouseMoveOut_Widget){
					this.onMouseMoveOut_Widget({handle:handle, dx:dx, dy:dy, pageX:x, pageY:y, e:e});
				}
			}
		}
	},
	
	onMouseUp: function(e){
		e.stopPropagation();
		if(!this._dragging){
			return;
		}
		this._dragging = null;

		function getComputedNumVal(domNode, propName){
			var computedValue = dojo.style(domNode, propName);
			var numValue = parseFloat(computedValue);
			if(isNaN(numValue)){
				numValue = 0;
			}
			return numValue;
		}
		var widget = this._widget;
		var dijitWidget = widget.dijitWidget;
		var context = widget._edit_context;
		var domNode = widget.domNode;
		var svgNode = widget.dijitWidget._svgroot;
		var position = dojo.style(domNode, 'position');
		
		var spanLeft = getComputedNumVal(domNode, 'left');
		var spanTop = getComputedNumVal(domNode, 'top');
		var spanWidth = getComputedNumVal(domNode, 'width');
		var spanHeight = getComputedNumVal(domNode, 'height');
		var svgMarginLeft = getComputedNumVal(svgNode, 'marginLeft');
		var svgMarginTop = getComputedNumVal(svgNode, 'marginTop');
		var left = (spanLeft + svgMarginLeft) + 'px';
		var top = (spanTop + svgMarginTop) + 'px';
		var width = (spanWidth + svgMarginLeft) + 'px';
		var height = (spanHeight + svgMarginTop) + 'px';
		var command = new CompoundCommand();
		
		// Restore SPAN positioning properties to values before dragging started
		// Otherwise, undo logic gets confused
    	var values = widget.getStyleValues();
    	values.left = this._origLeft;
    	values.top = this._origTop;
    	values.width = this._origWidth;
    	values.height = this._origHeight;

		// If absolute positioning, update left and top properties to factor
		// in marginLeft and marginTop updates that happened during dragging
    	var props;
		if(position == 'absolute' || position == 'fixed'){
			props = [{left:left}, {top:top}, {width:width}, {height:height}];
		}else{
			props = [{width:width}, {height:height}];
		}
		command.add(new StyleCommand(widget, props));

		if(this.onMouseUp_Widget){
			this.onMouseUp_Widget(command);
		}
		
		var w_id = widget.id;
		context.getCommandStack().execute(command);
		var newWidget = widgetUtils.byId(w_id, context.getDocument());
		context.select(newWidget);

	},
	
	hideAllDraggablesExcept: function(index){
		if(this._dragNobs){
			for(var i=0; i<this._dragNobs.length; i++){
				var dragNob = this._dragNobs[i];
				dragNob.style.display = (i == index) ? 'block' : 'none';
			}
		}
	},

	/*
	 * Returns list of draggable end points for this shape in "px" units
	 * relative to top/left corner of enclosing SPAN.
	 * Can be overridden for particular widgets.
	 * 
	 * @return {object} whose properties represent widget-specific types of draggable points
	 *   For example, widgets that represent a series of points will include a 'points'
	 *   property which is an array of object of the form {x:<number>,y:<number>}
	 */
	getDraggables: function() {
		// default impl is to return no points
		return {points:[]};
	}

};

return _ShapeHelper;

});