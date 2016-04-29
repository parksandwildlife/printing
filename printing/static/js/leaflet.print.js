"use strict";
L.Print = function(mapid,login_user,data) {
    $("#map_north_west").html("(" + data.bounds[0] + "," + data.bounds[1]+ ")");
    $("#map_north_east").html("(" + data.bounds[0] + "," + data.bounds[3]+ ")");
    $("#map_south_west").html("(" + data.bounds[2] + "," + data.bounds[1]+ ")");
    $("#map_south_east").html("(" + data.bounds[2] + "," + data.bounds[3]+ ")");

    $("#map_zoom_level").html(data.zoom);
    $("#map_creator").html(login_user.email);
    $("#map_create_time").html(new Date().toLocaleString());

    var restore = L.Restore(mapid,login_user,data);
    $(".leaflet-control-scale.leaflet-control").appendTo("#map_scale");

    

    return restore;
}
