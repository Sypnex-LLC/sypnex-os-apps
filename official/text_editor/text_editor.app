{
    "id": "410e8a66-925c-4698-8768-ead77107060e",
    "name": "Text Editor",
    "description": "A simple text editor for creating and editing text files in the virtual file system",
    "icon": "fas fa-edit",
    "keywords": ["text_editor", "editor", "file", "edit", "write"],
    "author": "Sypnex OS",
    "version": "1.0.9",
    "type": "user_app",
    "scripts": [
        "js/utils.js",
        "js/settings-manager.js",
        "js/file-manager.js",
        "js/editor-manager.js",
        "js/syntax-highlighting.js",
        "js/code-validation.js", 
        "js/ui-manager.js",
        "js/main.js"
    ],
    "settings": [
        {
            "key": "FONT_SIZE",
            "name": "Font Size",
            "type": "number",
            "value": 14,
            "description": "Text editor font size in pixels"
        },
        {
            "key": "TAB_SIZE",
            "name": "Tab Size",
            "type": "number",
            "value": 4,
            "description": "Number of spaces for tab indentation"
        }
    ]
} 