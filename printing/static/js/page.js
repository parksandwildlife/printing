"use strict"
var webpage = new (function() {
    var self = this;

    var min_top_margin = 3;
    var min_bottom_margin = 10;
    var min_left_margin = 3;
    var min_right_margin = 3;

    var papers = [
        {
            type:"A0",
            width:841,
            height:1189
        },
        {
            type:"A1",
            width:594,
            height:841
        },
        {
            type:"A2",
            width:420,
            height:594
        },
        {
            type:"A3",
            width:297,
            height:420
        },
        {
            type:"A4",
            width:210,
            height:297
        },
        {
            type:"A5",
            width:148,
            height:210
        },
        {
            type:"A6",
            width:105,
            height:148
        },
        {
            type:"A7",
            width:74,
            height:105
        },
        {
            type:"A8",
            width:52,
            height:74
        },
        
    ]

    $("body").append('<div id="px_per_mm" style="width:1mm;display:none"></div>');
    var px_per_mm = parseFloat($('#px_per_mm').width());
    $("#px_per_mm").remove();

    var to_mm = function(value) {
       if (typeof value == "string"){
           value = value.trim().toLowerCase();
           if (value.substr(value.length - 2) == "mm") {
               return parseFloat(value.substr(0,value.length - 2));
           } else if (value.substr(value.length - 2) == "cm") {
               return parseFloat(value.substr(0,value.length - 2)) * 10;
           } else if (value.substr(value.length - 2) == "in") {
               return parseFloat(value.substr(0,value.length - 2)) * 25.4;
           } else {
               if (value.substr(value.length - 2) == "px") {
                   value = value.substr(0,value.length - 2);
               }
               return parseFloat(value) / px_per_mm;
           }
       } else {
           return value / px_per_mm;
       }
    }
    
    self.set_settings = function(settings) {
        $("body").css("margin-top",settings.printing.margin.top * px_per_mm);
        $("body").css("margin-bottom",settings.printing.margin.bottom * px_per_mm);
        $("body").css("margin-left",settings.printing.margin.left * px_per_mm);
        $("body").css("margin-right",settings.printing.margin.right * px_per_mm);
        $("body").height((settings.printing.height - settings.printing.margin.top - settings.printing.margin.bottom) * px_per_mm);
        $("body").width((settings.printing.width - settings.printing.margin.left - settings.printing.margin.right) * px_per_mm);
    }

    //return the [width,height] after removing margin
    self.clear_margin = function(settings) {
        $("body").css("margin-top","0");
        $("body").css("margin-bottom","0");
        $("body").css("margin-left","0");
        $("body").css("margin-right","0");
        $("body").height((settings.original.height - settings.original.margin.top - settings.original.margin.bottom) * px_per_mm);
        $("body").width((settings.original.width - settings.original.margin.left - settings.original.margin.right) * px_per_mm);
        return [$("body").width(),$("body").height()];
    }

    self.get_settings = function() {
        var settings = {
            original:{},
            printing:{}
        };
        settings.original.margin = {};
        settings.original.margin.top = to_mm($("body").css("margin-top"));
        settings.original.margin.bottom = to_mm($("body").css("margin-bottom"));
        settings.original.margin.left = to_mm($("body").css("margin-left"));
        settings.original.margin.right = to_mm($("body").css("margin-right"));
        settings.original.height = to_mm($("body").height()) + settings.original.margin.top + settings.original.margin.bottom;
        settings.original.width = to_mm($("body").width()) + settings.original.margin.left + settings.original.margin.right;

        //find the right paper
        var width =  Math.ceil(settings.original.width);
        var height = Math.ceil(settings.original.height);

        var horizontal_margin = Math.ceil(settings.original.margin.left) + Math.ceil(settings.original.margin.right);
        var vertical_margin = Math.ceil(settings.original.margin.top) + Math.ceil(settings.original.margin.bottom);
        var min_horizontal_margin = min_left_margin + min_right_margin;
        var min_vertical_margin = min_top_margin + min_bottom_margin;

        if (settings.original.height < settings.original.width) {
            settings.printing.orientation = "landscape";
            width = Math.ceil(settings.original.height);
            height = Math.ceil(settings.original.width);
            vertical_margin = Math.ceil(settings.original.margin.left) + Math.ceil(settings.original.margin.right);
            horizontal_margin = Math.ceil(settings.original.margin.top) + Math.ceil(settings.original.margin.bottom);
            min_vertical_margin = min_left_margin + min_right_margin;
            min_horizontal_margin = min_top_margin + min_bottom_margin;
        } else {
            settings.printing.orientation = "portrait";
        }
        var final_paper = null;
        var previous_paper = null;
        for( var i = 0;i < papers.length;i++) {
            var paper = papers[i];
            //logger.info("==================================");
            //logger.info(JSON.stringify(paper));
            //logger.info(width + "\t" + horizontal_margin + "\t" + min_horizontal_margin);
            //logger.info(height + "\t" + vertical_margin + "\t" + min_vertical_margin);

            if (paper.width < width - (horizontal_margin - min_horizontal_margin)) {
                final_paper = previous_paper;
                break;
            }
            if (paper.height < height - (vertical_margin - min_vertical_margin)) {
                final_paper = previous_paper;
                break;
            }
            previous_paper = paper;
        }
        if (final_paper == null) {
            if (previous_paper != null) {
                final_paper = previous_paper;
            } else {
               throw "Too big page. width = " + width + ", height = " + height;
            }
        }

        settings.printing.paper = final_paper.type;
        settings.printing.margin = {};
        //compute the height,width and margin
        if (settings.printing.orientation == "portrait") {
            settings.printing.width = final_paper.width;
            settings.printing.height = final_paper.height;
            if (final_paper.height > height) {
                settings.printing.margin.top = Math.ceil(settings.original.margin.top);
                settings.printing.margin.bottom = Math.ceil(settings.original.margin.bottom);
            } else if (height - final_paper.height - Math.ceil(settings.original.margin.bottom) >= min_top_margin) {
                settings.printing.margin.bottom = Math.ceil(settings.original.margin.bottom);
                settings.printing.margin.top = final_paper.height - (height - vertical_margin) - settings.printing.margin.bottom;
            } else {
                settings.printing.margin.top = min_top_margin ;
                settings.printing.margin.bottom = final_paper.height - (height - vertical_margin) - settings.printing.margin.top;
            }

            if (final_paper.width > width) {
                settings.printing.margin.left = Math.ceil(settings.original.margin.left);
                settings.printing.margin.right = Math.ceil(settings.original.margin.right);
            } else if (width - final_paper.width - Math.ceil(settings.original.margin.left) >= min_right_margin) {
                settings.printing.margin.left = Math.ceil(settings.original.margin.left);
                settings.printing.margin.right = final_paper.width - (width - horizontal_margin) - settings.printing.margin.left;
            } else {
                settings.printing.margin.right = min_right_margin;
                settings.printing.margin.left = final_paper.width - (width - horizontal_margin) - settings.printing.margin.right;
            }
        } else {
            settings.printing.width = final_paper.height;
            settings.printing.height = final_paper.width;
            if (final_paper.width > width) {
                settings.printing.margin.top = Math.ceil(settings.original.margin.top);
                settings.printing.margin.bottom = Math.ceil(settings.original.margin.bottom);
            } else if (width - final_paper.width - Math.ceil(settings.original.margin.bottom) >= min_top_margin) {
                settings.printing.margin.top = final_paper.width - (width - Math.ceil(settings.original.margin.top)) ;
                settings.printing.margin.bottom = Math.ceil(settings.orginal.margin.top);
            } else {
                settings.printing.margin.top = min_top_margin ;
                settings.printing.margin.bottom = final_paper.width - (width - horizontal_margin) - settings.printing.margin.top;
            }

            if (final_paper.height > height) {
                settings.printing.margin.left = Math.ceil(settings.original.margin.left);
                settings.printing.margin.right = Math.ceil(settings.original.margin.right);
            } else if (height - final_paper.height - Math.ceil(settings.original.margin.left) >= min_right_margin) {
                settings.printing.margin.left = Math.ceil(settings.original.margin.left);
                settings.printing.margin.right = final_paper.height - (height - vertical_margin) - settings.printing.margin.left;
            } else {
                settings.printing.margin.right = min_right_margin;
                settings.printing.margin.left = final_paper.height - (height - vertical_margin) - settings.printing.margin.right;
            }
        }

        //logger.info(JSON.stringify(settings));
        return settings;

    }

    return self;
})();
