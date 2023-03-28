import {MemoryLoader} from '../../src/io/memoryLoader';
import {b64urlToArrayBuffer} from '../dicom/utils';

import bbmri53323131 from '../data/bbmri-53323131.dcm';
import bbmri53323275 from '../data/bbmri-53323275.dcm';
import dwvTestSimple from '../data/dwv-test-simple.dcm';
import dwvTestNoNumberRows from '../data/dwv-test_no-number-rows.dcm';
import multiframeTest1 from '../data/multiframe-test1.dcm';
import bbmriZip from '../data/bbmri.zip';
import dwvTestBadZip from '../data/dwv-test_bad.zip';

/**
 * Tests for the 'io/memoryLoader.js' file.
 */
/** @module tests/io */
// Do not warn if these variables were not defined before.
/* global QUnit */
QUnit.module('io');

/**
 * Check the events of memory load
 *
 * @param {object} assert The Qunit assert object.
 * @param {string} id An id for the test.
 * @param {Array} data The data to load as a string array.
 * @param {number} nData The theoretical number of data.
 * @param {number} nDataOk The theoretical number of data with no error.
 */
function checkLoad(assert, id, data, nData, nDataOk) {
  var done = assert.async();

  var prefix = '[' + id + '] ';
  var nDataError = nData - nDataOk;

  // checks
  var loadStartDates = [];
  var progressDates = [];
  var loadItemDates = [];
  var loadDates = [];
  var errorDates = [];
  var abortDates = [];
  var gotLoadEnd = false;

  // create loader
  var loader = new MemoryLoader();
  // callbacks
  loader.onloadstart = function (/*event*/) {
    loadStartDates.push(new Date());
  };
  loader.onprogress = function (/*event*/) {
    progressDates.push(new Date());
  };
  loader.onloaditem = function (/*event*/) {
    loadItemDates.push(new Date());
  };
  loader.onload = function (/*event*/) {
    loadDates.push(new Date());
  };
  loader.onloadend = function (/*event*/) {
    var loadEndDate = new Date();
    assert.notOk(gotLoadEnd,
      prefix + 'Received first load end.');
    gotLoadEnd = true;

    // check number of events
    assert.equal(loadStartDates.length, 1,
      prefix + 'Received one load start.');
    if (nDataOk !== 0) {
      assert.ok(progressDates.length > 0,
        prefix + 'Received at least one progress.');
    }
    assert.equal(loadItemDates.length, nDataOk,
      prefix + 'Received ' + nDataOk + ' load item.');
    var nLoad = nDataError === 0 ? 1 : 0;
    assert.equal(loadDates.length, nLoad,
      prefix + 'Received ' + nLoad + ' load.');
    assert.equal(errorDates.length, nDataError,
      prefix + 'Received ' + nDataError + ' error(s).');
    assert.equal(abortDates.length, 0,
      prefix + 'Received 0 abort(s).');

    // check start/end sequence
    var loadStartDate = loadStartDates[0];
    assert.ok(loadStartDate < loadEndDate,
      prefix + 'Received start before load end.');

    var firstProgressDate = null;
    var lastProgressDate = null;
    var firstLoadItemDate = null;
    var lastLoadItemDate = null;

    if (nDataOk !== 0) {
      // check progress sequence
      progressDates.sort();
      firstProgressDate = progressDates[0];
      lastProgressDate = progressDates[progressDates.length - 1];
      assert.ok(loadStartDate <= firstProgressDate,
        prefix + 'Received start before first progress.');
      assert.ok(loadEndDate >= lastProgressDate,
        prefix + 'Received end after last progress.');

      // check load item sequence
      loadItemDates.sort();
      firstLoadItemDate = loadItemDates[0];
      lastLoadItemDate = loadItemDates[loadItemDates.length - 1];
      assert.ok(loadStartDate <= firstLoadItemDate,
        prefix + 'Received start before first load item.');
      assert.ok(loadEndDate >= lastLoadItemDate,
        prefix + 'Received end after last load item.');
    }

    // check load or error event sequence
    if (nDataError === 0) {
      // load is sent if no error happened
      var loadDate = loadDates[0];
      assert.ok(loadStartDate <= loadDate,
        prefix + 'Received start before load.');
      assert.ok(loadDate >= lastProgressDate,
        prefix + 'Received load after last progress.');
      assert.ok(loadDate >= lastLoadItemDate,
        prefix + 'Received load after last load item.');
      assert.ok(loadEndDate >= loadDate,
        prefix + 'Received end after load.');
    } else {
      errorDates.sort();
      var firstErrorDate = errorDates[0];
      var lastErrorDate = errorDates[errorDates.length - 1];
      assert.ok(loadStartDate <= firstErrorDate,
        prefix + 'Received start before first error.');
      assert.ok(loadEndDate >= lastErrorDate,
        prefix + 'Received end after last error.');
    }
    // finish async test
    done();
  };
  loader.onerror = function (/*event*/) {
    errorDates.push(new Date());
  };
  loader.onabort = function (/*event*/) {
    abortDates.push(new Date());
  };
  // launch load
  loader.load(data);
}

