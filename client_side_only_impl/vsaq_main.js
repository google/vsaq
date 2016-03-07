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
 * @fileoverview Reference implementation for VSAQ (client side only).
 *
 * The reference implementation requires no code to run on a back end. All
 * operations are performed by vsaq_main.js in the browser.
 * Although this makes deployment very easy, you may want to run a custom
 * server-side component for storing answers and mapping questionnaires to
 * users. vsaq_main.js provides example code for submitting and loading
 * questionnaire answers to/from a back end:
 *   submitQuestionnaireToServer_ Submits questionnaire answers to a back end.
 *   loadAnswersFromServer_ Loads questionnaire answers from a back end.
 */

goog.provide('vsaq');
goog.provide('vsaq.Qpage');

goog.require('goog.Uri');
goog.require('goog.debug.Error');
goog.require('goog.dom');
goog.require('goog.events.EventType');
goog.require('goog.json');
goog.require('goog.net.XhrIo');
goog.require('goog.object');
goog.require('goog.storage.Storage');
goog.require('goog.storage.mechanism.HTML5LocalStorage');
goog.require('goog.string.path');
goog.require('goog.structs');
goog.require('vsaq.QpageBase');
goog.require('vsaq.QuestionnaireEditor');
goog.require('vsaq.utils');



/**
 * Initialize the questionnaire page.
 * @extends {vsaq.QpageBase}
 * @constructor
 */
vsaq.Qpage = function() {
  goog.base(this);
  var mechanism = new goog.storage.mechanism.HTML5LocalStorage();
  this.storage = new goog.storage.Storage(mechanism);
  this.questionnaireID = '';
  this.questionnaire.setReadOnlyMode(this.isReadOnly);

  var uploadAnswersDom = document.getElementById('answer_file');
  if (uploadAnswersDom)
    uploadAnswersDom.addEventListener('change',
        goog.bind(this.loadAnswersFromFile, this), false);

  try {
    this.loadQuestionnaire();
  } catch (e) {
    alert('An error occurred loading the questionnaire: ' + e);
    throw e;
  }
};
goog.inherits(vsaq.Qpage,
              vsaq.QpageBase);


/**
 * EXAMPLE. Submits the active questionnaire to a backend.
 *
 * This is an example implementation that submits all questionnaire answers to
 * a specified backend. Customize this to meet your needs.
 * The answers field submitted to the backend is a dictionary that maps
 * ids of ValueItems to answers. E.g.:
 *   answers:{"application_name":"Test","application_description":"Lorem Ipsum"}
 *
 * @param {string} id Id of the questionnaire session. Allows matching of
 *     answers to companies or individuals.
 * @param {string} server Destination to which the questionnaire should
 *     get submitted. E.g. /ajax?f=SubmitQuestionnaire
 * @param {string} xsrf Xsrf token to send with the questionnaire submission.
 * @param {(string|Function)=} opt_redirect Where to redirect the user after
 *     successful submission, or callback to execute on success.
 * @private
 */
vsaq.Qpage.prototype.submitQuestionnaireToServer_ = function(
  id, server, xsrf, opt_redirect) {

  if (this.isReadOnly) {
    alert('This questionnaire is readonly and can therefore not be submitted.');
    return;
  }

  var answers = this.questionnaire.getValuesAsJson();
  goog.net.XhrIo.send(server,
      goog.bind(function(e) {
        if (!e.target.isSuccess()) {
          alert('Submitting the questionnaire failed!');
        } else if (opt_redirect) {
          if (typeof(opt_redirect) == 'function') {
            opt_redirect();
          } else {
            document.location = opt_redirect;
          }
        }
      }, this), 'POST', goog.string.format(
          'id=%s&_xsrf_=%s&answers=%s', encodeURIComponent(id),
          encodeURIComponent(xsrf), encodeURIComponent(answers)));
};


/**
 * EXAMPLE. Loads answers from a Backend.
 *
 * This is an example implementation that loads answers from a backend. This can
 * be used to display answers of a completed questionnaire if you have a backend
 * that stores questionnaire answers (e.g. the answers field received through
 * submitQuestionnaire_). Customize this to meet your needs.
 *
 * @param {string} id Id of the questionnaire session. Allows matching of
 *     answers to companies or individuals.
 * @param {string} server Backend from where the questionnaire answers should
 *     get loaded. E.g. /ajax?f=LoadQuestionnaireAnswers
 * @private
 */
