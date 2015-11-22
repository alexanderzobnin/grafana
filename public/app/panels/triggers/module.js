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

  module.controller('TriggersPanelCtrl', function($q, $scope, $element, panelSrv, zabbixHelperSrv, popoverSrv) {

    $scope.panelMeta = new PanelMeta({
      panelName: 'Zabbix triggers',
      editIcon:  "fa fa-lightbulb-o",
      fullscreen: true,
    });

    $scope.panelMeta.addEditorTab('Options', 'app/panels/triggers/editor.html');

    var triggerSeverity = [
      { priority: 0, severity: 'Not classified', color: '#DBDBDB' },
      { priority: 1, severity: 'Information', color: '#D6F6FF' },
      { priority: 2, severity: 'Warning', color: '#FFF6A5' },
      { priority: 3, severity: 'Average', color: '#FFB689' },
      { priority: 4, severity: 'High', color: '#FF9999' },
      { priority: 5, severity: 'Disaster', color: '#FF3838' }
    ];

    var defaults = {
      severityField: false,
      lastChangeField: true,
      ageField: true,
      infoField: true,
      limit: 10,
      showTriggers: 'all triggers',
      sortTriggersBy: 'last change',
      triggerSeverity: triggerSeverity
    };

    _.defaults($scope.panel, defaults);
    $scope.triggerList = [];

    $scope.init = function() {
      panelSrv.init($scope);

      if ($scope.isNewPanel()) {
        $scope.panel.title = "Zabbix Triggers";
      }
    };

    $scope.sortTriggers = function() {
      if ($scope.panel.sortTriggersBy === 'last change') {
        $scope.triggerList = $scope.triggerList.sort(function(a, b) {
          return b.lastchangeUnix - a.lastchangeUnix;
        });
      } else if ($scope.panel.sortTriggersBy === 'severity') {
        $scope.triggerList = $scope.triggerList.sort(function(a, b) {
          return b.priority - a.priority;
        });
      }
    };

    $scope.refreshTriggerSeverity = function() {
      _.each($scope.triggerList, function(trigger) {
        trigger.color = $scope.panel.triggerSeverity[trigger.priority].color;
        trigger.severity = $scope.panel.triggerSeverity[trigger.priority].severity;
      });
    };

    $scope.refreshData = function() {
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
            triggerObj.lastchangeUnix = lastchangeUnix;
            triggerObj.lastchange = lastchange.toLocaleString();
            triggerObj.age = age.toLocaleString();
            triggerObj.color = $scope.panel.triggerSeverity[trigger.priority].color;
            triggerObj.severity = $scope.panel.triggerSeverity[trigger.priority].severity;

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
            if ($scope.panel.showTriggers === 'unacknowledged') {
              $scope.triggerList = _.filter(triggerList, function (trigger) {
                return !trigger.acknowledges;
              });
            } else if ($scope.panel.showTriggers === 'acknowledged') {
              $scope.triggerList = _.filter(triggerList, 'acknowledges');
            } else {
              $scope.triggerList = triggerList;
            }

            // sort triggers
            $scope.sortTriggers();

            $scope.panelRenderingComplete();
          });
        });
    };

    $scope.changeTriggerSeverityColor = function(trigger, color) {
      $scope.panel.triggerSeverity[trigger.priority].color = color;
      $scope.refreshTriggerSeverity();
    };

    function getTriggerIndexForElement(el) {
      return el.parents('[data-trigger-index]').data('trigger-index');
    }

    $scope.openTriggerColorSelector = function(event) {
      var el = $(event.currentTarget);
      var index = getTriggerIndexForElement(el);
      var popoverScope = $scope.$new();
      popoverScope.trigger = $scope.panel.triggerSeverity[index];
      popoverScope.changeTriggerSeverityColor = $scope.changeTriggerSeverityColor;

      popoverSrv.show({
        element: el,
        placement: 'top',
        templateUrl:  'app/panels/triggers/trigger.colorpicker.html',
        scope: popoverScope
      });
    };

    $scope.init();
  });
});
