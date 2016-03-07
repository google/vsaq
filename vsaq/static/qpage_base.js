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
 * @fileoverview Main client-side renderer for questionnaire.
 */

goog.provide('vsaq.QpageBase');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.structs');
goog.require('goog.ui.Tooltip');
goog.require('vsaq.Questionnaire');
goog.require('vsaq.utils');



/**
 * Initialize the questionnaire page.
 * @constructor
 */
vsaq.QpageBase = function() {
  this.changes = {};
  var qNode = goog.dom.getElement('_vsaq_body');
  if (!qNode) {
    alert('Did not find an element with ID _vsaq_body to render the ' +
        'questionnaire into.');
    return;
  }
  this.questionnaire = new vsaq.Questionnaire(qNode);
  this.nextUpdateAttemptIn = vsaq.QpageBase.SAVE_TIMEOUT_LENGTH;
  this.isReadOnly = goog.dom.getElement('_rom_').value == 'true';

  this.statusIndicator = goog.dom.getElement('_vsaq_saved_status') ||
      goog.dom.createDom('span');
  this.questionnaire.setReadOnlyMode(this.isReadOnly);

  vsaq.utils.initClickables({
    'eh-edit': goog.bind(this.makeEditable, this)
  });

  goog.events.listen(window, [goog.events.EventType.BEFOREUNLOAD],
      function() {
        if (vsaq.qpageObject_ && vsaq.qpageObject_.unsavedChanges())
          return 'You have unsaved changes.';
      });
};


/**
 * Length of timeout to automatically save updates (in seconds).
 * @type {number}
 * @const
 * @protected
 */
vsaq.QpageBase.SAVE_TIMEOUT_LENGTH = 2;


/**
 * The questionnaire shown on the page.
 * @type {vsaq.Questionnaire}
 */
vsaq.QpageBase.prototype.questionnaire;


/**
 * A dictionary containing all the changes since the last successful save. Keys
 * are the ids of the changed questions, values are the updated values of the
 * question.
 * @type {Object.<string, string>}
 * @protected
 */
vsaq.QpageBase.prototype.changes;


/**
 * TimeoutID for timeout that saves changes every few seconds.
 * @type {number}
 * @protected
 */
vsaq.QpageBase.prototype.saveTimeout;


/**
 * The current timeout for saving changes (in sec).
 * @type {number}
 * @protected
 */
vsaq.QpageBase.prototype.nextUpdateAttemptIn;


/**
 * Whether or not the questionnaire is read-only.
 * @type {boolean}
 * @protected
 */
vsaq.QpageBase.prototype.isReadOnly;


/**
 * Whether or not the questionnaire is read-only.
 * @type {!Element}
 * @protected
 */
vsaq.QpageBase.prototype.statusIndicator;


/**
 * Make questionnaire editable.
 */
vsaq.QpageBase.prototype.makeEditable = function() {
  this.isReadOnly = false;
  this.questionnaire.setReadOnlyMode(this.isReadOnly);
  this.questionnaire.render();
};


/**
 * Attempts to keep track of  updates that were done to the current
 * questionnaire.
 */
vsaq.QpageBase.prototype.sendUpdate = goog.abstractMethod;


/**
 * Creates tooltips for all span elements with the class "tooltip-link". The
 * content of the tooltip is taken from the data-html-tooltip attribute.
 * @protected
 */
vsaq.QpageBase.prototype.installToolTips = function() {
  var ttElements = goog.dom.getElementsByClass('tooltip-link',
      this.questionnaire.getRootElement());
  goog.array.forEach(ttElements, function(element) {
    var tip = new goog.ui.Tooltip(element);
    tip.setText(element.getAttribute('data-tooltip'));
    tip.className = 'vsaq-tooltip';
  });
};


/**
 * Sets a timeout for when to next attempt to save changes.
 * @param {boolean} lastSaveFailed Whether or not the last attempt to save
 *     updates failed.
 * @protected
 */
vsaq.QpageBase.prototype.scheduleNextUpdate = function(lastSaveFailed) {
  if (lastSaveFailed) {
    if (this.nextUpdateAttemptIn <= 256)
      this.nextUpdateAttemptIn *= 2;
  } else {
    this.nextUpdateAttemptIn = vsaq.QpageBase.SAVE_TIMEOUT_LENGTH;
  }

  this.saveTimeout = window.setTimeout(
      goog.bind(this.sendUpdate, this), this.nextUpdateAttemptIn * 1000);
};


/**
 * Loads the template of a questionnaire. Once completed, tries to load the
 * answers as well.
 */
vsaq.QpageBase.prototype.loadQuestionnaire = goog.abstractMethod;


/**
 * Returns whether there are unsaved changes.
 * @return {boolean} Returns true if there are unsaved changes.
 */
vsaq.QpageBase.prototype.unsavedChanges = function() {
  return (goog.structs.getCount(this.changes) > 0);
};


/**
 * Instance of the questionnaire page for the current page.
 * @type {vsaq.QpageBase}
 * @protected
 */
vsaq.qpageObject_;
