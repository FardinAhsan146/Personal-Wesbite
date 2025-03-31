# Personal Website

A personal portfolio website for Fardin Ahsan, a data scientist.

## Project Structure

The project follows a standard static website structure:

```
/
├── index.html              # Main HTML file
├── README.md               # Project documentation
├── assets/                 # All static assets
│   ├── css/                # CSS files
│   │   ├── main.css        # Main CSS file that imports all other CSS files
│   │   ├── variables.css   # CSS variables
│   │   ├── base.css        # Base styles
│   │   ├── layout.css      # Layout styles
│   │   ├── components.css  # Component styles
│   │   ├── sections.css    # Section styles
│   │   ├── animations.css  # Animation styles
│   │   └── responsive.css  # Responsive styles
│   ├── js/                 # JavaScript files
│   │   ├── site-data.js    # Site data
│   │   └── data-loader.js  # Data loader
│   ├── images/             # Image files
│   │   ├── gifs/           # GIF files
│   │   └── instagram/      # Instagram images
│   └── fonts/              # Font files (if any)
└── data/                   # Data files
    └── content.yml         # Content data in YAML format
```

## Development

This is a static website that uses HTML, CSS, and JavaScript. The content is loaded from a YAML file using JavaScript.

## Features

- Responsive design
- Dark mode toggle
- Content loaded from YAML data
- Photo slider
- Project showcase
- Blog post links
- Contact information