vsaq.Qpage.prototype.loadAnswersFromServer_ = function(id, server) {
  goog.net.XhrIo.send(server, goog.bind(function(e) {
        var text = e.target.getResponseText();
        if (e.target.isSuccess()) {
          // Render the questionnaire's template.
          this.questionnaire.render();
          this.questionnaire.setValues(
              /** @type {!Object.<string, string>} */ (goog.json.parse(text)));
        } else {
          alert('Couldn\'t load questionnaire answers!');
        }
      }, this), 'POST', 'id=' + encodeURIComponent(id));
};


/**
 * Updates the local storage with new questionnaire answers.
 * @param {Object} data Dictionary containing new key/value pairs.
 * @private
 */
vsaq.Qpage.prototype.updateStorage_ = function(data) {
  if (!this.questionnaireID)
    return;
  var newStorageData = null;
  var storageData = this.readStorage_();
  if (storageData) {
    storageData = goog.json.parse(storageData);
    goog.object.extend(storageData, data);
    newStorageData = goog.json.serialize(storageData);
  } else {
    newStorageData = goog.json.serialize(data);
  }

  this.storage.set(this.questionnaireID, newStorageData);
};


/**
 * Fetches all answers from the local storage.
 * @return {?string}
 * @private
 */
vsaq.Qpage.prototype.readStorage_ = function() {
  if (!this.questionnaireID)
    return null;
  return /** @type {?string} */ (this.storage.get(this.questionnaireID));
};


/**
 * Clears the answers in Localstorage.
 */
vsaq.Qpage.prototype.clearStorage = function() {
  if (this.questionnaireID)
    this.storage.remove(this.questionnaireID);
};


/** @inheritDoc */
vsaq.Qpage.prototype.sendUpdate = function() {
  window.clearTimeout(this.saveTimeout);
  if (!this.isReadOnly && goog.structs.getCount(this.changes) > 0) {
    this.updateStorage_(this.changes);
    this.updateDownloadAnswersUrl();

    this.changes = {};
    if (!goog.structs.getCount(this.changes))
      goog.dom.setTextContent(this.statusIndicator, 'Draft Saved');
  }
  this.scheduleNextUpdate(false);
};


/**
 * Read answers from a file.
 * @param {Event} evt The change event for the upload field.
 */
vsaq.Qpage.prototype.loadAnswersFromFile = function(evt) {
  var answer_file = evt.target.files[0];
  var reader = new FileReader();
  reader.onload = goog.bind(function(f) {
    return goog.bind(function(e) {
      var answers = e.target.result;
      this.questionnaire.setValues(
          /** @type {!Object.<string, string>} */ (goog.json.parse(answers)));
    }, this);
  }, this)(answer_file);
  reader.readAsText(answer_file);
};


/**
 * Update link to allow users to download questionnaire answers as a file.
 */
vsaq.Qpage.prototype.updateDownloadAnswersUrl = function() {
  var downloadLink = goog.dom.getElement('_vsaq_save_questionnaire');
  var storageData = this.readStorage_();
  if (!downloadLink || !storageData) {
    return;
  }
  var MIME_TYPE = 'text/plain';
  var textFileAsBlob = new Blob([storageData], {type: MIME_TYPE});
  var fileNameToSaveAs = 'answers_' + this.questionnaireID;
  downloadLink.download = fileNameToSaveAs;
  window.URL = window.URL || window.webkitURL;
  downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
  downloadLink.className = 'maia-button';
};


/**
 * Load the extension json then proceed with loading the questionnaire.
 * @param {!string} questionnaire_path The path to the questionnaire json.
 * @param {!string} extension_path The path to the questionnaire extension json
 */
vsaq.Qpage.prototype.loadExtensionThenQuestionnaire = function(
    questionnaire_path, extension_path) {
  goog.net.XhrIo.send(extension_path,
      goog.bind(function(e) {
        var text = e.target.getResponseText();
        if (!e.target.isSuccess()) {
          alert(text);
        } else {
          text = vsaq.utils.vsaqonToJson(text);
          var extension = {};
          try {
            extension = goog.json.parse(text);
          } catch (err) {
            alert('Loading the extension failed. It does not appear to be ' +
                  'valid json');
          }

          this.loadQuestionnaire(questionnaire_path, extension);

        }
      }, this), 'GET');
};


