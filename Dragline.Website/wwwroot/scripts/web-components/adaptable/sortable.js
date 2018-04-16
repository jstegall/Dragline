;(function()
{
  "use strict";

  if (!window.AdapTable)
    throw new Error("AdapTable core hasn't loaded.");
  else if (!jQuery.ui.sortable)
    throw new Error("jQuery UI isn't detected; grouping and column positioning require jQuery UI.");

  /****************************************************************************
  * Initialization.
  *
  * @param instance {object} An AdapTable instance.
  ****************************************************************************/
  AdapTable.Sortable = function(instance)
  {
    this.Instance = instance;
    this.Instance.Element.on("mousedown.widgets.adaptable", "th.AdapTable-Movable", $.proxy(this.buildSortable, this));
  }

  AdapTable.Sortable.prototype =
  {
    /**************************************************************************
    * Listens for the left mouse click and triggers the building of a jQuery
    * UI Sortable.
    *
    * @param e {event} The event.
    **************************************************************************/
    buildSortable: function(e)
    {
      if (e.which !== 1 || e.target.tagName.toUpperCase() === "A")
        return;

      e.stopPropagation();
      buildSortableList.call(this);

      this.DraggableList
        .sortable(
        {
          containment: this.Container,
          cursorAt: { left: 5, top: 5 },
          distance: 0,
          items: ".AdapTable-Sortable",
          stop: $.proxy(handleColumnDrop, this),
          tolerance: "pointer"
        })
        .disableSelection();

      if (this.Instance.getAttribute("groupable"))
        this.DraggableList.sortable("option", "connectWith", "div.Add-Group, div.Groups > ol");
      else
        this.DraggableList.sortable("option", "axis", "x");

      var self = this;

      this.StartIndex = $(e.target)
        .closest("th")
        .index() + 1;

      copyDragEvent.call(this, e);

      var placeholder = this.DraggableList.find(".ui-sortable-placeholder");
      if (placeholder.height() > 0)
      {
        placeholder.css("height", this.Instance.Element.height());
        placeholder.append("<div style=\"height: 100%;\" />");
      }
    },

    /**************************************************************************
    * Toggles a user's ability to select text with the mouse.
    **************************************************************************/
    toggleTextSelection: function()
    {
      var body = $(document.body);

      if (!body.attr("unselectable"))
      {
        body
          .removeAttr("unselectable")
          .removeClass("Disable-Text-Selection")
          .off("selectstart");
      }
      else
      {
        body
          .attr("unselectable", "on")
          .addClass("Disable-Text-Selection")
          .on("selectstart.widgets.adaptable", false);

        window.getSelection().removeAllRanges();
      }
    }
  };

  /**************************************************************************
  * Builds each column of the table within an LI element and copies the
  * attributes of each cell over so the mock table looks like the real
  * table.
  *
  * @this An instance of AdapTable.Sortable.
  * @param tableAttributes {object} The object (or associative array) that
  * has all of the attributes of the TABLE element.
  **************************************************************************/
  function buildMockTable(tableAttributes)
  {
    var self = this;
    this.Instance.Element.find("thead > tr > th").each(function(columnIndex, header)
    {
      var listItem = $("<li />");
      self.DraggableList.append(listItem);

      header = $(header);
      if (header.is(":visible"))
      {
        if (!self.Instance.Options.MovableColumns && header.text().trim().length > 0)
          listItem.addClass("AdapTable-Sortable");
        else if (self.Instance.Options.MovableColumns && header.is(self.Instance.Options.MovableColumns))
          listItem.addClass("AdapTable-Sortable");
      }
      else
        listItem.css("display", "none");

      var mockTable = $("<table />");
      listItem.append(mockTable);

      for (var attribute in tableAttributes.Attributes)
        mockTable.attr(attribute, tableAttributes.Attributes[attribute]);

      var thead = $("<thead />");
      mockTable.append(thead);

      var tbody = $("<tbody />");
      mockTable.append(tbody);

      // Cells with column spans > 1 get ignored, which includes group and
      // aggregate columns, which messes up the UI. To get around this, the
      // first column is used for building the structure
      self.Instance.Element
        .children(self.Instance.Options.ExcludeFooter ? ":not(tfoot)" : "")
        .children("tr:visible")
        .children(":first-child")
        .each(function(rowIndex, tableCell)
        {
          // Get a reference to the actual cell the contains the data
          var dataCell = $(tableCell).parent().children(":nth-child(" + (columnIndex + 1) + ")");
          var tableRow = $("<tr />");

          for (var attribute in tableAttributes.RowAttributes[rowIndex])
            tableRow.attr(attribute, tableAttributes.RowAttributes[rowIndex][attribute]);

          if (tableCell.tagName.toLowerCase() === "th")
            thead.append(tableRow);
          else
            tbody.append(tableRow);

          if (!dataCell.length)
            tableRow.append("<td>&nbsp;</td>");
          else if (dataCell.text().trim().length < 1)
            tableRow.append(dataCell.clone().html("&nbsp;"));
          else
            tableRow.append(dataCell.clone());
        });
    });
  }

  /**************************************************************************
  * Builds the UL element that becomes a jQuery UI sortable.
  *
  * @this An instance of AdapTable.Sortable.
  **************************************************************************/
  function buildSortableList()
  {
    var tableAttributes = getRelevantTableAttributes(this.Instance.Element, this.Instance.Options.ExcludeFooter);
    tableAttributes.Width += 2;

    this.DraggableList = $("<ol />")
      .attr("id", "olAdapTable")
      .attr("unselectable", "on")
      .css("position", "absolute")
      .css("width", tableAttributes.Width + "px");

    buildMockTable.call(this, tableAttributes);

    this.DraggableList
      .insertBefore(this.Instance.Element)
      .find("li > table")
      .each(function(tableIndex)
      {
        $(this).css("width", tableAttributes.HeaderWidths[tableIndex] + "px");
      });
  }

  /**************************************************************************
  * Copies the original left-click event the user made against the table to
  * the sortable UL element.
  *
  * @param e {event} The event.
  **************************************************************************/
  function copyDragEvent(e)
  {
    this.DraggedRow = this.DraggableList.children(":nth-child(" + this.StartIndex + ")");
    this.toggleTextSelection();

    // Clone the initial event and trigger the sortable with it
    this.DraggedRow.trigger($.extend($.Event(e.type),
    {
      which: 1,
      clientX: e.clientX,
      clientY: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      screenX: e.screenX,
      screenY: e.screenY
    }));
  }

  /**************************************************************************
  * Gets all relevant information from the table needed to make a copy to
  * display to the user as a sortable.
  *
  * @param element {jQuery} The TABLE element.
  * @param excludeFooter {boolean} Set to true to exclude the footer.
  * @returns An object containing all relevant attributes needed to
  * replicate the TABLE.
  **************************************************************************/
  function getRelevantTableAttributes(element, excludeFooter)
  {
    var table = {};
    table.Attributes = {};
    table.RowAttributes = [];
    table.Width = 0;

    $.map(element[0].attributes, function(attribute)
    {
      if (attribute.specified && attribute.name !== "id")
        table.Attributes[attribute.name] = attribute.value;
    });

    table.HeaderWidths = $.map(element.find("thead > tr > th"), function(header)
    {
      header = $(header);
      table.Width += header.outerWidth();
      return header.outerWidth();
    });

    element
      .children(excludeFooter ? ":not(tfoot)" : "")
      .children("tr:visible")
      .each(function(rowIndex)
      {
        table.RowAttributes[rowIndex] = {};

        $.map(this.attributes, function(attribute)
        {
          if (attribute.specified && attribute.name !== "id")
            table.RowAttributes[rowIndex][attribute.name] = attribute.value;
        });
      });

    return table;
  }

  /**************************************************************************
  * Handles the dropping of a sortable column.
  *
  * @this An instance of AdapTable.Sortable.
  * @param e {event} The event.
  * @param ui {jQuery} See the jQuery UI Sortable documentation.
  **************************************************************************/
  function handleColumnDrop(e, ui)
  {
    this.Instance.Sortable.DraggableList
      .addClass("AdapTable-Disabled")
      .sortable("disable");

    if (ui.item.parent()[0] === this.DraggableList[0])
    {
      this.EndIndex = this.DraggedRow.index() + 1;
      this.Instance.Positioning.rearrangeColumns();
    }
    else
    {
      this.EndIndex = this.DraggedRow.index();
      var column = Lazy(this.Instance.Element.data("Layout").Columns).findWhere({ Header: ui.item.find("th").text() });

      if (column.IsGroupable)
        this.Instance.Grouping.addGroup(column.Name, this.EndIndex);
      else
        ui.item.remove();
    }

    this.DraggableList.remove();
    this.DraggableList = null;
    this.DraggedRow = null;
    this.toggleTextSelection();
  }
})();

