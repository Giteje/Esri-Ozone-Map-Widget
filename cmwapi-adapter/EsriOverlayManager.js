define(["cmwapi/cmwapi", "esri/layers/KMLLayer", "cmwapi-adapter/EsriOverlayManager/Overlay",
    "cmwapi-adapter/EsriOverlayManager/Feature", "OWFWidgetExtensions/owf-widget-extended" ],
    function(cmwapi, KMLLayer, OverlayHandler, FeatureHandler, OWFWidgetExtensions) {
    /**
     * @copyright © 2013 Environmental Systems Research Institute, Inc. (Esri)
     *
     * @license
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at<br>
     * <br>
     *     {@link http://www.apache.org/licenses/LICENSE-2.0}<br>
     * <br>
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @description Manager for overlay layers to be used in conjunction with an ESRI map,
     *  the {@link EsriAdapter}, and the {@link Map|Common Map Widget API}
     *
     * @version 1.1
     *
     * @module cmwapi-adapter/EsriOverlayManager
     */

    /**
     * @constructor
     * @param map {object} The ESRI map object which this overlay manager should apply to
     * @alias module:cmwapi-adapter/EsriOverlayManager
     */
    var EsriOverlayManager = function(map, errorNotifier, infoNotifier) {
        var me = this;
        var notifier = errorNotifier;
        var infoNotifier = infoNotifier;

        me.overlays = {};

        me.overlay = new OverlayHandler(me, map);
        me.feature = new FeatureHandler(me, map);

        var treeChangedHandlers = [];

        var OVERLAY_PREF_NAMESPACE = 'com.esri',
            OVERLAY_PREF_NAME = 'overlayState';


        /**
         * Adds a handler to be called when the overlay tree structure changes
         * @method bindTreeChangeHandler
         * @param handlerFunction {Function} The handler function to be called on change
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.bindTreeChangeHandler = function(handlerFunction) {
            if(typeof(handlerFunction) === 'function') {
                treeChangedHandlers.push(handlerFunction);
            }
        };

        /**
         * Call the registered handlers when the overlay tree structure has
         *  changed
         * @method treeChanged
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.treeChanged = function() {
            for(var i = 0; i < treeChangedHandlers.length; i++) {
                treeChangedHandlers[i]();
            }
        };

        /**
         * Return the overlay tree as a flattened object
         * @method getOverlayTree
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.getOverlayTree = function() {
            var result = [];
            var overlay;
            for(var overlayId in me.overlays) {
                overlay = me.overlays[overlayId];
                if(!overlay.parentId) {
                    result.push(resolveOverlayChildren(overlay.id));
                }
            }
            return result;
        };

        me.notifyError = function( src, msg) {
            notifier(msg);
        }

        me.notifyInfo = function( src, msg) {
            infoNotifier(msg);
        }

        /**
         *
         * @private
         * @method resolveOverlayChildren
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        var resolveOverlayChildren = function(overlayId) {
            var overlay = me.overlays[overlayId];

            var res = {
                type: 'overlay',
                id: overlay.id,
                name: overlay.name,
                isHidden: overlay.isHidden,
                children: []
            };

            var child;
            var resolvedChild;
            var feature;

            for(var childId in overlay.children) {
                child = overlay.children[childId];
                resolvedChild = resolveOverlayChildren(child.id);
                res.children.push(resolvedChild);
            }
            for(var featureId in overlay.features) {
                feature = overlay.features[featureId];
                res.children.push({
                    type: 'feature',
                    id: feature.featureId,
                    name: feature.name,
                    format: feature.format,
                    zoom: feature.zoom,
                    isHidden: feature.isHidden,
                    esriObject: feature.esriObject
                });
            }

            return res;
        };

        /**
         * Return the overlays list
         * @method getOverlays
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.getOverlays = function() {
            return me.overlays;
        };

        /**
         * Pass through a call to the common map widget api for map.overlay.create
         * @method sendOverlayCreate
         * @param id {String} The id to give to the overlay
         * @param name {String} The name to give to the overlay
         * @param [parentId] {String} The id of the overlay to set as the parent
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendOverlayCreate = function(id, name, parentId) {
            var payload = {};
            if (typeof(id) !== 'undefined') {
                payload.overlayId = id;
            }
            if (typeof(name) !== 'undefined') {
                payload.name = name;
            }
            if (typeof(parentId) !== 'undefined') {
                payload.parentId = parentId;
            }

            cmwapi.overlay.create.send(payload);
        };

        /**
         * Pass through a call to the common map widget api for map.overlay.remove
         * @method sendOverlayRemove
         * @param overlayId {String} The id of the overlay to remove
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendOverlayRemove = function(overlayId) {
            cmwapi.overlay.remove.send({
                overlayId: overlayId
            });
        };

        /**
         * Pass through a call to the common map widget api for map.overlay.hide
         * @method sendOverlayHide
         * @param overlayId {String} The id to give to the overlay
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendOverlayHide = function(overlayId) {
            cmwapi.overlay.hide.send({
                overlayId: overlayId
            });
        };

        /**
         * Pass through a call to the common map widget api for map.overlay.show
         * @method sendOverlayShow
         * @param overlayId {String} The id to give to the overlay
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendOverlayShow = function(overlayId) {
            cmwapi.overlay.show.send({
                overlayId: overlayId
            });
        };

        /**
         * Pass through a call to the common map widget api for map.overlay.update
         * @method sendOverlayCreate
         * @param overlayId {String} The id to give to the overlay
         * @param [name] {String} The name to give to the overlay
         * @param [newParentId] {String} The id of the overlay to set as the parent
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendOverlayUpdate = function(overlayId, name, newParentId) {
            cmwapi.overlay.update.send({
                overlayId: overlayId,
                name: name,
                parentId: newParentId
            });
        };

        /**
         * Pass through a call to the common map widget api for map.feature.plot.url
         * @method sendFeaturePlotUrl
         * @param overlayId {String} The id of the overlay to which this feature should be added
         * @param featureId {String}
         * @param name {String} The name to give to the feature
         * @param format {String} The format of the url to plot.  "kml" and "wms" are allowed values.
         * @param [params] {Object} params data to use with wms
         * @param [zoom] {Boolean} Whether or not to zoom to feature when plotted
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendFeaturePlotUrl = function(overlayId, featureId, name, format, url, params, zoom) {
            var payload = {
                overlayId: overlayId,
                featureId: featureId,
                name: name,
                format: format,
                url: url,
                zoom: zoom
            };

            if (params !== null && typeof(params) !== 'undefined') {
                if(cmwapi.validator.isString(params) && params.length > 0) {
                    payload.params = OWF.Util.parseJson(params);
                } else {
                    payload.params = params;
                }
            }
            cmwapi.feature.plot.url.send(payload);
        };

        /**
         * Pass through a call to the common map widget api for map.feature.unplot
         * @method sendFeatureUnplot
         * @param overlayId {String} The id of the overlay containing the feature
         * @param featureId {String} The id of the feature to unplot
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendFeatureUnplot = function(overlayId, featureId) {
            cmwapi.feature.unplot.send({
                overlayId: overlayId,
                featureId: featureId
            });
        };


        /**
         * Pass through a call to the common map widget api for map.feature.update
         * @method sendFeatureUpdate
         * @param overlayId {String} The id of the overlay containing the feature
         * @param featureId {String} The id of the feature to unplot
         * @param [newName] {String}
         * @param [newOverlayId] {String}
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendFeatureUpdate = function(overlayId, featureId, newName, newOverlayId) {
            cmwapi.feature.update.send({
                overlayId: overlayId,
                featureId: featureId,
                name: newName,
                newOverlayId: (newOverlayId ? newOverlayId : null)
            });
        };

        /**
         * Pass through a call to the common map widget api for map.feature.hide
         * @method sendFeatureHide
         * @param overlayId {String} The id of the overlay containing the feature
         * @param featureId {String} The id of the feature to hide
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendFeatureHide = function(overlayId, featureId) {
            cmwapi.feature.hide.send({
                overlayId: overlayId,
                featureId: featureId
            });
        };

        /**
         * Pass through a call to the common map widget api for map.feature.show
         * @method sendFeatureShow
         * @param overlayId {String} The id of the overlay containing the feature
         * @param featureId {String} The id of the feature to show44
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.sendFeatureShow = function(overlayId, featureId, zoom) {
            cmwapi.feature.show.send({
                overlayId: overlayId,
                featureId: featureId,
                zoom: (zoom ? zoom : false)
            });
        };

        /**
         * @method archiveState
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.archiveState = function() {
            var overlayData = me.getOverlays();

            /*
                The Esri data apparently has a recursive structure, so making it a JSON string won't work while esri objects are embedded
            */
            var overlay, feature, overlayId;
            var esriObjectMapping = [];
            for(overlayId in overlayData) {
                overlay = overlayData[overlayId];
                if (overlay.features) {
                    for (var featureId in overlayData[overlayId].features) {
                        feature = overlayData[overlayId].features[featureId];
                        if (feature.esriObject) {
                            esriObjectMapping.push( { feature: feature, esriObject: feature.esriObject });
                            feature.esriObject = null;
                        }
                    }
                }
            }

            var successHandler = function() {
                // Preferences were saved; no action required; this is an example handler.
            };
            var failureHandler = function(e) { 
                cmwapi.error.send({
                    sender: OWF.getInstanceId(),
                    type: "internal error",
                    msg: "Unable to archive state",
                    error: "Error: " + e
                });
            };

            var dataValue = OWFWidgetExtensions.Util.toString(overlayData);
            OWFWidgetExtensions.Preferences.setWidgetInstancePreference({namespace: OVERLAY_PREF_NAMESPACE, name: OVERLAY_PREF_NAME,
                value: dataValue, onSuccess: successHandler, onFailure: failureHandler  });

            // reapply esriObjects
            var esriObjectId;
            for (esriObjectId in esriObjectMapping) {
                esriObjectMapping[esriObjectId].feature.esriObject = esriObjectMapping[esriObjectId].esriObject;
            }

        };

        /**
         * @method retrieveState
         * @memberof module:cmwapi-adapter/EsriOverlayManager#
         */
        me.retrieveState = function() {

            var successHandler = function(retValue) {
                if (retValue && retValue.value) {
                    me.overlays = OWFWidgetExtensions.Util.parseJson(retValue.value);
                }

                // iterate over overlays and apply...
                var i, j;
                var overlayId, overlayName;
                var feature, featureId, featureName, featureFormat, featureUrl, featureParams, zoom;
                for (i in me.overlays) {
                    // create overlay
                    overlayId = me.overlays[i].id;
                    overlayName = me.overlays[i].name;
                    me.overlay.createOverlay(OWF.getInstanceId(), overlayId, overlayName);

                    // create any child features in overlay
                    for (j in me.overlays[i].features) {
                        feature = me.overlays[i].features[j];
                        featureId = feature.featureId;
                        featureName = feature.name;

                        // esri returns kml-url in its esriObject, but won't itself accept it...
                        featureFormat = feature.format;
                        if (featureFormat === "kml-url") {
                            featureFormat = "kml";
                        }

                        if (featureFormat === "wms-url") {
                            featureFormat = "wms";
                        }

                        featureUrl = feature.feature;
                        featureParams = (feature.params) ? feature.params : null;
                        zoom = false;
                        //payload contains a marker.
                        if(featureFormat === "marker") {
                            me.feature.plotMarker(null, overlayId, featureId, featureName, feature.marker, zoom);
                        }
                        else {
                            me.feature.plotFeatureUrl(OWF.getInstanceId(), overlayId, featureId, featureName,
                                featureFormat, featureUrl, featureParams, zoom);
                        }
                        if(feature && feature.isHidden) {
                            me.feature.hideFeature(OWF.getInstanceId(), overlayId, featureId);
                        }
                    }
                }
            };

            var failureHandler = function(e) {
                cmwapi.error.send({
                    sender: OWF.getInstanceId(),
                    type: "internal error",
                    msg: "Error in getting preference.",
                    error: "Error: " + e
                });
            };

            OWFWidgetExtensions.Preferences.getWidgetInstancePreference({namespace: OVERLAY_PREF_NAMESPACE, name: OVERLAY_PREF_NAME,
                onSuccess: successHandler, onFailure: failureHandler });

        };

        /**
         * @method deleteState
         * @memberof module:cmwapi-adaper/EsriOverlayManager#
         */
        me.deleteState = function() {
            // TODO: not yet implemented - need to determine when a widget is removed, rather than just closed - want to hold onto
            //   widget instance preferences in between....
        };
    };

    return EsriOverlayManager;
});
