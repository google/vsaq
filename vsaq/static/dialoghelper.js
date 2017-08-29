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
 * @fileoverview A helper to handle dialogs. The reason goog.ui.dialog is not
 * used is that it makes it fairly hard to apply custom styling.
 */

goog.provide('vsaq.helpers.Dialog');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.soy');



/**
 * Constructor for dialogs.
 * @param {!Element} place Element where the dialog can be inserted into the
 *    DOM.
 * @param {Function} template A soy template for the dialog.
 * @param {Object=} opt_parameters Parameters passed to the soy template.
 * @param {Function=} opt_clickCallback Function called when anything in the
 *    dialog is clicked.
 * @constructor
 */
vsaq.helpers.Dialog = function(place, template, opt_parameters,
    opt_clickCallback) {
  this.element_ = goog.soy.renderAsElement(template, opt_parameters);
  this.backdrop_ =
      goog.dom.createDom(goog.dom.TagName.DIV, 'vsaq-overlay-backdrop');
  goog.dom.appendChild(place, this.element_);
  goog.dom.appendChild(place, this.backdrop_);
  if (opt_clickCallback)
    goog.events.listen(this.element_, [goog.events.EventType.CLICK],
        opt_clickCallback);
};


/**
 * Shows or hides the dialog.
 * @param {boolean} isVisible Whether the dialog should be made visible or
 *    invisible.
 */
vsaq.helpers.Dialog.prototype.setVisible = function(isVisible) {
  this.element_.style.display = isVisible ? 'block' : 'none';
  this.backdrop_.style.display = isVisible ? 'block' : 'none';
  this.element_.style.marginTop = -this.element_.clientHeight / 2 + 'px';
  this.element_.style.marginLeft = -this.element_.clientHeight / 2 + 'px';
};


/**
 * Disposes the dialog.
 */
vsaq.helpers.Dialog.prototype.dispose = function() {
  this.setVisible(false);
  goog.dom.removeNode(this.element_);
  goog.dom.removeNode(this.backdrop_);
};
