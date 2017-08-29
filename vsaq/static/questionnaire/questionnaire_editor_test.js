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

goog.provide('vsaq.QuestionnaireEditorTest');
goog.setTestOnly('vsaq.QuestionnaireEditorTest');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.json');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.structs.LinkedMap');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('vsaq.Questionnaire');
goog.require('vsaq.QuestionnaireEditor');



var HTML_STRING = 'some_html<br>_string';
var TEXT_STRING = 'ANOTHER TEXT STRING';
var BOX = {
  id: 'box_id',
  type: 'box',
  text: HTML_STRING
};
var CHECK = {
  id: 'check_id',
  type: 'check',
  text: TEXT_STRING
};
var INFO = {
  id: 'info_id',
  type: 'info',
  text: HTML_STRING
};
var LINE = {
  id: 'line_id',
  type: 'line',
  text: TEXT_STRING
};
var RADIO1 = {
  id: 'radio_id',
  type: 'radio',
  text: HTML_STRING
};
var RADIO2 = {
  id: 'radio_id2',
  type: 'radio',
  text: TEXT_STRING
};
var SPACER = {
  type: 'spacer'
};
var TIP = {
  id: 'tip_id',
  type: 'tip',
  text: TEXT_STRING
};
var WHYTIP = {
  id: 'whytip_id',
  type: 'tip',
  why: 'whytext',
  severity: 'high',
  text: HTML_STRING
};
var YESNO = {
  id: 'yesno_id',
  type: 'yesno',
  yes: HTML_STRING + 'yes_part',
  no: HTML_STRING + 'no_part',
  text: TEXT_STRING
};
var ROOT_BLOCK_ID = 'root_block';
var ROOT_BLOCK = {
  id: ROOT_BLOCK_ID,
  type: 'block',
  text: HTML_STRING,
  items: [
    BOX,
    LINE,
    TIP,
    WHYTIP,
    YESNO,
    INFO,
    SPACER,
    RADIO1,
    RADIO2,
    CHECK
  ]
};
var QUESTIONNAIRE = [ROOT_BLOCK];
var INVALID_JSON = '{invalid/JSON}';
var CONDITIONS_CLASS_PROPERTY_NAME = 'conditions';
var CONDITIONS_CLASS_TEMPLATE_NAME = 'cond';
var TEST_STRING = 'test_1337';
var TEST_LINK_MAP_CONTENT = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
var EXPECTED_LINKED_MAP_SERIALIZATION =
    '{"a":"a","b":"b","c":"c","d":"d","e":"e","f":"f","g":"g"}';

var editor;
var editTemplateElement;
var root;
var stubs = new goog.testing.PropertyReplacer();


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  root = goog.dom.getElement('root');
  editTemplateElement = goog.dom.getElement('vsaq_editor_template_textarea');
  // Always load the editor.
  stubs.set(vsaq.QuestionnaireEditor.prototype,
      'isEditorEnabled_', function() {
        return true;
      });
  // Load the editor instantly.
  stubs.set(vsaq.QuestionnaireEditor.prototype, 'initEditor_',
      vsaq.QuestionnaireEditor.prototype.displayEditor_);
  // Use a questionnaire dummy.
  stubs.set(vsaq, 'initQuestionnaire', function() {
    var q = new vsaq.Questionnaire(root);
    // Deep copy the questionnaire object here.
    var dummyQuestionnaire = JSON.parse(goog.json.serialize(QUESTIONNAIRE));
    q.setTemplate(dummyQuestionnaire);
    var mockQpage = {};
    mockQpage.questionnaire = q;
    return mockQpage;
  });
  // Initialize the editor now.
  editor = new vsaq.QuestionnaireEditor();
  assertNotUndefined(editor.questionnaire_);
  // After the Editor was loaded the template textarea should contain the
  // (exported) questionnaire's JSON.
  assertTrue(editor.editTemplateElementDecorator_.getValue().length > 0);
}


/**
 * Cleanup after each test.
 */
function tearDown() {
  stubs.reset();
  goog.dom.removeChildren(root);
  goog.dom.removeChildren(editTemplateElement);
}


/**
 * Tests whether the questionnaire is properly resettable.
 */
function testFlushQuestionnaire() {
  editor.flushQuestionnaire_();
  var rootBlock = editor.questionnaire_.getRootBlock();
  assertNull(goog.dom.getParentElement(rootBlock.container));
  var qItems = editor.questionnaire_.getItems();
  assertTrue(goog.object.equals(qItems, {}));
}


/**
 * Tests whether the questionnaire editor is reacting correctly to faulty
 * templates and is able to parse valid ones.
 */
function testParseTemplate() {
  var templateBackup = editor.editTemplateElementDecorator_.getValue();
  // The template was already exported and should be parsable.
  assertTrue(editor.parseTemplate());
  editor.exportTemplate();
  // We want the template to keep its exact form after being parsed and
  // exported again.
  var currentTemplate = editor.editTemplateElementDecorator_.getValue();
  assertEquals(templateBackup, currentTemplate);
  // Test against invalid templates.
  editor.editTemplateElementDecorator_.setValue(INVALID_JSON);
  assertFalse(editor.parseTemplate());
  // Test if the currently displayed questionnaire has been exported and a valid
  // template has been restored. This should happen once an error during parsing
  // occurs.
  assertTrue(editor.parseTemplate());
}


/**
 * Test if the template area reacts correclty when clicked.
 */
