var tpApp = {};

tpApp.toggleDoneEvent = function(e){
	var address = $("#address").val();
	var page = $("#page").val();
	var id = e.target.id.split("_")[1];
	var checked = (e.target.checked) ? "true" : "false";

	opera.postError("toggle: " + address + "/update");

	$.post(address + "/update", {
		page: page,
		id: id,
		checked: checked
	}, function(res){
		opera.postError("res = " + res);
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
			e.target.checked = (checked === "true") ? false : true;
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
		jQuery.each(lis, function(){
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

	elem.toggle(200, function(){
		//elem.css
	});
};

jQuery(function(){
	var owner = $("#owner");

	$("input#search").bind("keyup", tpApp.searchEvent);
	if(owner && owner.val() === "true"){
		$("ul.items li input").bind("click", tpApp.toggleDoneEvent);
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

	$("dl dt.group").bind("click", function(e){
		var id = e.target.id.split("_")[1];
		$("dl dd#group_body_" + id).toggle();
	});
	$("dl dd.closed").hide();
});
