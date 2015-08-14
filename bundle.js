(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\downloader.js":[function(require,module,exports){

var userCancel=false;
var files=[];
var totalDownloadByte=0;
var targetPath="";
var tempPath="";
var nfile=0;
var baseurl="";
var result="";
var downloading=false;
var startDownload=function(dbid,_baseurl,_files) { //return download id
	var fs     = require("fs");
	var path   = require("path");

	
	files=_files.split("\uffff");
	if (downloading) return false; //only one session
	userCancel=false;
	totalDownloadByte=0;
	nextFile();
	downloading=true;
	baseurl=_baseurl;
	if (baseurl[baseurl.length-1]!='/')baseurl+='/';
	targetPath=ksanagap.rootPath+dbid+'/';
	tempPath=ksanagap.rootPath+".tmp/";
	result="";
	return true;
}

var nextFile=function() {
	setTimeout(function(){
		if (nfile==files.length) {
			nfile++;
			endDownload();
		} else {
			downloadFile(nfile++);	
		}
	},100);
}

var downloadFile=function(nfile) {
	var url=baseurl+files[nfile];
	var tmpfilename=tempPath+files[nfile];
	var mkdirp = require("./mkdirp");
	var fs     = require("fs");
	var http   = require("http");

	mkdirp.sync(path.dirname(tmpfilename));
	var writeStream = fs.createWriteStream(tmpfilename);
	var datalength=0;
	var request = http.get(url, function(response) {
		response.on('data',function(chunk){
			writeStream.write(chunk);
			totalDownloadByte+=chunk.length;
			if (userCancel) {
				writeStream.end();
				setTimeout(function(){nextFile();},100);
			}
		});
		response.on("end",function() {
			writeStream.end();
			setTimeout(function(){nextFile();},100);
		});
	});
}

var cancelDownload=function() {
	userCancel=true;
	endDownload();
}
var verify=function() {
	return true;
}
var endDownload=function() {
	nfile=files.length+1;//stop
	result="cancelled";
	downloading=false;
	if (userCancel) return;
	var fs     = require("fs");
	var mkdirp = require("./mkdirp");

	for (var i=0;i<files.length;i++) {
		var targetfilename=targetPath+files[i];
		var tmpfilename   =tempPath+files[i];
		mkdirp.sync(path.dirname(targetfilename));
		fs.renameSync(tmpfilename,targetfilename);
	}
	if (verify()) {
		result="success";
	} else {
		result="error";
	}
}

var downloadedByte=function() {
	return totalDownloadByte;
}
var doneDownload=function() {
	if (nfile>files.length) return result;
	else return "";
}
var downloadingFile=function() {
	return nfile-1;
}

var downloader={startDownload:startDownload, downloadedByte:downloadedByte,
	downloadingFile:downloadingFile, cancelDownload:cancelDownload,doneDownload:doneDownload};
module.exports=downloader;
},{"./mkdirp":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\mkdirp.js","fs":false,"http":false,"path":false}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\html5fs.js":[function(require,module,exports){
/* emulate filesystem on html5 browser */
var get_head=function(url,field,cb){
	var xhr = new XMLHttpRequest();
	xhr.open("HEAD", url, true);
	xhr.onreadystatechange = function() {
			if (this.readyState == this.DONE) {
				cb(xhr.getResponseHeader(field));
			} else {
				if (this.status!==200&&this.status!==206) {
					cb("");
				}
			}
	};
	xhr.send();
}
var get_date=function(url,cb) {
	get_head(url,"Last-Modified",function(value){
		cb(value);
	});
}
var get_size=function(url, cb) {
	get_head(url,"Content-Length",function(value){
		cb(parseInt(value));
	});
};
var checkUpdate=function(url,fn,cb) {
	if (!url) {
		cb(false);
		return;
	}
	get_date(url,function(d){
		API.fs.root.getFile(fn, {create: false, exclusive: false}, function(fileEntry) {
			fileEntry.getMetadata(function(metadata){
				var localDate=Date.parse(metadata.modificationTime);
				var urlDate=Date.parse(d);
				cb(urlDate>localDate);
			});
		},function(){
			cb(false);
		});
	});
}
var download=function(url,fn,cb,statuscb,context) {
	 var totalsize=0,batches=null,written=0;
	 var fileEntry=0, fileWriter=0;
	 var createBatches=function(size) {
		var bytes=1024*1024, out=[];
		var b=Math.floor(size / bytes);
		var last=size %bytes;
		for (var i=0;i<=b;i++) {
			out.push(i*bytes);
		}
		out.push(b*bytes+last);
		return out;
	 }
	 var finish=function() {
		 rm(fn,function(){
				fileEntry.moveTo(fileEntry.filesystem.root, fn,function(){
					setTimeout( cb.bind(context,false) , 0) ;
				},function(e){
					console.log("failed",e)
				});
		 },this);
	 };
		var tempfn="temp.kdb";
		var batch=function(b) {
		var abort=false;
		var xhr = new XMLHttpRequest();
		var requesturl=url+"?"+Math.random();
		xhr.open('get', requesturl, true);
		xhr.setRequestHeader('Range', 'bytes='+batches[b]+'-'+(batches[b+1]-1));
		xhr.responseType = 'blob';
		xhr.addEventListener('load', function() {
			var blob=this.response;
			fileEntry.createWriter(function(fileWriter) {
				fileWriter.seek(fileWriter.length);
				fileWriter.write(blob);
				written+=blob.size;
				fileWriter.onwriteend = function(e) {
					if (statuscb) {
						abort=statuscb.apply(context,[ fileWriter.length / totalsize,totalsize ]);
						if (abort) setTimeout( cb.bind(context,false) , 0) ;
				 	}
					b++;
					if (!abort) {
						if (b<batches.length-1) setTimeout(batch.bind(context,b),0);
						else                    finish();
				 	}
			 	};
			}, console.error);
		},false);
		xhr.send();
	}

	get_size(url,function(size){
		totalsize=size;
		if (!size) {
			if (cb) cb.apply(context,[false]);
		} else {//ready to download
			rm(tempfn,function(){
				 batches=createBatches(size);
				 if (statuscb) statuscb.apply(context,[ 0, totalsize ]);
				 API.fs.root.getFile(tempfn, {create: 1, exclusive: false}, function(_fileEntry) {
							fileEntry=_fileEntry;
						batch(0);
				 });
			},this);
		}
	});
}

var readFile=function(filename,cb,context) {
	API.fs.root.getFile(filename, {create: false, exclusive: false},function(fileEntry) {
		fileEntry.file(function(file){
			var reader = new FileReader();
			reader.onloadend = function(e) {
				if (cb) cb.call(cb,this.result);
			};
			reader.readAsText(file,"utf8");
		});
	}, console.error);
}

function createDir(rootDirEntry, folders,  cb) {
  // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
  if (folders[0] == '.' || folders[0] == '') {
    folders = folders.slice(1);
  }
  rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    if (folders.length) {
      createDir(dirEntry, folders.slice(1),cb);
    } else {
			cb();
		}
  }, cb);
};


var writeFile=function(filename,buf,cb,context){
	var write=function(fileEntry){
		fileEntry.createWriter(function(fileWriter) {
			fileWriter.write(buf);
			fileWriter.onwriteend = function(e) {
				if (cb) cb.apply(cb,[buf.byteLength]);
			};
		}, console.error);
	}

	var getFile=function(filename){
		API.fs.root.getFile(filename, {exclusive:true}, function(fileEntry) {
			write(fileEntry);
		}, function(){
				API.fs.root.getFile(filename, {create:true,exclusive:true}, function(fileEntry) {
					write(fileEntry);
				});

		});
	}
	var slash=filename.lastIndexOf("/");
	if (slash>-1) {
		createDir(API.fs.root, filename.substr(0,slash).split("/"),function(){
			getFile(filename);
		});
	} else {
		getFile(filename);
	}
}

var readdir=function(cb,context) {
	var dirReader = API.fs.root.createReader();
	var out=[],that=this;
	dirReader.readEntries(function(entries) {
		if (entries.length) {
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.isFile) {
					out.push([entry.name,entry.toURL ? entry.toURL() : entry.toURI()]);
				}
			}
		}
		API.files=out;
		if (cb) cb.apply(context,[out]);
	}, function(){
		if (cb) cb.apply(context,[null]);
	});
}
var getFileURL=function(filename) {
	if (!API.files ) return null;
	var file= API.files.filter(function(f){return f[0]==filename});
	if (file.length) return file[0][1];
}
var rm=function(filename,cb,context) {
	var url=getFileURL(filename);
	if (url) rmURL(url,cb,context);
	else if (cb) cb.apply(context,[false]);
}

