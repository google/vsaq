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
 * @fileoverview Tests for vsaq.questionnaire.items.SpacerItem.
 */

goog.provide('vsaq.questionnaire.items.SpacerItemTests');
goog.setTestOnly('vsaq.questionnaire.items.SpacerItemTests');

goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.SpacerItem');

var ID = 'spaceritem_id';

var spacer;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  spacer = new vsaq.questionnaire.items.SpacerItem(ID, []);
}


/**
 * Tests whether spacer items are rendered correctly.
 */
function testSpacerItem() {
  var el = spacer.container;

  assertEquals(goog.dom.TagName.DIV, el.tagName);
  assertNotUndefined(el.firstChild);
  assertEquals(goog.dom.TagName.HR, el.firstChild.tagName);
  assertTrue(goog.dom.classlist.contains(el.firstChild, 'vsaq-spacer'));
}


/**
 * Tests parsing of SpacerItems.
 */
function testSpacerItemParse() {
  var testStack = [{ 'type': 'spacer' }];
  spacer = vsaq.questionnaire.items.SpacerItem.parse(testStack);
  assert(spacer instanceof vsaq.questionnaire.items.SpacerItem);
  assertEquals(0, testStack.length);
}

