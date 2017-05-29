Handlebars.registerHelper('getColumnValue', function (item, column, options) {
    var value = item[column.Name];

    if (value && column.Type == 'DateTime') {
        value = value.parseDate();
        value = value.format(column.Format);
    }

    return value;
});

Handlebars.registerHelper('showProperty', function (control, item, options) {
    return item[control.Options.DisplayName || 'Text'];
});

Handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
});

Handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }

    return options.inverse(this);
});

Handlebars.registerHelper("random", function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
});

Handlebars.registerHelper('getCellValue', function (item, column, options) {
    var value = item && item.Cells && item.Cells.length > options.data.index ? item.Cells[options.data.index].Value : null;

    if (value && column.Type == 'DateTime') {
        value = value.parseDate();
        value = value.format(column.Format);
    }

    return value;
});

Handlebars.registerHelper('getDataSetColumnValue', function (control, row, options) {
    if (!control || !control.Options || !control.Columns || isNaN(control.Options.DisplayColumnIndex))
        return null;

    var value = row && row.Cells && row.Cells.length > control.Options.DisplayColumnIndex ? row.Cells[control.Options.DisplayColumnIndex].Value : null;
    var column = control.Columns[control.Options.DisplayColumnIndex];

    if (value && column.Type == 'DateTime') {
        value = value.parseDate();
        value = value.format(column.Format);
    }

    return value;
});

RS.Controls = {};

RS.Controls.Control = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: null,
        IsEnabled: true,
        Content: null,
        KeepOptionsFromStart: false
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    self.Options = $.extend(self.Options, RS.Utils.getOptionsFromAttributes(container, 'data-options'));

    this.Elements = {
        Me: container
    };

    this.PubSub = new RS.PubSub();

    this.initialize = function () {
        self.PubSub.addEvent('change');

        self.initializeFromContainer();
        self.initializeHtml();

        return self;
    };

    this.initializeHtml = function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.data('control', self);

        if (self.Options.IsEnabled)
            self.enable();
        else self.disable();

        return self;
    };

    this.initializeFromContainer = function () {
        if (!container)
            return self;

        self.Options.IsEnabled = container.attr('disabled') != 'disabled';

        var templateIdFromAttribute = container.attr('data-template');
        var itemTemplateIdFromAttribute = container.attr('data-item-template');

        if (!templateIdFromAttribute && !itemTemplateIdFromAttribute)
            return self;

        var template = self.getDefaultTemplate();
        if (!template) {
            template = {
                IsDefault: true
            };

            if (!self.Options.Templates)
                self.Options.Templates = [];

            self.Options.Templates.push(template);
        }

        if (templateIdFromAttribute)
            template.Id = templateIdFromAttribute;

        if (itemTemplateIdFromAttribute)
            template.ItemTemplateId = itemTemplateIdFromAttribute;

        return self;
    };

    this.appendTo = function (parent, replace) {
        if (!parent || (self.Elements.Me && parent && self.Elements.Me.parent()[0] == parent[0]))
            return;

        if (!self.Elements.Me) {
            var html = self.generateHtml();
            if (!html)
                return;

            self.Elements.Me = $(html);
            self.Elements.Me.data('control', self);
        }
        else self.Elements.Me.remove();

        var children = self.getChildren();
        if (children) {
            var childrenContainer = self.getChildrenContainer();
            for (var i = 0; i < children.length; i++)
                children[i].appendTo(childrenContainer);
        }

        if (replace) {
            transferAttributes(parent, self.Elements.Me);
            var existingId = parent.attr('id');
            parent.replaceWith(self.Elements.Me);
            if (existingId)
                self.Elements.Me.attr('id', existingId);
        }
        else parent.append(self.Elements.Me);

        return self.initializeHtml();
    };

    this.generateHtml = function () {
        var template = self.getDefaultTemplate();
        if (!template)
            return null;

        template.Compiled = template.Compiled || Handlebars.compile($("#" + template.Id).html());
        if (!template.Compiled)
            return null;

        var html = template.Compiled({
            Control: self
        });

        return html;
    };

    this.getTemplate = function (name) {
        if (!self.Options.Templates || !self.Options.Templates.length)
            return null;

        return self.Options.Templates.findFirstKeyValue('Name', name);
    };

    this.getDefaultTemplate = function () {
        if (!self.Options.Templates || !self.Options.Templates.length)
            return null;

        var defaultTemplate = self.Options.Templates.findFirstKeyValue('IsDefault', true) || self.Options.Templates[0];

        return defaultTemplate;
    };

    this.getChildrenContainer = function () {
        if (!self.Elements.Me)
            return null;

        var main = self.Elements.Me.find('[role="main"]:first');
        if (!main.length)
            main = self.Elements.Me;

        return main;
    };

    this.setContent = function (content) {
        self.Options.Content = content;

        var childrenContainer = self.getChildrenContainer();
        if (!childrenContainer)
            return;

        childrenContainer.empty().append(content);

        return self;
    };

    this.disable = function () {
        setEnabled(false);
    };

    this.enable = function () {
        setEnabled(true);
    };

    var setEnabled = function (isEnabled) {
        if (!self.Elements.Me)
            return;

        self.Options.IsEnabled = isEnabled;

        if (isEnabled)
            self.Elements.Me.removeAttr('disabled');
        else self.Elements.Me.attr('disabled', 'disabled');
    };

    this.getChildren = function () { return null; }

    this.getIdentifier = function () { return 'Control'; }

    this.setValue = function (value, property, options) {

    };

    var transferAttributes = function (source, destination) {
        if (!source || !destination)
            return;

        var escapeAttributes = ["data-control", "data-options", "data-source-options"];

        var attributes = source.attrs();
        for (var i = 0; i < attributes.length; i++) {
            var a = attributes[i];
            if (!a.Name || escapeAttributes.findFirstIndex(function (item) { return item == a.Name; }) >= 0)
                continue;

            if (a.Name.toLowerCase() == 'class') {
                var classes = source.attr('class').split(' ');
                for (var j = 0; j < classes.length; j++) {
                    var c = classes[j];
                    if (!c)
                        continue;

                    if (!destination.hasClass(c))
                        destination.addClass(c);
                }
            }
            else {
                destination.attr(a.Name, a.Value);
            }
        }
    };

    if (!isInherited)
        self.initialize();
};

RS.Controls.DataSource = function (options, isInherited) {
    var self = this;

    this.Options = {
        Data: null,
        RemoteCall: {
            Url: null,
            Type: 'GET',
            Parameters: null
        },
        Paging: {
            IsEnabled: true
        },
        IsCaseSensitive: false,
        IsComplex: false
    };

    if (options)
        this.Options = $.extend(this.Options, options);

    this.PubSub = null;
    this.IsLoading = false;
    this.PageIndex = -1;
    this.FilteredData = null;
    this.HasMoreData = true;

    var lastPageIndexToLoad = -1;

    this.initialize = function () {
        self.PubSub = new RS.PubSub();
        self.PubSub.addEvent('refresh');
        self.PubSub.addEvent('add');
        self.PubSub.addEvent('remove');
        self.PubSub.addEvent('clear');

        return self;
    };

    this.goToNextPage = function (callback) {
        if (!self.HasMoreData)
            return;

        self.goToPage(self.PageIndex + 1, callback);
    };

    this.goToPage = function (pageIndex, callback) {
        options = options || {};
        options.PageIndex = pageIndex;
        self.loadData(options, callback);
    };

    this.refresh = function (options, callback) {
        if (self.Options.Data && self.Options.RemoteCall.Url)
            self.clear({
                IsRefresh: true
            });

        options = options || {};
        options.IsRefresh = true;
        self.loadData(options, callback);
    };

    this.loadData = function (options, callback) {
        if (self.hasRemoteCall())
            self.getRemoteData(options, function (response) { onGotData(options, response); if (callback) callback(); });
        else self.getLocalData(options, function (response) { onGotData(options, response); if (callback) callback(); });
    };

    this.hasRemoteCall = function () {
        return self.Options.RemoteCall.Url != null;
    };

    this.clear = function (options) {
        self.PageIndex = -1;
        self.Options.Data = null;
        self.HasMoreData = true;

        self.PubSub.triggerEvent('clear', {
            Source: self,
            Options: options
        });
    };

    this.addItem = function (items, index) {
        if (!items)
            return self;

        self.Options.Data = self.Options.Data || [];

        index = Math.max(0, Math.min(self.Options.Data.length - 1, index || self.Options.Data.length - 1));

        if (items instanceof Array) {
            for (var i = 0; i < items.length; i++)
                self.Options.Data.splice(index + i, 0, items);
        }
        else self.Options.Data.splice(index, 0, items);

        self.PubSub.triggerEvent('add', {
            Source: self,
            Items: items,
            Index: index
        });

        return self;
    };

    this.removeItem = function (index, number) {
        if (!self.Options.Data)
            return self;

        number = number || 1;

        self.Options.Data.splice(index, number);

        self.PubSub.triggerEvent('add', {
            Source: self,
            Index: index,
            Number: number
        });

        return self;
    };

    this.getParameter = function (name) {
        if (!self.Options.RemoteCall || !self.Options.RemoteCall.Parameters || !name)
            return;

        var p = self.Options.RemoteCall.Parameters.findFirst(function (item, index) { return item.Name == name; });

        return p;
    };

    this.setParameter = function (name, value, model) {
        self.Options.RemoteCall.Parameters = setParameterValue(self.Options.RemoteCall.Parameters, name, value, model);
    };

    this.buildUrl = function () {
        if (!self.Options.RemoteCall || !self.Options.RemoteCall.Url)
            return null;

        if (!self.Options.RemoteCall.Parameters || self.Options.RemoteCall.Type == "GET")
            return self.Options.RemoteCall.Url;

        var url = self.Options.RemoteCall.Url + "?";

        for (var i = 0; i < self.Options.RemoteCall.Parameters.length; i++) {
            var p = self.Options.RemoteCall.Parameters[i];
            if (!p)
                continue;

            if (p.Value || (!p.Value && p.IsMandatory))
                url += p.Name + "=" + (p.Value || "") + "&";
        }

        return url;
    };

    var setParameterValue = function (parameters, name, value, model) {
        if (!name)
            return parameters;

        if (!parameters)
            parameters = [];

        var found = false;
        for (var i = 0; i < parameters.length; i++) {
            var p = parameters[i];
            if (p.Name == name || p.Binding == name || (p.Binding && p.Binding.startsWith(name + '.'))) {
                if (p.Binding && model)
                    value = RS.Utils.getValue(model, p.Binding);

                p.Value = value;
                found = true;
            }
        }

        if (!found)
            parameters.push({
                Name: name,
                Value: value
            });

        return parameters;
    };

    this.getRemoteData = function (options, callback) {
        if (!self.Options.RemoteCall)
            return;

        if (!areRequiredParametersValid()) {
            self.clear();
            return;
        }

        self.IsLoading = true;

        var data = getDataFromParameters(self.Options.RemoteCall.Parameters);

        if (self.Options.Paging.IsEnabled) {
            data = data || [];
            var pageIndexRequired = options ? Math.max(0, options.PageIndex || self.PageIndex) : 0;
            if (self.Options.IsComplex) {
                data.Parameters = data.Parameters || [];
                data.Parameters.push({
                    Name: 'pageIndex',
                    Value: pageIndexRequired
                });
            }
            else data.pageIndex = pageIndexRequired;

            lastPageIndexToLoad = pageIndexRequired;
        };

        var url = self.buildUrl();

        if (url)
            RS.Remote.call(self.Options.RemoteCall.Url, data, function (response) {
                if (self.Options.Paging.IsEnabled)
                    self.PageIndex = Math.max(self.PageIndex, data.pageIndex || 0);

                if (data.pageIndex == lastPageIndexToLoad)
                    self.IsLoading = false;

                if (callback)
                    callback(response);
            }, self.Options.RemoteCall.Type);
    };

    var areRequiredParametersValid = function () {
        if (!self.Options.RemoteCall.Parameters)
            return true;

        var p = self.Options.RemoteCall.Parameters.findFirst(function (item) { return item.IsMandatory && !item.Value; });

        return p == null;
    };

    var getDataFromParameters = function (parameters) {
        if (!parameters)
            return null;

        var data = {};
        for (var i = 0; i < parameters.length; i++) {
            var p = parameters[i];

            if (self.Options.IsComplex) {
                data.Parameters = data.Parameters || [];
                data.Parameters.push({
                    Name: p.Name,
                    Value: p.Value
                });
            }
            else data[p.Name] = p.Value;
        }

        return data;
    };

    this.getLocalData = function (options, callback) {
        var data = self.Options.Data;

        if (data) {
            if (self.Options.IsComplex) {
                data = self.Options.Data && self.Options.Data.length ? self.Options.Data[0] : null;
            }

            var term = self.getParameter('term');
            if (term) {
                if (!self.Options.IsCaseSensitive)
                    term = term.toLowerCase();

                data = $.grep(data, function (item, index) { return item && item.Text && ((self.Options.IsCaseSensitive && item.Text.indexOf(term) > -1) || (!self.Options.IsCaseSensitive && item.Text.toLowerCase().indexOf(term) > -1)); });
            }
        }

        if (callback)
            callback(data);

        return data;
    };

    this.getDataSet = function () {
        if (!self.Options.Data)
            return null;

        return self.Options.IsComplex ? (self.Options.Data && self.Options.Data.length ? self.Options.Data[0].DataSet : null) : self.Options.Data;
    };

    this.getItemFromRow = function (row) {
        if (!row || !row.Cells || !self.Options.IsComplex)
            return null;

        var data = self.getLocalData();
        if (!data || !data.Header || !data.Header.Columns)
            return null;

        var item = {};
        for (var i = 0; i < Math.min(row.Cells.length, data.Header.Columns.length); i++) {
            var c = data.Header.Columns[i];
            if (!c)
                continue;

            item[c.Name] = row.Cells[i].Value;
        }

        return item;
    };

    var onGotData = function (options, response) {
        self.Options.Data = self.Options.Data || [];

        if (options && options.IsRefresh)
            self.FilteredData = [];

        self.FilteredData = self.FilteredData || [];

        if (self.hasRemoteCall() && response) {
            var gotMoreData = false;
            if (response instanceof Array) {
                for (var i = 0; i < response.length; i++) {
                    self.Options.Data.push(response[i]);
                    self.FilteredData.push(response[i]);
                }

                gotMoreData = response.length > 0;
            }
            else {
                self.Options.Data.push(response);
                self.FilteredData.push(response[i]);

                gotMoreData = response[i];
            }
        }

        if (!gotMoreData)
            self.HasMoreData = false;

        if (!self.Options.RemoteCall.Url) {
            self.FilteredData = response;
        }

        self.PubSub.triggerEvent('refresh', {
            Source: self,
            Options: options,
            Data: response
        });
    };

    if (!isInherited)
        self.initialize();
};

RS.Controls.Container = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [{
            IsDefault: true,
            Id: 'container-template'
        }]
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Container.superclass.constructor.call(this, self.Options, container, true);

    this.getChildrenContainer = function () {
        if (!self.Elements.Me)
            return null;

        return self.Elements.Me.find('[role="main"]:first');
    };

    this.getIdentifier = function () { return 'Container'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Container, RS.Controls.Control);

RS.Controls.NotificationTypes = {
    Success: 'alert-success',
    Info: 'alert-info',
    Warning: 'alert-warning',
    Danger: 'alert-danger'
};

RS.Controls.Notification = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'notification-template'
            }
        ],
        Type: RS.Controls.NotificationTypes.Info,
        Title: null,
        Message: null,
        IsPinned: true,
        Position: {
            Top: null,
            Right: null,
            Bottom: null,
            Left: null
        },
        AutoHide: true,
        AutoHideAfter: 5000,
        HideOnClick: true
    };

    var hideTimeoutId = null;

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Notification.superclass.constructor.call(this, self.Options, container, true);

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.css({
            'position': self.Options.IsPinned ? 'fixed' : 'relative',
            'top': self.Options.Position.Top,
            'right': self.Options.Position.Right,
            'bottom': self.Options.Position.Bottom,
            'left': self.Options.Position.Left
        });

        self.Elements.Me.bind('mousedown', function (e) {
            if (self.Options.HideOnClick) {
                self.hide();

                return false;
            }
        });

        self.Elements.Me.find('[role="close"]').click(function (e) {
            self.hide();

            return false;
        });

        return self;
    });

    this.show = function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.show();

        if (self.Options.AutoHide && self.Options.AutoHideAfter) {
            if (hideTimeoutId)
                clearTimeout(hideTimeoutId);

            hideTimeoutId = setTimeout(function () { self.hide(); }, self.Options.AutoHideAfter)
        }

        return self;
    };

    this.hide = function () {
        if (!self.Elements.Me)
            return self;

        if (hideTimeoutId)
            clearTimeout(hideTimeoutId);

        self.Elements.Me.remove();

        return self;
    };

    this.setType = function (type) {
        type = type || RS.Controls.NotificationTypes.Info;
        self.Options.Type = type;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.removeClass('alert-success alert-info alert-warning alert-danger').addClass(type);

        return self;
    }

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container)
            return;

        self.Options.Title = getTitleFromElement();
        self.Options.Message = getMessageFromElement();
        self.Options.Type = getTypeFromElement();

        return self;
    });

    this.setTitle = function (title) {
        self.Options.Title = title;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.find('[role="title"]').text(title);

        return self;
    };

    var getTitleFromElement = function () {
        if (!self.Elements.Me)
            return null;

        return self.Elements.Me.find('[role="title"]').text();
    };

    this.setMessage = function (message) {
        self.Options.Message = message;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.find('[role="message"]').text(message);

        return self;
    };

    var getMessageFromElement = function () {
        if (!self.Elements.Me)
            return null;

        return self.Elements.Me.find('[role="message"]').text();
    };

    var getTypeFromElement = function () {
        if (!self.Elements.Me)
            return RS.Controls.NotificationTypes.Info;

        if (self.Elements.Me.hasClass('alert-success')) return RS.Controls.NotificationTypes.Success;
        if (self.Elements.Me.hasClass('alert-info')) return RS.Controls.NotificationTypes.Info;
        if (self.Elements.Me.hasClass('alert-warning')) return RS.Controls.NotificationTypes.Warning;
        if (self.Elements.Me.hasClass('alert-danger')) return RS.Controls.NotificationTypes.Danger;

        return RS.Controls.NotificationTypes.Info;
    };

    this.getIdentifier = function () { return 'Notification'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Notification, RS.Controls.Control);

RS.Controls.Notifier = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        IsPinned: true,
        Position: {
            Top: null,
            Right: null,
            Bottom: null,
            Left: null
        },
        AutoHide: true,
        AutoHideAfter: 5000,
        HideOnClick: true,
        Container: null
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    self.Options.Container = self.Options.Container || $("body");

    var notification = null;

    RS.Controls.Notifier.superclass.constructor.call(this, self.Options, container, true);

    this.show = function (type, message, title) {
        self.hide();

        notification = new RS.Controls.Notification({
            Title: title,
            Message: message,
            IsPinned: self.Options.IsPinned,
            Position: self.Options.Position,
            AutoHide: self.Options.AutoHide,
            AutoHideAfter: self.Options.AutoHideAfter,
            HideOnClick: self.Options.HideOnClick,
            Type: type
        });

        notification.appendTo(self.Options.Container);
        notification.show();
    };

    this.showInfo = function (message, title) { return self.show(RS.Controls.NotificationTypes.Info, message, title); }
    this.showWarning = function (message, title) { return self.show(RS.Controls.NotificationTypes.Warning, message, title); }
    this.showDanger = function (message, title) { return self.show(RS.Controls.NotificationTypes.Danger, message, title); }
    this.showSuccess = function (message, title) { return self.show(RS.Controls.NotificationTypes.Success, message, title); }
    this.hide = function () {
        if (notification)
            notification.hide();
    };

    this.getIdentifier = function () { return 'Notifier'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Notifier, RS.Controls.Control);

RS.Controls.ButtonTypes = {
    Default: 'default',
    Primary: 'primary',
    Success: 'success',
    Info: 'info',
    Warning: 'warning',
    Danger: 'danger',
    Link: 'link'
};

RS.Controls.ButtonSizes = {
    ExtraSmall: 'btn-xs',
    Small: 'btn-sm',
    Default: '',
    Large: 'btn-lg'
};

RS.Controls.Orientations = {
    Horizontal: 'Horizontal',
    Vertical: 'Vertical'
};