/*
 * HTML5 Sortable library
 * https://github.com/lukasoppermann/html5sortable
 *
 * Original code copyright 2012 Ali Farhadi.
 * This version is mantained by Lukas Oppermann <lukas@vea.re>
 * Previously also mantained by Alexandru Badiu <andu@ctrlz.ro>
 * jQuery-independent implementation by Nazar Mokrynskyi <nazar@mokrynskyi.com>
 *
 * Released under the MIT license.
 */
'use strict'
/*
 * variables global to the plugin
 */
var dragging
var draggingHeight
var placeholders = []
var sortables = []
/**
 * Get or set data on element
 * @param {Element} element
 * @param {string} key
 * @param {*} value
 * @return {*}
 */
var _data = function(element, key, value)
{
  if (value === undefined)
  {
    return element && element.h5s && element.h5s.data && element.h5s.data[key]
  } else
  {
    element.h5s = element.h5s || {}
    element.h5s.data = element.h5s.data || {}
    element.h5s.data[key] = value
  }
}
/**
 * Remove data from element
 * @param {Element} element
 */
var _removeData = function(element)
{
  if (element.h5s)
  {
    delete element.h5s.data
  }
}
/**
 * Tests if an element matches a given selector. Comparable to jQuery's $(el).is('.my-class')
 * @param {el} DOM element
 * @param {selector} selector test against the element
 * @returns {boolean}
 */
