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
 * @fileoverview Questionnaire tip items provide advice to the user.
 */

goog.provide('vsaq.questionnaire.items.TipItem');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('goog.string');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.questionnaire.utils');



/**
 * A tip that provides advice to the user. If `clarification` is set to
 * true, additionally a text area is shown to the user where they can provide
 * additional information.
 * @param {string} id An ID uniquely identifying the tip.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} text The caption to show next to the radio button.
 * @param {boolean} warn If set to true, the tip will be shown with an alarming
 *     background color, and feature a similarly alarming caption.
 * @param {string=} opt_severity Severity of the issue.
 * @param {string=} opt_clarification If provided, an additional text area is
 *     shown to the user, where they can provide additional clarification.
 * @param {string=} opt_name Name of the issue.
 * @param {string=} opt_todo Todo list entry associated with the tip.
 * @param {string=} opt_customTitle Title of bubble defined in JSON.
 * @param {string=} opt_auth If "readonly", this ValueItem cannot be modified.
 * @extends {vsaq.questionnaire.items.ValueItem}
 * @constructor
 */
vsaq.questionnaire.items.TipItem = function(id, conditions, text, warn,
    opt_severity, opt_clarification, opt_name, opt_todo, opt_customTitle,
    opt_auth) {
  goog.base(this, id, conditions, text, undefined, undefined, undefined,
            undefined, undefined, opt_auth);

  /**
   * Indicating whether the tip is a warning or only informational.
   * @type {boolean}
   */
  this.warn = warn;
  var propertyInformation = {
    nameInClass: 'warn',
    defaultValues: {
      'true' : 'yes'
    }
  };
  this.addPropertyInformation('warn', propertyInformation);

  /**
   * Name of the issue.
   * @type {string}
   */
  this.name = goog.string.makeSafe(opt_name);
  propertyInformation = {
    nameInClass: 'name',
    metadata: true
  };
  this.addPropertyInformation('name', propertyInformation);

  /**
   * A request for clarification.
   * @type {string}
   */
  this.clarification = goog.string.makeSafe(opt_clarification);
  propertyInformation = {nameInClass: 'clarification'};
  this.addPropertyInformation('why', propertyInformation);

  /**
   * A todo list entry associated with the tip.
   * @type {string}
   */
  this.todo = goog.string.makeSafe(opt_todo);
  propertyInformation = {
    nameInClass: 'todo',
    metadata: true
  };
  this.addPropertyInformation('todo', propertyInformation);

  /**
   * Optional custom title of bubble. Any string is valid.
   * @type {string}
   */
  this.customTitle = goog.string.makeSafe(opt_customTitle);
  propertyInformation = {nameInClass: 'customTitle'};
  this.addPropertyInformation('customTitle', propertyInformation);

  /**
   * The severity of the issue. Valid values are medium, high and critical.
   * @type {?string}
   */
  this.severity = opt_severity || '';
  propertyInformation = {
    nameInClass: 'severity',
    defaultValues: {
      medium: 'medium',
      high: 'high',
      critical: 'critical'
    },
    dependencies: {
      warn: 'yes'
    }
  };
  this.addPropertyInformation('severity', propertyInformation);

  /**
   * The text area where the user can provide clarification.
   * @type {HTMLTextAreaElement}
   * @private
   */
  this.textArea_;

  this.render();
};
goog.inherits(vsaq.questionnaire.items.TipItem,
              vsaq.questionnaire.items.ValueItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.TipItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.bubble,
      {
        contentHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text),
        id: this.id,
        whyHtml: (
            this.clarification ?
            soydata.VERY_UNSAFE.ordainSanitizedHtml(this.clarification) : ''),
        isWarning: this.warn,
        severity: this.severity,
        customTitle: this.customTitle
      });
  goog.dom.replaceNode(this.container, oldNode);

  if (this.clarification) {
    this.textArea_ = /** @type {HTMLTextAreaElement} */
        (vsaq.questionnaire.utils.findById(this.container, this.id));
    goog.events.listen(
        this.textArea_,
        [goog.events.EventType.KEYUP, goog.events.EventType.CHANGE],
        this.answerChanged,
        true,
        this);
  }
};


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.TipItem.TYPE = 'tip';


/**
 * Parses TipItems. If the topmost item in the passed Array is an a
 * TipItem, it is consumed and a TipItem instance is returned.
 * If the topmost item is not a TipItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.TipItem} The parsed TipItem.
 */
vsaq.questionnaire.items.TipItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.TipItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  var isWarn = goog.string.makeSafe(item.warn) == 'yes';
  return new vsaq.questionnaire.items.TipItem(item.id, item.cond, item.text,
      isWarn, item.severity, item.why, item.name, item.todo, item.customTitle,
      item.auth);
};


/** @inheritDoc */
vsaq.questionnaire.items.TipItem.prototype.setReadOnly = function(readOnly) {
  if (this.textArea_)
    // if item marked readonly, always keep it readonly
    this.textArea_.readOnly = this.readonly ? true : readOnly;
};


/** @inheritDoc */
vsaq.questionnaire.items.TipItem.prototype.getValue = function() {
  if (this.textArea_)
    return this.textArea_.value;

  return null;
};


/** @inheritDoc */
vsaq.questionnaire.items.TipItem.prototype.setInternalValue =
    function(value) {
  if (this.textArea_)
    this.textArea_.value = /** @type {string} */ (value);
};


/** @inheritDoc */
vsaq.questionnaire.items.TipItem.prototype.isAnswered = function() {
  // TipItems are not mandatory to fill out, therefore always counting them as
  // answered.
  return true;
};
