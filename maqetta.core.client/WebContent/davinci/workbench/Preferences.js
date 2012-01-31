define([
    "davinci/ui/Panel",
    "davinci/Workbench",
    "dojo/i18n!davinci/workbench/nls/workbench",
    "dojo/i18n!dijit/nls/common"
], function(Panel,Workbench,workbenchStrings, commonStrings) {

return {
	_allPrefs: {},

	savePreferences: function(id, base, preferences){
		dojo.xhrPut({
			url: "cmd/setPreferences?id="+id + "&base=" + escape(base),
			putData: dojo.toJson(preferences),
			handleAs:"json",
			sync:true,
			contentType:"text/html"
		});	
		
		if(!this._allPrefs[base])
			this._allPrefs[base] = {};
		
		this._allPrefs[base][id]=preferences;
		
		dojo.publish("/davinci/preferencesChanged",[{id:id, preferences:preferences}]);
	},
	_loadExtensions: function (){
		 if(!this._extensions) { this._extensions=davinci.Runtime.getExtensions("davinci.preferences"); }
	},
	
	showPreferencePage: function(){
		this._loadExtensions();
		var langObj = workbenchStrings;
		var dijitLangObj = commonStrings;
	    var prefJson = davinci.workbench.Preferences.getPrefJson();
 	    if(!prefJson || prefJson.length < 1) {
 	    	alert(langObj.noUserPref);
 	    	return;
 	    	
 	    }
 	    //FIXME: move template to html file and reference with dojo/text! dependency
    	var html_template = "<div dojoType='dijit.layout.BorderContainer' style='width: 700px; height: 500px;' gutters='false' liveSplitters='true' id='preferencesContainer'>"+
		    "<div dojoType='dijit.layout.ContentPane' id='pref.TreePane' splitter='true' region='leading' style='width: 200px;' minSize='100' maxSize='300'></div>"+
		    "<div dojoType='dijit.layout.ContentPane' region='bottom' style='height: 25px'>"+
			"<button dojoType=dijit.form.Button type=\"button\" onclick=\"davinci.workbench.Preferences.save();\">"+dijitLangObj.buttonSave+"</button></td>"+
			/*
			 * FIXME: we don't have logic to yet implement restoreDefaults() yet. See #627
			 "<button dojoType=dijit.form.Button type=\"button\" onclick=\"davinci.workbench.Preferences.restoreDefaults();\">"+langObj.restoreDefaults+"</button></td>"+
			*/
			"<button dojoType=dijit.form.Button type=\"button\" onclick=\"davinci.workbench.Preferences.finish();\">"+dijitLangObj.buttonCancel+"</button></td>"+
			"</div>"+
		    "<div dojoType='dijit.layout.ContentPane' region='center' id='pref.RightPane'></div>"+
		 "</div>";

		var	dialog = new dijit.Dialog({
			id: "preference.main.dialog",
			title: langObj.preferences,
			content: html_template,
			onCancel:function(){
				this.destroyRecursive(false);
			}
		});	

		var itemStore = new dojo.data.ItemFileReadStore({data:prefJson, jsId: "prefTreeDataStore"});	
		var forestModel = new dijit.tree.ForestStoreModel({jsId:"fileModel",labelAttr: "name", store:itemStore}) ;
		
		var dojoTree = dijit.byId("prefTree");
		if(!dojoTree) {
			dojoTree = new dijit.Tree({
				model: forestModel, 
				id:'prefTree',
				query:"{type:'directory'}",
				label:"Preferences", 
				labelAttr: "name", 
				showRoot: false,
				childrenAttrs:"children"
			});
		}
		dojoTree.onClick = dojo.hitch(this, function(node){
			this.setPaneContent(node);
		});
		dojo.byId("pref.TreePane").appendChild(dojoTree.domNode);
		dojoTree.startup();
		dialog.show();
	},
	getPrefJson: function(){
		//build the proper json structure before returning it.  this is to save a lot of time over riding model methods for the tree.
		var ejson = this._extensions;
		
		if(ejson==null) return [];
		var flatNodeTree = [];
		for(var i = 0;i<ejson.length;i++){
			ejson[i]._index=i;
			if(ejson[i].category){
				if(!flatNodeTree[ejson[i].category]){
					flatNodeTree[ejson[i].category]  = [];
				}
				
				flatNodeTree[ejson[i].category].push(ejson[i]);
				
			}else{
				if(!flatNodeTree.root) {
					flatNodeTree.root = [];
				}
				flatNodeTree.root.push(ejson[i]);
			}
		}
		
		var treeJson = []; //FIXME: use map
		for(var i = 0;i<flatNodeTree.root.length;i++){
			var item = {
				id: flatNodeTree.root[i].id,
				name: flatNodeTree.root[i].name,
				index: flatNodeTree.root[i]._index
			};
			item.children = this._getPrefJsonChildren(flatNodeTree.root[i].id, flatNodeTree);
			treeJson.push(item);
		}
		var treejsonflat = {items: treeJson};
		
		return {items: treeJson};
	},
	
	_getPrefJsonChildren: function(catId, valuesArray){
		var children = valuesArray[catId];
		if(!children) return [];
		var freechildren = []; // FIXME: use map
		for(var p = 0;p<children.length;p++){
			freechildren[p] = {
				id: children[p].id,
				name: children[p].name,
				index: children[p]._index
			};
			if(valuesArray[children[p].id]){	
				freechildren[p].children = this._getPrefJsonChildren(children[p].id, valuesArray) ;
			}
		}
		return freechildren;
	},

	setPaneContent: function(node){
		var domNode;
		this._currentPane=null;
		var extension= this._extensions[node.index[0]];
		var prefs=this.getPreferences(extension.id, Workbench.getProject());
		if (extension.pane){
			dojo["require"](extension.pane); //FIXME: use require
			var cls=eval(extension.pane); // FIXME: avoid eval?
			var pane=new cls();
			this._currentPane=pane;
			this._currentPane._extension=extension;
			this._currentPane.setPreferences(prefs);
			domNode=pane.domNode;
		}
		else if (extension.panel){
			var widget = new Panel({definition:extension.panel, data:prefs});
			domNode=widget.domNode;
		}
		else if (extension.pageContent){
			domNode=document.createTextNode(extension.pageContent);
		}
		else {
			domNode=document.createTextNode("");
		}
		if (domNode) {
			dijit.byId("pref.RightPane").setContent( domNode );
		}
	},
	
	_save: function(listOfPages){
		if (this._currentPane)
		{
			var prefs=this._currentPane.getPreferences();
			var id=this._currentPane._extension.id;
			var base = Workbench.getProject();
			
			this.savePreferences(id, base, prefs);
			if(this._currentPane.save){
				this._currentPane.save(prefs);
			}
		}
		for(var i = 0;i<listOfPages.length;i++){
			try{
				if(listOfPages[i].save) {
					listOfPages[i].save();
				}
			}catch(ex){console.log(ex); }
			if(listOfPages[i].children && listOfPages[i].children.length > 0) {
				this._save(listOfPages[i].children);
			}
		}
	},

	save: function (){
		this._save(this._extensions);
		this.finish();
	},

	finish: function (){
		this._extensions=null;
		this._currentPane=null;
		dijit.byId('preference.main.dialog').destroyRecursive(false);
	},
	
	getPreferences: function (id, base){
		
		if(!this._allPrefs[base]) {
			this._allPrefs[base] = {};
		}
		
		if (!this._allPrefs[base][id]){
			var prefs= davinci.Runtime.serverJSONRequest({
			   url:"cmd/getPreferences",
			   handleAs:"json",
			   content:{id:id, base: base},
			   sync: true
			});
			if(!prefs){
				prefs=this.getDefaultPreferences(id);
			}
			this._allPrefs[base][id]=prefs;
		}
		return this._allPrefs[base][id];
	},
	
	getDefaultPreferences: function(id){
		this._loadExtensions();
		for(var i =0;i<this._extensions.length;i++){
			if(this._extensions[i].id==id){
			    if (dojo.isString(this._extensions[i].defaultValues)){
			    	var prefs= davinci.Runtime.serverJSONRequest({
						   url:this._extensions[i].defaultValues, handleAs:"json", sync:true  });
			    	return prefs.defaultValues;
			    }
				return this._extensions[i].defaultValues;
			}
		}
	}
	
};
});
