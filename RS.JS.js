var RS = function () {
    var self = this;

    this.initialize = function () {
        $(document).ready(function (e) {
            if (RS.Controls) {
                RS.Controls.ControlsGenerator.generateControlsInContainer();
                RS.Controls.ControlsGenerator.listenForControls();
            }

            self.ready();
        });

        return self;
    };

    this.ready = function () { };
};

RS = new RS().initialize();

RS.Core = RS.Core || {};

RS.Core.copy = function (o, deep) {
    return deep ? jQuery.extend(true, {}, o) : jQuery.extend({}, o);
};

function extend(subClass, superClass) {
    var f = function () { };
    f.prototype = superClass.prototype;
    subClass.prototype = new f();
    subClass.prototype.constructor = subClass;

    subClass.superclass = superClass.prototype;
    if (superClass.prototype.constructor == Object.prototype.constructor)
        superClass.prototype.constructor = superClass;
};

var override = function (f, newCode) {
    if (!f)
        return null;

    if (!newCode)
        return f;

    var proxied = f;

    f = function () {
        proxied.apply(this, arguments);

        return newCode.apply(this, arguments);
    };

    return f;
};

RS.PubSub = function () {
    var self = this;

    var events = [];

    this.addEvent = function (eventName) {
        if (!eventName || getEvent(eventName))
            return;

        events.push({
            Name: eventName,
            Listeners: []
        });
    };

    this.removeEvent = function (eventName) {
        if (!eventName)
            return;

        for (var i = 0; i < events.length; i++) {
            var e = events[i];

            if (e.Name == eventName) {
                events.splice(i, 1);
                return;
            }
        }
    }

    this.addListener = function (eventName, listener) {
        if (!listener)
            return;

        var event = getEvent(eventName);
        if (!event)
            return;

        for (var i = 0; i < event.Listeners.length; i++) {
            var l = event.Listeners[i];
            if (l == listener)
                return;
        }

        event.Listeners.push(listener);
    };

    this.removeListener = function (eventName, listener) {
        if (!listener)
            return;

        var event = getEvent(eventName);
        if (!event)
            return;

        for (var i = 0; i < event.Listeners.length; i++) {
            var l = event.Listeners[i];
            if (l == listener) {
                event.Listeners.splice(i, 1);
                return;
            }
        }
    };

    this.triggerEvent = function (eventName, data) {
        var event = getEvent(eventName);
        if (!event)
            return;

        for (var i = 0; i < event.Listeners.length; i++) {
            var l = event.Listeners[i];
            if (l)
                l(data);
        }
    };

    var getEvent = function (eventName) {
        if (!eventName)
            return null;

        var searchedEvents = $.grep(events, function (el, index) { return el.Name == eventName });
        return searchedEvents.length ? searchedEvents[0] : null;
    };
};

RS.Constants = {
    Errors: {
        DefaultMessage: "An error occured on the server. Don't worry, it's not your fault."
    },
    Logs: {
        Colors: {
            Success: 'aquamarine',
            Error: 'tomato',
            Warning: '#ffcc00',
            Info: '#f9f9f9'
        }
    },
    Alerts: {
        Warning: {
            BackgroundColor: 'darkorange',
            Color: 'honeydew'
        }
    }
};

var RS = RS || {};

RS.Keys = {
    BACKSPACE: 8,
    CAPS_LOCK: 20,
    COMMA: 188,
    CONTROL: 17,
    ALT: 18,
    DELETE: 46,
    DOWN: 40,
    END: 35,
    ENTER: 13,
    ESCAPE: 27,
    HOME: 36,
    INSERT: 45,
    LEFT: 37,
    NUMPAD_ADD: 107,
    NUMPAD_DECIMAL: 110,
    NUMPAD_DIVIDE: 111,
    NUMPAD_MULTIPLY: 106,
    NUMPAD_SUBTRACT: 109,
    PAGE_DOWN: 34,
    PAGE_UP: 33,
    PERIOD: 190,
    RIGHT: 39,
    SHIFT: 16,
    SPACE: 32,
    TAB: 9,
    UP: 38,
    F: 70,
    V: 86,
    Y: 89,
    Z: 90,
    Zero: 48,
    One: 49,
    Two: 50,
    Three: 51,
    Four: 52,
    Five: 53,
    Six: 54,
    Seven: 55,
    Eight: 56,
    Nine: 57,
    ZeroNum: 96,
    OneNum: 97,
    TwoNum: 98,
    ThreeNum: 99,
    FourNum: 100,
    FiveNum: 101,
    SixNum: 102,
    SevenNum: 103,
    EightNum: 104,
    NineNum: 105,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    C: 67,
    CONTEXT_MENU: 93
};

