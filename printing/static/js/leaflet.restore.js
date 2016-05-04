"use strict";
L.Restore = function(mapid,login_user,data) {
    var self = this;
    var loading = {"init":"loading"};
    self.ready_to_print = false;
    self.data = data;
    self.map = null;
    self.mapid = mapid;
    self.login_user = login_user;

    var load_check = function(evt) {
        logger.info('load check :' + evt.target.layer_name + " "  + evt.type);
        loading[evt.target._leaflet_id] = evt.type;
        if (_.without(_.values(loading), "load").length === 0) {
            post_restore();
            logger.info("End to restore map stack.");
            self.ready_to_print = true;
        }
    };

    var wms_layers = function() {
        logger.info("Begin to restore wms layers"); 
        for (var i = 0;i < self.data.wms_layers.length;i++) {
            var layer = self.data.wms_layers[i];
            logger.info('Add wms layer ' + layer.wmsParams.layers); 
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
            mapLayer.layer_name = layer.wmsParams.layers;
            mapLayer.on("loading load", load_check).addTo(self.map);
            if  ("opacity" in layer.options) {
                //mapLayer.setOpacity(layer.options.opacity);
            }
        }
        logger.info("End to restore wms layers"); 
    };

    // Cached loader
    // Map dependent ractive observers
    var marker_layer = function() {
        logger.info('Begin to add markers'); 
        var marker_group = L.featureGroup();
        for (var i = 0;i < self.data.markers.length;i++) {
            var marker = self.data.markers[i];
            if (marker.options.icon.className == "awesome-marker") {
                logger.debug('Add awesome marker at position ' + JSON.stringify(marker.point) + ' with icon ' + marker.options.icon.icon); 
                var marker_layer = L.marker(marker.point, {
                    icon: L.AwesomeMarkers.icon({
                        icon: marker.options.icon.icon, 
                        iconColor: marker.options.icon.iconColor,
                        markerColor: marker.options.icon.markerColor, 
                        prefix: marker.options.icon.prefix
                    })
                });
                marker_group.addLayer(marker_layer);
            } else {
                var marker_layer = L.marker(marker.point,{
                    opacity:marker.options.opacity,
                    icon:L.icon(marker.options.icon)
                });
                marker_group.addLayer(marker_layer);
            }
        }
        self.map.addLayer(marker_group);
        logger.info('End to add markers'); 
    };

    var polyline_layer = function() {
        logger.info('Begin to add polylines'); 
        var polyline_group = L.featureGroup();
        var left = true;
        var direction = left?"left":"right";
        for (var i = 0;i < self.data.polylines.length;i++) {
            var polyline = self.data.polylines[i];
            logger.debug('Add polyline (' + JSON.stringify(polyline.points) + ')'); 
            var polyline_layer = L.polyline(polyline.points, polyline.options).addTo(polyline_group);
            if (polyline.label != null && self.data.label == true)  {
                polyline.label.options.noHide=true;
                L.circleMarker(polyline.points[0], { fillColor: "#f00", radius: 4 } ).addTo(polyline_group);
                var length = polyline.points.length;
                L.circleMarker(polyline.points[length - 1], { fillColor: "#f00", radius: 4 } ).addTo(polyline_group);
                L.circleMarker([(polyline.points[0][0] + polyline.points[length - 1][0]) / 2,(polyline.points[0][1] + polyline.points[length - 1][1]) / 2], { fillColor: "#f00", radius: 0 } ).bindLabel(polyline.label.label, { direction: left?"left":"right" ,noHide:true}).addTo(polyline_group);
                left = !left;
            }
        }
        self.map.addLayer(polyline_group);
        logger.info('End to add polylines'); 
    };

    var add_grid = function() {
        if (self.data.grid == null || self.data.grid == false) {
            return;
        }
        logger.info('Begin to add grid'); 
        var grid_number = 8;
        var grid_precision = 0;
        var lon_span = self.map.getBounds().getEast() - self.map.getBounds().getWest();
        var lat_span = self.map.getBounds().getNorth() - self.map.getBounds().getSouth();
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
            map_grid.addTo(self.map);
        }
        logger.info('End to add grid'); 
    };

    var post_restore = function() {
        add_grid();
    }

    var restore = function() { 
        logger.info('Begin to restore leaflet map stack.'); 
        L.mapbox.accessToken =  'pk.eyJ1IjoiZHBhd2FzaSIsImEiOiJtVjY5WmlFIn0.whc76euXLk2PkyxOkZ5xlQ';

        //var map = (new L.SssMap('map')).setView([-26, 120], 6);
        logger.info('Begin to initialize map with zoom level ' + self.data.zoom); 
        var map = L.mapbox.map(self.mapid,null,{
            crs:L.CRS.EPSG4326,
            zoom:self.data.zoom,
            center:L.latLng(self.data.center[0],data.center[1]),
        }).setView(L.latLng(self.data.center[0],data.center[1]), self.data.zoom);

        //assign the map object to self.map directly, because some callback methods reference self.map and will cause javascript exception. 
        self.map = map;
        map.removeControl(map.zoomControl);
        //map.zoomControl = new L.Control.Zoom({ position: 'topright' }).addTo(map);
        L.control.coordinates({ position: 'bottomright', useDMS: true }).addTo(map);
        L.control.scale({ position: 'bottomright', imperial: false, metric:true,maxWidth:500 }).addTo(map);
        self.hash = L.hash(map);

        logger.info("End to initialize map"); 
        if (self.data.wms_layers.length > 0 ) {
            wms_layers()
        } else {
            logger.info("Begin to add base layer"); 
            var baseLayer = L.mapbox.tileLayer('dpawasi.k9a74ich').on("loading load", s.load_check);
            baseLayer.layer_name = "baseLayer";
            baseLayer.addTo(self.map).bringToBack(); // if no custom layers, add osm base back
            logger.info("End to add base layer"); 
        }
    
        marker_layer();

        polyline_layer();

        loading["init"] = "load";
        if (_.without(_.values(loading), "load").length === 0) {
            logger.info("End to restore map stack.");
            self.ready_to_print = true;
        }

    };
    restore();

    return self
};
