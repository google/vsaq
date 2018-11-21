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
 * @fileoverview A questionnaire item with a file upload field.
 */

goog.provide('vsaq.questionnaire.items.UploadItem');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.net.EventType');
goog.require('goog.net.IframeIo');
goog.require('goog.net.XhrIo');
goog.require('goog.soy');
goog.require('goog.string');
goog.require('goog.string.format');
goog.require('goog.style');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.questionnaire.utils');



/**
 * A question that allows the user to answer by uploading a file
 * @param {string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} caption The caption to show above the file upload.
 * @param {boolean=} opt_isRequired If true, the item value is required.
 * @param {string=} opt_auth If "readonly", this ValueItem cannot be modified.
 * @extends {vsaq.questionnaire.items.ValueItem}
 * @constructor
 */
vsaq.questionnaire.items.UploadItem = function(id, conditions, caption,
    opt_isRequired, opt_auth) {
  goog.base(this, id, conditions, caption, undefined, undefined, undefined,
            opt_isRequired, undefined, opt_auth);

  /**
   * The form through which the file is uploaded.
   * @type {!HTMLFormElement}
   * @private
   */
  this.form_;

  /**
   * The label next to the file upload. This is used to show the filename of the
   * currently submitted file.
   * @type {!HTMLSpanElement}
   * @private
   */
  this.label_;

  /**
   * A link that allows the user to delete the currently submitted file.
   * @type {!HTMLAnchorElement}
   * @private
   */
  this.deleteLink_;

  /**
   * A link that allows the user to download the currently submitted file.
   * @type {!HTMLAnchorElement}
   * @private
   */
  this.downloadLink_;

  /**
   * The name of the currently submitted file.
   * @type {string}
   * @private
   */
  this.filename_ = '';

  /**
   * The URL to the currently submitted file.
   * @type {string}
   * @private
   */
  this.fileId_ = '';

  /**
   * The html input element where the user can answer the question.
   * @type {!HTMLInputElement}
   * @private
   */
  this.fileInput_;

  this.render();
};
goog.inherits(vsaq.questionnaire.items.UploadItem,
              vsaq.questionnaire.items.ValueItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.UploadItem.prototype.render =
  function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.upload,
      {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text)
      });
  goog.dom.replaceNode(this.container, oldNode);

  this.form_ = /** @type {!HTMLFormElement} */
      (vsaq.questionnaire.utils.findById(this.container, this.id + '-form'));
  this.label_ = /** @type {!HTMLSpanElement} */
      (vsaq.questionnaire.utils.findById(this.container, this.id + '-label'));
  this.deleteLink_ = /** @type {!HTMLAnchorElement} */
      (vsaq.questionnaire.utils.findById(this.container, this.id + '-delete'));
  goog.style.setElementShown(this.deleteLink_, false);
  this.downloadLink_ = /** @type {!HTMLAnchorElement} */ (
      vsaq.questionnaire.utils.findById(this.container, this.id + '-download'));
  goog.style.setElementShown(this.downloadLink_, false);
  this.fileInput_ = /** @type {!HTMLInputElement} */
      (vsaq.questionnaire.utils.findById(this.container, this.id + '-file'));
  // Preserve old value
  this.setValue(this.getValue() || '');
  goog.events.listen(
      this.downloadLink_, goog.events.EventType.CLICK,
      function(e) {
        e.target.href = goog.string.format('/download/%s?q=%s', this.fileId_,
            encodeURIComponent(document.location.pathname));
      }, true, this);
  goog.events.listen(
      this.deleteLink_, goog.events.EventType.CLICK,
      function(e) {
        if (confirm('Are you sure you would like to delete this file?'))
          this.deleteFile_(e);
      },
      true, this);
  goog.events.listen(
      vsaq.questionnaire.utils.findById(this.container, this.id + '-file'),
      goog.events.EventType.CHANGE,
      this.handleUpload_,
      true, this);
};


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.UploadItem.TYPE = 'upload';


/**
 * A URL from where to get the upload URL.
 */
vsaq.questionnaire.items.UploadItem.FETCH_URL_URL = '/ajax?f=GetUploadUrl';


/**
 * A list of file extensions that are accepted by the server.
 */
vsaq.questionnaire.items.UploadItem.VALID_EXTENSIONS =
    ['pdf', 'odt', 'doc', 'docx'];


