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
    { name: "Projects", url: "#projects" },
    { name: "Writing", url: "#writing" },
    { name: "Contact", url: "#contact" }
  ],

  // About Section
  about: {
    title: "",
    description: "I'm a self-taught data scientist passionate about understanding the crazy world we live in. ",
    photos: [
      {
        image: "assets/images/instagram/download.jpg",
        title: "That's me posing",
        caption: "I pose infront of a mountain everywhere I go.",
        location: "Kazbegi, Georgia"
      },
      {
        image: "assets/images/instagram/download (1).jpg",
        title: "Here I am enjoying the view",
        caption: "I didn't pass up the chance to post infront of a mountain here either.",
        location: "Lake Shikotsu, Hokkaido"
      },
      {
        image: "assets/images/instagram/download (2).jpg",
        title: "Iconic mountain view",
        caption: "You think I wasn't going to pose infront it?",
        location: "Mount Fuji, Japan"
      },
      {
        image: "assets/images/instagram/kart.jpeg",
        title: "I love gokarting",
        caption: "Speed is my second passion.",
        location: "Dubai Kartdrome Circuit"
      }
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
        tags: [],
        github: "https://github.com/FardinAhsan146/TalkToYoutuber"
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
        tags: [],
        github: "https://github.com/FardinAhsan146/YoutubeThumbnailSearch"
      }
    ]
  },

  // Writing Section
  writing: {
    title: "Hobby Writing",
    description: "I write about various topics on my Substack. Feel free to check out my articles below.",
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
      },
      {
        title: "Telegram",
        icon: "fab fa-telegram",
        url: "https://t.me/flipperzunderthehood",
        text: "@flipperzunderthehood"
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
    },
    {
      platform: "Steam",
      icon: "fab fa-steam",
      url: "https://steamcommunity.com/id/keyboardwar123/"
    }
  ]
};