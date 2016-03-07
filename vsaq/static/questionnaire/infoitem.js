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
 * @fileoverview Questionnaire informational items.
 */

goog.provide('vsaq.questionnaire.items.InfoItem');

goog.require('goog.dom');
goog.require('goog.soy');
goog.require('goog.string');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.templates');



/**
 * An item that shows some information to the user. The information may contain
 * HTML.
 * @param {?string} id An ID uniquely identifying the item.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {?string} info The information that should be shown to the user.
 * @extends {vsaq.questionnaire.items.Item}
 * @constructor
 */
vsaq.questionnaire.items.InfoItem = function(id, conditions, info) {
  goog.base(this, id, conditions);

  /**
   * The information that should be shown to the user.
   * @type {string}
   */
  this.info = goog.string.makeSafe(info);
  var propertyInformation = {
    nameInClass: 'info',
    mandatory: true
  };
  this.addPropertyInformation('text', propertyInformation);

  this.render();
};
goog.inherits(vsaq.questionnaire.items.InfoItem,
              vsaq.questionnaire.items.Item);


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.InfoItem.prototype.render = function() {
  var oldNode = this.container;
  this.container = goog.soy.renderAsElement(vsaq.questionnaire.templates.info,
      {
        id: this.id,
        captionHtml: soydata.VERY_UNSAFE.ordainSanitizedHtml(this.info)
      });
  goog.dom.replaceNode(this.container, oldNode);
};


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.InfoItem.TYPE = 'info';


/**
 * Parses InfoItems. If the topmost item in the passed Array is a
 * InfoItem, it is consumed and a InfoItem instance is returned.
 * If the topmost item is not a CheckItem, an exception is thrown.
 * @param {!Array.<qjson.QuestionnaireItem>} questionStack Array of serialized
 *     questionnaire Items.
 * @return {!vsaq.questionnaire.items.InfoItem} The parsed InfoItem.
 */
vsaq.questionnaire.items.InfoItem.parse = function(questionStack) {
  var item = questionStack.shift();
  if (item.type != vsaq.questionnaire.items.InfoItem.TYPE)
    throw new vsaq.questionnaire.items.ParseError('Wrong parser chosen.');

  return new vsaq.questionnaire.items.InfoItem(item.id, item.cond, item.text);
};