RS.Controls.Button = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Type: RS.Controls.ButtonTypes.Default,
        Templates: [
            {
                IsDefault: true,
                Id: 'button-default-template'
            }
        ],
        Size: RS.Controls.ButtonSizes.Default,
        IsBlock: false,
        Icon: null,
        Image: null,
        Text: null
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Button.superclass.constructor.call(this, self.Options, container, true);

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('click');

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        self.applyOptions();

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.click(function (e) {
            self.PubSub.triggerEvent('click', {
                Event: e,
                Source: self
            });
        });

        return self;
    });

    this.applyOptions = function (options) {
        options = options || self.Options;

        self.setType(self.Options.Type);
        self.setSize(self.Options.Size);
        self.setBlock(self.Options.IsBlock);
        if (self.Options.Icon)
            self.setIcon(self.Options.Icon);
        if (self.Options.Image)
            self.setImage(self.Options.Image);
        if (self.Options.Text)
            self.setText(self.Options.Text);
    };

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container || self.Options.KeepOptionsFromStart)
            return self;

        self.Options.Type = getTypeFromElement();
        self.Options.Size = getSizeFromElement();
        self.Options.Text = getTextFomElement();
        self.Options.IsBlock = container.hasClass('btn-block');
        self.Options.Icon = (container.find('[role="img"]:first .glyphicon:first').attr('class') || '').replace('glyphicon-', '').replace('glyphicon', '').trim();
        self.Options.Image = container.find('[role="img"]:first img:first').attr('src');

        return self;
    });

    this.setType = function (type) {
        type = type || RS.Controls.ButtonTypes.Default;
        self.Options.Type = type;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.removeClass('btn-default btn-primary btn-success btn-info btn-warning btn-danger btn-link').addClass('btn-' + type);

        return self;
    };

    this.setSize = function (size) {
        size = size || RS.Controls.ButtonSizes.Default;
        self.Options.Size = size;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.removeClass('btn-xs btn-sm btn-lg').addClass(size);

        return self;
    };

    this.setBlock = function (isBlock) {
        self.Options.IsBlock = isBlock;

        if (!self.Elements.Me)
            return self;

        if (isBlock && !self.Elements.Me.hasClass('btn-block'))
            self.Elements.Me.addClass('btn-block');
        else self.Elements.Me.removeClass('btn-block');

        return self;
    }

    this.getChildrenContainer = function () {
        if (!self.Elements.Me)
            return null;

        return self.Elements.Me.find('[role="main"]:first');
    };

    this.setText = function (text) {
        self.Options.Text = text;

        self.setContent(text);

        return self;
    };

    this.setIcon = function (name) {
        self.Options.Icon = name;

        if (!self.Elements.Me)
            return self;

        if (!name)
            self.Elements.Me.find('[role="img"]').empty();
        else self.Elements.Me.find('[role="img"]').html('<span class="glyphicon glyphicon-' + name + '" aria-hidden="true"></span>');

        return self;
    };

    this.setImage = function (url) {
        self.Options.Image = url;

        if (!self.Elements.Me)
            return self;

        if (!url)
            self.Elements.Me.find('[role="img"]').empty();
        else self.Elements.Me.find('[role="img"]').html('<img src="' + url + '" />');

        return self;
    };

    var getTypeFromElement = function () {
        if (!self.Elements.Me)
            return RS.Controls.ButtonTypes.Default;

        if (self.Elements.Me.hasClass('btn-primary')) return RS.Controls.ButtonTypes.Primary;
        if (self.Elements.Me.hasClass('btn-success')) return RS.Controls.ButtonTypes.Success;
        if (self.Elements.Me.hasClass('btn-info')) return RS.Controls.ButtonTypes.Info;
        if (self.Elements.Me.hasClass('btn-warning')) return RS.Controls.ButtonTypes.Warning;
        if (self.Elements.Me.hasClass('btn-danger')) return RS.Controls.ButtonTypes.Danger;
        if (self.Elements.Me.hasClass('btn-link')) return RS.Controls.ButtonTypes.Link;

        return RS.Controls.ButtonTypes.Default;
    };

    var getSizeFromElement = function () {
        if (!self.Elements.Me)
            return RS.Controls.ButtonSizes.Default;

        if (self.Elements.Me.hasClass('btn-xs')) return RS.Controls.ButtonSizes.ExtraSmall;
        if (self.Elements.Me.hasClass('btn-sm')) return RS.Controls.ButtonSizes.Small;
        if (self.Elements.Me.hasClass('btn-lg')) return RS.Controls.ButtonSizes.Large;

        return RS.Controls.ButtonSizes.Default;
    };

    var getTextFomElement = function () {
        if (!self.Elements.Me)
            return null;

        return self.Elements.Me.find('[role="main"]').text();
    };

    this.getIdentifier = function () { return 'Button'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Button, RS.Controls.Control);

RS.Controls.ToggleButton = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        IsChecked: false,
        CanToggle: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.ToggleButton.superclass.constructor.call(this, self.Options, container, true);

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('toggle');
        self.PubSub.addListener('click', function () {
            self.setChecked(!self.Options.IsChecked);
        });

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        self.setChecked(self.Options.IsChecked);

        return self;
    });

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container)
            return;

        self.Options.IsChecked = getIsCheckedFromElement();

        return self;
    });

    this.setChecked = function (isChecked) {
        if (self.Options.IsChecked == isChecked || !self.Options.CanToggle)
            return self;

        self.Options.IsChecked = isChecked;

        self.PubSub.triggerEvent('toggle', {
            Source: self,
            IsChecked: isChecked
        });

        if (!self.Elements.Me)
            return self;

        if (!isChecked)
            self.Elements.Me.removeClass('active');
        else if (!self.Elements.Me.hasClass('active'))
            self.Elements.Me.addClass('active');

        return self;
    };

    var getIsCheckedFromElement = function () {
        if (!self.Elements.Me)
            return false;

        return self.Elements.Me.hasClass('active');
    };

    this.getIdentifier = function () { return 'ToggleButton'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.ToggleButton, RS.Controls.Button);

RS.Controls.ButtonGroup = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'button-group-template'
            }
        ],
        Size: RS.Controls.ButtonSizes.Default,
        Orientation: RS.Controls.Orientations.Horizontal,
        IsJustified: false,
        Buttons: [],
        AllowMultipleToggle: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.ButtonGroup.superclass.constructor.call(this, self.Options, container, true);

    this.initialize = override(self.initialize, function () {
        if (self.Options.Buttons)
            for (var i = 0; i < self.Options.Buttons.length; i++)
                self.addButton(self.Options.Buttons[i], true);

        self.PubSub.addEvent('select');

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        self.setSize(self.Options.Size);
        self.setOrientation(self.Options.Orientation);
        self.setJustification(self.Options.IsJustified);

        return self;
    });

    this.setSize = function (size) {
        size = size || RS.Controls.ButtonSizes.Default;
        self.Options.Size = size;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.removeClass('btn-group-xs btn-group-sm btn-group-lg');

        var classToAdd = '';
        switch (size) {
            case RS.Controls.ButtonSizes.ExtraSmall: classToAdd = 'btn-group-xs'; break;
            case RS.Controls.ButtonSizes.Small: classToAdd = 'btn-group-sm'; break;
            case RS.Controls.ButtonSizes.Large: classToAdd = 'btn-group-lg'; break;
        }

        if (classToAdd)
            self.Elements.Me.addClass(classToAdd);

        return self;
    };

    this.setJustification = function (isJustified) {
        self.Options.IsJustified = isJustified;

        if (!self.Elements.Me)
            return self;

        if (isJustified)
            self.Elements.Me.addClass('btn-group-justified')
        else self.Elements.Me.removeClass('btn-group-justified');

        return self;
    };

    this.setOrientation = function (orientation) {
        orientation = orientation || RS.Controls.Orientations.Horizontal;
        self.Options.Orientation = orientation;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.removeClass('btn-group btn-group-vertical').addClass(orientation == RS.Controls.Orientations.Horizontal ? 'btn-group' : 'btn-group-vertical');

        return self;
    };

    this.addButton = function (button, skipAddingToList, skipAddingToUI) {
        if (!button)
            return self;

        self.Options.Buttons = self.Options.Buttons || [];

        if (!skipAddingToList)
            self.Options.Buttons.push(button);

        if (self.Elements.Me && !skipAddingToUI)
            button.appendTo(self.getChildrenContainer());

        if (button instanceof RS.Controls.ToggleButton) {
            button.PubSub.addListener('toggle', function (e) {
                if (!e.IsChecked)
                    return;

                if (!self.Options.AllowMultipleToggle && button instanceof RS.Controls.ToggleButton) {
                    button.Options.CanToggle = false;

                    for (var i = 0; i < self.Options.Buttons.length; i++) {
                        var b = self.Options.Buttons[i];
                        if (b == button || !(b instanceof RS.Controls.ToggleButton))
                            continue;

                        b.Options.CanToggle = true;
                        b.setChecked(false);
                    }
                }
            });
        }

        button.PubSub.addListener('click', function (e) {
            e.Index = self.Options.Buttons.findFirstIndex(function (item, index) { return item == button; });
            e.Button = button;

            self.PubSub.triggerEvent('select', e);
        });

        return self;
    };

    this.removeButton = function (button) {
        if (!button || !self.Options.Buttons)
            return self;

        var index = self.Options.Buttons.findFirstIndex(function (item, index) { return item == button; });
        if (index < 0)
            return self;

        self.Options.Buttons.splice(index, 1);

        if (button.Elements.Me)
            button.Elements.Me.remove();
    };

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container)
            return;

        self.Options.Size = getSizeFromElement();
        self.Options.Orientation = getOrientationFromElement();
        self.Options.IsJustified = getJustificationFromElement();
        self.Options.Buttons = getButtonsFromElement();

        return self;
    });

    this.getChildrenContainer = function () {
        return self.Elements.Me;
    };

    this.getChildren = function () {
        return self.Options.Buttons;
    };

    var getButtonsFromElement = function () {
        if (!self.Elements.Me)
            return null;

        self.getChildrenContainer().find('> [role="button"]').each(function () {
            var btn = $(this).getControl();
            if (btn)
                self.addButton(btn, false, true);
        });
    };

    var getSizeFromElement = function () {
        if (!self.Elements.Me)
            return RS.Controls.ButtonSizes.Default;

        if (self.Elements.Me.hasClass('btn-group-xs')) return RS.Controls.ButtonSizes.ExtraSmall;
        if (self.Elements.Me.hasClass('btn-group-sm')) return RS.Controls.ButtonSizes.Small;
        if (self.Elements.Me.hasClass('btn-group-lg')) return RS.Controls.ButtonSizes.Large;

        return RS.Controls.ButtonSizes.Default;
    };

    var getOrientationFromElement = function () {
        if (!self.Elements.Me)
            return RS.Controls.Orientations.Horizontal;

        if (self.Elements.Me.hasClass('btn-group-vertical')) return RS.Controls.Orientations.Vertical;

        return RS.Controls.Orientations.Horizontal;
    };

    var getJustificationFromElement = function () {
        if (!self.Elements.Me)
            return false;

        return self.Elements.Me.hasClass('btn-group-justified');
    };

    this.getIdentifier = function () { return 'ButtonGroup'; }

    if (!isInherited)
    self.initialize();
};
extend(RS.Controls.ButtonGroup, RS.Controls.Control);

RS.Controls.ModalSizes = {
    Small: 'modal-sm',
    Default: '',
    Large: 'modal-lg'
};

RS.Controls.ModalButton = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        IsDismiss: false,
        Callback: null
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.ModalButton.superclass.constructor.call(this, self.Options, container, true);

    this.getIdentifier = function () { return 'ModalButton'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.ModalButton, RS.Controls.Button);

RS.Controls.Modal = function (options, container, isInherited) {
    var self = this;

    self.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'modal-template'
            }
        ],
        Title: null,
        Buttons: null,
        DestroyAfterClose: false,
        Parent: $("body"),
        Overlay: false,
        Size: RS.Controls.ModalSizes.Default,
        Content: null,
        CloseOnClickOutside: true,
        Width: null,
        IsFixed: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Modal.superclass.constructor.call(this, self.Options, container, true);

    this.Notifier = null;

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('show');
        self.PubSub.addEvent('hide');
        self.PubSub.addEvent('destroy');
        self.PubSub.addEvent('select');

        return self;
    });

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container)
            return;

        self.Options.Title = getTitleFromElement();
        self.Options.Size = getSizeFromElement();
        self.Options.IsFixed = self.Elements.Me.css('display') == 'fixed';

        return self;
    });

    this.setContent = function (content) {
        if (!self.Elements.Me)
            return self;

        var body = self.Elements.Me.find('[role="dialog"]:first [role="main"]:first');
        body.empty().append(content);

        return self;
    };

    this.show = function () {
        if (!self.Elements.Me || !self.Elements.Me.parent()) {
            self.Options.Parent = self.Options.Parent || $("body");
            self.appendTo(self.Options.Parent);
            self.setSize(self.Options.Size);

            $(document).keydown(function (e) {
                if (e.keyCode == RS.Keys.ESCAPE) {
                    self.hide();

                    return false;
                }
            });

            self.Elements.Me.mousedown(function (e) {
                if (self.Options.CloseOnClickOutside && $(e.target)[0] == self.Elements.Me[0])
                    self.hide();
            });

            if (self.Options.Buttons) {
                var footer = self.Elements.Me.find('[role="footer"]');

                for (var i = 0; i < self.Options.Buttons.length; i++) {
                    var button = self.Options.Buttons[i];
                    button.PubSub.addListener('click', function (e) {
                        e.Index = self.Options.Buttons.findFirstIndex(function (item, index) { return item == e.Source; });
                        e.Button = e.Source;

                        self.PubSub.triggerEvent('select', e);

                        if (e.Index > -1 && self.Options.Buttons[e.Index] && self.Options.Buttons[e.Index].Options.Callback)
                            self.Options.Buttons[e.Index].Options.Callback({
                                Source: self
                            });

                        if (e.Button.Options.IsDismiss)
                            self.hide();
                    });

                    button.appendTo(footer);
                }
            }

            self.Notifier = new RS.Controls.Notifier({
                Container: self.Elements.Me.find('[role="alert"]')
            });
        }

        if (!self.Elements.Me)
            return self;

        if (self.Options.Overlay) {
            var backdrop = self.Options.Parent.find(".modal-backdrop");
            if (!backdrop.length)
                self.Options.Parent.append('<div class="modal-backdrop fade in"></div>');
            else backdrop.show();
        }

        if (self.Options.IsFixed) {
            self.Elements.Me.css({
                'position': 'fixed',
                'bottom': '0'
            });
        }
        else {
            self.Elements.Me.css({
                'position': 'absolute',
                'bottom': 'auto'
            });
        }

        self.Elements.Me.show();
        self.PubSub.triggerEvent('show', {
            Source: self
        });

        return self;
    };

    this.hide = function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.hide();
        self.Options.Parent.find(".modal-backdrop").hide();
        self.PubSub.triggerEvent('hide', {
            Source: self
        });

        if (self.Options.DestroyAfterClose)
            self.destroy();

        return self;
    };

    this.destroy = function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.remove();
        self.Elements.Me = null;
        self.PubSub.triggerEvent('destroy', {
            Source: self
        });

        return self;
    };

    this.setTitle = function (title) {
        self.Options.Title = title;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.find('[role="title"]').text(title);

        return self;
    };

    this.setSize = function (size) {
        size = size || RS.Controls.ModalSizes.Default;
        self.Options.Size = size;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.find('[role="dialog"]').removeClass('modal-sm modal-lg').addClass(size);
        if (self.Options.Width)
            self.Elements.Me.find('[role="dialog"]').width(self.Options.Width);

        return self;
    };

    this.toggleButtonVisibility = function (index, show) {
        if (!self.Options.Buttons)
            return;

        var footer = self.Elements.Me.find('[role="footer"]');
        var button = footer.find('> [role="button"]:eq(' + index + ')');

        if (show === true)
            button.show();
        else if (show === false)
            button.hide();
        else button.toggle();
    };

    var getTitleFromElement = function () {
        if (!self.Elements.Me)
            return null;

        return self.Elements.Me.find('[role="title"]').text();
    };

    var getSizeFromElement = function () {
        if (!self.Elements.Me)
            return RS.Controls.ModalSizes.Default;

        var dialog = self.Elements.Me.find('[role="dialog"]');
        if (dialog.hasClass(RS.Controls.ModalSizes.Small)) return RS.Controls.ModalSizes.Small;
        if (dialog.hasClass(RS.Controls.ModalSizes.Large)) return RS.Controls.ModalSizes.Large;

        return RS.Controls.ModalSizes.Default;
    };

    this.getIdentifier = function () { return 'Modal'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Modal, RS.Controls.Control);

RS.Controls.Tooltip = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'tooltip-template'
            }
        ],
        Parent: null,
        Content: null,
        Position: 'top',
        AutoHide: true,
        Trigger: 'hover'
    };

    var positionToRestitute = null;

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Tooltip.superclass.constructor.call(this, self.Options, container, true);

    this.initialize = override(self.initialize, function () {
        if (!self.Options.Parent)
            return self;

        self.PubSub.addEvent('show');
        self.PubSub.addEvent('hide');

        self.Options.Parent.mousedown(function (e) {
            if (self.Options.Trigger == 'click') {
                if (!self.Elements.Me || !self.Elements.Me.is(":visible"))
                    self.show();
            }
        });

        self.Options.Parent.hover(function () {
            if (self.Options.Trigger == 'hover')
                self.show();
        }, function () {
            if (self.Options.Trigger == 'hover' && self.Options.AutoHide)
                self.hide();
        });

        return self;
    });

    this.show = function () {
        if (!self.Elements.Me) {
            self.appendTo(self.Options.Parent.parent());
            self.Elements.Me.mousedown(function (e) {
                if (!self.Options.AutoHide || self.Options.Trigger == 'click')
                    self.hide();

                return false;
            });
        }

        var desiredPosition = getPosition(self.Options.Position);

        positionToRestitute = self.Options.Position;

        if (desiredPosition.y < 0) {
            self.setPosition('bottom', true);
            desiredPosition = getPosition('bottom');
        }
        else if (desiredPosition.x < 0) {
            self.setPosition('right', true);
            desiredPosition = getPosition('right');
        }

        setPosition(desiredPosition);

        if (self.Elements.Me.offset().top + self.Elements.Me.outerHeight() > $(document).height()) {
            self.setPosition('top', true);
            desiredPosition = getPosition('top');
            setPosition(desiredPosition);
        }
        else if (self.Elements.Me.offset().left + self.Elements.Me.outerWidth() > $(document).width()) {
            self.setPosition('left', true);
            desiredPosition = getPosition('left');
            setPosition(desiredPosition);
        }

        self.Elements.Me.show();
        self.PubSub.triggerEvent('show', {
            Source: self
        });

        return self;
    };

    this.hide = function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.hide();

        self.setPosition(self.Options.Position);

        self.PubSub.triggerEvent('hide', {
            Source: self
        });

        return self;
    };

    this.setPosition = function (position, skipOverwriteSetting) {
        position = position || 'right';

        if (!skipOverwriteSetting)
            self.Options.Position = position;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.removeClass('top right bottom left').addClass(position);

        return self;
    }

    var setPosition = function (desiredPosition) {
        if (!self.Elements.Me || !desiredPosition)
            return;

        self.Elements.Me.css({
            'left': desiredPosition.x,
            'top': desiredPosition.y
        });
    };

    var getPosition = function (position) {
        var x = 0.0, y = 0.0;

        var parentPosition = self.Options.Parent.css('position') == 'fixed' ? self.Options.Parent.offset() : self.Options.Parent.position();

        if (position == 'top') {
            x = parentPosition.left + self.Options.Parent.outerWidth() / 2.0 - self.Elements.Me.outerWidth() / 2.0;
            y = parentPosition.top - self.Elements.Me.outerHeight()
        }
        else if (position == 'right') {
            x = parentPosition.left + self.Options.Parent.outerWidth();
            y = parentPosition.top + self.Options.Parent.outerHeight() / 2.0 - self.Elements.Me.outerHeight() / 2.0
        }
        else if (position == 'bottom') {
            x = parentPosition.left + self.Options.Parent.outerWidth() / 2.0 - self.Elements.Me.outerWidth() / 2.0;
            y = parentPosition.top + self.Options.Parent.outerHeight()
        }
        else if (position == 'left') {
            x = parentPosition.left - self.Elements.Me.outerWidth();
            y = parentPosition.top + self.Options.Parent.outerHeight() / 2.0 - self.Elements.Me.outerHeight() / 2.0
        }

        return {
            x: x,
            y: y
        };
    }

    this.getIdentifier = function () { return 'Tooltip'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Tooltip, RS.Controls.Control);

RS.Controls.Popover = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'popover-template'
            }
        ],
        Title: null
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Popover.superclass.constructor.call(this, self.Options, container, true);

    this.setTitle = function (title) {
        self.Options.Title = title;

        if (!self.Elements.Me)
            return self;

        self.Elements.Me.find('[role="title"]:first').text(title);

        return self;
    };

    this.getIdentifier = function () { return 'Popover'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Popover, RS.Controls.Tooltip);

