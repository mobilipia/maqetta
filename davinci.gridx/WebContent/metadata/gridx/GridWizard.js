define([
	"dojo/_base/declare",
	"dijit/layout/StackContainer",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/form/Button",
	"./GridWizardDataSourcePanel",
	"./GridWizardSelectColumnsPanel",
	"./GridWizardPreviewPanel",
	"davinci/ve/widget",
	"dojo/i18n!./nls/gridx",
	"dojo/i18n!dijit/nls/common"
], function(declare, 
		StackContainer, 
		BorderContainer, 
		ContentPane,  
		Button, 
		GridWizardDataSourcePanel, 
		GridWizardSelectColumnsPanel, 
		GridWizardPreviewPanel, 
		Widget, 
		gridxNls, 
		dijitNls) {

return declare(ContentPane, {

	postCreate: function() {
		//Remember widget we're dealing with
		this._widget = Widget.byId(this.widgetId);

		//Create data structure to keep track of connections
		this._connections = [];
		
		//Create page handlers... NOTE: these would eventually be passed in or provided by subclass
		this._pages = [];
		this._pages.push({pageHandler: new GridWizardDataSourcePanel()});
		this._pages.push({pageHandler: new GridWizardSelectColumnsPanel()});
		this._pages.push({pageHandler: new GridWizardPreviewPanel()});
		
		//Create the elements making up our wizard
		var wizardContainer = this._createWizard();

		//Set our content
		this.set("content", wizardContainer);

		//Set-up subscriptions
		this._subs=[
			dojo.subscribe(this.wizardStackContainer.id+"-selectChild", dojo.hitch(this, this._onPageSelected))
		];
	},
	
	_createWizard: function() {
		//Set up the outer container for the all wizard elements
		var borderContainer = new BorderContainer({
			design:'headline',
			gutters:false, 
			liveSplitters:false
		});
		dojo.addClass(borderContainer.domNode, "gridWizard");
		
		//Create TOP section (containing steps)
		var topSection = this._createTopSection();
		borderContainer.addChild(topSection);
		
		//Create MAIN SECTION holding wizard panels
		var mainSection = this._createMainSection();
		borderContainer.addChild(mainSection);
		
		//Create BOTTOM section (for message and buttons)
		var bottomSection = this._createBottomSection();
		borderContainer.addChild(bottomSection);
		
		return borderContainer;
	},

	_createTopSection: function() {
		var stepsContentPane = new ContentPane({
			region: "top"
		});
		dojo.addClass(stepsContentPane.domNode, "steps");
		
		//Create step for each page
		dojo.forEach(this._pages, function(page, index) {
			var stepHeader = this._createStepHeader(page, index);
			dojo.place(stepHeader, stepsContentPane.domNode);
		}.bind(this));
		
		return stepsContentPane;
	},
	
	_createStepHeader: function(page, stepIndex) {
		var step = dojo.create("div");
		if (stepIndex == 0) {
			dojo.addClass(step, "crumbs");
			dojo.addClass(step, "current");
			dojo.addClass(step, "sep");
		} else if (stepIndex == 1) {
			dojo.addClass(step, "crumbs");
			dojo.addClass(step, "sep");
		} else if (stepIndex == 2) {
			dojo.addClass(step, "crumbs");
			// With separators in Step 1 and Step 2, we can't make all of the crumbs the same 
			// % width, so adding a class to tweak last entry
			dojo.addClass(step, "crumbsLast"); 
		}
		this._connections.push(dojo.connect(step, "onclick", dojo.hitch(this, function(e) {
			this.select(e.target);
		})));
		
		var stepIcon = dojo.create("div");
		if (stepIndex == 0) {
			dojo.addClass(stepIcon, "done");
		} else {
			dojo.addClass(stepIcon, "todo");
		}
		dojo.place(stepIcon, step);
		
		var stepTitle = page.pageHandler.getStepLabel();
		var stepLabelSpan = dojo.create("span", {
			innerHTML: dojo.replace(gridxNls.stepHeader, [stepIndex+1, stepTitle])
		});
		dojo.place(stepLabelSpan, step);
		
		page.stepHeader = step;
		page.stepHeaderIcon = stepIcon;
		
		return step;
	},
	
	_createMainSection: function() {
		//Create MAIN SECTION holding wizard panels
		var wizardStackContainer = this.wizardStackContainer = new StackContainer({
			region: "center",
		});
		dojo.addClass(wizardStackContainer.domNode, "wizardStackContainer");
		
		//Init individual pages
		dojo.forEach(this._pages, function(page) {
			//Create the page container and add to stack container
			var pageContainer = new ContentPane();
			dojo.addClass(pageContainer.domNode, "pageNode");
			wizardStackContainer.addChild(pageContainer);
			page.pageContainer = pageContainer;
			
			//Add the page to the container
			dojo.addClass(page.pageHandler.domNode, "wizardPanel");
			pageContainer.set("content", page.pageHandler);
		}.bind(this));
		
		// Populate the first page when it's first shown. This is especially important for dataSourcePanel
		// because of it's reliance of how it gets the embedded div for data source configuration. The
		// DataGridInput/DataStoreBasedWidgetInput classes rely on the div being in the dom tree so
		// they can look up HTML elements in the div by ID.
		var firstPageHandler = this._pages[0].pageHandler;
		this._connections.push(dojo.connect(firstPageHandler, "onShow", dojo.hitch(this, function() {
			if (!firstPageHandler.isPopulated()) {
				this._populatePage(firstPageHandler);
			}
		})));
		
		return wizardStackContainer;
	},
	
	_createBottomSection: function() {
		var buttonsContentPane = new ContentPane({
			region: "bottom"
		});
		dojo.addClass(buttonsContentPane.domNode, "bottomSection");
		
		var reviewMsg = this.reviewMsg = dojo.create("div");
		dojo.addClass(reviewMsg, "reviewMsg");
		dojo.place(reviewMsg, buttonsContentPane.domNode);
		
		var cancelButton = dojo.create("a");
		dojo.addClass(cancelButton, "cancelButton");
		cancelButton.href = "javascript:void(0);";
		cancelButton.innerHTML = dijitNls.buttonCancel;
		this._connections.push(dojo.connect(cancelButton, "onclick", dojo.hitch(this, function() {
			this.onCancel();
		})));
		dojo.place(cancelButton, buttonsContentPane.domNode); 
		
		var finish = this.finish = dojo.create("button");
		dojo.addClass(finish, "bottomButton");
		finish.innerHTML = gridxNls.finish;
		dojo.place(finish, buttonsContentPane.domNode);
		
		var next = this.next = dojo.create("button");
		dojo.addClass(next, "bottomButton");
		next.innerHTML = gridxNls.next;
		dojo.place(next, buttonsContentPane.domNode);
		
		var prev = this.prev = dojo.create("button");
		dojo.addClass(prev, "bottomButton");
		prev.innerHTML = gridxNls.back;
		dojo.place(prev, buttonsContentPane.domNode);
		
		this._initButtons();
		
		return buttonsContentPane;
	},
	
	_initButtons: function() {
		this.finish = new Button({
			onClick: dojo.hitch(this, function() { this._finish(); }),
		},this.finish);
		dojo.addClass(this.finish.domNode, "bottomButton");
		
		this.next = new Button({
			onClick: dojo.hitch(this, function() { this._forward(); })
		},this.next);
		dojo.addClass(this.next.domNode, "bottomButton");
		
		this.prev = new Button({
			onClick: dojo.hitch(this, function() { this._back(); }),
			disabled: true
		},this.prev);
		dojo.addClass(this.prev.domNode, "bottomButton");
	},
	
	_forward: function() {
		var selectedPageContainer = this.wizardStackContainer.selectedChildWidget;
		
		var selectedPageIndex = this._getPageIndexByContainer(selectedPageContainer);
		var selectedPage = this._pages[selectedPageIndex];
		var nextPage = this._pages[selectedPageIndex + 1];
		if (this._checkValidity(selectedPage.pageHandler)) {
			var populatePageCallback = function(pageHandler) {
				//Didn't run into issues, so let's move wizard forward
				this._clearErrorMessage();
				this.wizardStackContainer.forward();
			}.bind(this);
			this._populatePage(nextPage.pageHandler, populatePageCallback);
		} 
	},
	
	_getPageIndexByHandler: function(pageHandler) {
		var retVal = -1;
		dojo.some(this._pages, function(page, index) {
			if (page.pageHandler == pageHandler) {
				retVal = index;
				return true;
			}
		});
		return retVal;
	},
	
	_getPageIndexByContainer: function(pageContainer) {
		var retVal = -1;
		dojo.some(this._pages, function(page, index) {
			if (page.pageContainer == pageContainer) {
				retVal = index;
				return true;
			}
		});
		return retVal;
	},
	
	_getPageIndexByHeader: function(stepHeader) {
		var retVal = -1;
		dojo.some(this._pages, function(page, index) {
			if (page.stepHeader == stepHeader) {
				retVal = index;
				return true;
			}
		});
		return retVal;
	},
	
	_back: function() {
		//Clear error messages
		this._clearErrorMessage();
		
		//Go back
		this.wizardStackContainer.back();
	},
	
	select: function (target) {
		//Clear error messages
		this._clearErrorMessage();
		
		//Figure out current page
		var stackContainer = this.wizardStackContainer;
		var currentPage = stackContainer.selectedChildWidget;
		var currentPageIndex = this._getPageIndexByContainer(currentPage);
		
		//Determine the desired page
		var desiredPageIndex = this._getPageIndexByHeader(target);
		if (desiredPageIndex < 0) {
			//try again with the parent element
			desiredPageIndex = this._getPageIndexByHeader(target.parentElement);
		}
		desiredPage = this._pages[desiredPageIndex];
		
		//Really only need to worry about validating/populating if going forward
		if (desiredPageIndex > currentPageIndex) {
			//check validity of first page
			if (!this._checkValidity(this._pages[0].pageHandler)) {
				return;
			}
			
			var mainPopulatePageCallback = function(pageHandler) {
				//Select container
				stackContainer.selectChild(desiredPage.pageContainer, true);
			}.bind(this);
			
			if (desiredPageIndex == 1) { //columns panel
				this._populatePage(desiredPage.pageHandler, mainPopulatePageCallback);
			} else { //preview panel
				var columnsPopulatePageCallback = function(pageHandler) {
					//Make sure columns panel is valid
					if (!this._checkValidity(this._pages[1].pageHandler)) {
						return;
					}
					
					//Now populate the desired page (preview panel)
					this._populatePage(desiredPage.pageHandler, mainPopulatePageCallback);
				}.bind(this);
				//Make sure the columns panel is populated
				this._populatePage(this._pages[1].pageHandler, columnsPopulatePageCallback);
			}
		} else {
			//Select container
			stackContainer.selectChild(desiredPage.pageContainer, true);
		}
	},
	
	_checkValidity: function(pageHandler) {
		var result = true;
		var paneValidity = pageHandler.isValid();
		switch(typeof paneValidity){
			case "boolean":
				valid = paneValidity;
				break;
			case "string":
				this._showErrorMessage(paneValidity);
				result = false;
				break;
		}
		this._updateStepIcons();
		return result;
	},
	
	_updateStepIcons: function() {
		dojo.forEach(this._pages, function(page) {
			if (page.pageHandler.isPopulated() && !(page.pageHandler.isValid() == true)) {
				dojo.removeClass(page.stepHeaderIcon, "done");
				dojo.addClass(page.stepHeaderIcon, "todo");
			} else {
				dojo.addClass(page.stepHeaderIcon, "done");
				dojo.removeClass(page.stepHeaderIcon, "todo");
			}
		});
	},
	
	_showErrorMessage: function(errMsg) {
		this.reviewMsg.innerHTML = errMsg;
	},
	
	_clearErrorMessage: function() {
		this._showErrorMessage("");
		this._updateStepIcons();
	},
	
	_populatePage: function(pageHandler, callback) {
		var pageIndex = this._getPageIndexByHandler(pageHandler);
		
		var isDirty = false;
		if (pageIndex > 0) {
			var previousPage = this._pages[pageIndex - 1];
			isDirty = previousPage.pageHandler.isDirty();
		}
		
		if (!pageHandler.isPopulated() || isDirty) {
			this._populatePageHelper(pageHandler, pageIndex, callback);
		} else {
			if (callback) {
				callback(pageHandler);
			}
			this._updateStepIcons();
		}
	},
	
	//NOTE: as we move to a more generic wizard framework, this would be a candidate for a subclass
	_populatePageHelper: function(pageHandler, pageIndex, populateCallback) {
		if (pageIndex == 0) {
			pageHandler.populate(this._widget, populateCallback);
			this._updateStepIcons();
		} else {
			//Create callback to receive update command
			var updateCommandCallback = function(compoundCommand) {
				if (pageIndex == 1) {
					//For now, assuming if anything has changed on data source panel that 
					//we shouldn't pay any attention to current column set-up. But, that's simplistic
					//since user may have just added row or changed cell value.
					pageHandler.populate(this._widget, compoundCommand);
				} else {
					var selectedColumnIds = this._pages[1].pageHandler.getTargetColumnIds();
					pageHandler.populate(this._widget, compoundCommand, selectedColumnIds, this._pages[0].pageHandler._gridInput);
				}
				
				if (populateCallback) {
					populateCallback(pageHandler, true);
				}
				this._updateStepIcons();
			}.bind(this);
			this._getUpdateCompoundCommand(updateCommandCallback);
		}
	},
	
	//NOTE: as we move to a more generic wizard framework, this will need some refactoring
	_getUpdateCompoundCommand: function(updateCommandCallback) {
		var pageHandler = this._pages[0].pageHandler; //data source panel
		if (pageHandler.isDirty() || !this._compoundCommand) {
			//Let's mark last two panels as unvisited
			for (var i = 1; i < this._pages.length; i++) {
				this._pages[i].pageHandler.unpopulate();
			}
			
			//Get fresh command
			var callback = function(compoundCommand) {
				this._compoundCommand = compoundCommand;
				updateCommandCallback(this._compoundCommand);
			}.bind(this);
			pageHandler.getUpdateWidgetCommand(callback);
		} else {
			updateCommandCallback(this._compoundCommand);
		}
	},

	_onPageSelected: function(pageContainer) {
		this.prev.set("disabled", pageContainer.isFirstChild);
		this.next.set("disabled", pageContainer.isLastChild);
		dojo.forEach(this._pages, function(page) {
			dojo.removeClass(page.stepHeader, "current");
		});
		
		var pageIndex = this._getPageIndexByContainer(pageContainer);
		dojo.addClass(this._pages[pageIndex].stepHeader,"current");
	},
	
	_finish: function(value) {
		//Clear any current messages
		this._clearErrorMessage();
		
		//NOTE: some checks that would eventually move to a subclass
		if (this._pages[0].pageHandler.isDirty()) {
			//Basically, marking 2nd and 3rd panels as unvisited because
			//the data source has changed
			for (var i = 1; i < this._pages.length; i++) {
				this._pages[i].pageHandler.unpopulate();
			}
		} else if (this._pages[1].pageHandler.isDirty()) {
			//Mark third panel as unvisited because set of selected
			//columns has changed.
			this._pages[2].pageHandler.unpopulate();
		}
		
		//Validate panel 1
		if (!this._checkValidity(this._pages[0].pageHandler)) {
			return;
		}
		
		// Use callback approach to get the update command before doing onFinish because the first panel may be dirty 
		// or we possibly haven't gotten the command at all yet. The first panel might be dirty if they've changed 
		// data without ever going forward in wizard. OR, if they have gone forward previously, but came back and 
		// changed first panel without going forward again.
		var updateCommandCallback = function(compoundCommand) {
			//Validate panel 2 (if it's populated)
			if (this._pages[1].pageHandler.isPopulated() && !this._checkValidity(this._pages[1].pageHandler)) {
				return;
			}
			
			//Validate panel 3 (if it's populated)
			if (this._pages[2].pageHandler.isPopulated() && !this._checkValidity(this._pages[2].pageHandler)) {
				return;
			}
			
			//Everything passed
			this.onFinish();
		}.bind(this);
		this._getUpdateCompoundCommand(updateCommandCallback);
	},
	
	updateWidget: function() {
		var callback = function(compoundCommand) {
			this._updateWidgetHelper(compoundCommand);
		}.bind(this);
		this._getUpdateCompoundCommand(callback);
	},
	
	_updateWidgetHelper: function(compoundCommand) {
		// Making assumption that validity tests have already passed... AND if data source panel
		// had been dirty when Finish was pressed that an updated command had been
		// retrieved before onFinish was called.
		
		// We need to deal with case if Finish was pressed before getting to the 2nd and/or 3rd panels
		var modifiedHeaderElements = null;
		var selectedColumnIds = null;
		if (this._pages[2].pageHandler.isPopulated()) {
			//Assuming _gridPreviewPanel can only be populated if _gridSelectColumnsPanel has been populated
			modifiedHeaderElements = this._pages[2].pageHandler.getUpdatedColumnStructure();
		} else if (this._pages[1].pageHandler.isPopulated()) {
			selectedColumnIds = this._pages[1].pageHandler.getTargetColumnIds();
		}
		
		//Making assumption the last command is the one for upgrading the grid itself
		var lastCommand = compoundCommand._commands[compoundCommand._commands.length-1]; 
		
		if (modifiedHeaderElements || selectedColumnIds) {
			//We're going to need to update the structure in the command before
			//executing it...
			
			//Find THEAD
			var tHead = null;
			dojo.some(lastCommand._children, function(child) {
				if (child.type === "html.thead") {
					tHead = child;
					return true;
				}
			});
			
			//Find TR
			var tRow = null;
			tHeadChildren = tHead.children;
			dojo.some(tHeadChildren, function(tHeadChild) {
				if (tHeadChild.type === "html.tr") {
					tRow = tHeadChild;
					return true;
				}
			});
			
			var currentHeaderElements = tRow.children;
			var currentStructure = lastCommand._properties.structure;
			
			var newHeaderElements = null;
			var newStructure = null;
			if (modifiedHeaderElements) {
				// We've got data from Panel 3, so go through the structure and header elements of
				// the command and update based on that data. Assuming 1-to-1 match with structure
				// elements and headers.
				newHeaderElements = [];
				newStructure = [];
				dojo.forEach(modifiedHeaderElements, function(modifiedHeaderElement) {
					var count = 0;
					dojo.some(currentHeaderElements, function(currentHeaderElement) {
						if (modifiedHeaderElement.field === currentHeaderElement.properties.field) {
							var currentStructureElement = currentStructure[count];
			
							//create new header element
							var newHeaderElement = dojo.clone(currentHeaderElement);
							newHeaderElement.properties.width = modifiedHeaderElement.width;
							newHeaderElement.properties.name = modifiedHeaderElement.name;
							
							//create new structure element
							var newStructureElement = dojo.clone(currentStructureElement);
							newStructureElement.width = modifiedHeaderElement.width; 
							newStructureElement.name = modifiedHeaderElement.name; 
							
							//Add new elements to new arrays
							newHeaderElements.push(newHeaderElement);
							newStructure.push(newStructureElement);
						}
						//Update counter
						count++;
					});
				});
			} else if (selectedColumnIds) {
				// We've got data from Panel 2, so go through just pick out headers and structure
				// elements that the selected ids.
				newHeaderElements = [];
				newStructure = [];
				dojo.forEach(selectedColumnIds, function(selectedColumnId) {
					var count = 0;
					dojo.some(currentHeaderElements, function(currentHeaderElement) {
						if (selectedColumnId === currentHeaderElement.properties.field) {
							var currentStructureElement = currentStructure[count];
			
							//Add elements to new arrays
							newHeaderElements.push(currentHeaderElement);
							newStructure.push(currentStructureElement);
						}
						//Update counter
						count++;
					});
				});
			}
			
			//Transfer new into old data structure
			if (newHeaderElements && newStructure) {
				tRow.children = newHeaderElements;
				lastCommand._properties.structure = newStructure;
			}
		}
		
		//Execute command
		var context = this._widget.getContext();
		context.getCommandStack().execute(compoundCommand);	
		context.select(lastCommand.newWidget);
	},

	onCancel: function() {
	},
	
	onFinish: function() {
	},

	destroy: function() {
		this.inherited(arguments);
		
		//Clean up subscriptions
		this._subs.forEach(dojo.unsubscribe);
		delete this._subs; 
		
		//Clean up connections
		this._connections.forEach(dojo.disconnect);
		delete this._connections;
	}
});
});