var rmURL=function(filename,cb,context) {
	webkitResolveLocalFileSystemURL(filename, function(fileEntry) {
		fileEntry.remove(function() {
			if (cb) cb.apply(context,[true]);
		}, console.error);
	},  function(e){
		if (cb) cb.apply(context,[false]);//no such file
	});
}
function errorHandler(e) {
	console.error('Error: ' +e.name+ " "+e.message);
}
var initfs=function(grantedBytes,cb,context) {
	webkitRequestFileSystem(PERSISTENT, grantedBytes,  function(fs) {
		API.fs=fs;
		API.quota=grantedBytes;
		readdir(function(){
			API.initialized=true;
			cb.apply(context,[grantedBytes,fs]);
		},context);
	}, errorHandler);
}
var init=function(quota,cb,context) {
	navigator.webkitPersistentStorage.requestQuota(quota,
			function(grantedBytes) {
				initfs(grantedBytes,cb,context);
		}, errorHandler
	);
}
var queryQuota=function(cb,context) {
	var that=this;
	navigator.webkitPersistentStorage.queryUsageAndQuota(
	 function(usage,quota){
			initfs(quota,function(){
				cb.apply(context,[usage,quota]);
			},context);
	});
}
var API={
	init:init
	,readdir:readdir
	,checkUpdate:checkUpdate
	,rm:rm
	,rmURL:rmURL
	,getFileURL:getFileURL
	,writeFile:writeFile
	,readFile:readFile
	,download:download
	,get_head:get_head
	,get_date:get_date
	,get_size:get_size
	,getDownloadSize:get_size
	,queryQuota:queryQuota
}
module.exports=API;

},{}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\ksanagap.js":[function(require,module,exports){
var appname="installer";
if (typeof ksana=="undefined") {
	window.ksana={platform:"chrome"};
	if (typeof process!=="undefined" && 
		process.versions && process.versions["node-webkit"]) {
		window.ksana.platform="node-webkit";
	}
}
var switchApp=function(path) {
	var fs=require("fs");
	path="../"+path;
	appname=path;
	document.location.href= path+"/index.html"; 
	process.chdir(path);
}
var downloader={};
var rootPath="";