/**
 * Tests for {@link MemoryLoader} events with single frame data.
 *
 * @function module:tests/io~MemoryLoader0
 */
QUnit.test('Test MemoryLoader events for single frame.', function (assert) {
  // #0: 2 good dicom
  var data0 = [
    {
      data: b64urlToArrayBuffer(bbmri53323131),
      filename: 'bbmri-53323131.dcm'
    },
    {
      data: b64urlToArrayBuffer(bbmri53323275),
      filename: 'bbmri-53323275.dcm'
    }
  ];
  var nData0 = data0.length;
  var nDataOk0 = nData0;
  checkLoad(assert, '0', data0, nData0, nDataOk0);

  // // #1: 2 not found (404) dicom
  // var data1 = [
  //   '/a.dcm',
  //   '/b.dcm',
  // ];
  // var nData1 = data1.length;
  // var nDataOk1 = 0;
  // checkLoad(assert, '1', data1, nData1, nDataOk1);

  // // #2: 2 dicom, 1 not found (404, error in XHR request)
  // var data2 = [
  //   '/tests/data/bbmri-53323131.dcm',
  //   '/b.dcm',
  // ];
  // var nData2 = data2.length;
  // var nDataOk2 = 1;
  // checkLoad(assert, '2', data2, nData2, nDataOk2);

  // #3: 2 dicom, 1 bad (no rows, error in loader)
  var data3 = [
    {
      data: b64urlToArrayBuffer(dwvTestSimple),
      filename: 'dwv-test-simple.dcm'
    },
    {
      data: b64urlToArrayBuffer(dwvTestNoNumberRows),
      filename: 'dwv-test_no-number-rows.dcm',
    }
  ];
  var nData3 = data3.length;
  var nDataOk3 = 1;
  checkLoad(assert, '3', data3, nData3, nDataOk3);
});

/**
 * Tests for {@link MemoryLoader} events with multi frame data.
 *
 * @function module:tests/io~MemoryLoader1
 */
QUnit.test('Test MemoryLoader events for multi frame.', function (assert) {
  // #0: simple multi frame
  var data0 = [
    {
      data: b64urlToArrayBuffer(multiframeTest1),
      filename: 'multiframe-test1.dcm'
    }
  ];
  var nData0 = data0.length;
  var nDataOk0 = nData0;
  checkLoad(assert, '0', data0, nData0, nDataOk0);

  // #1: encoded multi frame
  // TODO seems to cause problems to phantomjs...
  /*var data1 = [
        "/tests/data/multiframe-jpegloss-ge.dcm",
    ];
    var nData1 = data1.length;
    var nDataOk1 = nData1;
    checkLoad(assert, "1", data1, nData1, nDataOk1);*/
});

/**
 * Tests for {@link MemoryLoader} events with zipped data.
 *
 * @function module:tests/io~MemoryLoader2
 */
QUnit.test('Test MemoryLoader events for zipped data.', function (assert) {
  // #0: simple zip
  var data0 = [
    {
      data: b64urlToArrayBuffer(bbmriZip),
      filename: 'bbmri.zip'
    }
  ];
  var nData0 = 2;
  var nDataOk0 = 2;
  checkLoad(assert, '0', data0, nData0, nDataOk0);

  // // #1: bad link to zip
  // var data1 = [
  //   '/tests/data/a.zip',
  // ];
  // var nData1 = 1;
  // var nDataOk1 = 0;
  // checkLoad(assert, '1', data1, nData1, nDataOk1);

  // #2: zip with erroneus data
  var data2 = [
    {
      data: b64urlToArrayBuffer(dwvTestBadZip),
      filename: 'dwv-test_bad.zip'
    }
  ];
  var nData2 = 2;
  var nDataOk2 = 1;
  checkLoad(assert, '2', data2, nData2, nDataOk2);
});

/**
 * Tests for {@link UrlsLoader} events with DCMDIR data.
 *
 * @function module:tests/io~UrlsLoader3
 */
// TODO...
// QUnit.test('Test UrlsLoader events for DCMDIR data.', function (assert) {
//   // #0: simple DCMDIR
//   var data0 = [
//     '/tests/data/bbmri.dcmdir',
//   ];
//   var nData0 = 4;
//   var nDataOk0 = 4;
//   checkLoad(assert, '0', data0, nData0, nDataOk0);

//   // #1: bad link to DCMDIR
//   var data1 = [
//     '/tests/data/a.dcmdir',
//   ];
//   var nData1 = 1;
//   var nDataOk1 = 0;
//   checkLoad(assert, '1', data1, nData1, nDataOk1);

//   // #2: DCMDIR with bad links -> TODO
//   // #3: DCMDIR with erroneus data -> TODO
// });
