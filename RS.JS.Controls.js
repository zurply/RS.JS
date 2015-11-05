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
        console.log('control');
        self.initializeFromContainer();
        self.initializeHtml();

        return self;
    };

    this.initializeHtml = function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Me.data('control', self);

        setEnabled(self.Options.IsEnabled);

        return self;
    };

    this.initializeFromContainer = function () {
        if (!container)
            return self;

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

    if (!isInherited)
        self.initialize();
};

RS.Controls.DataSource = function (options, isInherited) {
    var self = this;

    this.Options = {
        Data: null,
        RemoteCall: {
            Url: null,
            Type: 'GET'
        },
        Paging: {
            IsEnabled: true
        },
        IsCaseSensitive: false
    };

    if (options)
        this.Options = $.extend(this.Options, options);

    this.PubSub = null;
    this.IsLoading = false;
    this.Parameters = null;
    this.PageIndex = -1;

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
        if (self.Options.RemoteCall.Url)
            getRemoteData(options, function (response) { onGotData(options, response); if (callback) callback(); });
        else getLocalData(options, function (response) { onGotData(options, response); if (callback) callback(); });
    };

    this.clear = function (options) {
        self.PageIndex = -1;
        self.Options.Data = null;

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

    this.setParameter = function (name, value) {
        self.Parameters = setParameterValue(self.Parameters, name, value);
    };

    this.getParameterValue = function (name) {
        if (!self.Parameters)
            return null;

        var p = self.Parameters.findFirst(function (item, index) { return item.Name == name; });
        return p ? p.Value : null;
    };

    var setParameterValue = function (parameters, name, value) {
        if (!name)
            return;

        if (!parameters)
            parameters = [];

        var found = false;
        for (var i = 0; i < parameters.length; i++) {
            var p = parameters[i];
            if (p.Name == name) {
                p.Value = value;
                found = true;
                break;
            }
        }

        if (!found)
            parameters.push({
                Name: name,
                Value: value
            });

        return parameters;
    };

    var getRemoteData = function (options, callback) {
        if (!self.Options.RemoteCall)
            return;

        self.IsLoading = true;

        var data = getDataFromParameters(self.Parameters);
        if (self.Options.Paging.IsEnabled) {
            data = data || {};
            data.pageIndex = options ? options.PageIndex : 0;
            lastPageIndexToLoad = data.pageIndex;
        };

        if (self.Options.RemoteCall.Url)
            RS.Remote.call(self.Options.RemoteCall.Url, data, function (response) {
                if (self.Options.Paging.IsEnabled)
                    self.PageIndex = Math.max(self.PageIndex, data.pageIndex || 0);

                if (data.pageIndex == lastPageIndexToLoad)
                    self.IsLoading = false;

                if (callback)
                    callback(response);
            }, self.Options.RemoteCall.Type);
    };

    var getDataFromParameters = function (parameters) {
        if (!parameters)
            return null;

        var data = {};
        for (var i = 0; i < parameters.length; i++) {
            var p = parameters[i];
            data[p.Name] = p.Value;
        }

        return data;
    };

    var getLocalData = function (options, callback) {
        var data = self.Options.Data;

        if (data) {
            var term = self.getParameterValue('term');
            if (term) {
                if (self.Options.IsCaseSensitive)
                    term = term.toLowerCase();

                data = data.filter(function (item, index) { return item && item.Text && ((self.Options.IsCaseSensitive && item.Text.indexOf(term) > -1) || (!self.Options.IsCaseSensitive && item.Text.toLowerCase().indexOf(term) > -1)); });
            }
        }

        if (callback)
            callback(data);

        return data;
    };

    var onGotData = function (options, response) {
        self.Options.Data = self.Options.Data || [];

        if (self.Options.RemoteCall.Url && response) {
            if (response instanceof Array) {
                for (var i = 0; i < response.length; i++)
                    self.Options.Data.push(response[i]);
            }
            else self.Options.Data.push(response);
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
        IsPinned: false,
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

    if (!isInherited)
        self.initialize();
};
extend(RS.Controls.Notification, RS.Controls.Control);

RS.Controls.Notifier = function (options, container, isInherited) {
    var self = this;

    this.Options = {
        IsPinned: false,
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
        if (notification)
            notification.hide();

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
        console.log('button');
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
        console.log('togglebutton');
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
        console.log('buttongroup');

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
        IsDismiss: false
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.ModalButton.superclass.constructor.call(this, self.Options, container, true);

    this.initialize = override(self.initialize, function () {
        console.log('modalbutton');
    });

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
        CloseOnClickOutside: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Modal.superclass.constructor.call(this, self.Options, container, true);

    this.Notifier = null;

    this.initialize = override(self.initialize, function () {
        console.log('modal');
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

        return self;
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
        HighlightFirst: true,
        CanSelect: true,
        CanHighlight: true,
        RefreshAfterDataSourceChanged: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.DataControl.superclass.constructor.call(this, self.Options, container, true);

    this.HighlightedIndex = -1;
    this.SelectedIndex = -1;
    this.SelectedItem = null;
    this.Elements.List = null;

    var lastHighlightedItem = null;
    var lastTerm = null;
    var searchTimeoutId = null;
    var dataSourceEventsBoundTo = null;

    this.initialize = override(self.initialize, function () {
        self.PubSub.addEvent('highlight');
        self.PubSub.addEvent('select');

        setDataSourceEvents(self.Options.DataSource);

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Search = self.Elements.Me.find('[role="popover"]:first input');
        self.Elements.List = self.Elements.Me.attr('role') == 'list' ? self.Elements.Me : self.Elements.Me.find('[role="list"]:first');
        self.setCanSearch(self.Options.Search.CanSearch);
        self.setPlaceholder(self.Options.Search.Placeholder);
        self.setContinuousPaginationScrollingParent(self.Options.Paging.ContinuousPaginationScrollingParent);

        self.Elements.List.on('click', '[role="listitem"]', function (e) {
            var el = $(this);
            var index = el.parent().children().index(el);
            self.highlightIndex(index);
            self.selectIndex(index);
        });

        self.Elements.Search.keyup(function (e) { handleSearchKeyPressed(); return false; });

        self.Elements.Me.keydown(function (e) {
            if (e.keyCode == RS.Keys.DOWN) {
                self.highlightIndex(self.HighlightedIndex + 1);

                return false;
            }
            else if (e.keyCode == RS.Keys.UP) {
                self.highlightIndex(self.HighlightedIndex - 1);

                return false;
            }
            else if (e.keyCode == RS.Keys.ENTER) {
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

        return self;
    });

    this.setContinuousPaginationScrollingParent = function (container) {
        self.Options.Paging.ContinuousPaginationScrollingParent = container;

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

        index = Math.max(0, Math.min(index || 0, self.Options.DataSource.Options.Data.length - 1));
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

    this.selectIndex = function (index) {
        if (!self.Options.CanSelect || !self.Options.DataSource || !self.Options.DataSource.Options.Data)
            return self;

        index = Math.max(0, Math.min(index || 0, self.Options.DataSource.Options.Data.length - 1));
        if (self.SelectedIndex == index)
            return self;

        self.SelectedIndex = index;
        self.SelectedItem = self.Options.DataSource.Options.Data[index];

        self.PubSub.triggerEvent('select', {
            Source: self,
            Index: index,
            Item: self.SelectedItem
        });

        return self;
    };

    this.setDataSource = function (dataSource) {
        if (self.Options.DataSource == dataSource)
            return self;

        self.Options.DataSource = dataSource;
        setDataSourceEvents(dataSource);

        if (dataSource && self.Options.RefreshAfterDataSourceChanged)
            dataSource.refresh();

        return self;
    };

    var setDataSourceEvents = function (dataSource) {
        if (!dataSource || dataSourceEventsBoundTo == dataSource)
            return;

        dataSourceEventsBoundTo = dataSource;

        if (self.Options.Search.CanSearch)
            dataSource.Options.IsCaseSensitive = self.Options.Search.IsCaseSensitive;

        dataSource.PubSub.addListener('refresh', function (e) {
            renderItems(e.Options, e.Data);
        });

        dataSource.PubSub.addListener('add', function (e) {
            renderItems({
                Index: e.Index
            }, e.Items);
        });

        dataSource.PubSub.addListener('clear', function (e) {
            clear(e.Options);
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

    var clear = function (options) {
        if (options && options.IsRefresh)
            return;

        if (!self.Elements.List)
            return;

        self.HighlightedIndex = -1;
        self.SelectedIndex = -1;
        self.SelectedItem = null;

        self.Elements.List.empty();

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

    var handleSearchKeyPressed = function () {
        if (!self.Elements.Search || !self.Options.Search.CanSearch || !self.Options.DataSource)
            return;

        var term = self.Elements.Search.val();

        if (searchTimeoutId)
            clearTimeout(searchTimeoutId);

        if (self.Options.Search.Delay) {
            searchTimeoutId = setTimeout(function () {
                self.search(term);
            }, self.Options.Search.Delay);
        }
        else self.search(term);
    };

    var renderItems = function (options, data) {
        console.log('render');
        if (!self.Elements.Me)
            return self;

        if (options && options.IsRefresh) {
            clear();
            self.Elements.List.scrollTop();
        }

        data = data || [];
        if (!(data instanceof Array)) {
            var array = [];
            array.push(data);
            data = array;
        }

        var template = self.getDefaultTemplate();
        if (!template)
            return null;

        template.ItemCompiled = template.ItemCompiled || Handlebars.compile($("#" + template.ItemTemplateId).html());

        var html = template.ItemCompiled({
            Items: data
        });

        var noChildren = self.Elements.List.children().length;
        var index = Math.max(0, Math.min(noChildren, options && options.Index ? options.Index - 1 : noChildren));

        if (index >= noChildren)
            self.Elements.List.append(html);
        else {
            var itemAtIndex = self.Elements.List.find('> [role="listitem"]:eq(' + index + ')');
            itemAtIndex.after(html);
        }

        if (options && options.IsRefresh && self.Options.HighlightFirst)
            self.highlightIndex(0);

        return self;
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
        CanHighlight: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.Dropdown.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;
    this.Elements.Popover = null;
    this.IsOpen = false;

    var openedAtLeastOnce = false;

    this.initialize = override(self.initialize, function () {
        console.log('dropdown');

        self.PubSub.addEvent('open');
        self.PubSub.addEvent('close');

        var defaultTemplate = self.getDefaultTemplate();
        if (defaultTemplate.SelectedItemTemplateId)
            Handlebars.registerPartial("DropdownSelectedItemTemplate", $("#" + defaultTemplate.SelectedItemTemplateId).html());

        return self;
    });

    this.initializeFromContainer = override(self.initializeFromContainer, function () {
        if (!container)
            return self;

        var dataSource = null;

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

            var dataSourceOptions = RS.Utils.getOptionsFromAttributes(container, 'data-source-options') || {};
            if (items)
                dataSourceOptions.Data = items;

            dataSource = new RS.Controls.DataSource(dataSourceOptions);
        }

        self.setDataSource(dataSource);

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        self.Elements.Popover = self.Elements.Me.find('[role="popover"]:first');

        self.Elements.Me.find('[role="dropdown-toggle"]').mousedown(function () {
            self.toggle();
        });

        self.setContinuousPaginationScrollingParent(self.Elements.List);

        return self;
    });

    this.selectIndex = override(self.selectIndex, function (index) {
        if (!self.Elements.Me)
            return self;

        var template = self.getDefaultTemplate();
        if (template && template.SelectedItemTemplateId) {
            template.SelectedItemCompiled = template.SelectedItemCompiled || Handlebars.compile($("#" + template.SelectedItemTemplateId).html());
            var html = template.SelectedItemCompiled(self.SelectedItem);
            self.Elements.Me.find('[role="main"]:first').html(html);
        }

        if (self.Options.CloseAfterSelect)
            self.close();

        return self;
    });

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

        if (self.Elements.Search)
            self.Elements.Search.val('');

        lastTerm = null;

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

    if (!isInherited)
        self.initialize();

    self.appendTo(container, true);
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

    this.initialize = override(self.initialize, function () {
        console.log('buttondropdown');

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        var options = RS.Core.copy(self.Options, true);
        options.KeepOptionsFromStart = true;
        self.Button = new RS.Controls.Button(options, self.Elements.Me.find('[role="dropdown-toggle"]:first'));

        return self;
    });

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

    this.initialize = override(self.initialize, function () {
        console.log('splitbutton');

        return self;
    });

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
        CanHighlight: true
    };

    if (options)
        self.Options = $.extend(self.Options, options);

    RS.Controls.List.superclass.constructor.call(this, self.Options, container, true);

    this.Elements.Me = null;

    this.initialize = override(self.initialize, function () {
        console.log('list');

        return self;
    });

    this.initializeHtml = override(self.initializeHtml, function () {
        if (!self.Elements.Me)
            return self;

        if (self.Options.DataSource)
            self.Options.DataSource.loadData();

        return self;
    });

    if (!isInherited)
        self.initialize();

    self.appendTo(container, true);
};
extend(RS.Controls.List, RS.Controls.DataControl);

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
        if (builder)
            builder.build(el);
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