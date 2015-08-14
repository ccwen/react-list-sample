var React=require("react");
var E=React.createElement;
var idioms=require("idioms"); //48K idioms
var ReactList=require("react-list");
var styles={
  tofind:{fontSize:"150%"}
  ,container:{height:"80%",overflowY:"auto"}
}
var searchfunc={
0: function(idiom){ return idiom.indexOf(this)>-1;}
,1: function(idiom){ return idiom.indexOf(this)===0;}
,2: function(idiom){var idx=idiom.indexOf(this); return idx>0 && idx<idiom.length-2}
,3: function(idiom){return idiom.lastIndexOf(this)===idiom.length-this.length}
}
var maincomponent = React.createClass({
  getInitialState:function() {
    return {tofind:"葉",result:idioms,searchType:0};
  }
  ,componentDidMount:function() {
    this.search();
  }  
  ,search:function() {
    var tofind=this.state.tofind;
    var r=idioms;
    if (tofind.trim()) r=idioms.filter( searchfunc[this.state.searchType].bind(tofind) );
    this.setState({result:r});
  }
  ,setTofind:function(e) {
    var tofind=e.target.value;
    this.setState({tofind:tofind});
    clearTimeout(this.timer);
    this.timer=setTimeout(this.search,100);
  }
  ,setSearchType:function(e) {
    this.setState({searchType:parseInt(e.target.dataset.st)},this.search);

  }
  ,renderItem:function(item,key){
    return E("div",{key:key},this.state.result[item]);
  }
  ,render: function() {
    return E("div",null
        ,E("span",null,"React-List 無窮捲動")
        ,E("br")
        ,E("input",{style:styles.tofind,ref:"tofind", value:this.state.tofind, onChange:this.setTofind})
        ,E("span",null,this.state.result.length)
        ,E("label",null,E("input",{"data-st":0,name:"searchtype",type:"radio",onChange:this.setSearchType,defaultChecked:true}),"任意")
        ,E("label",null,E("input",{"data-st":1,name:"searchtype",type:"radio",onChange:this.setSearchType}),"開頭")
        ,E("label",null,E("input",{"data-st":2,name:"searchtype",type:"radio",onChange:this.setSearchType}),"中間")
        ,E("label",null,E("input",{"data-st":3,name:"searchtype",type:"radio",onChange:this.setSearchType}),"結尾")
        ,E("div",{style:styles.container},
          E(ReactList,{itemRenderer:this.renderItem,length:this.state.result.length,type:'uniform'})
        )
      );        
  }
});
module.exports=maincomponent;