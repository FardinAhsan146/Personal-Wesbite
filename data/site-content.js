// SITE CONTENT
// Edit the content below to update your website
// The format is YAML-like for readability, but it's actually JavaScript

// Calculate age based on birthdate
const calculateAge = () => {
  const birthDate = new Date(1997, 11, 1); // December 1, 1997
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || 
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const siteData = {
  // Site Information
  site: {
    title: "Fardin Ahsan",
    tagline: "Welcome to my website 🌚",
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
    description: `I'm a ${calculateAge()}-year-old self-taught AI Engineer trying to understand the crazy world we live in.\nWhen I am not working, you might find me at home writing code, at the gym lifting weights, playing badminton; at a random street in Dubai, cycling using a Careem bike (hear me out), or at the gokarting circuit.`,
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
        caption: "You think I wasn't going to pose infront Mount Fuji?",
        location: "Mount Fuji"
      },
      {
        image: "assets/images/instagram/kart.jpeg",
        title: "I love gokarting",
        caption: "Catch me gokarting every chance I get.",
        location: "Dubai Kartdrome Circuit"
      }
    ]
  },


  // Projects Section
  projects: {
    title: "Projects",
    description: "When I have nothing to do, I might just sit down and write software. No promises! I might or I might not. In either case, all my personal projects can be found in my <a href=\"https://github.com/FardinAhsan146\" target=\"_blank\">Github</a>. Even if I wasn't an AI engineer, I'd have a spot spot for foundation models and vector databases!",
    items: [
      {
        title: "Talk To Youtuber",
        description: "A tool that lets you \"talk\" with any YouTuber by processing their video content into a conversational AI interface. The app downloads all videos from a specified YouTuber, adds them to a database, and performs semantic search to provide context-aware responses.",
        features: [
          "Semantic search of video transcripts",
          "Conversational interface powered by GPT",
          "Portable database architecture using SQLite3 and ChromaDB",
          "No YouTube API credentials required"
        ],
        use_case: "I made this tool to \"talk\" to <a href=\"https://www.youtube.com/@japaneat\" target=\"_blank\">japaneat</a>, before my trip to Japan. A lot of knowledge is not searchable by text, but rather lives in YouTube videos. This is my solution to that",
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
    title: "Writing",
    description: "Sometimes I want to write. It helps me organize my thoughts. But I don't nearly as much as I should. One day I will have enough free time to do so..",
    posts: [
      {
        title: "People don't wear jackets because it's cold, they do because it's winter.",
        author: "by Fardin Ahsan",
        description: "Why seeing Canada Goose in Dubai drives me insane.",
        url: "https://fardinahsan.substack.com/p/people-dont-wear-jackets-because"
      },
      {
        title: "The correct explanation for the Monty Hall problem",
        author: "by Fardin Ahsan",
        description: "This is how I understand the Monty Hall Problem. (This is the only correct explanation)",
        url: "https://fardinahsan.substack.com/p/the-correct-explanation-for-the-monty"
      },
      {
        title: "You know shits about to hit the fan when...",
        author: "by Fardin Ahsan",
        description: "LLM's are beyond amazing, and they will change us as people, and we don't talk about it enough.",
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
        url: "https://drive.google.com/file/d/1jsR9AaaOVBptp_G9YGB3_04Lb5ZbZDgs/view?usp=sharing",
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