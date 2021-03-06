define([
	'require'
//	'../Workbench'
], function(require) {

return {
	id: "davinci.html",
	"davinci.editor": [
		{
			id: "HTMLEditor",
			name: "HTML Editor",
			extensions: "html",
			isDefault: false,
			//TODO implement		 icon: "",
			editorClass: "davinci/html/ui/HTMLEditor",
			palettesToTop: [
			    "davinci.ve.style", //Properties
                "davinci.ui.navigator", //Files
            ]
		},
		{
			id: "CSSEditor",
			name: "CSS Editor",
			extensions: "css",
			isDefault: true,
			//TODO implement		 icon: "",
			editorClass: "davinci/html/ui/CSSEditor",
			palettesToTop: [
				"davinci.ve.style", //Properties
                "davinci.ui.navigator", //Files
            ]
		},
		{
			id: "ImageViewer",
			name: "Image Viewer",
			extensions: "jpg,gif,jpeg,png",
			isDefault: true,
			//TODO implement		 icon: "",
			editorClass: "davinci/html/ui/ImageViewer",
			palettesToTop: [
			    "davinci.ve.style", //Properties
                "davinci.ui.navigator", //Files
            ]
		}
	],
	"davinci.editorActions": {
		editorContribution: {
			targetID: "davinci.html.CSSEditor",
			actions: [
				{
					id: "save",
					iconClass: 'saveIcon',
					run: function() {
						require('../Workbench').getOpenEditor().save();
					},
					isEnabled: function(context) {
						return true;

					},
					label: "Save",
					toolbarPath: "save",
					keyBinding: {accel: true, charOrCode: "s", allowGlobal: true}
				},
				{
					id: "saveas",
					iconClass: 'saveAsIcon',
					run: function() {
						require("../ui/Resource").saveAs('css');
					},
					isEnabled: function(context) {
						return require('../Workbench').getOpenEditor();
					},
					label: "Save As",
					toolbarPath: "save",
					keyBinding: {accel: true, shift: true, charOrCode: "s", allowGlobal: true}
				}
			]
		}
	},
	"davinci.preferences": [
		{
			name: "HTML",
			id: "general",
			category: "",
			pageContent: "HTML preferences content here"
		}
	],
	"davinci.fileType": [
		{
			extension: "html",
			iconClass: "htmlFileIcon",
			type: "text"
		},
		{
			extension: "css",
			iconClass: "cssFileIcon",
			type: "text"
		},
		{
			extension: "jpeg",
			iconClass: "imageFileIcon",
			type: "image"
		},
		{
			extension: "jpg",
			iconClass: "imageFileIcon",
			type: "image"
		},
		{
			extension: "png",
			iconClass: "imageFileIcon",
			type: "image"
		},
		{
			extension: "gif",
			iconClass: "imageFileIcon",
			type: "image"
		}
	]
};

});