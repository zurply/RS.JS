var RS = function () {
    var self = this;

    this.initialize = function () {
        $(document).keydown(function (e) {
            if (e.keyCode == RS.Keys.ESCAPE) {
                if (RS.Alerter.isVisible()) {
                    RS.Alerter.hide();

                    return false;
                }
            }
        });

        $(document).ready(function (e) {
            RS.Controls.ControlsGenerator.generateControlsInContainer();
            RS.Controls.ControlsGenerator.listenForControls();

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

Array.prototype.filter = function (validateFunction) {
    return $.grep(this, validateFunction);
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

String.removeNonAlphaNumeric = String.prototype.removeNonAlphaNumeric = function (removeSpaces) {
    var i = 0;
    var string = (typeof (this) == "function" && !(i++)) ? arguments[0] : this;

    var pattern = removeSpaces ? /[^a-zA-Z0-9]/g : /[^a-zA-Z0-9 ]/g;

    string = string.replace(pattern, '');

    return string;
};

RS.Alerter = (function (selector, templateId) {
    var self = this;

    this.Options = {
        AutoHide: true,
        AutoHideAfter: 5000,
        HideOnClick: true,
        Selector: selector || ".primary-alert",
        TemplateId: templateId || 'alert-template',
        Position: {
            Pinned: false,
            Top: null,
            Right: null,
            Bottom: null,
            Left: null
        }
    };

    var defaultContainer = $("body");
    var hideTimeoutId = null;

    var templates = {
        alert: null
    };

    var getAlert = function (createIfNotExists, container, givenOptions) {
        container = container || defaultContainer;

        var options = RS.Core.copy(self.Options);
        if (givenOptions)
            options = $.extend(options, givenOptions);

        var alert = container.find(options.Selector);
        if (!alert.length && createIfNotExists) {
            if (!templates.alert)
                templates.alert = Handlebars.compile($("#" + options.TemplateId).html());

            alert = $(templates.alert({}));
            container.append(alert);

            if (options.Position.Pinned) {
                alert.css({
                    'position': 'fixed',
                    'top': options.Position.Top,
                    'right': options.Position.Right,
                    'bottom': options.Position.Bottom,
                    'left': options.Position.Left
                });
            }

            if (options.AutoHide && options.AutoHideAfter) {
                if (hideTimeoutId)
                    clearTimeout(hideTimeoutId);

                hideTimeoutId = setTimeout(function () { hide(container); }, options.AutoHideAfter)
            }

            var control = alert.data('Control');
            if (!control) {
                control = {};
                alert.data('Control', control);
                if (options.HideOnClick)
                    alert.bind('mousedown', function () { hide(container); return false; });
            }
        }

        return alert;
    };

    var show = function (alertType, title, message, container, options) {
        alert = getAlert(true, container, options);

        alertType = alertType || AlertTypes.Info;
        title = title || "";
        message = message || "";

        alert.removeClass('alert-success alert-info alert-warning alert-danger');
        alertType = alertType.toLowerCase();
        alert.addClass('alert-' + alertType);

        if (alertType === 'warning') {
            alert.css('background-color', RS.Constants.Alerts.Warning.BackgroundColor);
            alert.css('color', RS.Constants.Alerts.Warning.Color);
        }

        alert.find("strong").html(title);
        alert.find("span.message").html(message);

        return alert.show();
    };

    var hide = function (container) {
        if (hideTimeoutId)
            clearTimeout(hideTimeoutId);

        getAlert(false, container).hide();
    };

    var isVisible = function (container) {
        return getAlert(false, container).is(":visible");
    };

    var setDefaultContainer = function (container) {
        defaultContainer = container;
    };

    return {
        showInfo: function (message, title, container, options) {
            return show(RS.Alerter.AlertTypes.Info, title, message, container, options);
        },
        showWarning: function (message, title, container, options) {
            return show(RS.Alerter.AlertTypes.Warning, title, message, container, options);
        },
        showSuccess: function (message, title, container, options) {
            return show(RS.Alerter.AlertTypes.Success, title, message, container, options);
        },
        showDanger: function (message, title, container, options) {
            return show(RS.Alerter.AlertTypes.Danger, title, message, container, options);
        },
        show: function (alertType, message, title, container, options) {
            return show(alertType, title, message, container, options);
        },
        hide: function (container) {
            hide(container);
        },
        isVisible: function (container) {
            return isVisible(container);
        },
        setDefaultContainer: function (container) {
            setDefaultContainer(container);
        },
        getOptions: function () {
            return self.Options;
        }
    };
})();

RS.Alerter.AlertTypes = {
    Success: 'Success',
    Info: 'Info',
    Warning: 'Warning',
    Danger: 'Danger',
};

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
    interceptForm: function(form, beforeSubmitCallback, successCallback) {
        form = form || $("form:first");

        form.ajaxForm({
            beforeSubmit: function(arr, $form, options) {
                if (beforeSubmitCallback)
                    if (!beforeSubmitCallback())
                        return false;

                if (!$form.valid())
                    return false;
            },
            success: function(response) {
                if (successCallback)
                    successCallback(response);
            }
        });
    },
    clearFormValidation: function(form) {
        form = form || $("form:first");

        form.find('.validation-summary-errors ul').empty();
    },
    getQueryString: function(ji) {
        var hu = window.location.search.substring(1);
        var gy = hu.split("&");
        for (var i = 0; i < gy.length; i++) {
            var ft = gy[i].split("=");
            if (ft[0] == ji)
                return ft[1];
        }
    },
    getQueryStringValues: function(url) {
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
    getBodyHeight: function() {
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
    getViewPortHeight: function() {
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

                    var errorMessage = jqXHR && jqXHR.responseText ? jqXHR.responseText : defaultErrorMessage;

                    if (callback)
                        callback({
                            Error: errorMessage
                        });
                },
                beforeSend: function (jqXHR, settings) {
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
        }
    };
})();