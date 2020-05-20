(function(){
  window.ui = window.ui || {}
  ui.flipletCharts = ui.flipletCharts || {};

  function init() {
    Fliplet.Widget.instance('chart-scatter', function (data) {
      var chartId = data.id;
      var chartUuid = data.uuid;
      var $container = $(this);
      var refreshTimeout = 5000;
      var updateDateFormat = 'hh:mm:ss a';
      var colors = [
        '#00abd1', '#ed9119', '#7D4B79', '#F05865', '#36344C',
        '#474975', '#8D8EA6', '#FF5722', '#009688', '#E91E63'
      ];
      var chartInstance;      

      function resetData() {
        data.entries = [];
        data.totalEntries = 0;
      }

      function refreshData() {
        if (typeof data.dataSourceQuery !== 'object') {
          data.entries = [
            {x: 1, y: 2},
            {x: 2, y: 1.5},
            {x: 3, y: 4},
            {x: 4, y: 1},
            {x: 5, y: 2},
            {x: 6, y: 2.5}
          ];
          data.xAxisTitle = 'X-axis';
          data.yAxisTitle = 'Y-axis';
          data.totalEntries = 6;
          return Promise.resolve()
        }

        // beforeQueryChart is deprecated
        return Fliplet.Hooks.run('beforeQueryChart', data.dataSourceQuery).then(function () {
          return Fliplet.Hooks.run('beforeChartQuery', {
            config: data,
            id: data.id,
            uuid: data.uuid,
            type: 'scatter'
          });
        }).then(function() {
          if (_.isFunction(data.getData)) {
            var response = data.getData();

            if (!(response instanceof Promise)) {
              return Promise.resolve(response);
            }

            return response;
          }

          return Fliplet.DataSources.fetchWithOptions(data.dataSourceQuery);
        }).then(function(result){
          // afterQueryChart is deprecated
          return Fliplet.Hooks.run('afterQueryChart', result).then(function () {
            return Fliplet.Hooks.run('afterChartQuery', {
              config: data,
              id: data.id,
              uuid: data.uuid,
              type: 'scatter',
              records: result
            });
          }).then(function () {
            resetData();
            if (result.dataSource.columns.indexOf(data.dataSourceQuery.columns.xAxis) < 0 || result.dataSource.columns.indexOf(data.dataSourceQuery.columns.yAxis) < 0) {
              return Promise.resolve();
            }
            result.dataSourceEntries.forEach(function(row) {
              var x;
              if (data.dataFormat === 'timestamp') {
                x = new Date(row[data.dataSourceQuery.columns.xAxis] || 0).getTime()
              } else {
                x = parseInt(row[data.dataSourceQuery.columns.xAxis], 10) || 0;
              }
              var y = parseInt(row[data.dataSourceQuery.columns.yAxis], 0) || 0;
              data.entries.push([x, y]);
            });
            // SAVES THE TOTAL NUMBER OF ROW/ENTRIES
            data.totalEntries = data.entries.length;

            return Promise.resolve();
          }).catch(function(error){
            return Promise.reject(error);
          });
        })
      }

      function refreshChartInfo() {
        // Update total count
        $container.find('.total').html(data.totalEntries);
        // Update last updated time
        $container.find('.updatedAt').html(moment().format(updateDateFormat));
      }

      function refreshChart() {
        // Retrieve chart object
        var chart = ui.flipletCharts[chartId];

        if (!chart) {
          return drawChart();
        }

        // Update values
        chart.series[0].setData(data.entries);
        refreshChartInfo();
        return Promise.resolve(chart);
      }

      function getLatestData() {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            refreshData().then(function () {
              if (data.autoRefresh) {
                getLatestData();
              }

              refreshChart();
              resolve();
            }).catch(function (err) {
              if (data.autoRefresh) {
                getLatestData();
              }

              reject(err);
            });
          }, refreshTimeout);
        });
      }

      Fliplet.Studio.onEvent(function(event) {
        var eventDetail = event.detail;

        if (eventDetail && eventDetail.type === 'colorChange') {
          // In the label we got a string with a field label and its numeration
          // For example: 'Chart color 1'
          // Numeration of the fields start with 1, that is why we decrease it by 1.
          var colorIndex = eventDetail.label.match(/[0-9]{1,2}/)[0] - 1;

          colors[colorIndex] = eventDetail.color;

          chartInstance.update({
            colors: colors
          });
        }
      });

      function drawChart() {
        return new Promise(function (resolve, reject) {
          var customColors = Fliplet.Themes.Current.getSettingsForWidgetInstance(chartUuid);

          colors.forEach(function eachColor(color, index) {
            if (!Fliplet.Themes) {
              return;
            }

            var colorKey = 'chartColor' + (index + 1);
            var newColor = customColors
              ? customColors.values[colorKey]
              : Fliplet.Themes.Current.get(colorKey);
            
            if (newColor) {
              colors[index] = newColor;
            }
          });
          var chartOpt = {
            chart: {
              type: 'scatter',
              zoomType: 'xy',
              renderTo: $container.find('.chart-container')[0],
              style: {
                fontFamily: (Fliplet.Themes && Fliplet.Themes.Current.get('bodyFontFamily')) || 'sans-serif'
              },
              events: {
                load: function(){
                  refreshChartInfo();
                  if (data.autoRefresh) {
                    getLatestData();
                  }
                },
                render: function () {
                  ui.flipletCharts[chartId] = this;
                  Fliplet.Hooks.run('afterChartRender', {
                    chart: ui.flipletCharts[chartId],
                    chartOptions: chartOpt,
                    id: data.id,
                    uuid: data.uuid,
                    type: 'scatter',
                    config: data
                  });
                  resolve(this);
                }
              }
            },
            colors: colors,
            title: {
              text: ''
            },
            subtitle: {
              text: ''
            },
            xAxis: {
              title: {
                text: data.xAxisTitle || data.dataSourceQuery.columns.xAxis,
                enabled: data.xAxisTitle !== ''
              },
              labels: {
                formatter: function(){
                  if (data.dataFormat === 'timestamp') {
                    return moment(this.value).format('YYYY-MM-DD');
                  }
                  return this.value;
                }
              },
              startOnTick: true,
              endOnTick: true,
              showLastLabel: true
            },
            yAxis: {
              title: {
                text: data.yAxisTitle || data.dataSourceQuery.columns.yAxis,
                enabled: data.yAxisTitle !== ''
              }
            },
            navigation: {
              buttonOptions: {
                enabled: false
              }
            },
            tooltip: {
              enabled: data.showDataValues,
              headerFormat: '',
              pointFormat: [
                '<strong>',
                (data.xAxisTitle !== ''
                  ? data.xAxisTitle
                  : data.dataSourceQuery.columns.xAxis),
                '</strong> ',
                (data.dataFormat === 'timestamp'
                  ? '{point.x:%Y-%m-%d %H:%M:%S}'
                  : '{point.x}'),
                '<br><strong>',
                (data.yAxisTitle !== ''
                  ? data.yAxisTitle
                  : data.dataSourceQuery.columns.yAxis),
                '</strong>: {point.y}'
              ].join('')
            },
            plotOptions: {
              scatter: {
                marker: {
                  radius: 5,
                  states: {
                    hover: {
                      enabled: true,
                      lineColor: 'rgb(100,100,100)'
                    }
                  }
                },
                states: {
                  hover: {
                    marker: {
                      enabled: false
                    }
                  }
                }
              }
            },
            series: [{
              data: data.entries,
              events: {
                click: function () {
                  Fliplet.Analytics.trackEvent({
                    category: 'chart',
                    action: 'data_point_interact',
                    label: 'scatter'
                  });
                },
                legendItemClick: function () {
                  Fliplet.Analytics.trackEvent({
                    category: 'chart',
                    action: 'legend_filter',
                    label: 'scatter'
                  });
                }
              }
            }],
            legend: {
              enabled: false
            },
            credits: {
              enabled: false
            }
          };
          // Create and save chart object
          Fliplet.Hooks.run('beforeChartRender', {
            chartOptions: chartOpt,
            id: data.id,
            uuid: data.uuid,
            type: 'scatter',
            config: data
          }).then(function () {
            try {
              chartInstance = new Highcharts.Chart(chartOpt);
            } catch (e) {
              return Promise.reject(e);
            }
          }).catch(reject);
        });
      }

      function redrawChart() {
        ui.flipletCharts[chartId].reflow();
      }

      if (Fliplet.Env.get('interact')) {
        // TinyMCE removes <style> tags, so we've used a <script> tag instead,
        // which will be appended to <body> to apply the styles
        $($(this).find('.chart-styles').detach().html()).appendTo('body');
      } else {
        $(this).find('.chart-styles').remove();
      }

      Fliplet.Hooks.on('appearanceChanged', redrawChart);
      Fliplet.Hooks.on('appearanceFileChanged', redrawChart);

      refreshData().then(drawChart).catch(function(error){
        console.error(error);
        getLatestData();
      });
    });
  }

  Fliplet().then(function(){
    var debounceLoad = _.debounce(init, 500, { leading: true });
    Fliplet.Studio.onEvent(function (event) {
      if (event.detail.event === 'reload-widget-instance') {
        debounceLoad();
      }
    });

    init();
  });
})();
