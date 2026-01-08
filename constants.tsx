
import React from 'react';

export const FAQS: Record<string, string> = {
    "what is gdg?": "GDG stands for Google Developer Groups, a global developer community supported by Google.",
    "is the event beginner-friendly?": "Yes! Beginners are welcome, mentors will support guided learning.",
    "do i need a team?": "No. You can participate individually. You may team up later.",
    "is there any registration fee?": "No, participation is completely free.",
    "what tech stack can we use?": "You may use any tools/technologies. Innovation matters more.",
    "give me some project ideas": "Use the 'Ideas' button or type /idea followed by domain name. E.g., /idea AI/ML",
    "what is the smart india hackathon (sih)?": "SIH is a nationwide initiative to provide students a platform to solve pressing problems of our government.",
    "how to win a hackathon?": "Focus on a working prototype, solve a real pain point, and give a great presentation!",
    "what is gdg devfest?": "GDG DevFest is a community-run developer event hosted by Google Developer Groups around the globe.",
    "can i participate remotely?": "Yes, many events offer remote participation options.",
    "will there be prizes?": "Yes, many hackathons offer exciting prizes for winners.",
    "how long does a hackathon usually last?": "Hackathons typically last between 24 to 48 hours.",
    "what should i bring to the event?": "Bring your laptop, charger, and any other tools you might need for development.",
    "are meals provided during the hackathon?": "Yes, most hackathons provide meals and snacks for participants.",
    "why should I join a gdg?": "Joining a GDG helps you connect with like-minded developers and learn new skills.",
    "why we need to participate in hackathons?": "Hackathons provide a great opportunity to learn, network, and showcase your skills.",
    "what if i don't have a project idea?": "No worries! Many hackathons have brainstorming sessions.",
    "problem Statements for hackthons": "Problem statements are usually provided by the event organizers on the official website.",
    "quick tips for hackathon success": "Plan your time wisely, focus on a MVP, and communicate effectively!",
};

export const IDEAS: Record<string, string[]> = {
    "AI/ML": [
        "Real-time emotion detection using webcam feed",
        "Price prediction system for crops using ML",
        "AI chatbot for college administration queries",
        "AI Language Translator for Ancient Scripts: Tool to translate old scripts into modern Hindi/English.",
        "AI Resume Reviewer: Analyzing resumes and providing feedback using NLP.",
        "Smart Attendance System: Facial recognition to mark student attendance automatically.",
        "AI-Powered Career Counselor: Suggests paths based on interests and performance.",
        "Virtual Lab Assistant: Helps students conduct virtual experiments with real-time feedback.",
        "Tutor Matching System: Matches students with tutors based on learning styles.",
        "Water Quality Prediction: Predicts quality based on sensor data."
    ],
    "Web Dev": [
        "Crowdsourced lost-and-found platform",
        "Secure note-sharing web app for students",
        "College attendance tracker dashboard",
        "Personal landing page builder for coders that pulls GitHub repos automatically.",
        "Book club platform for scheduling and discussing reading sessions.",
        "Automatic flashcard generator from notes using a simple LLM API.",
        "Virtual Herbal Garden: 3D models of medicinal plants with search features.",
        "Resource Management for Rural Schools: Inventory manager for textbooks and aids.",
        "Water Body Monitoring: Dashboard to track lake health using crowdsourced data.",
        "Online Voting System for Student Elections: Secure voting with authentication."
    ],
    "Android": [
        "AR based navigation inside college campus",
        "Offline study material sharing app via hotspot",
        "Health reminder + activity tracker app",
        "Eco-friendly habit tracker: Reducing plastic/water use.",
        "Gamified To-Do list: Earn XP and level up pets.",
        "Smart Tourist Safety: Geo-fencing alert system for restricted zones.",
        "Gesture-Based SOS: Detects distress gestures to trigger emergency calls.",
        "AI Cattle Breed Identifier: Photo-based identification for farmers.",
        "Offline-First Learning App: Downloadable lessons for low-internet areas.",
        "Temperature-Sensitive Medicine Reminder: Climate-aware medical alerts."
    ]
};

export const BASIC_RESPONSES: Record<string, string> = {
    "hi": "Hello there! How can I help you to solve your problem today? 😊",
    "hello": "Hi there! How can I help you to solve your problem today? 😊",
    "hey": "Hey! How can I assist you?",
    "how are you": "I’m doing great! Thanks for asking 😊",
    "thanks": "You're very welcome! Good luck with your coding! 🚀🙌",
    "thank you": "Happy to help 😊",
    "bye": "Goodbye 👋 See you soon!",
    "help": "You can ask me FAQ questions or request project ideas using the /idea command.",
    "tell me a joke": "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
    "who made you": "I was created for a GDG hackathon! 🛠️",
    "tell me something interesting": "Did you know? The first computer bug was an actual moth found in 1947!",
};
