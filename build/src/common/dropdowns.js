(function () {
  var accountsByCurrency, gatewayByName, gatewayByAddress, queue = [];
  ripple.currencyDropdown = function (currencyList) {
    var event = d3.dispatch('change'), selected;
    if (!accountsByCurrency) {
      accountsByCurrency = {};
      gatewayByName = {};
      gatewayByAddress = {};
      gateways.forEach(function (gateway) {
        gatewayByName[gateway.name] = gateway;
        var accounts = gateway.accounts, currencies = gateway.currencies = [];
        accounts.forEach(function (account) {
          gatewayByAddress[account.address] = account.gateway = gateway;
          account.currencies.forEach(function (currency) {
            var c = typeof currency === 'string' ? currency : currency.label;
            (accountsByCurrency.hasOwnProperty(c) ? accountsByCurrency[c] : accountsByCurrency[c] = []).push(account);
            currencies.push(currency);
          });
        });
      });
      for (var i = 0; i < queue.length; ++i)
        queue[i]();
      queue = null;
    }
    function dropdown(selection) {
      if (queue)
        queue.push(function () {
          selection.call(loadDropdowns);
        });
      else
        selection.call(loadDropdowns);
    }
    function loadDropdowns(selection) {
      var currencies = currencyList || ['XRP'].concat(d3.keys(accountsByCurrency).sort());
      var currencySelect = selection.append('select').attr('class', 'currency').on('change', changeCurrency);
      var gateway = selected && gatewayByAddress[selected.issuer];
      var selectedCurrency = selected ? selected.currency : null;
      if (!currencyList)
        var gatewaySelect = selection.append('select').attr('class', 'gateway').on('change', changeGateway);
      if (selectedCurrency && gateway) {
        for (i = 0; i < gateway.currencies.length; i++) {
          if (typeof gateway.currencies[i] !== 'string' && gateway.currencies[i].code === selectedCurrency) {
            selectedCurrency = gateway.currencies[i].label;
            break;
          }
        }
      }
      var option = currencySelect.selectAll('option').data(currencies).enter().append('option').attr('class', function (d) {
          return d;
        }).property('selected', function (d) {
          return selectedCurrency && d === selectedCurrency;
        }).text(function (d) {
          return d;
        });
      if (!currencyList)
        changeCurrency();
      function changeCurrency() {
        if (currencyList) {
          event.change(currencySelect.node().value);
        } else {
          var currency = currencySelect.node().value;
          var list = currency == 'XRP' ? [''] : accountsByCurrency[currency].map(function (d) {
              return d.gateway.name;
            });
          var option = gatewaySelect.selectAll('option').data(list, String);
          option.enter().append('option').text(function (d) {
            return d;
          });
          option.exit().remove();
          if (currency == 'XRP')
            gatewaySelect.attr('disabled', 'true');
          else
            gatewaySelect.attr('disabled', null);
          if (selected) {
            var name = gateway ? gateway.name : '';
            option.property('selected', function (d) {
              return d === name;
            });
          }
          changeGateway();
        }
      }
      function changeGateway() {
        var gateway = gatewaySelect.node().value, currency = currencySelect.node().value, accounts = accountsByCurrency[currency];
        account = accounts && accounts.filter(function (d) {
          return d.gateway.name === gateway;
        })[0];
        issuer = account ? account.address : null;
        if (account) {
          for (i = 0; i < account.currencies.length; i++) {
            if (typeof account.currencies[i] !== 'string' && account.currencies[i].label === currency) {
              currency = account.currencies[i].code;
              break;
            }
          }
        }
        event.change(issuer ? {
          currency: currency,
          issuer: issuer
        } : { currency: currency });
      }
    }
    function loaded(selection) {
      var currencies = ['XRP'].concat(d3.keys(accountsByCurrency).sort()), names = [''].concat(d3.keys(gatewayByName).sort()), gateway = selected && gatewayByAddress[selected.issuer];
      var gatewaySelect = selection.append('select').attr('class', 'gateway').on('change', function () {
          var gateway = gatewayByName[gatewaySelect.selectAll(':checked').datum()], option = currencySelect.selectAll('option').data(gateway ? gateway.currencies : ['XRP'], String);
          option.enter().append('option').text(String);
          option.exit().remove();
          change();
        });
      gatewaySelect.selectAll('option').data(names).enter().append('option').property('selected', gateway ? function (d) {
        return d === gateway.name;
      } : function (_, i) {
        return !i;
      }).text(String);
      var currencySelect = selection.append('select').attr('class', 'currency').on('change', change);
      var option = currencySelect.selectAll('option').data(gateway ? gateway.currencies : ['XRP'], String).enter().append('option').text(String);
      if (selected)
        option.property('selected', function (d) {
          return d === selected.currency;
        });
      change();
      function change() {
        var gateway = gatewayByName[gatewaySelect.selectAll(':checked').datum()], currency = currencySelect.selectAll(':checked').datum(), accounts = accountsByCurrency[currency], address = accounts && accounts.filter(function (d) {
            return d.gateway === gateway;
          })[0].address;
        event.change(address ? {
          currency: currency,
          issuer: address
        } : { currency: currency });
      }
    }
    dropdown.selected = function (_) {
      return arguments.length ? (selected = _, dropdown) : selected;
    };
    dropdown.getIssuers = function (currency) {
      var accounts = accountsByCurrency[currency], issuers = [];
      if (!accounts || !accounts.length)
        return issuers;
      issuers = accounts.map(function (d) {
        var c = currency;
        for (i = 0; i < d.currencies.length; i++) {
          if (typeof d.currencies[i] !== 'string' && d.currencies[i].label === currency) {
            c = d.currencies[i].code;
            break;
          }
        }
        return {
          currency: c,
          issuer: d.address
        };
      });
      return issuers;
    };
    dropdown.getName = function (issuer) {
      var gateway = gatewayByAddress[issuer];
      return gateway ? gateway.name : '';
    };
    return d3.rebind(dropdown, event, 'on');
  };
  function gatewayDropdown(selection, accounts) {
  }
}());