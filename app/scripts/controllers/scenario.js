/* global L, d3 */
'use strict';

angular.module('poddDashboardApp')

.controller('ScenarioModeCtrl', function (Menu) {
  Menu.setActiveMenu('scenario');
})

.controller('ScenarioCtrl', function ($scope, Menu, Reports, $compile, $interval, $stateParams, $anchorScroll, $location) {
  Menu.setActiveMenu('scenario');

  L.mapbox.accessToken = config.MAPBOX_ACCESS_TOKEN;


  var options = {
    center: [13.791177699, 100.58814079],
    zoomLevel: 15,
    zoomControl: false
  };
  var leafletMap = config.MAPBOX_MAP_ID ?
                      L.mapbox.map('map', config.MAPBOX_MAP_ID, options) :
                      L.map('map', options);

  // Zoom control.
  leafletMap.addControl(new L.control.zoom({
    position: 'topleft'
  }));

  // Custom map control.
  var LayersControl = L.Control.extend({
    options: {
      position: 'topright',
    },
    onAdd: function () {
      var $container = $('.layers-control');
      $compile($container)($scope);
      return $container[0];
    }
  });
  // TODO: this can cause:
  // `TypeError: Cannot read property 'childNodes' of undefined`
  // leafletMap.addControl(new LayersControl());


  var reportsLayer = new L.featureGroup().addTo(leafletMap),
      gisLayer = new L.WFS({
        url: config.GIS_BASEPATH,
        typeNS: 'poddgis_vet',
        typeName: 'water_body_cm',
        // typeName: 'Road',
        geometryField: 'geom',
        crs: L.CRS.EPSG4326
      }).addTo(leafletMap);

  var layers = {
    form: {
      report: true,
      gis: true
    },
    layers: {
      report: reportsLayer,
      gisLayer: gisLayer
    }
  };
  $scope.layers = layers;

// TODO: this move to function:
// Graph Control
var parseDate = d3.time.format('%m/%Y').parse;
var FormatMonthDate = d3.time.format('%b %Y');
var FormatDayDate = d3.time.format('%Y-%m-%d');

var margin = {top: 10, right: 50, bottom: 20, left: 20},
    defaultExtent = [parseDate('01/2015'), parseDate('12/2015')],
    width = 800 - margin.left - margin.right,
    height = 100 - margin.top - margin.bottom;

$scope.window = [ FormatDayDate(defaultExtent[0]), FormatDayDate(defaultExtent[1]) ];

var x = d3.time.scale().range([0, width]),
    y = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis().scale(x).orient('bottom').tickFormat(FormatMonthDate).ticks(12),
    yAxis = d3.svg.axis().scale(y).orient('left');

var brushTransition;

$scope.reportMarkers = [];

var brush = d3.svg.brush()
    .x(x)
    .on('brushend', function () {
        brushTransition = d3.select(this);

        if (!brush.empty()) {
          /*jshint -W064 */
          $scope.window = [ FormatDayDate(brush.extent()[0]), FormatDayDate(brush.extent()[1]) ];
          // 
          if (!play) {
            reportsLayer.clearLayers();
            $scope.reportMarkers = [];
          }

          query.date__lte = FormatDayDate(brush.extent()[1]);
          query.date__gte = FormatDayDate(brush.extent()[0]);
          /*jshint: +W064 */

          refreshReportsLayerData();
        }

      }
    );

var area = d3.svg.area()
    .interpolate('monotone')
    .x(function(d) {
      return x(d.date);
    })
    .y0(height)
    .y1(function(d) {
      return y(d.negative);
    });

var svg = d3.select('#chart').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

svg.append('defs').append('clipPath')
    .attr('id', 'clip')
  .append('rect')
    .attr('width', width)
    .attr('height', height);

var context = svg.append('g')
    .attr('class', 'context')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

var read = function() {

  var tempData = [
    { 'date': '01/2015', 'negative': 1 },
    { 'date': '02/2015', 'negative': 5 },
    { 'date': '03/2015', 'negative': 5 },
    { 'date': '04/2015', 'negative': 3 },
    { 'date': '05/2015', 'negative': 1 },
    { 'date': '06/2015', 'negative': 10 },
    { 'date': '07/2015', 'negative': 0 },
    { 'date': '08/2015', 'negative': 3 },
    { 'date': '09/2015', 'negative': 1 },
    { 'date': '10/2015', 'negative': 4 },
    { 'date': '11/2015', 'negative': 5 },
    { 'date': '12/2015', 'negative': 6 },
  ];

  var data = [];

  tempData.forEach(function(d) {
    data.push({
      'date': parseDate(d.date),
      'negative': d.negative
    });
  });

  x.domain(d3.extent(data.map(function(d) { return d.date; })));
  y.domain([0, d3.max(data.map(function(d) { return d.negative; }))]);

  context.append('path')
      .datum(data)
      .attr('class', 'area')
      .attr('d', area);

  context.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

  context.append('text')
    .attr('class', 'x label')
    .attr('text-anchor', 'end')
    .attr('x', width - 5)
    .attr('y', height - 6)
    .text('number of negative reports per month (times)');

  context.append('g')
      .attr('class', 'x brush')
      .call(brush)
      .call(brush.event)
    .selectAll('rect')
      .attr('y', -6)
      .attr('height', height + 7);
};

read();

function playDemo() {

  if (brush.empty()) {
    return;
  }

  var dateStart = brush.extent()[0];
  dateStart.setDate(dateStart.getDate() + 7);

  var dateEnd = brush.extent()[1];
  if (dateEnd.getDate() + 7 > parseDate('12/2015')) {
    dateEnd = parseDate('12/2015');
  } else {
    dateEnd.setDate(dateEnd.getDate() + 7);
  }

  if (brush.extent()[1] > parseDate('12/2015')) {
    return;
  }

  var targetExtent = [dateStart, dateEnd];

  brushTransition.transition()
      .duration(brush.empty() ? 0 : speed)
      .call(brush.extent(targetExtent))
      .call(brush.event);

  return;
}

var demoInterval = null;
var speed = 1000;
var play = false;

$scope.play = function () {
  play = true;

  setTimeout(function() {
    playDemo();
    demoInterval = $interval(playDemo, speed);
  }, 100);
};

$scope.speedDown = function () {
  if (speed < 1000) {
    speed += 10;
  }
};

$scope.speedUp = function () {
  if (speed > 0) {
    speed -= 10;
  }
};

$scope.pause = function () {
  play = false;

  $interval.cancel(demoInterval);
  demoInterval = null;
};

$scope.replay = function () {
  play = false;

  var diff = Math.floor((brush.extent()[1] - brush.extent()[0]) / (1000*60*60*24));

  var dateStart = parseDate('01/2015');

  var dateEnd = parseDate('01/2015');
  dateEnd.setDate(dateEnd.getDate() + diff);

  var targetExtent = [dateStart, dateEnd];

  brushTransition.transition()
      .duration(brush.empty() ? 0 : 0)
      .call(brush.extent(targetExtent))
      .call(brush.event);

  $interval.cancel(demoInterval);
  demoInterval = null;
};

// End Graph Control


  var query = {
    // TODO: set default bounds
    bottom: $stateParams.bottom || 99.810791015625,
    left: $stateParams.left || 17.764381077782076,
    top: $stateParams.top || 198.1298828125,
    right: $stateParams.right || 19.647760955697354,
    date__lte: $scope.window[1],
    date__gte: $scope.window[0],
    negative: true,
    page_size: 1000,
    lite: true
  };


  $scope.toggleReportsLayer = function (forceValue) {
    var nextValue = angular.isUndefined(forceValue) ?
                      !layers.form.report :
                      forceValue;

    if (nextValue) {
      reportsLayer.addTo(leafletMap);
    }
    else {
      leafletMap.removeLayer(reportsLayer);
    }
  };

  $scope.toggleGISLayer = function (forceValue) {
    var nextValue = angular.isUndefined(forceValue) ?
                      !layers.form.gis :
                      forceValue;

    if (nextValue) {
      gisLayer.addTo(leafletMap);
    }
    else {
      leafletMap.removeLayer(gisLayer);
    }
  };

  var colors = [ '#ff0000', 
    '#ff0000', '#ff0000', '#ff0000', '#ff0000', '#ff0000',
    '#000000', '#000000', '#ffff00', '#00ff00', '#ffff00', 
    '#ffff00', '#00ff00', '#000000', '#00ff00', '#000000']
  

  var lastLayer = null;

  function refreshReportsLayerData() {
    Reports.list(query).$promise.then(function (resp) {

      var drawnItems = new L.FeatureGroup();
      reportsLayer.addLayer(drawnItems);

      // var clusterGroup = new L.MarkerClusterGroup().addTo(drawnItems);

      resp.results.forEach(function (item) {
        var location = [
          item.reportLocation.coordinates[1],
          item.reportLocation.coordinates[0]
        ];
        var marker = L.marker(location, {
          icon: L.mapbox.marker.icon({
              'marker-color': colors[item.reportTypeId],
          })
        });

        marker.item = item;

        marker.on('mouseover', function () {
          var self = this;
          $scope.$apply(function () {
            self.isActive = true;
          })
        });

        marker.on('mouseout', function () {
          var self = this;
          $scope.$apply(function () {
            self.isActive = false;
          })
        });

        marker.on('click', function () {
          console.log('click');
          var self = this;

          var newHash = 'report-item-' + self.item.id.split('.')[2]

          $scope.$apply(function () {

            if ($location.hash() !== newHash) {
              $location.hash(newHash);
            }
            else {
              $anchorScroll();
            }
          });

        });

        
        // console.log(items.indexOf(item.id) != -1);

        // if (items.indexOf(item.id) != -1) {
        //   return;
        // }

        marker.addTo(drawnItems);
        $scope.reportMarkers.push(marker);
        console.log(marker.item);
        console.log($scope.reportMarkers);
      });


      if( play && lastLayer !== null) {
        reportsLayer.removeLayer(lastLayer)
      }

      lastLayer = drawnItems;

      // fit bound.
      var bounds = reportsLayer.getBounds();
      leafletMap.fitBounds(bounds);

    });
  }
  refreshReportsLayerData();

});
