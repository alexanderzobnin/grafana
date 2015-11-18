define([
  'angular',
  'app/app',
  'lodash',
  'config',
  'app/components/panelmeta',
  'app/plugins/datasource/zabbix/helperFunctions',
],
function (angular, app, _, config, PanelMeta) {
  'use strict';

  var module = angular.module('grafana.panels.triggers', []);
  app.useModule(module);

  module.directive('grafanaPanelTriggers', function() {
    return {
      controller: 'TriggersPanelCtrl',
      templateUrl: 'app/panels/triggers/module.html',
    };
  });

  module.controller('TriggersPanelCtrl', function($q, $scope, panelSrv, zabbixHelperSrv) {

    $scope.panelMeta = new PanelMeta({
      panelName: 'Zabbix triggers',
      editIcon:  "fa fa-lightbulb-o",
      fullscreen: true,
    });

    $scope.panelMeta.addEditorTab('Options', 'app/panels/triggers/editor.html');

    var defaults = {
      lastChangeField: true,
      ageField: true,
      infoField: true,
      limit: 10
    };

    _.defaults($scope.panel, defaults);
    $scope.triggerList = [];

    $scope.init = function() {
      panelSrv.init($scope);

      if ($scope.isNewPanel()) {
        $scope.panel.title = "Zabbix Triggers";
      }
    };

    $scope.refreshData = function() {

      var triggerColors = {
        0: '#DBDBDB',
        1: '#D6F6FF',
        2: '#FFF6A5',
        //3: 'rgb(137, 15, 2)',
        3: '#FFB689',
        4: '#FF9999',
        5: '#FF3838',
      };
      $scope.triggerColors = triggerColors;

      return $scope.datasource.zabbixAPI.getTriggers($scope.panel.limit)
        .then(function(triggers) {
          var promises = _.map(triggers, function (trigger) {
            var lastchange = new Date(trigger.lastchange * 1000);
            var lastchangeUnix = trigger.lastchange;
            var now = new Date();

            // Consider local time offset
            var ageUnix = now - lastchange + now.getTimezoneOffset() * 60000;
            var age = zabbixHelperSrv.toZabbixAgeFormat(ageUnix);
            var triggerObj = trigger;
            triggerObj.lastchange = lastchange.toLocaleString();
            triggerObj.age = age.toLocaleString();
            triggerObj.color = triggerColors[trigger.priority];

            // Request acknowledges for trigger
            return $scope.datasource.zabbixAPI.getAcknowledges(trigger.triggerid, lastchangeUnix)
              .then(function (acknowledges) {
                if (acknowledges.length) {
                  triggerObj.acknowledges = _.map(acknowledges, function (ack) {
                    var time = new Date(+ack.clock * 1000);
                    ack.time = time.toLocaleString();
                    ack.user = ack.alias + ' (' + ack.name + ' ' + ack.surname + ')';
                    return ack;
                  });
                }
                return triggerObj;
              });
          });
          return $q.all(promises).then(function (triggerList) {
            $scope.triggerList = triggerList;
            $scope.panelRenderingComplete();
          });
        });
    };

    $scope.init();
  });
});