RS.Controls.DataControl = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        DataSource: null,
        Paging: {
            HasContinuousPagination: false,
            ContinuousPaginationScrollingParent: null
        },
        Search: {
            CanSearch: false,
            Placeholder: 'Search...',
            MinLength: 3,
            Delay: 250,
            IsCaseSensitive: false
        },
        HighlightFirst: false,
        CanSelect: true,
        CanSelectMultiple: false,
        CanHighlight: true,
        RefreshAfterDataSourceChanged: true,
        DisplayColumn: 'Text'
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.DataControl.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.List = null;

    this.HighlightedIndex = -1;
    this.SelectedIndex = -1;
    this.SelectedItem = null;
    this.SelectedItems = null;

    var lastHighlightedItem = null;
    var lastTerm = null;
    var searchTimeoutId = null;
    var dataSourceEventsBoundTo = null;

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('highlight');
        self.PubSub.addEvent('select');
        self.PubSub.addEvent('unselect');
        self.PubSub.addEvent('enter');

        setDataSourceEvents(self.Options.DataSource);

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Search = self.Elements.Me.find('[role="search"]:first');
        self.Elements.List = self.Elements.Me.attr('role') == 'list' ? self.Elements.Me : self.Elements.Me.find('[role="list"]:first');
        self.setCanSearch(self.Options.Search.CanSearch);
        self.setPlaceholder(self.Options.Search.Placeholder);
        self.setContinuousPaginationScrollingParent(self.Options.Paging.ContinuousPaginationScrollingParent || self.Elements.Me.parent());

        self.Elements.List.on('click', '[role="listitem"]', function (e) {
            if (!self.Options.CanSelect)
                return true;

            var el = $(this);
            var index = el.parent().children().index(el);
            self.selectIndex(index);

            return false;
        });

        self.Elements.List.on('dblclick', '[role="listitem"]', function (e) {
            var el = $(this);
            var index = el.parent().children().index(el);
            self.PubSub.triggerEvent('enter', {
                Source: self,
                Index: index
            });
        });

        self.Elements.Search.keyup(function (e) { handleSearchKeyPressed(e); return false; });

        self.Elements.Me.keydown(function (e) {
            if (e.keyCode == RS.Keys.DOWN) {
                self.highlightIndex(self.HighlightedIndex + 1);

                return false;
            }
            else if (e.keyCode == RS.Keys.UP) {
                self.highlightIndex(self.HighlightedIndex - 1);

                return false;
            }
            else if (e.keyCode == RS.Keys.ENTER || (e.keyCode == RS.Keys.SPACE && self.Elements.Search && !self.Elements.Search.val())) {
                self.selectIndex(self.HighlightedIndex);

                return false;
            }
            else if (e.keyCode == RS.Keys.HOME && !e.shiftKey) {
                self.highlightIndex(0);

                return false;
            }
            else if (e.keyCode == RS.Keys.END && !e.shiftKey) {
                self.highlightIndex(Infinity);

                return false;
            }
            else if (e.keyCode == RS.Keys.PAGE_UP || e.keyCode == RS.Keys.PAGE_DOWN) {
                var itemsPerPage = Math.round(self.Elements.List.height() / (self.Elements.List.find('[role="listitem"]:first').height() || 30));

                if (e.keyCode == RS.Keys.PAGE_UP)
                    self.highlightIndex(self.HighlightedIndex - itemsPerPage);
                else self.highlightIndex(self.HighlightedIndex + itemsPerPage);

                return false;
            }

            return true;
        });

        self.Elements.Me.bind('focusin', function (e) {
            if (self.IsOpen && self.Options.Search.CanSearch && self.Elements.Search) {
                if ($(e.target)[0] == self.Elements.Search[0])
                    return true;

                self.Elements.Search.focus();
            }
        });

        solveUrlBindings(self.Options.DataSource);

        return self;
    });

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container)
            return self;

        var dataSource = self.getDataSourceFromContainer();
        if (dataSource)
            self.setDataSource(dataSource, false);

        return self;
    });

    this.getDataSourceFromContainer = function () {
        if (!container)
            return null;

        var dataSource = null;

        var dataSourceOptions = RS.Utils.getOptionsFromAttributes(container, 'data-source-options') || {};
        if (!dataSourceOptions)
            return null;

        dataSource = new RS.Controls.DataSource(dataSourceOptions);

        return dataSource;
    };

    this.setContinuousPaginationScrollingParent = function (container) {
        self.Options.Paging.ContinuousPaginationScrollingParent = typeof container == 'string' ? $(container) : container;

        if (self.Options.Paging.HasContinuousPagination && self.Options.Paging.ContinuousPaginationScrollingParent) {
            self.Options.Paging.ContinuousPaginationScrollingParent.scroll(function () {
                if (self.checkIfShouldLoadNextPageForContinuousPagination())
                    return false;
            });
        }

        return self;
    }

    this.checkIfShouldLoadNextPageForContinuousPagination = function () {
        if (!self.Options.DataSource || self.Options.DataSource.IsLoading || !self.Options.Paging.HasContinuousPagination || !self.Options.DataSource.Options.RemoteCall.Url)
            return false;

        var scrollParent = self.Options.Paging.ContinuousPaginationScrollingParent;

        if (scrollParent[0] == document && $(window).scrollTop() + $(window).height() == $(document).height()) {
            self.Options.DataSource.goToNextPage();

            return true;
        }
        else if (scrollParent.scrollTop() + scrollParent.innerHeight() >= scrollParent[0].scrollHeight) {
            self.Options.DataSource.goToNextPage();

            return true;
        }

        return false;
    };

    this.setCanSearch = function (canSearch) {
        self.Options.Search.CanSearch = canSearch;

        if (!self.Elements.Me)
            return self;

        if (canSearch) {
            if (self.Options.DataSource)
                self.Options.DataSource.IsCaseSensitive = self.Options.Search.IsCaseSensitive;

            self.Elements.Search.show();

            if (!self.Elements.List.hasClass('search'))
                self.Elements.List.addClass('search');
        }
        else {
            self.Elements.Search.hide();
            self.Elements.List.removeClass('search');
        }

        return self;
    };

    this.setPlaceholder = function (placeholder) {
        self.Options.Search.Placeholder = placeholder;

        if (!self.Elements.Me)
            return self;

        self.Elements.Search.attr('placeholder', placeholder);

        return self;
    };

    this.highlightIndex = function (index) {
        if (!self.Options.CanHighlight || !self.Options.DataSource || !self.Options.DataSource.Options.Data)
            return self;

        var data = self.Options.Search.CanSearch ? (self.Options.DataSource.FilteredData || self.Options.DataSource.Options.Data) : self.Options.DataSource.getDataSet();
        if (data && self.Options.DataSource.Options.IsComplex)
            data = data.Rows;

        index = Math.max(0, Math.min(index || 0, data.length - 1));
        if (self.HighlightedIndex == index)
            return self;

        if (lastHighlightedItem)
            lastHighlightedItem.removeClass('active');

        lastHighlightedItem = self.Elements.List.find('> [role="listitem"]:eq(' + index + ')');
        lastHighlightedItem.addClass('active');

        self.HighlightedIndex = index;

        bringItemIntoView(lastHighlightedItem);

        self.PubSub.triggerEvent('highlight', {
            Source: self,
            Index: index
        });

        return self;
    };

    this.canSelect = function (index) {
        return true;
    };

    this.processItem = function (item) {
        var dataSource = self.Options.DataSource;
        if (dataSource && dataSource.Options.IsComplex) {
            var itemFromRow = dataSource.getItemFromRow(item);

            return itemFromRow;
        }

        return item;
    };

    this.selectIndex = function (index) {
        if (!self.canSelect(index) || !self.Options.CanSelect || !self.Options.DataSource || !self.Options.DataSource.Options.Data)
            return self;

        if (self.Options.CanHighlight)
            self.highlightIndex(index);

        var data = self.Options.Search.CanSearch ? (self.Options.DataSource.FilteredData || self.Options.DataSource.Options.Data) : self.Options.DataSource.getDataSet();
        if (data && self.Options.DataSource.Options.IsComplex)
            data = data.Rows;

        index = Math.max(0, Math.min(index || 0, data.length - 1));
        if (self.SelectedIndex == index && !self.Options.CanSelectMultiple)
            return self;

        self.SelectedIndex = index;
        self.SelectedItem = self.processItem(data[index]);

        if (self.Options.CanSelectMultiple) {
            self.SelectedItem.IsSelected = !self.SelectedItem.IsSelected;

            if (self.SelectedItem.IsSelected) {
                self.SelectedItems = self.SelectedItems || [];
                self.SelectedItems.push(self.SelectedItem);
            }
            else {
                var existingIndex = self.SelectedItems.findFirstKeyIndex('Id', self.SelectedItem.Id);
                if (existingIndex > -1)
                    self.SelectedItems.splice(existingIndex, 1);
            }

            var element = self.Elements.List.find('> [role="listitem"]:eq(' + index + ')');
            element.toggleClass('selected');
        }

        if (!self.Options.CanSelectMultiple || (self.Options.CanSelectMultiple && self.SelectedItem.IsSelected)) {
            self.PubSub.triggerEvent('select', {
                Source: self,
                Index: index,
                Item: self.SelectedItem
            });

            self.PubSub.triggerEvent('change', {
                Source: this,
                Property: 'SelectedIndex'
            });
        }
        else if (self.Options.CanSelectMultiple) {
            self.PubSub.triggerEvent('unselect', {
                Source: self,
                Index: index,
                Item: self.SelectedItem
            });

            self.PubSub.triggerEvent('change', {
                Source: this,
                Property: 'SelectedIndex'
            });
        }

        return self;
    };

    this.deselect = function () {
        if (!self.SelectedItem && !self.SelectedItems)
            return;

        self.HighlightedIndex = -1;
        if (lastHighlightedItem)
            lastHighlightedItem.removeClass('active');

        self.Elements.List.find('> [role="listitem"]').removeClass('selected');

        self.PubSub.triggerEvent('unselect', {
            Source: self,
            Index: self.SelectedIndex,
            Item: self.SelectedItem
        });

        self.SelectedIndex = -1;
        self.SelectedItem = null;
        self.SelectedItems = null;

        self.PubSub.triggerEvent('change', {
            Source: this,
            Property: 'SelectedIndex'
        });

        self.PubSub.triggerEvent('select', {
            Source: self,
            Index: -1,
            Item: null
        });
    };

    this.setDataSource = function (dataSource, loadNow) {
        if (self.Options.DataSource == dataSource)
            return self;

        self.Options.DataSource = dataSource;
        solveUrlBindings(dataSource);
        setDataSourceEvents(dataSource);

        if (dataSource && self.Options.RefreshAfterDataSourceChanged && loadNow !== false)
            dataSource.refresh();

        return self;
    };

    var solveUrlBindings = function (dataSource) {
        if (!dataSource || !dataSource.Options.RemoteCall || !dataSource.Options.RemoteCall.Url || !self.Elements.Me)
            return;

        var controller = RS.ControllersManager.getElementController(self.Elements.Me, true);
        if (!controller || !controller.PubSub)
            return;

        if (controller.Model && dataSource.Options.RemoteCall.Parameters) {
            for (var i = 0; i < dataSource.Options.RemoteCall.Parameters.length; i++) {
                var p = dataSource.Options.RemoteCall.Parameters[i];
                if (!p || !p.Name)
                    continue;

                var binding = p.Binding || p.Name;
                var path = binding.split('.');
                if (!path || !path.length || !(path[0] in controller.Model))
                    continue;

                dataSource.Options.RemoteCall.BoundModelParameters = dataSource.Options.RemoteCall.BoundModelParameters || {};
                dataSource.Options.RemoteCall.BoundModelParameters[path[0]] = 1;

                var value = RS.Utils.getValue(controller.Model, binding);
                dataSource.setParameter(p.Name, value);
            }
        }

        controller.PubSub.addListener('change', function (e) {
            if (dataSource.Options.RemoteCall.BoundModelParameters && dataSource.Options.RemoteCall.BoundModelParameters[e.Property] == 1) {
                dataSource.setParameter(e.Property, e.Value, controller.Model);

                self.reactToParameterChange(e);
            }
        });
    };

    this.reactToParameterChange = function (e) {
        if (!e || !self.Options.DataSource)
            return;

        self.Options.DataSource.refresh();
    };

    var setDataSourceEvents = function (dataSource) {
        if (!dataSource || dataSourceEventsBoundTo == dataSource)
            return;

        dataSourceEventsBoundTo = dataSource;

        if (self.Options.Search.CanSearch)
            dataSource.Options.IsCaseSensitive = self.Options.Search.IsCaseSensitive;

        dataSource.PubSub.addListener('refresh', function (e) {
            self.renderItems(e.Options, e.Data);
        });

        dataSource.PubSub.addListener('add', function (e) {
            self.renderItems({
                Index: e.Index
            }, e.Items);
        });

        dataSource.PubSub.addListener('clear', function (e) {
            self.clear(e.Options);
        });
    };

    this.search = function (term) {
        if ((term || '') == (lastTerm || ''))
            return;

        if (term && self.Options.Search.MinLength && (term || '').length < self.Options.Search.MinLength)
            return;

        lastTerm = term;

        self.Options.DataSource.setParameter('term', term);
        self.Options.DataSource.refresh();
    };

    this.clear = function (options) {
        if (options && options.IsRefresh)
            return;

        if (!self.Elements.List)
            return;

        self.HighlightedIndex = -1;
        self.SelectedIndex = -1;
        self.SelectedItem = null;

        self.Elements.List.empty();

        self.PubSub.triggerEvent('change', {
            Source: this,
            Property: 'SelectedIndex'
        });

        self.PubSub.triggerEvent('select', {
            Source: self,
            Index: -1,
            Item: null
        });
    };

    var bringItemIntoView = function (item) {
        if (!item)
            return;

        var pos = item.position();
        if (!pos)
            return;

        var scrollTopTo = -1;
        if (pos.top < 0)
            scrollTopTo = self.Elements.List.scrollTop() + pos.top;
        else if (pos.top + item.height() > self.Elements.List.height())
            scrollTopTo = self.Elements.List.scrollTop() + pos.top + item.height() - self.Elements.List.height();

        if (scrollTopTo >= 0)
            self.Elements.List.scrollTop(scrollTopTo);
    };

    var handleSearchKeyPressed = function (e) {
        var term = self.Elements.Search.val();

        if (!self.Elements.Search || !self.Options.Search.CanSearch || !self.Options.DataSource || e.keyCode == RS.Keys.ENTER || (e.keyCode == RS.Keys.SPACE && !term))
            return;

        if (searchTimeoutId)
            clearTimeout(searchTimeoutId);

        if (self.Options.Search.Delay) {
            searchTimeoutId = setTimeout(function () {
                self.search(term);
            }, self.Options.Search.Delay);
        }
        else self.search(term);
    };

    this.processDataBeforeRendering = function (data) {
        return data || [];
    };

    this.renderItems = function (options, data) {
        if (!self.Elements.Me)
            return self;

        if (options && options.IsRefresh) {
            self.clear();

            if (self.Elements.List)
                self.Elements.List.scrollTop();
        }

        data = self.processDataBeforeRendering(data) || [];

        if (data && self.Options.CanSelectMultiple && self.SelectedItems && self.SelectedItems.length) {
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                if (self.SelectedItems.findFirstKeyIndex('Id', item.Id) > -1)
                    item.IsSelected = true;
            }
        }

        var template = self.getDefaultTemplate();
        if (!template)
            return null;

        template.ItemCompiled = template.ItemCompiled || Handlebars.compile($("#" + template.ItemTemplateId).html());

        var html = self.getItemsHtml(data, template);

        var noChildren = self.Elements.List.children().length;
        var index = Math.max(0, Math.min(noChildren, options && options.Index ? options.Index - 1 : noChildren));

        if (index >= noChildren) {
            self.Elements.List.append(html);
        }
        else {
            var itemAtIndex = self.Elements.List.find('> [role="listitem"]:eq(' + index + ')');
            itemAtIndex.after(html);
        }

        if (options && options.IsRefresh && self.Options.HighlightFirst)
            self.highlightIndex(0);

        return self;
    };

    this.getItemsHtml = function (data, template) {
        if (!template)
            return null;

        var html = template.ItemCompiled({
            Items: data,
            Control: self
        });

        return html;
    };

    this.getIdentifier = function () { return 'DataControl'; }

    this.setValue = override(self.setValue, function (value, property, options) {
        if (property == "SelectedIndex")
            self.selectIndex(value);
    });

    this.getSelectedRow = function () {
        if (!self.SelectedItem)
            return null;

        var dataSource = self.Options.DataSource;
        if (!dataSource || !dataSource.Options.IsComplex)
            return null;

        var dataSet = dataSource.getDataSet();
        if (!dataSet || !dataSet.Rows || self.SelectedIndex >= dataSet.Rows.length)
            return null;

        return dataSet.Rows[self.SelectedIndex];
    };

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.DataControl, RS.Controls.Control);

RS.Controls.Dropdown = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'dropdown-template',
                ItemTemplateId: 'dropdown-item-template',
                SelectedItemTemplateId: 'dropdown-selected-item-template'
            }
        ],
        SelectText: 'Select',
        Paging: {
            HasContinuousPagination: true
        },
        CloseAfterSelect: true,
        CanSelect: true,
        CanHighlight: true,
        DisplayName: 'Text'
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Dropdown.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;
    this.Elements.Popover = null;
    this.IsOpen = false;

    var openedAtLeastOnce = false;

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('open');
        self.PubSub.addEvent('close');

        if (!isInherited) {
            var defaultTemplate = self.getDefaultTemplate();
            if (defaultTemplate.SelectedItemTemplateId)
                Handlebars.registerPartial("DropdownSelectedItemTemplate", $("#" + defaultTemplate.SelectedItemTemplateId).html());
        }

        return self;
    });

    this.getDataSourceFromContainer = override(self.getDataSourceFromContainer, function () {
        if (!container)
            return null;

        if (container[0].tagName.toLowerCase() == 'select') {
            var items = [];
            container.find('option').each(function () {
                var el = $(this);

                var item = {
                    Value: el.attr('value'),
                    Text: el.text()
                };

                items.push(item);
            });
        }

        var dataSourceOptions = RS.Utils.getOptionsFromAttributes(container, 'data-source-options') || {};
        if (items)
            dataSourceOptions.Data = items;

        var dataSource = new RS.Controls.DataSource(dataSourceOptions);

        return dataSource;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Popover = self.Elements.Me.find('[role="popover"]:first');

        self.Elements.Me.find('[role="dropdown-toggle"]').click(function () {
            self.toggle();

            return false;
        });

        self.setContinuousPaginationScrollingParent(self.Elements.List);

        setSummary();

        return self;
    });

    this.canSelect = function (index) {
        return self.IsOpen;
    };

    this.selectIndex = override(self.selectIndex, function (index) {
        if (!self.Elements.Me)
            return self;

        var selectText = null;
        if (self.Options.CanSelectMultiple) {
            setSummary(self.SelectedItems.length);
        }
        else {
            var template = self.getDefaultTemplate();
            if (template && template.SelectedItemTemplateId) {
                template.SelectedItemCompiled = template.SelectedItemCompiled || Handlebars.compile($("#" + template.SelectedItemTemplateId).html());
                var html = self.generateSelectedItemHtml();
                self.Elements.Me.find('[role="main"]:first').html(html);
            }
        }

        if (self.Options.CloseAfterSelect)
            self.close();

        return self;
    });

    this.generateSelectedItemHtml = function () {
        var template = self.getDefaultTemplate();
        var html = template.SelectedItemCompiled(self.SelectedItem);

        return html;
    };

    this.open = function () {
        if (!self.Elements.Me || self.IsOpen)
            return self;

        self.IsOpen = true;

        if (self.Elements.Popover)
            self.Elements.Popover.show();

        if (self.Options.Search.CanSearch && self.Elements.Search)
            self.Elements.Search.focus();

        if (!openedAtLeastOnce) {
            if (self.Options.DataSource)
                self.Options.DataSource.loadData();

            openedAtLeastOnce = true;
        }

        $(document).bind('mousedown', listenToClickOutside);

        self.PubSub.triggerEvent('open', {
            Source: self
        });

        return self;
    };

    this.close = function () {
        if (!self.Elements.Me || !self.IsOpen)
            return self;

        self.IsOpen = false;

        if (self.Elements.Popover)
            self.Elements.Popover.hide();

        self.PubSub.triggerEvent('hide', {
            Source: self
        });

        $(document).unbind('mousedown', listenToClickOutside);

        return self;
    };

    this.toggle = function () {
        if (self.IsOpen)
            return self.close();

        return self.open();
    };

    this.getSummaryElement = function () {
        return self.Elements.Me.find('[role="main"]:first');
    };

    this.reactToParameterChange = function (e) {
        if (!e || !self.Options.DataSource)
            return;

        self.Options.DataSource.clear();
    };

    this.deselect = override(self.deselect, function () {
        setSummary(0);
    });

    this.clear = override(self.clear, function () {
        openedAtLeastOnce = false;
        setSummary(0);
    });

    var listenToClickOutside = function (e) {
        if (!self.Elements.Me || !self.IsOpen)
            return true;

        if (!RS.Utils.isInsideElement({
            x: e.pageX,
            y: e.pageY
        }, self.Elements.List) && !RS.Utils.isInsideElement({
            x: e.pageX,
            y: e.pageY
        }, self.Elements.Me))
            return self.close();
    };

    var setSummary = function (number) {
        if (!self.Options.CanSelectMultiple) {
            self.getSummaryElement().html(self.Options.SelectText);
            return;
        }

        number = number || 0;

        var text = number + ' selected';

        self.getSummaryElement().html(text);
    };

    this.getIdentifier = function () { return 'Dropdown'; }

    if (!isInherited) {
        self.initialize();
        self.appendTo(container, true);
    }
};
extend(RS.Controls.Dropdown, RS.Controls.DataControl);

RS.Controls.ButtonDropdown = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'button-dropdown-template',
                ItemTemplateId: 'button-dropdown-item-template',
            }
        ],
        CanHighlight: false,
        Text: 'Action'
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.ButtonDropdown.superclass.constructor.call(this, self.Options, container, true);

    this.Button = null;

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        var options = RS.Core.copy(self.Options, true);
        options.KeepOptionsFromStart = true;
        self.Button = new RS.Controls.Button(options, self.Elements.Me.find('[role="dropdown-toggle"]:first'));

        return self;
    });

    this.getIdentifier = function () { return 'ButtonDropdown'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.ButtonDropdown, RS.Controls.Dropdown);