RS.Guid = {
    empty: function () {
        return "00000000-0000-0000-0000-000000000000";
    },
    isEmpty: function (gid) {
        return gid == this.Empty() || typeof (gid) == 'undefined' || gid == null || gid == '';
    },
    isValid: function (value) {
        rGx = new RegExp("\\b(?:[A-F0-9]{8})(?:-[A-F0-9]{4}){3}-(?:[A-F0-9]{12})\\b");
        return rGx.exec((value || "").toUpperCase()) != null;
    },
    new: function () {
        if (arguments.length == 1 && this.IsValid(arguments[0])) {
            $(this).data("value", arguments[0]);
            value = arguments[0];
        }

        var res = [], hv;
        var rgx = new RegExp("[2345]");
        for (var i = 0; i < 8; i++) {
            hv = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            if (rgx.exec(i.toString()) != null) {
                if (i == 3) { hv = "6" + hv.substr(1, 3); }
                res.push("-");
            }
            res.push(hv.toUpperCase());
        }
        value = res.join('');
        $(this).data("value", value);
        return value;
    }
};

Array.prototype.findFirstIndex = function (validateFunction) {
    for (var i = 0; i < this.length; i++) {
        var item = this[i];
        if (validateFunction(item, i))
            return i;
    }

    return -1;
};

Array.prototype.findFirst = function (validateFunction) {
    var index = this.findFirstIndex(validateFunction);

    return index >= 0 ? this[index] : null;
};

Array.prototype.findFirstKeyValue = function (key, value) {
    if (!key)
        return null;

    return this.findFirst(function (item, index) { return item && item[key] == value; });
};

Array.prototype.findFirstKeyIndex = function (key, value) {
    if (!key)
        return null;

    return this.findFirstIndex(function (item, index) { return item && item[key] == value; });
};

