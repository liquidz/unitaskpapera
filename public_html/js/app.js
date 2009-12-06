var tpApp = {};

tpApp.constant = {
	LINK_MAX_LENGTH: 40
};

tpApp.toggleDoneEvent = function(e){
	var address = $("#address").val();
	var page = $("#page").val();
	var id = e.target.id.split("_")[1];
	var checked = (e.target.checked) ? "true" : "false";

	$.post(address + "/toggle_task", {
		page: page,
		id: id,
		checked: checked
	}, function(res){
		if(res === "success"){
			var label = $("label#label_" + id);
			if(checked === "true"){
				label.addClass("done");
				label.parent().append("<span class='tag t"+id+"'>#done</span>")
			} else {
				label.removeClass("done");
				$("span.t" + id).remove(":contains('done')");
			}
		} else {
			e.target.checked = !checked;
		}
	});
};
tpApp.searchEvent = function(e){
	var keyword = e.target.value.replace(/[\"\']/, "");
	tpApp.search(keyword);
}

tpApp.search = function(keyword){
	var lis = $("ul#items li");
	if(keyword === ""){
		lis.show();
	} else {
		lis.hide();
		$.each(lis, function(){
			var elem = $(this);
			if(elem.html().replace(/<\/?[^>]+>/gi, "").indexOf(keyword) !== -1){
				elem.show();
			}
		});
	}
};

tpApp.toggleGroup = function(e){
	var id = e.target.id.split("_")[1];
	var elem = $("dl dd#group_body_" + id);

	var address = $("#address").val();
	var page = $("#page").val();
	var opened = (elem.attr("class").indexOf("closed") === -1) ? "true" : "false";

	$.post(address + "/toggle_group", {
		page: page,
		id: id,
		opened: opened
	}, function(res){
		if(res === "success"){
			var title = $(e.target);

			if(opened === "true"){
				title.text(title.text().replace(/:\s*$/, ";"));
			} else {
				title.text(title.text().replace(/;\s*$/, ":"));
			}
			// dt class
			$(e.target).toggleClass("closed");
			// dd class
			elem.toggleClass("closed");
			elem.toggle();
		}
	});
};

tpApp.makeURLtoLink = function(){
	var elem = $(this);
	if(elem.text().indexOf("http") !== -1){
		elem.html(elem.html().replace(/(https?:\/\/[\x21-\x7e]+)/, "<a href='$1' target='_blank' class='link'>$1</a>"));
	}
};

jQuery(function(){
	var owner = $("#owner");

	$("input#search").bind("keyup", tpApp.searchEvent);
	if(owner && owner.val() === "true"){
		// task
		$("ul.items li input").bind("click", tpApp.toggleDoneEvent);
		// group
		$("dl dt.group").bind("click", tpApp.toggleGroup);
		$("dl dd.closed").hide();
	} else {
		$("ul.items li input").attr("disabled", "true");
	}

	$("span.tag").bind("click", function(e){
		var keyword = $.trim(e.target.innerHTML);
		$("input#search").val(keyword);
		tpApp.search(keyword);
	});
	$("a#clear").bind("click", function(){
		$("input#search").val("");
		tpApp.search("");
	});

	$.each($("ul li label"), tpApp.makeURLtoLink);
	$.each($("ul li p"), tpApp.makeURLtoLink);

	$.each($("a.link"), function(){
		var elem = $(this);
		if(elem.text().length > tpApp.constant.LINK_MAX_LENGTH){
			elem.text(elem.text().substr(0, tpApp.constant.LINK_MAX_LENGTH) + "...");
		}
	});
});