RS.Controls.SplitButton = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'splitbutton-template',
                ItemTemplateId: 'splitbutton-item-template',
            }
        ],
        CanHighlight: false,
        Text: 'Action'
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.SplitButton.superclass.constructor.call(this, self.Options, container, true);

    this.Button = null;
    this.DropdownButton = null;

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        var options = RS.Core.copy(self.Options, true);
        options.KeepOptionsFromStart = true;
        self.Button = new RS.Controls.Button(options, self.Elements.Me.find('[role="button"]:first'));

        options = RS.Core.copy(self.Options, true);
        options.KeepOptionsFromStart = true;
        self.DropdownButton = new RS.Controls.Button(options, self.Elements.Me.find('[role="dropdown-toggle"]:first'));

        return self;
    });

    this.getIdentifier = function () { return 'SplitButton'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.SplitButton, RS.Controls.Dropdown);

RS.Controls.List = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'list-template',
                ItemTemplateId: 'list-item-template'
            }
        ],
        Paging: {
            HasContinuousPagination: false
        },
        CanSelect: true,
        CanHighlight: true,
        DisplayName: 'Name'
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.List.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        if (self.Options.DataSource)
            self.Options.DataSource.loadData();

        return self;
    });

    this.getDataSourceFromContainer = override(self.getDataSourceFromContainer, function () {
        if (!container)
            return null;

        if (container[0].tagName.toLowerCase() == 'ul') {
            var items = [];
            container.find('li').each(function () {
                var el = $(this);

                var item = {
                    Value: el.attr('data-value'),
                    Name: el.text()
                };

                items.push(item);
            });
        }

        var dataSourceOptions = RS.Utils.getOptionsFromAttributes(container, 'data-source-options') || {};
        if (items)
            dataSourceOptions.Data = items;

        var dataSource = new RS.Controls.DataSource(dataSourceOptions);

        return dataSource;
    });

    this.getIdentifier = function () { return 'List'; }

    if (!isInherited) {
        self.initialize();
        self.appendTo(container, true);
    }
};
extend(RS.Controls.List, RS.Controls.DataControl);

RS.Controls.TabItem = function (id, name, content) {
    this.Id = id;
    this.Name = name;
    this.Content = content;
};

RS.Controls.Tab = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'tab-template'
            }
        ]
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Tab.superclass.constructor.call(this, self.Options, container, true);

    var lastSelectedTabPanel = null;

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!self.Elements.Me)
            return self;

        var items = [];
        var index = 0;
        self.Elements.Me.find('[role="main"]:first > [role="tabpanel"]').each(function () {
            var el = $(this);

            var name = self.Elements.Me.find('[role="list"]:first > [role="tabpanel"]:eq(' + index + ') [role="tab"]').text();
            var item = new RS.Controls.TabItem(el.attr('id'), name, el.html());
            items.push(item);

            index++;
        });

        self.Options.RefreshAfterDataSourceChanged = false;

        self.setDataSource(new RS.Controls.DataSource({
            Data: items
        }));

        return self;
    });

    this.selectIndex = override(self.selectIndex, function (index) {
        if (!self.Elements.Me)
            return self;

        var selectedTabPanel = self.Elements.Me.find('> [role="main"] > [role="tabpanel"]:eq(' + self.SelectedIndex + ')');
        if (selectedTabPanel.hasClass('active'))
            return self;

        self.Elements.TabList.find('> [role="listitem"]').removeClass('active');
        self.Elements.TabList.find('> [role="listitem"]:eq(' + self.SelectedIndex + ')').addClass('active');

        if (lastSelectedTabPanel)
            lastSelectedTabPanel.removeClass('active').hide();

        selectedTabPanel.addClass('active').show();

        lastSelectedTabPanel = selectedTabPanel;

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.TabList = self.Elements.Me.find('[role="list"]:first');

        return self;
    });

    this.getIdentifier = function () { return 'Tab'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Tab, RS.Controls.DataControl);

RS.Controls.Breadcrumb = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'breadcrumb-template',
                ItemTemplateId: 'breadcrumb-item-template'
            }
        ]
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Breadcrumb.superclass.constructor.call(this, self.Options, container, true);

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!self.Elements.Me)
            return self;

        var items = [];
        var index = 0;
        self.Elements.Me.find('[role="listitem"]').each(function () {
            var el = $(this);

            items.push({
                Text: el.text()
            });

            index++;
        });

        self.Options.RefreshAfterDataSourceChanged = false;

        self.setDataSource(new RS.Controls.DataSource({
            Data: items
        }));

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        return self;
    });

    this.getIdentifier = function () { return 'Breadcrumb'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Breadcrumb, RS.Controls.DataControl);

RS.Controls.Panel = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'panel-template'
            }
        ],
        HasHeader: true,
        HasFooter: false,
        Title: 'Panel'
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Panel.superclass.constructor.call(this, self.Options, container, true);

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!self.Elements.Me)
            return self;

        self.Options.Title = self.Elements.Me.find('> [role="panel-title"]:first').html();
        self.Options.HasHeader = self.Elements.Me.find('> [role="panel-header"]:first').is(":visible");
        self.Options.HasFooter = self.Elements.Me.find('> [role="panel-footer"]:first').is(":visible");

        return self;
    });

    this.setTitle = function (title) {
        self.Options.Title = title;

        if (self.Elements.Title)
            self.Elements.Title.html(title);

        return self;
    };

    this.showHeader = function () {
        self.Options.HasHeader = true;

        if (self.Elements.Header)
            self.Elements.Header.show();

        return self;
    };

    this.hideHeader = function () {
        self.Options.HasHeader = false;

        if (self.Elements.Header)
            self.Elements.Header.hide();

        return self;
    };

    this.showFooter = function () {
        self.Options.HasFooter = true;

        if (self.Elements.Footer)
            self.Elements.Footer.show();

        return self;
    };

    this.hideFooter = function () {
        self.Options.HasFooter = false;

        if (self.Elements.Footer)
            self.Elements.Footer.hide();

        return self;
    };

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Header = self.Elements.Me.find('> [role="panel-header"]:first');
        self.Elements.Title = self.Elements.Me.find('[role="panel-title"]:first');
        self.Elements.Body = self.Elements.Me.find('> [role="panel-body"]:first');
        self.Elements.Footer = self.Elements.Me.find('> [role="panel-footer"]:first');

        self.setTitle(self.Options.Title);

        if (self.Options.HasHeader)
            self.showHeader();
        else self.hideHeader();

        if (self.Options.HasFooter)
            self.showFooter();
        else self.hideFooter();

        return self;
    });

    this.getIdentifier = function () { return 'Panel'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Panel, RS.Controls.Control);

RS.Controls.ProgressBar = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'progressbar-template'
            }
        ],
        Percent: 0,
        IsStriped: false,
        IsAnimated: false
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.ProgressBar.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Percent = null;

    this.setPercent = function (percent) {
        self.Options.Percent = Math.max(0, Math.min(100, percent));

        if (!self.Elements.Me)
            return self;

        self.Elements.Percent.html(self.Options.Percent + ' %').css('width', self.Options.Percent + '%');

        return self;
    };

    this.setStriped = function (isStriped) {
        self.Options.IsStriped = isStriped;

        if (!self.Elements.Me)
            return self;

        if (isStriped && !self.Elements.Percent.hasClass('progress-bar-striped'))
            self.Elements.Percent.addClass('progress-bar-striped');
        if (!isStriped)
            self.Elements.Percent.removeClass('progress-bar-striped');

        return self;
    };

    this.setAnimated = function (isAnimated) {
        self.Options.IsAnimated = isAnimated;

        if (!self.Elements.Me)
            return self;

        if (isAnimated && !self.Elements.Percent.hasClass('active'))
            self.Elements.Percent.addClass('active');
        if (!isAnimated)
            self.Elements.Percent.removeClass('active');

        return self;
    };

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!self.Elements.Me)
            return self;

        self.Options.Percent = parseInt((self.Elements.Me.Percent.html() || "").replaceAll('%', '').trim(), 10);
        if (isNaN(self.Options.Percent))
            self.Options.Percent = 0;

        self.Options.IsStriped = self.Elements.Me.Percent.hasClass('progress-bar-striped');
        self.Options.IsAnimated = self.Elements.Me.Percent.hasClass('active');

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Percent = self.Elements.Me.find('[role="main"]:first');

        self.setPercent(self.Options.Percent);
        self.setStriped(self.Options.IsStriped);
        self.setAnimated(self.Options.IsAnimated);

        return self;
    });

    this.getIdentifier = function () { return 'ProgressBar'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.ProgressBar, RS.Controls.Control);

RS.Controls.PagerSizes = {
    Small: 'pagination-sm',
    Medium: '',
    Large: 'pagination-lg'
};

RS.Controls.Pager = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'pager-template',
                ItemTemplateId: 'pager-item-template'
            }
        ],
        NoPages: 10,
        MaxDisplayedPages: 7,
        Size: RS.Controls.PagerSizes
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Pager.superclass.constructor.call(this, self.Options, container, true);

    this.SelectedIndex = -1;

    this.Elements.Me = null;
    this.Elements.List = null;
    this.Elements.Previous = null;
    this.Elements.Next = null;

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('select');
    });

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!self.Elements.Me)
            return self;

        self.Options.NoPages = self.Elements.Me.find('[role="listitem"]').length;
        self.Options.Size = getSizeFromContainer();

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.List = self.Elements.Me.find('[role="list"]:first');
        self.Elements.List.on('click', '> [role="listitem"]', function () {
            var index = $(this).attr('data-index');
            if (index == -2)
                index = parseInt($(this).next().attr('data-index'), 10) - 1;
            else if (index == -1)
                index = parseInt($(this).prev().attr('data-index'), 10) + 1;

            self.selectIndex(index);

            return false;
        });

        self.Elements.Previous = self.Elements.Me.find('[role="previous"]:first');
        self.Elements.Previous.click(function () { self.selectIndex(self.SelectedIndex - 1); return false; });
        self.Elements.Next = self.Elements.Me.find('[role="next"]:first');
        self.Elements.Next.click(function () { self.selectIndex(self.SelectedIndex + 1); return false; });

        self.setSize(self.Options.Size);

        render();

        return self;
    });

    this.setSize = function (size) {
        self.Options.Size = size;

        if (!self.Elements.Me)
            return self;

        self.Elements.List.removeClass('pagination-sm pagination-lg');

        if (size == RS.Controls.PagerSizes.Large)
            self.Elements.List.addClass('pagination-lg');
        else if (size == RS.Controls.PagerSizes.Small)
            self.Elements.List.addClass('pagination-sm');

        return self;
    };

    this.setNoPages = function (noPages) {
        noPages = Math.max(0, noPages);
        if (noPages == self.Options.NoPages)
            return self;

        self.Options.NoPages = noPages;
        render();

        return self;
    };

    this.selectIndex = function (index) {
        index = Math.max(0, Math.min(self.Options.NoPages - 1, index));

        if (self.SelectedIndex == index)
            return self;

        self.SelectedIndex = index;

        render();

        self.Elements.List.find('> [role="listitem"][data-index="' +  index+ '"]').addClass('active');

        self.PubSub.triggerEvent('select', {
            Source: self,
            Index: index
        });

        return self;
    };

    var getSizeFromContainer = function () {
        if (!self.Elements.Me)
            return RS.Controls.PagerSizes.Medium;

        self.Elements.List = self.Elements.Me.find('[role="list"]:first');

        if (self.Elements.List.hasClass('pagination-lg'))
            return RS.Controls.PagerSizes.Large;

        if (self.Elements.List.hasClass('pagination-sm'))
            return RS.Controls.PagerSizes.Small;

        return RS.Controls.PagerSizes.Medium;
    };

    var render = function () {
        var minIndex = Math.max(1, self.SelectedIndex - Math.floor((self.Options.MaxDisplayedPages - 2) / 2)) + 1;
        if (minIndex == 1)
            maxIndex++;

        var maxIndex = Math.min(self.Options.NoPages, minIndex + self.Options.MaxDisplayedPages - 2) - 1;

        if (maxIndex - minIndex + 1 < self.Options.MaxDisplayedPages - 2)
            minIndex = Math.max(1, maxIndex - self.Options.MaxDisplayedPages + 3);

        var template = self.getDefaultTemplate();
        if (!template)
            return;

        template.ItemCompiled = template.ItemCompiled || Handlebars.compile($("#" + template.ItemTemplateId).html());

        var html = "";
        var addedDotsLeft = false;
        var addedDotsRight = false;
        for (var i = 1; i <= self.Options.NoPages; i++) {
            if ((i == 1 || (i >= minIndex)) && ((i <= maxIndex) || i == self.Options.NoPages))
                html += template.ItemCompiled({ Number: i, Index: i - 1 });
            else {
                if (i < self.SelectedIndex && !addedDotsLeft) {
                    html += template.ItemCompiled({ Number: '...', Index: -2 });
                    addedDotsLeft = true;
                }
                else if (i > self.SelectedIndex && !addedDotsRight) {
                    html += template.ItemCompiled({ Number: '...', Index: -1 });
                    addedDotsRight = true;
                }
            }
        }

        self.Elements.List.find('[role="listitem"]').remove();

        $(html).insertAfter(self.Elements.Previous);

        setItemsLength();
    };

    var setItemsLength = function () {
        var maxWidth = 0;
        self.Elements.List.find('> [role="listitem"]').each(function () {
            maxWidth = Math.max(maxWidth, $(this).width());
        });

        self.Elements.List.find('> [role="listitem"]').each(function () {
            $(this).width(maxWidth)
        });
    };

    this.getIdentifier = function () { return 'Pager'; }

    if (!isInherited)
        self.initialize();

    self.appendTo(container, true);
};
extend(RS.Controls.Pager, RS.Controls.Control);

RS.Controls.Menu = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'menu-template',
                ItemTemplateId: 'menu-item-template'
            }
        ],
        CanHighlight: false
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Menu.superclass.constructor.call(this, self.Options, container, true);

    this.initialize = override(self.initialize, function () {
        var defaultTemplate = self.getDefaultTemplate();
        if (defaultTemplate)
            Handlebars.registerPartial("MenuItemTemplate", $("#" + defaultTemplate.ItemTemplateId).html());

        self.PubSub.addEvent('select');

        return self;
    });

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container)
            return self;

        var items = getItemsFromContainer(container);
        self.Options.DataSource = new RS.Controls.DataSource({
            Data: items
        });

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.List = self.Elements.Me;

        self.Elements.List.on('click', '[role="listitem"]', function () {
            var id = $(this).attr('data-id');
            var item = getItem(id);
            if (item) {
                self.PubSub.triggerEvent('select', {
                    Source: self,
                    Item: item
                });
            }

            return false;
        });

        if (self.Options.DataSource)
            self.Options.DataSource.loadData();

        return self;
    });

    this.renderItems = function (options, data) {
        if (!self.Elements.Me)
            return self;

        var template = self.getDefaultTemplate();
        if (!template)
            return null;

        var html = template.Compiled({
            Items: data
        });

        self.Elements.Me.html(html);

        return self;
    };

    var getItemsFromContainer = function (el) {
        if (!el)
            return null;

        var items = null;

        el.find('> [role="listitem"]').each(function () {
            var item = {
                Id: $(this).attr('data-id'),
                Name: $(this).find('> [role="main"]:first').text() || $(this).text()
            };

            item.Items = getItemsFromContainer($(this).find('> [role="list"]:first'));

            if (!items)
                items = [];

            items.push(item);
        });

        return items;
    }

    var getItem = function (id, data) {
        data = data || (self.Options.DataSource ? self.Options.DataSource.Options.Data : null)
        if (!data)
            return null;

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (item.Id == id)
                return item;

            if (!item.Items)
                continue;

            var child = getItem(id, item.Items);
            if (child)
                return child;
        }

        return null;
    };

    this.getIdentifier = function () { return 'Menu'; }

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Menu, RS.Controls.DataControl);

RS.Controls.Autocomplete = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'autocomplete-template',
                ItemTemplateId: 'autocomplete-item-template'
            }
        ],
        Search: {
            CanSearch: true,
            MinLength: 0
        },
        HighlightFirst: true,
        OpenOnFocus: true,
        Classes: {
            Main: 'dropdown'
        }
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Autocomplete.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;
    this.Elements.SummaryContainer = null;

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.SummaryContainer = self.Elements.Me.find('[role="summary-container"]:first');

        self.Elements.Me.removeClass(self.Options.Classes.Main + ' input-group');

        if (self.Options.CanSelectMultiple) {
            self.Elements.Me.addClass('input-group');
            self.Elements.SummaryContainer.addClass('visible');
        }
        else self.Elements.Me.addClass(self.Options.Classes.Main);

        self.Elements.Search.focus(function () {
            if (self.Options.OpenOnFocus)
                self.open();
        });

        self.Elements.Search.dblclick(function () {
            if (self.Options.OpenOnFocus)
                self.open();
        });

        return self;
    });

    this.search = override(self.search, function (term) {
        if (!self.IsOpen)
            self.open();

        return self;
    });

    this.selectIndex = override(self.selectIndex, function (index) {
        if (!self.SelectedItem)
            return self;

        if (self.Options.CanSelectMultiple) {
            self.Elements.Search.val('');
        }
        else {
            self.Elements.Search.val(self.SelectedItem[self.Options.DisplayColumn]);
        }

        return self;
    });

    this.getSummaryElement = function () {
        return self.Elements.Me.find('[role="summary"]:first');
    };

    this.getIdentifier = function () { return 'Autocomplete'; }

    if (!isInherited) {
        self.initialize();
        self.appendTo(container, true);
    }
};
extend(RS.Controls.Autocomplete, RS.Controls.Dropdown);

RS.Controls.Combobox = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'combobox-template',
                ItemTemplateId: 'combobox-item-template'
            }
        ],
        Classes: {
            Main: 'combobox'
        }
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Combobox.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.addClass('input-group combobox');

        return self;
    });

    this.getIdentifier = function () { return 'Combobox'; }

    if (!isInherited) {
        self.initialize();
        self.appendTo(container, true);
    }
};
extend(RS.Controls.Combobox, RS.Controls.Autocomplete);

RS.Controls.TreeViewNode = function (id, name, children, isExpanded) {
    this.Id = id;
    this.Name = name;
    this.Nodes = children;
    this.IsExpanded = isExpanded || false;
    this.IsSelected = false;
};

RS.Controls.TreeView = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'treeview-template',
                ItemTemplateId: 'treeview-item-template'
            }
        ],
        Icons: {
            Expanded: 'glyphicon-minus',
            Collapsed: 'glyphicon-plus'
        },
        CanSelect: true,
        CanSelectParentNodes: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.TreeView.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;

    this.initialize = override(self.initialize, function () {
        Handlebars.registerPartial("TreeViewNodeChildrenTemplate", $("#treeview-item-template").html());

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.List = self.Elements.Me.attr('role') == 'list' ? self.Elements.Me : self.Elements.Me.find('[role="list"]:first');

        self.Elements.List.on('click', '.collapse-node', function () {
            var nodeElement = $(this).parents('[data-id]:first');
            var node = getNodeByElement($(this));
            if (!node)
                return;

            node.IsExpanded = false;
            $(this).removeClass(self.Options.Icons.Expanded).removeClass('collapse-node');
            $(this).addClass(self.Options.Icons.Collapsed).addClass("expand-node");
            if (node.IsSelected)
                nodeElement.addClass('active');

            var childrenElement = nodeElement.find(".treeview:first");
            childrenElement.hide();

            return false;
        });

        self.Elements.List.on('click', '.expand-node', function () {
            var nodeElement = $(this).parents('[data-id]:first');
            var node = getNodeByElement($(this));
            if (!node || !node.Nodes || !node.Nodes.length)
                return;

            node.IsExpanded = true;
            $(this).removeClass(self.Options.Icons.Collapsed).removeClass('expand-node');
            $(this).addClass(self.Options.Icons.Expanded).addClass("collapse-node");
            nodeElement.removeClass('active');

            var childrenElement = nodeElement.find(".treeview:first");

            childrenElement.show();

            return false;
        });

        self.Elements.List.on('click', 'li[data-id]', function (e) {
            if (!self.Options.CanSelect)
                return false;

            var nodeElement = $(this);
            var node = getNodeByElement(nodeElement);
            if (!node || (!self.Options.CanSelectParentNodes && node.Nodes && node.Nodes.length))
                return;

            changeNodeSelection(node, e.Data ? e.Data.IsSelected : !node.IsSelected, true, true);

            return false;
        });

        if (self.Options.DataSource)
            self.Options.DataSource.loadData();

        return self;
    });

    this.highlightIndex = function (index) { };

    this.renderItems = function (options, data) {
        var template = self.getDefaultTemplate();
        if (!template)
            return self;

        template.ItemCompiled = template.ItemCompiled || Handlebars.compile($("#" + template.ItemTemplateId).html());
        var html = template.ItemCompiled({
            Nodes: data
        });

        self.Elements.List.html(html);

        return self;
    };

    this.getNodeById = function (id) {
        if (!id)
            return null;

        if (!self.Options.DataSource || !self.Options.DataSource.Options.Data)
            return null;

        var foundNode = getChildById(id, self.Options.DataSource.Options.Data);

        return foundNode;
    };

    this.canSelect = function () {
        return false;
    };

    this.getSelectedItems = function () {
        if (!self.Options.DataSource || !self.Options.DataSource.Options.Data)
            return null;

        return getSelectedNodes(self.Options.DataSource.Options.Data);
    };

    var getSelectedNodes = function (nodes) {
        if (!nodes)
            return null;

        var selectedNodes = [];
        for (var i = 0; i < nodes.length; i++)
            selectedNodes = getNodesAsList(nodes[i], selectedNodes, function (item) { return item.IsSelected == true; });

        return selectedNodes;
    };

    var getNodesAsList = function (node, nodes, includeFunction) {
        if (!node)
            return nodes;

        if (!includeFunction || includeFunction(node))
            nodes.push(node);

        if (node.Nodes)
            for (var i = 0; i < node.Nodes.length; i++)
                getNodesAsList(node.Nodes[i], nodes, includeFunction);

        return nodes;
    };

    var changeNodeSelection = function (node, isSelected, recursive, changeUI) {
        if (!node)
            return;

        var nodeElement = null;
        node.IsSelected = isSelected;
        if (changeUI) {
            nodeElement = self.Elements.List.find('li[data-id="' + node.Id + '"]');

            if (node.IsSelected && (!node.Nodes || (node.Nodes && !node.IsExpanded))) {
                nodeElement.addClass('active');

                self.PubSub.triggerEvent('select', {
                    Source: self,
                    Item: node
                });
            }
            else {
                nodeElement.removeClass('active');
                self.PubSub.triggerEvent('unselect', {
                    Source: self,
                    Item: node
                });
            }
        }

        if (recursive && node.Nodes) {
            for (var i = 0; i < node.Nodes.length; i++)
                changeNodeSelection(node.Nodes[i], isSelected, recursive, changeUI);
        }
    };

    var getNodeByElement = function (el) {
        if (!el)
            return null;

        if (!el.hasClass('list-group-item'))
            return getNodeByElement(el.parents('.list-group-item:first'));

        var node = el.data('node');
        if (node)
            return node;

        var nodeId = el.attr('data-id');
        node = self.getNodeById(nodeId);
        el.data('node', node);

        return node;
    };

    var getChildById = function (id, nodes) {
        if (!id || !nodes)
            return null;

        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n.Id == id)
                return n;

            var childNode = getChildById(id, n.Nodes);
            if (childNode)
                return childNode;
        }

        return null;
    };

    this.getIdentifier = function () { return 'TreeView'; }

    if (!isInherited) {
        self.initialize();
        self.appendTo(container, true);
    }
};
extend(RS.Controls.TreeView, RS.Controls.DataControl);

