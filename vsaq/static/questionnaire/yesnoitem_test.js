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
 * @fileoverview Tests for vsaq.questionnaire.items.YesNoItem.
 */

goog.provide('vsaq.questionnaire.items.YesNoItemTests');
goog.setTestOnly('vsaq.questionnaire.items.YesNoItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.YesNoItem');

var CAPTION = 'yesnoitem_caption';
var ID = 'yesnoitem_id';
var VALUE = 'yes';
var YES = 'yes_caption';
var NO = 'no_caption';

var yesno;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  yesno = new vsaq.questionnaire.items.YesNoItem(ID, [], CAPTION, YES, NO);
}


/**
 * Tests whether yesno items are rendered correctly.
 */
function testYesNoItem() {
  var el = yesno.container;

  assertEquals(el.tagName, goog.dom.TagName.DIV);
  assertTrue(goog.dom.classlist.contains(el, 'vsaq-yesno-block'));

  var desc = goog.dom.getFirstElementChild(el);
  assertEquals(goog.dom.TagName.DIV, desc.tagName);
  assertTrue(goog.dom.classlist.contains(desc, 'vsaq-question-title'));
  assertEquals(CAPTION, goog.dom.getTextContent(desc));

  var label = yesno.yesRadio_.parentNode.getElementsByTagName('span')[0];
  assertContains(YES, goog.dom.getTextContent(label));
  assertFalse(yesno.yesRadio_.checked);

  label = yesno.noRadio_.parentNode.getElementsByTagName('span')[0];
  assertContains(NO, goog.dom.getTextContent(label));
  assertFalse(yesno.noRadio_.checked);
}


/**
 * Tests setting and retrieving the value of the item.
 */
function testYesNoItemSetGetValue() {
  assertEquals('', yesno.getValue());
  yesno.setValue(VALUE);
  assertEquals(VALUE, yesno.getValue());
  assertTrue(yesno.yesRadio_.checked);
  assertFalse(yesno.noRadio_.checked);
  assertTrue(yesno.isChecked());
}


/**
 * Tests parsing of YesNoItems.
 */
function testYesNoItemParse() {
  var testStack = [{
    'type': 'yesno',
    'text': CAPTION,
    'id': ID,
    'yes': YES,
    'no': NO
  }];
  yesno = vsaq.questionnaire.items.YesNoItem.parse(testStack);
  assert(yesno instanceof vsaq.questionnaire.items.YesNoItem);
  assertEquals(ID, yesno.id);
  assertEquals(CAPTION, yesno.text);
  assertEquals(YES, yesno.yes);
  assertEquals(NO, yesno.no);
  assertEquals(0, testStack.length);

  assert(yesno.yesRadio_ instanceof HTMLInputElement);
  assert(yesno.noRadio_ instanceof HTMLInputElement);
}

