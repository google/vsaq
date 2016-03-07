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
 * @fileoverview A questionnaire item with a textarea.
 */

goog.provide('vsaq.questionnaire.items.BoxItem');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.questionnaire.utils');



/**
 * A question that allows the user to answer in a textarea box.
 * @param {string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} caption The caption to show above the textarea.
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
vsaq.questionnaire.items.BoxItem = function(id, conditions, caption,
    opt_placeholder, opt_inputPattern, opt_inputTitle, opt_isRequired) {
  goog.base(this, id, conditions, caption, opt_placeholder, opt_inputPattern,
      opt_inputTitle, opt_isRequired);

  /**
   * The text area where the user can provide an answer.
   * @type {!HTMLTextAreaElement}
   * @private
   */
  this.textArea_;

  this.render();
};
goog.inherits(vsaq.questionnaire.items.BoxItem,
              vsaq.questionnaire.items.ValueItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.BoxItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.box, {
    id: this.id,
    captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text),
    placeholder: this.placeholder,
    inputPattern: this.inputPattern,
    inputTitle: this.inputTitle,
    isRequired: Boolean(this.required)
  });
  goog.dom.replaceNode(this.container, oldNode);

  this.textArea_ = /** @type {!HTMLTextAreaElement} */
      (vsaq.questionnaire.utils.findById(this.container, this.id));
  goog.events.listen(
      this.textArea_,
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
vsaq.questionnaire.items.BoxItem.TYPE = 'box';


/**
 * Parses BoxItems. If the topmost item in the passed Array is an a
 * BoxItem, it is consumed and a BoxItem instance is returned.
 * If the topmost item is not a BoxItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.BoxItem} The parsed BoxItem.
 */
vsaq.questionnaire.items.BoxItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.BoxItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.BoxItem(item.id, item.cond, item.text,
      item.placeholder, item.inputPattern, item.inputTitle, item.required);
};


/** @inheritDoc */
vsaq.questionnaire.items.BoxItem.prototype.setReadOnly = function(readOnly) {
  this.textArea_.readOnly = readOnly;
};


/** @inheritDoc */
vsaq.questionnaire.items.BoxItem.prototype.getValue = function() {
  return this.textArea_.value;
};


/** @inheritDoc */
vsaq.questionnaire.items.BoxItem.prototype.setInternalValue =
    function(value) {
  this.textArea_.value = /** @type {string} */ (value);
};


/** @inheritDoc */
vsaq.questionnaire.items.BoxItem.prototype.isAnswered = function() {
  return this.getValue().length > 0;
};

