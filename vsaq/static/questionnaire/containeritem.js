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
 * @fileoverview A container item that can contain further items. A typical
 *     container item could be a blockitem or groupitem.
 */

goog.provide('vsaq.questionnaire.items.ContainerItem');


goog.require('goog.array');
goog.require('goog.dom');
goog.require('vsaq.questionnaire.items.Item');



/**
 * A container of items e.g. blockitem or groupitems.
 * @inheritDoc
 * @extends {vsaq.questionnaire.items.Item}
 * @constructor
 */
vsaq.questionnaire.items.ContainerItem = function(id, conditions) {
  goog.base(this, id, conditions);

  /**
   * An array of contained items.
   * @type {!vsaq.questionnaire.items.ItemArray}
   * @protected
   */
  this.containerItems = [];
};
goog.inherits(vsaq.questionnaire.items.ContainerItem,
              vsaq.questionnaire.items.Item);


/**
 * Return all container items.
 * @return {!vsaq.questionnaire.items.ItemArray} all container items.
 */
vsaq.questionnaire.items.ContainerItem.prototype.getContainerItems =
    function() {
  return this.containerItems;
};


/**
 * Adds a subitem to the current container.
 * @param {!vsaq.questionnaire.items.Item} item The item to be added
 * to the container.
 */
vsaq.questionnaire.items.ContainerItem.prototype.addItem = function(item) {
  this.containerItems.push(item);
  item.parentItem = this;
  this.container.appendChild(item.container);
};


/**
 * Returns the passed item's index within the internal containerItems array.
 * @param {!vsaq.questionnaire.items.Item} item The item to be found.
 * @return {?number} The index of the item within subItem.
 * @private
 */
vsaq.questionnaire.items.ContainerItem.prototype.getContainerItemId_ =
    function(item) {
  var targetSubItemId = null;
  var subItemCounter = 0;
  goog.array.some(this.containerItems, function(subItem) {
    if (subItem.id == item.id) {
      targetSubItemId = subItemCounter;
      return true;
    }
    subItemCounter++;
    return false;
  });
  return targetSubItemId;
};


/**
 * Returns the upper or lower sibling of a given item.
 * @param {!vsaq.questionnaire.items.Item} item The reference item.
 * @param {!boolean} getLowerSibling true if the lower sibling should be
 *     returned, else the upper sibling will be returned.
 * @return {?vsaq.questionnaire.items.Item} The upper or lower sibling.
 */
vsaq.questionnaire.items.ContainerItem.prototype.getSiblingItem = function(item,
    getLowerSibling) {
  var targetSubItemId = this.getContainerItemId_(item);
  if (targetSubItemId == null)
    return null;
  var numbercontainerItems_ = this.containerItems.length;
  var siblingItem = null;
  if (getLowerSibling) {
    if (targetSubItemId + 1 < numbercontainerItems_)
      siblingItem = this.containerItems[targetSubItemId + 1];
  } else if (targetSubItemId - 1 >= 0) {
    siblingItem = this.containerItems[targetSubItemId - 1];
  }
  return siblingItem;
};


/**
 * Adds a subitem after or before a specific other item in the current
 * container.
 * @param {!vsaq.questionnaire.items.Item} newItem The item to be inserted.
 * @param {!vsaq.questionnaire.items.Item} srcItem The item to which newItem
 *     is inserted relative to.
 * @param {boolean} insertBelow true if newItem is supposed to be inserted
 *     below srcItem.
 * @private
 */
vsaq.questionnaire.items.ContainerItem.prototype.insertItemRelativeTo_ =
    function(newItem, srcItem, insertBelow) {

  var srcSubItemId = this.getContainerItemId_(srcItem);
  if (srcSubItemId == null)
    return;

  var newItemPosition;
  if (insertBelow) {
    newItemPosition = srcSubItemId + 1;
  } else {
    // We prepend newItem by inserting it at the same position as srcItem.
    // All consecutive items (including srcItem) will then be moved to a
    // higher position.
    newItemPosition = srcSubItemId;
  }

  // Insert newItem directly after srcItem within the containerItems array.
  goog.array.insertAt(this.containerItems, newItem, newItemPosition);
  newItem.parentItemSet(this);
};


/**
 * Adds a subitem after a specific other item in the current container.
 * @param {!vsaq.questionnaire.items.Item} newItem The item to be appended to
 *     the container.
 * @param {!vsaq.questionnaire.items.Item} srcItem The item after which the
 *     newItem will be inserted.
 */
vsaq.questionnaire.items.ContainerItem.prototype.insertAfter = function(newItem,
    srcItem) {
  this.insertItemRelativeTo_(newItem, srcItem, true);
  goog.dom.insertSiblingAfter(newItem.container, srcItem.container);
};


/**
 * Adds a subitem before a specific other item in the current container.
 * @param {!vsaq.questionnaire.items.Item} newItem The item to be appended to
 *     the container.
 * @param {!vsaq.questionnaire.items.Item} srcItem The item before which the
 *     newItem will be inserted.
 */
vsaq.questionnaire.items.ContainerItem.prototype.insertBefore =
    function(newItem, srcItem) {
  this.insertItemRelativeTo_(newItem, srcItem, false);
  goog.dom.insertSiblingBefore(newItem.container, srcItem.container);
};


/**
 * Remove an item from a container.
 * @param {!vsaq.questionnaire.items.Item} item The to be deleted item.
 */
vsaq.questionnaire.items.ContainerItem.prototype.deleteItem = function(item) {
  var targetSubItemId = this.getContainerItemId_(item);
  if (targetSubItemId == null)
    return;
  // Remove the target from the array and close the new gap again.
  goog.array.removeAt(this.containerItems, targetSubItemId);
  goog.dom.removeNode(item.container);
};