var dateFormat = function () {
    var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    return function (date, mask, utc) {
        var dF = dateFormat;

        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d: d,
                dd: pad(d),
                ddd: dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m: m + 1,
                mm: pad(m + 1),
                mmm: dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy: String(y).slice(2),
                yyyy: y,
                h: H % 12 || 12,
                hh: pad(H % 12 || 12),
                H: H,
                HH: pad(H),
                M: M,
                MM: pad(M),
                s: s,
                ss: pad(s),
                l: pad(L, 3),
                L: pad(L > 99 ? Math.round(L / 10) : L),
                t: H < 12 ? "a" : "p",
                tt: H < 12 ? "am" : "pm",
                T: H < 12 ? "A" : "P",
                TT: H < 12 ? "AM" : "PM",
                Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

dateFormat.masks = {
    "default": "ddd mmm dd yyyy HH:MM:ss",
    shortDate: "m/d/yy",
    mediumDate: "mmm d, yyyy",
    longDate: "mmmm d, yyyy",
    fullDate: "dddd, mmmm d, yyyy",
    shortTime: "h:MM TT",
    mediumTime: "h:MM:ss TT",
    longTime: "h:MM:ss TT Z",
    isoDate: "yyyy-mm-dd",
    isoTime: "HH:MM:ss",
    isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

String.prototype.parseDate = function () {
    if (this.toString().indexOf('Date') >= 0)
        return new Date(parseInt(this.replace("/Date(", "").replace(")/", ""), 10));

    return new Date(this);
};

String.prototype.removeNonAlphaNumeric = function (removeSpaces) {
    var i = 0;
    var string = (typeof (this) == "function" && !(i++)) ? arguments[0] : this;

    var pattern = removeSpaces ? /[^a-zA-Z0-9]/g : /[^a-zA-Z0-9 ]/g;

    string = string.replace(pattern, '');

    return string;
};

String.prototype.replaceAll = function (find, replace) {
    return this.replace(new RegExp(find, 'g'), replace);
};

String.prototype.startsWith = function (str) {
    return this.slice(0, str.length) == str;
};

String.prototype.endsWith = function (str) {
    return this.slice(-str.length) == str;
};


(function (jQuery) {
    jQuery.fn.extend({
        getControl: function () {
            return this.data('control');
        },
        enable: function () {
            return this.prop('disabled', false);
        },
        disable: function () {
            return this.prop('disabled', true);
        },
        check: function () {
            return this.prop('checked', true);
        },
        uncheck: function () {
            return this.prop('checked', false);
        },
        attrs: function (startsWith) {
            var t = $(this);
            var a = [],
                r = t.get(0);
            if (r) {
                r = r.attributes;
                for (var i in r) {
                    var p = r[i];
                    if (typeof p.nodeValue !== 'undefined') {
                        if (startsWith && p.nodeName.indexOf(startsWith) == -1)
                            continue;

                        a.push({
                            Name: p.nodeName,
                            Value: p.nodeValue
                        });
                    }
                }
            }
            return a;
        }
    });
})(jQuery);

RS.Cache = (function () {
    var getValue = function (key, defaultValue) {
        var value = $.jStorage.get(key, defaultValue);

        return value;
    };

    var setValue = function (key, value) {
        $.jStorage.set(key, value);
    };

    return {
        get: function (key, defaultValue) {
            return getValue(key, defaultValue);
        },
        set: function (key, value) {
            setValue(key, value);
        }
    };
})();

RS.Event = {
    getEvent: function (e) {
        return e || window.event;
    },
    getTarget: function (e) {
        return e.target || e.srcElement;
    },
    stopPropagation: function (e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
    },
    preventDefault: function (e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
    },
    stopEvent: function (e) {
        this.stopPropagation(e);
        this.preventDefault(e);
        return false;
    },
    sendEvent: function (parent, eventName, data) {
        var event = jQuery.Event(eventName);
        if (data != null && data != undefined)
            event.Data = data;
        parent = parent ? parent : $(document);
        parent.trigger(event);
    }
};

RS.LogTypes = {
    Info: 'Info',
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error'
};

RS.Logger = function () {
    var self = this;

    var defaults = {
        BackgroundColor: '#fff',
        TextColor: '#333',
        Category: {
            Background: '#fff',
            Text: 'green'
        },
        IsOn: false
    };

    this.Options = defaults;

    var log = function (logType, message, details, category) {
        if (!defaults.IsOn)
            return;

        if (!message)
            return;

        if (category)
            writeToConsole(category + ':', defaults.Category.Background, defaults.Category.Text);

        writeToConsole(message);
        if (details)
            writeToConsole(details);
    };

    var writeToConsole = function (message, backgroundColor, textColor) {
        backgroundColor = backgroundColor || defaults.BackgroundColor;
        textColor = textColor || defaults.TextColor;

        if (typeof message == "object") {
            console.log(message);
        } else {
            console.log("%c" + message, "color:" + textColor + ";font-weight:bold; background-color: " + backgroundColor + ";");
        }
    };

    this.logInfo = function (message, details, category) { log(RS.LogTypes.Info, message, details, category); }
    this.logSucces = function (message, details, category) { log(RS.LogTypes.Success, message, details, category); }
    this.logWarning = function (message, details, category) { log(RS.LogTypes.Warning, message, details, category); }
    this.logError = function (message, details, category) { log(RS.LogTypes.Error, message, details, category); }
};

RS.Logger = new RS.Logger();

RS.Utils = {
    interceptForm: function (form, beforeSubmitCallback, successCallback) {
        form = form || $("form:first");

        form.ajaxForm({
            beforeSubmit: function (arr, $form, options) {
                if (beforeSubmitCallback)
                    if (!beforeSubmitCallback())
                        return false;

                if (!$form.valid())
                    return false;
            },
            success: function (response) {
                if (successCallback)
                    successCallback(response);
            }
        });
    },
    clearFormValidation: function (form) {
        form = form || $("form:first");

        form.find('.validation-summary-errors ul').empty();
    },
    getQueryString: function (ji) {
        var hu = window.location.search.substring(1);
        var gy = hu.split("&");
        for (var i = 0; i < gy.length; i++) {
            var ft = gy[i].split("=");
            if (ft[0] == ji)
                return ft[1];
        }
    },
    getQueryStringValues: function (url) {
        url = new String(url);

        var queryStringValues = new Object(),
            querystring = url.substring((url.indexOf('?') + 1), url.length),
            querystringSplit = querystring.split('&');

        for (i = 0; i < querystringSplit.length; i++) {
            var pair = querystringSplit[i].split('='),
                name = pair[0],
                value = pair[1];

            queryStringValues[name] = value;
        }

        return queryStringValues;
    },
    getBodyHeight: function () {
        var height, scrollHeight, offsetHeight;
        if (document.height) {
            height = document.height;
        } else if (document.body) {
            if (document.body.scrollHeight)
                height = scrollHeight = document.body.scrollHeight;
            if (document.body.offsetHeight)
                height = offsetHeight = document.body.offsetHeight;
            if (scrollHeight && offsetHeight)
                height = Math.max(scrollHeight, offsetHeight);
        }
        return height;
    },
    getViewPortHeight: function () {
        var height = 0;
        if (window.innerHeight)
            height = window.innerHeight - 18;
        else if ((document.documentElement) && (document.documentElement.clientHeight))
            height = document.documentElement.clientHeight;
        else if ((document.body) && (document.body.clientHeight))
            height = document.body.clientHeight;

        return height;
    },
    isInsideElement: function (pos, el) {
        if (!pos || !el)
            return false;

        var offset = el.offset();
        if (!offset)
            return false;

        var isInside = pos.x >= offset.left && pos.x <= offset.left + el.outerWidth() && pos.y >= offset.top && pos.y <= offset.top + el.outerHeight();

        return isInside;
    },
    getOptionsFromAttributes: function (el, name) {
        if (!el || !name)
            return null;

        var optionsFromAttributes = el.attr(name);
        if (optionsFromAttributes)
            return JSON.parse(optionsFromAttributes);

        return null;
    },
    getBindingFromAttributes: function (element) {
        var text = element.attr('data-bind');
        if (!text)
            return null;

        var binding = {};

        var optionsPos = text.indexOf(',');
        if (optionsPos > -1) {
            binding.Expression = text.substr(0, optionsPos);
            binding.Options = text.length > optionsPos + 1 ? JSON.parse(text.substr(optionsPos + 1)) : null
        }
        else {
            binding.Expression = text;
        }

        return binding;
    },
    getValue: function (model, property) {
        if (!model || !property)
            return null;

        var value = model;

        do {
            var pos = property.indexOf('.');
            if (pos > -1) {
                var prop = property.substr(0, pos);
                value = value[prop];
                if (!value)
                    break;

                property = property.substr(pos + 1);
            }
            else if (property) {
                value = value[property];
            }
        }
        while (pos > -1);

        return value;
    },
    getBoundNames: function (value) {
        if (!value)
            return null;

        var m = value.match(/{{\s*[^{}]+\s*}}/g);
        if (m)
            m = m.map(function (x) {
                if (x && x.length >= 4) {
                    x = x.substr(2);
                    x = x.substr(0, x.length - 2);
                    if (x.indexOf('{') == -1)
                        return x;
                }

                return x.match(/[\w\.]+/)[0];
            });

        return m;
    }
};

RS.Remote = (function () {
    var self = this;

    var apiToken = null;
    var baseUrl = null;

    var setToken = function (value) {
        apiToken = value
    };

    var setBaseUrl = function (value) {
        baseUrl = value
    };

    return {
        call: function (url, data, callback, type, processData, dataType, contentType) {
            url = (baseUrl || "") + url;
            type = type || 'GET';
            var dataToSend = data && type == 'POST' ? JSON.stringify(data) : data;

            if (processData == null || processData == undefined)
                processData = !type || type == 'GET';

            $.ajax({
                type: type,
                dataType: "json",
                async: true,
                cache: false,
                url: url,
                data: dataToSend,
                contentType: contentType || "application/json; charset=utf-8",
                dataType: dataType || null,
                processData: processData,
                success: function (response) {
                    if (callback)
                        callback(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    var defaultErrorMessage = "An error occured on the server. Don't worry, it's not your fault.";
                    var errorMessage = null;

                    if (jqXHR && jqXHR.responseText) {
                        try {
                            var response = JSON.parse(jqXHR.responseText);
                            if (response.Error)
                                errorMessage = response.Error;
                        }
                        catch (e) {
                            errorMessage = jqXHR.responseText;
                        }
                    }

                    if (!errorMessage && errorThrown && errorThrown.message)
                        errorMessage = errorThrown.message;

                    var errorMessage = errorMessage || defaultErrorMessage;

                    if (callback)
                        callback({
                            Error: errorMessage
                        });
                },
                beforeSend: function (jqXHR, settings) {
                    if (!apiToken || apiToken.length === 0)
                        apiToken = RS.Cache.get('token');

                    if (apiToken && apiToken.length) {
                        jqXHR.setRequestHeader('Authentication-Token', apiToken);
                    }
                }
            });
        },
        setToken: function (value) { setToken(value); },
        setBaseUrl: function (value) { setBaseUrl(value); }
    };
})();

$.validator.defaults.ignore = '';

//--- BEGIN nonalphanumeric ---

$.validator.addMethod('nonalphanumeric', function(value, element, param) {
    var isValid = false;
    if (value.length == 0) {
        isValid = true;
    } else {
        var nonAlphaNumericStrippedValue = value.removeNonAlphaNumeric();
        isValid = nonAlphaNumericStrippedValue.length == value.length;
    }

    return isValid;
});

$.validator.unobtrusive.adapters.add('nonalphanumeric', {}, function(options) {
    options.rules['nonalphanumeric'] = true;
    options.messages['nonalphanumeric'] = options.message;
});

//--- END nonalphanumeric ---

//--- BEGIN nospaces ---

$.validator.addMethod('nospaces', function(value, element, param) {
    var isValid = false;
    if (value.length == 0) {
        isValid = true;
    } else {
        isValid = true;
        for (var i = 0; i < value.length; i++) {
            if (value[i] == ' ') {
                isValid = false;
                break;
            }
        }
    }

    return isValid;
});

$.validator.unobtrusive.adapters.add('nospaces', {}, function(options) {
    options.rules['nospaces'] = true;
    options.messages['nospaces'] = options.message;
});

//--- END nospaces ---

RS.Validators = (function () {
    return {
        validateIP: function (inputText) {
            var ipformat = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

            return inputText.match(ipformat);
        }
    };
})();

Handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2)
        return options.fn(this);
		
    return options.inverse(this);
});

Handlebars.registerHelper('disabled', function (isDisabled, inverse, options) {
    if (inverse)
        isDisabled = !isDisabled;

    return isDisabled ? 'disabled="disabled"' : null;
});

Handlebars.registerHelper('checked', function (isChecked, inverse, options) {
    if (inverse)
        isChecked = !isChecked;

    return isChecked ? 'checked="checked"' : null;
});

Handlebars.registerHelper('dateFormat', function (date, format, options) {
    if (typeof format === 'object' || format === null)
        format = 'mmm d, yyyy HH:MM';

    return date ? date.parseDate().format(format) : null;
});

Handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
});

