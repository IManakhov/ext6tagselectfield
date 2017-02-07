/**
*   @class App.ux.form.TagSelectField
*
*   Поле, значение которого выбирается из справочника
* 
*   # Example usage:
*
*   // Параметр model необходимо определять, если не определен параметр store
*   @example
*   {
*       xtype: 'apptagselectfield',
*       listView: 'App.view.Author.Grid',
*       textProperty: 'Name',
*       name: 'Author',
*       store: 'App.store.Author',
*       model: 'App.model.Author'
*   } 
*
*/
Ext.define('App.ux.form.TagSelectField', {
    extend: 'Ext.form.field.Tag',
    alias: 'widget.apptagselectfield',
    alternateClassName: ['App.TagSelectField'],

    requires: ['Ext.grid.Panel', 'Ext.ux.grid.FilterBar'],

    triggers: {
        clear: {
            weight: 1,
            cls: Ext.baseCSSPrefix + 'form-clear-trigger',
            hidden: true,
            handler: 'onTrigger3Click',
            scope: 'this'
        },
        find: {
            weight: 1,
            cls: Ext.baseCSSPrefix + 'form-search-trigger',
            handler: 'onTrigger2Click',
            scope: 'this'
        },
        picker: {
            weight: 1,
            hidden: true,
            scope: 'this'
        }
    },

    minChars: 2,
    
    typeAhead: true,
    
    editable: true,

    disableKeyFilter: true,
    /**
    * @cfg {Boolean} allowBlank
    * Флаг: разрешено ли пустое значение поля
    */
    allowBlank: true,

    /**
    * @cfg {String} listView
    * Представление, которое используется для отображения данных справочника
    */
    listView: null,

    /**
    * @cfg {String} listRenderTo
    * Селектор, с помощью которого запрашивается контейнер окна выбора
    */
    windowContainerSelector: null,

    /**
    * @cfg {String} listRenderTo
    * Открывать ли окно выбора модально
    */
    modalWindow: true,

    /**
    * @cfg {Object} windowCfg
    * Параметры конфигурации окна выбора
    */
    windowCfg: null,

    /**
    * @cfg {String} editView
    * Представление, которое используется для редактирования данных справочника
    */
    editView: null,

    /**
    * @cfg {String/Object} store
    * Store
    * Нельзя задавать storeId, если store заранее не был создан
    */
    viewStore: null,

    /**
    * @cfg {"SINGLE"/"MULTI"/"SIMPLE"} selectionMode
    * Режим выбора для Ext.selection.CheckboxModel: SINGLE, MULTI, SIMPLE
    * Поведение каждого из режимов описано в доках к Ext.selection.Model.mode
    */
    selectionMode: 'MULTI',

    /**
    * @cfg {String} title
    * Заголовок для окна выбора
    */
    title: 'Выбор элемента',

    valueField: 'Id',

    displayField: 'Name',

    /**
    * @cfg {Object} columns
    * Столбцы таблицы
    */
    columns: null,

    trigger2Cls: 'x-form-search-trigger',
    trigger3Cls: 'x-form-clear-trigger',

    pinList: false,

    /**
    * Метод для получения store
    * @return {B4.base.Store} store  
    */
    getViewStore: function () {
        return this.viewStore;
    },

    constructor: function () {
        var me = this;

        me.callParent(arguments);


        // выносим конфигурацию тулбара дабы не дублировать ее
        Ext.apply(me, {
            toolbarSelectBtnConfig: {
                xtype: 'button',
                text: 'Выбрать',
                iconCls: 'fa fa-check si-green',
                handler: me.onSelectValue,
                scope: me
            },
            toolbarCloseBtnConfig: {
                xtype: 'button',
                text: 'Закрыть',
                iconCls: 'fa fa-times si-red',
                handler: me.onSelectWindowClose,
                scope: me
            }
        });
    },

    initComponent: function () {
        var me = this,
            viewStore = me.viewStore;

        // подготовка хранилища, если передано како-либо значение
        if (viewStore) {
            // если передана строка
            if (Ext.isString(viewStore)) {
                // сначала пробуем найти хранилище по его имени
                me.viewStore = Ext.StoreMgr.lookup(viewStore);
                if (Ext.isEmpty(me.viewStore)) {
                    // иначе считаем что передано имя класса
                    me.viewStore = Ext.create(viewStore);
                }
            }
        } else if (me.model && Ext.isString(me.model)) {
            me.viewStore = Ext.create('Ext.data.Store', {
                model: me.model,
                autoLoad: false,
                groupField: me.storeGroupField || null
            });
        } else {
            me.viewStore = Ext.StoreMgr.lookup('ext-empty-store');
        }

        if (!Ext.isEmpty(me.viewStore) && Ext.isFunction(me.viewStore.on)) {
            me.viewStore.on('beforeload', me.onViewStoreBeforeLoad, me);
        }

        if (!Ext.isEmpty(me.store) && Ext.isFunction(me.store.on)) {
            me.store.on('beforeload', me.onStoreBeforeLoad, me);
        }

        me.callParent(arguments);
    },

    onStoreBeforeLoad: function (store, operation) {
        var me = this, options = {};
        store.proxy.extraParams = {
            excludeId: Ext.encode(me.getIdValues())
        }
        options.params = operation.params || {};
        me.fireEvent('beforeload', me, options, store);
        Ext.apply(operation, options);
    },

    onViewStoreBeforeLoad: function (viewStore, operation) {
        var me = this, options = {};
        options.params = operation.params || {};
        me.fireEvent('beforeviewload', me, options, viewStore);
        Ext.apply(operation, options);
    },

    destroy: function () {
        var me = this;
        if (me.viewStore) {
            me.viewStore.un('beforeload', me.onViewStoreBeforeLoad);
        }

        if (me.selectWindow) {
            me.selectWindow.destroy();
        }
        me.callParent(arguments);
    },

    _makeSelectionModel: function () {
        var me = this,
            mode = me.selectionMode.toUpperCase(),
            tooltip = Ext.create('Ext.tip.ToolTip', {
                html: 'Выбрать все отображаемые записи'
            });

        var selModel = Ext.create('Ext.selection.CheckboxModel', {
            mode: me.selectionMode,
            checkOnly: me.selectionMode == 'MULTI',
            multipageSelection: {},
            getSelected: function () {
                return this.multipageSelection;
            },
            listeners: {
                selectionchange: function (selectionModel, selectedRecords) {
                    if (selectedRecords.length == 0 && this.viewStore.loading == true && this.viewStore.currentPage != this.page) {
                        return;
                    }

                    if (this.viewStore.loading == true) {
                        this.multipageSelection = {};
                        return;
                    }

                    this.viewStore.data.each(function (i) {
                        Ext.Object.each(this.getSelected(), function (property, value) {
                            if (i.id === value.id) {
                                delete this.multipageSelection[property];
                            }
                        }, this);
                    }, this);

                    if (me.selectionMode.toUpperCase() == 'SINGLE') {
                        Ext.each(selectedRecords, function (i) {
                            this.multipageSelection[0] = i;
                        }, this);
                    } else {
                        Ext.each(selectedRecords, function (i) {
                            if (!Ext.Object.getKey(this.multipageSelection, i))
                                this.multipageSelection[Ext.Object.getSize(this.multipageSelection)] = i;
                        }, this);
                    }
                },
                buffer: 5
            },
            restoreSelection: function () {
                if (!this.viewStore) this.viewStore = me.viewStore;
                this.viewStore.data.each(function (item) {
                    Ext.Object.each(this.getSelected(), function (property, value) {
                        if (item.id === value.id) {
                            this.select(item, true, true);
                        }
                    }, this);
                }, this);
                this.page = this.viewStore.currentPage;
            }
        });

        return selModel;
    },

    /**
    * Показываем окно со справочником
    */
    onTrigger2Click: function () {
        var me = this,
            mode = me.selectionMode.toUpperCase();

        if (me.fireEvent('beforeselect', me) === false) {
            return false;
        }
        // флаг необходимости опустить создание тулбара окна
        var doNotCreateWindowToolbar = false;

        if (Ext.isString(mode)) {
            if (mode != 'SINGLE' && mode != 'MULTI') {
                console.error('Config error:', 'incorrect selection mode');
                return;
            }
        }

        if (mode === 'MULTI' && !me.isRendered) {
            me.isRendered = true;
        }

        // если предтавление списка отсутствует
        if (Ext.isEmpty(me.gridView)) {
            var gridCreated = false;

            if (Ext.isString(me.listView)) {
                var gridViewCfg = {
                    title: null,
                    border: false,
                    closable: false,
                    store: me.viewStore,
                    selModel: me._makeSelectionModel()
                };
                if (me.columns)
                    gridViewCfg.columns = me.columns;

                me.gridView = Ext.create(me.listView, gridViewCfg);

                gridCreated = true;
                if (Ext.isFunction(me.gridView.getStore)) {
                    var gridStore = me.gridView.getStore();
                    if (gridStore) {
                        me.viewStore = gridStore;
                        me.viewStore.un('beforeload', me.onViewStoreBeforeLoad, me);
                        me.viewStore.on('beforeload', me.onViewStoreBeforeLoad, me);
                    } else {
                        me.gridView.reconfigure(me.viewStore);
                    }
                }
            }
            else if (Ext.isObject(me.listView) && me.listView.isComponent) {
                me.gridView = me.listView;
                me.viewStore = me.listView.viewStore;
            }
            else {
                var columns = (Ext.isObject(me.listView) ? me.listView.columns : []) || [];
                if (Ext.isEmpty(columns)) {
                    if (Ext.isArray(me.columns)) {
                        columns = me.columns;
                    } else if (Ext.isObject(me.columns)) {
                        columns = [me.columns];
                    }
                    if (Ext.isEmpty(columns)) {
                        columns.push({
                            xtype: 'gridcolumn',
                            dataIndex: me.textProperty,
                            header: 'Наименование',
                            flex: 1
                        });
                    }
                }
                var cfg = Ext.apply({}, me.listView || {});
                Ext.applyIf(cfg, {
                    xtype: 'gridpanel',
                    plugins: [{
                        ptype: 'filterbar',
                        renderHidden: false,
                        showShowHideButton: true,
                        showClearAllButton: true
                    }],
                    features: me.features || [],
                    dockedItems: [
                        {
                            xtype: 'pagingtoolbar',
                            displayInfo: true,
                            store: me.viewStore,
                            dock: 'bottom'
                        }
                    ]
                });

                Ext.apply(cfg, {
                    title: null,
                    border: false,
                    store: me.viewStore,
                    columns: columns,
                    selModel: me._makeSelectionModel()
                });
                me.gridView = Ext.widget(cfg);
                gridCreated = true;
            }

            if (gridCreated) {
                var gridToolbar = me.gridView.getDockedItems('toolbar[dock="top"]');
                if (gridToolbar && gridToolbar.length) {
                    doNotCreateWindowToolbar = true;
                    gridToolbar = gridToolbar[0];
                    gridToolbar.insert(0, me.toolbarSelectBtnConfig);
                    gridToolbar.add('->');
                    gridToolbar.add(me.toolbarCloseBtnConfig);
                }
                me.fireEvent('gridcreated', me, me.gridView);
            }
        }

        me.viewStore.on('load', me.gridView.getSelectionModel().restoreSelection, me.gridView.getSelectionModel());
        if (mode === 'SINGLE') {
            me.gridView.on('itemdblclick', function (grid, record) {
                grid.getSelectionModel().multipageSelection[0] = record;
                grid.getSelectionModel().select(record, true, true);
                return me.onSelectValue.apply(me, arguments);
            }, me);
        }

        me.viewStore.load();

        me.gridView.getSelectionModel().deselectAll(true);

        if (!me.selectWindow) {
            var wndConfig = {};
            if (Ext.isObject(me.windowCfg))
                Ext.apply(wndConfig, me.windowCfg);

            me.fireEvent('beforewindowcreated', me, wndConfig);

            var renderToCmp = Ext.ComponentQuery.query('tabpanel[type=mainpanel]')[0].getActiveTab();
            if (Ext.isString(me.windowContainerSelector)) {
                renderToCmp = Ext.ComponentQuery.query(me.windowContainerSelector);
                if (Ext.isArray(renderToCmp))
                    renderToCmp = renderTo[0];
            }

            Ext.applyIf(wndConfig, {
                height: 500,
                width: 600,
                constrain: true,
                modal: me.modalWindow == true,
                layout: 'fit',
                title: me.title
            });

            Ext.apply(wndConfig, {
                items: [me.gridView],
                listeners: {
                    close: function () {
                        delete me.gridView;
                        delete me.selectWindow;
                    }
                },
                dockedItems: doNotCreateWindowToolbar ? [] : [
                    {
                        xtype: 'toolbar',
                        dock: 'top',
                        items: [
                            me.toolbarSelectBtnConfig,
                            '->',
                            me.toolbarCloseBtnConfig
                        ]
                    }
                ]
            });

            me.selectWindow = Ext.create('Ext.window.Window', wndConfig);

            me.fireEvent('windowcreated', me, me.selectWindow);
        }

        //var addBtn = me.selectWindow.down('button[action=add]');
        //if (addBtn) addBtn.hide();
        var editBtn = me.selectWindow.down('button[action=edit]');
        if (editBtn) editBtn.hide();
        var deleteBtn = me.selectWindow.down('button[action=delete]');
        if (deleteBtn) deleteBtn.hide();
        me.selectWindow.forbitEdit = true;

        renderToCmp.add(me.selectWindow);
        me.selectWindow.show();
        me.fireEvent('afterwindowshow', me, me.selectWindow);
        me.selectWindow.center();
    },

    onTrigger3Click: function () {
        var me = this;

        if (me.fireEvent('beforeclear', me) === false) {
            return;
        }

        me.setValue(null);
        me.updateDisplayedText();
    },

    onSelectWindowClose: function () {
        delete this.gridView;
        this.selectWindow.close();
        delete this.selectWindow;
    },

    onSelectValue: function () {
        var me = this,
            rec = me.gridView.getSelectionModel().getSelected();

        if (!rec || rec.length == 0) {
            Ext.Msg.alert('Ошибка', 'Необходимо выбрать запись!');
            return;
        }

        me.applyChanges = true;
        for (var i in rec.items) {
            if (!Ext.Array.findBy(me.valueCollection.items,
                function(itm) {
                    if (itm.data.Id === rec.items[i].data.Id)
                        return true;
            }))
            {
                me.valueCollection.add(rec.items[i]);
            }
        }
        me.updateValue();
        me.onSelectWindowClose();
    },

    checkChange: function () {
        var me = this,
            newVal, oldVal;
        if (!me.suspendCheckChange && !me.destroying && !me.destroyed) {
            newVal = me.getValue();
            oldVal = me.lastValue,
            needSetOldValue = false;

            if (me.applyChanges && me.didValueChange(newVal, oldVal)) {
                if (needSetOldValue) {
                    me.setValue(oldVal);
                } else {
                    me.callParent(arguments);
                }
                me.applyChanges = false;
            }
        }
    },

    getValue: function () {
        var valArray = this.callParent(arguments);
        var arrayToReturn = [];
        Ext.each(valArray, function (val) {
            arrayToReturn.push({ Id:val });
        });
        return arrayToReturn;
    },
    
    getIdValues: function () {
        var valArray = this.getValue();
        var arrayToReturn = [];
        Ext.each(valArray, function (val) {
            arrayToReturn.push(val.Id);
        });
        return arrayToReturn;
    },

    setValue: function (valArray) {
        if (valArray && valArray.length > 0) {
            var me = this;
            Ext.each(valArray, function (val) {
                me.valueCollection.add(Ext.create('Ext.data.Model', val));
            });
        }
    },

    onSelectionChange: function (selModel, selectedRecs) {
        return;
        this.applyMultiselectItemMarkup();
        this.applyChanges = true;
        //this.fireEvent('valueselectionchange', this, selectedRecs);
    },

    beforeQueryDefValue: false,

    beforeQuery: function (queryPlan) {
        var me = this;

        // Allow beforequery event to veto by returning false 
        if (me.fireEvent('beforequery', queryPlan) === false || (!me.beforeQueryDefValue && !queryPlan.query)) {
            queryPlan.cancel = true;
        }

            // Allow beforequery event to veto by returning setting the cancel flag 
        else if (!queryPlan.cancel) {

            // If the minChars threshold has not been met, and we're not forcing an "all" query, cancel the query 
            if (queryPlan.query.length < me.minChars && !queryPlan.forceAll) {
                queryPlan.cancel = true;
            }
        }
        return queryPlan;
    }
});