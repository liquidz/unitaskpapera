// ----------------------------------------
// my opera unite framework (mouf:–Ñ•z)
// ----------------------------------------

var mouf = {};
mouf.handlers = [];

mouf.setting = {
	SESSION_EXPIRE: 1000 * 60 * 10, // 10 min
	ERROR_PAGE_TEMPLATE: null
};

mouf.service.path = opera.io.webserver.currentServicePath.substr(0, opera.io.webserver.currentServicePath.length - 1);
mouf.service.name = opera.io.webserver.currentServiceName;

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
};

// =setDefaultErrorPage
mouf.setDefaultErrorPage = function(templateName){
	if(templateName) mouf.setting.ERROR_PAGE_TEMPLATE = templateName;
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

// =render
mouf.render = function(templateName, data){
	var template = new Markuper(templateName, data);
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

// =session.get
mouf.session.get = function(sessionID){
	return mouf.find(mouf.session.table, function(){ return this[0] === sessionID; });
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
		mouf.session.table.push([sessionID, new Date()]);
		return true;
	}
};

// =session.expire
mouf.session.expire = function(sessionID){
	mouf.session.table = mouf.filter(mouf.session.table, function(){
		return (this[0] !== sessionID);
	});
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
