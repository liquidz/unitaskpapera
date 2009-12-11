var taskpaper = {};
// =constant {{{
taskpaper.constant = {
	DEFAULT_PAGE: "index",
	DEFAULT_CONTENT: "group:\n- sample\n- done task #done\n\ngroup2;\n-neko\n-inu #dog",
	TYPE_TASK: 0,
	TYPE_GROUP: 1,
	TYPE_TEXT: 2,
	PASSWORD_KEY: mouf.service.name + "_pw"
}; // }}}
taskpaper.page = taskpaper.constant.DEFAULT_PAGE;
taskpaper.makeKeyName = function(){
	return mouf.service.name + "_" + this.page;
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

taskpaper.getPassword = function(){
	var pw = mouf.get(taskpaper.constant.PASSWORD_KEY, "");
	if(pw === ""){
		pw = mouf.session.makeKey(5, mouf.service.name);
		mouf.set(taskpaper.constant.PASSWORD_KEY, pw);
	}
	return pw;
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
		var logined = mouf.session.isLogined(conn);

		taskpaper.page = getPageName(req);
		if(req.method === "POST" && req.bodyItems.data && logined){
			mouf.set(taskpaper.makeKeyName(), decodeURIComponent(req.bodyItems.data[0]));
		}

		return mouf.render("template/view.htm", {
			page: taskpaper.page,
			items: taskpaper.parse(mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT)),
			isIndex: (taskpaper.page === taskpaper.constant.DEFAULT_PAGE),
			password: (conn.isOwner) ? taskpaper.getPassword() : ""
		});
	};

	// handler
	mouf.addHandler("_index", main);
	mouf.addHandler("main", main);
	mouf.addHandler("edit", function(conn, req, res){
		if(mouf.session.isLogined(conn)){
			taskpaper.page = getPageName(req);
			return mouf.render("template/edit.htm", {
				page: taskpaper.page,
				root: mouf.service.path,
				data: mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT)
			});
		} else {
			// location to top
			mouf.location(res, mouf.service.path);
		}
	});

	mouf.addHandler("init", function(conn, req, res){
		var page = getPageName(req);
		if(mouf.session.isLogined()){
			taskpaper.page = page;
			mouf.set(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT);
		}
		mouf.location(res, mouf.service.path + "/main/" + page);
	});

	mouf.addHandler("login", function(conn, req, res){
		if(req.bodyItems.password){
			if(mouf.trim(req.bodyItems.password[0]) === taskpaper.getPassword()){
				var sessid = mouf.session.makeKey(20);
				mouf.session.store(sessid);
				mouf.location(res, mouf.service.path);
			} else {
				return mouf.render("template/error.htm", {
					msg: "password is not correct",
					root: mouf.service.path
				});
			}
		} else {
			mouf.location(res, mouf.service.path);
		}
	});

	mouf.addHandler("change_password", function(conn, req, res){
		if(conn.isOwner && req.bodyItems.password){
			var pw = mouf.trim(req.bodyItems.password[0]);
			if(/^[A-Za-z0-9]+$/.test(pw)){
				mouf.set(taskpaper.constant.PASSWORD_KEY, mouf.trim(req.bodyItems.password[0]));
			}
			mouf.location(res, mouf.service.path);
		} else {
			mouf.location(res, mouf.service.path);
		}
	});

	// handler toggle_task {{{
	mouf.addHandler("toggle_task", function(conn, req, res){
		var result = "error";
		if(req.method === "POST" && req.bodyItems.id && req.bodyItems.checked
								&& req.bodyItems.page && mouf.session.isLogined(conn)){
			var id = parseInt(req.bodyItems.id[0]);
			var checked = (req.bodyItems.checked[0] === "true") ? true : false;
			var newLine = null;
			var index = -1;
			var changed = false;

			taskpaper.page = req.bodyItems.page[0];

			taskpaper.mapContents(function(line){
				if(line.indexOf("-") === 0) ++index;

				if(index !== id || changed){
					return line;
				} else {
					changed = true;
					return (checked) ? line + " #done" : line.replace("#done", "").replace("  ", " ");
				}
			});

			if(changed) result = "success";
		}
		return result;
	}); // }}}

	// handler toggle_group {{{
	mouf.addHandler("toggle_group", function(conn, req, res){
		var result = "error";
		if(req.method === "POST" && req.bodyItems.id && req.bodyItems.opened
							&& req.bodyItems.page && mouf.session.isLogined(conn)){
			var id = parseInt(req.bodyItems.id[0]);
			var opened = (req.bodyItems.opened[0] === "true") ? true : false;
			var newLine = null;
			var index = -1;
			var changed = false;

			taskpaper.page = req.bodyItems.page[0];

			taskpaper.mapContents(function(line){
				if(/[:;]\s*$/.test(line)) ++index;

				if(index !== id || changed){
					return line;
				} else {
					changed = true;
					return (opened) ? line.replace(/:\s*$/, ";") : line.replace(/;\s*$/, ":");
				}
			});
			if(changed) result = "success";
		}
		return result;
	}); // }}}

})();

taskpaper.mapContents = function(fn){
	var content = mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT);
	var newContent = [];
	mouf.each(content.split(/[\r\n]+/), function(){
		newContent.push(fn(mouf.trim(this)));
	});
	mouf.set(taskpaper.makeKeyName(), newContent.join("\n"));
};

