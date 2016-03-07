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
 * @fileoverview A WYSIWYG questionnaire editor.
 */

goog.provide('vsaq.QuestionnaireEditor');

goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.debug.Error');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.dom.forms');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.format.JsonPrettyPrinter');
goog.require('goog.json');
goog.require('goog.json.Serializer');
goog.require('goog.object');
goog.require('goog.soy');
goog.require('goog.string');
goog.require('goog.structs.LinkedMap');
goog.require('goog.ui.ScrollFloater');
goog.require('goog.ui.Textarea');
goog.require('vsaq.questionnaire.items.ContainerItem');
goog.require('vsaq.questionnaire.items.GroupItem');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.items.factory');
goog.require('vsaq.questionnaire.templates');
goog.require('vsaq.utils');



/**
 * Initialize the questionnaire editor.
 * @constructor
 */
vsaq.QuestionnaireEditor = function() {
  if (!this.isEditorEnabled_())
    return;

  var questionnaireObj = vsaq.initQuestionnaire();

  /**
   * A reference to the main questionnaire object.
   * @type {?vsaq.Questionnaire}
   * @private
   */
  this.questionnaire_ = questionnaireObj.questionnaire;
  this.questionnaire_.setAdminMode(true);
  this.questionnaire_.setUnrolledMode(true);

  /**
   * Is true if the template is currently being edited.
   * @type {!boolean}
   * @private
   */
  this.templateEditMode_ = false;

  /**
   * Is true if the editor is active.
   * @type {!boolean}
   * @private
   */
  this.editorActive_ = false;

  /**
   * Is true if the questionnaire items should be editable.
   * @type {!boolean}
   * @private
   */
  this.itemEditability_ = false;

  /**
   * Is set to true if an editor event was fired to prevent any other action to
   * occur at the same time (to avoid event clashes).
   * @type {!boolean}
   * @private
   */
  this.itemClickEventMutex_ = false;

  /**
   * Is set to true if an item property is currently being edited to avoid event
   * race conditions.
   * @type {!boolean}
   * @private
   */
  this.itemClickTextEditMutex_ = false;

  /**
   * Stores the last clicked item id and is used to set editability outside of
   * the editor mode.
   * @type {?string}
   * @private
   */
  this.lastClickedItemID_ = null;

  /**
   * The questionnaire's template textarea HTML Element.
   * @type {?Element}
   * @private
   */
  this.editTemplateElement_ = null;

  /**
   * The questionnaire's live edit mode checkbox HTML Element.
   * @type {?Element}
   * @private
   */
  this.liveEditModeElement_ = null;

  /**
   * The questionnaire's light edit mode checkbox HTML Element.
   * @type {?Element}
   * @private
   */
  this.lightEditModeElement_ = null;

  /**
   * The editor's floatable window.
   * @type {?Element}
   * @private
   */
  this.editorWindowDOM_ = null;

  this.initEditorDOMElements_();

  /**
   * The questionnaire's template textarea decorator (used for auto resizing).
   * @type {!goog.ui.Textarea}
   * @private
   */
  this.editTemplateElementDecorator_ = new goog.ui.Textarea('');
  this.editTemplateElementDecorator_.setMaxHeight(
      (vsaq.QuestionnaireEditor.SETTINGS.windowHeightPercentage / 100) *
      goog.dom.getViewportSize().height);
  this.editTemplateElementDecorator_.decorate(this.editTemplateElement_);
  // Make the complete template editor section floatable (on scroll).
  var scrollfloater = new goog.ui.ScrollFloater();
  scrollfloater.setViewportTopOffset(
      vsaq.QuestionnaireEditor.SETTINGS.windowTopOffset);
  scrollfloater.decorate(this.editorWindowDOM_);

  this.initEditorClickables_({
    'eh-add-to-item': goog.bind(this.addItem, this),
    'eh-copy-item': goog.bind(this.copyItem, this),
    'eh-remove-from-item': goog.bind(this.removeItem, this),
    'eh-make-editable': goog.bind(this.enableItemEditability, this),
    'eh-move-item-up': goog.bind(this.moveItemUp, this),
    'eh-move-item-down': goog.bind(this.moveItemDown, this),
    'eh-export-template': goog.bind(this.exportTemplate, this),
    'eh-editor-status': goog.bind(this.toggleEditor, this),
    'eh-light-editor-status': goog.bind(this.setGlobalItemEditability, this),
    'eh-editor-rollmode': goog.bind(this.setRollMode, this),
    'eh-parse-template': goog.bind(this.parseTemplate, this),
    'vsaq-label-text': goog.bind(this.editItemTextEntry, this),
    'vsaq-select-text': goog.bind(this.selectItemEntry, this),
    'vsaq-remove-text': goog.bind(this.removeItemEntry, this)
  });
  // The following event has direct effects on the template.
  goog.events.listen(this.editTemplateElement_, goog.events.EventType.CLICK,
      goog.bind(this.toggleExportBox, this));
  // Create a click handler which stops event propagation. This helps to find
  // the correct element in case an element within another element was clicked.
  var scrollOnClickHandler = goog.bind(this.itemClickedHandler, this);
  goog.events.listen(goog.dom.getDocument(), [goog.events.EventType.CLICK],
      function(e) {
        e.stopPropagation();
        var clickable = goog.dom.getAncestorByClass(e.target, 'vsaq-item');
        if (clickable)
          scrollOnClickHandler(clickable);
      });

  // Load and display the editor.
  this.initEditor_();
};


