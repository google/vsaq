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
 * @fileoverview A questionnaire item with a radio button.
 */

goog.provide('vsaq.questionnaire.items.RadioItem');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.questionnaire.utils');



/**
 * A question that allows the user to answer by choosing a radio button.
 * @param {string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} caption The caption to show next to the radio button.
 * @param {string=} opt_auth If "readonly", this ValueItem cannot be modified.
 * @extends {vsaq.questionnaire.items.ValueItem}
 * @constructor
 */
vsaq.questionnaire.items.RadioItem = function(id, conditions, caption, opt_auth) {
  goog.base(this, id, conditions, caption, undefined, undefined, undefined,
            undefined, undefined, opt_auth);

  /**
   * The radio button that is the actual control behind this question.
   * @type {!HTMLInputElement}
   * @private
   */
  this.radioButton;

  this.render();
};
goog.inherits(vsaq.questionnaire.items.RadioItem,
              vsaq.questionnaire.items.ValueItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.RadioItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.radio,
      {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text)
      });
  goog.dom.replaceNode(this.container, oldNode);

  this.radioButton = /** @type {!HTMLInputElement} */ (
      vsaq.questionnaire.utils.findById(this.container, this.id));
  goog.events.listen(this.radioButton,
      [goog.events.EventType.CHANGE],
      function(e) {
        // We are only changing the answer for the set radio-button.
        if (this.radioButton.checked) this.answerChanged();
      }, true, this);
};


/**
 * Constant indicating the string value of the radio item when selected.
 * @type {string}
 */
vsaq.questionnaire.items.RadioItem.CHECKED_VALUE = 'checked';


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.RadioItem.TYPE = 'radio';


/**
 * Parses RadioItems. If the topmost item in the passed Array is an a
 * RadioItem, it is consumed and a RadioItem instance is returned.
 * If the topmost item is not a RadioItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.RadioItem} The parsed RadioItem.
 */
vsaq.questionnaire.items.RadioItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.RadioItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.RadioItem(item.id, item.cond, item.text,
      item.auth);
};


/** @inheritDoc */
vsaq.questionnaire.items.RadioItem.prototype.setReadOnly = function(readOnly) {
  // if item marked readonly, always keep it readonly
  this.radioButton.disabled = this.auth == 'readonly' ? true : readOnly;
};


/** @inheritDoc */
vsaq.questionnaire.items.RadioItem.prototype.isChecked = function(opt_value) {
  return this.radioButton.checked;
};


/**
 * If a radio item is changed, all other radio items in the same container need
 * to have their value reset. For this reason, {@code
 * vsaq.questionnaire.items.RadioItem} overrides the answerChanged method to
 * ensure this happens.
 * @protected
 */
vsaq.questionnaire.items.RadioItem.prototype.answerChanged = function() {
  var changes = {};
  var containerItems = this.parentItem.getContainerItems();
  goog.array.forEach(containerItems, function(item) {
    if (item instanceof vsaq.questionnaire.items.RadioItem)
      changes[item.id] = item.getValue();
  });
  changes[this.id] = this.getValue();
  var ev = {
    type: vsaq.questionnaire.items.Item.CHANGED,
    source: this,
    changes: changes
  };
  this.eventDispatcher.dispatchEvent(ev);
};


/** @inheritDoc */
vsaq.questionnaire.items.RadioItem.prototype.getValue = function() {
  return this.radioButton.checked ?
      vsaq.questionnaire.items.RadioItem.CHECKED_VALUE : '';
};


/**
 * When the item is added to a parent container, the name of the radio item is
 * set, so all radio items in a given container have the same name and only one
 * can be selected at a time.
 * @param {!vsaq.questionnaire.items.ContainerItem} parentItem The container the
 * radio item was added to.
 */
vsaq.questionnaire.items.RadioItem.prototype.parentItemSet = function(
    parentItem) {
  this.parentItem = parentItem;
  this.radioButton.name = 'radio_' + parentItem.id;
};


/** @inheritDoc */
vsaq.questionnaire.items.RadioItem.prototype.setInternalValue =
    function(value) {
  if (goog.isBoolean(value) && value) {
    this.radioButton.checked = true;
  } else if (goog.isString(value) &&
             (value == vsaq.questionnaire.items.RadioItem.CHECKED_VALUE)) {
    this.radioButton.checked = true;
  }
};


/**
 * This function must not be called, as for RadioItems it is impossible to know
 * from an individual item whether the group has been answered or not.
 * If called, this function throws an exception.
 */
vsaq.questionnaire.items.RadioItem.prototype.isAnswered = function() {
  throw 'This function should never be called.';
};