Handlebars.registerHelper('log', function (variable) {
    console.log(variable);
});

Handlebars.registerHelper("random", function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
});

RS.HandlebarsRenderer = (function () {

    return {
        Render: function (data, template, container, callback, append) {
            data = data || [];
            var html = template({ data: data });

            if (append)
                container.append(html);
            else container.html(html);

            if (callback)
                callback();
        },
        GetHtml: function (data, template) {
            data = data || [];
            var html = template({ data: data });

            return html;
        }
    };
})();

RS.BoundElement = function (element) {
    var self = this;

    this.Element = element;
    this.InitialExpression = null;
    this.Matches = null;
    this.Binding = RS.Utils.getBindingFromAttributes(element);

    var bound = false;

    this.DataBindExpression = this.Binding ? this.Binding.Expression : null;
    this.BindingOptions = null;
    if (this.DataBindExpression) {
        this.InitialExpression = this.DataBindExpression;
        this.DataBindExpression = this.DataBindExpression.replaceAll('{{', '').replaceAll('}}', '');
        this.Matches = [this.DataBindExpression];
    }
    else {
        this.InitialExpression = element.text();
        this.Matches = this.InitialExpression ? RS.Utils.getBoundNames(this.InitialExpression) : null;
    }

    this.VisibilityExpression = element.attr('data-bind-visible');

    this.solve = function (controller, e) {
        if (!controller)
            return;

        if (e && e.Source == self)
            return;

        if (e && e.IsSource && self.DataBindExpression && controller.Model && bound) {
            var value = self.getValue();

            var currentValue = controller.Model[self.DataBindExpression];

            if (currentValue == value)
                return;

            controller.Model[self.DataBindExpression] = value;
            controller.Model.PubSub.triggerEvent('change', {
                Source: self,
                Property: self.DataBindExpression,
                Value: value
            });
        }

        if ((!e || (e && !e.IsSource))) {
            if (self.Matches && self.Matches.length) {
                var result = solveFullExpression(controller, self.InitialExpression, self.Matches);
                self.setValue(value, result);
            }

            if (self.VisibilityExpression) {
                var visibilityMatches = RS.Utils.getBoundNames(self.VisibilityExpression);
                var isVisible = solveFullExpression(controller, self.VisibilityExpression, visibilityMatches);
                isVisible = isVisible === true || (typeof isVisible == "string" && isVisible.toLowerCase() == 'true');
                if (isVisible)
                    element.show();
                else element.hide();
            }
        }

        bound = true;
    };

    this.setValue = function (value, result) {
        if (self.Element[0].tagName.toLowerCase() == 'input') {
            if (self.Element.is(":checkbox")) {
                if (result)
                    result = typeof result == 'string' ? result.toLowerCase() == 'true' : result;

                if (result)
                    self.Element.check();
                else self.Element.uncheck();
            }
            else if (self.Element.is(":radio")) {
                var currentValue = self.getValue();
                if (result == currentValue)
                    self.Element.check();
                else self.Element.uncheck();
            }
            else self.Element.val(result);
        }
        else if (self.Element[0].tagName.toLowerCase() == 'select') {
            self.Element.val(result);
        }
        else {
            var control = self.Element.getControl();
            if (control) {
                if (typeof control == 'object') {
                    control.setValue(result, self.Binding && self.Binding.Options ? self.Binding.Options.Source : null);
                }
            }
            else {
                self.Element.html(result);
            }
        }
    };

    this.getValue = function () {
        var value = null;

        var control = self.Element.getControl();
        if (control)
            value = typeof control == 'object' ? RS.Utils.getValue(control, self.Binding.Options.Source) : null;
        else if (self.Element.is(":checkbox"))
            value = self.Element.is(":checked");
        else value = self.Element.val();

        return value;
    };

    this.getEventsTriggeringChange = function () {
        if (self.Element.is(":checkbox") || self.Element.is(":radio"))
            return 'change';

        if (self.Element[0].tagName.toLowerCase() == 'input')
            return 'keyup keydown';

        return 'change';
    };

    var solveExpression = function (expression, model) {
        if (!model) {
            var unsolvedVariables = Parser.parse(expression).variables();
            if (unsolvedVariables) {
                model = {};
                for (var j = 0; j < unsolvedVariables.length; j++)
                    model[unsolvedVariables[j]] = '';
            }
        }

        var processedExpression = preprocessExpression(expression);
        var parsedExpression = Parser.parse(processedExpression, model).simplify(model);
        var value = parsedExpression.evaluate();

        return value;
    };

    var preprocessExpression = function (expression) {
        if (!expression)
            return null;

        return expression;
    };

    var solveFullExpression = function (controller, expression, matches) {
        if (!expression || !matches || !matches.length)
            return expression;

        var result = expression;
        for (var i = 0; i < matches.length; i++) {
            var expression = matches[i];
            var value = solveExpression(expression, controller.Model);
            result = result.replace('{{' + expression + '}}', value);
        }

        return result;
    }
};

