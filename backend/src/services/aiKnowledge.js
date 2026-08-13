// =========================================================
// TA-HOSS AI APPLICATION KNOWLEDGE
// =========================================================
// Static, verified information about the TA-HOSS LOG
// application itself and its creator.
//
// IMPORTANT:
// Do not put confidential credentials or secrets here.
// =========================================================

const TA_HOSS_KNOWLEDGE = {
  application: {
    name: "TA-HOSS LOG",
    fullTitle: "TA-HOSS LOG / CMIS (Community Management & Information System)",
    description:
      "TA-HOSS LOG is a community register and Community Management Information System (CMIS) designed for Ta-hoss Community.",
    
    purpose:
      "The system is designed to support structured community registration, resident identification, household management, verification, GPS mapping, biometric enrollment, analytics, and related community data management.",

    community: "Ta-hoss Community",
    lga: "Riyom",
    state: "Plateau",
    country: "Nigeria",
  },

  developer: {
    fullname: "Diyak Ezekiel Dalyop",
    title: "Full-Stack Software Engineer, Creative Technologist, & Digital Product Architect",
    location: "Plateau State, Nigeria",
    brand: "EAZY DON / EAZY DON GRAPHIX AND PRINTS",
    philosophy:
      "Purpose-driven technology—leveraging modern digital infrastructure to address structural challenges in local communities, streamline small-business operations, and expand access to digital services.",
    
    technicalCapabilities: [
      "Full-Stack Development (MERN Stack: MongoDB, Express.js, React, Node.js, JavaScript ES6+, HTML5, CSS3)",
      "AI & Automated Pipeline Integration (Groq SDK, low-latency natural language database routing, operational analytics)",
      "Database Management & Data Integrity (Relational and document data structures, query optimization, security pipelines)",
      "UI/UX Engineering & Interface Design (Translating graphic design expertise into intuitive, accessible user flows)"
    ],

    keyProjects: [
      {
        name: "TA-HOSS LOG / CMIS",
        role: "Lead Architect and Engineer",
        description: "Comprehensive data system for Ta-hoss community in Riyom LGA, powering demographic tracking, household registration, digital identity verification, and localized analytics."
      },
      {
        name: "EAZY DON HOST",
        description: "Specialized web hosting and domain management initiative to simplify deployment processes."
      },
      {
        name: "EAZY Movies",
        description: "Digital video streaming interface built for media delivery pipelines and performance optimization."
      },
      {
        name: "EAZY Market",
        description: "Integrated e-commerce platform facilitating digital trade and digital storefront creation."
      }
    ],

    crossDisciplinarySkills: [
      "Brand Identity & Print Engineering (Operator of EAZY DON GRAPHIX AND PRINTS)",
      "Creative Writing & Narrative Composition (Scriptwriting and storytelling for digital media)",
      "Acoustic & Musical Theory (Practices stringed musical instruments)"
    ],

    educationAndCertifications: [
      "Higher National Diploma (HND) in Business Administration & Management — Plateau State Polytechnic, Barkin Ladi",
      "MTN ICT & Digital Skills Certification (Design and Digital Transformation Track)"
    ]
  },

  features: [
    "Resident registration",
    "Household registration",
    "Resident verification",
    "Household relationship management",
    "GPS household mapping",
    "Biometric enrollment support",
    "Digital identity",
    "QR identity verification",
    "Household relationship trees",
    "Analytics and demographic insights",
    "Offline registration and synchronization",
    "AI-assisted information retrieval",
  ],

  aiCapabilities: [
    "Answer general questions",
    "Answer questions about TA-HOSS LOG",
    "Answer questions about the developer (Diyak Ezekiel Dalyop)",
    "Retrieve authorized resident information",
    "Retrieve authorized household information",
    "Provide controlled community data insights",
  ],
};

// =========================================================
// APPLICATION KNOWLEDGE RETRIEVAL
// =========================================================

const getApplicationKnowledge = () => {
  return TA_HOSS_KNOWLEDGE;
};

module.exports = {
  TA_HOSS_KNOWLEDGE,
  getApplicationKnowledge,
};