var taskpaper = {};
// =constant {{{
taskpaper.constant = {
	APP_NAME: "unitaskpapera",
	DEFAULT_PAGE: "index",
	DEFAULT_CONTENT: "group:\n- sample\n- done task #done\n\ngroup2;\n-neko\n-inu #dog",
	TYPE_TASK: 0,
	TYPE_GROUP: 1,
	TYPE_TEXT: 2,
	PASSWORD_KEY: "unitaskpapera_pw"
}; // }}}
taskpaper.page = taskpaper.constant.DEFAULT_PAGE;
taskpaper.makeKeyName = function(){
	return this.constant.APP_NAME + "_" + this.page;
};

// =parseLine {{{
taskpaper.parseLine = function(line){
	var text = mouf.trim(line);
	var tags = null;
	var done = false;

	if(text.indexOf(":") === text.length - 1){
		// opened group
		return {
			type: this.constant.TYPE_GROUP,
			caption: text,
			opened: true
		};
	} else if(text.indexOf(";") === text.length - 1){
		// closed group
		return {
			type: this.constant.TYPE_GROUP,
			caption: text,
			opened: false
		};
	} else {
		if(text.indexOf("-") === 0){
			// task
			var index = text.indexOf("#");
			if(index !== -1){
				tags = mouf.trim(text.substr(index)).split(/\s+/)
				text = text.substr(0, index);
				if(tags){
					mouf.each(tags, function(){
						if(this.indexOf("#done") !== -1){
							done = true;
							return true;
						}
					});
				}
			}
			return {
				type: this.constant.TYPE_TASK,
				caption: text,
				done: done,
				tags: tags
			};
		} else {
			// text
			return {
				type: this.constant.TYPE_TEXT,
				caption: text
			};
		}
	}
}; // }}}
// =parse {{{
taskpaper.parse = function(str){
	var group = {
		name: "default:",
		opened: true,
		tasks: {},
		hasTask: false
	};
	var task = null;
	var res = {};
	var count = {
		group: 0,
		task: 0
	};

	mouf.each(str.split(/[\r\n]+/), function(){
		var parsedItem = taskpaper.parseLine(this);

		if(parsedItem.type === taskpaper.constant.TYPE_TASK){
			// task
			group.tasks[count.task++] = parsedItem;
			group.hasTask = true;
		} else if(parsedItem.type === taskpaper.constant.TYPE_GROUP){
			// group
			if(group.hasTask) res[count.group++] = mouf.clone(group);

			group.name = parsedItem.caption;
			group.opened = parsedItem.opened;
			group.tasks = {};
			group.hasTask = false;
		} else if(parsedItem.type === taskpaper.constant.TYPE_TEXT){
			// text
			var index = count.task - 1;
			if(group.tasks[index].text){
				group.tasks[index].text.push(parsedItem.caption);
			} else {
				group.tasks[index].text = [parsedItem.caption];
			}
		}
	});
	res[count.group] = group;
	return res;
}; // }}}

taskpaper.isLogined = function(conn){
	var req = conn.request;
	if(conn.isOwner){
		return true;
	} else {
		var sessid = null;
		if(req.queryItems.sessid){
			sessid = req.queryItems.sessid[0];
		} else if(req.bodyItems.sessid){
			sessid = req.bodyItems.sessid[0];
		}

		if(sessid === null) return false;
		else return mouf.checkSession(sessid);
	}
	//return (conn.isOwner || (req && req.queryItems.sessid && mouf.checkSession(req.queryItems.sessid[0]))) ? true : false;
};

