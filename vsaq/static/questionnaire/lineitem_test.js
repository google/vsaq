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
 * @fileoverview Tests for vsaq.questionnaire.items.LineItem.
 */

goog.provide('vsaq.questionnaire.items.LineItemTests');
goog.setTestOnly('vsaq.questionnaire.items.LineItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.LineItem');

var CAPTION = 'lineitem_caption';
var ID = 'lineitem_id';
var VALUE = 'lineitem_value';

var line;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  line = new vsaq.questionnaire.items.LineItem(ID, [], CAPTION);
}


/**
 * Tests whether line items are rendered correctly.
 */
function testLineItem() {
  var el = line.container;

  assertEquals(String(goog.dom.TagName.DIV), el.tagName);
  var desc = goog.dom.getFirstElementChild(el);
  assertEquals(CAPTION, goog.dom.getTextContent(desc));
  var input = goog.dom.getNextElementSibling(desc);
  assertEquals(String(goog.dom.TagName.INPUT), input.tagName);
  assertEquals('', input.value);
  assertEquals(ID, input.id);
}


/**
 * Tests setting and retrieving the value of the item.
 */
function testLineItemSetGetValue() {
  assertEquals('', line.getValue());
  line.setValue(VALUE);
  assertEquals(VALUE, line.getValue());
}


/**
 * Tests parsing of LineItems.
 */
function testLineItemParse() {
  var testStack = [{
    'type': 'line',
    'text': CAPTION,
    'id': ID,
    'required' : true,
    'inputPattern': '.*',
    'inputTitle': 'input_title',
    'inputType': 'date',
    'placeholder': 'placeholder',
    'maxlength': 100,
  }];
  line = vsaq.questionnaire.items.LineItem.parse(testStack);
  assert(line instanceof vsaq.questionnaire.items.LineItem);
  assertEquals(ID, line.id);
  assertEquals(CAPTION, line.text);
  assertEquals(0, testStack.length);
  assertEquals('input_title', line.inputTitle);
  assertEquals('placeholder', line.placeholder);
  assertEquals(100, line.maxlength);
  assertEquals('.*', line.inputPattern);
  assertEquals('date', line.inputType);
  assertTrue(line.required);
}
