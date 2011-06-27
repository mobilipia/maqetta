/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojox/widget/AutoRotator",["dojo","dijit","dojox","dojox/widget/Rotator"],function(_1,_2,_3){
_1.getObject("dojox.widget.AutoRotator",1);
(function(d){
d.declare("dojox.widget.AutoRotator",_3.widget.Rotator,{suspendOnHover:false,duration:4000,autoStart:true,pauseOnManualChange:false,cycles:-1,random:false,reverse:false,constructor:function(){
var _4=this;
if(_4.cycles-0==_4.cycles&&_4.cycles>0){
_4.cycles++;
}else{
_4.cycles=_4.cycles?-1:0;
}
_4._connects=[d.connect(_4._domNode,"onmouseover",function(){
if(_4.suspendOnHover&&!_4.anim&&!_4.wfe){
var t=_4._endTime,n=_4._now();
_4._suspended=true;
_4._resetTimer();
_4._resumeDuration=t>n?t-n:0.01;
}
}),d.connect(_4._domNode,"onmouseout",function(){
if(_4.suspendOnHover&&!_4.anim){
_4._suspended=false;
if(_4.playing&&!_4.wfe){
_4.play(true);
}
}
})];
if(_4.autoStart&&_4.panes.length>1){
_4.play();
}else{
_4.pause();
}
},destroy:function(){
d.forEach(this._connects,d.disconnect);
this.inherited(arguments);
},play:function(_5,_6){
this.playing=true;
this._resetTimer();
if(_5!==true&&this.cycles>0){
this.cycles--;
}
if(this.cycles==0){
this.pause();
}else{
if(!this._suspended){
this.onUpdate("play");
if(_6){
this._cycle();
}else{
var r=(this._resumeDuration||0)-0,u=(r>0?r:(this.panes[this.idx].duration||this.duration))-0;
this._resumeDuration=0;
this._endTime=this._now()+u;
this._timer=setTimeout(d.hitch(this,"_cycle",false),u);
}
}
}
},pause:function(){
this.playing=this._suspended=false;
this.cycles=-1;
this._resetTimer();
this.onUpdate("pause");
},_now:function(){
return (new Date()).getTime();
},_resetTimer:function(){
clearTimeout(this._timer);
},_cycle:function(_7){
var _8=this,i=_8.idx,j;
if(_8.random){
do{
j=Math.floor(Math.random()*_8.panes.length+1);
}while(j==i);
}else{
j=i+(_8.reverse?-1:1);
}
var _9=_8.go(j);
if(_9){
_9.addCallback(function(_a){
_8.onUpdate("cycle");
if(_8.playing){
_8.play(false,_a);
}
});
}
},onManualChange:function(_b){
this.cycles=-1;
if(_b!="play"){
this._resetTimer();
if(this.pauseOnManualChange){
this.pause();
}
}
if(this.playing){
this.play();
}
}});
})(_1);
return _1.getObject("dojox.widget.AutoRotator");
});
require(["dojox/widget/AutoRotator"]);