RS.Controls.Grid = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
            {
                IsDefault: true,
                Id: 'grid-template',
                ItemTemplateId: 'grid-item-template'
            }
        ],
        Paging: {
            HasContinuousPagination: true
        },
        CanSelect: true,
        CanHighlight: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Grid.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;
    this.Elements.Header = null;
    this.Elements.HeaderTable = null;
    this.Elements.Body = null;
    this.Elements.BodyTable = null;

    var hasSetHeaderColumnsWidths = false;

    this.initialize = override(self.initialize, function () {
        if (!isInherited) {
            var defaultTemplate = self.getDefaultTemplate();
            if (defaultTemplate)
                Handlebars.registerPartial("GridItemTemplate", $("#" + defaultTemplate.ItemTemplateId).html());
        }

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Header = self.Elements.Me.find('[role="header"]:first');
        self.Elements.HeaderTable = self.Elements.Header.find('table:first');

        self.Elements.Body = self.Elements.Me.find('[role="body"]:first');
        self.Elements.BodyTable = self.Elements.Body.find('table:first');
        self.Elements.List = self.Elements.Body.find('[role="list"]:first');

        self.setContinuousPaginationScrollingParent(self.Elements.Body);

        if (self.Options.DataSource)
            self.Options.DataSource.loadData();

        return self;
    });

    this.renderItems = override(self.renderItems, function () {
        setHeaderColumnsWidths();

        return self;
    });

    var setHeaderColumnsWidths = function () {
        if (hasSetHeaderColumnsWidths)
            return;

        var columns = self.Elements.HeaderTable.find('th');
        for (var i = 0; i < columns.length - 1; i++) {
            var columnWidth = self.Elements.BodyTable.find('tr:first td:eq(' + i + ')').width();
            if (!columnWidth)
                continue;

            self.Elements.Me.find('colgroup:first col:eq(' + i + ')').attr('width', columnWidth + 'px')
            self.Elements.HeaderTable.find('th:eq(' + i + ')').css('width', columnWidth + 'px');
        }

        hasSetHeaderColumnsWidths = true;
    };

    this.getIdentifier = function () { return 'Grid'; }

    if (!isInherited) {
        self.initialize();
        self.appendTo(container, true);
    }
};
extend(RS.Controls.Grid, RS.Controls.DataControl);

/*! version : 4.17.37
 =========================================================
 bootstrap-datetimejs
 https://github.com/Eonasdan/bootstrap-datetimepicker
 Copyright (c) 2015 Jonathan Peterson
 =========================================================
 */
/*
 The MIT License (MIT)

 Copyright (c) 2015 Jonathan Peterson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */
