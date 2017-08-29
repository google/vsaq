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
 * @fileoverview Tests for vsaq.questionnaire.items.CheckItem.
 */

goog.provide('vsaq.questionnaire.items.CheckItemTests');
goog.setTestOnly('vsaq.questionnaire.items.CheckItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.CheckItem');

var CAPTION = 'checkitem_caption';
var ID = 'checkitem_id';
var VALUE = 'checked';

var check;


/**
 * Tests whether blocks are rendered correctly.
 */
function setUp() {
  check = new vsaq.questionnaire.items.CheckItem(ID, [], CAPTION);
}


/**
 * Helper function that returns true if string has suffix.
 * @param {String} str String that should be checked for the suffix.
 * @param {String} suffix The suffix the string should be checked for.
 * @return {bool} True if the string has the given suffix.
 */
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


/**
 * Tests whether check items are rendered correctly.
 */
function testCheckItem() {
  var el = check.container;

  assertEquals(String(goog.dom.TagName.DIV), el.tagName);
  assertContains('vsaq-checkbox-item', el.className);
  assert(check.checkBox_ instanceof HTMLInputElement);
  var label = goog.dom.getLastElementChild(el);
  assert(endsWith(goog.dom.getTextContent(label), CAPTION));
}


/**
 * Tests setting and retrieving the value of the item.
 */
function testCheckItemSetGetValue() {
  assertEquals('', check.getValue());
  check.setValue(VALUE);
  assertEquals(VALUE, check.getValue());
}


/**
 * Tests parsing of CheckItems.
 */
function testCheckItemParse() {
  var testStack = [{
    'type': 'check',
    'text': CAPTION,
    'id': ID
  }];
  check = vsaq.questionnaire.items.CheckItem.parse(testStack);
  assert(check instanceof vsaq.questionnaire.items.CheckItem);
  assertEquals(ID, check.id);
  assertEquals(CAPTION, check.text);
  assertEquals(0, testStack.length);
}
