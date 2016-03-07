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
 * @fileoverview A questionnaire item which offers two choices (typically
 * yes and no).
 */

goog.provide('vsaq.questionnaire.items.YesNoItem');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.questionnaire.utils');



/**
 * A question that allows the user to choose between 2 options.
 * @param {string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} caption The caption to show next to the radio button.
 * @param {string} yes String shown as label for the first option.
 * @param {string} no String shown as label for the second option.
 * @extends {vsaq.questionnaire.items.ValueItem}
 * @constructor
 */
vsaq.questionnaire.items.YesNoItem = function(id, conditions, caption, yes,
    no) {
  goog.base(this, id, conditions, caption);

  /**
   * The text for the yes choice.
   * @type {!string}
   */
  this.yes = yes;
  var propertyInformation = {
    nameInClass: 'yes',
    mandatory: true
  };
  this.addPropertyInformation('yes', propertyInformation);

  /**
   * The text for the no choice.
   * @type {!string}
   */
  this.no = no;
  propertyInformation = {
    nameInClass: 'no',
    mandatory: true
  };
  this.addPropertyInformation('no', propertyInformation);

  /**
   * The radio button for the 'yes' answer.
   * @type {!HTMLInputElement}
   * @private
   */
  this.yesRadio_;

  /**
   * The radio button for the 'no' answer.
   * @type {!HTMLInputElement}
   * @private
   */
  this.noRadio_;

  this.render();
};
goog.inherits(vsaq.questionnaire.items.YesNoItem,
              vsaq.questionnaire.items.ValueItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.YesNoItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.yesno,
      {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text),
        yesHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.yes),
        noHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.no)
      });
  goog.dom.replaceNode(this.container, oldNode);

  this.yesRadio_ = /** @type {!HTMLInputElement} */ (
      vsaq.questionnaire.utils.findById(this.container, this.id + '/yes'));
  this.noRadio_ = /** @type {!HTMLInputElement} */ (
      vsaq.questionnaire.utils.findById(this.container, this.id + '/no'));
  goog.events.listen(this.yesRadio_, goog.events.EventType.CLICK,
      this.answerChanged, true, this);
  goog.events.listen(this.noRadio_, goog.events.EventType.CLICK,
      this.answerChanged, true, this);
};


/**
 * Constant indicating the string value of the item when 'yes' is selected.
 * @type {string}
 */
vsaq.questionnaire.items.YesNoItem.YES_VALUE = 'yes';


/**
 * Constant indicating the string value of the item when 'no' is selected.
 * @type {string}
 */
vsaq.questionnaire.items.YesNoItem.NO_VALUE = 'no';


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.YesNoItem.TYPE = 'yesno';


/**
 * Parses YesNoItems. If the topmost item in the passed Array is an a
 * YesNoItem, it is consumed and a YesNoItem instance is returned.
 * If the topmost item is not a YesNoItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.YesNoItem} The parsed YesNoItem.
 */
vsaq.questionnaire.items.YesNoItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.YesNoItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.YesNoItem(item.id, item.cond, item.text,
                                                item.yes, item.no);
};


/** @inheritDoc */
vsaq.questionnaire.items.YesNoItem.prototype.setReadOnly = function(readOnly) {
  this.yesRadio_.disabled = readOnly;
  this.noRadio_.disabled = readOnly;
};


/** @inheritDoc */
vsaq.questionnaire.items.YesNoItem.prototype.isChecked = function(opt_value) {
  if (!opt_value) opt_value = '/yes';
  var exp_value = opt_value.substring(opt_value.lastIndexOf('/') + 1);
  return (this.getValue() == exp_value);
};


/** @inheritDoc */
vsaq.questionnaire.items.YesNoItem.prototype.getValue = function() {
  if (this.yesRadio_.checked) {
    return vsaq.questionnaire.items.YesNoItem.YES_VALUE;
  } else if (this.noRadio_.checked) {
    return vsaq.questionnaire.items.YesNoItem.NO_VALUE;
  }
  return '';
};


/** @inheritDoc */
vsaq.questionnaire.items.YesNoItem.prototype.setInternalValue =
    function(value) {
  if (value == vsaq.questionnaire.items.YesNoItem.YES_VALUE) {
    this.yesRadio_.checked = true;
    this.noRadio_.checked = false;
  } else if (value == vsaq.questionnaire.items.YesNoItem.NO_VALUE) {
    this.yesRadio_.checked = false;
    this.noRadio_.checked = true;
  } else {
    this.yesRadio_.checked = false;
    this.noRadio_.checked = false;
  }
};


/** @inheritDoc */
vsaq.questionnaire.items.YesNoItem.prototype.isAnswered = function() {
  return this.getValue().length > 0;
};