/**
 * This dictionary contains all important editor settings.
 * @type {Object.<string, *>}
 * @const
 */
vsaq.QuestionnaireEditor.SETTINGS = {
  urlParameter: 'editor',
  windowHeightPercentage: 60,
  windowTopOffset: 100,
  successColor: 'rgb(245, 252, 244)',
  failureColor: 'rgb(255, 231, 231)',
  noTextEntry: 'none',
  jsonScrollTopOffset: 21,
  itemEditBorder: '2px solid green'
};


/**
 * Initializes all important editor DOM elements.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.initEditorDOMElements_ = function() {
  this.editTemplateElement_ =
      goog.dom.getElement('vsaq_editor_template_textarea');
  if (!this.editTemplateElement_)
    throw new goog.debug.Error('Can\'t find the template textarea.');

  this.liveEditModeElement_ =
      goog.dom.getElement('vsaq_editor_live_mode');
  if (!this.liveEditModeElement_)
    throw new goog.debug.Error(
        'Can\'t find the template live edit mode element.');

  this.lightEditModeElement_ =
      goog.dom.getElement('vsaq_editor_light_mode');
  if (!this.lightEditModeElement_)
    throw new goog.debug.Error(
        'Can\'t find the template live edit mode element.');

  this.editorWindowDOM_ = goog.dom.getElement('vsaq_editor');
  if (!this.editorWindowDOM_)
    throw new goog.debug.Error('Can\'t find the template editor.');
};


/**
 * Universal dummy item (that contains all important properties).
 * Is further initialized and used in the getRandomDummyItem_ method.
 * @type {Object.<string, (string|Array|boolean)>}
 * @const
 */
vsaq.QuestionnaireEditor.DUMMY_ITEM = {
  id: '',
  type: '',
  cond: '',
  text: 'Sample text',
  warn: 'no',
  defaultChoice: false,
  choices: [],
  choicesConds: [],
  yes: 'Yes.',
  no: 'No.'
};


/**
 * Default choices used for the dummy.
 * @type {Array.<string>}
 * @const
 */
vsaq.QuestionnaireEditor.DUMMY_CHOICES_TEXT = [
  'choice 1',
  'choice 2'
];


/**
 * Checks if the editor is enabled and can be loaded.
 * @return {boolean} true if the editor is enabled.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.isEditorEnabled_ = function() {
  var uri = new goog.Uri(document.location.search);
  var editorParameterSet = uri.getQueryData().get(
      vsaq.QuestionnaireEditor.SETTINGS.urlParameter, '');
  return !!editorParameterSet;
};


/**
 * Init the editor once the questionnaire has been loaded.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.initEditor_ = function() {
  var promise = this.questionnaire_.done();
  promise.then(this.displayEditor_, null, this);
};


/**
 * Make all current items editable and export the displayed questionnaire.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.displayEditor_ = function() {
  this.setQuestionnaireEditability_();
  this.exportTemplate();
};


/**
 * Sets the complete questionnaire editability.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.setQuestionnaireEditability_ = function() {
  // Iterate recursively through all objects and make them editable.
  var rootBlock = this.questionnaire_.getRootBlock();
  if (!rootBlock)
    return;
  this.setEditability(rootBlock);
};


/**
 * A wrapper method to export the template once it was modified.
 * @param {Function} editorFunction A function belonging to the editor that is
 *     supposed to be called.
 * @param {Element} el The item's dom element.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.eventHandler_ = function(editorFunction,
    el) {
  this.itemClickEventMutex_ = true;
  editorFunction(el);
  this.exportTemplate();
};


/**
 * Adds an onclick handler to the document, and dispatches clicks on clickable
 * elements to the editor event handler.
 * @param {Object.<string, Function>} handlers An object mapping CSS class names
 *     to specific functions. If a click on the web page is registered, and one
 *     of the clicked element's ancestors has the CSS class specified in the
 *     attribute name assigned, the function passed as the value is called.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.initEditorClickables_ = function(handlers) {
  // Update all handlers to call.
  for (var handlerName in handlers) {
    if (!handlers.hasOwnProperty(handlerName))
      continue;
    handlers[handlerName] = goog.bind(this.eventHandler_, this,
        handlers[handlerName]);
  }
  vsaq.utils.initClickables(handlers);
};


/**
 * Highlight the background color of an element to represent success or failure.
 * @param {Element} el The dom element to highlight.
 * @param {?boolean} success true when element should indicate a success.
 * @param {?boolean=} opt_reset true when element background color should be
 *     reset.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.highlightElement_ = function(el, success,
    opt_reset) {
  if (el == null || !el.hasAttribute('style'))
    return;

  if (opt_reset) {
    el.style.backgroundColor = '';
    return;
  }

  // Highlight the element dependent on success or failure.
  if (success)
    el.style.backgroundColor = vsaq.QuestionnaireEditor.SETTINGS.successColor;
  else
    el.style.backgroundColor = vsaq.QuestionnaireEditor.SETTINGS.failureColor;
};


/**
 * Remove all objects from the current questionnaire.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.flushQuestionnaire_ = function() {
  var qItems = this.questionnaire_.getItems();
  for (var itemId in qItems) {
    if (qItems.hasOwnProperty(itemId))
      delete qItems[itemId];
  }
  var rootBlock = this.questionnaire_.getRootBlock();
  if (!rootBlock)
    return;
  goog.dom.removeNode(rootBlock.container);
};


/**
 * Try to parse the current template and previously check if the JSON and
 * template structure are valid.
 * @return {!boolean} true when template could be parsed successfully.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.tryParseTemplate_ = function() {
  var vsaqonTemplate = this.editTemplateElementDecorator_.getValue();
  var jsonTemplate = vsaq.utils.vsaqonToJson(vsaqonTemplate);
  var template = {};
  try {
    template = goog.json.parse(jsonTemplate)['questionnaire'];
  } catch (err) {
    this.highlightElement_(this.editTemplateElement_, false);
    return false;
  }
  // Reset the old template and render the new template now.
  this.flushQuestionnaire_();
  try {
    this.questionnaire_.setTemplate(template);
    this.questionnaire_.render();
  } catch (err) {
    return false;
  }
  return true;
};


/**
 * Parse and display the current template (if possible).
 * @return {!boolean} true when template could be parsed successfully.
 */