RS.Controller = function (name, model) {
    var self = this;

    this.Name = name;
    this.Model = model;
    this.BoundElements = null;
    this.PubSub = new RS.PubSub();

    var initialize = function () {
        self.PubSub.addEvent('change');
    };

    this.bindElement = function (boundElement) {
        if (!boundElement)
            return;

        self.BoundElements = self.BoundElements || [];
        self.BoundElements.push(boundElement);

        if (boundElement.DataBindExpression) {
            var control = boundElement.Element.getControl();

            if (control && typeof control == 'object') {
                control.PubSub.addListener('change', function () {
                    boundElement.solve(self, {
                        IsSource: true
                    });
                });
            }
            else {
                boundElement.Element.bind(boundElement.getEventsTriggeringChange(), function () {
                    boundElement.solve(self, {
                        IsSource: true
                    });
                });
            }
        }

        if (self.Model)
            boundElement.solve(self);
    };

    this.setModel = function (model) {
        this.Model = model;
        if (!model || !model.PubSub)
            return;

        solveBoundElements();
        model.PubSub.addListener('change', function (e) {
            self.PubSub.triggerEvent('change', e);
            solveBoundElements(e);
        });
    };

    var solveBoundElements = function (e) {
        if (!self.BoundElements || !self.BoundElements.length)
            return;

        for (var i = 0; i < self.BoundElements.length; i++) {
            var boundElement = self.BoundElements[i];
            boundElement.solve(self, e);
        }
    };

    this.refresh = function () {
        solveBoundElements();
    };

    initialize();
};

