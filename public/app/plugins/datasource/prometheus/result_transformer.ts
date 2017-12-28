///<reference path="../../../headers/common.d.ts" />
import _ from 'lodash';

import TableModel from 'app/core/table_model';

export class ResponseTransformer {
  constructor(private templateSrv) {}

  transform(result: any, response: any, settings: any, start: any, end: any) {
    if (settings.format === 'table') {
      result.push(this.transformMetricDataToTable(response));
    } else if (settings.format === 'heatmap') {
      result.push(this.transFormToHistogramOverTime(response));
    } else {
      for (let metricData of response) {
        result.push(this.transformMetricData(metricData, settings, start, end));
      }
    }
  }

  transFormToHistogramOverTime(result: Array<any>) {
    //sort
    result.sort((r1, r2) => {
      //bail if not integer. might happen with bad queries
      var le1 = parseInt(r1.metric.le);
      var le2 = parseInt(r2.metric.le);

      if (le1 > le2) {
        return 1;
      }

      if (le1 < le2) {
        return -1;
      }

      return 0;
    });

    console.log('post sort', result);

    /*      t1 == timestamp1, t2 == timestamp2 etc.

            t1  t2  t3          t1  t2  t3
    le10    10  10  0     =>    10  10  0
    le20    20  10  30    =>    10  0   30
    le30    30  10  35    =>    10  0   5

    */

    for (let serie of result) {
      var decrementer = 0;

      for (let bucket of serie.values) {
      }
    }

    //decount

    //set name to le
  }

  renderTemplate(aliasPattern, aliasData) {
    var aliasRegex = /\{\{\s*(.+?)\s*\}\}/g;
    return aliasPattern.replace(aliasRegex, function(match, g1) {
      if (aliasData[g1]) {
        return aliasData[g1];
      }
      return g1;
    });
  }

  getOriginalMetricName(labelData) {
    var metricName = labelData.__name__ || '';
    delete labelData.__name__;
    var labelPart = _.map(_.toPairs(labelData), function(label) {
      return label[0] + '="' + label[1] + '"';
    }).join(',');
    return metricName + '{' + labelPart + '}';
  }

  createMetricLabel(labelData, options) {
    if (_.isUndefined(options) || _.isEmpty(options.legendFormat)) {
      return this.getOriginalMetricName(labelData);
    }

    return this.renderTemplate(this.templateSrv.replace(options.legendFormat), labelData) || '{}';
  }

  transformMetricData(md, options, start, end) {
    var dps = [],
      metricLabel = null;

    metricLabel = this.createMetricLabel(md.metric, options);

    var stepMs = parseInt(options.step) * 1000;
    var baseTimestamp = start * 1000;
    for (let value of md.values) {
      var dp_value = parseFloat(value[1]);
      if (_.isNaN(dp_value)) {
        dp_value = null;
      }

      var timestamp = parseFloat(value[0]) * 1000;
      for (let t = baseTimestamp; t < timestamp; t += stepMs) {
        dps.push([null, t]);
      }
      baseTimestamp = timestamp + stepMs;
      dps.push([dp_value, timestamp]);
    }

    var endTimestamp = end * 1000;
    for (let t = baseTimestamp; t <= endTimestamp; t += stepMs) {
      dps.push([null, t]);
    }

    return { target: metricLabel, datapoints: dps };
  }

  transformMetricDataToTable(md) {
    var table = new TableModel();
    var i, j;
    var metricLabels = {};

    if (md.length === 0) {
      return table;
    }

    // Collect all labels across all metrics
    _.each(md, function(series) {
      for (var label in series.metric) {
        if (!metricLabels.hasOwnProperty(label)) {
          metricLabels[label] = 1;
        }
      }
    });

    // Sort metric labels, create columns for them and record their index
    var sortedLabels = _.keys(metricLabels).sort();
    table.columns.push({ text: 'Time', type: 'time' });
    _.each(sortedLabels, function(label, labelIndex) {
      metricLabels[label] = labelIndex + 1;
      table.columns.push({ text: label });
    });
    table.columns.push({ text: 'Value' });

    // Populate rows, set value to empty string when label not present.
    _.each(md, function(series) {
      if (series.values) {
        for (i = 0; i < series.values.length; i++) {
          var values = series.values[i];
          var reordered: any = [values[0] * 1000];
          if (series.metric) {
            for (j = 0; j < sortedLabels.length; j++) {
              var label = sortedLabels[j];
              if (series.metric.hasOwnProperty(label)) {
                reordered.push(series.metric[label]);
              } else {
                reordered.push('');
              }
            }
          }
          reordered.push(parseFloat(values[1]));
          table.rows.push(reordered);
        }
      }
    });

    return table;
  }
}
