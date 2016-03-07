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
 * @fileoverview Tests for vsaq.questionnaire.items.ContainerItem
 */

goog.provide('vsaq.questionnaire.items.ContainerItemTests');
goog.setTestOnly('vsaq.questionnaire.items.ContainerItemTests');

goog.require('goog.array');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.CheckItem');
goog.require('vsaq.questionnaire.items.ContainerItem');

var CAPTION = 'test_caption';
var ID = 'test_id';
var ADMIN = 'admin';

var NUMBER_CONTAINER_ITEMS = 5;

var container;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  container = new vsaq.questionnaire.items.ContainerItem(ID, [], ADMIN, null);
  for (var i = 0; i < NUMBER_CONTAINER_ITEMS; i++) {
    var checkItem = new vsaq.questionnaire.items.CheckItem(ID + i, [],
        CAPTION + i);
    container.addItem(checkItem);
  }
}


/**
 * Tests whether containers are storing items correctly.
 */
function testContainerItem() {
  assertEquals(container.containerItems.length, NUMBER_CONTAINER_ITEMS);
  // Test if after deletion each gap was correctly closed again.
  var containedItems = [];
  goog.array.forEach(container.containerItems, function(item) {
    containedItems.push(item);
  });
  for (var i = 0; i < NUMBER_CONTAINER_ITEMS; i++)
    container.deleteItem(containedItems[i]);
  assertEquals(container.containerItems.length, 0);
}
