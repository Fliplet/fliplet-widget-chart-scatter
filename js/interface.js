var defaultData = {
  dataSourceQuery: undefined,
  dataFormat: 'number',
  showDataValues: true,
  yAxisTitle: '',
  xAxisTitle: '',
  showTotalEntries: false,
  autoRefresh: false
};
var data = $.extend(defaultData, Fliplet.Widget.getData());

var dsQueryData = {
  settings: {
    dataSourceTitle: 'Select a data source',
    default: {
      name: 'Chart data for ' + Fliplet.Env.get('appName')
    },
    filters: false,
    columns: [
      {
        key: 'xAxis',
        label: 'Select a column for the X-axis',
        type: 'single'
      },
      {
        key: 'yAxis',
        label: 'Select a column for the Y-axis',
        type: 'single'
      }
    ]
  },
  accessRules: [
    {
      allow: 'all',
      enabled: true,
      type: [
        'select'
      ]
    }
  ],
  result: data.dataSourceQuery
};

var $dataFormat = $('select#select-data-format');

var dsQueryProvider = Fliplet.Widget.open('com.fliplet.data-source-query', {
  selector: '.data-source-query',
  data: dsQueryData
});

function attachObservers() {
  dsQueryProvider.then(function(result){
    
    Fliplet.Widget.save({
      dataSourceQuery: result.data,
      dataFormat: $dataFormat.find(':selected').val(),
      showDataValues: $('#show_data_values').is(':checked'),
      yAxisTitle: $('#y_axis_title').val(),
      xAxisTitle: $('#x_axis_title').val(),
      showTotalEntries: $('#show_total_entries').is(':checked'),
      autoRefresh: $('#auto_refresh').is(':checked')
    }).then(function () {
      Fliplet.Widget.complete();
      Fliplet.Studio.emit('reload-page-preview');
    });
  });

  // Fired from Fliplet Studio when the external save button is clicked
  Fliplet.Widget.onSaveRequest(function () {
    dsQueryProvider.forwardSaveRequest();
  });
}

attachObservers();

// LOAD CHART SETTINGS
if (data) {
  $dataFormat.val(data.dataFormat || 'number').trigger('change');
  $('#show_data_values').prop('checked', data.showDataValues);
  $('#y_axis_title').val(data.yAxisTitle);
  $('#x_axis_title').val(data.xAxisTitle);
  $('#show_total_entries').prop('checked', data.showTotalEntries);
  $('#auto_refresh').prop('checked', data.autoRefresh);
}