/* istanbul ignore next */
var _matches = function(el, selector)
{
  return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector)
}
/**
 * Filter only wanted nodes
 * @param {Array|NodeList} nodes
 * @param {Array/string} wanted
 * @returns {Array}
 */
var _filter = function(nodes, wanted)
{
  if (!wanted)
  {
    return Array.prototype.slice.call(nodes)
  }
  var result = []
  for (var i = 0; i < nodes.length; ++i)
  {
    if (typeof wanted === 'string' && _matches(nodes[i], wanted))
    {
      result.push(nodes[i])
    }
    if (wanted.indexOf(nodes[i]) !== -1)
    {
      result.push(nodes[i])
    }
  }
  return result
}
/**
 * @param {Array|Element} element
 * @param {Array|string} event
 * @param {Function} callback
 */
var _on = function(element, event, callback)
{
  if (element instanceof Array)
  {
    for (var i = 0; i < element.length; ++i)
    {
      _on(element[i], event, callback)
    }
    return
  }
  element.addEventListener(event, callback)
  element.h5s = element.h5s || {}
  element.h5s.events = element.h5s.events || {}
  element.h5s.events[event] = callback
}
/**
 * @param {Array|Element} element
 * @param {Array|string} event
 */
var _off = function(element, event)
{
  if (element instanceof Array)
  {
    for (var i = 0; i < element.length; ++i)
    {
      _off(element[i], event)
    }
    return
  }
  if (element.h5s && element.h5s.events && element.h5s.events[event])
  {
    element.removeEventListener(event, element.h5s.events[event])
    delete element.h5s.events[event]
  }
}
/**
 * @param {Array|Element} element
 * @param {string} attribute
 * @param {*} value
 */
