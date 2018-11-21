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
 * @fileoverview Tests for vsaq.questionnaire.items.BoxItem.
 */

goog.provide('vsaq.questionnaire.items.BoxItemTests');
goog.setTestOnly('vsaq.questionnaire.items.BoxItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.BoxItem');

var CAPTION = 'boxitem_caption';
var ID = 'boxitem_id';
var VALUE = 'boxitem_value';

var box;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  box = new vsaq.questionnaire.items.BoxItem(ID, [], CAPTION);
}


/**
 * Tests whether box items are rendered correctly.
 */
function testBoxItem() {
  var el = box.container;

  assertEquals(String(goog.dom.TagName.DIV), el.tagName);
  var desc = goog.dom.getFirstElementChild(el);
  assertTrue('Class not set',
      goog.dom.classlist.contains(desc, 'vsaq-question-title'));
  assertEquals(CAPTION, goog.dom.getTextContent(desc));

  var area = goog.dom.getNextElementSibling(desc);
  assertEquals(ID, area.id);
  assertEquals('', area.value);
}


/**
 * Tests setting and retrieving the value of the item.
 */
function testBoxItemSetGetValue() {
  assertEquals('', box.getValue());
  box.setValue(VALUE);
  assertEquals(VALUE, box.getValue());
}


/**
 * Tests whether box items are re-rendered with lighlight correctly.
 */
function testBoxItemRerender() {
  box.render(true);
  box.setValue('');
  var el = box.container;

  assertEquals(String(goog.dom.TagName.DIV), el.tagName);
  var desc = goog.dom.getFirstElementChild(el);
  assertTrue('Class not set',
      goog.dom.classlist.contains(desc, 'vsaq-question-title'));
  assertEquals(CAPTION, goog.dom.getTextContent(desc));

  var area = goog.dom.getNextElementSibling(desc);
  assertEquals(ID, area.id);
  assertEquals('', area.value);
}


/**
 * Tests if box items preserve value after re-render.
 */
function testBoxItemPreserveValue() {
  box.setValue(VALUE);
  box.render();
  assertEquals(VALUE, box.getValue());
}


/**
 * Tests parsing of BoxItems.
 */
function testBoxItemParse() {
  var testStack = [{
    'type': 'box',
    'text': CAPTION,
    'id': ID,
    'required' : true,
    'placeholder': 'placeholder'
  }];
  box = vsaq.questionnaire.items.BoxItem.parse(testStack);
  assert(box instanceof vsaq.questionnaire.items.BoxItem);
  assertEquals(ID, box.id);
  assertEquals(CAPTION, box.text);
  assertEquals('placeholder', box.placeholder);
  assertTrue(box.required);
  assertEquals(0, testStack.length);
  assertTrue(box.auth != 'readonly');

  testStack = [{
    'type': 'box',
    'text': CAPTION,
    'id': ID,
    'required' : true,
    'placeholder': 'placeholder',
    'auth': 'readonly'
  }];
  box = vsaq.questionnaire.items.BoxItem.parse(testStack);
  assert(box instanceof vsaq.questionnaire.items.BoxItem);
  assertEquals(ID, box.id);
  assertEquals(CAPTION, box.text);
  assertEquals('placeholder', box.placeholder);
  assertTrue(box.required);
  assertEquals(0, testStack.length);
  assertEquals('readonly', box.auth);
}