function testExportBox() {
  // Deactivate live editing mode.
  editor.liveEditModeElement_.checked = false;
  editor.toggleExportBox();
  assertFalse(editor.templateEditMode_);
  // Activate live editing mode.
  editor.liveEditModeElement_.checked = true;
  editor.toggleExportBox();
  assertTrue(editor.templateEditMode_);
  // Test toggling (once a user clicks outside the textarea the edit mode should
  // be deactivated.
  editor.toggleExportBox();
  assertFalse(editor.templateEditMode_);
}


/**
 * Test if an item id's can be properly updated.
 */
function testUpdateItemID() {
  var rootBlock = editor.questionnaire_.getRootBlock();
  assertEquals(rootBlock.id, ROOT_BLOCK_ID);
  assertEquals(rootBlock.templateItemId, ROOT_BLOCK_ID);
  assertTrue(editor.updateItemID_(rootBlock, null));
  assertNotUndefined(rootBlock.id);
  assertNull(rootBlock.templateItemId);
  assertTrue(editor.updateItemID_(rootBlock, ROOT_BLOCK_ID));
  // Test if setting the same id twice is properly forbidden.
  var rootBlockChildren = rootBlock.getContainerItems();
  var firstChild = rootBlockChildren[0];
  assertFalse(editor.updateItemID_(firstChild, ROOT_BLOCK_ID));
}


/**
 * Test if specific questionnaire HTML text elements are editable and have an
 * effect on the underlying item once they have been modified.
 */
function testUpdateItemEntry() {
  var rootBlock = editor.questionnaire_.getRootBlock();
  // Test if the conditions can properly be updated.
  editor.updateItemEntry_(rootBlock, CONDITIONS_CLASS_PROPERTY_NAME,
      TEST_STRING);
  assertEquals(rootBlock[CONDITIONS_CLASS_PROPERTY_NAME], TEST_STRING);
}


/**
 * Move items within the questionnaire.
 */
function testMoveAndRemoveItems() {
  var rootBlock = editor.questionnaire_.getRootBlock();
  var rootBlockChildren = rootBlock.getContainerItems();

  var firstChild = rootBlockChildren[0];
  var secondChild = rootBlockChildren[1];
  // Nothing should happen here.
  editor.moveItemUp(firstChild.container.firstChild);
  assertEquals(rootBlockChildren[0], firstChild);
  assertEquals(rootBlockChildren[1], secondChild);
  // Swap the first and second item.
  editor.moveItemDown(firstChild.container.firstChild);
  assertEquals(rootBlockChildren[1], firstChild);
  assertEquals(rootBlockChildren[0], secondChild);
  // Remove the second child so that the first child is really first again.
  editor.removeItem(secondChild.container.firstChild);
  assertEquals(rootBlockChildren[0], firstChild);

  var numberChildren = rootBlockChildren.length;
  var nextToLastChild = rootBlockChildren[numberChildren - 2];
  var lastChild = rootBlockChildren[numberChildren - 1];
  // Nothing should happen here.
  editor.moveItemDown(lastChild.container.firstChild);
  assertEquals(rootBlockChildren[numberChildren - 2], nextToLastChild);
  assertEquals(rootBlockChildren[numberChildren - 1], lastChild);
  // Swap the last and next to last item.
  editor.moveItemUp(lastChild.container.firstChild);
  assertEquals(rootBlockChildren[numberChildren - 2], lastChild);
  assertEquals(rootBlockChildren[numberChildren - 1], nextToLastChild);
  // Remove next to last child so that the last child is really last again.
  editor.removeItem(nextToLastChild.container.firstChild);
  numberChildren = rootBlockChildren.length;
  assertEquals(rootBlockChildren[numberChildren - 1], lastChild);
}


/**
 * Tests whether items are correctly addable and copyable.
 */
function testAddAndCopyItems() {
  var rootBlock = editor.questionnaire_.getRootBlock();
  var rootBlockChildren = rootBlock.getContainerItems();
  var firstChild = rootBlockChildren[0];
  assertNotEquals(firstChild.type, rootBlockChildren[1].type);
  // Insert the same item type below the existing item.
  editor.setEditability(firstChild, true);
  editor.addItem(firstChild.container.firstChild);
  editor.setEditability(firstChild, false);
  assertEquals(firstChild.type, rootBlockChildren[1].type);
  assertNotEquals(firstChild.text, rootBlockChildren[1].text);
  // Now copy the first child and insert it below it.
  editor.copyItem(firstChild.container.firstChild);
  assertEquals(firstChild.type, rootBlockChildren[1].type);
  assertEquals(firstChild.text, rootBlockChildren[1].text);
}


/**
 * Tests whether items and their properties are properly exported.
 */
function testItemExport() {
  var rootBlock = editor.questionnaire_.getRootBlock();
  editor.updateItemEntry_(rootBlock, CONDITIONS_CLASS_PROPERTY_NAME,
      TEST_STRING);
  var exportedJSON = editor.exportQuestionnaireJSON_(rootBlock);
  var conditionText = '"' + CONDITIONS_CLASS_TEMPLATE_NAME + '": ' +
                      '"' + TEST_STRING + '"';
  assertTrue(goog.string.contains(exportedJSON, conditionText));
}


/**
 * Tests whether the linkedMap serializer works as expected.
 */
function testOrderedJsonSerializer() {
  var linkedMap = new goog.structs.LinkedMap();
  goog.array.forEach(TEST_LINK_MAP_CONTENT, function(value) {
    linkedMap.set(value, value);
  });
  var orderedJsonSerializer = new vsaq.QuestionnaireEditor.Serializer();
  var jsonContent = orderedJsonSerializer.serialize(linkedMap);
  assertEquals(jsonContent, EXPECTED_LINKED_MAP_SERIALIZATION);
}