var _attr = function(element, attribute, value)
{
  if (element instanceof Array)
  {
    for (var i = 0; i < element.length; ++i)
    {
      _attr(element[i], attribute, value)
    }
    return
  }
  element.setAttribute(attribute, value)
}
/**
 * @param {Array|Element} element
 * @param {string} attribute
 */
var _removeAttr = function(element, attribute)
{
  if (element instanceof Array)
  {
    for (var i = 0; i < element.length; ++i)
    {
      _removeAttr(element[i], attribute)
    }
    return
  }
  element.removeAttribute(attribute)
}
/**
 * @param {Element} element
 * @returns {{left: *, top: *}}
 */
var _offset = function(element)
{
  var rect = element.getClientRects()[0]
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY
  }
}
/*
 * remove event handlers from items
 * @param {Array|NodeList} items
 */
var _removeItemEvents = function(items)
{
  _off(items, 'dragstart')
  _off(items, 'dragend')
  _off(items, 'selectstart')
  _off(items, 'dragover')
  _off(items, 'dragenter')
  _off(items, 'drop')
}
/*
 * Remove event handlers from sortable
 * @param {Element} sortable a single sortable
 */
var _removeSortableEvents = function(sortable)
{
  _off(sortable, 'dragover')
  _off(sortable, 'dragenter')
  _off(sortable, 'drop')
}
/*
 * Attach ghost to dataTransfer object
 * @param {Event} original event
 * @param {object} ghost-object with item, x and y coordinates
 */
var _attachGhost = function(event, ghost)
{
  // this needs to be set for HTML5 drag & drop to work
  event.dataTransfer.effectAllowed = 'move'
  // Firefox requires some arbitrary content in the data in order for
  // the drag & drop functionality to work
  event.dataTransfer.setData('text', 'arbitrary-content')

  // check if setDragImage method is available
  if (event.dataTransfer.setDragImage)
  {
    event.dataTransfer.setDragImage(ghost.draggedItem, ghost.x, ghost.y)
  }
}
/**
 * _addGhostPos clones the dragged item and adds it as a Ghost item
 * @param {Event} event - the event fired when dragstart is triggered
 * @param {object} ghost - .draggedItem = Element
 */
var _addGhostPos = function(event, ghost)
{
  if (!ghost.x)
  {
    ghost.x = parseInt(event.pageX - _offset(ghost.draggedItem).left)
  }
  if (!ghost.y)
  {
    ghost.y = parseInt(event.pageY - _offset(ghost.draggedItem).top)
  }
  return ghost
}
/**
 * _makeGhost decides which way to make a ghost and passes it to attachGhost
 * @param {Element} draggedItem - the item that the user drags
 */
var _makeGhost = function(draggedItem)
{
  return {
    draggedItem: draggedItem
  }
}
/**
 * _getGhost constructs ghost and attaches it to dataTransfer
 * @param {Event} event - the original drag event object
 * @param {Element} draggedItem - the item that the user drags
 */
// TODO: could draggedItem be replaced by event.target in all instances
var _getGhost = function(event, draggedItem)
{
  // add ghost item & draggedItem to ghost object
  var ghost = _makeGhost(draggedItem)
  // attach ghost position
  ghost = _addGhostPos(event, ghost)
  // attach ghost to dataTransfer
  _attachGhost(event, ghost)
}
/*
 * Remove data from sortable
 * @param {Element} sortable a single sortable
 */
var _removeSortableData = function(sortable)
{
  _removeData(sortable)
  _removeAttr(sortable, 'aria-dropeffect')
}
/*
 * Remove data from items
 * @param {Array|Element} items
 */
