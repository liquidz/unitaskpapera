var taskpaper = {};
taskpaper.constant = {
	APP_NAME: "unitaskpapera",
	DEFAULT_PAGE: "index",
	DEFAULT_CONTENT: "- sample\n- done task #done",
	TYPE_TASK: 0,
	TYPE_GROUP: 1,
	TYPE_TEXT: 2
};
//taskpaper.appName = "unitaskpapera";
//taskpaper.defaultPage = "index";
taskpaper.page = taskpaper.constant.DEFAULT_PAGE;
//taskpaper.defaultContent = "- sample\n- done task #done";

taskpaper.makeKeyName = function(){
	//return this.appName + "_" + this.page;
	return this.constant.APP_NAME + "_" + this.page;
};

taskpaper.parseLine = function(line){
	var text = mouf.trim(line);
	var tags = null;
	var done = false;

	if(text.indexOf(":") === text.length - 1){
		// group
		return {
			type: this.constant.TYPE_GROUP,
			caption: text
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
};

taskpaper.parse = function(str){
	var group = {
		name: "default:",
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

		//if(parsedItem.isTask){
		if(parsedItem.type === taskpaper.constant.TYPE_TASK){
			// task
			group.tasks[count.task++] = parsedItem;
			group.hasTask = true;
		} else if(parsedItem.type === taskpaper.constant.TYPE_GROUP){
			// group
			if(group.hasTask) res[count.group++] = mouf.clone(group);

			group.name = parsedItem.caption;
			group.tasks = {};
			group.hasTask = false;
		} else if(parsedItem.type === taskpaper.constant.TYPE_TEXT){
			// text
			var index = count.task - 1;
			if(group.tasks[index].text){
				group.tasks[index].text += parsedItem.caption;
			} else {
				//group.tasks[index].text = "<p>" + parsedItem.caption + "</p>";
				group.tasks[index].text = parsedItem.caption;
			}
		}
	});
	res[count.group] = group;
	return res;
};

(function(){
	var getPageName = function(req){
		//var pageName = taskpaper.defaultPage;
		var pageName = taskpaper.constant.DEFAULT_PAGE;
		var path = req.uri.split("/");
		if(path.length > 3){
			var index = path.length - 1;
			pageName = (path[index] === "") ? path[index -1] : path[index];
		}
		return pageName;
	};

	// main
	var main = function(conn, req, res){
		taskpaper.page = getPageName(req);
		if(req.method === "POST" && conn.isOwner && req.bodyItems.data){
			mouf.set(taskpaper.makeKeyName(), decodeURIComponent(req.bodyItems.data[0]));
		}

		return mouf.render("template/view.htm", {
			page: taskpaper.page,
			owner: conn.isOwner,
			//items: taskpaper.parse(mouf.get(taskpaper.makeKeyName(), taskpaper.defaultContent)),
			items: taskpaper.parse(mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT)),
			//isIndex: (taskpaper.page === taskpaper.defaultPage),
			isIndex: (taskpaper.page === taskpaper.constant.DEFAULT_PAGE),
			root: mouf.getAddress(req)
		});
	};

	// handler
	mouf.addHandler("_index", main);
	mouf.addHandler("main", main);
	mouf.addHandler("edit", function(conn, req, res){
		if(conn.isOwner){
			taskpaper.page = getPageName(req);
			return mouf.render("template/edit.htm", {
				page: taskpaper.page,
				root: mouf.getAddress(req),
				//data: mouf.get(taskpaper.makeKeyName(), taskpaper.defaultContent)
				data: mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT)
			});
		} else {
			return mouf.render("template/error.htm", {});
		}
	});

	mouf.addHandler("update", function(conn, req, res){
		var result = "error";
		if(req.method === "POST" && conn.isOwner && req.bodyItems.id && req.bodyItems.checked && req.bodyItems.page){
			var id = parseInt(req.bodyItems.id[0]);
			var checked = (req.bodyItems.checked[0] === "true") ? true : false;
			var page = req.bodyItems.page[0];

			taskpaper.page = page;
			//var content = mouf.get(taskpaper.makeKeyName(), taskpaper.defaultContent);
			var content = mouf.get(taskpaper.makeKeyName(), taskpaper.constant.DEFAULT_CONTENT);
			var newContent = [];
			var newLine = null;
			mouf.each(content.split(/[\r\n]+/), function(index){
				if(index !== id){
					newContent.push(this);
				} else {
					if(checked){
						newLine = this + " #done";
					} else {
						newLine = this.replace("#done", "").replace("  ", " ");
					}
					newContent.push(newLine);
				}
			});
			mouf.set(taskpaper.makeKeyName(), newContent.join("\n"));
			result = "success"
		}
		return result;
	});
})();