/**
 * Uploads the file after a user selected one.
 * @private
 */
vsaq.questionnaire.items.UploadItem.prototype.handleUpload_ = function() {
  var file = this.fileInput_.value;
  if (!file) return;

  var ext = file.substring(file.lastIndexOf('.') + 1).toLowerCase();
  if (!goog.array.contains(
      vsaq.questionnaire.items.UploadItem.VALID_EXTENSIONS, ext)) {
    this.deleteFile_();
    goog.dom.setTextContent(this.label_, 'Invalid extension.');
    return;
  }

  goog.net.XhrIo.send(vsaq.questionnaire.items.UploadItem.FETCH_URL_URL,
      goog.bind(function(e) {
        if (e.target.isSuccess()) {
          var body = e.target.getResponseJson();
          this.form_.action = body['url'];
          var io = new goog.net.IframeIo();
          goog.events.listen(io, [goog.net.EventType.COMPLETE],
              this.handleCompletedUpload_, true, this);
          io.sendFromForm(this.form_);
          goog.dom.setTextContent(this.label_, 'Uploading...');
          goog.style.setElementShown(this.fileInput_, false);
        }
      }, this), 'POST', 'q=' + encodeURIComponent(document.location.pathname));
};


/**
 * Handles callback from IframeIo (when an upload is complete).
 * @param {goog.events.Event} e The COMPLETED event from goog.net.IframeIo.
 * @private
 */
vsaq.questionnaire.items.UploadItem.prototype.handleCompletedUpload_ =
    function(e) {
  var response = {};
  try {
    response = e.target.getResponseJson();
  } catch (err) {}
  if (response['filename'] && response['fileId']) {
    this.setValue(response['fileId'] + '|' + response['filename']);
  } else {
    this.deleteFile_();
    var error = response['error'] || 'Error. Upload unsuccessful.';
    goog.dom.setTextContent(this.label_, error);
  }
};


/**
 * Removes the currently uploaded file.
 * @param {goog.events.Event=} opt_event The event that triggered the function.
 * @private
 */
vsaq.questionnaire.items.UploadItem.prototype.deleteFile_ = function(
    opt_event) {
  this.filename_ = '';
  this.fileId_ = '';
  this.form_.reset();
  goog.dom.setTextContent(this.label_, '');
  goog.style.setElementShown(this.deleteLink_, false);
  goog.style.setElementShown(this.downloadLink_, false);
  goog.style.setElementShown(this.fileInput_, true);
  if (opt_event)
    this.answerChanged();
};


/**
 * Parses UploadItems. If the topmost item in the passed Array is an a
 * UploadItem, it is consumed and a UploadItem instance is returned.
 * If the topmost item is not a UploadItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.UploadItem} The parsed UploadItem.
 */
vsaq.questionnaire.items.UploadItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.UploadItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.UploadItem(item.id, item.cond, item.text,
                                                 item.required, item.auth);
};


/** @inheritDoc */
vsaq.questionnaire.items.UploadItem.prototype.setReadOnly = function(readOnly) {
  // if item marked readonly, always keep it readonly
  this.fileInput_.readOnly = this.auth == 'readonly' ? true : readOnly;
};


/** @inheritDoc */
vsaq.questionnaire.items.UploadItem.prototype.getValue = function() {
  if (this.fileId_ && this.filename_)
    return this.fileId_ + '|' + this.filename_;

  return '';
};


/** @inheritDoc */
vsaq.questionnaire.items.UploadItem.prototype.setInternalValue =
    function(value) {
  var parts = value.split('|');
  if (parts.length == 2) {
    this.fileId_ = parts[0];
    this.filename_ = parts[1];

    goog.dom.setTextContent(this.label_, 'Uploaded file: ' + this.filename_);
    this.downloadLink_.href = goog.string.format('/download/%s?q=%s',
        this.fileId_, encodeURIComponent(document.location.pathname));
    goog.style.setElementShown(this.deleteLink_, true);
    goog.style.setElementShown(this.downloadLink_, true);
    goog.style.setElementShown(this.fileInput_, false);
    this.form_.reset();
  } else if (!value) {
    this.deleteFile_();
  }
};


/** @inheritDoc */
vsaq.questionnaire.items.UploadItem.prototype.isAnswered = function() {
  return this.fileId_.length > 0;
};