var _removeItemData = function(items)
{
  _removeAttr(items, 'aria-grabbed')
  _removeAttr(items, 'draggable')
  _removeAttr(items, 'role')
}
/*
 * Check if two lists are connected
 * @param {Element} curList
 * @param {Element} destList
 */
var _listsConnected = function(curList, destList)
{
  var acceptFrom = _data(curList, 'opts').acceptFrom
  if (acceptFrom !== null)
  {
    return acceptFrom !== false && acceptFrom.split(',').filter(function(sel)
    {
      return sel.length > 0 && _matches(destList, sel)
    }).length > 0
  }
  if (curList === destList)
  {
    return true
  }
  if (_data(curList, 'connectWith') !== undefined)
  {
    return _data(curList, 'connectWith') === _data(destList, 'connectWith')
  }
  return false
}
/*
 * get handle or return item
 * @param {Array} items
 * @param {selector} handle
 */
var _getHandles = function(items, handle)
{
  var result = []
  var handles
  if (!handle)
  {
    return items
  }
  for (var i = 0; i < items.length; ++i)
  {
    handles = items[i].querySelectorAll(handle)
    result = result.concat(Array.prototype.slice.call(handles))
  }
  return result
}
/*
 * Destroy the sortable
 * @param {Element} sortableElement a single sortable
 */
var _destroySortable = function(sortableElement)
{
  var opts = _data(sortableElement, 'opts') || {}
  var items = _filter(_getChildren(sortableElement), opts.items)
  var handles = _getHandles(items, opts.handle)
  // remove event handlers & data from sortable
  _removeSortableEvents(sortableElement)
  _removeSortableData(sortableElement)
  // remove event handlers & data from items
  _off(handles, 'mousedown')
  _removeItemEvents(items)
  _removeItemData(items)
}
/*
 * Enable the sortable
 * @param {Element} sortableElement a single sortable
 */
var _enableSortable = function(sortableElement)
{
  var opts = _data(sortableElement, 'opts')
  var items = _filter(_getChildren(sortableElement), opts.items)
  var handles = _getHandles(items, opts.handle)
  _attr(sortableElement, 'aria-dropeffect', 'move')
  _data(sortableElement, '_disabled', 'false')
  _attr(handles, 'draggable', 'true')
  // IE FIX for ghost
  // can be disabled as it has the side effect that other events
  // (e.g. click) will be ignored
  var spanEl = (document || window.document).createElement('span')
  if (typeof spanEl.dragDrop === 'function' && !opts.disableIEFix)
  {
    _on(handles, 'mousedown', function()
    {
      if (items.indexOf(this) !== -1)
      {
        this.dragDrop()
      } else
      {
        var parent = this.parentElement
        while (items.indexOf(parent) === -1)
        {
          parent = parent.parentElement
        }
        parent.dragDrop()
      }
    })
  }
}
/*
 * Disable the sortable
 * @param {Element} sortableElement a single sortable
 */
var _disableSortable = function(sortableElement)
{
  var opts = _data(sortableElement, 'opts')
  var items = _filter(_getChildren(sortableElement), opts.items)
  var handles = _getHandles(items, opts.handle)
  _attr(sortableElement, 'aria-dropeffect', 'none')
  _data(sortableElement, '_disabled', 'true')
  _attr(handles, 'draggable', 'false')
  _off(handles, 'mousedown')
}
/*
 * Reload the sortable
 * @param {Element} sortableElement a single sortable
 * @description events need to be removed to not be double bound
 */
var _reloadSortable = function(sortableElement)
{
  var opts = _data(sortableElement, 'opts')
  var items = _filter(_getChildren(sortableElement), opts.items)
  var handles = _getHandles(items, opts.handle)
  _data(sortableElement, '_disabled', 'false')
  // remove event handlers from items
  _removeItemEvents(items)
  _off(handles, 'mousedown')
  // remove event handlers from sortable
  _removeSortableEvents(sortableElement)
}
/**
 * Get position of the element relatively to its sibling elements
 * @param {Element} element
 * @returns {number}
 */