/**
 * @inheritDoc
 * @param {string=} opt_path The path to the questionnaire json.
 * @param {Object=} opt_extension The questionnaire extension json.
 */
vsaq.Qpage.prototype.loadQuestionnaire = function(opt_path, opt_extension) {
  var uri = new goog.Uri(document.location.search);
  this.questionnaire.setUnrolledMode(
      uri.getQueryData().get('unroll', '') == 'true');

  if (opt_path) {
    // Remove file extensions and some characters from the path to create a
    // unique questionnaire ID.
    this.questionnaireID = goog.string.path.baseName(opt_path);
    this.questionnaireID = this.questionnaireID.replace(/\.[^/.]+$/, '');
    this.questionnaireID = this.questionnaireID.replace(/\//, '_');
    goog.net.XhrIo.send(opt_path,
        goog.bind(function(e) {
          var text = e.target.getResponseText();
          if (!e.target.isSuccess()) {
            alert(text);
          } else {
            text = vsaq.utils.vsaqonToJson(text);
            var template = {};
            try {
              template = goog.json.parse(text);
            } catch (err) {
              alert('Loading the template failed. It does not appear to be ' +
                    'valid json');
              return;
            }
            if (!template) {
              alert('Empty template!');
              return;
            }
            if (opt_extension) {
              this.questionnaire.setMultipleTemplates(template, opt_extension);
            } else {
              this.questionnaire.setTemplate(template['questionnaire']);
            }
            // Render the questionnaire's template.
            this.questionnaire.render();
            this.installToolTips();


            // Load answers from localStorage (if available).
            var storageData = this.readStorage_();
            if (storageData) {
              this.questionnaire.setValues(
                  /** @type {!Object.<string, string>} */
                  (goog.json.parse(storageData)));
              this.updateDownloadAnswersUrl();
            }

            this.questionnaire.listen(
            goog.events.EventType.CHANGE, goog.bind(function(e) {
              goog.structs.forEach(e.changedValues, function(val, key) {
                this.changes[key] = val;
              }, this);
              if (goog.structs.getCount(this.changes) > 0) {
                goog.dom.setTextContent(this.statusIndicator,
                    'Changes pending...');
                var saveBtn = goog.dom.getElement('_vsaq_save_questionnaire');
                saveBtn.className = 'maia-button maia-button-disabled';
              }
            }, this));

            this.scheduleNextUpdate(false);

          }
        }, this), 'GET');
  }

};


/**
 * Initializes VSAQ.
 * @return {?vsaq.QpageBase} The current questionnaire instance.
 */
vsaq.initQuestionnaire = function() {
  if (vsaq.qpageObject_)
    return vsaq.qpageObject_;

  vsaq.qpageObject_ = new vsaq.Qpage();
  // Load questionnaire.
  var templatePattern = new RegExp(/^\/?questionnaires\/[a-z0-9_]+\.json$/i);
  var uri = new goog.Uri(document.location.search);
  var questionnairePath =
      /** @type {string} */ (uri.getQueryData().get('qpath', ''));
  if (questionnairePath && !templatePattern.test(questionnairePath))
    throw new goog.debug.Error(
        'qpath must be a relative path and must match this pattern: ' +
        templatePattern.toString());

  var extensionPath =
      /** @type {string} */ (uri.getQueryData().get('extension', ''));
  if (extensionPath) {
    if (!templatePattern.test(extensionPath))
      throw new goog.debug.Error(
          'extension must be a relative path and must match this pattern: ' +
          templatePattern.toString());
    vsaq.qpageObject_.loadExtensionThenQuestionnaire(
        questionnairePath, extensionPath);
  } else {
    vsaq.qpageObject_.loadQuestionnaire(questionnairePath);
  }

  return vsaq.qpageObject_;
};


/**
 * Clears the answers of the current questionnaire.
 */
vsaq.clearAnswers = function() {
  if (confirm('Are you sure that you want to delete all answers?')) {
    if (vsaq.qpageObject_) {
      vsaq.qpageObject_.clearStorage();
      vsaq.qpageObject_ = null;
    }
    vsaq.initQuestionnaire();
  }
};


if (!goog.getObjectByName('goog.testing.TestRunner')) {
  vsaq.initQuestionnaire();
  new vsaq.QuestionnaireEditor();

  vsaq.utils.initClickables({
    'eh-clear': vsaq.clearAnswers,
  });

}