/*global define:false */
/*global exports:false */
/*global require:false */
/*global jQuery:false */
/*global moment:false */
(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD is used - Register as an anonymous module.
        define(['jquery', 'moment'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'), require('moment'));
    } else {
        // Neither AMD nor CommonJS used. Use global variables.
        if (typeof jQuery === 'undefined') {
            throw 'bootstrap-datetimepicker requires jQuery to be loaded first';
        }
        if (typeof moment === 'undefined') {
            throw 'bootstrap-datetimepicker requires Moment.js to be loaded first';
        }
        factory(jQuery, moment);
    }
}(function ($, moment) {
    'use strict';
    if (!moment) {
        throw new Error('bootstrap-datetimepicker requires Moment.js to be loaded first');
    }

    var dateTimePicker = function (element, options) {
        var picker = {},
            date,
            viewDate,
            unset = true,
            input,
            component = false,
            widget = false,
            use24Hours,
            minViewModeNumber = 0,
            actualFormat,
            parseFormats,
            currentViewMode,
            datePickerModes = [
                {
                    clsName: 'days',
                    navFnc: 'M',
                    navStep: 1
                },
                {
                    clsName: 'months',
                    navFnc: 'y',
                    navStep: 1
                },
                {
                    clsName: 'years',
                    navFnc: 'y',
                    navStep: 10
                },
                {
                    clsName: 'decades',
                    navFnc: 'y',
                    navStep: 100
                }
            ],
            viewModes = ['days', 'months', 'years', 'decades'],
            verticalModes = ['top', 'bottom', 'auto'],
            horizontalModes = ['left', 'right', 'auto'],
            toolbarPlacements = ['default', 'top', 'bottom'],
            keyMap = {
                'up': 38,
                38: 'up',
                'down': 40,
                40: 'down',
                'left': 37,
                37: 'left',
                'right': 39,
                39: 'right',
                'tab': 9,
                9: 'tab',
                'escape': 27,
                27: 'escape',
                'enter': 13,
                13: 'enter',
                'pageUp': 33,
                33: 'pageUp',
                'pageDown': 34,
                34: 'pageDown',
                'shift': 16,
                16: 'shift',
                'control': 17,
                17: 'control',
                'space': 32,
                32: 'space',
                't': 84,
                84: 't',
                'delete': 46,
                46: 'delete'
            },
            keyState = {},

            /********************************************************************************
             *
             * Private functions
             *
             ********************************************************************************/
            getMoment = function (d) {
                var tzEnabled = false,
                    returnMoment,
                    currentZoneOffset,
                    incomingZoneOffset,
                    timeZoneIndicator,
                    dateWithTimeZoneInfo;

                if (moment.tz !== undefined && options.timeZone !== undefined && options.timeZone !== null && options.timeZone !== '') {
                    tzEnabled = true;
                }
                if (d === undefined || d === null) {
                    if (tzEnabled) {
                        returnMoment = moment().tz(options.timeZone).startOf('d');
                    } else {
                        returnMoment = moment().startOf('d');
                    }
                } else {
                    if (tzEnabled) {
                        currentZoneOffset = moment().tz(options.timeZone).utcOffset();
                        incomingZoneOffset = moment(d, parseFormats, options.useStrict).utcOffset();
                        if (incomingZoneOffset !== currentZoneOffset) {
                            timeZoneIndicator = moment().tz(options.timeZone).format('Z');
                            dateWithTimeZoneInfo = moment(d, parseFormats, options.useStrict).format('YYYY-MM-DD[T]HH:mm:ss') + timeZoneIndicator;
                            returnMoment = moment(dateWithTimeZoneInfo, parseFormats, options.useStrict).tz(options.timeZone);
                        } else {
                            returnMoment = moment(d, parseFormats, options.useStrict).tz(options.timeZone);
                        }
                    } else {
                        returnMoment = moment(d, parseFormats, options.useStrict);
                    }
                }
                return returnMoment;
            },
            isEnabled = function (granularity) {
                if (typeof granularity !== 'string' || granularity.length > 1) {
                    throw new TypeError('isEnabled expects a single character string parameter');
                }
                switch (granularity) {
                    case 'y':
                        return actualFormat.indexOf('Y') !== -1;
                    case 'M':
                        return actualFormat.indexOf('M') !== -1;
                    case 'd':
                        return actualFormat.toLowerCase().indexOf('d') !== -1;
                    case 'h':
                    case 'H':
                        return actualFormat.toLowerCase().indexOf('h') !== -1;
                    case 'm':
                        return actualFormat.indexOf('m') !== -1;
                    case 's':
                        return actualFormat.indexOf('s') !== -1;
                    default:
                        return false;
                }
            },
            hasTime = function () {
                return (isEnabled('h') || isEnabled('m') || isEnabled('s'));
            },

            hasDate = function () {
                return (isEnabled('y') || isEnabled('M') || isEnabled('d'));
            },

            getDatePickerTemplate = function () {
                var headTemplate = $('<thead>')
                        .append($('<tr>')
                            .append($('<th>').addClass('prev').attr('data-action', 'previous')
                                .append($('<span>').addClass(options.icons.previous))
                                )
                            .append($('<th>').addClass('picker-switch').attr('data-action', 'pickerSwitch').attr('colspan', (options.calendarWeeks ? '6' : '5')))
                            .append($('<th>').addClass('next').attr('data-action', 'next')
                                .append($('<span>').addClass(options.icons.next))
                                )
                            ),
                    contTemplate = $('<tbody>')
                        .append($('<tr>')
                            .append($('<td>').attr('colspan', (options.calendarWeeks ? '8' : '7')))
                            );

                return [
                    $('<div>').addClass('datepicker-days')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate)
                            .append($('<tbody>'))
                            ),
                    $('<div>').addClass('datepicker-months')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate.clone())
                            .append(contTemplate.clone())
                            ),
                    $('<div>').addClass('datepicker-years')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate.clone())
                            .append(contTemplate.clone())
                            ),
                    $('<div>').addClass('datepicker-decades')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate.clone())
                            .append(contTemplate.clone())
                            )
                ];
            },

            getTimePickerMainTemplate = function () {
                var topRow = $('<tr>'),
                    middleRow = $('<tr>'),
                    bottomRow = $('<tr>');

                if (isEnabled('h')) {
                    topRow.append($('<td>')
                        .append($('<a>').attr({href: '#', tabindex: '-1', 'title': options.tooltips.incrementHour}).addClass('btn').attr('data-action', 'incrementHours')
                            .append($('<span>').addClass(options.icons.up))));
                    middleRow.append($('<td>')
                        .append($('<span>').addClass('timepicker-hour').attr({'data-time-component':'hours', 'title': options.tooltips.pickHour}).attr('data-action', 'showHours')));
                    bottomRow.append($('<td>')
                        .append($('<a>').attr({href: '#', tabindex: '-1', 'title': options.tooltips.decrementHour}).addClass('btn').attr('data-action', 'decrementHours')
                            .append($('<span>').addClass(options.icons.down))));
                }
                if (isEnabled('m')) {
                    if (isEnabled('h')) {
                        topRow.append($('<td>').addClass('separator'));
                        middleRow.append($('<td>').addClass('separator').html(':'));
                        bottomRow.append($('<td>').addClass('separator'));
                    }
                    topRow.append($('<td>')
                        .append($('<a>').attr({href: '#', tabindex: '-1', 'title': options.tooltips.incrementMinute}).addClass('btn').attr('data-action', 'incrementMinutes')
                            .append($('<span>').addClass(options.icons.up))));
                    middleRow.append($('<td>')
                        .append($('<span>').addClass('timepicker-minute').attr({'data-time-component': 'minutes', 'title': options.tooltips.pickMinute}).attr('data-action', 'showMinutes')));
                    bottomRow.append($('<td>')
                        .append($('<a>').attr({href: '#', tabindex: '-1', 'title': options.tooltips.decrementMinute}).addClass('btn').attr('data-action', 'decrementMinutes')
                            .append($('<span>').addClass(options.icons.down))));
                }
                if (isEnabled('s')) {
                    if (isEnabled('m')) {
                        topRow.append($('<td>').addClass('separator'));
                        middleRow.append($('<td>').addClass('separator').html(':'));
                        bottomRow.append($('<td>').addClass('separator'));
                    }
                    topRow.append($('<td>')
                        .append($('<a>').attr({href: '#', tabindex: '-1', 'title': options.tooltips.incrementSecond}).addClass('btn').attr('data-action', 'incrementSeconds')
                            .append($('<span>').addClass(options.icons.up))));
                    middleRow.append($('<td>')
                        .append($('<span>').addClass('timepicker-second').attr({'data-time-component': 'seconds', 'title': options.tooltips.pickSecond}).attr('data-action', 'showSeconds')));
                    bottomRow.append($('<td>')
                        .append($('<a>').attr({href: '#', tabindex: '-1', 'title': options.tooltips.decrementSecond}).addClass('btn').attr('data-action', 'decrementSeconds')
                            .append($('<span>').addClass(options.icons.down))));
                }

                if (!use24Hours) {
                    topRow.append($('<td>').addClass('separator'));
                    middleRow.append($('<td>')
                        .append($('<button>').addClass('btn btn-primary').attr({'data-action': 'togglePeriod', tabindex: '-1', 'title': options.tooltips.togglePeriod})));
                    bottomRow.append($('<td>').addClass('separator'));
                }

                return $('<div>').addClass('timepicker-picker')
                    .append($('<table>').addClass('table-condensed')
                        .append([topRow, middleRow, bottomRow]));
            },

            getTimePickerTemplate = function () {
                var hoursView = $('<div>').addClass('timepicker-hours')
                        .append($('<table>').addClass('table-condensed')),
                    minutesView = $('<div>').addClass('timepicker-minutes')
                        .append($('<table>').addClass('table-condensed')),
                    secondsView = $('<div>').addClass('timepicker-seconds')
                        .append($('<table>').addClass('table-condensed')),
                    ret = [getTimePickerMainTemplate()];

                if (isEnabled('h')) {
                    ret.push(hoursView);
                }
                if (isEnabled('m')) {
                    ret.push(minutesView);
                }
                if (isEnabled('s')) {
                    ret.push(secondsView);
                }

                return ret;
            },

            getToolbar = function () {
                var row = [];
                if (options.showTodayButton) {
                    row.push($('<td>').append($('<a>').attr({'data-action':'today', 'title': options.tooltips.today}).append($('<span>').addClass(options.icons.today))));
                }
                if (!options.sideBySide && hasDate() && hasTime()) {
                    row.push($('<td>').append($('<a>').attr({'data-action':'togglePicker', 'title': options.tooltips.selectTime}).append($('<span>').addClass(options.icons.time))));
                }
                if (options.showClear) {
                    row.push($('<td>').append($('<a>').attr({'data-action':'clear', 'title': options.tooltips.clear}).append($('<span>').addClass(options.icons.clear))));
                }
                if (options.showClose) {
                    row.push($('<td>').append($('<a>').attr({'data-action':'close', 'title': options.tooltips.close}).append($('<span>').addClass(options.icons.close))));
                }
                return $('<table>').addClass('table-condensed').append($('<tbody>').append($('<tr>').append(row)));
            },

            getTemplate = function () {
                var template = $('<div>').addClass('bootstrap-datetimepicker-widget dropdown-menu'),
                    dateView = $('<div>').addClass('datepicker').append(getDatePickerTemplate()),
                    timeView = $('<div>').addClass('timepicker').append(getTimePickerTemplate()),
                    content = $('<ul>').addClass('list-unstyled'),
                    toolbar = $('<li>').addClass('picker-switch' + (options.collapse ? ' accordion-toggle' : '')).append(getToolbar());

                if (options.inline) {
                    template.removeClass('dropdown-menu');
                }

                if (use24Hours) {
                    template.addClass('usetwentyfour');
                }
                if (isEnabled('s') && !use24Hours) {
                    template.addClass('wider');
                }

                if (options.sideBySide && hasDate() && hasTime()) {
                    template.addClass('timepicker-sbs');
                    if (options.toolbarPlacement === 'top') {
                        template.append(toolbar);
                    }
                    template.append(
                        $('<div>').addClass('row')
                            .append(dateView.addClass('col-md-6'))
                            .append(timeView.addClass('col-md-6'))
                    );
                    if (options.toolbarPlacement === 'bottom') {
                        template.append(toolbar);
                    }
                    return template;
                }

                if (options.toolbarPlacement === 'top') {
                    content.append(toolbar);
                }
                if (hasDate()) {
                    content.append($('<li>').addClass((options.collapse && hasTime() ? 'collapse in' : '')).append(dateView));
                }
                if (options.toolbarPlacement === 'default') {
                    content.append(toolbar);
                }
                if (hasTime()) {
                    content.append($('<li>').addClass((options.collapse && hasDate() ? 'collapse' : '')).append(timeView));
                }
                if (options.toolbarPlacement === 'bottom') {
                    content.append(toolbar);
                }
                return template.append(content);
            },

            dataToOptions = function () {
                var eData,
                    dataOptions = {};

                if (element.is('input') || options.inline) {
                    eData = element.data();
                } else {
                    eData = element.find('input').data();
                }

                if (eData.dateOptions && eData.dateOptions instanceof Object) {
                    dataOptions = $.extend(true, dataOptions, eData.dateOptions);
                }

                $.each(options, function (key) {
                    var attributeName = 'date' + key.charAt(0).toUpperCase() + key.slice(1);
                    if (eData[attributeName] !== undefined) {
                        dataOptions[key] = eData[attributeName];
                    }
                });
                return dataOptions;
            },

            place = function () {
                var position = (component || element).position(),
                    offset = (component || element).offset(),
                    vertical = options.widgetPositioning.vertical,
                    horizontal = options.widgetPositioning.horizontal,
                    parent;

                if (options.widgetParent) {
                    parent = options.widgetParent.append(widget);
                } else if (element.is('input')) {
                    parent = element.after(widget).parent();
                } else if (options.inline) {
                    parent = element.append(widget);
                    return;
                } else {
                    parent = element;
                    element.children().first().after(widget);
                }

                // Top and bottom logic
                if (vertical === 'auto') {
                    if (offset.top + widget.height() * 1.5 >= $(window).height() + $(window).scrollTop() &&
                        widget.height() + element.outerHeight() < offset.top) {
                        vertical = 'top';
                    } else {
                        vertical = 'bottom';
                    }
                }

                // Left and right logic
                if (horizontal === 'auto') {
                    if (parent.width() < offset.left + widget.outerWidth() / 2 &&
                        offset.left + widget.outerWidth() > $(window).width()) {
                        horizontal = 'right';
                    } else {
                        horizontal = 'left';
                    }
                }

                if (vertical === 'top') {
                    widget.addClass('top').removeClass('bottom');
                } else {
                    widget.addClass('bottom').removeClass('top');
                }

                if (horizontal === 'right') {
                    widget.addClass('pull-right');
                } else {
                    widget.removeClass('pull-right');
                }

                // find the first parent element that has a relative css positioning
                if (parent.css('position') !== 'relative') {
                    parent = parent.parents().filter(function () {
                        return $(this).css('position') === 'relative';
                    }).first();
                }

                if (parent.length === 0) {
                    throw new Error('datetimepicker component should be placed within a relative positioned container');
                }

                widget.css({
                    top: vertical === 'top' ? 'auto' : position.top + element.outerHeight(),
                    bottom: vertical === 'top' ? position.top + element.outerHeight() : 'auto',
                    left: horizontal === 'left' ? (parent === element ? 0 : position.left) : 'auto',
                    right: horizontal === 'left' ? 'auto' : parent.outerWidth() - element.outerWidth() - (parent === element ? 0 : position.left)
                });
            },

            notifyEvent = function (e) {
                if (e.type === 'dp.change' && ((e.date && e.date.isSame(e.oldDate)) || (!e.date && !e.oldDate))) {
                    return;
                }
                element.trigger(e);
            },

            viewUpdate = function (e) {
                if (e === 'y') {
                    e = 'YYYY';
                }
                notifyEvent({
                    type: 'dp.update',
                    change: e,
                    viewDate: viewDate.clone()
                });
            },

            showMode = function (dir) {
                if (!widget) {
                    return;
                }
                if (dir) {
                    currentViewMode = Math.max(minViewModeNumber, Math.min(3, currentViewMode + dir));
                }
                widget.find('.datepicker > div').hide().filter('.datepicker-' + datePickerModes[currentViewMode].clsName).show();
            },

            fillDow = function () {
                var row = $('<tr>'),
                    currentDate = viewDate.clone().startOf('w').startOf('d');

                if (options.calendarWeeks === true) {
                    row.append($('<th>').addClass('cw').text('#'));
                }

                while (currentDate.isBefore(viewDate.clone().endOf('w'))) {
                    row.append($('<th>').addClass('dow').text(currentDate.format('dd')));
                    currentDate.add(1, 'd');
                }
                widget.find('.datepicker-days thead').append(row);
            },

            isInDisabledDates = function (testDate) {
                return options.disabledDates[testDate.format('YYYY-MM-DD')] === true;
            },

            isInEnabledDates = function (testDate) {
                return options.enabledDates[testDate.format('YYYY-MM-DD')] === true;
            },

            isInDisabledHours = function (testDate) {
                return options.disabledHours[testDate.format('H')] === true;
            },

            isInEnabledHours = function (testDate) {
                return options.enabledHours[testDate.format('H')] === true;
            },

            isValid = function (targetMoment, granularity) {
                if (!targetMoment.isValid()) {
                    return false;
                }
                if (options.disabledDates && granularity === 'd' && isInDisabledDates(targetMoment)) {
                    return false;
                }
                if (options.enabledDates && granularity === 'd' && !isInEnabledDates(targetMoment)) {
                    return false;
                }
                if (options.minDate && targetMoment.isBefore(options.minDate, granularity)) {
                    return false;
                }
                if (options.maxDate && targetMoment.isAfter(options.maxDate, granularity)) {
                    return false;
                }
                if (options.daysOfWeekDisabled && granularity === 'd' && options.daysOfWeekDisabled.indexOf(targetMoment.day()) !== -1) {
                    return false;
                }
                if (options.disabledHours && (granularity === 'h' || granularity === 'm' || granularity === 's') && isInDisabledHours(targetMoment)) {
                    return false;
                }
                if (options.enabledHours && (granularity === 'h' || granularity === 'm' || granularity === 's') && !isInEnabledHours(targetMoment)) {
                    return false;
                }
                if (options.disabledTimeIntervals && (granularity === 'h' || granularity === 'm' || granularity === 's')) {
                    var found = false;
                    $.each(options.disabledTimeIntervals, function () {
                        if (targetMoment.isBetween(this[0], this[1])) {
                            found = true;
                            return false;
                        }
                    });
                    if (found) {
                        return false;
                    }
                }
                return true;
            },

            fillMonths = function () {
                var spans = [],
                    monthsShort = viewDate.clone().startOf('y').startOf('d');
                while (monthsShort.isSame(viewDate, 'y')) {
                    spans.push($('<span>').attr('data-action', 'selectMonth').addClass('month').text(monthsShort.format('MMM')));
                    monthsShort.add(1, 'M');
                }
                widget.find('.datepicker-months td').empty().append(spans);
            },

            updateMonths = function () {
                var monthsView = widget.find('.datepicker-months'),
                    monthsViewHeader = monthsView.find('th'),
                    months = monthsView.find('tbody').find('span');

                monthsViewHeader.eq(0).find('span').attr('title', options.tooltips.prevYear);
                monthsViewHeader.eq(1).attr('title', options.tooltips.selectYear);
                monthsViewHeader.eq(2).find('span').attr('title', options.tooltips.nextYear);

                monthsView.find('.disabled').removeClass('disabled');

                if (!isValid(viewDate.clone().subtract(1, 'y'), 'y')) {
                    monthsViewHeader.eq(0).addClass('disabled');
                }

                monthsViewHeader.eq(1).text(viewDate.year());

                if (!isValid(viewDate.clone().add(1, 'y'), 'y')) {
                    monthsViewHeader.eq(2).addClass('disabled');
                }

                months.removeClass('active');
                if (date.isSame(viewDate, 'y') && !unset) {
                    months.eq(date.month()).addClass('active');
                }

                months.each(function (index) {
                    if (!isValid(viewDate.clone().month(index), 'M')) {
                        $(this).addClass('disabled');
                    }
                });
            },

            updateYears = function () {
                var yearsView = widget.find('.datepicker-years'),
                    yearsViewHeader = yearsView.find('th'),
                    startYear = viewDate.clone().subtract(5, 'y'),
                    endYear = viewDate.clone().add(6, 'y'),
                    html = '';

                yearsViewHeader.eq(0).find('span').attr('title', options.tooltips.prevDecade);
                yearsViewHeader.eq(1).attr('title', options.tooltips.selectDecade);
                yearsViewHeader.eq(2).find('span').attr('title', options.tooltips.nextDecade);

                yearsView.find('.disabled').removeClass('disabled');

                if (options.minDate && options.minDate.isAfter(startYear, 'y')) {
                    yearsViewHeader.eq(0).addClass('disabled');
                }

                yearsViewHeader.eq(1).text(startYear.year() + '-' + endYear.year());

                if (options.maxDate && options.maxDate.isBefore(endYear, 'y')) {
                    yearsViewHeader.eq(2).addClass('disabled');
                }

                while (!startYear.isAfter(endYear, 'y')) {
                    html += '<span data-action="selectYear" class="year' + (startYear.isSame(date, 'y') && !unset ? ' active' : '') + (!isValid(startYear, 'y') ? ' disabled' : '') + '">' + startYear.year() + '</span>';
                    startYear.add(1, 'y');
                }

                yearsView.find('td').html(html);
            },

            updateDecades = function () {
                var decadesView = widget.find('.datepicker-decades'),
                    decadesViewHeader = decadesView.find('th'),
                    startDecade = moment({y: viewDate.year() - (viewDate.year() % 100) - 1}),
                    endDecade = startDecade.clone().add(100, 'y'),
                    startedAt = startDecade.clone(),
                    html = '';

                decadesViewHeader.eq(0).find('span').attr('title', options.tooltips.prevCentury);
                decadesViewHeader.eq(2).find('span').attr('title', options.tooltips.nextCentury);

                decadesView.find('.disabled').removeClass('disabled');

                if (startDecade.isSame(moment({y: 1900})) || (options.minDate && options.minDate.isAfter(startDecade, 'y'))) {
                    decadesViewHeader.eq(0).addClass('disabled');
                }

                decadesViewHeader.eq(1).text(startDecade.year() + '-' + endDecade.year());

                if (startDecade.isSame(moment({y: 2000})) || (options.maxDate && options.maxDate.isBefore(endDecade, 'y'))) {
                    decadesViewHeader.eq(2).addClass('disabled');
                }

                while (!startDecade.isAfter(endDecade, 'y')) {
                    html += '<span data-action="selectDecade" class="decade' + (startDecade.isSame(date, 'y') ? ' active' : '') +
                        (!isValid(startDecade, 'y') ? ' disabled' : '') + '" data-selection="' + (startDecade.year() + 6) + '">' + (startDecade.year() + 1) + ' - ' + (startDecade.year() + 12) + '</span>';
                    startDecade.add(12, 'y');
                }
                html += '<span></span><span></span><span></span>'; //push the dangling block over, at least this way it's even

                decadesView.find('td').html(html);
                decadesViewHeader.eq(1).text((startedAt.year() + 1) + '-' + (startDecade.year()));
            },

            fillDate = function () {
                var daysView = widget.find('.datepicker-days'),
                    daysViewHeader = daysView.find('th'),
                    currentDate,
                    html = [],
                    row,
                    clsName,
                    i;

                if (!hasDate()) {
                    return;
                }

                daysViewHeader.eq(0).find('span').attr('title', options.tooltips.prevMonth);
                daysViewHeader.eq(1).attr('title', options.tooltips.selectMonth);
                daysViewHeader.eq(2).find('span').attr('title', options.tooltips.nextMonth);

                daysView.find('.disabled').removeClass('disabled');
                daysViewHeader.eq(1).text(viewDate.format(options.dayViewHeaderFormat));

                if (!isValid(viewDate.clone().subtract(1, 'M'), 'M')) {
                    daysViewHeader.eq(0).addClass('disabled');
                }
                if (!isValid(viewDate.clone().add(1, 'M'), 'M')) {
                    daysViewHeader.eq(2).addClass('disabled');
                }

                currentDate = viewDate.clone().startOf('M').startOf('w').startOf('d');

                for (i = 0; i < 42; i++) { //always display 42 days (should show 6 weeks)
                    if (currentDate.weekday() === 0) {
                        row = $('<tr>');
                        if (options.calendarWeeks) {
                            row.append('<td class="cw">' + currentDate.week() + '</td>');
                        }
                        html.push(row);
                    }
                    clsName = '';
                    if (currentDate.isBefore(viewDate, 'M')) {
                        clsName += ' old';
                    }
                    if (currentDate.isAfter(viewDate, 'M')) {
                        clsName += ' new';
                    }
                    if (currentDate.isSame(date, 'd') && !unset) {
                        clsName += ' active';
                    }
                    if (!isValid(currentDate, 'd')) {
                        clsName += ' disabled';
                    }
                    if (currentDate.isSame(getMoment(), 'd')) {
                        clsName += ' today';
                    }
                    if (currentDate.day() === 0 || currentDate.day() === 6) {
                        clsName += ' weekend';
                    }
                    row.append('<td data-action="selectDay" data-day="' + currentDate.format('L') + '" class="day' + clsName + '">' + currentDate.date() + '</td>');
                    currentDate.add(1, 'd');
                }

                daysView.find('tbody').empty().append(html);

                updateMonths();

                updateYears();

                updateDecades();
            },

            fillHours = function () {
                var table = widget.find('.timepicker-hours table'),
                    currentHour = viewDate.clone().startOf('d'),
                    html = [],
                    row = $('<tr>');

                if (viewDate.hour() > 11 && !use24Hours) {
                    currentHour.hour(12);
                }
                while (currentHour.isSame(viewDate, 'd') && (use24Hours || (viewDate.hour() < 12 && currentHour.hour() < 12) || viewDate.hour() > 11)) {
                    if (currentHour.hour() % 4 === 0) {
                        row = $('<tr>');
                        html.push(row);
                    }
                    row.append('<td data-action="selectHour" class="hour' + (!isValid(currentHour, 'h') ? ' disabled' : '') + '">' + currentHour.format(use24Hours ? 'HH' : 'hh') + '</td>');
                    currentHour.add(1, 'h');
                }
                table.empty().append(html);
            },

            fillMinutes = function () {
                var table = widget.find('.timepicker-minutes table'),
                    currentMinute = viewDate.clone().startOf('h'),
                    html = [],
                    row = $('<tr>'),
                    step = options.stepping === 1 ? 5 : options.stepping;

                while (viewDate.isSame(currentMinute, 'h')) {
                    if (currentMinute.minute() % (step * 4) === 0) {
                        row = $('<tr>');
                        html.push(row);
                    }
                    row.append('<td data-action="selectMinute" class="minute' + (!isValid(currentMinute, 'm') ? ' disabled' : '') + '">' + currentMinute.format('mm') + '</td>');
                    currentMinute.add(step, 'm');
                }
                table.empty().append(html);
            },

            fillSeconds = function () {
                var table = widget.find('.timepicker-seconds table'),
                    currentSecond = viewDate.clone().startOf('m'),
                    html = [],
                    row = $('<tr>');

                while (viewDate.isSame(currentSecond, 'm')) {
                    if (currentSecond.second() % 20 === 0) {
                        row = $('<tr>');
                        html.push(row);
                    }
                    row.append('<td data-action="selectSecond" class="second' + (!isValid(currentSecond, 's') ? ' disabled' : '') + '">' + currentSecond.format('ss') + '</td>');
                    currentSecond.add(5, 's');
                }

                table.empty().append(html);
            },

            fillTime = function () {
                var toggle, newDate, timeComponents = widget.find('.timepicker span[data-time-component]');

                if (!use24Hours) {
                    toggle = widget.find('.timepicker [data-action=togglePeriod]');
                    newDate = date.clone().add((date.hours() >= 12) ? -12 : 12, 'h');

                    toggle.text(date.format('A'));

                    if (isValid(newDate, 'h')) {
                        toggle.removeClass('disabled');
                    } else {
                        toggle.addClass('disabled');
                    }
                }
                timeComponents.filter('[data-time-component=hours]').text(date.format(use24Hours ? 'HH' : 'hh'));
                timeComponents.filter('[data-time-component=minutes]').text(date.format('mm'));
                timeComponents.filter('[data-time-component=seconds]').text(date.format('ss'));

                fillHours();
                fillMinutes();
                fillSeconds();
            },

            update = function () {
                if (!widget) {
                    return;
                }
                fillDate();
                fillTime();
            },

            setValue = function (targetMoment) {
                var oldDate = unset ? null : date;

                // case of calling setValue(null or false)
                if (!targetMoment) {
                    unset = true;
                    input.val('');
                    element.data('date', '');
                    notifyEvent({
                        type: 'dp.change',
                        date: false,
                        oldDate: oldDate
                    });
                    update();
                    return;
                }

                targetMoment = targetMoment.clone().locale(options.locale);

                if (options.stepping !== 1) {
                    targetMoment.minutes((Math.round(targetMoment.minutes() / options.stepping) * options.stepping) % 60).seconds(0);
                }

                if (isValid(targetMoment)) {
                    date = targetMoment;
                    viewDate = date.clone();
                    input.val(date.format(actualFormat));
                    element.data('date', date.format(actualFormat));
                    unset = false;
                    update();
                    notifyEvent({
                        type: 'dp.change',
                        date: date.clone(),
                        oldDate: oldDate
                    });
                } else {
                    if (!options.keepInvalid) {
                        input.val(unset ? '' : date.format(actualFormat));
                    }
                    notifyEvent({
                        type: 'dp.error',
                        date: targetMoment
                    });
                }
            },

            hide = function () {
                ///<summary>Hides the widget. Possibly will emit dp.hide</summary>
                var transitioning = false;
                if (!widget) {
                    return picker;
                }
                // Ignore event if in the middle of a picker transition
                widget.find('.collapse').each(function () {
                    var collapseData = $(this).data('collapse');
                    if (collapseData && collapseData.transitioning) {
                        transitioning = true;
                        return false;
                    }
                    return true;
                });
                if (transitioning) {
                    return picker;
                }
                if (component && component.hasClass('btn')) {
                    component.toggleClass('active');
                }
                widget.hide();

                $(window).off('resize', place);
                widget.off('click', '[data-action]');
                widget.off('mousedown', false);

                widget.remove();
                widget = false;

                notifyEvent({
                    type: 'dp.hide',
                    date: date.clone()
                });

                input.blur();

                return picker;
            },

            clear = function () {
                setValue(null);
            },

            /********************************************************************************
             *
             * Widget UI interaction functions
             *
             ********************************************************************************/
            actions = {
                next: function () {
                    var navFnc = datePickerModes[currentViewMode].navFnc;
                    viewDate.add(datePickerModes[currentViewMode].navStep, navFnc);
                    fillDate();
                    viewUpdate(navFnc);
                },

                previous: function () {
                    var navFnc = datePickerModes[currentViewMode].navFnc;
                    viewDate.subtract(datePickerModes[currentViewMode].navStep, navFnc);
                    fillDate();
                    viewUpdate(navFnc);
                },

                pickerSwitch: function () {
                    showMode(1);
                },

                selectMonth: function (e) {
                    var month = $(e.target).closest('tbody').find('span').index($(e.target));
                    viewDate.month(month);
                    if (currentViewMode === minViewModeNumber) {
                        setValue(date.clone().year(viewDate.year()).month(viewDate.month()));
                        if (!options.inline) {
                            hide();
                        }
                    } else {
                        showMode(-1);
                        fillDate();
                    }
                    viewUpdate('M');
                },

                selectYear: function (e) {
                    var year = parseInt($(e.target).text(), 10) || 0;
                    viewDate.year(year);
                    if (currentViewMode === minViewModeNumber) {
                        setValue(date.clone().year(viewDate.year()));
                        if (!options.inline) {
                            hide();
                        }
                    } else {
                        showMode(-1);
                        fillDate();
                    }
                    viewUpdate('YYYY');
                },

                selectDecade: function (e) {
                    var year = parseInt($(e.target).data('selection'), 10) || 0;
                    viewDate.year(year);
                    if (currentViewMode === minViewModeNumber) {
                        setValue(date.clone().year(viewDate.year()));
                        if (!options.inline) {
                            hide();
                        }
                    } else {
                        showMode(-1);
                        fillDate();
                    }
                    viewUpdate('YYYY');
                },

                selectDay: function (e) {
                    var day = viewDate.clone();
                    if ($(e.target).is('.old')) {
                        day.subtract(1, 'M');
                    }
                    if ($(e.target).is('.new')) {
                        day.add(1, 'M');
                    }
                    setValue(day.date(parseInt($(e.target).text(), 10)));
                    if (!hasTime() && !options.keepOpen && !options.inline) {
                        hide();
                    }
                },

                incrementHours: function () {
                    var newDate = date.clone().add(1, 'h');
                    if (isValid(newDate, 'h')) {
                        setValue(newDate);
                    }
                },

                incrementMinutes: function () {
                    var newDate = date.clone().add(options.stepping, 'm');
                    if (isValid(newDate, 'm')) {
                        setValue(newDate);
                    }
                },

                incrementSeconds: function () {
                    var newDate = date.clone().add(1, 's');
                    if (isValid(newDate, 's')) {
                        setValue(newDate);
                    }
                },

                decrementHours: function () {
                    var newDate = date.clone().subtract(1, 'h');
                    if (isValid(newDate, 'h')) {
                        setValue(newDate);
                    }
                },

                decrementMinutes: function () {
                    var newDate = date.clone().subtract(options.stepping, 'm');
                    if (isValid(newDate, 'm')) {
                        setValue(newDate);
                    }
                },

                decrementSeconds: function () {
                    var newDate = date.clone().subtract(1, 's');
                    if (isValid(newDate, 's')) {
                        setValue(newDate);
                    }
                },

                togglePeriod: function () {
                    setValue(date.clone().add((date.hours() >= 12) ? -12 : 12, 'h'));
                },

                togglePicker: function (e) {
                    var $this = $(e.target),
                        $parent = $this.closest('ul'),
                        expanded = $parent.find('.in'),
                        closed = $parent.find('.collapse:not(.in)'),
                        collapseData;

                    if (expanded && expanded.length) {
                        collapseData = expanded.data('collapse');
                        if (collapseData && collapseData.transitioning) {
                            return;
                        }
                        if (expanded.collapse) { // if collapse plugin is available through bootstrap.js then use it
                            expanded.collapse('hide');
                            closed.collapse('show');
                        } else { // otherwise just toggle in class on the two views
                            expanded.removeClass('in');
                            closed.addClass('in');
                        }
                        if ($this.is('span')) {
                            $this.toggleClass(options.icons.time + ' ' + options.icons.date);
                        } else {
                            $this.find('span').toggleClass(options.icons.time + ' ' + options.icons.date);
                        }

                        // NOTE: uncomment if toggled state will be restored in show()
                        //if (component) {
                        //    component.find('span').toggleClass(options.icons.time + ' ' + options.icons.date);
                        //}
                    }
                },

                showPicker: function () {
                    widget.find('.timepicker > div:not(.timepicker-picker)').hide();
                    widget.find('.timepicker .timepicker-picker').show();
                },

                showHours: function () {
                    widget.find('.timepicker .timepicker-picker').hide();
                    widget.find('.timepicker .timepicker-hours').show();
                },

                showMinutes: function () {
                    widget.find('.timepicker .timepicker-picker').hide();
                    widget.find('.timepicker .timepicker-minutes').show();
                },

                showSeconds: function () {
                    widget.find('.timepicker .timepicker-picker').hide();
                    widget.find('.timepicker .timepicker-seconds').show();
                },

                selectHour: function (e) {
                    var hour = parseInt($(e.target).text(), 10);

                    if (!use24Hours) {
                        if (date.hours() >= 12) {
                            if (hour !== 12) {
                                hour += 12;
                            }
                        } else {
                            if (hour === 12) {
                                hour = 0;
                            }
                        }
                    }
                    setValue(date.clone().hours(hour));
                    actions.showPicker.call(picker);
                },

                selectMinute: function (e) {
                    setValue(date.clone().minutes(parseInt($(e.target).text(), 10)));
                    actions.showPicker.call(picker);
                },

                selectSecond: function (e) {
                    setValue(date.clone().seconds(parseInt($(e.target).text(), 10)));
                    actions.showPicker.call(picker);
                },

                clear: clear,

                today: function () {
                    var todaysDate = getMoment();
                    if (isValid(todaysDate, 'd')) {
                        setValue(todaysDate);
                    }
                },

                close: hide
            },

            doAction = function (e) {
                if ($(e.currentTarget).is('.disabled')) {
                    return false;
                }
                actions[$(e.currentTarget).data('action')].apply(picker, arguments);
                return false;
            },

            show = function () {
                ///<summary>Shows the widget. Possibly will emit dp.show and dp.change</summary>
                var currentMoment,
                    useCurrentGranularity = {
                        'year': function (m) {
                            return m.month(0).date(1).hours(0).seconds(0).minutes(0);
                        },
                        'month': function (m) {
                            return m.date(1).hours(0).seconds(0).minutes(0);
                        },
                        'day': function (m) {
                            return m.hours(0).seconds(0).minutes(0);
                        },
                        'hour': function (m) {
                            return m.seconds(0).minutes(0);
                        },
                        'minute': function (m) {
                            return m.seconds(0);
                        }
                    };

                if (input.prop('disabled') || (!options.ignoreReadonly && input.prop('readonly')) || widget) {
                    return picker;
                }
                if (input.val() !== undefined && input.val().trim().length !== 0) {
                    setValue(parseInputDate(input.val().trim()));
                } else if (options.useCurrent && unset && ((input.is('input') && input.val().trim().length === 0) || options.inline)) {
                    currentMoment = getMoment();
                    if (typeof options.useCurrent === 'string') {
                        currentMoment = useCurrentGranularity[options.useCurrent](currentMoment);
                    }
                    setValue(currentMoment);
                }

                widget = getTemplate();

                fillDow();
                fillMonths();

                widget.find('.timepicker-hours').hide();
                widget.find('.timepicker-minutes').hide();
                widget.find('.timepicker-seconds').hide();

                update();
                showMode();

                $(window).on('resize', place);
                widget.on('click', '[data-action]', doAction); // this handles clicks on the widget
                widget.on('mousedown', false);

                if (component && component.hasClass('btn')) {
                    component.toggleClass('active');
                }
                widget.show();
                place();

                if (options.focusOnShow && !input.is(':focus')) {
                    input.focus();
                }

                notifyEvent({
                    type: 'dp.show'
                });
                return picker;
            },

            toggle = function () {
                /// <summary>Shows or hides the widget</summary>
                return (widget ? hide() : show());
            },

            parseInputDate = function (inputDate) {
                if (options.parseInputDate === undefined) {
                    if (moment.isMoment(inputDate) || inputDate instanceof Date) {
                        inputDate = moment(inputDate);
                    } else {
                        inputDate = getMoment(inputDate);
                    }
                } else {
                    inputDate = options.parseInputDate(inputDate);
                }
                inputDate.locale(options.locale);
                return inputDate;
            },

            keydown = function (e) {
                var handler = null,
                    index,
                    index2,
                    pressedKeys = [],
                    pressedModifiers = {},
                    currentKey = e.which,
                    keyBindKeys,
                    allModifiersPressed,
                    pressed = 'p';

                keyState[currentKey] = pressed;

                for (index in keyState) {
                    if (keyState.hasOwnProperty(index) && keyState[index] === pressed) {
                        pressedKeys.push(index);
                        if (parseInt(index, 10) !== currentKey) {
                            pressedModifiers[index] = true;
                        }
                    }
                }

                for (index in options.keyBinds) {
                    if (options.keyBinds.hasOwnProperty(index) && typeof (options.keyBinds[index]) === 'function') {
                        keyBindKeys = index.split(' ');
                        if (keyBindKeys.length === pressedKeys.length && keyMap[currentKey] === keyBindKeys[keyBindKeys.length - 1]) {
                            allModifiersPressed = true;
                            for (index2 = keyBindKeys.length - 2; index2 >= 0; index2--) {
                                if (!(keyMap[keyBindKeys[index2]] in pressedModifiers)) {
                                    allModifiersPressed = false;
                                    break;
                                }
                            }
                            if (allModifiersPressed) {
                                handler = options.keyBinds[index];
                                break;
                            }
                        }
                    }
                }

                if (handler) {
                    handler.call(picker, widget);
                    e.stopPropagation();
                    e.preventDefault();
                }
            },

            keyup = function (e) {
                keyState[e.which] = 'r';
                e.stopPropagation();
                e.preventDefault();
            },

            change = function (e) {
                var val = $(e.target).val().trim(),
                    parsedDate = val ? parseInputDate(val) : null;
                setValue(parsedDate);
                e.stopImmediatePropagation();
                return false;
            },

            attachDatePickerElementEvents = function () {
                input.on({
                    'change': change,
                    'blur': options.debug ? '' : hide,
                    'keydown': keydown,
                    'keyup': keyup,
                    'focus': options.allowInputToggle ? show : ''
                });

                if (element.is('input')) {
                    input.on({
                        'focus': show
                    });
                } else if (component) {
                    component.on('click', toggle);
                    component.on('mousedown', false);
                }
            },

            detachDatePickerElementEvents = function () {
                input.off({
                    'change': change,
                    'blur': blur,
                    'keydown': keydown,
                    'keyup': keyup,
                    'focus': options.allowInputToggle ? hide : ''
                });

                if (element.is('input')) {
                    input.off({
                        'focus': show
                    });
                } else if (component) {
                    component.off('click', toggle);
                    component.off('mousedown', false);
                }
            },

            indexGivenDates = function (givenDatesArray) {
                // Store given enabledDates and disabledDates as keys.
                // This way we can check their existence in O(1) time instead of looping through whole array.
                // (for example: options.enabledDates['2014-02-27'] === true)
                var givenDatesIndexed = {};
                $.each(givenDatesArray, function () {
                    var dDate = parseInputDate(this);
                    if (dDate.isValid()) {
                        givenDatesIndexed[dDate.format('YYYY-MM-DD')] = true;
                    }
                });
                return (Object.keys(givenDatesIndexed).length) ? givenDatesIndexed : false;
            },

            indexGivenHours = function (givenHoursArray) {
                // Store given enabledHours and disabledHours as keys.
                // This way we can check their existence in O(1) time instead of looping through whole array.
                // (for example: options.enabledHours['2014-02-27'] === true)
                var givenHoursIndexed = {};
                $.each(givenHoursArray, function () {
                    givenHoursIndexed[this] = true;
                });
                return (Object.keys(givenHoursIndexed).length) ? givenHoursIndexed : false;
            },

            initFormatting = function () {
                var format = options.format || 'L LT';

                actualFormat = format.replace(/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, function (formatInput) {
                    var newinput = date.localeData().longDateFormat(formatInput) || formatInput;
                    return newinput.replace(/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, function (formatInput2) { //temp fix for #740
                        return date.localeData().longDateFormat(formatInput2) || formatInput2;
                    });
                });


                parseFormats = options.extraFormats ? options.extraFormats.slice() : [];
                if (parseFormats.indexOf(format) < 0 && parseFormats.indexOf(actualFormat) < 0) {
                    parseFormats.push(actualFormat);
                }

                use24Hours = (actualFormat.toLowerCase().indexOf('a') < 1 && actualFormat.replace(/\[.*?\]/g, '').indexOf('h') < 1);

                if (isEnabled('y')) {
                    minViewModeNumber = 2;
                }
                if (isEnabled('M')) {
                    minViewModeNumber = 1;
                }
                if (isEnabled('d')) {
                    minViewModeNumber = 0;
                }

                currentViewMode = Math.max(minViewModeNumber, currentViewMode);

                if (!unset) {
                    setValue(date);
                }
            };

        /********************************************************************************
         *
         * Public API functions
         * =====================
         *
         * Important: Do not expose direct references to private objects or the options
         * object to the outer world. Always return a clone when returning values or make
         * a clone when setting a private variable.
         *
         ********************************************************************************/
        picker.destroy = function () {
            ///<summary>Destroys the widget and removes all attached event listeners</summary>
            hide();
            detachDatePickerElementEvents();
            element.removeData('DateTimePicker');
            element.removeData('date');
        };

        picker.toggle = toggle;

        picker.show = show;

        picker.hide = hide;

        picker.disable = function () {
            ///<summary>Disables the input element, the component is attached to, by adding a disabled="true" attribute to it.
            ///If the widget was visible before that call it is hidden. Possibly emits dp.hide</summary>
            hide();
            if (component && component.hasClass('btn')) {
                component.addClass('disabled');
            }
            input.prop('disabled', true);
            return picker;
        };

        picker.enable = function () {
            ///<summary>Enables the input element, the component is attached to, by removing disabled attribute from it.</summary>
            if (component && component.hasClass('btn')) {
                component.removeClass('disabled');
            }
            input.prop('disabled', false);
            return picker;
        };

        picker.ignoreReadonly = function (ignoreReadonly) {
            if (arguments.length === 0) {
                return options.ignoreReadonly;
            }
            if (typeof ignoreReadonly !== 'boolean') {
                throw new TypeError('ignoreReadonly () expects a boolean parameter');
            }
            options.ignoreReadonly = ignoreReadonly;
            return picker;
        };

        picker.options = function (newOptions) {
            if (arguments.length === 0) {
                return $.extend(true, {}, options);
            }

            if (!(newOptions instanceof Object)) {
                throw new TypeError('options() options parameter should be an object');
            }
            $.extend(true, options, newOptions);
            $.each(options, function (key, value) {
                if (picker[key] !== undefined) {
                    picker[key](value);
                } else {
                    throw new TypeError('option ' + key + ' is not recognized!');
                }
            });
            return picker;
        };

        picker.date = function (newDate) {
            ///<signature helpKeyword="$.fn.datetimepicker.date">
            ///<summary>Returns the component's model current date, a moment object or null if not set.</summary>
            ///<returns type="Moment">date.clone()</returns>
            ///</signature>
            ///<signature>
            ///<summary>Sets the components model current moment to it. Passing a null value unsets the components model current moment. Parsing of the newDate parameter is made using moment library with the options.format and options.useStrict components configuration.</summary>
            ///<param name="newDate" locid="$.fn.datetimepicker.date_p:newDate">Takes string, Date, moment, null parameter.</param>
            ///</signature>
            if (arguments.length === 0) {
                if (unset) {
                    return null;
                }
                return date.clone();
            }

            if (newDate !== null && typeof newDate !== 'string' && !moment.isMoment(newDate) && !(newDate instanceof Date)) {
                throw new TypeError('date() parameter must be one of [null, string, moment or Date]');
            }

            setValue(newDate === null ? null : parseInputDate(newDate));
            return picker;
        };

        picker.format = function (newFormat) {
            ///<summary>test su</summary>
            ///<param name="newFormat">info about para</param>
            ///<returns type="string|boolean">returns foo</returns>
            if (arguments.length === 0) {
                return options.format;
            }

            if ((typeof newFormat !== 'string') && ((typeof newFormat !== 'boolean') || (newFormat !== false))) {
                throw new TypeError('format() expects a sting or boolean:false parameter ' + newFormat);
            }

            options.format = newFormat;
            if (actualFormat) {
                initFormatting(); // reinit formatting
            }
            return picker;
        };

        picker.timeZone = function (newZone) {
            if (arguments.length === 0) {
                return options.timeZone;
            }

            options.timeZone = newZone;

            return picker;
        };

        picker.dayViewHeaderFormat = function (newFormat) {
            if (arguments.length === 0) {
                return options.dayViewHeaderFormat;
            }

            if (typeof newFormat !== 'string') {
                throw new TypeError('dayViewHeaderFormat() expects a string parameter');
            }

            options.dayViewHeaderFormat = newFormat;
            return picker;
        };

        picker.extraFormats = function (formats) {
            if (arguments.length === 0) {
                return options.extraFormats;
            }

            if (formats !== false && !(formats instanceof Array)) {
                throw new TypeError('extraFormats() expects an array or false parameter');
            }

            options.extraFormats = formats;
            if (parseFormats) {
                initFormatting(); // reinit formatting
            }
            return picker;
        };

        picker.disabledDates = function (dates) {
            ///<signature helpKeyword="$.fn.datetimepicker.disabledDates">
            ///<summary>Returns an array with the currently set disabled dates on the component.</summary>
            ///<returns type="array">options.disabledDates</returns>
            ///</signature>
            ///<signature>
            ///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of
            ///options.enabledDates if such exist.</summary>
            ///<param name="dates" locid="$.fn.datetimepicker.disabledDates_p:dates">Takes an [ string or Date or moment ] of values and allows the user to select only from those days.</param>
            ///</signature>
            if (arguments.length === 0) {
                return (options.disabledDates ? $.extend({}, options.disabledDates) : options.disabledDates);
            }

            if (!dates) {
                options.disabledDates = false;
                update();
                return picker;
            }
            if (!(dates instanceof Array)) {
                throw new TypeError('disabledDates() expects an array parameter');
            }
            options.disabledDates = indexGivenDates(dates);
            options.enabledDates = false;
            update();
            return picker;
        };

        picker.enabledDates = function (dates) {
            ///<signature helpKeyword="$.fn.datetimepicker.enabledDates">
            ///<summary>Returns an array with the currently set enabled dates on the component.</summary>
            ///<returns type="array">options.enabledDates</returns>
            ///</signature>
            ///<signature>
            ///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of options.disabledDates if such exist.</summary>
            ///<param name="dates" locid="$.fn.datetimepicker.enabledDates_p:dates">Takes an [ string or Date or moment ] of values and allows the user to select only from those days.</param>
            ///</signature>
            if (arguments.length === 0) {
                return (options.enabledDates ? $.extend({}, options.enabledDates) : options.enabledDates);
            }

            if (!dates) {
                options.enabledDates = false;
                update();
                return picker;
            }
            if (!(dates instanceof Array)) {
                throw new TypeError('enabledDates() expects an array parameter');
            }
            options.enabledDates = indexGivenDates(dates);
            options.disabledDates = false;
            update();
            return picker;
        };

        picker.daysOfWeekDisabled = function (daysOfWeekDisabled) {
            if (arguments.length === 0) {
                return options.daysOfWeekDisabled.splice(0);
            }

            if ((typeof daysOfWeekDisabled === 'boolean') && !daysOfWeekDisabled) {
                options.daysOfWeekDisabled = false;
                update();
                return picker;
            }

            if (!(daysOfWeekDisabled instanceof Array)) {
                throw new TypeError('daysOfWeekDisabled() expects an array parameter');
            }
            options.daysOfWeekDisabled = daysOfWeekDisabled.reduce(function (previousValue, currentValue) {
                currentValue = parseInt(currentValue, 10);
                if (currentValue > 6 || currentValue < 0 || isNaN(currentValue)) {
                    return previousValue;
                }
                if (previousValue.indexOf(currentValue) === -1) {
                    previousValue.push(currentValue);
                }
                return previousValue;
            }, []).sort();
            if (options.useCurrent && !options.keepInvalid) {
                var tries = 0;
                while (!isValid(date, 'd')) {
                    date.add(1, 'd');
                    if (tries === 7) {
                        throw 'Tried 7 times to find a valid date';
                    }
                    tries++;
                }
                setValue(date);
            }
            update();
            return picker;
        };

        picker.maxDate = function (maxDate) {
            if (arguments.length === 0) {
                return options.maxDate ? options.maxDate.clone() : options.maxDate;
            }

            if ((typeof maxDate === 'boolean') && maxDate === false) {
                options.maxDate = false;
                update();
                return picker;
            }

            if (typeof maxDate === 'string') {
                if (maxDate === 'now' || maxDate === 'moment') {
                    maxDate = getMoment();
                }
            }

            var parsedDate = parseInputDate(maxDate);

            if (!parsedDate.isValid()) {
                throw new TypeError('maxDate() Could not parse date parameter: ' + maxDate);
            }
            if (options.minDate && parsedDate.isBefore(options.minDate)) {
                throw new TypeError('maxDate() date parameter is before options.minDate: ' + parsedDate.format(actualFormat));
            }
            options.maxDate = parsedDate;
            if (options.useCurrent && !options.keepInvalid && date.isAfter(maxDate)) {
                setValue(options.maxDate);
            }
            if (viewDate.isAfter(parsedDate)) {
                viewDate = parsedDate.clone().subtract(options.stepping, 'm');
            }
            update();
            return picker;
        };

        picker.minDate = function (minDate) {
            if (arguments.length === 0) {
                return options.minDate ? options.minDate.clone() : options.minDate;
            }

            if ((typeof minDate === 'boolean') && minDate === false) {
                options.minDate = false;
                update();
                return picker;
            }

            if (typeof minDate === 'string') {
                if (minDate === 'now' || minDate === 'moment') {
                    minDate = getMoment();
                }
            }

            var parsedDate = parseInputDate(minDate);

            if (!parsedDate.isValid()) {
                throw new TypeError('minDate() Could not parse date parameter: ' + minDate);
            }
            if (options.maxDate && parsedDate.isAfter(options.maxDate)) {
                throw new TypeError('minDate() date parameter is after options.maxDate: ' + parsedDate.format(actualFormat));
            }
            options.minDate = parsedDate;
            if (options.useCurrent && !options.keepInvalid && date.isBefore(minDate)) {
                setValue(options.minDate);
            }
            if (viewDate.isBefore(parsedDate)) {
                viewDate = parsedDate.clone().add(options.stepping, 'm');
            }
            update();
            return picker;
        };

        picker.defaultDate = function (defaultDate) {
            ///<signature helpKeyword="$.fn.datetimepicker.defaultDate">
            ///<summary>Returns a moment with the options.defaultDate option configuration or false if not set</summary>
            ///<returns type="Moment">date.clone()</returns>
            ///</signature>
            ///<signature>
            ///<summary>Will set the picker's inital date. If a boolean:false value is passed the options.defaultDate parameter is cleared.</summary>
            ///<param name="defaultDate" locid="$.fn.datetimepicker.defaultDate_p:defaultDate">Takes a string, Date, moment, boolean:false</param>
            ///</signature>
            if (arguments.length === 0) {
                return options.defaultDate ? options.defaultDate.clone() : options.defaultDate;
            }
            if (!defaultDate) {
                options.defaultDate = false;
                return picker;
            }

            if (typeof defaultDate === 'string') {
                if (defaultDate === 'now' || defaultDate === 'moment') {
                    defaultDate = getMoment();
                }
            }

            var parsedDate = parseInputDate(defaultDate);
            if (!parsedDate.isValid()) {
                throw new TypeError('defaultDate() Could not parse date parameter: ' + defaultDate);
            }
            if (!isValid(parsedDate)) {
                throw new TypeError('defaultDate() date passed is invalid according to component setup validations');
            }

            options.defaultDate = parsedDate;

            if ((options.defaultDate && options.inline) || input.val().trim() === '') {
                setValue(options.defaultDate);
            }
            return picker;
        };

        picker.locale = function (locale) {
            if (arguments.length === 0) {
                return options.locale;
            }

            if (!moment.localeData(locale)) {
                throw new TypeError('locale() locale ' + locale + ' is not loaded from moment locales!');
            }

            options.locale = locale;
            date.locale(options.locale);
            viewDate.locale(options.locale);

            if (actualFormat) {
                initFormatting(); // reinit formatting
            }
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.stepping = function (stepping) {
            if (arguments.length === 0) {
                return options.stepping;
            }

            stepping = parseInt(stepping, 10);
            if (isNaN(stepping) || stepping < 1) {
                stepping = 1;
            }
            options.stepping = stepping;
            return picker;
        };

        picker.useCurrent = function (useCurrent) {
            var useCurrentOptions = ['year', 'month', 'day', 'hour', 'minute'];
            if (arguments.length === 0) {
                return options.useCurrent;
            }

            if ((typeof useCurrent !== 'boolean') && (typeof useCurrent !== 'string')) {
                throw new TypeError('useCurrent() expects a boolean or string parameter');
            }
            if (typeof useCurrent === 'string' && useCurrentOptions.indexOf(useCurrent.toLowerCase()) === -1) {
                throw new TypeError('useCurrent() expects a string parameter of ' + useCurrentOptions.join(', '));
            }
            options.useCurrent = useCurrent;
            return picker;
        };

        picker.collapse = function (collapse) {
            if (arguments.length === 0) {
                return options.collapse;
            }

            if (typeof collapse !== 'boolean') {
                throw new TypeError('collapse() expects a boolean parameter');
            }
            if (options.collapse === collapse) {
                return picker;
            }
            options.collapse = collapse;
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.icons = function (icons) {
            if (arguments.length === 0) {
                return $.extend({}, options.icons);
            }

            if (!(icons instanceof Object)) {
                throw new TypeError('icons() expects parameter to be an Object');
            }
            $.extend(options.icons, icons);
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.tooltips = function (tooltips) {
            if (arguments.length === 0) {
                return $.extend({}, options.tooltips);
            }

            if (!(tooltips instanceof Object)) {
                throw new TypeError('tooltips() expects parameter to be an Object');
            }
            $.extend(options.tooltips, tooltips);
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.useStrict = function (useStrict) {
            if (arguments.length === 0) {
                return options.useStrict;
            }

            if (typeof useStrict !== 'boolean') {
                throw new TypeError('useStrict() expects a boolean parameter');
            }
            options.useStrict = useStrict;
            return picker;
        };

        picker.sideBySide = function (sideBySide) {
            if (arguments.length === 0) {
                return options.sideBySide;
            }

            if (typeof sideBySide !== 'boolean') {
                throw new TypeError('sideBySide() expects a boolean parameter');
            }
            options.sideBySide = sideBySide;
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.viewMode = function (viewMode) {
            if (arguments.length === 0) {
                return options.viewMode;
            }

            if (typeof viewMode !== 'string') {
                throw new TypeError('viewMode() expects a string parameter');
            }

            if (viewModes.indexOf(viewMode) === -1) {
                throw new TypeError('viewMode() parameter must be one of (' + viewModes.join(', ') + ') value');
            }

            options.viewMode = viewMode;
            currentViewMode = Math.max(viewModes.indexOf(viewMode), minViewModeNumber);

            showMode();
            return picker;
        };

        picker.toolbarPlacement = function (toolbarPlacement) {
            if (arguments.length === 0) {
                return options.toolbarPlacement;
            }

            if (typeof toolbarPlacement !== 'string') {
                throw new TypeError('toolbarPlacement() expects a string parameter');
            }
            if (toolbarPlacements.indexOf(toolbarPlacement) === -1) {
                throw new TypeError('toolbarPlacement() parameter must be one of (' + toolbarPlacements.join(', ') + ') value');
            }
            options.toolbarPlacement = toolbarPlacement;

            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.widgetPositioning = function (widgetPositioning) {
            if (arguments.length === 0) {
                return $.extend({}, options.widgetPositioning);
            }

            if (({}).toString.call(widgetPositioning) !== '[object Object]') {
                throw new TypeError('widgetPositioning() expects an object variable');
            }
            if (widgetPositioning.horizontal) {
                if (typeof widgetPositioning.horizontal !== 'string') {
                    throw new TypeError('widgetPositioning() horizontal variable must be a string');
                }
                widgetPositioning.horizontal = widgetPositioning.horizontal.toLowerCase();
                if (horizontalModes.indexOf(widgetPositioning.horizontal) === -1) {
                    throw new TypeError('widgetPositioning() expects horizontal parameter to be one of (' + horizontalModes.join(', ') + ')');
                }
                options.widgetPositioning.horizontal = widgetPositioning.horizontal;
            }
            if (widgetPositioning.vertical) {
                if (typeof widgetPositioning.vertical !== 'string') {
                    throw new TypeError('widgetPositioning() vertical variable must be a string');
                }
                widgetPositioning.vertical = widgetPositioning.vertical.toLowerCase();
                if (verticalModes.indexOf(widgetPositioning.vertical) === -1) {
                    throw new TypeError('widgetPositioning() expects vertical parameter to be one of (' + verticalModes.join(', ') + ')');
                }
                options.widgetPositioning.vertical = widgetPositioning.vertical;
            }
            update();
            return picker;
        };

        picker.calendarWeeks = function (calendarWeeks) {
            if (arguments.length === 0) {
                return options.calendarWeeks;
            }

            if (typeof calendarWeeks !== 'boolean') {
                throw new TypeError('calendarWeeks() expects parameter to be a boolean value');
            }

            options.calendarWeeks = calendarWeeks;
            update();
            return picker;
        };

        picker.showTodayButton = function (showTodayButton) {
            if (arguments.length === 0) {
                return options.showTodayButton;
            }

            if (typeof showTodayButton !== 'boolean') {
                throw new TypeError('showTodayButton() expects a boolean parameter');
            }

            options.showTodayButton = showTodayButton;
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.showClear = function (showClear) {
            if (arguments.length === 0) {
                return options.showClear;
            }

            if (typeof showClear !== 'boolean') {
                throw new TypeError('showClear() expects a boolean parameter');
            }

            options.showClear = showClear;
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.widgetParent = function (widgetParent) {
            if (arguments.length === 0) {
                return options.widgetParent;
            }

            if (typeof widgetParent === 'string') {
                widgetParent = $(widgetParent);
            }

            if (widgetParent !== null && (typeof widgetParent !== 'string' && !(widgetParent instanceof $))) {
                throw new TypeError('widgetParent() expects a string or a jQuery object parameter');
            }

            options.widgetParent = widgetParent;
            if (widget) {
                hide();
                show();
            }
            return picker;
        };

        picker.keepOpen = function (keepOpen) {
            if (arguments.length === 0) {
                return options.keepOpen;
            }

            if (typeof keepOpen !== 'boolean') {
                throw new TypeError('keepOpen() expects a boolean parameter');
            }

            options.keepOpen = keepOpen;
            return picker;
        };

        picker.focusOnShow = function (focusOnShow) {
            if (arguments.length === 0) {
                return options.focusOnShow;
            }

            if (typeof focusOnShow !== 'boolean') {
                throw new TypeError('focusOnShow() expects a boolean parameter');
            }

            options.focusOnShow = focusOnShow;
            return picker;
        };

        picker.inline = function (inline) {
            if (arguments.length === 0) {
                return options.inline;
            }

            if (typeof inline !== 'boolean') {
                throw new TypeError('inline() expects a boolean parameter');
            }

            options.inline = inline;
            return picker;
        };

        picker.clear = function () {
            clear();
            return picker;
        };

        picker.keyBinds = function (keyBinds) {
            options.keyBinds = keyBinds;
            return picker;
        };

        picker.getMoment = function (d) {
            return getMoment(d);
        };

        picker.debug = function (debug) {
            if (typeof debug !== 'boolean') {
                throw new TypeError('debug() expects a boolean parameter');
            }

            options.debug = debug;
            return picker;
        };

        picker.allowInputToggle = function (allowInputToggle) {
            if (arguments.length === 0) {
                return options.allowInputToggle;
            }

            if (typeof allowInputToggle !== 'boolean') {
                throw new TypeError('allowInputToggle() expects a boolean parameter');
            }

            options.allowInputToggle = allowInputToggle;
            return picker;
        };

        picker.showClose = function (showClose) {
            if (arguments.length === 0) {
                return options.showClose;
            }

            if (typeof showClose !== 'boolean') {
                throw new TypeError('showClose() expects a boolean parameter');
            }

            options.showClose = showClose;
            return picker;
        };

        picker.keepInvalid = function (keepInvalid) {
            if (arguments.length === 0) {
                return options.keepInvalid;
            }

            if (typeof keepInvalid !== 'boolean') {
                throw new TypeError('keepInvalid() expects a boolean parameter');
            }
            options.keepInvalid = keepInvalid;
            return picker;
        };

        picker.datepickerInput = function (datepickerInput) {
            if (arguments.length === 0) {
                return options.datepickerInput;
            }

            if (typeof datepickerInput !== 'string') {
                throw new TypeError('datepickerInput() expects a string parameter');
            }

            options.datepickerInput = datepickerInput;
            return picker;
        };

        picker.parseInputDate = function (parseInputDate) {
            if (arguments.length === 0) {
                return options.parseInputDate;
            }

            if (typeof parseInputDate !== 'function') {
                throw new TypeError('parseInputDate() sholud be as function');
            }

            options.parseInputDate = parseInputDate;

            return picker;
        };

        picker.disabledTimeIntervals = function (disabledTimeIntervals) {
            ///<signature helpKeyword="$.fn.datetimepicker.disabledTimeIntervals">
            ///<summary>Returns an array with the currently set disabled dates on the component.</summary>
            ///<returns type="array">options.disabledTimeIntervals</returns>
            ///</signature>
            ///<signature>
            ///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of
            ///options.enabledDates if such exist.</summary>
            ///<param name="dates" locid="$.fn.datetimepicker.disabledTimeIntervals_p:dates">Takes an [ string or Date or moment ] of values and allows the user to select only from those days.</param>
            ///</signature>
            if (arguments.length === 0) {
                return (options.disabledTimeIntervals ? $.extend({}, options.disabledTimeIntervals) : options.disabledTimeIntervals);
            }

            if (!disabledTimeIntervals) {
                options.disabledTimeIntervals = false;
                update();
                return picker;
            }
            if (!(disabledTimeIntervals instanceof Array)) {
                throw new TypeError('disabledTimeIntervals() expects an array parameter');
            }
            options.disabledTimeIntervals = disabledTimeIntervals;
            update();
            return picker;
        };

        picker.disabledHours = function (hours) {
            ///<signature helpKeyword="$.fn.datetimepicker.disabledHours">
            ///<summary>Returns an array with the currently set disabled hours on the component.</summary>
            ///<returns type="array">options.disabledHours</returns>
            ///</signature>
            ///<signature>
            ///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of
            ///options.enabledHours if such exist.</summary>
            ///<param name="hours" locid="$.fn.datetimepicker.disabledHours_p:hours">Takes an [ int ] of values and disallows the user to select only from those hours.</param>
            ///</signature>
            if (arguments.length === 0) {
                return (options.disabledHours ? $.extend({}, options.disabledHours) : options.disabledHours);
            }

            if (!hours) {
                options.disabledHours = false;
                update();
                return picker;
            }
            if (!(hours instanceof Array)) {
                throw new TypeError('disabledHours() expects an array parameter');
            }
            options.disabledHours = indexGivenHours(hours);
            options.enabledHours = false;
            if (options.useCurrent && !options.keepInvalid) {
                var tries = 0;
                while (!isValid(date, 'h')) {
                    date.add(1, 'h');
                    if (tries === 24) {
                        throw 'Tried 24 times to find a valid date';
                    }
                    tries++;
                }
                setValue(date);
            }
            update();
            return picker;
        };

        picker.enabledHours = function (hours) {
            ///<signature helpKeyword="$.fn.datetimepicker.enabledHours">
            ///<summary>Returns an array with the currently set enabled hours on the component.</summary>
            ///<returns type="array">options.enabledHours</returns>
            ///</signature>
            ///<signature>
            ///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of options.disabledHours if such exist.</summary>
            ///<param name="hours" locid="$.fn.datetimepicker.enabledHours_p:hours">Takes an [ int ] of values and allows the user to select only from those hours.</param>
            ///</signature>
            if (arguments.length === 0) {
                return (options.enabledHours ? $.extend({}, options.enabledHours) : options.enabledHours);
            }

            if (!hours) {
                options.enabledHours = false;
                update();
                return picker;
            }
            if (!(hours instanceof Array)) {
                throw new TypeError('enabledHours() expects an array parameter');
            }
            options.enabledHours = indexGivenHours(hours);
            options.disabledHours = false;
            if (options.useCurrent && !options.keepInvalid) {
                var tries = 0;
                while (!isValid(date, 'h')) {
                    date.add(1, 'h');
                    if (tries === 24) {
                        throw 'Tried 24 times to find a valid date';
                    }
                    tries++;
                }
                setValue(date);
            }
            update();
            return picker;
        };

        picker.viewDate = function (newDate) {
            ///<signature helpKeyword="$.fn.datetimepicker.viewDate">
            ///<summary>Returns the component's model current viewDate, a moment object or null if not set.</summary>
            ///<returns type="Moment">viewDate.clone()</returns>
            ///</signature>
            ///<signature>
            ///<summary>Sets the components model current moment to it. Passing a null value unsets the components model current moment. Parsing of the newDate parameter is made using moment library with the options.format and options.useStrict components configuration.</summary>
            ///<param name="newDate" locid="$.fn.datetimepicker.date_p:newDate">Takes string, viewDate, moment, null parameter.</param>
            ///</signature>
            if (arguments.length === 0) {
                return viewDate.clone();
            }

            if (!newDate) {
                viewDate = date.clone();
                return picker;
            }

            if (typeof newDate !== 'string' && !moment.isMoment(newDate) && !(newDate instanceof Date)) {
                throw new TypeError('viewDate() parameter must be one of [string, moment or Date]');
            }

            viewDate = parseInputDate(newDate);
            viewUpdate();
            return picker;
        };

        // initializing element and component attributes
        if (element.is('input')) {
            input = element;
        } else {
            input = element.find(options.datepickerInput);
            if (input.size() === 0) {
                input = element.find('input');
            } else if (!input.is('input')) {
                throw new Error('CSS class "' + options.datepickerInput + '" cannot be applied to non input element');
            }
        }

        if (element.hasClass('input-group')) {
            // in case there is more then one 'input-group-addon' Issue #48
            if (element.find('.datepickerbutton').size() === 0) {
                component = element.find('.input-group-addon');
            } else {
                component = element.find('.datepickerbutton');
            }
        }

        if (!options.inline && !input.is('input')) {
            throw new Error('Could not initialize DateTimePicker without an input element');
        }

        // Set defaults for date here now instead of in var declaration
        date = getMoment();
        viewDate = date.clone();

        $.extend(true, options, dataToOptions());

        picker.options(options);

        initFormatting();

        attachDatePickerElementEvents();

        if (input.prop('disabled')) {
            picker.disable();
        }
        if (input.is('input') && input.val().trim().length !== 0) {
            setValue(parseInputDate(input.val().trim()));
        }
        else if (options.defaultDate && input.attr('placeholder') === undefined) {
            setValue(options.defaultDate);
        }
        if (options.inline) {
            show();
        }
        return picker;
    };

    /********************************************************************************
     *
     * jQuery plugin constructor and defaults object
     *
     ********************************************************************************/

    $.fn.datetimepicker = function (options) {
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('DateTimePicker')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.datetimepicker.defaults, options);
                $this.data('DateTimePicker', dateTimePicker($this, options));
            }
        });
    };

    $.fn.datetimepicker.defaults = {
        timeZone: 'Etc/UTC',
        format: false,
        dayViewHeaderFormat: 'MMMM YYYY',
        extraFormats: false,
        stepping: 1,
        minDate: false,
        maxDate: false,
        useCurrent: true,
        collapse: true,
        locale: moment.locale(),
        defaultDate: false,
        disabledDates: false,
        enabledDates: false,
        icons: {
            time: 'glyphicon glyphicon-time',
            date: 'glyphicon glyphicon-calendar',
            up: 'glyphicon glyphicon-chevron-up',
            down: 'glyphicon glyphicon-chevron-down',
            previous: 'glyphicon glyphicon-chevron-left',
            next: 'glyphicon glyphicon-chevron-right',
            today: 'glyphicon glyphicon-screenshot',
            clear: 'glyphicon glyphicon-trash',
            close: 'glyphicon glyphicon-remove'
        },
        tooltips: {
            today: 'Go to today',
            clear: 'Clear selection',
            close: 'Close the picker',
            selectMonth: 'Select Month',
            prevMonth: 'Previous Month',
            nextMonth: 'Next Month',
            selectYear: 'Select Year',
            prevYear: 'Previous Year',
            nextYear: 'Next Year',
            selectDecade: 'Select Decade',
            prevDecade: 'Previous Decade',
            nextDecade: 'Next Decade',
            prevCentury: 'Previous Century',
            nextCentury: 'Next Century',
            pickHour: 'Pick Hour',
            incrementHour: 'Increment Hour',
            decrementHour: 'Decrement Hour',
            pickMinute: 'Pick Minute',
            incrementMinute: 'Increment Minute',
            decrementMinute: 'Decrement Minute',
            pickSecond: 'Pick Second',
            incrementSecond: 'Increment Second',
            decrementSecond: 'Decrement Second',
            togglePeriod: 'Toggle Period',
            selectTime: 'Select Time'
        },
        useStrict: false,
        sideBySide: false,
        daysOfWeekDisabled: false,
        calendarWeeks: false,
        viewMode: 'days',
        toolbarPlacement: 'default',
        showTodayButton: false,
        showClear: false,
        showClose: false,
        widgetPositioning: {
            horizontal: 'auto',
            vertical: 'auto'
        },
        widgetParent: null,
        ignoreReadonly: false,
        keepOpen: false,
        focusOnShow: true,
        inline: false,
        keepInvalid: false,
        datepickerInput: '.datepickerinput',
        keyBinds: {
            up: function (widget) {
                if (!widget) {
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().subtract(7, 'd'));
                } else {
                    this.date(d.clone().add(this.stepping(), 'm'));
                }
            },
            down: function (widget) {
                if (!widget) {
                    this.show();
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().add(7, 'd'));
                } else {
                    this.date(d.clone().subtract(this.stepping(), 'm'));
                }
            },
            'control up': function (widget) {
                if (!widget) {
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().subtract(1, 'y'));
                } else {
                    this.date(d.clone().add(1, 'h'));
                }
            },
            'control down': function (widget) {
                if (!widget) {
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().add(1, 'y'));
                } else {
                    this.date(d.clone().subtract(1, 'h'));
                }
            },
            left: function (widget) {
                if (!widget) {
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().subtract(1, 'd'));
                }
            },
            right: function (widget) {
                if (!widget) {
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().add(1, 'd'));
                }
            },
            pageUp: function (widget) {
                if (!widget) {
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().subtract(1, 'M'));
                }
            },
            pageDown: function (widget) {
                if (!widget) {
                    return;
                }
                var d = this.date() || this.getMoment();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.clone().add(1, 'M'));
                }
            },
            enter: function () {
                this.hide();
            },
            escape: function () {
                this.hide();
            },
            //tab: function (widget) { //this break the flow of the form. disabling for now
            //    var toggle = widget.find('.picker-switch a[data-action="togglePicker"]');
            //    if(toggle.length > 0) toggle.click();
            //},
            'control space': function (widget) {
                if (widget.find('.timepicker').is(':visible')) {
                    widget.find('.btn[data-action="togglePeriod"]').click();
                }
            },
            t: function () {
                this.date(this.getMoment());
            },
            'delete': function () {
                this.clear();
            }
        },
        debug: false,
        allowInputToggle: false,
        disabledTimeIntervals: false,
        disabledHours: false,
        enabledHours: false,
        viewDate: false
    };
}));


