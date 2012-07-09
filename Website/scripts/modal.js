﻿/******************************************************************************
* jQuery Modal Plugin
* Author: John Stegall
* Copyright: 2008-2014 John Stegall
* License: MIT
*
* Displays the contents of an element in a modal dialog.
******************************************************************************/
;(function($, window, document, undefined)
{
  "use strict";

  /****************************************************************************
  * The Modal singleton object with static methods.
  ****************************************************************************/
  var Modal =
  {
    Backdrop: null,
    Dialog: null,

    /**************************************************************************
    * Builds the modal backdrop.
    **************************************************************************/
    buildBackdrop: function()
    {
      if (Modal.Backdrop)
        return;

      Modal.Backdrop = $("<div id=\"divBackdrop\" />");
      $("body").append(Modal.Backdrop);
    },

    /****************************************************************************
    * Builds the elements to make a modal dialog.
    ****************************************************************************/
    buildDialog: function()
    {
      if (Modal.Dialog)
        return;

      Modal.Dialog = $("<div />")
        .attr("id", "divModal")
        .attr("role", "dialog")
        .attr("aria-hidden", "true");

      var closeButton = $("<button />")
        .attr("type", "button")
        .text("×")
        .click($.Modal.hideDialog);

      var dialogHeader = $("<header />")
        .append(closeButton)
        .append("<h4 />");

      Modal.Dialog
        .append(dialogHeader)
        .append("<section />");

      $("body").append(Modal.Dialog);
    }
  };

  /****************************************************************************
  * The Modal plugin.
  ****************************************************************************/
  $.fn.Modal = function()
  {
    // This proves bondage is a good thing
    return this;
  };

  /****************************************************************************
  * Public method namespace.
  ****************************************************************************/
  $.Modal =
  {
    /****************************************************************************
    * Hides the modal dialog.
    ****************************************************************************/
    hideDialog: function()
    {
      Modal.Dialog.removeClass("Visible");
      Modal.Dialog.children("section").empty();

      // Wait for the transitions to finish before removing all classes
      window.setTimeout(function()
      {
        Modal.Dialog.removeClass();
      }, parseFloat(Modal.Dialog.css("transition-duration")) * 1000);
    },

    /**************************************************************************
    * Shows the modal dialog.
    *
    * @param element {jQuery} The element that contains the modal content.
    * @param title {string} The title of the modal dialog.
    * @param options {object} Settings to apply to the adaptable.
    * @param callback {function} A function to call after the modal is
    * displayed.
    **************************************************************************/
    showDialog: function(element, title, options, callback)
    {
      if (!element)
        throw "The content element is required.";
      else if (!title || typeof (title) !== "string")
        throw "Modal dialog title is required.";

      options = $.extend({ CloseButton: true, Effect: "Slide From Top" }, options);

      Modal.buildDialog();
      Modal.buildBackdrop();

      Modal.Dialog.addClass(options.Effect.replace(/ /g, ""));
      Modal.Dialog.find("header > h4").text(title);
      Modal.Dialog.children("section").append(element.html());
      Modal.Dialog.find("header > button").css("display", (options.CloseButton ? "inline-block" : "none"));

      // Wait for the setup transitions to finish
      window.setTimeout(function()
      {
        Modal.Dialog.addClass("Visible");

        if (callback)
        {
          if (typeof (callback) === "string")
            eval(callback + "()");
          else
            callback();
        }
      }, 325);
    }
  };
})(jQuery, window, document);

// Allow declarative activation
$(document).on("click.widgets.modal", "[data-modal]", function()
{
  var self = $(this);
  var options = self.data("options");

  if (typeof (options) === "string")
    options = JSON.parse(options.replace(/'/g, "\""));

  $.Modal.showDialog($(self.data("modal")), self.data("title"), options, self.data("callback"));
});