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
 * @fileoverview Tests for vsaq.questionnaire.items.RadioItem.
 */

goog.provide('vsaq.questionnaire.items.RadioItemTests');
goog.setTestOnly('vsaq.questionnaire.items.RadioItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.testing.asserts');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.BlockItem');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.RadioItem');

var CAPTION = 'radioitem_caption';
var ID = 'radioitem_id';
var ID2 = 'radioitem_id2';
var VALUE = 'checked';

var radio, radio2;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  var block = new vsaq.questionnaire.items.BlockItem('block_id', [], '');
  radio = new vsaq.questionnaire.items.RadioItem(ID, [], CAPTION);
  radio2 = new vsaq.questionnaire.items.RadioItem(ID2, [], CAPTION);
  block.addItem(radio);
  block.addItem(radio2);
}


/**
 * Tests whether radio items are rendered correctly.
 */
function testRadioItem() {
  var el = radio.container;

  assertEquals(String(goog.dom.TagName.DIV), el.tagName);
  assertContains('vsaq-radio-item', el.className);
  assert(radio.radioButton instanceof HTMLInputElement);
  assertContains(CAPTION, goog.dom.getTextContent(el.firstChild));
  assertFalse(radio.radioButton.checked);
  assertFalse(radio.isChecked());
}


/**
 * Tests setting and retrieving the value of the item.
 */
function testRadioItemSetGetValue() {
  assertEquals('', radio.getValue());
  radio.setValue(VALUE);
  assertEquals(VALUE, radio.getValue());
}


/**
 * Tests parsing of RadioItems.
 */
function testRadioItemParse() {
  var testStack = [{
    'type': 'radio',
    'text': CAPTION,
    'id': ID
  }];
  radio = vsaq.questionnaire.items.RadioItem.parse(testStack);
  assert(radio instanceof vsaq.questionnaire.items.RadioItem);
  assertEquals(ID, radio.id);
  assertEquals(CAPTION, radio.text);
  assertEquals(0, testStack.length);
}


/**
 * Tests that no two radio items can be selected at the same time.
 */
function testRadioItemChanges() {
  radio.setValue(true);
  assertEquals(VALUE, radio.getValue());
  assertEquals('', radio2.getValue());
  var e = new goog.testing.events.Event(goog.events.EventType.CHANGE,
      radio.radioButton);
  var eventSent = false;
  goog.events.listen(radio.eventDispatcher,
      [vsaq.questionnaire.items.Item.CHANGED],
      function(e) {
        eventSent = true;
        assertEquals(VALUE, e.changes[ID]);
        assertEquals('', e.changes[ID2]);
      });
  goog.testing.events.fireBrowserEvent(e);
  assertEquals(true, eventSent);
}

