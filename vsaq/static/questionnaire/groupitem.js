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
 * @fileoverview A questionnaire item that contains further items like radio
 *     buttons or checkboxes.
 */

goog.provide('vsaq.questionnaire.items.CheckgroupItem');
goog.provide('vsaq.questionnaire.items.GroupItem');
goog.provide('vsaq.questionnaire.items.RadiogroupItem');


goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.object');
goog.require('goog.soy');
goog.require('goog.string');
goog.require('vsaq.questionnaire.items.CheckItem');
goog.require('vsaq.questionnaire.items.ContainerItem');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.RadioItem');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');



/**
 * A group of choices e.g. checkboxes or radios.
 * @param {?string} id An ID uniquely identifying the item.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {?string} caption A string with a title for the group.
 * @param {!boolean} defaultChoice If true, a default choice will be appended.
 * @param {!Array.<!Object.<string, string>>} choices An array that contains all
 *     choices in form of dictionaries.
 * @param {?Array.<!Object.<string, string>>} choicesConds An array that
 *     contains all possible conditions in form of dictionaries.
 * @param {string=} opt_auth If "readonly", this ValueItem cannot be modified.
 * @extends {vsaq.questionnaire.items.ContainerItem}
 * @constructor
 */
vsaq.questionnaire.items.GroupItem = function(id, conditions, caption,
    defaultChoice, choices, choicesConds, opt_auth) {
  goog.base(this, id, conditions);

  /**
   * The type of elements that will be contained in this group.
   * @type {!string}
   */
  this.groupItemType = '';

  /**
   * Text shown above the group item.
   * @type {string}
   */
  this.text = goog.string.makeSafe(caption);
  var propertyInformation = {
    nameInClass: 'text',
    mandatory: false
  };
  this.addPropertyInformation('text', propertyInformation);

  /**
   * Determines whether a default choice will be appended to the group.
   * @type {!boolean}
   */
  this.defaultChoice = defaultChoice;
  propertyInformation = {
    nameInClass: 'defaultChoice',
    defaultValues: {
      'true' : true,
      'false': false
    },
    mandatory: true
  };
  this.addPropertyInformation('defaultChoice', propertyInformation);

  /**
   * This id will be assigned if any default choice is set.
   * @type {?vsaq.questionnaire.items.Item}
   */
  this.defaultChoiceItem = null;

  // items of group obtain readonly status from their parents
  if (opt_auth == 'readonly')
    this.auth = opt_auth;

  // Iterate over all choices and create valid questionnaire items for them.
  goog.array.forEach(choices, function(choice) {
    // choice is supposed to be a dictionary with exactly one entry.
    var choiceId = goog.object.getKeys(choice)[0];
    var choiceText = choice[choiceId];
    var choiceCondition = null;

    if (choicesConds) {
      // If any conditions are set search if an existing condition for the
      // current choice exists and set it.
      goog.array.some(choicesConds, function(choiceCond) {
        // choiceCond is supposed to be a dictionary with exactly one entry.
        var choiceCondId = goog.object.getKeys(choiceCond)[0];
        if (choiceCondId == choiceId) {
          choiceCondition = choiceCond[choiceCondId];
          return true;
        }
        return false;
      }, this);
    }

    var appendNewItem =
        this.createSingleItem(choiceId, choiceCondition, choiceText,
                              this.auth);
    appendNewItem.parentItemSet(this);

    goog.events.listen(appendNewItem.eventDispatcher,
        vsaq.questionnaire.items.Item.CHANGED,
        goog.bind(this.answerChanged_, this));

    this.containerItems.push(appendNewItem);
  }, this);

  this.render();
};
goog.inherits(vsaq.questionnaire.items.GroupItem,
              vsaq.questionnaire.items.ContainerItem);


/**
 * Set (append) a default choice if necessary.
 */
vsaq.questionnaire.items.GroupItem.prototype.setDefaultChoice = function() {
  if (this.defaultChoice && !this.defaultChoiceItem) {
    var defaultChoiceId = goog.string.createUniqueString();
    this.defaultChoiceItem = this.createSingleItem(defaultChoiceId, null,
        vsaq.questionnaire.items.GroupItem.DEFAULT_CHOICE, this.auth);
    this.defaultChoiceItem.parentItemSet(this);
    goog.events.listen(this.defaultChoiceItem.eventDispatcher,
        vsaq.questionnaire.items.Item.CHANGED,
        goog.bind(this.answerChanged_, this));
    this.containerItems.push(this.defaultChoiceItem);
  } else if (!this.defaultChoice && this.defaultChoiceItem) {
    // Disable the default choice.
    this.deleteItem(this.defaultChoiceItem);
    this.defaultChoiceItem = null;
  }
};


/**
 * Returns if any of the items in the group are selected.
 * @return {boolean} true if an item was selected, false otherwise.
 */
vsaq.questionnaire.items.GroupItem.prototype.getValue = function() {
  for (var i = 0; i < this.containerItems.length; i++) {
    if (this.containerItems[i] instanceof vsaq.questionnaire.items.ValueItem &&
        this.containerItems[i].getValue()) return true;
  }
  return false;
};


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.GroupItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(
      vsaq.questionnaire.templates.groupitem,
      {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text)
      });
  // Set (append) a default choice if necessary.
  this.setDefaultChoice();
  // Append all children.
  goog.array.forEach(this.containerItems, function(item) {
    this.container.appendChild(item.container);
  }, this);

  goog.dom.replaceNode(this.container, oldNode);
};


