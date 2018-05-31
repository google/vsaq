/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Tests for vsaq.questionnaire.items.UploadItem.
 */

goog.provide('vsaq.questionnaire.items.UploadItemTests');
goog.setTestOnly('vsaq.questionnaire.items.UploadItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.net.IframeIo');
goog.require('goog.net.XhrIo');
goog.require('goog.style');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.net.XhrIo');
goog.require('vsaq.questionnaire.items.UploadItem');

var CAPTION = 'uploaditem_caption';
var ID = 'uploaditem_id';
var VALUE = 'fileid|filename';

var upload;

var stubs = new goog.testing.PropertyReplacer();
var mock;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  stubs.replace(goog.net.XhrIo, 'send', goog.testing.net.XhrIo.send);
  mock = new goog.testing.MockControl();
  upload = new vsaq.questionnaire.items.UploadItem(ID, [], CAPTION);
}


/**
 * Resets mocks after each test.
 */
function tearDown() {
  goog.testing.net.XhrIo.cleanup();
  stubs.reset();
}


/**
 * Tests whether UploadItems are rendered correctly.
 */
function testUploadItem() {
  var el = upload.container;

  assertEquals(String(goog.dom.TagName.DIV), el.tagName);
  var desc = goog.dom.getFirstElementChild(el);
  assertEquals(CAPTION, goog.dom.getTextContent(desc));
  var fileTypeDesc = goog.dom.getNextElementSibling(desc);
  assertEquals(String(goog.dom.TagName.DIV), fileTypeDesc.tagName);
  var form = goog.dom.getNextElementSibling(fileTypeDesc);
  assertEquals(upload.form_, form);
  assertEquals('multipart/form-data', form.enctype);
  var label = goog.dom.getFirstElementChild(form);
  assertEquals('uploaditem_id-label', label.id);
  assertEquals(upload.label_, label);
  var input = goog.dom.getNextElementSibling(label);
  assertEquals(String(goog.dom.TagName.INPUT), input.tagName);
  assertEquals('uploaditem_id-file', input.id);
  var dlLink = goog.dom.getNextElementSibling(input);
  assertEquals(String(goog.dom.TagName.A), dlLink.tagName);
  assertEquals('uploaditem_id-download', dlLink.id);
  var delLink = goog.dom.getNextElementSibling(dlLink);
  assertEquals(String(goog.dom.TagName.A), delLink.tagName);
  assertEquals('uploaditem_id-delete', delLink.id);
}


/**
 * Tests setting and retrieving the value of the item.
 */
function testUploadItemSetGetValue() {
  assertEquals('', upload.getValue());
  upload.setValue(VALUE);
  assertEquals(VALUE, upload.getValue());
  assertEquals('filename', upload.filename_);
  assertEquals('fileid', upload.fileId_);
  assertEquals(false, goog.style.isElementShown(upload.fileInput_));
  assertEquals('Uploaded file: filename',
      goog.dom.getTextContent(upload.label_));
  assertEquals(true, goog.style.isElementShown(upload.deleteLink_));
  assertEquals(true, goog.style.isElementShown(upload.downloadLink_));

  upload.setValue('');
  assertEquals('', upload.getValue());
  assertEquals('', upload.filename_);
  assertEquals('', upload.fileId_);
  assertEquals(true, goog.style.isElementShown(upload.fileInput_));
  assertEquals('', goog.dom.getTextContent(upload.label_));
  assertEquals(false, goog.style.isElementShown(upload.deleteLink_));
  assertEquals(false, goog.style.isElementShown(upload.downloadLink_));
}


/**
 * Tests parsing of UploadItems.
 */
