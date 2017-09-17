import { describe, beforeEach, it, expect } from 'test/lib/common';
// import moment from 'moment';
// import helpers from 'test/specs/helpers';
// import { PrometheusDatasource } from '../datasource';
import { ResponseTransformer } from '../result_transformer';

describe('ResultTransformer', function() {
  var response;
  var transformer;
  var start = 1234567788;
  var end = 12334567776;

  beforeEach(() => {
    transformer = new ResponseTransformer(null);
  });

  describe.only('can transform to table', function() {
    response = [
      {
        metric: { __name__: 'metric', job: 'testjob', le: '10' },
        values: [[1443454528.0, '10'], [1443454528.0, '10']],
      },
      {
        metric: { __name__: 'metric', job: 'testjob', le: '20' },
        values: [[1443454528.0, '20'], [1443454528.0, '10']],
      },
      {
        metric: { __name__: 'metric', job: 'testjob', le: '30' },
        values: [[1443454528.0, '25'], [1443454528.0, '10']],
      },
    ];
    var result = [
      {
        target: '10',
        datapoints: [[1443454528.0, 10], [1443454528.0, 10]],
      },
      {
        target: '20',
        datapoints: [[1443454528.0, 10], [1443454528.0, 0]],
      },
      {
        target: '30',
        datapoints: [[1443454528.0, 5], [1443454528.0, 0]],
      },
    ];

    it('label_values(resource) should generate label search query', function() {
      expect(transformer.transform(result, response, { format: 'heatmap' }, start, end)).to.equal(response);
    });
  });
});