var _index = function(element)
{
  if (!element.parentElement)
  {
    return 0
  }
  return Array.prototype.indexOf.call(element.parentElement.children, element)
}
/**
 * Whether element is in DOM
 * @param {Element} element
 * @returns {boolean}
 */
var _attached = function(element)
{
  // document.body.contains(element)
  return !!element.parentNode
}
/**
 * Convert HTML string into DOM element.
 * @param {Element|string} html
 * @param {string} tagname
 * @returns {Element}
 */
var _html2element = function(html, tagName)
{
  if (typeof html !== 'string')
  {
    return html
  }
  var parentElement = document.createElement(tagName)
  parentElement.innerHTML = html
  return parentElement.firstChild
}
/**
 * Insert before target
 * @param {Element} target
 * @param {Element} element
 */
var _before = function(target, element)
{
  target.parentElement.insertBefore(
    element,
    target
  )
}
/**
 * Insert after target
 * @param {Element} target
 * @param {Element} element
 */
var _after = function(target, element)
{
  target.parentElement.insertBefore(
    element,
    target.nextElementSibling
  )
}
/**
 * Detach element from DOM
 * @param {Element} element
 */
var _detach = function(element)
{
  if (element.parentNode)
  {
    element.parentNode.removeChild(element)
  }
}
/**
 * Make native event that can be dispatched afterwards
 * @param {string} name
 * @param {object} detail
 * @returns {CustomEvent}
 */
var _makeEvent = function(name, detail)
{
  var e = document.createEvent('Event')
  if (detail)
  {
    e.detail = detail
  }
  e.initEvent(name, false, true)
  return e
}
/**
 * @param {Element} sortableElement
 * @param {CustomEvent} event
 */
var _dispatchEventOnConnected = function(sortableElement, event)
{
  sortables.forEach(function(target)
  {
    if (_listsConnected(sortableElement, target))
    {
      target.dispatchEvent(event)
    }
  })
}

/**
 * Creates and returns a new debounced version of the passed function which will postpone its execution until after wait milliseconds have elapsed
 * @param {fn} Function to debounce
 * @param {delay} time to wait before calling function with latest arguments, 0 - no debounce
 * @param {context} time to wait before calling function with latest arguments, 0 - no debounce
 * @returns {function} - debounced function
 */
function _debounce(fn, delay, context)
{
  var timer = null

  if (delay === 0)
  {
    return fn
  }
  return function()
  {
    var eContext = context || this
    var args = arguments
    clearTimeout(timer)
    timer = setTimeout(function()
    {
      fn.apply(eContext, args)
    }, delay)
  }
}

var _getChildren = function(element)
{
  return element.children
}

var _serialize = function(list)
{
  var children = _filter(_getChildren(list), _data(list, 'items'))
  return children
}

/*
 * Public sortable object
 * @param {Array|NodeList} sortableElements
 * @param {object|string} options|method
 */