vsaq.QuestionnaireEditor.prototype.parseTemplate = function() {
  var jsonTemplateBackup = this.exportQuestionnaireJSON_();

  var templateParsed = this.tryParseTemplate_();
  if (templateParsed) {
    this.setQuestionnaireEditability_();
    this.highlightElement_(this.editTemplateElement_, true);
  } else {
    // Restore the old template if it was valid.
    if (!jsonTemplateBackup)
      return true;
    this.editTemplateElementDecorator_.setValue(jsonTemplateBackup);
    this.parseTemplate();
    this.highlightElement_(this.editTemplateElement_, false);
  }
  return templateParsed;
};


/**
 * Load and parse the template once a change was made.
 */
vsaq.QuestionnaireEditor.prototype.toggleExportBox = function() {
  if (!this.liveEditModeElement_.checked)
    return;

  // Check if this event was called by clicking outside or on the template
  // textarea field.
  if (!this.templateEditMode_) {
    // Export the currently shown questionnaire.
    this.exportTemplate();
    goog.events.removeAll(this.editTemplateElement_,
        goog.events.EventType.CLICK);
    goog.events.listen(this.editTemplateElement_, goog.events.EventType.BLUR,
        goog.bind(this.toggleExportBox, this));
    this.templateEditMode_ = true;
  } else {
    this.parseTemplate();
    // Remove the blur event handler again.
    goog.events.removeAll(this.editTemplateElement_,
        goog.events.EventType.BLUR);
    goog.events.listen(this.editTemplateElement_, goog.events.EventType.CLICK,
        goog.bind(this.toggleExportBox, this));
    this.templateEditMode_ = false;
  }
};


/**
 * Make a text element editable on click. To achieve this we convert the text
 * into a textarea.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.editItemTextEntry = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;

  // Inform other methods that a property is currently being edited.
  this.itemClickTextEditMutex_ = true;

  if (el.firstChild && el.firstChild.tagName === goog.dom.TagName.TEXTAREA)
    return;

  // Ensure that once the text was clicked focus doesn't get lost.
  // Remove the for attribute in label elements.
  if (el.hasAttribute('for'))
    el.removeAttribute('for');
  // Remove any label divs (else a checkbox/radio could be clicked instead).
  if (el.parentNode && el.parentNode.tagName === goog.dom.TagName.LABEL) {
    var labelElement = el.parentNode;
    var fragment = document.createDocumentFragment();
    while (labelElement.firstChild)
      fragment.appendChild(labelElement.firstChild);
    goog.dom.replaceNode(fragment, labelElement);
  }

  var editDOMTextarea = document.createElement('textarea');
  editDOMTextarea.value = el.innerHTML;
  if (editDOMTextarea.value == vsaq.QuestionnaireEditor.SETTINGS.noTextEntry)
    editDOMTextarea.value = '';
  goog.dom.classlist.set(editDOMTextarea, 'vsaq-box');
  new goog.ui.Textarea('').decorate(editDOMTextarea);

  goog.dom.classlist.remove(el, 'vsaq-label-text');

  goog.dom.removeChildren(el);
  el.appendChild(editDOMTextarea);
  editDOMTextarea.focus();
  goog.events.listen(editDOMTextarea, goog.events.EventType.BLUR,
      goog.bind(this.saveItemEntry_, this, el, targetItem));
};


/**
 * Update an item entry by being given a HTML select field.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.selectItemEntry = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;
  this.saveItemEntry_(el, targetItem);
};


/**
 * Remove/deactivate an item entry.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.removeItemEntry = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;

  var entryName = el.getAttribute('name');
  if (this.updateItemEntry_(targetItem, entryName, null)) {
    // Call the event handler to export the questionnaire.
    el.innerHTML = vsaq.QuestionnaireEditor.SETTINGS.noTextEntry;
    this.eventHandler_(function() {}, null);
  }
};


/**
 * Save an item entry after it has been changed.
 * @param {Element} el The item's dom element.
 * @param {?vsaq.questionnaire.items.Item} targetItem The item that
 *     contains the entry that is supposed to be changed.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.saveItemEntry_ = function(el, targetItem) {
  var editItemEntryDOM = /** @type {?Element} */
      (el.firstChild);
  if (!editItemEntryDOM)
    return;

  var isSelectDOM = (editItemEntryDOM.tagName === goog.dom.TagName.SELECT);
  var isTextareaDOM = (editItemEntryDOM.tagName === goog.dom.TagName.TEXTAREA);
  if (!isSelectDOM && !isTextareaDOM)
    return;

  if (isTextareaDOM)
    goog.dom.classlist.add(el, 'vsaq-label-text');

  var updateValue =
      /** @type {?string} */
      (goog.dom.forms.getValue(editItemEntryDOM));
  var entryName = el.getAttribute('name');
  if (updateValue === vsaq.QuestionnaireEditor.SETTINGS.noTextEntry ||
      updateValue === '')
    updateValue = null;

  if (!this.updateItemEntry_(targetItem, entryName, updateValue)) {
    this.highlightElement_(editItemEntryDOM, false);
    return;
  }
  // Call the event handler to export the questionnaire.
  this.eventHandler_(function() {}, null);

  if (isTextareaDOM)
    el.innerHTML = updateValue || vsaq.QuestionnaireEditor.SETTINGS.noTextEntry;

  // Unlock the item for other events again.
  this.itemClickTextEditMutex_ = false;
};


