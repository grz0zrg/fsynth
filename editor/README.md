# Fragment standalone collaborative GLSL editor

This is a standalone collaborative GLSL editor which communicate directly with the collaborative editing backend built around ShareDB, it can be used to target any Fragment sessions / code efficiently.

Can be used directly / locally by opening the `index.html` file.

Usage : append the session name / target as URL query parameters, example : `index.html?session=my_session&target=code_main`

There is only one type of target support as of now (collaborative targets) : `code_main`

The editor is much less featured than the app. editor focusing on code edition only, any customizations such as themes may need some source tweaks and GLSL checks are still done in the client app.