define([
  'angular',
  'app/app',
  'lodash',
  'jquery',
  'config',
  'app/components/panelmeta',
  'app/plugins/datasource/zabbix/helperFunctions',
],
function (angular, app, _, $, config, PanelMeta) {
  'use strict';

  var module = angular.module('grafana.panels.triggers', []);
  app.useModule(module);

  module.directive('grafanaPanelTriggers', function() {
    return {
      controller: 'TriggersPanelCtrl',
      templateUrl: 'app/panels/triggers/module.html',
    };
  });

  module.controller('TriggersPanelCtrl', function($q, $scope, $element,
                                                  datasourceSrv,
                                                  panelSrv,
                                                  templateSrv,
                                                  zabbixHelperSrv,
                                                  popoverSrv) {

    $scope.panelMeta = new PanelMeta({
      panelName: 'Zabbix triggers',
      editIcon:  "fa fa-lightbulb-o",
      fullscreen: true,
    });

    $scope.panelMeta.addEditorTab('Options', 'app/panels/triggers/editor.html');

    $scope.sortByFields = [
      { text: 'last change',  value: 'lastchange' },
      { text: 'severity',     value: 'priority' }
    ];

    var triggerSeverity = [
      { priority: 0, severity: 'Not classified',  color: '#DBDBDB', show: true },
      { priority: 1, severity: 'Information',     color: '#D6F6FF', show: true },
      { priority: 2, severity: 'Warning',         color: '#FFF6A5', show: true },
      { priority: 3, severity: 'Average',         color: '#FFB689', show: true },
      { priority: 4, severity: 'High',            color: '#FF9999', show: true },
      { priority: 5, severity: 'Disaster',        color: '#FF3838', show: true }
    ];

    var panelDefaults = {
      datasource: null,
      triggers: {
        group: {name: 'All', groupid: null},
        host: {name: 'All', hostid: null},
        application: {name: 'All', value: null}
      },
      severityField: false,
      lastChangeField: true,
      ageField: true,
      infoField: true,
      limit: 10,
      showTriggers: 'all triggers',
      sortTriggersBy: { text: 'last change', value: 'lastchange' },
      triggerSeverity: triggerSeverity
    };

    _.defaults($scope.panel, panelDefaults);
    $scope.triggerList = [];

    $scope.init = function() {
      panelSrv.init($scope);
      if ($scope.isNewPanel()) {
        $scope.panel.title = "Zabbix Triggers";
      }

      if (!$scope.metric) {
        $scope.metric = {
          groupList: [{name: 'All', groupid: null}],
          hostList: [{name: 'All', hostid: null}],
          applicationList: [{name: 'All', applicationid: null}]
        };
      }

      // Get zabbix data sources
      var datasources = _.filter(datasourceSrv.getMetricSources(), function(datasource) {
        return datasource.meta.type === 'zabbix';
      });
      $scope.datasources = _.map(datasources, 'name');

      // Update lists of groups, hosts and applications
      $scope.updateGroups()
        .then($scope.updateHosts)
        .then($scope.updateApplications);
    };

    $scope.updateGroups = function() {
      return datasourceSrv.get($scope.panel.datasource).then(function (datasource) {
        return $scope.updateGroupList(datasource);
      });
    };

    $scope.updateHosts = function() {
      return datasourceSrv.get($scope.panel.datasource).then(function (datasource) {
        return $scope.updateHostList(datasource);
      });
    };

    $scope.updateApplications = function() {
      return datasourceSrv.get($scope.panel.datasource).then(function (datasource) {
        return $scope.updateAppList(datasource);
      });
    };

    $scope.groupChanged = function() {
      return $scope.updateHosts()
        .then($scope.updateApplications)
        .then($scope.refreshData);
    };

    $scope.hostChanged = function() {
      return $scope.updateApplications()
        .then($scope.refreshData);
    };

    $scope.appChanged = function() {
      return $scope.updateHosts();
    };

    $scope.sortTriggers = function() {
      if ($scope.panel.sortTriggersBy.value === 'lastchange') {
        $scope.triggerList = $scope.triggerList.sort(function(a, b) {
          return b.lastchangeUnix - a.lastchangeUnix;
        });
      } else if ($scope.panel.sortTriggersBy.value === 'priority') {
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

      // Load datasource
      return datasourceSrv.get($scope.panel.datasource).then(function (datasource) {
        var zabbix = datasource.zabbixAPI;

        var groupid = $scope.panel.triggers.group.groupid;
        var hostid = $scope.panel.triggers.host.hostid;
        var applicationid = $scope.panel.triggers.application.applicationid;

        // Get triggers
        return zabbix.getTriggers($scope.panel.limit,
                                  $scope.panel.sortTriggersBy.value,
                                  groupid,
                                  hostid,
                                  applicationid,
                                  $scope.panel.triggers.name)
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
              return zabbix.getAcknowledges(trigger.triggerid, lastchangeUnix)
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

              // Filter triggers by severity
              $scope.triggerList = _.filter(triggerList, function (trigger) {
                return $scope.panel.triggerSeverity[trigger.priority].show;
              });
              // sort triggers
              //$scope.sortTriggers();

              $scope.panelRenderingComplete();
            });
          });
      });
    };

    $scope.datasourceChanged = function() {
      $scope.refreshData();
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

    /**
     * Update list of host groups
     */
    $scope.updateGroupList = function (datasource) {
      datasource.zabbixAPI.performHostGroupSuggestQuery().then(function (groups) {
        $scope.metric.groupList = $scope.metric.groupList.concat(groups);
      });
    };

    $scope.updateHostList = function (datasource) {
      var groups = $scope.panel.triggers.group.groupid ? $scope.panel.triggers.group.name : '*';
      if (groups) {
        datasource.zabbixAPI.hostFindQuery(groups).then(function (hosts) {
          $scope.metric.hostList = [{name: 'All', hostid: null}];
          $scope.metric.hostList = $scope.metric.hostList.concat(hosts);
        });
      }
    };

    $scope.updateAppList = function (datasource) {
      var groups = $scope.panel.triggers.group.groupid ? $scope.panel.triggers.group.name : '*';
      var hosts = $scope.panel.triggers.host.hostid ? $scope.panel.triggers.host.name : '*';
      if (groups && hosts) {
        datasource.zabbixAPI.appFindQuery(hosts, groups).then(function (apps) {
          apps = _.map(_.uniq(_.map(apps, 'name')), function (appname) {
            return {
              name: appname,
              value: appname
            };
          });
          $scope.metric.applicationList = [{name: 'All', value: null}];
          $scope.metric.applicationList = $scope.metric.applicationList.concat(apps);
        });
      }
    };

    $scope.init();
  });
});
