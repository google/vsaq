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
 * @fileoverview A questionnaire item with a checkbox.
 */

goog.provide('vsaq.questionnaire.items.CheckItem');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.questionnaire.utils');



/**
 * A question that allows the user to answer by ticking a checkbox.
 * @param {string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} caption The caption to show next to the checkbox.
 * @param {string=} opt_auth If "readonly", this ValueItem cannot be modified.
 * @extends {vsaq.questionnaire.items.ValueItem}
 * @constructor
 */
vsaq.questionnaire.items.CheckItem = function(id, conditions, caption, opt_auth) {
  goog.base(this, id, conditions, caption, undefined, undefined, undefined,
            undefined, undefined, opt_auth);
  /**
   * The checkbox that is the actual control behind this question.
   * @type {!HTMLInputElement}
   * @private
   */
  this.checkBox_;

  this.render();
};
goog.inherits(vsaq.questionnaire.items.CheckItem,
              vsaq.questionnaire.items.ValueItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.CheckItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.check,
      {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text)
      });
  goog.dom.replaceNode(this.container, oldNode);

  this.checkBox_ = /** @type {!HTMLInputElement} */ (
      vsaq.questionnaire.utils.findById(this.container, this.id));
  goog.events.listen(this.checkBox_, goog.events.EventType.CHANGE,
      this.answerChanged, true, this);
};


/**
 * Constant indicating the string value used if the item is selected/checked.
 * @type {string}
 */
vsaq.questionnaire.items.CheckItem.CHECKED_VALUE = 'checked';


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.CheckItem.TYPE = 'check';


/**
 * Parses CheckItems. If the topmost item in the passed Array is an a
 * CheckItem, it is consumed and a CheckItem instance is returned.
 * If the topmost item is not a CheckItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.CheckItem} The parsed CheckItem.
 */
vsaq.questionnaire.items.CheckItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.CheckItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.CheckItem(item.id, item.cond, item.text,
      item.auth);
};


/** @inheritDoc */
vsaq.questionnaire.items.CheckItem.prototype.setReadOnly = function(readOnly) {
  // if item marked readonly, always keep it readonly
  this.checkBox_.disabled = this.auth == 'readonly' ? true : readOnly;
};


/** @inheritDoc */
vsaq.questionnaire.items.CheckItem.prototype.isChecked = function(opt_value) {
  return this.checkBox_.checked;
};


/** @inheritDoc */
vsaq.questionnaire.items.CheckItem.prototype.getValue = function() {
  return this.checkBox_.checked ?
      vsaq.questionnaire.items.CheckItem.CHECKED_VALUE : '';
};


/** @inheritDoc */
vsaq.questionnaire.items.CheckItem.prototype.setInternalValue =
    function(value) {
  if (goog.isBoolean(value)) {
    this.checkBox_.checked = value;
  } else if (goog.isString(value)) {
    this.checkBox_.checked =
        value == vsaq.questionnaire.items.CheckItem.CHECKED_VALUE;
  }
};


/** @inheritDoc */
vsaq.questionnaire.items.CheckItem.prototype.isAnswered = function() {
  // Always returns true, since with checkboxes we can't know whether
  // the checkbox is un-answered or intentionally left unchecked.
  return true;
};

