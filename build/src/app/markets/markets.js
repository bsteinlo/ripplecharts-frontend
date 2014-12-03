angular.module('ripplecharts.markets', [
  'ui.state',
  'ui.bootstrap',
  'ui.route'
]).config([
  '$stateProvider',
  function config($stateProvider) {
    $stateProvider.state('markets-custom', {
      url: '/markets/:base/:trade',
      views: {
        'main': {
          controller: 'MarketsCtrl',
          templateUrl: 'markets/markets.tpl.html'
        }
      },
      data: { pageTitle: 'Live Chart' }
    }).state('markets', {
      url: '/markets',
      views: {
        'main': {
          controller: 'MarketsCtrl',
          templateUrl: 'markets/markets.tpl.html'
        }
      },
      data: { pageTitle: 'Live Chart' }
    });
  }
]).controller('MarketsCtrl', [
  '$scope',
  '$state',
  '$location',
  function MarketsCtrl($scope, $state, $location) {
    if ($state.params.base && $state.params.trade) {
      var base = $state.params.base.split(':');
      base = {
        currency: base[0],
        issuer: base[1] ? base[1] : ''
      };
      var trade = $state.params.trade.split(':');
      trade = {
        currency: trade[0],
        issuer: trade[1] ? trade[1] : ''
      };
      store.set('base', base);
      store.set('trade', trade);
      store.session.set('base', base);
      store.session.set('trade', trade);
      $location.path('/markets').replace();
      return;
    }
    $scope.base = store.session.get('base') || store.get('base') || Options.base || {
      currency: 'XRP',
      issuer: ''
    };
    $scope.trade = store.session.get('trade') || store.get('trade') || Options.trade || {
      currency: 'USD',
      issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    };
    $scope.chartType = store.session.get('chartType') || store.get('chartType') || Options.chartType || 'line';
    $scope.interval = store.session.get('interval') || store.get('interval') || Options.interval || '1h';
    var loaded = false, dropdownB = ripple.currencyDropdown().selected($scope.trade).on('change', function (d) {
        if (loaded) {
          $scope.trade = d;
          loadPair();
        }
      }), dropdownA = ripple.currencyDropdown().selected($scope.base).on('change', function (d) {
        if (loaded) {
          $scope.base = d;
          loadPair();
        }
      });
    d3.select('#base').call(dropdownA);
    d3.select('#quote').call(dropdownB);
    d3.select('#flip').on('click', function () {
      dropdownA.selected($scope.trade);
      dropdownB.selected($scope.base);
      d3.select('#base').selectAll('select').remove();
      d3.select('#quote').selectAll('select').remove();
      loaded = false;
      d3.select('#base').call(dropdownA);
      d3.select('#quote').call(dropdownB);
      loaded = true;
      swap = $scope.trade;
      $scope.trade = $scope.base;
      $scope.base = swap;
      loadPair();
    });
    var list = d3.select('#interval').attr('class', 'selectList');
    list.append('label').html('Interval:');
    var interval = list.selectAll('a').data([
        {
          name: '1m',
          interval: 'minute',
          multiple: 1,
          offset: function (d) {
            return d3.time.hour.offset(d, -2);
          }
        },
        {
          name: '5m',
          interval: 'minute',
          multiple: 5,
          offset: function (d) {
            return d3.time.hour.offset(d, -12);
          }
        },
        {
          name: '15m',
          interval: 'minute',
          multiple: 15,
          offset: function (d) {
            return d3.time.day.offset(d, -2);
          }
        },
        {
          name: '1h',
          interval: 'hour',
          multiple: 1,
          offset: function (d) {
            return d3.time.day.offset(d, -5);
          }
        },
        {
          name: '4h',
          interval: 'hour',
          multiple: 4,
          offset: function (d) {
            return d3.time.day.offset(d, -20);
          }
        },
        {
          name: '1d',
          interval: 'day',
          multiple: 1,
          offset: function (d) {
            return d3.time.day.offset(d, -120);
          }
        },
        {
          name: '3d',
          interval: 'day',
          multiple: 3,
          offset: function (d) {
            return d3.time.year.offset(d, -1);
          }
        }
      ]).enter().append('a').attr('href', '#').classed('selected', function (d) {
        return d.name === $scope.interval;
      }).text(function (d) {
        return d.name;
      }).on('click', function (d) {
        d3.event.preventDefault();
        var that = this;
        store.set('interval', d.name);
        store.session.set('interval', d.name);
        interval.classed('selected', function () {
          return this === that;
        });
        priceChart.load($scope.base, $scope.trade, d);
      });
    var chartType = d3.select('#chartType').attr('class', 'selectList').selectAll('a').data([
        'line',
        'candlestick'
      ]).enter().append('a').attr('href', '#').classed('selected', function (d) {
        return d === $scope.chartType;
      }).text(function (d) {
        return d;
      }).on('click', function (d) {
        d3.event.preventDefault();
        var that = this;
        store.set('chartType', d);
        store.session.set('chartType', d);
        chartType.classed('selected', function () {
          return this === that;
        });
        chartType.selected = d;
        priceChart.setType(d);
      });
    var priceChart = new PriceChart({
        id: 'priceChart',
        url: API,
        type: $scope.chartType,
        live: true,
        resize: true
      });
    var toCSV = d3.select('#toCSV');
    toCSV.on('click', function () {
      if (toCSV.attr('disabled'))
        return;
      var data = priceChart.getRawData();
      var list = [];
      for (var i = 0; i < data.length; i++) {
        list.push(JSON.parse(JSON.stringify(data[i])));
      }
      var csv = jsonToCSV(list);
      if (!!Modernizr.prefixed('requestFileSystem', window)) {
        var blob = new Blob([csv], { 'type': 'application/octet-stream' });
        this.href = window.URL.createObjectURL(blob);
      } else {
        this.href = 'data:text/csv;charset=utf-8,' + escape(csv);
      }
      this.download = $scope.base.currency + '_' + $scope.trade.currency + '_historical.csv';
      this.target = '_blank';
    });
    priceChart.onStateChange = function (state) {
      if (state == 'loaded')
        toCSV.style('opacity', 1).attr('disabled', null);
      else
        toCSV.style('opacity', 0.3).attr('disabled', true);
    };
    loaded = true;
    function emitHandler(type, data) {
      if (type == 'spread') {
        document.title = data.bid + '/' + data.ask + ' ' + $scope.base.currency + '/' + $scope.trade.currency;
      }
    }
    book = new OrderBook({
      chartID: 'bookChart',
      tableID: 'bookTables',
      remote: remote,
      resize: true,
      emit: emitHandler
    });
    tradeFeed = new TradeFeed({
      id: 'tradeFeed',
      url: API
    });
    function loadPair() {
      var interval = d3.select('#interval .selected').datum();
      store.set('base', $scope.base);
      store.set('trade', $scope.trade);
      store.session.set('base', $scope.base);
      store.session.set('trade', $scope.trade);
      priceChart.load($scope.base, $scope.trade, interval);
      book.getMarket($scope.base, $scope.trade);
      tradeFeed.loadPair($scope.base, $scope.trade);
      mixpanel.track('Price Chart', {
        'Base Currency': $scope.base.currency + ($scope.base.issuer ? '.' + $scope.base.issuer : ''),
        'Trade Currency': $scope.trade.currency + ($scope.trade.issuer ? '.' + $scope.trade.issuer : ''),
        'Interval': interval.name,
        'Chart Type': priceChart.type
      });
    }
    $scope.$on('$destroy', function () {
      priceChart.suspend();
      book.suspend();
      tradeFeed.suspend();
    });
    $scope.$watch('online', function (online) {
      if (online) {
        remote.connect();
        setTimeout(function () {
          loadPair();
        }, 100);
      } else {
        remote.disconnect();
      }
    });
  }
]);