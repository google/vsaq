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
 * @fileoverview Tests for vsaq.questionnaire.items.TipItem.
 */

goog.provide('vsaq.questionnaire.items.TipItemTests');
goog.setTestOnly('vsaq.questionnaire.items.TipItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.TipItem');

var CAPTION = 'tipitem_caption';
var TIP_ID = 'tipitem_id';
var WARN_ID = 'warntipitem_id';
var WHY_ID = 'whytipitem_id';
var NAME_ID = 'namedtipitem_id';
var TODO_ID = 'todotipitem_id';
var CUSTOMTITLE_ID = 'customtitletipitem_id';
var WHY_TEXT = 'whytipitem_text';
var VALUE = 'whytipitem_value';
var NAME = 'whytip_name';
var TODO = 'whytip_todo';
var CUSTOMTITLE_TEXT = 'customtitle_text';

var tip;
var warn_tip;
var why_tip;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  tip = new vsaq.questionnaire.items.TipItem(TIP_ID, [], CAPTION, false);
  warn_tip = new vsaq.questionnaire.items.TipItem(WARN_ID, [], CAPTION, true);
  why_tip = new vsaq.questionnaire.items.TipItem(
      WHY_ID, [], CAPTION, true, 'medium', WHY_TEXT);
  name_tip = new vsaq.questionnaire.items.TipItem(
      NAME_ID, [], CAPTION, true, 'medium', null, NAME);
  todo_tip = new vsaq.questionnaire.items.TipItem(
      TODO_ID, [], CAPTION, true, 'medium', null, null, TODO);
  custom_title_tip = new vsaq.questionnaire.items.TipItem(
      CUSTOMTITLE_ID, [], CAPTION, true, 'medium', null, null,
      null, CUSTOMTITLE_TEXT);
}


/**
 * Tests whether tip items are rendered correctly.
 */
function testTipItem() {
  var el = tip.container;
  assertEquals(goog.dom.TagName.DIV, el.tagName);
  assertEquals(TIP_ID, tip.id);
  assertContains('Tip', goog.dom.getTextContent(el));
  assertContains(CAPTION, goog.dom.getTextContent(el));
  assertNotContains('Warning', goog.dom.getTextContent(el));

  el = warn_tip.container;
  assertEquals(goog.dom.TagName.DIV, el.tagName);
  assertEquals(WARN_ID, warn_tip.id);
  assertNotContains('Tip', goog.dom.getTextContent(el));
  assertContains(CAPTION, goog.dom.getTextContent(el));
  assertContains('Warning', goog.dom.getTextContent(el));
  assertContains('vsaq-bubble-medium', el.innerHTML);

  el = why_tip.container;
  assertEquals(goog.dom.TagName.DIV, el.tagName);
  assertEquals(WHY_ID, why_tip.id);
  assertNotContains('Tip', goog.dom.getTextContent(el));
  assertContains(CAPTION, goog.dom.getTextContent(el));
  assertContains('Warning', goog.dom.getTextContent(el));
  assertContains('vsaq-bubble-medium', el.innerHTML);

  assertEquals(NAME_ID, name_tip.id);
  assertEquals(NAME, name_tip.name);

  assertEquals(TODO_ID, todo_tip.id);
  assertEquals(TODO, todo_tip.todo);

  assertEquals(CUSTOMTITLE_ID, custom_title_tip.id);
  assertEquals(CUSTOMTITLE_TEXT, custom_title_tip.customTitle);
}


/**
 * Tests setting and retrieving the value of the item.
 */
function testTipItemSetGetValue() {
  assertEquals('', why_tip.getValue());
  why_tip.setValue(VALUE);
  assertEquals(VALUE, why_tip.getValue());
}


/**
 * Tests parsing of TipItems.
 */
function testTipItemParse() {
  var testStack = [{
    'type': 'tip',
    'text': CAPTION,
    'id': TIP_ID,
    'warn': 'yes',
    'why': WHY_TEXT,
    'todo': TODO,
    'customTitle' : CUSTOMTITLE_TEXT,
  }];
  tip = vsaq.questionnaire.items.TipItem.parse(testStack);
  assert(tip instanceof vsaq.questionnaire.items.TipItem);
  assertEquals(TIP_ID, tip.id);
  assertEquals(CAPTION, tip.text);
  assertEquals(true, tip.warn);
  assertEquals(WHY_TEXT, tip.clarification);
  assertEquals(0, testStack.length);
  assertEquals(TODO, tip.todo);
  assertEquals(CUSTOMTITLE_TEXT, tip.customTitle);
}

