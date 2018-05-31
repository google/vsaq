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
 * @fileoverview Utility functions for vsaq.
 */

goog.provide('vsaq.utils');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.dom.forms');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.string.format');


/**
 * Adds a listener for clicks to the given element (if it exists).
 * @param {string} elementId The id of the element that can be clicked.
 * @param {!Function} callback The function that shall be called when the
 *    element is clicked.
 * @return {boolean} Whether the element was found.
 */
vsaq.utils.addClickHandler = function(elementId, callback) {
  var element = goog.dom.getElement(elementId);
  if (element) {
    goog.events.listen(element, [goog.events.EventType.CLICK], callback);
    return true;
  }
  return false;
};


/**
 * Adds an onclick handler to the document, and dispatches clicks on clickable
 * elements (marked by having the a CSS class assigned) to the correct handler.
 * The called function is passed the clicked element, as well as the original
 * event.
 * @param {Object.<string, Function>} handlers An object mapping CSS class names
 *     to specific functions. If a click on the web page is registered, and one
 *     of the clicked element's ancestors has the CSS class specified in the
 *     attribute name assigned, the function passed as the value is called.
 */
vsaq.utils.initClickables = function(handlers) {
  goog.events.listen(goog.dom.getDocument(), [goog.events.EventType.CLICK],
      function(e) {
        goog.object.forEach(handlers, function(handler, className) {
          var clickable = goog.dom.getAncestorByClass(e.target, className);
          if (clickable &&
              !goog.dom.classlist.contains(clickable, 'maia-button-disabled')) {
            handler(clickable, e);
          }
        });
      });
};


/**
 * Creates a request content out of a format string by URI encoding parameters.
 * @param {string} format Template string containing % specifiers.
 * @param {...(string|number)} var_args Values format is to be filled with.
 * @return {string} Formatted string with URI encoded parameters.
 */
vsaq.utils.createContent = function(format, var_args) {
  var params = goog.array.slice(arguments, 1);
  var encodedParams = goog.array.map(params, encodeURIComponent);
  goog.array.insertAt(encodedParams, format, 0);

  return goog.string.format.apply(null, encodedParams);
};


/**
 * Get the value of an element, or null if the element does not exist or
 * does not have a value.
 * @param {string} el Name of element.
 * @return {(string|undefined)} Value of the element.
 */
vsaq.utils.getValue = function(el) {
  var elt = goog.dom.getElement(el);
  if (!elt)
    return undefined;
  var value = goog.object.get(elt, 'value');
  if (!value)
    return undefined;
  return value;
};


/**
 * Ads a change handler to the vendor project selector in the main menu.
 */
vsaq.utils.initProjectSelector = function() {
  var select = goog.dom.getElement('vsaq_vendor_project_selector');
  if (select) {
    goog.events.listen(select, [goog.events.EventType.CHANGE], function(e) {
      var projectUrl = goog.dom.forms.getValue(e.target);
      if (projectUrl) {
        var currentSubPage = window.location.pathname.match('^/.*/');
        document.location = currentSubPage + projectUrl;
      }
    });
  }
};


/**
 * Takes an argument an removes all VSAQON string concatenations, comments and
 * some more escaped values.
 * @param {string} vsaqon A string in VSAQON that contains non-JSON conform
 *     elements.
 * @return {string} A JSON conform string.
 */
vsaq.utils.vsaqonToJson = function(vsaqon) {
  // Get rid of javascript-style string concatenations
  var text = vsaqon.replace(/" \+[ ]*\r?\n[ ]*"/g, '');
  // Replace all \x escaped values with \u00-style strings
  text = text.replace(/\\x/g, '\\u00');
  // Remove //-styled comments
  text = text.replace(/\n[ ]*\/\/[^\r\n]*/g, '');
  return text;
};