/**
 * Update the id of an item.
 * @param {?vsaq.questionnaire.items.Item} targetItem The item that
 *     contains the entry that is supposed to be updated.
 * @param {?string} newItemID The new item id to use.
 * @return {!boolean} true when the update succeeded.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.updateItemID_ = function(targetItem,
    newItemID) {
  var newUniqueID = newItemID || goog.string.createUniqueString();
  if (newUniqueID == targetItem.id)
    return true;
  var qItems = this.questionnaire_.getItems();
  // Unique entries like ids are not allowed to appear anywhere else.
  if (newUniqueID != targetItem.id && qItems[newUniqueID])
    return false;

  if (targetItem.container.hasAttribute('data-vsaq-container-for'))
    targetItem.container.setAttribute('data-vsaq-container-for', newUniqueID);
  else if (targetItem.container.hasAttribute('id'))
    targetItem.container.setAttribute('id', newUniqueID);
  else
    throw new goog.debug.Error(
        'Can\'t find the HTML container id of the item parent.');

  // Update the item entry in the global item object.
  qItems[newUniqueID] = qItems[targetItem.id];
  delete qItems[targetItem.id];

  // The item id is never allowed to be null.
  targetItem.id = newUniqueID;
  // Set the template to null if a null id was provided.
  targetItem.templateItemId = newItemID;

  // Keep track of recently changed items in the editor.
  this.lastClickedItemID_ = targetItem.id;

  return true;
};


/**
 * Translate the internal value representation to the template representation.
 * The values in the classes are different from the values in the template.
 * For example in tipitems warn: "yes" is internally stored as a boolean.
 * @param {Object} propertyInformation Information about the item properties.
 * @param {?string} entryValue The item entry value to translate.
 * @return {(string|boolean)} the translation result.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.getTemplateValueName_ = function(
    propertyInformation, entryValue) {
  if (!entryValue)
    return '';

  var translatedValue = entryValue;
  // If a value is set translate it with the help of default values.
  if (propertyInformation.defaultValues) {
    translatedValue = goog.object.findKey(propertyInformation.defaultValues,
        function(value) {
          if (value === entryValue)
            return true;
          else if (typeof value === 'boolean' &&
                   value.toString() === entryValue)
            return true;

          return false;
        }, this);
    if (!translatedValue)
      throw new goog.debug.Error(
          'Unknown value passed (not found in default values).');
  }

  // Translate value to boolean if necessary.
  if (translatedValue === 'true' || translatedValue === 'false')
    translatedValue = (translatedValue === 'true');

  return translatedValue;
};


/**
 * Update an item entry.
 * @param {?vsaq.questionnaire.items.Item} targetItem The item that
 *     contains the entry that is supposed to be updated.
 * @param {!string} entryName The item's entry to be updated.
 * @param {?string} newEntryValue The new item entry value.
 * @return {!boolean} true when the update succeeded.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.updateItemEntry_ = function(targetItem,
    entryName, newEntryValue) {
  if (!targetItem.hasOwnProperty(entryName))
    throw new goog.debug.Error(
        'Invalid entryName detected: \'' + entryName + '\'.');

  var propertyInformation = targetItem.getPropertyInformation('', entryName);
  if (!propertyInformation)
    throw new goog.debug.Error(
        'Property information missing for \'' + entryName + '\'.');

  // Disallow unsetting mandatory properties.
  if (!newEntryValue && propertyInformation.mandatory)
    return false;

  if (entryName === 'id' || entryName === 'templateItemId')
    return this.updateItemID_(targetItem, newEntryValue);

  var translatedValue = this.getTemplateValueName_(propertyInformation,
      newEntryValue);
  targetItem[entryName] = translatedValue;

  // Modify and render the item again to display any changes.
  if (propertyInformation.metadata) {
    // Metadata (data that is invisible within the item or has no direct effect
    // on the item) can be updated immediately without the need to re-render
    // the item.
    if (targetItem.container.hasAttribute(entryName))
      targetItem.container.setAttribute(
          entryName, goog.string.makeSafe(newEntryValue));
  } else {
    targetItem.render();
    this.setEditability(targetItem);
  }
  return true;
};


/**
 * A handler that takes care of what happens once an item was clicked.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.itemClickedHandler = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;

  // Don't do anything if another event was recently fired.
  if (this.itemClickEventMutex_) {
    this.itemClickEventMutex_ = false;
    return;
  }

  // Don't do anything if a property is currenlty being edited.
  if (this.itemClickTextEditMutex_)
    return;

  this.scrollToItemJSON_(targetItem);
};


/**
 * Activates the possibility to edit an item.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.enableItemEditability = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;

  // Make the complete item editable if it is not already editable.
  if (!this.itemEditability_) {
    var lastItemClicked = null;
    if (this.lastClickedItemID_)
      lastItemClicked = this.questionnaire_.getItem(this.lastClickedItemID_);
    this.lastClickedItemID_ = targetItem.id;
    if (lastItemClicked)
      this.setEditability(lastItemClicked, false, true);
    this.setEditability(targetItem, true, true);
    this.scrollToItemJSON_(targetItem);
  }
};


/**
 * Scroll into the correct region within the editor textarea and highlight the
 * item in question.
 * @param {?vsaq.questionnaire.items.Item} targetItem The item that
 *     was clicked.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.scrollToItemJSON_ = function(targetItem) {
  // Instead of tracking single items of groups we search for the whole group.
  if (targetItem.parentItem &&
      targetItem.parentItem instanceof vsaq.questionnaire.items.GroupItem)
    targetItem = targetItem.parentItem;

  // Get the item's JSON and convert it into a regular expression, because the
  // indention of the item differs within the template.
  var targetItemJson = this.exportQuestionnaireJSON_(targetItem);
  var splittedLines = targetItemJson.split('\n');
  var regexText = '\\s*';
  goog.array.forEach(splittedLines, function(line) {
    regexText += goog.string.regExpEscape(line) + '\\s*';
  });
  var regexPattern = new RegExp(regexText, 'g');
  var searchResults = regexPattern.exec(this.editTemplateElement_.value);
  var itemTemplatePosition = searchResults.index;
  if (itemTemplatePosition == -1)
    throw new goog.debug.Error('Can\'t find the block...');
  if (searchResults.length > 1)
    throw new goog.debug.Error('Too many blocks found...');
  var templateResult = goog.string.trim(searchResults[0]);
  var resultLength = templateResult.length;
  // Skip any white-space characters in the beginning.
  itemTemplatePosition +=
      searchResults[0].replace(/^(\s*)[\s\S]*/, '$1').length;
  var backup = this.editTemplateElement_.value;
  var prefix = this.editTemplateElement_.value.substring(0,
      itemTemplatePosition);
  this.editTemplateElement_.blur();
  this.editTemplateElementDecorator_.setValue(prefix);
  // Setting a focus automatically scrolls to the end of the textarea.
  this.editTemplateElement_.focus();
  this.editTemplateElementDecorator_.setValue(backup);
  this.editTemplateElement_.scrollTop += parseInt(
      this.editTemplateElement_.style.height, 10);
  // Subtract a small offset to correct the display.
  this.editTemplateElement_.scrollTop -=
      vsaq.QuestionnaireEditor.SETTINGS.jsonScrollTopOffset;
  this.editTemplateElement_.setSelectionRange(itemTemplatePosition,
      itemTemplatePosition + resultLength);
};


