# Customizing OpenTokRTC UI

You can customize UI colors and logos of OpenTokRTC. Follow this guide to know where to edit them.

## Configuration options

Many of the UI options are enabled and configurable using the config.json file or environment
variables. For details, see the [Configuration options](README.md#configuration-options)
section in the main README file.

## Changing theme colors

OpenTokRTC uses the LESS CSS pre-processor for its CSS. Values for theme colors are in the file [`web/less/variables.less`](web/less/variables.less). Edit this values in this file to suit your needs.

Once you have edited this file, you will need to build new UI assets. Run:

```
$ npm run clientBuild
```

## Adding static assets

The `web/` directory in the project root is mounted as a static path in the application root. Any files or directories in this directory will be accessible in the browser relative to the application root (`/`).

You can put your images in the `web/images` directory. They can be accessed in the application as `/images/`. For example, the file `web/images/opentok-logo.png` can be accessed in the browser as `/images/opentok-logo.png`.

## Changing the app name, intro text, and Help links

See the [Configuration options](README.md#configuration-options) section in the main README file.
These can be configured with these settings:

* `appName` (config.json) / `APP_NAME` (environment variable)
* `introText` (config.json) / `INTRO_TEXT` (environment variable)
* `introFooterLinkText` (config.json) / `INTRO_FOOTER_LINK_TEXT` (environment variable)
* `introFooterLinkUrl` (config.json) / `INTRO_FOOTER_LINK_URL` (environment variable)
* `helpLinkText1` (config.json) / `HELP_LINK_TEXT_1` (environment variable)
* `helpLinkUrl1` (config.json) / `HELP_LINK_URL_1` (environment variable)
* `helpLinkText2` (config.json) / `HELP_LINK_TEXT_2` (environment variable)
* `helpLinkUrl2` (config.json) / `HELP_LINK_URL_2` (environment variable)

## Changing landing page HTML

Edit the view file [`views/room.ejs`](views/room.ejs) and change the images and text in the `<body>` section. You can also change the text in the `<title>` tag.