var deleteApp=function(app) {
	console.error("not allow on PC, do it in File Explorer/ Finder");
}
var username=function() {
	return "";
}
var useremail=function() {
	return ""
}
var runtime_version=function() {
	return "1.4";
}

//copy from liveupdate
var jsonp=function(url,dbid,callback,context) {
  var script=document.getElementById("jsonp2");
  if (script) {
    script.parentNode.removeChild(script);
  }
  window.jsonp_handler=function(data) {
    if (typeof data=="object") {
      data.dbid=dbid;
      callback.apply(context,[data]);    
    }  
  }
  window.jsonp_error_handler=function() {
    console.error("url unreachable",url);
    callback.apply(context,[null]);
  }
  script=document.createElement('script');
  script.setAttribute('id', "jsonp2");
  script.setAttribute('onerror', "jsonp_error_handler()");
  url=url+'?'+(new Date().getTime());
  script.setAttribute('src', url);
  document.getElementsByTagName('head')[0].appendChild(script); 
}


var loadKsanajs=function(){

	if (typeof process!="undefined" && !process.browser) {
		var ksanajs=require("fs").readFileSync("./ksana.js","utf8").trim();
		downloader=require("./downloader");
		ksana.js=JSON.parse(ksanajs.substring(14,ksanajs.length-1));
		rootPath=process.cwd();
		rootPath=require("path").resolve(rootPath,"..").replace(/\\/g,"/")+'/';
		ksana.ready=true;
	} else{
		var url=window.location.origin+window.location.pathname.replace("index.html","")+"ksana.js";
		jsonp(url,appname,function(data){
			ksana.js=data;
			ksana.ready=true;
		});
	}
}