RS.Controls.DateTimePicker = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        Templates: [
             {
                 IsDefault: true,
                 Id: 'datetimepicker-template'
             }
        ],
        Hours: {
            Enabled: false
        }
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    var proxyOptions = {
        format: self.Options.Hours.Enabled ? 'DD/MM/YYYY hh:mm' : 'DD/MM/YYYY'
    };

    RS.Controls.DateTimePicker.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;
    this.Elements.Picker = null;
    this.SelectedDate = null;

    var proxyControl = null;

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('select');

        return self;
    });

    this.setDate = function (date) {
        self.SelectedDate = date;
        proxyControl.date(self.SelectedDate);
    };

    this.disable = override(self.disable, function () {
        if (!proxyControl)
            return self;

        proxyControl.disable();

        return self;
    });

    this.enable = override(self.enable, function () {
        if (!proxyControl)
            return self;

        proxyControl.enable();

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Picker = self.Elements.Me.attr('role') == 'datetimepicker' ? self.Elements.Me : self.Elements.Me.find('[role="datetimepicker"]:first');

        self.Elements.Picker.datetimepicker(proxyOptions);
        self.Elements.Picker.on("dp.change", function (e) {
            self.SelectedDate = e.date ? e.date.toDate() : null;

            self.PubSub.triggerEvent('select', {
                Source: self,
                Data: self.SelectedDate
            });
        });

        proxyControl = self.Elements.Picker.data("DateTimePicker");

        self.Elements.Picker.find('input:first').bind('focusin', function () { proxyControl.show(); });
        proxyControl.date(self.SelectedDate);

        if (self.Options.IsEnabled)
            self.enable();
        else self.disable();

        return self;
    });

    this.getIdentifier = function () { return 'DateTimePicker'; }

    if (!isInherited) {
        self.initialize();
        self.appendTo(container, true);
    }
};
extend(RS.Controls.DateTimePicker, RS.Controls.Control);

