// ----------------------------------------
// my opera unite framework (mouf:–Ñ•z)
// ----------------------------------------

var mouf = {};
mouf.handlers = [];
mouf.cache = {};

// =service {{{
mouf.service = {
	path: opera.io.webserver.currentServicePath.substr(0,
			opera.io.webserver.currentServicePath.length - 1),
	name: opera.io.webserver.currentServiceName
}; // }}}

// =setting {{{
mouf.setting = {
	SESSION_EXPIRE: 1000 * 60 * 10, // 10 min
	SESSION_ID: "sessid",
	ERROR_PAGE_TEMPLATE: null
};

mouf.setting.sessionExpire = function(msec){
	return (msec) ? (mouf.setting.SESSION_EXPIRE = msec) : mouf.setting.SESSION_EXPIRE;
};

mouf.setting.errorPage = function(templateName){
	return (templateName) ? (mouf.setting.ERROR_PAGE_TEMPLATE = templateName) : mouf.setting.ERROR_PAGE_TEMPLATE;
};

mouf.setting.sessionID = function(sid){
	return (sid) ? (mouf.setting.SESSION_ID = sid) : mouf.setting.SESSION_ID;
};
// }}}

// =addHandler {{{
mouf.addHandler = function(path, fn){
	this.handlers.push([path, function(event){
		var connection = event.connection;
		var request = connection.request;
		var response = connection.response;

		// use mouf.session.isLogined
		mouf.cache.connection = connection;

		try {
			var result = fn(connection, request, response);
			if(result) response.write(result);
		} catch(e){
			// error
			response.setStatusCode("500", "Internal Server Error");
			if(mouf.setting.ERROR_PAGE_TEMPLATE === null){
				// default error
				response.setResponseHeader("Content-Type", "text/plain");
				response.write("Internal Server Error\n\n");
				response.write(e);
			} else {
				// custom error page
				response.write(mouf.render(mouf.setting.ERROR_PAGE_TEMPLATE, {exception: e}));
			}
		} finally {
			response.close();
		}
	}]);
}; // }}}

// preference set/get {{{
// =set
mouf.set = function(key, value){
	widget.setPreferenceForKey(value, key);
};

// =get
mouf.get = function(key, defaultValue){
	return widget.preferenceForKey(key) || (defaultValue ? defaultValue : "");
};
// }}}

// http get/post {{{
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
// }}}

// =render
mouf.render = function(templateName, data){
	var _data = mouf.clone(data);
	_data.isOwner = mouf.cache.connection.isOwner;
	_data.appName = mouf.service.name;
	_data.appPath = mouf.service.path;
	_data.sessionID = mouf.session.getId();
	_data.logined = mouf.session.isLogined();

	var template = new Markuper(templateName, _data);
	return template.parse().html();
};

// =location
mouf.location = function(response, url){
	response.setStatusCode("302", "Found");
	response.setResponseHeader("Location", url);
	response.close();
};

// session manage {{{
mouf.session = {};
mouf.session.table = [];

// =sesion.isValid
mouf.session.isValid = function(sessionID){
	return (/^[A-Za-z0-9]+$/.test(sessionID)) ? true : false;
};

// =session.get
mouf.session.get = function(sessionID){
	if(sessionID && sessionID !== "" && mouf.session.isValid(sessionID)){
		return mouf.find(mouf.session.table, function(){ return this[0] === sessionID; });
	} else {
		return null;
	}
};

// =session.makeKey
mouf.session.makeKey = function(n, b){
	b = b || "";
	var data = ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + b).split("");
	var res = "";
	for(var i = 0; i < n; ++i){
		res += data[Math.floor(Math.random() * data.length)];
	}
	return (mouf.session.get(res) !== null) ? mouf.session.makeKey(n, b) : res;
};

// =session.check
mouf.session.check = function(sessionID){
	var sess = mouf.session.get(sessionID);
	return (sess !== null
		&& ((new Date).getTime() - sess[1].getTime()) < mouf.setting.SESSION_EXPIRE) ? true : false;
};

// =session.store
mouf.session.store = function(sessionID){
	if(mouf.session.get(sessionID) !== null){
		return false;
	} else {
		if(mouf.session.isValid(sessionID)){
			mouf.session.table.push([sessionID, new Date()]);
			return true;
		} else {
			return false;
		}
	}
};

// =session.expire
mouf.session.expire = function(sessionID){
	if(mouf.session.isValid(sessionID)){
		mouf.session.table = mouf.filter(mouf.session.table, function(){
			return (this[0] !== sessionID);
		});
	}
};

// =session.getId
mouf.session.getId = function(connection){
	var conn = (connection) ? connection : mouf.cache.connection;
	var request = conn.request;

	var sessionID = mouf.objectGetValue(request.queryItems, mouf.setting.SESSION_ID);
	if(sessionID === null){
		sessionID = mouf.objectGetValue(request.bodyItems, mouf.setting.SESSION_ID);
	}

	return (sessionID === null || !mouf.session.isValid(sessionID[0])) ? "" : sessionID[0];
};

// =session.isLogined
mouf.session.isLogined = function(connection){
	var conn = (connection) ? connection : mouf.cache.connection;

	if(conn.isOwner){
		return true;
	} else {
		var sessionID = mouf.session.getId(conn);
		return (sessionID === null) ? false : mouf.session.check(sessionID);
	}
};
// }}}

// utility {{{
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
	if(arr instanceof Array){
		for(var i = 0, l = arr.length; i < l; ++i){
			if(fn.apply(arr[i], [i])){
				found = i;
				break;
			}
		}
	}
	return (found === null) ? null : arr[found];
};

// =filter
mouf.filter = function(arr, fn){
	if(arr instanceof Array){
		var newArr = [];
		for(var i = 0, l = arr.length; i < l; ++i){
			if(fn.appy(arr[i], [i])) newArr.push(arr[i]);
		}
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

// =objectKeyLoop
mouf.objectKeyLoop = function(obj, fn){
	if(typeof obj === "object"){
		for(var key in obj){
			var res = fn.apply(obj[key], [key]);
			if(res === true) break;
			else if(res === false) continue;
		}
	}
};

// =objectHasKey
mouf.objectHasKey = function(obj, key){
	var res = false;
	mouf.objectKeyLoop(obj, function(k){
		if(k === key){
			return (res = true);
		}
	});
	return res;
};

// =objectGetValue
mouf.objectGetValue = function(obj, key){
	var res = null;
	mouf.objectKeyLoop(obj, function(k){
		if(k == key){
			res = this;
			return true;
		}
	});
	return res;
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

		if(_onload) _onload();
	};
})(); // }}}
