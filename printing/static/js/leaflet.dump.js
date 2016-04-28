L.toJson = function(map) {
    data = {};
    data.center = [map.getCenter().lng,map.getCenter().lat];
    var bounds = map.getBounds();
    data.bounds = [bounds.getSouthWest().lng,bounds.getSouthWest().lat,bounds.getNorthEast().lng,bounds.getNorthEast().lat];
    data.zoom = map.getZoom();
    data.wms_layers = [];
    data.markers = [];
    map.eachLayer(function (layer){
        settings = {}
        if (layer instanceof L.Marker) {
            settings.point = [layer.getLatLng().lng,layer.getLatLng().lat];
            settings.options = {
                opacity:layer.options.opacity,
                icon:layer.options.icon.options,
            };
            data.markers.push(settings);
        } else if( layer instanceof L.TileLayer.WMS) {
            settings.url = layer._url;
            settings.options = {
                opacity:layer.options.opacity,
                tileSize:layer.options.tileSize,
                crs: layer.options.crs.code,
                zIndex:layer.options.zIndex,
            };
            settings.wmsParams = layer.wmsParams;
            data.wms_layers.push(settings);
        }
    });

    return data;
}
