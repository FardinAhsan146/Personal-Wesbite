// SITE CONTENT
// Edit the content below to update your website
// The format is YAML-like for readability, but it's actually JavaScript

const siteData = {
  // Site Information
  site: {
    title: "Fardin Ahsan",
    tagline: "Self-taught data scientist passionate about building better predictive models of The World",
    copyright: "© 2025 Fardin Ahsan. All rights reserved."
  },

  // Navigation
  navigation: [
    { name: "About", url: "#about" },
    { name: "Tech Stack", url: "#tech-stack" },
    { name: "Projects", url: "#projects" },
    { name: "Writing", url: "#writing" },
    { name: "Contact", url: "#contact" }
  ],

  // About Section
  about: {
    title: "About Me",
    description: "I'm a self-taught data scientist who is passionate about building better predictive models of The World. I spend a significant portion of my free time reading up on Statistics and programming pet projects using Python. I also like cycling, building PC's, playing FPS and racing games and travelling.",
    photos: [
      {
        image: "assets/images/instagram/download.jpg",
        title: "Mountain View",
        caption: "Enjoying the breathtaking scenery during my hiking trip"
      },
      {
        image: "assets/images/instagram/download (1).jpg",
        title: "Winter Exploration",
        caption: "Exploring the snowy coastline on a crisp winter day"
      },
      {
        image: "assets/images/instagram/download (2).jpg",
        title: "My JDM Ride",
        caption: "My pride and joy - a modified Japanese classic"
      }
    ]
  },

  // Tech Stack Section
  tech_stack: {
    title: "Tech Stack",
    description: "Here are some of the technologies I work with.",
    items: [
      { name: "Python", icon: "fab fa-python" },
      { name: "TensorFlow", icon: "fas fa-brain" },
      { name: "PyTorch", icon: "fas fa-fire" },
      { name: "SQL", icon: "fas fa-database" },
      { name: "Git", icon: "fab fa-git-alt" },
      { name: "Docker", icon: "fab fa-docker" },
      { name: "NumPy", icon: "fas fa-calculator" },
      { name: "Pandas", icon: "fas fa-table" },
      { name: "Flask", icon: "fas fa-server" },
      { name: "Django", icon: "fas fa-server" }
    ]
  },

  // Projects Section
  projects: {
    title: "Projects",
    items: [
      {
        title: "Talk To Youtuber",
        description: "A tool that lets you chat with any YouTuber by processing their video content into a conversational AI interface. The app downloads all videos from a specified YouTuber, adds them to a database, and performs semantic search to provide context-aware responses.",
        features: [
          "Semantic search of video transcripts",
          "Conversational interface powered by GPT",
          "Portable database architecture using SQLite3 and ChromaDB",
          "No YouTube API credentials required"
        ],
        use_case: "Created to extract restaurant recommendations from a travel YouTuber's videos before a trip to Japan. Using this tool, I've been able to add a bunch of places to my itinerary that would have been difficult to find otherwise.",
        image: "assets/images/gifs/talk_to_youtuber-Trim-Trimonline-video-cutter.com-ezgif.com-video-to-gif-converter.gif",
        tags: ["NLP"],
        github: "https://github.com/FardinAhsan146/Talk-to-youtuber"
      },
      {
        title: "YouTube Thumbnail Search",
        description: "A visual search engine for YouTube thumbnails. This tool allows you to search through thousands of thumbnails using natural language queries.",
        features: [
          "Download Video IDs and thumbnail URLs from any channel",
          "Embed thumbnails using OpenAI CLIP model",
          "Search thumbnails with natural language text queries",
          "Persistent vector database for faster future searches"
        ],
        use_case: "Perfect when you can't remember a video title, when it's in a non-English language, or when you only remember what the thumbnail looked like. I used it to search a Serbian news channel with over 30,000 videos for content related to horses, just by their thumbnails.",
        image: "assets/images/gifs/youtube-thumbnail-search.gif",
        tags: ["Computer Vision"],
        github: "https://github.com/FardinAhsan146/Youtube-thumbnail-search"
      }
    ]
  },

  // Writing Section
  writing: {
    title: "Hobby Writing",
    description: "I like writing non-academic non-fiction texts on my Substack.",
    lorem_ipsum: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor.",
    posts: [
      {
        title: "People don't wear jackets because it's cold, they do because it's winter.",
        author: "by Fardin Ahsan",
        description: "An exploration of how social norms often drive our behaviors more than practical needs.",
        url: "https://fardinahsan.substack.com/p/people-dont-wear-jackets-because"
      },
      {
        title: "The correct explanation for the Monty Hall problem",
        author: "by Fardin Ahsan",
        description: "A clear breakdown of this famous probability puzzle that confuses even mathematicians.",
        url: "https://fardinahsan.substack.com/p/the-correct-explanation-for-the-monty"
      },
      {
        title: "You know shits about to hit the fan when...",
        author: "by Fardin Ahsan",
        description: "It's yet to hit all of us that LLM's will hit, and they are going to hit hard.",
        url: "https://fardinahsan.substack.com/p/you-know-shits-about-to-hit-the-fan"
      }
    ]
  },

  // Contact Section
  contact: {
    title: "Contact Me",
    items: [
      {
        title: "Resume",
        icon: "fas fa-file-alt",
        url: "https://drive.google.com/file/d/1NdytyCTfqkIRlttCgVKNW2MzVyFj9E_L/view?usp=sharing",
        text: "View Resume"
      },
      {
        title: "Email",
        icon: "fas fa-envelope",
        url: "mailto:fardinahsan146@gmail.com",
        text: "fardinahsan146@gmail.com"
      },
      {
        title: "LinkedIn",
        icon: "fab fa-linkedin",
        url: "https://www.linkedin.com/in/fardin-ahsan/",
        text: "Fardin Ahsan"
      },
      {
        title: "GitHub",
        icon: "fab fa-github",
        url: "https://github.com/FardinAhsan146",
        text: "FardinAhsan146"
      },
      {
        title: "WhatsApp",
        icon: "fab fa-whatsapp",
        url: "https://wa.me/971501468233",
        text: "+971 50 146 8233"
      }
    ]
  },

  // Social Links
  social: [
    {
      platform: "Substack",
      icon: "fas fa-newspaper",
      url: "https://fardinahsan.substack.com/"
    },
    {
      platform: "Instagram",
      icon: "fab fa-instagram",
      url: "https://www.instagram.com/fardinahsan_kbw123/"
    }
  ]
};