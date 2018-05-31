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
 * @fileoverview Questionnaire block items.
 *
 * Questionnaires allow to group questions in blocks. Blocks are indicated by
 * {vsaq.questionnaire.items.BlockItem}.
 */

goog.provide('vsaq.questionnaire.items.BlockItem');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.soy');
goog.require('goog.string');
goog.require('vsaq.questionnaire.items.ContainerItem');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.RadioItem');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.templates');



/**
 * Starts a new block in the questionnaire.
 * @param {?string} id An ID uniquely identifying the item.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {?string} caption The caption of the block.
 * @param {?string=} opt_auth The needed authorization to get an item displayed.
 *     The auth param on `vsaq.questionnaire.items.BlockItem` only
 *     prevents that items are displayed to the user (hidden by display=none).
 * @param {?string=} opt_className Name of a CSS class to add to the block.
 * @extends {vsaq.questionnaire.items.ContainerItem}
 * @constructor
 */
vsaq.questionnaire.items.BlockItem = function(id, conditions, caption,
    opt_auth, opt_className) {
  goog.base(this, id, conditions);

  /**
   * The needed authorization to get an item displayed.
   * @type {string}
   */
  this.auth = goog.string.makeSafe(opt_auth);
  var propertyInformation = {
    nameInClass: 'auth',
    defaultValues: {
      admin: 'admin'
    },
    metadata: true
  };
  this.addPropertyInformation('auth', propertyInformation);

  /**
   * Extra class to add to the item.
   * Stores the className attribute from the JSON definition.
   * @type {string}
   */
  this.className = goog.string.makeSafe(opt_className);
  propertyInformation = {
    nameInClass: 'className',
    defaultValues: {
      vsaq_invisible: 'vsaq-invisible'
    },
    metadata: true
  };
  this.addPropertyInformation('className', propertyInformation);

  /**
   * Text shown at the top of the block.
   * @type {string}
   */
  this.text = goog.string.makeSafe(caption);
  propertyInformation = {
    nameInClass: 'text',
    mandatory: true
  };
  this.addPropertyInformation('text', propertyInformation);

  this.render();
};
goog.inherits(vsaq.questionnaire.items.BlockItem,
              vsaq.questionnaire.items.ContainerItem);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.BlockItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = (goog.soy.renderAsElement(
      vsaq.questionnaire.templates.block, {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.text),
        blockId: this.id
      }));
  // Append all children.
  goog.array.forEach(this.containerItems, function(item) {
    this.container.appendChild(item.container);
  }, this);
  goog.dom.replaceNode(this.container, oldNode);
};


/**
 * Returns the number of unanswered questions in the block.
 * @return {number} The number of unanswered questions in the block.
 */
vsaq.questionnaire.items.BlockItem.prototype.getUnansweredCount =
    function() {
  var count = 0, radioChecked = false, hasRadio = false;

  goog.array.forEach(this.containerItems, function(item) {
    if (item instanceof vsaq.questionnaire.items.RadioItem) {
      hasRadio = true;
      if (item.isChecked()) radioChecked = true;
      return;
    }
    // If we come across a ValueItem that is visible and not answered,
    // increment the counter.
    if (item instanceof vsaq.questionnaire.items.ValueItem &&
        item.isVisible() &&
        !item.isAnswered())
      count++;
    // Finally, if we come across a Block, count everything in that block
    // recursively.
    if (item instanceof vsaq.questionnaire.items.BlockItem)
      count += item.getUnansweredCount();
  }, this);

  // If there are radio buttons and none is checked, count as one.
  if (hasRadio && !radioChecked) count++;

  return count;
};


/**
 * Parses BlockItems. If the topmost item in the passed Array is a
 * BlockItem, it is consumed and a BlockItem instance is returned.
 * If the topmost item is not a BlockItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire items.
 * @return {!vsaq.questionnaire.items.BlockItem} The parsed BlockItem.
 */
vsaq.questionnaire.items.BlockItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.BlockItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.BlockItem(item.id, item.cond,
      item.text, item.auth, item.className);
};


/** @inheritDoc */
vsaq.questionnaire.items.BlockItem.prototype.exportItem = function() {
  var exportProperties =
      vsaq.questionnaire.items.Item.prototype.exportItem.call(this);
  var containerItems = [];
  goog.array.forEach(this.containerItems, function(item) {
    containerItems.push(item.exportItem());
  });
  exportProperties.set('items', containerItems);
  return exportProperties;
};


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.BlockItem.TYPE = 'block';