function testUploadItemParse() {
  var testStack = [{
    'type': 'upload',
    'text': CAPTION,
    'id': ID
  }];
  upload = vsaq.questionnaire.items.UploadItem.parse(testStack);
  assert(upload instanceof vsaq.questionnaire.items.UploadItem);
  assertEquals(ID, upload.id);
  assertEquals(CAPTION, upload.text);
  assertEquals(0, testStack.length);
  assertTrue(upload.auth != 'readonly');

  testStack = [{
    'type': 'upload',
    'text': CAPTION,
    'id': ID,
    'auth': 'readonly'
  }];
  upload = vsaq.questionnaire.items.UploadItem.parse(testStack);
  assert(upload instanceof vsaq.questionnaire.items.UploadItem);
  assertEquals(ID, upload.id);
  assertEquals(CAPTION, upload.text);
  assertEquals(0, testStack.length);
  assertEquals('readonly', upload.auth);
}


/**
 * Tests clicking the delete link.
 */
function testUploadItemDeleteLink() {
  upload.setValue(VALUE);

  mock.createMethodMock(upload, 'answerChanged');
  mock.createMethodMock(window, 'confirm');

  window.confirm(goog.testing.mockmatchers.isString).$returns(true);
  upload.answerChanged();

  mock.$replayAll();
  goog.testing.events.fireClickEvent(upload.deleteLink_);
  mock.$verifyAll();

  assertEquals('', upload.getValue());
  assertEquals('', upload.filename_);
  assertEquals('', upload.fileId_);
  assertEquals(true, goog.style.isElementShown(upload.fileInput_));
  assertEquals('', goog.dom.getTextContent(upload.label_));
  assertEquals(false, goog.style.isElementShown(upload.deleteLink_));
  assertEquals(false, goog.style.isElementShown(upload.downloadLink_));
}


/**
 * Tests handling of uploads.
 */
function testUploadItemHandleUpload() {
  var mockIframeIo = mock.createLooseMock(goog.net.IframeIo, true);
  var mockIframeIoConstructor = mock.createConstructorMock(goog.net,
      'IframeIo');

  // need to mock out fileInput_ as file input elements have a readonly value.
  upload.fileInput_ = goog.dom.createDom(goog.dom.TagName.INPUT);
  upload.fileInput_.value = 'test.pdf';

  mockIframeIoConstructor().$returns(mockIframeIo);
  mockIframeIo.sendFromForm(upload.form_);

  mock.$replayAll();
  upload.handleUpload_();

  var xhrio = goog.testing.net.XhrIo.getSendInstances();
  assertEquals(1, xhrio.length);
  xhrio = xhrio[0];

  assertEquals('POST', xhrio.getLastMethod());
  assertEquals('/ajax?f=GetUploadUrl', xhrio.getLastUri());

  xhrio.simulateResponse(200, '{"url": "/upload123"}');
  mock.$verifyAll();

  assertEquals('Uploading...', goog.dom.getTextContent(upload.label_));
  assertEquals(false, goog.style.isElementShown(upload.fileInput_));
}


/**
 * Tests file uploads with an illegal extension.
 */
function testUploadItemHandleUploadIllegalExtension() {
  // need to mock out fileInput_ as file input elements have a readonly value.
  upload.fileInput_ = goog.dom.createDom(goog.dom.TagName.INPUT);
  upload.fileInput_.value = 'test.illegal';

  upload.handleUpload_();

  assertEquals('Invalid extension.', goog.dom.getTextContent(upload.label_));
  assertEquals(true, goog.style.isElementShown(upload.fileInput_));
}


/**
 * Tests handling of completed uploads.
 */
function testUploadItemHandleCompletedUpload() {
  var mockEvent = {};
  mockEvent.target = {};
  mockEvent.target.getResponseJson = function() {
    var mockReturn = {};
    mockReturn['filename'] = 'filename';
    mockReturn['fileId'] = 'fileid';
    return mockReturn;
  };

  mock.createMethodMock(upload, 'answerChanged');
  upload.answerChanged();

  mock.$replayAll();
  upload.handleCompletedUpload_(mockEvent);
  mock.$verifyAll();

  assertEquals('filename', upload.filename_);
  assertEquals('fileid', upload.fileId_);
  assertEquals('Uploaded file: filename',
      goog.dom.getTextContent(upload.label_));
  assertEquals(true, goog.style.isElementShown(upload.deleteLink_));
  assertEquals(true, goog.style.isElementShown(upload.downloadLink_));
}
