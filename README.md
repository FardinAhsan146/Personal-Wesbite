# Personal Website Content Management

This website has been refactored to use a single source of truth for all content.

## How It Works

All website content is stored in a single file: `data/site-content.js`

This file serves as both:
1. A human-readable content file (with clear comments and formatting)
2. A JavaScript object that the website uses directly

## Editing Content

To update your website content:

1. Edit the `data/site-content.js` file
   - The file is formatted in a YAML-like style for easy reading and editing
   - Each section is clearly labeled with comments
   - Make changes directly to the values in this file

2. Save the file and refresh your website to see the changes

That's it! No conversion steps, no manual syncing, no external tools needed.

## Benefits of This Approach

- Single source of truth for all content
- Easy to edit format with clear organization
- No build steps or external tools required
- No manual conversion or syncing needed
- Works with any static web hosting
- No CORS issues since it's a JavaScript file