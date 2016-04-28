"use strict";
var sss = (function (s) {
    s.get = function(url, func) {
        // ajax shim for auth
        $.ajax({
            url: url,
            xhrFields: {
                withCredentials: true
            }
        }).then(func);
    };

    s.loading = {"init":"loading"};
    s.loadCheck = function(evt) {
        console.log('load check:' + evt.type);
        s.loading[evt.target._leaflet_id] = evt.type;
        if (_.without(_.values(s.loading), "load").length === 0) {
            ready_to_print = true;
        }
    };

    s.wms_layers = function() {
        for (var i = 0;i < s.data.wms_layers.length;i++) {
            var layer = s.data.wms_layers[i];
            console.log('add wms layer ' + layer.wmsParams.layers); 
            if ("crs" in layer.options) {
                var crs = layer.options['crs'];
                if (typeof crs == "string") {
                    if (crs == "EPSG:3857") {
                        layer.options["crs"] = L.CRS.EPSG3857
                    } else if (crs == "EPSG:4326") {
                        layer.options["crs"] = L.CRS.EPSG4326
                    } else if (crs == "EPSG:3395") {
                        layer.options["crs"] = L.CRS.EPSG3395
                    }
                }
            }
            var mapLayer = L.tileLayer.betterWms(layer.url,  _.extend(layer.wmsParams,layer.options));
            mapLayer.on("loading load", s.loadCheck).addTo(s.map);
            if  ("opacity" in layer.options) {
                mapLayer.setOpacity(layer.options.opacity);
            }
        }
    };

    // Cached loader
    // Map dependent ractive observers
    s.marker_layer = function() {
        for (var i = 0;i < s.data.markers.length;i++) {
            var marker = s.data.markers[i];
            if (marker.options.icon.className == "awesome-marker") {
                L.marker(L.latLng(marker.point[1],marker.point[0]), {
                    icon: L.AwesomeMarkers.icon({
                        icon: marker.options.icon.icon, 
                        iconColor: marker.options.icon.iconColor,
                        markerColor: marker.options.icon.markerColor, 
                        prefix: marker.options.icon.prefix
                    })
                }).addTo(s.map);
            } else {
                L.marker(L.latLng(marker.point[1],marker.point[0]),{
                    opacity:marker.options.opacity,
                    icon:L.icon(marker.options.icon)
                }).addTo(s.map);
            }
        }
    };

    s.before_print = function() {
        var grid_number = 8;
        var grid_precision = 0;
        var lon_span = s.map.getBounds().getEast() - s.map.getBounds().getWest();
        var lat_span = s.map.getBounds().getNorth() - s.map.getBounds().getSouth();
        var grid_interval = (lon_span > lat_span)?lat_span / grid_number:lon_span / grid_number;
        if (grid_interval > 1) {
            grid_interval = Math.round(grid_interval);
            grid_precision = 0;
        } else if (grid_interval > 0.1) {
            grid_interval = (Math.round(grid_interval * 10) / 10).toFixed(1);
            grid_precision = 1;
        } else if (grid_interval > 0.01) { 
            grid_interval = (Math.round(grid_interval * 100) / 100).toFixed(2);
            grid_precision = 2;
        } else if (grid_interval > 0.001) {
            grid_interval = (Math.round(grid_interval * 1000) / 1000).toFixed(3);
            grid_precision = 3;
        } else if (grid_interval > 0.0004) {
            grid_interval = 0.001;
            grid_precision = 3;
        } else {
            grid_interval = 0;
            grid_precision = 0;
        }
        if (grid_interval > 0) {
            var map_grid = L.simpleGraticule({
                interval:grid_interval,
                showOriginLabel:true,
                precision:grid_precision,
                redraw:'move'
            });
            map_grid.addTo(s.map);
        }
    };

    s.launch = function() { 
        console.log('Begin to process111'); 
        L.mapbox.accessToken =  'pk.eyJ1IjoiZHBhd2FzaSIsImEiOiJtVjY5WmlFIn0.whc76euXLk2PkyxOkZ5xlQ'

        //var map = (new L.SssMap('map')).setView([-26, 120], 6);
        var map = L.mapbox.map('map',null,{
            crs:L.CRS.EPSG4326,
            zoom:s.data.zoom,
            center:L.latLng(s.data.center[1],data.center[0]),
        }).setView(L.latLng(s.data.center[1],data.center[0]), s.data.zoom);
        //assign the map object to s.map directly, because some callback methods reference s.map and will cause javascript exception. 
        s.map = map;
        map.removeControl(map.zoomControl);
        map.zoomControl = new L.Control.Zoom({ position: 'topright' }).addTo(map);
        L.control.coordinates({ position: 'bottomright', useDMS: true }).addTo(map);
        L.control.scale({ position: 'bottomright', imperial: false, metric:true,maxWidth:500 }).addTo(map);
        s.hash = L.hash(map);
        if (s.data.wms_layers.length > 0 ) {
            s.wms_layers()
        } else {
            console.log('add base layer'); 
            s.baseLayer = L.mapbox.tileLayer('dpawasi.k9a74ich').on("loading load", s.loadCheck);
            s.baseLayer.addTo(s.map).bringToBack(); // if no custom layers, add osm base back
        }
        s.marker_layer();

        s.loading["init"] = "load";
        if (_.without(_.values(s.loading), "load").length === 0) {
            ready_to_print = true;
        }

        //s.before_print()


    };

    // Login setup
    s.data = data
    s.launch();
return s; }(sss || {}));
