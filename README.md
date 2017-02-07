# tagselectfield
tagselectfield component for ExtJs 6


@class App.ux.form.TagSelectField

Field that values can choose from dictionary (selectwindow)

# Example usage:

// 'model' config need write if 'store' undefined
@example
{
    xtype: 'apptagselectfield',
    listView: 'App.view.Author.Grid',
    textProperty: 'Name',
    name: 'Author',
    store: 'App.store.Author',
    model: 'App.model.Author'
} 


