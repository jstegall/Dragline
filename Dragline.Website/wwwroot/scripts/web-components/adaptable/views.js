;(function()
{
  "use strict";

  if (!window.AdapTable)
    throw new Error("AdapTable core hasn't loaded.");

  class Views
  {
    /****************************************************************************
    * Creates an instance of Views.
    *
    * @param instance {object} A reference to an instance of AdapTable.
    ****************************************************************************/
    constructor(instance)
    {
      this.Instance = instance;

      // TODO: Add pub/sub event-handling
      this.Instance.Element
        .on("repaint.widgets.adaptable", $.proxy(this.applyView, this))
        .on("columns-moved.widgets.adaptable", $.proxy(buildColumnMenu, this));
    }
  }

  AdapTable.Views.prototype =
  {
    /**************************************************************************
    * Restores the visibility of each column based on saved state.
    **************************************************************************/
    applyView: function()
    {
      var layout = this.Instance.Element.data("Layout");
      if (!layout)
        return;

      var self = this;
      var lazyColumns = Lazy(layout.Columns);

      lazyColumns
        .where({ IsVisible: true })
        .each(function(column)
        {
          toggleColumnVisibility.call(self, lazyColumns.indexOf(column), true);
        });

      lazyColumns
        .where({ IsHidable: true, IsVisible: false })
        .each(function(column)
        {
          toggleColumnVisibility.call(self, lazyColumns.indexOf(column), false);
        });

      if (this.Instance.Container.find(".fa-columns").length)
        return;

      this.Instance.addActionButton("fa-columns", "Select which columns are viewable", $.proxy(toggleColumnMenu, this));
      buildColumnMenu.call(this);
    }
  };

  /****************************************************************************
  * Builds the OL element that contains the list of columns that are
  * viewable.
  *
  * @this An instance of AdapTable.Views.
  ****************************************************************************/
  function buildColumnMenu()
  {
    this.Instance.Container.find("div.Actions > ol.Columns").remove();

    var columnList = $("<ol />")
      .addClass("Columns");

    this.Instance.Container.find("div.Actions").append(columnList);

    var self = this;
    var columns = this.Instance.Element.data("Layout").Columns;

    Lazy(columns).each(function(column, index)
    {
      var columnCheckbox = $("<input />")
        .attr("type", "checkbox")
        .prop("checked", column.IsVisible)
        .on("change.widgets.adaptable", self.Instance.Options, $.proxy(toggleCheckedColumn, self));

      var columnLabel = $("<label />").append(columnCheckbox);
      var listItem = $("<li />").append(columnLabel);

      if (!column.Header || column.Header.trim().length < 1)
        listItem.hide();
      else
        columnLabel.append(column.Header);

      columnList.append(listItem);
    });
  }

  /****************************************************************************
  * Toggles the visibility of the menu that displays the columns in the table.
  *
  * @this An instance of AdapTable.Views.
  * @param e {event} The event.
  ****************************************************************************/
  function toggleColumnMenu(e)
  {
    this.Instance.toggleMenu(e, $(e.target).parent().children("ol.Columns"));
  }

  /****************************************************************************
  * Toggles the visibility of a column respective of its checkbox.
  *
  * @this An instance of AdapTable.Views.
  * @param e {event} The event.
  ****************************************************************************/
  function toggleCheckedColumn(e)
  {
    var chkColumn = $(e.target);
    var columnIndex = chkColumn.parents("li").index();
    var table = chkColumn.parents("div.AdapTable").children("table");

    toggleColumnVisibility.call(this, columnIndex, chkColumn.is(":checked"));
  }

  /****************************************************************************
  * Toggles a column's visibility.
  *
  * @this An instance of AdapTable.Views.
  * @param columnIndex {int} The zero-based index of the column.
  * @param isVisible {boolean} True to show the column, false to hide it.
  ****************************************************************************/
  function toggleColumnVisibility(columnIndex, isVisible)
  {
    var column = this.Instance.Element
      .children(this.Instance.Options.ExcludeFooter ? ":not(tfoot)" : "")
      .children("tr:not([role='group'])")
      .children(":nth-child(" + (columnIndex + 1) + ")");

    if (isVisible)
      column.show();
    else
      column.hide();

    if (this.Instance.Options.Layout.Url)
    {
      var layout = this.Instance.Element.data("Layout");
      layout.Columns[columnIndex].IsVisible = isVisible;
      this.Instance.cacheLayout(layout);
    }
  }
})();