loadKsanajs();

var boot=function(appId,cb) {
	if (typeof appId=="function") {
		cb=appId;
		appId="unknownapp";
	}
	if (!ksana.js && ksana.platform=="node-webkit") {
		loadKsanajs();
	}
	ksana.appId=appId;
	var timer=setInterval(function(){
			if (ksana.ready){
				clearInterval(timer);
				cb();
			}
		});
}


var ksanagap={
	platform:"node-webkit",
	startDownload:downloader.startDownload,
	downloadedByte:downloader.downloadedByte,
	downloadingFile:downloader.downloadingFile,
	cancelDownload:downloader.cancelDownload,
	doneDownload:downloader.doneDownload,
	switchApp:switchApp,
	rootPath:rootPath,
	deleteApp: deleteApp,
	username:username, //not support on PC
	useremail:username,
	runtime_version:runtime_version,
	boot:boot
}
module.exports=ksanagap;
},{"./downloader":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\downloader.js","fs":false,"path":false}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\livereload.js":[function(require,module,exports){
var started=false;
var timer=null;
var bundledate=null;
var get_date=require("./html5fs").get_date;
var checkIfBundleUpdated=function() {
	get_date("bundle.js",function(date){
		if (bundledate &&bundledate!=date){
			location.reload();
		}
		bundledate=date;
	});
}
var livereload=function() {
	if(window.location.origin.indexOf("//127.0.0.1")===-1) return;

	if (started) return;

	timer1=setInterval(function(){
		checkIfBundleUpdated();
	},2000);
	started=true;
}

module.exports=livereload;
},{"./html5fs":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\html5fs.js"}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\mkdirp.js":[function(require,module,exports){
function mkdirP (p, mode, f, made) {
     var path = nodeRequire('path');
     var fs = nodeRequire('fs');
	
    if (typeof mode === 'function' || mode === undefined) {
        f = mode;
        mode = 0x1FF & (~process.umask());
    }
    if (!made) made = null;

    var cb = f || function () {};
    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

    fs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), mode, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, mode, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                fs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, mode, made) {
    var path = nodeRequire('path');
    var fs = nodeRequire('fs');
    if (mode === undefined) {
        mode = 0x1FF & (~process.umask());
    }
    if (!made) made = null;

    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

    try {
        fs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), mode, made);
                sync(p, mode, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = fs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

},{}],"C:\\ksana2015\\react-list-sample\\index.js":[function(require,module,exports){
var React=require("react");
require("ksana2015-webruntime/livereload")(); 
var ksanagap=require("ksana2015-webruntime/ksanagap");
ksanagap.boot("react-list-sample",function(){
	var Main=React.createElement(require("./src/main.jsx"));
	ksana.mainComponent=React.render(Main,document.getElementById("main"));
});
},{"./src/main.jsx":"C:\\ksana2015\\react-list-sample\\src\\main.jsx","ksana2015-webruntime/ksanagap":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\ksanagap.js","ksana2015-webruntime/livereload":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\livereload.js","react":"react"}],"C:\\ksana2015\\react-list-sample\\node_modules\\react-list\\react-list.js":[function(require,module,exports){
(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'module', 'react'], factory);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    factory(exports, module, require('react'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, mod, global.React);
    global.ReactList = mod.exports;
  }
})(this, function (exports, module, _react) {
  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { desc = parent = getter = undefined; _again = false; var object = _x,
    property = _x2,
    receiver = _x3; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

  var _React = _interopRequire(_react);

  var isEqualSubset = function isEqualSubset(a, b) {
    for (var key in a) {
      if (a[key] !== b[key]) return false;
    }return true;
  };

  var isEqual = function isEqual(a, b) {
    return isEqualSubset(a, b) && isEqualSubset(b, a);
  };

  var CLIENT_START_KEYS = { x: 'clientTop', y: 'clientLeft' };
  var CLIENT_SIZE_KEYS = { x: 'clientWidth', y: 'clientHeight' };
  var END_KEYS = { x: 'right', y: 'bottom' };
  var INNER_SIZE_KEYS = { x: 'innerWidth', y: 'innerHeight' };
  var OVERFLOW_KEYS = { x: 'overflowX', y: 'overflowY' };
  var SCROLL_KEYS = { x: 'scrollLeft', y: 'scrollTop' };
  var SIZE_KEYS = { x: 'width', y: 'height' };
  var START_KEYS = { x: 'left', y: 'top' };

  var _default = (function (_React$Component) {
    var _class = function _default(props) {
      _classCallCheck(this, _class);

      _get(Object.getPrototypeOf(_class.prototype), 'constructor', this).call(this, props);
      var _props = this.props;
      var initialIndex = _props.initialIndex;
      var length = _props.length;
      var pageSize = _props.pageSize;

      var itemsPerRow = 1;
      var from = this.constrainFrom(initialIndex, length, itemsPerRow);
      var size = this.constrainSize(pageSize, length, pageSize, from);
      this.state = { from: from, size: size, itemsPerRow: itemsPerRow };
      this.cache = {};
    };

    _inherits(_class, _React$Component);

    _createClass(_class, [{
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps(next) {
        var _state = this.state;
        var itemsPerRow = _state.itemsPerRow;
        var from = _state.from;
        var size = _state.size;
        var length = next.length;
        var pageSize = next.pageSize;

        from = this.constrainFrom(from, length, itemsPerRow);
        size = this.constrainSize(size, length, pageSize, from);
        this.setState({ from: from, size: size });
      }
    }, {
      key: 'componentDidMount',
      value: function componentDidMount() {
        this.scrollParent = this.getScrollParent();
        this.updateFrame = this.updateFrame.bind(this);
        window.addEventListener('resize', this.updateFrame);
        this.scrollParent.addEventListener('scroll', this.updateFrame);
        this.updateFrame();
        var initialIndex = this.props.initialIndex;

        if (initialIndex == null) return;
        this.afId = requestAnimationFrame(this.scrollTo.bind(this, initialIndex));
      }
    }, {
      key: 'shouldComponentUpdate',
      value: function shouldComponentUpdate(props, state) {
        return !isEqual(props, this.props) || !isEqual(state, this.state);
      }
    }, {
      key: 'componentDidUpdate',
      value: function componentDidUpdate() {
        this.updateFrame();
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        window.removeEventListener('resize', this.updateFrame);
        this.scrollParent.removeEventListener('scroll', this.updateFrame);
        cancelAnimationFrame(this.afId);
      }
    }, {
      key: 'getScrollParent',
      value: function getScrollParent() {
        var el = _React.findDOMNode(this);
        var overflowKey = OVERFLOW_KEYS[this.props.axis];
        while (el = el.parentElement) {
          var overflow = window.getComputedStyle(el)[overflowKey];
          if (overflow === 'auto' || overflow === 'scroll') return el;
        }
        return window;
      }
    }, {
      key: 'getScroll',
      value: function getScroll() {
        var scrollParent = this.scrollParent;
        var axis = this.props.axis;

        var startKey = START_KEYS[axis];
        var elStart = _React.findDOMNode(this).getBoundingClientRect()[startKey];
        if (scrollParent === window) return -elStart;
        var scrollParentStart = scrollParent.getBoundingClientRect()[startKey];
        var scrollParentClientStart = scrollParent[CLIENT_START_KEYS[axis]];
        return scrollParentStart + scrollParentClientStart - elStart;
      }
    }, {
      key: 'setScroll',
      value: function setScroll(offset) {
        var scrollParent = this.scrollParent;
        var axis = this.props.axis;

        var startKey = START_KEYS[axis];
        if (scrollParent === window) {
          var elStart = _React.findDOMNode(this).getBoundingClientRect()[startKey];
          var windowStart = document.documentElement.getBoundingClientRect()[startKey];
          return window.scrollTo(0, Math.round(elStart) - windowStart + offset);
        }
        scrollParent[SCROLL_KEYS[axis]] += offset - this.getScroll();
      }
    }, {
      key: 'getViewportSize',
      value: function getViewportSize() {
        var scrollParent = this.scrollParent;
        var axis = this.props.axis;

        return scrollParent === window ? window[INNER_SIZE_KEYS[axis]] : scrollParent[CLIENT_SIZE_KEYS[axis]];
      }
    }, {
      key: 'getStartAndEnd',
      value: function getStartAndEnd() {
        var threshold = this.props.threshold;

        var start = Math.max(0, this.getScroll() - threshold);
        var end = start + this.getViewportSize() + threshold * 2;
        return { start: start, end: end };
      }
    }, {
      key: 'getItemSizeAndItemsPerRow',
      value: function getItemSizeAndItemsPerRow() {
        var itemEls = _React.findDOMNode(this.items).children;
        if (!itemEls.length) return {};

        var firstRect = itemEls[0].getBoundingClientRect();

        // Firefox has a problem where it will return a *slightly* (less than
        // thousandths of a pixel) different size for the same element between
        // renders. This can cause an infinite render loop, so only change the
        // itemSize when it is significantly different.
        var itemSize = this.state.itemSize;
        var axis = this.props.axis;

        var sizeKey = SIZE_KEYS[axis];
        var firstRectSize = firstRect[sizeKey];
        if (Math.round(firstRectSize) !== Math.round(itemSize)) {
          itemSize = firstRectSize;
        }

        if (!itemSize) return {};

        var startKey = START_KEYS[axis];
        var firstRowEnd = Math.round(firstRect[END_KEYS[axis]]);
        var itemsPerRow = 1;
        for (var item = itemEls[itemsPerRow]; item && Math.round(item.getBoundingClientRect()[startKey]) < firstRowEnd; item = itemEls[itemsPerRow]) {
          ++itemsPerRow;
        }return { itemSize: itemSize, itemsPerRow: itemsPerRow };
      }
    }, {
      key: 'updateFrame',
      value: function updateFrame() {
        switch (this.props.type) {
          case 'simple':
            return this.updateSimpleFrame();
          case 'variable':
            return this.updateVariableFrame();
          case 'uniform':
            return this.updateUniformFrame();
        }
      }
    }, {
      key: 'updateSimpleFrame',
      value: function updateSimpleFrame() {
        var _getStartAndEnd = this.getStartAndEnd();

        var end = _getStartAndEnd.end;

        var itemEls = _React.findDOMNode(this).children;
        var elEnd = 0;

        if (itemEls.length) {
          var axis = this.props.axis;

          var firstItemEl = itemEls[0];
          var lastItemEl = itemEls[itemEls.length - 1];
          elEnd = lastItemEl.getBoundingClientRect()[END_KEYS[axis]] - firstItemEl.getBoundingClientRect()[START_KEYS[axis]];
        }

        if (elEnd > end) return;

        var _props2 = this.props;
        var pageSize = _props2.pageSize;
        var length = _props2.length;

        this.setState({ size: Math.min(this.state.size + pageSize, length) });
      }
    }, {
      key: 'updateVariableFrame',
      value: function updateVariableFrame() {
        if (!this.props.itemSizeGetter) this.cacheSizes();

        var _getStartAndEnd2 = this.getStartAndEnd();

        var start = _getStartAndEnd2.start;
        var end = _getStartAndEnd2.end;
        var _props3 = this.props;
        var length = _props3.length;
        var pageSize = _props3.pageSize;

        var space = 0;
        var from = 0;
        var size = 0;
        var maxFrom = length - 1;

        while (from < maxFrom) {
          var itemSize = this.getSizeOf(from);
          if (isNaN(itemSize) || space + itemSize > start) break;
          space += itemSize;
          ++from;
        }

        var maxSize = length - from;

        while (size < maxSize && space < end) {
          var itemSize = this.getSizeOf(from + size);
          if (isNaN(itemSize)) {
            size = Math.min(size + pageSize, maxSize);
            break;
          }
          space += itemSize;
          ++size;
        }

        this.setState({ from: from, size: size });
      }
    }, {
      key: 'updateUniformFrame',
      value: function updateUniformFrame() {
        var _getItemSizeAndItemsPerRow = this.getItemSizeAndItemsPerRow();

        var itemSize = _getItemSizeAndItemsPerRow.itemSize;
        var itemsPerRow = _getItemSizeAndItemsPerRow.itemsPerRow;

        if (!itemSize || !itemsPerRow) return;

        var _props4 = this.props;
        var length = _props4.length;
        var pageSize = _props4.pageSize;

        var _getStartAndEnd3 = this.getStartAndEnd();

        var start = _getStartAndEnd3.start;
        var end = _getStartAndEnd3.end;

        var from = this.constrainFrom(Math.floor(start / itemSize) * itemsPerRow, length, itemsPerRow);

        var size = this.constrainSize((Math.ceil((end - start) / itemSize) + 1) * itemsPerRow, length, pageSize, from);

        return this.setState({ itemsPerRow: itemsPerRow, from: from, itemSize: itemSize, size: size });
      }
    }, {
      key: 'getSpaceBefore',
      value: function getSpaceBefore(index) {

        // Try the static itemSize.
        var _state2 = this.state;
        var itemSize = _state2.itemSize;
        var itemsPerRow = _state2.itemsPerRow;

        if (itemSize) return Math.ceil(index / itemsPerRow) * itemSize;

        // Finally, accumulate sizes of items 0 - index.
        var space = 0;
        for (var i = 0; i < index; ++i) {
          var _itemSize = this.getSizeOf(i);
          if (isNaN(_itemSize)) break;
          space += _itemSize;
        }
        return space;
      }
    }, {
      key: 'cacheSizes',
      value: function cacheSizes() {
        var cache = this.cache;
        var from = this.state.from;

        var itemEls = _React.findDOMNode(this.items).children;
        var sizeKey = SIZE_KEYS[this.props.axis];
        for (var i = 0, l = itemEls.length; i < l; ++i) {
          cache[from + i] = itemEls[i].getBoundingClientRect()[sizeKey];
        }
      }
    }, {
      key: 'getSizeOf',
      value: function getSizeOf(index) {

        // Try the static itemSize.
        var itemSize = this.state.itemSize;

        if (itemSize) return itemSize;

        // Try the itemSizeGetter.
        var itemSizeGetter = this.props.itemSizeGetter;

        if (itemSizeGetter) return itemSizeGetter(index);

        // Try the cache.
        var cache = this.cache;

        if (cache[index]) return cache[index];

        // We don't know the size.
        return NaN;
      }
    }, {
      key: 'constrainFrom',
      value: function constrainFrom(from, length, itemsPerRow) {
        if (this.props.type === 'simple') return 0;
        if (!from) return 0;
        return Math.max(Math.min(from, length - itemsPerRow - length % itemsPerRow), 0);
      }
    }, {
      key: 'constrainSize',
      value: function constrainSize(size, length, pageSize, from) {
        return Math.min(Math.max(size, pageSize), length - from);
      }
    }, {
      key: 'scrollTo',
      value: function scrollTo(index) {
        this.setScroll(this.getSpaceBefore(index));
      }
    }, {
      key: 'scrollAround',
      value: function scrollAround(index) {
        var current = this.getScroll();

        var max = this.getSpaceBefore(index);
        if (current > max) return this.setScroll(max);

        var min = max - this.getViewportSize() + this.getSizeOf(index);
        if (current < min) this.setScroll(min);
      }
    }, {
      key: 'renderItems',
      value: function renderItems() {
        var _this2 = this;

        var _state3 = this.state;
        var from = _state3.from;
        var size = _state3.size;

        var items = [];
        for (var i = 0; i < size; ++i) {
          items.push(this.props.itemRenderer(from + i, i));
        }
        return this.props.itemsRenderer(items, function (c) {
          return _this2.items = c;
        });
      }
    }, {
      key: 'render',
      value: function render() {
        var items = this.renderItems();
        if (this.props.type === 'simple') return items;

        var axis = this.props.axis;

        var style = { position: 'relative' };
        var size = this.getSpaceBefore(this.props.length);
        style[SIZE_KEYS[axis]] = size;
        if (size && axis === 'x') style.overflowX = 'hidden';
        var offset = this.getSpaceBefore(this.state.from);
        var x = axis === 'x' ? offset : 0;
        var y = axis === 'y' ? offset : 0;
        var transform = 'translate(' + x + 'px, ' + y + 'px)';
        return _React.createElement(
          'div',
          { style: style },
          _React.createElement(
            'div',
            { style: { WebkitTransform: transform, transform: transform } },
            items
          )
        );
      }
    }], [{
      key: 'propTypes',
      value: {
        axis: _React.PropTypes.oneOf(['x', 'y']),
        initialIndex: _React.PropTypes.number,
        itemSizeGetter: _React.PropTypes.func,
        itemRenderer: _React.PropTypes.func,
        itemsRenderer: _React.PropTypes.func,
        length: _React.PropTypes.number,
        pageSize: _React.PropTypes.number,
        simple: _React.PropTypes.bool,
        threshold: _React.PropTypes.number,
        type: _React.PropTypes.oneOf(['simple', 'variable', 'uniform'])
      },
      enumerable: true
    }, {
      key: 'defaultProps',
      value: {
        axis: 'y',
        itemRenderer: function itemRenderer(index, key) {
          return _React.createElement(
            'div',
            { key: key },
            index
          );
        },
        itemsRenderer: function itemsRenderer(items, ref) {
          return _React.createElement(
            'div',
            { ref: ref },
            items
          );
        },
        length: 0,
        pageSize: 10,
        threshold: 100,
        type: 'simple'
      },
      enumerable: true
    }]);

    return _class;
  })(_React.Component);

  module.exports = _default;
});

},{"react":"react"}],"C:\\ksana2015\\react-list-sample\\src\\main.jsx":[function(require,module,exports){
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
var maincomponent = React.createClass({displayName: "maincomponent",
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
},{"idioms":"idioms","react":"react","react-list":"C:\\ksana2015\\react-list-sample\\node_modules\\react-list\\react-list.js"}]},{},["C:\\ksana2015\\react-list-sample\\index.js"])
//# sourceMappingURL=bundle.js.map