RS.ControllersManager = function () {
    var self = this;

    this.Controllers = {};

    this.initialize = function () {
        getBindings();

        $(document).on('DOMNodeInserted', function (e) {
            var elementInserted = $(e.target);
            getBindings(elementInserted.parent());
        });
    };

    this.registerModel = function (name, instance) {
        self.Controllers[name] = self.Controllers[name] || new RS.Controller();
        var controller = self.Controllers[name];
        controller.Name = name;

        if (instance) {
            if (!instance.PubSub) {
                instance.PubSub = new RS.PubSub();
                instance.PubSub.addEvent('change');
            }
        }

        controller.setModel(instance);

        return controller;
    };

    var getBindings = function (container) {
        container = container || $(document);

        var children = container.find("*");
        children.each(function () {
            var el = $(this);

            var controller = self.getElementController(el, true);
            if (!controller)
                return;

            var boundElement = null;

            if (!el.data('in-binding') && el.attr('data-bind')) {
                boundElement = new RS.BoundElement(el);
                el.data('in-binding', true);
            }
            else if (!el.data('out-binding') && (el.text() || '').indexOf('{{') > -1) {
                boundElement = new RS.BoundElement(el);
                el.data('out-binding', true);
            }
            else if (!el.data('visibility-binding') && el.attr('data-bind-visible')) {
                boundElement = new RS.BoundElement(el);
                el.data('visibility-binding', true);
            }

            if (boundElement)
                controller.bindElement(boundElement);

            if (!el.data('click-binding')) {
                var clickBinding = el.attr('data-bind-click');
                if (clickBinding) {
                    el.click(function () {
                        var controller = self.getElementController(el);
                        if (!controller || !controller.Model || !controller.Model[clickBinding] || typeof controller.Model[clickBinding] != 'function')
                            return;

                        controller.Model[clickBinding](el);

                        return false;
                    });
                }

                el.data('click-binding', true);
            }
        });
    };

    this.getElementController = function (el, registerIfNotExists) {
        if (!el)
            return null;

        var existingController = el.data('Controller');
        if (existingController)
            return existingController;

        var controller = el.parents('[data-controller]:first');
        if (!controller.length)
            return null;

        var controllerName = controller.attr('data-controller');
        if (!controllerName)
            return null;

        existingController = self.Controllers[controllerName];
        if (!existingController && registerIfNotExists)
            existingController = self.registerModel(controllerName);

        el.data('Controller', existingController);

        return existingController;
    };

    self.initialize();
};
RS.ControllersManager = new RS.ControllersManager();