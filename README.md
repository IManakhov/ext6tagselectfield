# tagselectfield
tagselectfield component for ExtJs 6


@class App.ux.form.TagSelectField

Field that values can choose from dictionary (selectwindow)

<b>Features:</b>
* getValue - return integer array (id's of added records)
* setValue - expects that the argument will be integer array

# Example usage:

// 'model' config need write if 'store' undefined<br>
@example<br>
<b>
{<br>
    &emsp;xtype: 'apptagselectfield',<br>
    &emsp;listView: 'App.view.Author.Grid',<br>
    &emsp;textProperty: 'Name',<br>
    &emsp;name: 'Author',<br>
    &emsp;store: 'App.store.Author',<br>
    &emsp;model: 'App.model.Author'<br>
} <br></b>


