import type { SuggestedQuestionItem } from "../types/chat";

export const APP_TITLE = "Your Smart College Assistant";
export const APP_SUBTITLE = "AI-Powered Multi-College Chatbot for Student Queries";

export const PENDING_VERIFICATION_MESSAGE =
  "This information is currently being verified by the college. Please contact the college administration for confirmation.";

export const UNKNOWN_QUERY_MESSAGE =
  "Sorry, I couldn't understand your question. Please try asking in a different way.";

export const CURATED_SUGGESTIONS: SuggestedQuestionItem[] = [
  {
    id: "general-greeting",
    label: "What can you help with?",
    question: "Hello, what can you help me with?",
    category: "general_queries",
    requiresCollege: false,
  },
  {
    id: "location",
    label: "Campus location",
    question: "Where is the college campus located?",
    category: "college_location",
    requiresCollege: true,
  },
  {
    id: "courses",
    label: "Courses & programs",
    question: "What courses and degrees are offered?",
    category: "courses",
    requiresCollege: true,
  },
  {
    id: "admissions",
    label: "Admissions process",
    question: "How can I apply for admission?",
    category: "admissions",
    requiresCollege: true,
  },
  {
    id: "contact",
    label: "Contact & helpline",
    question: "What is the official admission phone number and email?",
    category: "contact_info",
    requiresCollege: true,
  },
  {
    id: "fees",
    label: "Tuition fees",
    question: "What are the tuition fees per year?",
    category: "fees",
    requiresCollege: true,
  },
  {
    id: "scholarships",
    label: "Scholarships",
    question: "Are merit scholarships available for students?",
    category: "scholarships",
    requiresCollege: true,
  },
  {
    id: "hostel",
    label: "Hostel facilities",
    question: "What are the hostel facilities like?",
    category: "hostel",
    requiresCollege: true,
  },
  {
    id: "placements",
    label: "Placements",
    question: "What are the placement statistics and recruiting companies?",
    category: "placements",
    requiresCollege: true,
  },
];