/**
 * Standard choice that is optionally added to the end of choice groups.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.GroupItem.DEFAULT_CHOICE = 'None of the above.';


/**
 * Handles propagation of choice clicks to the upper questionnaire layer.
 * @param {!vsaq.Questionnaire.ChangeEvent} ev The event.
 * @private
 */
vsaq.questionnaire.items.GroupItem.prototype.answerChanged_ = function(ev) {
  // Now tell whomever is listening as well that something changed.
  this.eventDispatcher.dispatchEvent(ev);
};


/**
 * Creates one single item of the corresponding group type.
 * @param {string} choiceId The choice id
 * @param {?string} choiceCondition The choice condition
 * @param {string} choiceText The choice text
 * @param {string=} opt_auth If 'readonly', GroupItem's individual ValueItems
 *    are immutable.
 * @return {vsaq.questionnaire.items.Item} The choice item
 */
vsaq.questionnaire.items.GroupItem.prototype.createSingleItem =
    goog.abstractMethod;


/** @inheritDoc */
vsaq.questionnaire.items.GroupItem.prototype.exportItem = function() {
  var exportProperties =
      vsaq.questionnaire.items.Item.prototype.exportItem.call(this);
  var choices = [];
  var choicesConds = [];
  goog.array.forEach(this.containerItems, function(item) {
    // Skip the default choice item.
    if (this.defaultChoiceItem && item.id == this.defaultChoiceItem.id)
      return;
    var choice = {};
    choice[item.id] = item.text;
    choices.push(choice);
    // Only append any conditions if a condition for the current container Item
    // is set.
    if (item.conditions && item.conditions.length > 0) {
      var choiceCond = {};
      choiceCond[item.id] = item.conditions;
      choicesConds.push(choiceCond);
    }
  }, this);
  exportProperties.set('choices', choices);
  if (choicesConds.length > 0)
    exportProperties.set('choicesConds', choicesConds);
  return exportProperties;
};



/**
 * @inheritDoc
 * @extends {vsaq.questionnaire.items.GroupItem}
 * @constructor
 * */
vsaq.questionnaire.items.RadiogroupItem = function(id, conditions, caption,
    defaultChoice, choices, choicesConds, opt_auth) {
  goog.base(this, id, conditions, caption, defaultChoice, choices,
            choicesConds, opt_auth);

  /** @inheritDoc */
  this.groupItemType = vsaq.questionnaire.items.RadioItem.TYPE;
};
goog.inherits(vsaq.questionnaire.items.RadiogroupItem,
              vsaq.questionnaire.items.GroupItem);


/** @inheritDoc */
vsaq.questionnaire.items.RadiogroupItem.prototype.createSingleItem = function(
    choiceId, choiceCondition, choiceText, auth) {
  var newRadioItem =
      new vsaq.questionnaire.items.RadioItem(choiceId, choiceCondition,
          choiceText, auth); // GroupItem passes readonly to ValueItem
  newRadioItem.type = vsaq.questionnaire.items.RadioItem.TYPE;
  return newRadioItem;
};


/**
 * Parses RadiogroupItem. If the topmost item in the passed Array is a
 * RadiogroupItem, it is consumed and a RadiogroupItem instance is returned.
 * If the topmost item is not a RadiogroupItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.RadiogroupItem} The parsed RadiogroupItem.
 */
vsaq.questionnaire.items.RadiogroupItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.RadiogroupItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.RadiogroupItem(
      item.id, item.cond, item.text, item.defaultChoice, item.choices,
      item.choicesConds, item.auth);
};


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.RadiogroupItem.TYPE = 'radiogroup';



/**
 * @inheritDoc
 * @extends {vsaq.questionnaire.items.GroupItem}
 * @constructor
 * */
vsaq.questionnaire.items.CheckgroupItem = function(id, conditions, caption,
    defaultChoice, choices, choicesConds, opt_auth) {
  goog.base(this, id, conditions, caption, defaultChoice, choices,
            choicesConds, opt_auth);

  /** @inheritDoc */
  this.groupItemType = vsaq.questionnaire.items.CheckItem.TYPE;
};
goog.inherits(vsaq.questionnaire.items.CheckgroupItem,
              vsaq.questionnaire.items.GroupItem);


/** @inheritDoc */
vsaq.questionnaire.items.CheckgroupItem.prototype.createSingleItem = function(
    choiceId, choiceCondition, choiceText, opt_auth) {
  var newCheckItem =
      new vsaq.questionnaire.items.CheckItem(choiceId, choiceCondition,
          choiceText, opt_auth); // GroupItem passes readonly to ValueItem

  newCheckItem.type = vsaq.questionnaire.items.CheckItem.TYPE;
  return newCheckItem;
};


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.CheckgroupItem.TYPE = 'checkgroup';


/**
 * Parses CheckgroupItem. If the topmost item in the passed Array is a
 * CheckgroupItem, it is consumed and a CheckgroupItem instance is returned.
 * If the topmost item is not a CheckgroupItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.CheckgroupItem} The parsed CheckgroupItem.
 */
vsaq.questionnaire.items.CheckgroupItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.CheckgroupItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.CheckgroupItem(
      item.id, item.cond, item.text, item.defaultChoice, item.choices,
      item.choicesConds, item.auth);
};