/**
 * Export the currently shown questionnaire to the new VSAQON format.
 * @param {?vsaq.questionnaire.items.Item=} opt_item An item that
 *     should be exported to JSON instead of the root item.
 * @return {!string} A string containing the JSON of the current questionnaire.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.exportQuestionnaireJSON_ =
    function(opt_item) {
  var currentTemplateTree;
  if (opt_item) {
    currentTemplateTree = opt_item.exportItem();
  } else {
    var rootBlock = this.questionnaire_.getRootBlock();
    if (!rootBlock)
      return '';
    currentTemplateTree = rootBlock.exportItem();
    currentTemplateTree = {'questionnaire': [currentTemplateTree]};
  }

  var orderedJsonSerializer = new vsaq.QuestionnaireEditor.Serializer();
  var jsonContent = orderedJsonSerializer.serialize(currentTemplateTree);
  var printer = new goog.format.JsonPrettyPrinter(
      new goog.format.JsonPrettyPrinter.TextDelimiters());
  jsonContent = printer.format(jsonContent);

  // Replace all "{\nSINGLE_LINE\n}" constructs with "{SINGLE_LINE}".
  // (1) Match a line with a single open curly bracket.
  // (2) Require exactly one line before the next closed bracket.
  // (3) Match a curly bracket with a possible consecutive comma.
  var curlyBracketsCompressionPattern = '' +
      '(^\\s*)\\{\\s*' +
      '^\\s+(.*)\\s' +
      '^\\s*(\\},?)';
  var re = new RegExp(curlyBracketsCompressionPattern, 'gm');
  jsonContent = jsonContent.replace(re, '$1{$2$3');

  return jsonContent;
};


/**
 * Export the currently shown questionnaire to the new VSAQON format.
 */
vsaq.QuestionnaireEditor.prototype.exportTemplate = function() {
  var exportedJSON = this.exportQuestionnaireJSON_();
  this.editTemplateElementDecorator_.setValue(exportedJSON);
};


