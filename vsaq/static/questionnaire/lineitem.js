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
 * @fileoverview A questionnaire item with an input field.
 */

goog.provide('vsaq.questionnaire.items.LineItem');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.questionnaire.utils');



/**
 * A question that allows the user to answer in an input field.
 * @param {string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} caption The caption to show above the input field.
 * @param {string=} opt_inputType The type of the stored value.
 * @param {string=} opt_placeholder The placeholder text, displayed in place of
 *     the value.
 * @param {string=} opt_inputPattern HTML5 pattern attribute value for the input
 *     field. See {@link
 *     https://html.spec.whatwg.org/multipage/forms.html#the-pattern-attribute}.
 * @param {string=} opt_inputTitle HTML5 title attribute value for the input
 *     field. See {@link
 *     https://html.spec.whatwg.org/multipage/forms.html#attr-input-title}.
 * @param {boolean=} opt_isRequired Iff true, the item value is required.
 * @extends {vsaq.questionnaire.items.ValueItem}
 * @constructor
 */
vsaq.questionnaire.items.LineItem = function(id, conditions, caption,
    opt_inputType, opt_placeholder, opt_inputPattern, opt_inputTitle,
    opt_isRequired) {
  goog.base(this, id, conditions, caption, opt_placeholder, opt_inputPattern,
      opt_inputTitle, opt_isRequired);

  /**
   * The html input element where the user can answer the question.
   * @type {!HTMLInputElement}
   * @private
   */
  this.textBox_;

  /**
   * The type of the stored value.
   * @type {string|undefined}
   */
  this.inputType = opt_inputType;

  this.render();
};
goog.inherits(vsaq.questionnaire.items.LineItem,
              vsaq.questionnaire.items.ValueItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.LineItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.line,
      {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text),
        type: this.inputType,
        inputPattern: this.inputPattern,
        inputTitle: this.inputTitle,
        placeholder: this.placeholder,
        isRequired: Boolean(this.required)
      });
  goog.dom.replaceNode(this.container, oldNode);

  this.textBox_ = /** @type {!HTMLInputElement} */
      (vsaq.questionnaire.utils.findById(this.container, this.id));
  goog.events.listen(
      this.textBox_,
      [goog.events.EventType.KEYUP, goog.events.EventType.CHANGE],
      this.answerChanged,
      true,
      this);
};


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.LineItem.TYPE = 'line';


/**
 * Parses LineItems. If the topmost item in the passed Array is an a
 * LineItem, it is consumed and a LineItem instance is returned.
 * If the topmost item is not a LineItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.LineItem} The parsed LineItem.
 */
vsaq.questionnaire.items.LineItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.LineItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.LineItem(item.id, item.cond, item.text,
      item.inputType, item.placeholder, item.inputPattern, item.inputTitle,
      item.required);
};


/** @inheritDoc */
vsaq.questionnaire.items.LineItem.prototype.setReadOnly = function(readOnly) {
  this.textBox_.readOnly = readOnly;
};


/** @inheritDoc */
vsaq.questionnaire.items.LineItem.prototype.getValue = function() {
  return this.textBox_.value;
};


/** @inheritDoc */
vsaq.questionnaire.items.LineItem.prototype.setInternalValue =
    function(value) {
  this.textBox_.value = /** @type {string} */ (value);
};


/** @inheritDoc */
vsaq.questionnaire.items.LineItem.prototype.isAnswered = function() {
  return this.getValue().length > 0;
};