var sortable = function(sortableElements, options)
{
  var method = String(options)

  options = (function(options)
  {
    var result = {
      connectWith: false,
      acceptFrom: null,
      placeholder: null,
      disableIEFix: false,
      placeholderClass: 'sortable-placeholder',
      draggingClass: 'sortable-dragging',
      hoverClass: false,
      debounce: 0,
      maxItems: 0
    }
    for (var option in options)
    {
      result[option] = options[option]
    }
    return result
  })(options)

  if (options && typeof options.getChildren === 'function')
  {
    _getChildren = options.getChildren
  }

  if (typeof sortableElements === 'string')
  {
    sortableElements = document.querySelectorAll(sortableElements)
  }

  if (sortableElements instanceof window.Element)
  {
    sortableElements = [sortableElements]
  }

  sortableElements = Array.prototype.slice.call(sortableElements)

  if (/serialize/.test(method))
  {
    var serialized = []
    sortableElements.forEach(function(sortableElement)
    {
      serialized.push({
        list: sortableElement,
        children: _serialize(sortableElement)
      })
    })
    return serialized
  }

  /* TODO: maxstatements should be 25, fix and remove line below */
  /* jshint maxstatements:false */
  sortableElements.forEach(function(sortableElement)
  {
    if (/enable|disable|destroy/.test(method))
    {
      return sortable[method](sortableElement)
    }

    // get options & set options on sortable
    options = _data(sortableElement, 'opts') || options
    _data(sortableElement, 'opts', options)
    // reset sortable
    _reloadSortable(sortableElement)
    // initialize
    var items = _filter(_getChildren(sortableElement), options.items)
    var index
    var startParent
    var startList
    var placeholder = options.placeholder
    var maxItems
    if (!placeholder)
    {
      placeholder = document.createElement(
        /^ul|ol$/i.test(sortableElement.tagName) ? 'li' : 'div'
      )
    }
    placeholder = _html2element(placeholder, sortableElement.tagName)
    placeholder.classList.add.apply(
      placeholder.classList,
      options.placeholderClass.split(' ')
    )

    // setup sortable ids
    if (!sortableElement.getAttribute('data-sortable-id'))
    {
      var id = sortables.length
      sortables[id] = sortableElement
      _attr(sortableElement, 'data-sortable-id', id)
      _attr(items, 'data-item-sortable-id', id)
    }

    _data(sortableElement, 'items', options.items)
    placeholders.push(placeholder)
    if (options.acceptFrom)
    {
      _data(sortableElement, 'acceptFrom', options.acceptFrom)
    } else if (options.connectWith)
    {
      _data(sortableElement, 'connectWith', options.connectWith)
    }

    _enableSortable(sortableElement)
    _attr(items, 'role', 'option')
    _attr(items, 'aria-grabbed', 'false')

    // Mouse over class
    if (options.hoverClass)
    {
      var hoverClass = 'sortable-over'
      if (typeof options.hoverClass === 'string')
      {
        hoverClass = options.hoverClass
      }

      _on(items, 'mouseenter', function()
      {
        this.classList.add(hoverClass)
      })
      _on(items, 'mouseleave', function()
      {
        this.classList.remove(hoverClass)
      })
    }

    // max items
    if (options.maxItems && typeof options.maxItems === 'number')
    {
      maxItems = options.maxItems
    }

    // Handle drag events on draggable items
    _on(items, 'dragstart', function(e)
    {
      e.stopImmediatePropagation()
      if ((options.handle && !_matches(e.target, options.handle)) || this.getAttribute('draggable') === 'false')
      {
        return
      }

      // add transparent clone or other ghost to cursor
      _getGhost(e, this)
      // cache selsection & add attr for dragging
      this.classList.add(options.draggingClass)
      dragging = this
      _attr(dragging, 'aria-grabbed', 'true')
      // grab values
      index = _index(dragging)
      draggingHeight = parseInt(window.getComputedStyle(dragging).height)
      startParent = this.parentElement
      startList = _serialize(startParent)
      // dispatch sortstart event on each element in group
      _dispatchEventOnConnected(sortableElement, _makeEvent('sortstart', {
        item: dragging,
        placeholder: placeholder,
        startparent: startParent
      }))
    })
    // Handle drag events on draggable items
    _on(items, 'dragend', function()
    {
      var newParent
      if (!dragging)
      {
        return
      }
      // remove dragging attributes and show item
      dragging.classList.remove(options.draggingClass)
      _attr(dragging, 'aria-grabbed', 'false')
      dragging.style.display = dragging.oldDisplay
      delete dragging.oldDisplay

      placeholders.forEach(_detach)
      newParent = this.parentElement
      _dispatchEventOnConnected(sortableElement, _makeEvent('sortstop', {
        item: dragging,
        startparent: startParent
      }))
      if (index !== _index(dragging) || startParent !== newParent)
      {
        _dispatchEventOnConnected(sortableElement, _makeEvent('sortupdate', {
          item: dragging,
          index: _filter(_getChildren(newParent), _data(newParent, 'items'))
            .indexOf(dragging),
          oldindex: items.indexOf(dragging),
          elementIndex: _index(dragging),
          oldElementIndex: index,
          startparent: startParent,
          endparent: newParent,
          newEndList: _serialize(newParent),
          newStartList: _serialize(startParent),
          oldStartList: startList
        }))
      }
      dragging = null
      draggingHeight = null
    })
    // Handle drop event on sortable & placeholder
    // TODO: REMOVE placeholder?????
    _on([sortableElement, placeholder], 'drop', function(e)
    {
      var visiblePlaceholder
      if (!_listsConnected(sortableElement, dragging.parentElement))
      {
        return
      }

      e.preventDefault()
      e.stopPropagation()
      visiblePlaceholder = placeholders.filter(_attached)[0]
      _after(visiblePlaceholder, dragging)
      dragging.dispatchEvent(_makeEvent('dragend'))
    })

    var debouncedDragOverEnter = _debounce(function(element, pageY)
    {
      if (!dragging)
      {
        return
      }

      if (items.indexOf(element) !== -1)
      {
        var thisHeight = parseInt(window.getComputedStyle(element).height)
        var placeholderIndex = _index(placeholder)
        var thisIndex = _index(element)
        if (options.forcePlaceholderSize)
        {
          placeholder.style.height = draggingHeight + 'px'
        }

        // Check if `element` is bigger than the draggable. If it is, we have to define a dead zone to prevent flickering
        if (thisHeight > draggingHeight)
        {
          // Dead zone?
          var deadZone = thisHeight - draggingHeight
          var offsetTop = _offset(element).top
          if (placeholderIndex < thisIndex &&
            pageY < offsetTop + deadZone)
          {
            return
          }
          if (placeholderIndex > thisIndex &&
            pageY > offsetTop + thisHeight - deadZone)
          {
            return
          }
        }

        if (dragging.oldDisplay === undefined)
        {
          dragging.oldDisplay = dragging.style.display
        }

        if (dragging.style.display !== 'none')
        {
          dragging.style.display = 'none'
        }

        if (placeholderIndex < thisIndex)
        {
          _after(element, placeholder)
        } else
        {
          _before(element, placeholder)
        }
        // Intentionally violated chaining, it is more complex otherwise
        placeholders
          .filter(function(element) { return element !== placeholder })
          .forEach(_detach)
      } else
      {
        if (placeholders.indexOf(element) === -1 &&
          !_filter(_getChildren(element), options.items).length)
        {
          placeholders.forEach(_detach)
          element.appendChild(placeholder)
        }
      }
    }, options.debounce)

    // Handle dragover and dragenter events on draggable items
    var onDragOverEnter = function(e)
    {
      if (!dragging || !_listsConnected(sortableElement, dragging.parentElement) || _data(sortableElement, '_disabled') === 'true')
      {
        return
      }
      if (maxItems && _filter(_getChildren(sortableElement), _data(sortableElement, 'items')).length >= maxItems)
      {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      debouncedDragOverEnter(this, e.pageY)
    }

    _on(items.concat(sortableElement), 'dragover', onDragOverEnter)
    _on(items.concat(sortableElement), 'dragenter', onDragOverEnter)
  })

  return sortableElements
}

sortable.destroy = function(sortableElement)
{
  _destroySortable(sortableElement)
}

sortable.enable = function(sortableElement)
{
  _enableSortable(sortableElement)
}

sortable.disable = function(sortableElement)
{
  _disableSortable(sortableElement)
}