/**
 * Unrolls or rolls the questionnaire.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.setRollMode = function(el) {
  if (el == null)
    return;

  this.questionnaire_.setUnrolledMode(el.checked);
  this.parseTemplate();
};


/**
 * Enables or disables all editor elements in the questionnaire.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.toggleEditor = function(el) {
  if (el == null)
    return;

  // Disable the light editor checkbox if the editor is disabled.
  this.lightEditModeElement_.disabled = !el.checked;
  // Disable item editability if the editor is disabled. Else set editability
  // according to the light editor checkbox.
  if (!el.checked) {
    this.itemEditability_ = false;
    this.lastClickedItemID_ = null;
  }
  else {
    this.itemEditability_ = !this.lightEditModeElement_.checked;
  }

  this.editorActive_ = el.checked;
  this.parseTemplate();
};


/**
 * Enables or disables general item editability.
 * @param {Element} el The item's dom element.
 */
vsaq.QuestionnaireEditor.prototype.setGlobalItemEditability = function(el) {
  if (el == null)
    return;

  this.itemEditability_ = !el.checked;
  this.parseTemplate();
};


/**
 * Returns the corresponding item id given only its dom element.
 * @param {Element} el The item's dom element.
 * @return {?string} The item's id.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.getDomElementItemId_ = function(el) {
  if (el == null)
    return null;
  var itemId = null;
  if (el.hasAttribute('data-vsaq-container-for'))
    itemId = el.getAttribute('data-vsaq-container-for');
  else if (el.hasAttribute('id'))
    itemId = el.getAttribute('id');
  return itemId;
};


/**
 * Returns the next valid dom parent's id or null. This is used to connect a
 * clickable element to its corresponding item without having to store the id
 * explicitly.
 * @param {?Element} el The element clicked.
 * @return {?string}
 * @private
 */
vsaq.QuestionnaireEditor.prototype.getNextParentItemId_ = function(el) {
  var targetDomItem = el;
  if (targetDomItem == null)
    return null;
  var targetItemId = this.getDomElementItemId_(targetDomItem);
  // Iterate up the dom tree until the first parent with a set id is found.
  while (targetDomItem.parentNode != null && targetItemId == null) {
    targetDomItem =
        /** @type {Element} */
        (targetDomItem.parentNode);
    targetItemId = this.getDomElementItemId_(targetDomItem);
  }
  return targetItemId;
};


/**
 * Returns the next valid dom parent's corresponding item.
 * @param {?Element} el The element clicked.
 * @return {?vsaq.questionnaire.items.Item} The requested item.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.getNextParentItem_ = function(el) {
  var targetItemId = this.getNextParentItemId_(el);
  if (targetItemId == null)
    return null;
  return this.questionnaire_.getItem(targetItemId);
};


/**
 * Move the current item within the dom hierachy.
 * @param {Element} el The element clicked.
 * @param {boolean} moveDown true if the element is supposed to be moved down,
 *     else it will be moved up.
 * @private
 */
vsaq.QuestionnaireEditor.prototype.moveItem_ = function(el, moveDown) {
  var targetItem =
      /** @type {vsaq.questionnaire.items.Item} */
      (this.getNextParentItem_(el));
  if (targetItem == null)
    return;

  var targetParentItem = targetItem.parentItem;
  if (!(targetParentItem instanceof vsaq.questionnaire.items.ContainerItem))
    throw new goog.debug.Error(
        'Can\'t move items within non-container parents.');
  var nextItem = targetParentItem.getSiblingItem(targetItem, moveDown);
  // Return if there is no valid next upper/lower sibling item.
  if (nextItem == null)
    return;
  // Delete the targetItem from the internal parent's storage and append/prepend
  // it after its next/previous sibling item (hereby we are doing a swap).
  targetParentItem.deleteItem(targetItem);
  if (moveDown) {
    targetParentItem.insertAfter(targetItem, nextItem);
  } else {
    targetParentItem.insertBefore(targetItem, nextItem);
  }
};


/**
 * Move the current item downward in the dom hierachy.
 * @param {Element} el The element clicked.
 */
vsaq.QuestionnaireEditor.prototype.moveItemDown = function(el) {
  this.moveItem_(el, true);
};


/**
 * Move the current item upward in the dom hierachy.
 * @param {Element} el The element clicked.
 */
vsaq.QuestionnaireEditor.prototype.moveItemUp = function(el) {
  this.moveItem_(el, false);
};


/**
 * Create and return a JSON dummy item that can be parsed to an item.
 * @param {string} itemType The item type to create a dummy for.
 * @return {Object.<string, string>}
 * @private
 */
vsaq.QuestionnaireEditor.prototype.getRandomDummyItem_ = function(itemType) {
  var newDummyItem = goog.object.clone(vsaq.QuestionnaireEditor.DUMMY_ITEM);
  newDummyItem.id = goog.string.createUniqueString();
  newDummyItem.type = itemType;
  newDummyItem.choices = [];
  goog.array.forEach(vsaq.QuestionnaireEditor.DUMMY_CHOICES_TEXT,
      function(choiceText) {
        var newChoice = {};
        newChoice[goog.string.createUniqueString()] = choiceText;
        newDummyItem.choices.push(newChoice);
      });
  return newDummyItem;
};


/**
 * Add an item to the questionnaire.
 * @param {Element} el The element clicked.
 */