(function(){
	var getPageName = function(req){
		var pageName = taskpaper.constant.DEFAULT_PAGE;
		var path = req.uri.split("/");
		if(path.length > 3){
			var index = path.length - 1;
			pageName = (path[index] === "") ? path[index -1] : path[index];
			
			index = pageName.indexOf("?");
			if(index !== -1) pageName = pageName.substr(0, index);
		}
		return pageName;
	};

	// main
	var main = function(conn, req, res){
		var logined = taskpaper.isLogined(conn);
		var password = "";
		if(conn.isOwner){
			password = mouf.get(taskpaper.constant.PASSWORD_KEY, "");
			// set default password
			if(password === ""){
				password = mouf.makeSessionKey(5, taskpaper.constant.APP_NAME);
				mouf.set(taskpaper.constant.PASSWORD_KEY, password);
			}
		}

		taskpaper.page = getPageName(req);
		if(req.method === "POST" && req.bodyItems.data && logined){
			mouf.set(taskpaper.makeKeyName(), decodeURIComponent(req.bodyItems.data[0]));
		}

		return mouf.render("template/view.htm", {
			page: taskpaper.page,
			owner: conn.isOwner,
			items: taskpaper.parse(mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT)),
			isIndex: (taskpaper.page === taskpaper.constant.DEFAULT_PAGE),
			root: mouf.getAddress(req),
			logined: logined,
			password: password,
			sessid: (req.queryItems.sessid) ? req.queryItems.sessid[0] : ""
		});
	};

	// handler
	mouf.addHandler("_index", main);
	mouf.addHandler("main", main);
	mouf.addHandler("edit", function(conn, req, res){
		var root = mouf.getAddress(req);
		//if(conn.isOwner){
		if(taskpaper.isLogined(conn)){
			taskpaper.page = getPageName(req);
			return mouf.render("template/edit.htm", {
				page: taskpaper.page,
				root: root,
				data: mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT),
				sessid: (req.queryItems.sessid) ? req.queryItems.sessid[0] : ""
			});
		} else {
			// location to top
			mouf.location(res, root);
		}
	});

	mouf.addHandler("login", function(conn, req, res){
		var root = mouf.getAddress(req);
		if(req.bodyItems.password){
			if(mouf.trim(req.bodyItems.password[0]) === mouf.get(taskpaper.constant.PASSWORD_KEY)){
				var sessid = mouf.makeSessionKey(20);
				mouf.storeSession(sessid);
				mouf.location(res, root + "/main?sessid=" + sessid);
			} else {
				return mouf.render("template/error.htm", {
					msg: "password is not correct",
					root: root
				});
			}
		} else {
			mouf.location(res, root);
		}
	});

	mouf.addHandler("change_password", function(conn, req, res){
		var root = mouf.getAddress(req);
		if(conn.isOwner && req.bodyItems.password){
			mouf.set(taskpaper.constant.PASSWORD_KEY, mouf.trim(req.bodyItems.password[0]));
			mouf.location(res, root);
		} else {
			mouf.location(res, root);
		}
	});

	// handler toggle_task {{{
	mouf.addHandler("toggle_task", function(conn, req, res){
		var result = "error";
		if(req.method === "POST" && req.bodyItems.id && req.bodyItems.checked
								&& req.bodyItems.page && taskpaper.isLogined(conn)){
			var id = parseInt(req.bodyItems.id[0]);
			var checked = (req.bodyItems.checked[0] === "true") ? true : false;
			var page = req.bodyItems.page[0];
			var changed = false;

			taskpaper.page = page;
			var content = mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT);
			var newContent = [];
			var newLine = null;
			var index = -1;
			mouf.each(content.split(/[\r\n]+/), function(){
				if(mouf.trim(this).indexOf("-") === 0) ++index;

				if(index !== id || changed){
					newContent.push(this);
				} else {
					if(checked){
						newLine = this + " #done";
					} else {
						newLine = this.replace("#done", "").replace("  ", " ");
					}
					newContent.push(newLine);
					changed = true;
				}
			});
			mouf.set(taskpaper.makeKeyName(), newContent.join("\n"));
			if(changed) result = "success";
		}
		return result;
	}); // }}}

	// handler toggle_group {{{
	mouf.addHandler("toggle_group", function(conn, req, res){
		var result = "error";
		if(req.method === "POST" && req.bodyItems.id && req.bodyItems.opened
							&& req.bodyItems.page && taskpaper.isLogined(conn)){
			var id = parseInt(req.bodyItems.id[0]);
			var opened = (req.bodyItems.opened[0] === "true") ? true : false;
			var page = req.bodyItems.page[0];
			var changed = false;

			taskpaper.page = page;
			var content = mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT);
			var newContent = [];
			var newLine = null;
			var index = -1;
			mouf.each(content.split(/[\r\n]+/), function(){
				var trimedLine = mouf.trim(this);
				if(/[:;]\s*$/.test(trimedLine)) ++index;

				if(index !== id || changed){
					newContent.push(this);
				} else {
					if(opened){
						newLine = trimedLine.replace(/:\s*$/, ";");
					} else {
						newLine = trimedLine.replace(/;\s*$/, ":");
					}
					newContent.push(newLine);
					changed = true;
				}
			});
			mouf.set(taskpaper.makeKeyName(), newContent.join("\n"));
			if(changed) result = "success";
		}
		return result;
	}); // }}}

})();


