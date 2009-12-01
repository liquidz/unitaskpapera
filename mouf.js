// ----------------------------------------
// my opera unite framework (mouf:–Ñ•z)
// ----------------------------------------

var mouf = {};
mouf.handlers = [];

// =addHandler
mouf.addHandler = function(path, fn){
	this.handlers.push([path, function(event){
		var connection = event.connection;
		var request = connection.request;
		var response = connection.response;
		var result = fn(connection, request, response);
		if(result) response.write(result);
		response.close();
	}]);
};

// =set
mouf.set = function(key, value){
	widget.setPreferenceForKey(value, key);
};

// =get
mouf.get = function(key, defaultValue){
	return widget.preferenceForKey(key) || (defaultValue ? defaultValue : "");
};

// =httpGet
mouf.httpGet = function(url, callback){
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, false);
	xhr.onreadystatechange = function(){
		callback((xhr.readyState == 4 && xhr.status == 200), xhr.responseText, xhr);
	};
	xhr.send(null);
};

// =httpPost
mouf.httpPost = function(url, postData, callback){
	var xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.onreadystatechange = function(){
		callback((xhr.readyState == 4 && xhr.status == 200), xhr.responseText, xhr);
	};
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.send(postData);
};

// =getAddress
mouf.getAddress = function(request){
	var path = request.uri.split("/");
	return (path.length > 1) ? "/" + path[1] : null;
};

// =render
mouf.render = function(templateName, data){
	var template = new Markuper(templateName, data);
	return template.parse().html();
};

// ___ utility ___ {{{

// =each
mouf.each = function(arr, fn){
	if(arr instanceof Array){
		for(var i = 0, l = arr.length; i < l; ++i){
			var res = fn.apply(arr[i], [i]);
			if(res === true) break;
			else if(res === false) continue;
		}
	}
};

// =trim
mouf.trim = function(str){
	return str.replace(/^\s+|\s+$/g, "");
};

// =clone
// via http://blog.livedoor.jp/dankogai/archives/50957890.html
mouf.clone = function(obj){
	if(typeof obj !== "object"){
		return null;
	} else {
		if(obj && obj.constructor){
			var cloneObj = new (obj.constructor);
			for(var p in obj){
				cloneObj[p] = (typeof obj[p] === "object") ? this.clone(obj[p]) : obj[p];
			}
			return cloneObj;
		} else {
			return null;
		}
	}
};

// =debug
mouf.debug = function(str){
	opera.postError(str);
};

// }}}

// onload {{{
(function(){
	var _onload = null;
	if(window.onload) _onload = window.onload;

	window.onload = function(){
		for(var i = 0, l = mouf.handlers.length; i < l; ++i){
			var h = mouf.handlers[i];
			opera.io.webserver.addEventListener(h[0], h[1], false);
		}

		if(_onload) _onload();
	};
})(); // }}}