vsaq.QuestionnaireEditor.prototype.addItem = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;

  // Get the type of the item to create from the nearby HTML select option list.
  var selectNewItemTypeFields = goog.dom.getElementsByTagNameAndClass(
      'select', null, targetItem.editItemSuffix);
  if (selectNewItemTypeFields.length == 0)
    throw new goog.debug.Error('Couldn\'t find the item type to add.');
  var selectNewItemTypeField = selectNewItemTypeFields[0];

  var dummyItemType =
      /** @type {!string} */
      (goog.dom.forms.getValue(selectNewItemTypeField));
  // Create a new randomized dummy with the requested item type.
  var dummyItem = this.getRandomDummyItem_(dummyItemType);
  var dummyStack =
      /** @type {!Array.<qjson.QuestionnaireItem>} */
      ([dummyItem]);
  // Use the parse function to return a valid item now.
  var newItem =
      /** @type {!vsaq.questionnaire.items.Item} */
      (vsaq.questionnaire.items.Item.parse(dummyStack));

  // Remove the template item ID in case the ID is optional.
  if (!(newItem instanceof vsaq.questionnaire.items.ValueItem))
    newItem.templateItemId = null;

  this.setEditability(newItem);

  var qItems = this.questionnaire_.getItems();
  if (newItem instanceof vsaq.questionnaire.items.ContainerItem) {
    // Add all new contained items to the list of known items.
    var containerItems = newItem.getContainerItems();
    goog.array.forEach(containerItems, function(item) {
      qItems[item.id] = item;
    });
  }
  // Add the item to the global item object.
  qItems[newItem.id] = newItem;

  // Add the item into the correct internal structure and dom tree.
  if (targetItem instanceof vsaq.questionnaire.items.ContainerItem) {
    targetItem.addItem(newItem);
    this.setEditability(targetItem);
  } else {
    // Append the item to the parent dom node.
    var targetParentItem = targetItem.parentItem;
    targetParentItem.insertAfter(newItem, targetItem);
  }
};


/**
 * Given a clicked button we copy the corresponding item and append the copy
 * directly after the initial button.
 * @param {?Element} el The element clicked.
 */
vsaq.QuestionnaireEditor.prototype.copyItem = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;

  var targetItemCopy =
      /** @type {!vsaq.questionnaire.items.Item} */
      (goog.object.clone(targetItem));
  // The new item must have a unique id and an independent container dom.
  targetItemCopy.id = goog.string.createUniqueString();
  targetItemCopy.templateItemId =
      targetItem.templateItemId ? targetItemCopy.id : null;
  // Remove all DOM dependencies to the target item.
  targetItemCopy.container = targetItem.container.cloneNode(true);
  targetItemCopy.editItemPrefix = null;
  targetItemCopy.editItemSuffix = null;
  targetItemCopy.render();
  this.setEditability(targetItemCopy);
  // Append the copy to the parent dom node.
  var targetParentItem = targetItem.parentItem;
  targetParentItem.insertAfter(targetItemCopy, targetItem);
  // Add the item to the global item object.
  var qItems = this.questionnaire_.getItems();
  qItems[targetItemCopy.id] = targetItemCopy;
};


/**
 * Remove an item from the questionnaire.
 * @param {Element} el The element clicked.
 */
vsaq.QuestionnaireEditor.prototype.removeItem = function(el) {
  var targetItem = this.getNextParentItem_(el);
  if (targetItem == null)
    return;

  // Disallow removing the root block.
  if (!targetItem.parentItem)
    return;

  // Get the parent and remove the item there.
  var parentItem = targetItem.parentItem;
  parentItem.deleteItem(targetItem);

  // Remove the item from the global item object.
  var qItems = this.questionnaire_.getItems();
  var targetItemId = this.getNextParentItemId_(el);
  if (targetItemId == null)
    return;
  delete qItems[targetItemId];
};


/**
 * Creates an edit prefix for items.
 * @param {?vsaq.questionnaire.items.Item} targetItem The item for
 *     which we want to add the edit prefix.
 */
vsaq.QuestionnaireEditor.prototype.addItemEditabilityPrefix = function(
    targetItem) {
  var knownProperties = targetItem.getPropertiesInformation();
  var knownPropertiesKeys = knownProperties.getKeys();
  var knownPropertiesValues = knownProperties.getValues();

  // Remove all properties that are mandatory and can already be modified within
  // the rendered item.
  for (var key in knownPropertiesKeys) {
    if (!knownPropertiesKeys.hasOwnProperty(key))
      continue;
    if (knownPropertiesValues[key].mandatory &&
        !knownPropertiesValues[key].metadata &&
        !knownPropertiesValues[key].defaultValues) {
      delete knownPropertiesKeys[key];
      delete knownPropertiesValues[key];
    }
  }
  targetItem.editItemPrefix = (goog.soy.renderAsElement(
      vsaq.questionnaire.templates.editablePrefix, {
        knownPropertiesKeys: knownPropertiesKeys,
        knownPropertiesValues: knownPropertiesValues
      }));
  if (!targetItem.container.firstChild)
    throw new goog.debug.Error('The item must be in a valid container.');
  var firstChild = targetItem.container.firstChild;
  targetItem.container.insertBefore(targetItem.editItemPrefix, firstChild);
};


/**
 * Creates an edit suffix for items.
 * @param {?vsaq.questionnaire.items.Item} targetItem The item for
 *     which we want to add the edit suffix.
 */
