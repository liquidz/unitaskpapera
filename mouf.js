// ----------------------------------------
// my opera unite framework (mouf:–Ñ•z)
// ----------------------------------------

var mouf = {};
mouf.handlers = [];

mouf.setting = {
	SESSION_EXPIRE: 1000 * 60 * 10 // 10 min
};

// =addHandler
mouf.addHandler = function(path, fn){
	this.handlers.push([path, function(event){
		var connection = event.connection;
		var request = connection.request;
		var response = connection.response;
		try {
			var result = fn(connection, request, response);
			if(result) response.write(result);
		} catch(e){
			response.setStatusCode("500", "Internal Server Error");
			response.setResponseHeader("Content-Type", "text/plain");
			response.write("Internal Server Error\n\n");
			response.write(e);
		} finally {
			response.close();
		}
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
	var address = null;
	var path = request.uri.split("/");
	if(path.length > 1){
		address = "/" + path[1];
		var index = address.indexOf("?");
		if(index !== -1){
			address = address.substr(0, index);
		}
	}
	//return (path.length > 1) ? "/" + path[1] : null;
	return address;
};

// =render
mouf.render = function(templateName, data){
	var template = new Markuper(templateName, data);
	return template.parse().html();
};

mouf.location = function(response, url){
	response.setStatusCode("302", "Found");
	response.setResponseHeader("Location", url);
	response.close();
};

mouf.session = [];
mouf.getSession = function(sessionID){
	return mouf.find(mouf.session, function(){ return this[0] === sessionID; });
};

mouf.makeSessionKey = function(n, b){
	b = b || "";
	var data = ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + b).split("");
	var res = "";
	for(var i = 0; i < n; ++i){
		res += data[Math.floor(Math.random() * data.length)];
	}
	return (mouf.getSession(res) !== null) ? mouf.makeSessionKey(n, b) : res;
};

mouf.checkSession = function(sessionID){
	var sess = mouf.getSession(sessionID);
	return (sess !== null
		&& ((new Date).getTime() - sess[1].getTime()) < mouf.setting.SESSION_EXPIRE) ? true : false;
};

mouf.storeSession = function(sessionID){
	//if(mouf.session[sessionID]){
	if(mouf.getSession(sessionID) !== null){
		return false;
	} else {
		//mouf.session[sessionID] = new Date();
		mouf.session.push([sessionID, new Date()]);
		return true;
	}
};

mouf.expireSession = function(sessionID){
	mouf.session = mouf.filter(mouf.session, function(){
		return (this[0] !== sessionID);
	});
	//if(mouf.session[sessionID]) mouf.session[sessionID] = null;
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

// =find
mouf.find = function(arr, fn){
	var found = null;
	/*
	mouf.each(arr, function(index){
		if(fn.appy(obj, [index])){
			found = index;
			return true;
		}
	});
	*/
	for(var i = 0, l = arr.length; i < l; ++i){
		if(fn.apply(arr[i], [i])){
			found = i;
			break;
		}
	}
	return (found === null) ? null : arr[found];
};

// =filter
mouf.filter = function(arr, fn){
	if(arr instanceof Array){
		var newArr = [];
		mouf.each(arr, function(index){
			if(fn.appy(this, [index])) newArr.push(this);
		});
		return newArr;
	}
	return arr;
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
		mouf.each(mouf.handlers, function(){
			opera.io.webserver.addEventListener(this[0], this[1], false);
		});
		/*
		for(var i = 0, l = mouf.handlers.length; i < l; ++i){
			var h = mouf.handlers[i];
			opera.io.webserver.addEventListener(h[0], h[1], false);
		}
		*/

		if(_onload) _onload();
	};
})(); // }}}
