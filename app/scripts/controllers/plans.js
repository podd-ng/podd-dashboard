'use strict';

angular.module('poddDashboardApp')

.controller('PlansModeCtrl', function (Menu) {
  Menu.setActiveMenu('plans');
})

.controller('PlansCtrl', function ($scope, Menu, PlanReport) {
  Menu.setActiveMenu('plans');
                              
  $scope.loading = false;
  $scope.page = 1;
  $scope.endPageList = false;
  $scope.planReports = [];

  function fetch(page) {
    if ($scope.loading) return;
    $scope.loading = true;
    
    page = page || 1;
    
    var query = {
      page: page,
      page_size: 20
    };
    
    PlanReport.query(query).$promise
      .then(function (resp) {
        if (resp.length < query.page_size) {
          $scope.endPageList = true;
          // end process if empty list.
          if (resp.length === 0) return;
        }
        
        resp.forEach(function (item) {
          $scope.planReports.push(item);
          
          if (!item.log.plan.levels) {
            item.log.plan.levels = [
              { name: 'Red', code: 'red' },
              { name: 'Yellow', code: 'yellow' },
              { name: 'Green', code: 'green' }
            ];
          }
          
          var levelAreas = item.log.level_areas;
          item.affectedAreasCount = 0;
          item.myLevelAreasCount = 0;
          
          item.log.plan.levels.forEach(function (plan) {
            item.affectedAreasCount += levelAreas[plan.code].length;
            item.myLevelAreasCount += item.log.my_level_areas[plan.code].length;
          });
        });
      })
      .finally(function () {
        $scope.loading = false;
      });
  }
  
  $scope.loadMore = function () {
    $scope.page += 1;
    fetch($scope.page);
  };
  
  fetch();
  
})

;