vsaq.QuestionnaireEditor.prototype.addItemEditabilitySuffix = function(
    targetItem) {
  var possibleTypes = [];
  var groupItemType = null;
  // Check if this item is a group or belongs to a group. Find out what type
  // single elements within the group have.
  if (targetItem instanceof vsaq.questionnaire.items.GroupItem)
    groupItemType = targetItem.groupItemType;
  if (targetItem.parentItem instanceof vsaq.questionnaire.items.GroupItem)
    groupItemType = targetItem.type;

  if (groupItemType) {
    // Restrict the possible items for adding to this group to one type.
    possibleTypes.push(groupItemType);
  } else {
    // We assume that for all known items there exist valid parsers, too.
    for (var itemType in vsaq.questionnaire.items.factory.parsers) {
      if (!vsaq.questionnaire.items.factory.parsers.hasOwnProperty(itemType))
        continue;
      if (itemType == '-block')
        continue;
      possibleTypes.push(itemType);
    }
  }
  targetItem.editItemSuffix = (goog.soy.renderAsElement(
      vsaq.questionnaire.templates.editableSuffix, {
        types: possibleTypes,
        defaultType: targetItem.type
      }));
  targetItem.container.appendChild(targetItem.editItemSuffix);
};


/**
 * Sets whether an item is editable. If the item has not been rendered yet this
 * function does nothing.
 * @param {?(vsaq.questionnaire.items.Item|Object)} targetItem The item to make
 *     editable.
 * @param {boolean=} opt_editable true if the item should be editable.
 * @param {boolean=} opt_excludeChildren true if the children should not be
 *     modified.
 */
vsaq.QuestionnaireEditor.prototype.setEditability = function(targetItem,
    opt_editable, opt_excludeChildren) {
  if (!(targetItem instanceof vsaq.questionnaire.items.Item))
    return;

  targetItem = /** @type {!vsaq.questionnaire.items.Item} */ (targetItem);

  var editable = opt_editable;
  if (!editable)
    editable = this.itemEditability_;
  // If the general editor mode is off but the item was recently clicked we make
  // it editable again.
  if (!editable && this.lastClickedItemID_ == targetItem.id) {
    editable = true;
    opt_excludeChildren = true;
  }

  // Remove any old edit prefixes or suffixes (to avoid duplicates).
  if (targetItem.editItemPrefix)
    goog.dom.removeNode(targetItem.editItemPrefix);
  if (targetItem.editItemSuffix)
    goog.dom.removeNode(targetItem.editItemSuffix);
  // If the item has any kind of children forward the call to them, too.
  if (!opt_excludeChildren &&
      targetItem instanceof vsaq.questionnaire.items.ContainerItem) {
    var containerItems = targetItem.getContainerItems();
    goog.array.forEach(containerItems, function(item) {
      this.setEditability(item, editable);
    }, this);
  }
  targetItem.container.style.border = '';
  if (!editable) {
    if (!this.editorActive_)
      return;

    // Since the item is not editable in general we append an icon which makes
    // it editable on click.
    targetItem.editItemSuffix = (goog.soy.renderAsElement(
        vsaq.questionnaire.templates.editableTrigger,
        {
          itemType: targetItem.type
        }));
    targetItem.container.appendChild(targetItem.editItemSuffix);
    return;
  }
  this.addItemEditabilityPrefix(targetItem);
  this.addItemEditabilitySuffix(targetItem);
  targetItem.container.style.border =
      vsaq.QuestionnaireEditor.SETTINGS.itemEditBorder;
};



/**
 * Own serializer to maintain order within the output of serialized objects.
 * @param {?goog.json.Replacer=} opt_replacer Replacer.
 * @extends {goog.json.Serializer}
 * @constructor
 */
vsaq.QuestionnaireEditor.Serializer = function(opt_replacer) {
  /**
   * @type {goog.json.Replacer|null|undefined}
   * @private
   */
  this.replacerFunction_ = opt_replacer;
  goog.base(this, opt_replacer);
};
goog.inherits(vsaq.QuestionnaireEditor.Serializer,
    goog.json.Serializer);


/**
 * Serializes a generic value to a JSON string
 * @param {*} object The object to serialize.
 * @param {Array<string>} sb Array used as a string builder.
 * @override
 */
vsaq.QuestionnaireEditor.Serializer.prototype.serializeInternal = function(
    object, sb) {
  if (object instanceof goog.structs.LinkedMap) {
    this.serializeLinkedMap_(object, sb);
    return;
  }
  return goog.json.Serializer.prototype.serializeInternal.call(this, object,
      sb);
};


/**
 * Serializes a LinkedMap and keeps the LinkedMap's order in the output.
 * @param {goog.structs.LinkedMap} map The object to serialize.
 * @param {Array<string>} sb Array used as a string builder.
 * @private
 */
vsaq.QuestionnaireEditor.Serializer.prototype.serializeLinkedMap_ = function(
    map, sb) {
  sb.push('{');
  var sep = '';
  map.forEach(function(value, key) {
    sb.push(sep);
    goog.json.Serializer.prototype.serializeInternal.call(this, key, sb);
    sb.push(':');
    var replacerResult = value;
    if (this.replacerFunction_)
      replacerResult = this.replacerFunction_.call(this, key, value);
    this.serializeInternal(replacerResult, sb);
    sep = ',';
  }, this);
  sb.push('}');
};