RS.Controls.ControlsGenerator = (function () {
    var self = this;

    var registeredBuilders = [];

    var listenForControls = function (container) {
        container = container || $(document);

        container.on('DOMNodeInserted', function (e) {
            var elementInserted = $(e.target);
            generateControlsInContainer(elementInserted);
        });
    };

    var getBuilder = function (name) {
        if (!name)
            return null;

        name = name.toLowerCase();
        for (var i = 0; i < registeredBuilders.length; i++) {
            var rb = registeredBuilders[i];
            if (rb.Name.toLowerCase() == name)
                return rb;
        }

        return null;
    };

    var registerBuilder = function (name, builder) {
        var existingBuilder = getBuilder(name);
        if (existingBuilder != null)
            existingBuilder = builder;
        else registeredBuilders.push(builder);
    };

    var generateControlsInContainer = function (container) {
        container = container || $(document);
        generateControl(container);
        container.find('[data-control]').each(function () {
            generateControl($(this));
        });
    };

    var generateControl = function (el) {
        if (!el)
            return;

        if (el.data('generator-initialized'))
            return;

        el.data('generator-initialized', true);

        var controlType = (el.attr('data-control') || '');
        if (!controlType)
            return;

        var builder = getBuilder(controlType);
        if (builder) {
            builder.build(el);
            RS.Event.sendEvent(el, 'control-initialized');
        }
    };

    return {
        listenForControls: function (container) { listenForControls(container); },
        generateControl: function (el) { generateControl(el); },
        generateControlsInContainer: function (container) { generateControlsInContainer(container); },
        registerBuilder: function (name, builder) { registerBuilder(name, builder); }
    };
})();

RS.Controls.ControlsGenerator.registerBuilder('Container', {
    Name: 'Container',
    build: function (el) {
        new RS.Controls.Container(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Button', {
    Name: 'Button',
    build: function (el) {
        new RS.Controls.Button(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('ToggleButton', {
    Name: 'ToggleButton',
    build: function (el) {
        new RS.Controls.ToggleButton(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('ButtonGroup', {
    Name: 'ButtonGroup',
    build: function (el) {
        new RS.Controls.ButtonGroup(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Modal', {
    Name: 'Modal',
    build: function (el) {
        new RS.Controls.ButtonGroup(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Tooltip', {
    Name: 'Tooltip',
    build: function (el) {
        new RS.Controls.Tooltip(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Popover', {
    Name: 'Popover',
    build: function (el) {
        new RS.Controls.Popover(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Dropdown', {
    Name: 'Dropdown',
    build: function (el) {
        new RS.Controls.Dropdown(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('ButtonDropdown', {
    Name: 'ButtonDropdown',
    build: function (el) {
        new RS.Controls.ButtonDropdown(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('SplitButton', {
    Name: 'SplitButton',
    build: function (el) {
        new RS.Controls.SplitButton(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('List', {
    Name: 'List',
    build: function (el) {
        new RS.Controls.List(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Tab', {
    Name: 'Tab',
    build: function (el) {
        new RS.Controls.Tab(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Breadcrumb', {
    Name: 'Breadcrumb',
    build: function (el) {
        new RS.Controls.Breadcrumb(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Panel', {
    Name: 'Panel',
    build: function (el) {
        new RS.Controls.Panel(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('ProgressBar', {
    Name: 'ProgressBar',
    build: function (el) {
        new RS.Controls.ProgressBar(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Pager', {
    Name: 'Pager',
    build: function (el) {
        new RS.Controls.Pager(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Menu', {
    Name: 'Menu',
    build: function (el) {
        new RS.Controls.Menu(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Autocomplete', {
    Name: 'Autocomplete',
    build: function (el) {
        new RS.Controls.Autocomplete(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Combobox', {
    Name: 'Combobox',
    build: function (el) {
        new RS.Controls.Combobox(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('TreeView', {
    Name: 'TreeView',
    build: function (el) {
        new RS.Controls.TreeView(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('Grid', {
    Name: 'Grid',
    build: function (el) {
        new RS.Controls.Grid(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('DateTimePicker', {
    Name: 'DateTimePicker',
    build: function (el) {
        new RS.Controls.DateTimePicker(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('DataGrid', {
    Name: 'DataGrid',
    build: function (el) {
        new RS.Controls.DataGrid(null, el);
    }
});

RS.Controls.ControlsGenerator.registerBuilder('DataDropdown', {
    Name: 'DataDropdown',
    build: function (el) {
        new RS.Controls.DataDropdown(null, el);
    }
});