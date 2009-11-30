var taskpaper = {};
taskpaper.appName = "unitaskpapera";
taskpaper.defaultPage = "index";
taskpaper.page = taskpaper.defaultPage;
taskpaper.defaultContent = "- sample\n- done task #done";

taskpaper.makeKeyName = function(){
	return this.appName + "_" + this.page;
};

taskpaper.parseLine = function(line){
	var text = mouf.trim(line);
	var tags = null;
	var done = false;

	if(text.indexOf(":") === text.length - 1){
		return {
			isTask: false,
			caption: text
		};
	} else {
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
			isTask: true,
			caption: text,
			done: done,
			tags: tags
		};
	}
};

taskpaper.parse = function(str){
	var group = {
		name: "default",
		tasks: {}
	};
	var res = {};
	var count = {
		group: 0,
		task: 0
	};

	mouf.each(str.split(/[\r\n]+/), function(){
		var parsedItem = taskpaper.parseLine(this);

		if(parsedItem.isTask){
			// task
			group.tasks[count.task++] = parsedItem;
		} else {
			// group
			res[count.group++] = group;
			group.name = parsedItem.caption;
			group.tasks = {};
			count.task = 0;
		}
		//res[count] = taskpaper.parseLine(this);
		//++count;
		res[count.group] = group;
	});
	return res;
};

(function(){
	var getPageName = function(req){
		var pageName = taskpaper.defaultPage;
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
			items: taskpaper.parse(mouf.get(taskpaper.makeKeyName(), taskpaper.defaultContent)),
			isIndex: (taskpaper.page === taskpaper.defaultPage),
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
				data: mouf.get(taskpaper.makeKeyName(), taskpaper.defaultContent)
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
			var content = mouf.get(taskpaper.makeKeyName(), taskpaper.defaultContent);
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
			/*
			if(newLine){
				var taskpaper.parseLine(newLine)
			}
			*/
			result = "success"
		}
		return result;
	});
})();


