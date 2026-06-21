import React, { useState, useEffect } from 'react';
import { Camera, Users, Briefcase, MessageCircle, Calendar, Star, Award, LogOut, Menu, X, Plus, Search, Filter, CheckCircle, Clock, AlertCircle, Edit, Save } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, orderBy, limit, addDoc, writeBatch, arrayUnion } from 'firebase/firestore';


// Firebase configuration loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase configuration is complete and not using placeholder values
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && 
  !firebaseConfig.apiKey.startsWith("YOUR_") &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID";

// Initialize Firebase
let app, auth, db;
if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  console.warn('Firebase is not configured or using placeholder values. Running in Demo Mode.');
}

// Configure Google Provider with college domain restriction
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'vitapstudent.ac.in' // Replace with your college domain
});

const CampusConnect = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    maxMembers: 5,
    requiredSkills: [],
    status: 'open',
    category: 'Web Development',
    visibility: 'public'
  });
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectApplications, setProjectApplications] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [searchUserId, setSearchUserId] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingData, setRatingData] = useState({
    projectId: null,
    projectTitle: '',
    membersToRate: [],
    ratings: {}
  });
  const [viewRatingsModal, setViewRatingsModal] = useState(false);
  const [selectedUserRatings, setSelectedUserRatings] = useState(null);
  const [learningResources, setLearningResources] = useState({});
  const [selectedSkillResources, setSelectedSkillResources] = useState(null);
  const [learningProgress, setLearningProgress] = useState({});
  const [projectDocuments, setProjectDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: '',
    description: '',
    projectId: '',
    skills: [],
    imageUrl: '',
    links: [],
    achievements: '',
    role: '',
    duration: '',
    documents: []
  });
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [liveSessions, setLiveSessions] = useState([]);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    meetLink: '',
    scheduledTime: '',
    duration: '60',
    skill: '',
    maxParticipants: 10
  });

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setDemoMode(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  // Reload when connections change
  useEffect(() => {
    if (profile && currentPage === 'chat') {
      loadConversations();
    }
  }, [profile?.connections?.length, currentPage]); // Reload when connections change
  // Load learning resources when user has skills they want to learn
  useEffect(() => {
    if (profile?.skillsWanted && profile.skillsWanted.length > 0) {
      loadLearningResourcesEnhanced(profile.skillsWanted);
    }
  }, [profile?.skillsWanted]);

  // Load learning progress
  useEffect(() => {
    if (user && currentPage === 'learning') {
      loadLearningProgress();
    }
  }, [user, currentPage]);

  // Load live sessions
  useEffect(() => {
    if (user && currentPage === 'learning') {
      loadLiveSessions();
    }
  }, [user, currentPage]);
  // Load portfolio when on portfolio page
  useEffect(() => {
    if (currentPage === 'portfolio' && user) {
      loadPortfolio();
    }
  }, [currentPage, user]);
  // Load user profile from Firestore
  const loadUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setEditedProfile(userData);

        // Load additional data
        await loadProjects(uid);
        await loadMatches(uid, userData);
      } else {
        // Create initial profile if doesn't exist
        const newProfile = {
          uid,
          uniqueId: generateUniqueId(),
          email: auth.currentUser.email,
          name: auth.currentUser.displayName || '',
          photoURL: auth.currentUser.photoURL || '',
          department: '',
          year: '',
          skillsOffered: [],
          skillsWanted: [],
          availability: '',
          bio: '',
          role: 'student',
          rating: 0,
          ratingCount: 0,
          completedProjects: [],
          connections: [],
          pendingConnections: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', uid), newProfile);
        setProfile(newProfile);
        setEditedProfile(newProfile);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    }
  };

  // Load user's projects - FIXED: Removed orderBy to avoid index requirement
  const loadProjects = async (uid) => {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('members', 'array-contains', uid),
        limit(10)
      );

      const querySnapshot = await getDocs(projectsQuery);
      const projectsList = [];

      querySnapshot.forEach((doc) => {
        projectsList.push({ id: doc.id, ...doc.data() });
      });

      // Sort in memory instead
      projectsList.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setProjects(projectsList);
    } catch (err) {
      console.error('Error loading projects:', err);
      // Set empty array instead of showing error
      setProjects([]);
    }
  };

  // Load all public projects for browsing
  const loadAllPublicProjects = async () => {
    try {
      if (db && !demoMode) {
        const projectsQuery = query(
          collection(db, 'projects'),
          where('visibility', '==', 'public'),
          limit(50)
        );

        const querySnapshot = await getDocs(projectsQuery);
        const projectsList = [];

        querySnapshot.forEach((doc) => {
          projectsList.push({ id: doc.id, ...doc.data() });
        });

        projectsList.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        // Merge with user's projects
        const userProjectIds = projects.map(p => p.id);
        const allProjects = [...projects];
        projectsList.forEach(p => {
          if (!userProjectIds.includes(p.id)) {
            allProjects.push(p);
          }
        });

        setProjects(allProjects);
      }
    } catch (err) {
      console.error('Error loading public projects:', err);
    }
  };

  // Load connection requests
  const loadConnectionRequests = async () => {
    try {
      if (db && !demoMode) {
        const requestsQuery = query(
          collection(db, 'connectionRequests'),
          where('to', '==', user.uid),
          where('status', '==', 'pending')
        );

        const querySnapshot = await getDocs(requestsQuery);
        const requestsList = [];

        querySnapshot.forEach((doc) => {
          requestsList.push({ id: doc.id, ...doc.data() });
        });

        setConnectionRequests(requestsList);
      }
    } catch (err) {
      console.error('Error loading connection requests:', err);
    }
  };

  // Load on page change to requests
  useEffect(() => {
    if (currentPage === 'requests' && profile) {
      loadConnectionRequests();
    }
    if (currentPage === 'projects' && profile) {
      loadAllPublicProjects();
    }
  }, [currentPage, profile]);

  // Load skill matches
  const loadMatches = async (currentUid, currentUserData) => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        limit(50)
      );

      const querySnapshot = await getDocs(usersQuery);
      const matchesList = [];

      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUid) {
          const userData = doc.data();
          const { score, breakdown } = calculateMatchScore(currentUserData, userData);

          // Only include matches with score > 0
          if (score > 0) {
            matchesList.push({
              id: doc.id,
              ...userData,
              matchScore: score,
              matchBreakdown: breakdown
            });
          }
        }
      });

      // Sort by match score (descending)
      matchesList.sort((a, b) => b.matchScore - a.matchScore);

      // Return top 20 matches
      setMatches(matchesList.slice(0, 20));
    } catch (err) {
      console.error('Error loading matches:', err);
      setMatches([]);
    }
  };

  // Calculate match score algorithm
  // Calculate match score algorithm with bidirectional skill matching and availability
  const calculateMatchScore = (user1, user2) => {
    let score = 0;
    const breakdown = {
      canTeach: 0,
      wantsToLearn: 0,
      department: 0,
      availability: 0
    };

    // Skills user1 wants to learn that user2 can teach
    const user1Wants = user1.skillsWanted || [];
    const user2Offers = user2.skillsOffered || [];

    user1Wants.forEach(skill => {
      if (user2Offers.some(s => s.toLowerCase() === skill.toLowerCase())) {
        breakdown.wantsToLearn += 15;
      }
    });

    // Skills user2 wants to learn that user1 can teach (bidirectional)
    const user1Offers = user1.skillsOffered || [];
    const user2Wants = user2.skillsWanted || [];

    user2Wants.forEach(skill => {
      if (user1Offers.some(s => s.toLowerCase() === skill.toLowerCase())) {
        breakdown.canTeach += 15;
      }
    });

    // Same department bonus
    if (user1.department && user2.department &&
      user1.department === user2.department) {
      breakdown.department = 5;
    }

    // Availability matching
    if (user1.availability && user2.availability) {
      const availabilityScore = calculateAvailabilityMatch(
        user1.availability,
        user2.availability
      );
      breakdown.availability = availabilityScore;
    }

    // Calculate total score
    score = breakdown.canTeach + breakdown.wantsToLearn +
      breakdown.department + breakdown.availability;

    return { score, breakdown };
  };

  // Helper function to calculate availability overlap
  const calculateAvailabilityMatch = (availability1, availability2) => {
    if (!availability1 || !availability2) return 0;

    const av1 = availability1.toLowerCase();
    const av2 = availability2.toLowerCase();

    let score = 0;

    // Time periods matching
    const timePeriods = {
      'morning': ['morning', 'am', '9', '10', '11'],
      'afternoon': ['afternoon', 'pm', '12', '1', '2', '3', '4'],
      'evening': ['evening', 'night', '5', '6', '7', '8', '9', '10'],
      'anytime': ['anytime', 'flexible', 'any time', 'all day']
    };

    // Days matching
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday',
      'saturday', 'sunday', 'weekday', 'weekend'];

    // Check for anytime/flexible availability (highest match)
    if ((av1.includes('anytime') || av1.includes('flexible')) &&
      (av2.includes('anytime') || av2.includes('flexible'))) {
      return 10;
    }

    // Check for time period overlap
    for (const [period, keywords] of Object.entries(timePeriods)) {
      const av1HasPeriod = keywords.some(kw => av1.includes(kw));
      const av2HasPeriod = keywords.some(kw => av2.includes(kw));

      if (av1HasPeriod && av2HasPeriod) {
        score += 5;
        break; // Only count once
      }
    }

    // Check for day overlap
    let dayMatches = 0;
    days.forEach(day => {
      if (av1.includes(day) && av2.includes(day)) {
        dayMatches++;
      }
    });

    if (dayMatches > 0) {
      score += Math.min(dayMatches * 2, 5); // Max 5 points for days
    }

    return score;
  };

  // Load learning resources for skills
  const loadLearningResources = (skills) => {
    const resourcesMap = {};

    // Curated learning resources database
    const resourceDatabase = {
      'Python': [
        {
          title: 'Python for Beginners - Full Course',
          provider: 'freeCodeCamp',
          type: 'video',
          url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
          duration: '4h 26m',
          level: 'beginner',
          description: 'Complete Python tutorial covering basics to intermediate concepts'
        },
        {
          title: 'Python Official Documentation',
          provider: 'Python.org',
          type: 'documentation',
          url: 'https://docs.python.org/3/tutorial/',
          level: 'all',
          description: 'Official Python tutorial and documentation'
        }
      ],
      'JavaScript': [
        {
          title: 'JavaScript Full Course',
          provider: 'freeCodeCamp',
          type: 'video',
          url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
          duration: '3h 26m',
          level: 'beginner',
          description: 'Learn JavaScript from scratch'
        },
        {
          title: 'MDN Web Docs - JavaScript',
          provider: 'Mozilla',
          type: 'documentation',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
          level: 'all',
          description: 'Comprehensive JavaScript documentation'
        }
      ],
      'React': [
        {
          title: 'React Course - Beginner\'s Tutorial',
          provider: 'freeCodeCamp',
          type: 'video',
          url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
          duration: '11h 59m',
          level: 'beginner',
          description: 'Complete React tutorial for beginners'
        }
      ],
      'Machine Learning': [
        {
          title: 'Machine Learning Course',
          provider: 'Andrew Ng - Stanford',
          type: 'video',
          url: 'https://www.youtube.com/watch?v=PPLop4L2eGk',
          duration: '12h+',
          level: 'beginner',
          description: 'Comprehensive ML course by Andrew Ng'
        }
      ],
      'UI/UX Design': [
        {
          title: 'UI Design for Beginners',
          provider: 'DesignCourse',
          type: 'video',
          url: 'https://www.youtube.com/watch?v=_Hp_dI0DzY4',
          duration: '1h 30m',
          level: 'beginner',
          description: 'Complete UI design fundamentals course'
        }
      ]
      // Add more skills here following the same pattern
    };

    // Map skills to resources
    for (const skill of skills) {
      if (resourceDatabase[skill]) {
        resourcesMap[skill] = resourceDatabase[skill];
      } else {
        // Provide generic resources if no match
        resourcesMap[skill] = [
          {
            title: `${skill} Tutorial`,
            provider: 'YouTube',
            type: 'video',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`,
            level: 'all',
            description: `Search YouTube for ${skill} tutorials`
          }
        ];
      }
    }

    setLearningResources(resourcesMap);
  };

  // Fetch videos from YouTube API
  const fetchYouTubeVideos = async (skill) => {
    try {
      // Using YouTube search without API key (public search)
      const searchQuery = encodeURIComponent(`${skill} tutorial programming`);

      // Return curated results structure
      return [
        {
          title: `${skill} Complete Course`,
          provider: 'YouTube',
          type: 'video',
          url: `https://www.youtube.com/results?search_query=${searchQuery}`,
          level: 'beginner',
          description: `Search YouTube for comprehensive ${skill} tutorials`,
          source: 'youtube'
        },
        {
          title: `${skill} Tutorial - freeCodeCamp`,
          provider: 'freeCodeCamp',
          type: 'video',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} freeCodeCamp`)}`,
          duration: 'Various',
          level: 'beginner',
          description: `Free comprehensive ${skill} course`,
          source: 'youtube'
        },
        {
          title: `${skill} Crash Course`,
          provider: 'Traversy Media',
          type: 'video',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} crash course`)}`,
          duration: '1-2h',
          level: 'beginner',
          description: `Quick ${skill} crash course for beginners`,
          source: 'youtube'
        }
      ];
    } catch (err) {
      console.error('Error fetching YouTube videos:', err);
      return [];
    }
  };

  // Fetch documentation and articles
  const fetchDocumentationLinks = async (skill) => {
    const docLinks = [];

    // Add official documentation links
    const docMappings = {
      'Python': [
        { title: 'Python Official Docs', url: 'https://docs.python.org/3/', provider: 'Python.org' },
        { title: 'Real Python Tutorials', url: 'https://realpython.com/', provider: 'Real Python' }
      ],
      'JavaScript': [
        { title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', provider: 'MDN' },
        { title: 'JavaScript.info', url: 'https://javascript.info/', provider: 'javascript.info' }
      ],
      'React': [
        { title: 'React Documentation', url: 'https://react.dev/', provider: 'React.dev' },
        { title: 'React Tutorial', url: 'https://react.dev/learn', provider: 'React.dev' }
      ]
    };

    if (docMappings[skill]) {
      docMappings[skill].forEach(doc => {
        docLinks.push({
          title: doc.title,
          provider: doc.provider,
          type: 'documentation',
          url: doc.url,
          level: 'all',
          description: `Official ${skill} documentation and guides`,
          source: 'documentation'
        });
      });
    } else {
      // Generic documentation search
      docLinks.push({
        title: `${skill} Documentation`,
        provider: 'Google',
        type: 'documentation',
        url: `https://www.google.com/search?q=${encodeURIComponent(`${skill} official documentation`)}`,
        level: 'all',
        description: `Search for official ${skill} documentation`,
        source: 'search'
      });
    }

    return docLinks;
  };

  // Enhanced load learning resources with auto-import
  const loadLearningResourcesEnhanced = async (skills) => {
    setIsLoadingResources(true);
    const resourcesMap = {};

    try {
      for (const skill of skills) {
        const allResources = [];

        // Fetch from multiple sources
        const youtubeVideos = await fetchYouTubeVideos(skill);
        const documentation = await fetchDocumentationLinks(skill);

        allResources.push(...youtubeVideos);
        allResources.push(...documentation);

        // Add interactive learning platforms
        allResources.push({
          title: `Learn ${skill} - Codecademy`,
          provider: 'Codecademy',
          type: 'interactive',
          url: `https://www.codecademy.com/search?query=${encodeURIComponent(skill)}`,
          level: 'beginner',
          description: `Interactive ${skill} courses`,
          source: 'platform'
        });

        allResources.push({
          title: `${skill} Exercises - W3Schools`,
          provider: 'W3Schools',
          type: 'interactive',
          url: `https://www.w3schools.com/${skill.toLowerCase()}/`,
          level: 'beginner',
          description: `Interactive ${skill} tutorials and exercises`,
          source: 'platform'
        });

        resourcesMap[skill] = allResources;
      }

      setLearningResources(resourcesMap);
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setIsLoadingResources(false);
    }
  };

  // Load live sessions
  const loadLiveSessions = async () => {
    try {
      if (db && !demoMode) {
        const sessionsQuery = query(
          collection(db, 'liveSessions'),
          where('scheduledTime', '>', new Date().toISOString()),
          orderBy('scheduledTime', 'asc'),
          limit(20)
        );

        const querySnapshot = await getDocs(sessionsQuery);
        const sessionsList = [];

        querySnapshot.forEach((doc) => {
          sessionsList.push({ id: doc.id, ...doc.data() });
        });

        setLiveSessions(sessionsList);
      } else {
        // Demo sessions
        setLiveSessions([
          {
            id: '1',
            title: 'React Hooks Deep Dive',
            description: 'Learn advanced React hooks patterns',
            meetLink: 'https://meet.google.com/abc-defg-hij',
            scheduledTime: new Date(Date.now() + 3600000).toISOString(),
            duration: '60',
            skill: 'React',
            hostName: 'Sarah Johnson',
            hostId: 'demo-user-123',
            participants: ['demo-user-123'],
            maxParticipants: 10,
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Python for Data Science',
            description: 'Introduction to pandas and numpy',
            meetLink: 'https://meet.google.com/xyz-uvwx-yz',
            scheduledTime: new Date(Date.now() + 7200000).toISOString(),
            duration: '90',
            skill: 'Python',
            hostName: 'Mike Chen',
            hostId: 'user2',
            participants: ['user2', 'demo-user-123'],
            maxParticipants: 15,
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading live sessions:', err);
      setLiveSessions([]);
    }
  };

  // Create live session
  const handleCreateLiveSession = async () => {
    // Clear any previous errors
    setError(null);

    // Validation
    if (!newSession.title || !newSession.title.trim()) {
      setError('Please enter a session title');
      return;
    }

    if (!newSession.meetLink || !newSession.meetLink.trim()) {
      setError('Please enter a Google Meet link');
      return;
    }

    if (!newSession.scheduledTime) {
      setError('Please select a date and time');
      return;
    }

    // Validate Google Meet link format
    if (!newSession.meetLink.includes('meet.google.com')) {
      setError('Please enter a valid Google Meet link (must contain meet.google.com)');
      return;
    }

    // Validate that the scheduled time is in the future
    const scheduledDate = new Date(newSession.scheduledTime);
    const now = new Date();

    if (scheduledDate <= now) {
      setError('Please select a future date and time');
      return;
    }

    try {
      // Convert scheduledTime to ISO string if it's a datetime-local input value
      const scheduledTimeISO = newSession.scheduledTime.includes('T')
        ? new Date(newSession.scheduledTime).toISOString()
        : newSession.scheduledTime;

      const sessionData = {
        title: newSession.title.trim(),
        description: newSession.description.trim() || '',
        meetLink: newSession.meetLink.trim(),
        scheduledTime: scheduledTimeISO,
        duration: newSession.duration || '60',
        skill: newSession.skill.trim() || '',
        maxParticipants: parseInt(newSession.maxParticipants) || 10,
        hostName: profile?.name || user?.displayName || 'Unknown Host',
        hostId: user.uid,
        participants: [user.uid],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'scheduled'
      };

      console.log('Creating session with data:', sessionData);

      if (db && !demoMode) {
        // Firestore mode
        try {
          const sessionRef = await addDoc(collection(db, 'liveSessions'), sessionData);
          sessionData.id = sessionRef.id;
          console.log('Session created in Firestore with ID:', sessionRef.id);
        } catch (firestoreError) {
          console.error('Firestore error:', firestoreError);
          throw new Error('Failed to save to database: ' + firestoreError.message);
        }
      } else {
        // Demo mode
        sessionData.id = `session-${Date.now()}`;
        console.log('Session created in demo mode with ID:', sessionData.id);
      }

      // Add to local state
      setLiveSessions([sessionData, ...liveSessions]);

      // Close modal and reset form
      setShowCreateSessionModal(false);
      setNewSession({
        title: '',
        description: '',
        meetLink: '',
        scheduledTime: '',
        duration: '60',
        skill: '',
        maxParticipants: 10
      });

      // Success message
      alert('✓ Live session created successfully!');
      setError(null);

    } catch (err) {
      console.error('Error creating session:', err);
      setError(err.message || 'Failed to create session. Please try again.');
    }
  };

  // Join live session
  const handleJoinSession = async (sessionId) => {
    try {
      const session = liveSessions.find(s => s.id === sessionId);
      if (!session) return;

      if (session.participants.includes(user.uid)) {
        // Already joined, open meet link
        window.open(session.meetLink, '_blank');
        return;
      }

      if (session.participants.length >= session.maxParticipants) {
        setError('Session is full');
        return;
      }

      const updatedParticipants = [...session.participants, user.uid];

      if (db && !demoMode) {
        await setDoc(doc(db, 'liveSessions', sessionId), {
          participants: updatedParticipants,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setLiveSessions(liveSessions.map(s =>
        s.id === sessionId
          ? { ...s, participants: updatedParticipants }
          : s
      ));

      // Open Google Meet link
      window.open(session.meetLink, '_blank');
      alert('✓ Joined session! Opening Google Meet...');
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session');
    }
  };

  // Delete session (host only)
  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const session = liveSessions.find(s => s.id === sessionId);
      if (session.hostId !== user.uid) {
        setError('Only the host can delete this session');
        return;
      }

      if (db && !demoMode) {
        await deleteDoc(doc(db, 'liveSessions', sessionId));
      }

      setLiveSessions(liveSessions.filter(s => s.id !== sessionId));
      alert('✓ Session deleted');
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session');
    }
  };
  // Handle document upload for projects
  const handleDocumentUpload = async (e, projectId = null) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingDocument(true);

    try {
      const uploadedDocs = [];

      for (const file of files) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/jpeg',
          'image/png'
        ];

        if (!allowedTypes.includes(file.type)) {
          alert(`File ${file.name} type not supported. Please upload PDF, DOC, DOCX, TXT, or images.`);
          continue;
        }

        // Convert to base64 for storage
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const docData = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.uid,
          uploaderName: profile.name
        };

        uploadedDocs.push(docData);
      }

      if (projectId) {
        // Add to existing project
        setProjects(projects.map(p =>
          p.id === projectId
            ? { ...p, documents: [...(p.documents || []), ...uploadedDocs] }
            : p
        ));
      } else {
        // Add to new project being created
        setProjectDocuments([...projectDocuments, ...uploadedDocs]);
      }

      alert(`✓ ${uploadedDocs.length} document(s) uploaded successfully!`);
    } catch (err) {
      console.error('Error uploading documents:', err);
      alert('Failed to upload documents. Please try again.');
    } finally {
      setUploadingDocument(false);
    }
  };

  // Remove document
  const handleRemoveDocument = (documentId, projectId = null) => {
    if (projectId) {
      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, documents: (p.documents || []).filter(d => d.id !== documentId) }
          : p
      ));
    } else {
      setProjectDocuments(projectDocuments.filter(d => d.id !== documentId));
    }
  };

  // View/Download document
  const handleViewDocument = (doc) => {
    // Create a blob and download
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    link.click();
  };
  // Load user's portfolio
  const loadPortfolio = async () => {
    try {
      if (db && !demoMode) {
        const portfolioQuery = query(
          collection(db, 'portfolio'),
          where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(portfolioQuery);
        const portfolioList = [];

        querySnapshot.forEach((doc) => {
          portfolioList.push({ id: doc.id, ...doc.data() });
        });

        setPortfolioItems(portfolioList);
      } else {
        setPortfolioItems([
          {
            id: '1',
            title: 'Campus Event App',
            description: 'Built a mobile app for discovering campus events with 500+ active users',
            skills: ['React Native', 'Firebase', 'UI/UX Design'],
            imageUrl: '',
            role: 'Full Stack Developer',
            duration: '3 months',
            achievements: 'Won Best App Award at college hackathon',
            links: [],
            projectId: '1'
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading portfolio:', err);
    }
  };

  // Add portfolio item
  const handleAddPortfolioItem = async () => {
    if (!newPortfolioItem.title || !newPortfolioItem.description) {
      setError('Please fill in title and description');
      return;
    }

    try {
      const portfolioData = {
        ...newPortfolioItem,
        userId: user.uid,
        userName: profile.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (db && !demoMode) {
        const portfolioRef = await addDoc(collection(db, 'portfolio'), portfolioData);
        portfolioData.id = portfolioRef.id;
      } else {
        portfolioData.id = `portfolio-${Date.now()}`;
      }

      setPortfolioItems([portfolioData, ...portfolioItems]);
      setShowAddPortfolioModal(false);
      setNewPortfolioItem({
        title: '',
        description: '',
        projectId: '',
        skills: [],
        imageUrl: '',
        links: [],
        achievements: '',
        role: '',
        duration: '',
        documents: []
      });

      alert('✓ Portfolio item added!');
    } catch (err) {
      console.error('Error adding portfolio item:', err);
      setError('Failed to add portfolio item.');
    }
  };

  // Load learning progress
  const loadLearningProgress = async () => {
    try {
      if (db && !demoMode) {
        const progressDoc = await getDoc(doc(db, 'learningProgress', user.uid));
        if (progressDoc.exists()) {
          setLearningProgress(progressDoc.data().progress || {});
        }
      } else {
        // Demo mode progress
        setLearningProgress({
          'Python': {
            completedResources: 1,
            totalResources: 2,
            lastUpdated: new Date(Date.now() - 86400000).toISOString()
          }
        });
      }
    } catch (err) {
      console.error('Error loading learning progress:', err);
    }
  };

  // Mark resource as completed
  // Mark resource as completed
  const handleMarkResourceComplete = async (skill, resourceIndex) => {
    try {
      const resources = learningResources[skill] || [];
      const currentProgress = learningProgress[skill] || {
        completedResources: 0,
        totalResources: resources.length,
        lastUpdated: new Date().toISOString()
      };

      // Only mark complete if not already completed
      if (resourceIndex >= currentProgress.completedResources) {
        const updatedProgress = {
          ...learningProgress,
          [skill]: {
            ...currentProgress,
            completedResources: resourceIndex + 1, // Set to current index + 1
            totalResources: resources.length,
            lastUpdated: new Date().toISOString()
          }
        };

        if (db && !demoMode) {
          await setDoc(doc(db, 'learningProgress', user.uid), {
            progress: updatedProgress,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        setLearningProgress(updatedProgress);
        alert('✓ Resource marked as complete!');
      }
    } catch (err) {
      console.error('Error updating progress:', err);

      // Fallback: just update local state
      const resources = learningResources[skill] || [];
      const currentProgress = learningProgress[skill] || {
        completedResources: 0,
        totalResources: resources.length
      };

      const updatedProgress = {
        ...learningProgress,
        [skill]: {
          ...currentProgress,
          completedResources: resourceIndex + 1,
          totalResources: resources.length,
          lastUpdated: new Date().toISOString()
        }
      };

      setLearningProgress(updatedProgress);
      alert('✓ Progress saved locally!');
    }
  };

  // Reset resource progress
  const handleResetResourceProgress = async (skill, resourceIndex) => {
    try {
      const resources = learningResources[skill] || [];
      const currentProgress = learningProgress[skill];
      if (!currentProgress) return;

      const updatedProgress = {
        ...learningProgress,
        [skill]: {
          ...currentProgress,
          completedResources: Math.max(0, resourceIndex),
          totalResources: resources.length,
          lastUpdated: new Date().toISOString()
        }
      };

      if (db && !demoMode) {
        await setDoc(doc(db, 'learningProgress', user.uid), {
          progress: updatedProgress,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setLearningProgress(updatedProgress);
      alert('✓ Progress reset!');
    } catch (err) {
      console.error('Error resetting progress:', err);
      // Fallback to local state update
      const resources = learningResources[skill] || [];
      const currentProgress = learningProgress[skill];

      const updatedProgress = {
        ...learningProgress,
        [skill]: {
          ...currentProgress,
          completedResources: Math.max(0, resourceIndex),
          totalResources: resources.length,
          lastUpdated: new Date().toISOString()
        }
      };

      setLearningProgress(updatedProgress);
      alert('✓ Reset saved locally!');
    }
  };

  // Generate unique user ID
  const generateUniqueId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'CC-';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  // Search user by unique ID
  const handleSearchUser = async () => {
    if (!searchUserId.trim()) return;

    try {
      if (db && !demoMode) {
        const usersQuery = query(
          collection(db, 'users'),
          where('uniqueId', '==', searchUserId.toUpperCase().trim())
        );

        const querySnapshot = await getDocs(usersQuery);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setSearchedUser({ id: querySnapshot.docs[0].id, ...userData });
        } else {
          setError('User not found with this ID');
          setSearchedUser(null);
        }
      } else {
        // Demo mode search
        const demoUsers = [
          {
            id: 'match1',
            uniqueId: 'CC-DEMO001',
            name: 'Sarah Johnson',
            department: 'Computer Science',
            year: '2nd Year',
            skillsOffered: ['Machine Learning', 'Python', 'Data Science'],
            skillsWanted: ['Web Development', 'React'],
            rating: 4.8
          },
          {
            id: 'match2',
            uniqueId: 'CC-DEMO002',
            name: 'Mike Chen',
            department: 'Design',
            year: '3rd Year',
            skillsOffered: ['UI/UX Design', 'Figma', 'Illustration'],
            skillsWanted: ['Frontend Development', 'Animation'],
            rating: 4.6
          }
        ];

        const found = demoUsers.find(u => u.uniqueId === searchUserId.toUpperCase().trim());
        if (found) {
          setSearchedUser(found);
        } else {
          setError('User not found with this ID');
          setSearchedUser(null);
        }
      }
    } catch (err) {
      console.error('Error searching user:', err);
      setError('Failed to search user');
    }
  };

  // Send connection request
  const handleSendConnectionRequest = async (targetUserId) => {
    try {
      // Check if already connected
      if (profile.connections?.includes(targetUserId)) {
        setError('You are already connected with this user');
        return;
      }

      // Check if request already sent
      if (db && !demoMode) {
        const existingRequestQuery = query(
          collection(db, 'connectionRequests'),
          where('from', '==', user.uid),
          where('to', '==', targetUserId),
          where('status', '==', 'pending')
        );

        const existingSnapshot = await getDocs(existingRequestQuery);
        if (!existingSnapshot.empty) {
          setError('Connection request already sent');
          return;
        }
      }

      const request = {
        from: user.uid,
        fromName: profile.name,
        fromEmail: profile.email,
        to: targetUserId,
        status: 'pending',
        sentAt: new Date().toISOString()
      };

      if (db && !demoMode) {
        // Use addDoc to auto-generate ID
        const requestRef = await addDoc(collection(db, 'connectionRequests'), request);
        request.id = requestRef.id;

        console.log('Connection request created:', request.id);
      } else {
        request.id = `req-${Date.now()}`;
      }

      setConnectionRequests([...connectionRequests, request]);
      alert('Connection request sent successfully!');
      setError(null);
    } catch (err) {
      console.error('Error sending connection request:', err);
      setError('Failed to send connection request: ' + err.message);
    }
  };


  // Accept connection request
  const handleAcceptConnection = async (requestId, fromUserId) => {
    try {
      console.log('Accepting connection from:', fromUserId);

      if (db && !demoMode) {
        // Use batch writes for atomicity
        const batch = writeBatch(db);

        // 1. Update current user's connections
        const currentUserRef = doc(db, 'users', user.uid);
        batch.update(currentUserRef, {
          connections: arrayUnion(fromUserId),
          updatedAt: new Date().toISOString()
        });

        // 2. Update other user's connections
        const otherUserRef = doc(db, 'users', fromUserId);
        batch.update(otherUserRef, {
          connections: arrayUnion(user.uid),
          updatedAt: new Date().toISOString()
        });

        // 3. Update request status
        const requestRef = doc(db, 'connectionRequests', requestId);
        batch.update(requestRef, {
          status: 'accepted',
          acceptedAt: new Date().toISOString()
        });

        // Commit all changes at once
        await batch.commit();
        console.log('Batch write successful');

        // Create conversation
        const conversationId = [user.uid, fromUserId].sort().join('-');
        const conversationRef = doc(db, 'conversations', conversationId);

        // Get other user's data for conversation
        const otherUserDoc = await getDoc(otherUserRef);
        const otherUserData = otherUserDoc.data();

        await setDoc(conversationRef, {
          id: conversationId,
          participants: [user.uid, fromUserId],
          participantNames: {
            [user.uid]: profile.name,
            [fromUserId]: otherUserData.name
          },
          type: 'direct',
          lastMessage: null,
          lastMessageTime: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log('Conversation created:', conversationId);
      }

      // Update local state
      const updatedConnections = [...(profile.connections || []), fromUserId];
      setProfile({ ...profile, connections: updatedConnections });

      // Remove from connection requests
      setConnectionRequests(connectionRequests.filter(r => r.id !== requestId));

      // Reload conversations
      await loadConversations();

      alert('Connection accepted! You can now chat.');
      setError(null);
    } catch (err) {
      console.error('Error accepting connection:', err);
      setError('Failed to accept connection: ' + err.message);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;

    console.log('Sending message to:', activeChat.id);
    console.log('Active chat:', activeChat);

    const message = {
      senderId: user.uid,
      senderName: profile.name,
      text: messageInput.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
      createdAt: new Date()
    };

    // Check if message starts with @gemini
    const isGeminiQuery = messageInput.trim().toLowerCase().startsWith('@gemini');

    try {
      if (db && !demoMode) {
        // Add message to Firestore
        const messagesRef = collection(db, 'conversations', activeChat.id, 'messages');
        const docRef = await addDoc(messagesRef, message);

        console.log('Message sent with ID:', docRef.id);

        // Update conversation last message
        const conversationRef = doc(db, 'conversations', activeChat.id);
        await setDoc(conversationRef, {
          lastMessage: message.text,
          lastMessageTime: message.timestamp,
          updatedAt: message.timestamp,
          participants: activeChat.participants || [user.uid],
          type: activeChat.type || 'direct'
        }, { merge: true });

        console.log('Updated conversation');

        message.id = docRef.id;

        // If @gemini query, call AI and send response
        if (isGeminiQuery) {
          const query = messageInput.trim().substring(7).trim(); // Remove @gemini prefix

          // Show typing indicator
          const typingMessage = {
            id: 'typing-' + Date.now(),
            senderId: 'gemini-ai',
            senderName: 'Gemini AI',
            text: '🤔 Thinking...',
            timestamp: new Date().toISOString(),
            type: 'typing',
            createdAt: new Date()
          };

          const typingDocRef = await addDoc(messagesRef, typingMessage);

          // Get AI response
          const aiResponse = await callGeminiAPI(query);

          // Delete typing indicator
          await deleteDoc(doc(db, 'conversations', activeChat.id, 'messages', typingDocRef.id));

          // Add AI response
          const aiMessage = {
            senderId: 'gemini-ai',
            senderName: 'Gemini AI',
            text: aiResponse,
            timestamp: new Date().toISOString(),
            type: 'ai-response',
            createdAt: new Date()
          };

          await addDoc(messagesRef, aiMessage);

          // Update conversation
          await setDoc(conversationRef, {
            lastMessage: 'Gemini AI: ' + aiResponse.substring(0, 50) + '...',
            lastMessageTime: aiMessage.timestamp,
            updatedAt: aiMessage.timestamp
          }, { merge: true });
        }
      } else {
        // Demo mode
        message.id = Date.now().toString();

        const updatedMessages = {
          ...chatMessages,
          [activeChat.id]: [...(chatMessages[activeChat.id] || []), message]
        };
        setChatMessages(updatedMessages);

        // If @gemini query in demo mode
        if (isGeminiQuery) {
          const query = messageInput.trim().substring(7).trim();

          // Add typing indicator
          const typingMessage = {
            id: 'typing-' + Date.now(),
            senderId: 'gemini-ai',
            senderName: 'Gemini AI',
            text: '🤔 Thinking...',
            timestamp: new Date().toISOString(),
            type: 'typing'
          };

          setChatMessages({
            ...updatedMessages,
            [activeChat.id]: [...updatedMessages[activeChat.id], typingMessage]
          });

          // Get AI response
          const aiResponse = await callGeminiAPI(query);

          // Remove typing indicator and add response
          const aiMessage = {
            id: Date.now().toString(),
            senderId: 'gemini-ai',
            senderName: 'Gemini AI',
            text: aiResponse,
            timestamp: new Date().toISOString(),
            type: 'ai-response'
          };

          setTimeout(() => {
            setChatMessages(prev => ({
              ...prev,
              [activeChat.id]: [...(prev[activeChat.id] || []).filter(m => m.type !== 'typing'), aiMessage]
            }));

            // Update conversation
            setConversations(conversations.map(c =>
              c.id === activeChat.id
                ? { ...c, lastMessage: 'Gemini AI: ' + aiResponse.substring(0, 50) + '...', lastMessageTime: aiMessage.timestamp }
                : c
            ));
          }, 1000);
        }
      }

      // Update conversation in list
      setConversations(conversations.map(c =>
        c.id === activeChat.id
          ? { ...c, lastMessage: message.text, lastMessageTime: message.timestamp }
          : c
      ));

      setMessageInput('');

      // Auto-scroll to bottom
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message: ' + err.message);
    }
  };

  // Listen to messages in real-time for active chat
  useEffect(() => {
    if (!activeChat || !db || demoMode) return;

    console.log('Setting up real-time listener for:', activeChat.id);

    // Create real-time listener for messages
    const messagesRef = collection(db, 'conversations', activeChat.id, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = [];

      snapshot.forEach((doc) => {
        messagesList.push({ id: doc.id, ...doc.data() });
      });

      console.log('Received messages update:', messagesList.length);

      // Update messages for this conversation
      setChatMessages(prev => ({
        ...prev,
        [activeChat.id]: messagesList
      }));

      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    // Cleanup listener when chat changes or component unmounts
    return () => {
      console.log('Cleaning up listener for:', activeChat.id);
      unsubscribe();
    };
  }, [activeChat?.id, db, demoMode]);


  // Handle file upload in chat
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const message = {
      id: Date.now().toString(),
      senderId: user.uid,
      senderName: profile.name,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
      type: 'file'
    };

    try {
      // In a real app, you would upload the file to storage first
      // For now, we'll just add the message with file info
      const updatedMessages = {
        ...chatMessages,
        [activeChat.id]: [...(chatMessages[activeChat.id] || []), message]
      };
      setChatMessages(updatedMessages);

      // Update conversation
      setConversations(conversations.map(c =>
        c.id === activeChat.id
          ? { ...c, lastMessage: `📎 ${file.name}`, lastMessageTime: message.timestamp }
          : c
      ));

      setError(null);

      // Auto-scroll to bottom
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);

    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
    }
  };

  // Load messages for a conversation
  const loadMessagesForConversation = async (conversationId) => {
    if (chatMessages[conversationId]) {
      // Messages already loaded
      return;
    }

    setIsLoadingMessages(true);

    try {
      if (db && !demoMode) {
        const messagesQuery = query(
          collection(db, 'conversations', conversationId, 'messages'),
          limit(100)
        );

        const querySnapshot = await getDocs(messagesQuery);
        const messagesList = [];

        querySnapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() });
        });

        // Sort by timestamp
        messagesList.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        setChatMessages({
          ...chatMessages,
          [conversationId]: messagesList
        });
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load participant info for direct messages
  const loadParticipantInfo = async (userId) => {
    try {
      if (db && !demoMode) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          return userDoc.data();
        }
      }
      return null;
    } catch (err) {
      console.error('Error loading participant info:', err);
      return null;
    }
  };

  // Load conversations
  const loadConversations = async () => {
    try {
      if (db && !demoMode) {
        console.log('Loading conversations for user:', user.uid);

        // Load conversations where user is a participant
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid)
        );

        const querySnapshot = await getDocs(conversationsQuery);
        const convosList = [];

        console.log('Found conversations:', querySnapshot.size);

        for (const docSnapshot of querySnapshot.docs) {
          const convoData = docSnapshot.data();
          console.log('Conversation:', convoData);

          // For direct messages, get the other participant's name
          if (convoData.type === 'direct') {
            const otherUserId = convoData.participants.find(id => id !== user.uid);

            if (otherUserId) {
              // Try to get name from participantNames first
              if (convoData.participantNames && convoData.participantNames[otherUserId]) {
                convoData.participantName = convoData.participantNames[otherUserId];
              } else {
                // Fallback: fetch from users collection
                try {
                  const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
                  if (otherUserDoc.exists()) {
                    convoData.participantName = otherUserDoc.data().name || 'User';
                  }
                } catch (err) {
                  console.log('Error loading participant name:', err);
                  convoData.participantName = 'User';
                }
              }
            }
          }

          convosList.push({ id: docSnapshot.id, ...convoData });
        }

        // Sort by last message time
        convosList.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || a.createdAt || 0);
          const timeB = new Date(b.lastMessageTime || b.createdAt || 0);
          return timeB - timeA;
        });

        console.log('Loaded conversations:', convosList);
        setConversations(convosList);
      } else {
        // Demo mode
        const directConvos = (profile.connections || []).map(connId => ({
          id: [user.uid, connId].sort().join('-'),
          participants: [user.uid, connId],
          type: 'direct',
          participantName: 'Demo User',
          lastMessage: null
        }));

        const projectConvos = projects
          .filter(p => p.members?.includes(user.uid))
          .map(p => ({
            id: `project-${p.id}`,
            projectId: p.id,
            projectTitle: p.title,
            participants: p.members,
            type: 'group',
            lastMessage: null
          }));

        setConversations([...directConvos, ...projectConvos]);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations: ' + err.message);
    }
  };


  // Load conversations when profile or projects change
  useEffect(() => {
    if (profile && currentPage === 'chat') {
      loadConversations();
    }
  }, [profile, projects, currentPage]);

  // Demo mode login
  const handleDemoLogin = () => {
    const demoUser = {
      uid: 'demo-user-123',
      email: 'demo@vitapstudent.ac.in',
      displayName: 'Demo User',
      photoURL: null
    };

    const demoProfile = {
      uid: 'demo-user-123',
      email: 'demo@vitapstudent.ac.in',
      name: 'Demo User',
      photoURL: null,
      department: 'Computer Science',
      year: '3rd Year',
      skillsOffered: ['React', 'Node.js', 'Python'],
      skillsWanted: ['Machine Learning', 'UI/UX Design'],
      availability: 'Weekdays after 4 PM',
      bio: 'Passionate about web development and looking to learn ML.',
      role: 'student',
      rating: 4.5,
      ratingCount: 12,
      completedProjects: ['project1', 'project2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setUser(demoUser);
    setProfile(demoProfile);
    setEditedProfile(demoProfile);

    // Demo projects
    setProjects([
      {
        id: '1',
        title: 'Campus Event App',
        description: 'Mobile app for discovering and managing campus events. Looking for React Native and Firebase experts.',
        status: 'open',
        category: 'Mobile Development',
        visibility: 'public',
        owner: 'demo-user-123',
        ownerName: 'Demo User',
        members: ['demo-user-123'],
        maxMembers: 5,
        requiredSkills: ['React Native', 'Firebase', 'UI/UX Design'],
        applications: [],
        joinRequests: [],
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Study Group Finder',
        description: 'Platform to connect students for collaborative learning. Need help with backend and database design.',
        status: 'open',
        category: 'Web Development',
        visibility: 'public',
        owner: 'demo-user-123',
        ownerName: 'Demo User',
        members: ['demo-user-123', 'user2'],
        maxMembers: 4,
        requiredSkills: ['React', 'Node.js', 'MongoDB', 'Express'],
        applications: [],
        joinRequests: [
          {
            userId: 'user3',
            userName: 'Alex Thompson',
            userSkills: ['Node.js', 'MongoDB', 'REST APIs'],
            message: 'I have 2 years of backend experience and would love to contribute!',
            requestedAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'pending'
          }
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '3',
        title: 'AI Study Assistant',
        description: 'Building an AI-powered study assistant using machine learning to help students learn more effectively.',
        status: 'open',
        category: 'Machine Learning',
        visibility: 'private',
        owner: 'user4',
        ownerName: 'Sarah Johnson',
        members: ['user4', 'user5'],
        maxMembers: 6,
        requiredSkills: ['Python', 'TensorFlow', 'Natural Language Processing', 'FastAPI'],
        applications: [],
        joinRequests: [],
        createdAt: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: '4',
        title: 'Campus Marketplace',
        description: 'A platform for students to buy, sell, and exchange items. Need frontend and payment integration help.',
        status: 'open',
        category: 'Web Development',
        visibility: 'public',
        owner: 'user6',
        ownerName: 'Mike Chen',
        members: ['user6'],
        maxMembers: 5,
        requiredSkills: ['React', 'Stripe API', 'Node.js', 'PostgreSQL'],
        applications: [],
        joinRequests: [],
        createdAt: new Date(Date.now() - 259200000).toISOString()
      }
    ]);

    // Demo matches
    setMatches([
      {
        id: 'match1',
        uniqueId: 'CC-DEMO001',
        name: 'Sarah Johnson',
        department: 'Computer Science',
        year: '2nd Year',
        skillsOffered: ['Machine Learning', 'Python', 'Data Science'],
        skillsWanted: ['Web Development', 'React'],
        availability: 'Weekdays after 4 PM',
        rating: 4.8,
        matchScore: 45, // Will be recalculated
        matchBreakdown: {
          canTeach: 15,
          wantsToLearn: 15,
          department: 5,
          availability: 10
        },
        bio: 'ML enthusiast looking to collaborate on interesting projects.',
        connections: ['demo-user-123']
      },
      {
        id: 'match2',
        uniqueId: 'CC-DEMO002',
        name: 'Mike Chen',
        department: 'Design',
        year: '3rd Year',
        skillsOffered: ['UI/UX Design', 'Figma', 'Illustration'],
        skillsWanted: ['Frontend Development', 'Animation'],
        availability: 'Weekends and evenings',
        rating: 4.6,
        matchScore: 20,
        matchBreakdown: {
          canTeach: 0,
          wantsToLearn: 15,
          department: 0,
          availability: 5
        },
        bio: 'Designer passionate about creating beautiful user experiences.',
        connections: []
      },
      {
        id: 'match3',
        uniqueId: 'CC-DEMO003',
        name: 'Emily Rodriguez',
        department: 'Computer Science',
        year: '4th Year',
        skillsOffered: ['Backend Development', 'AWS', 'Docker'],
        skillsWanted: ['Mobile Development', 'Flutter'],
        availability: 'Flexible - anytime',
        rating: 4.9,
        matchScore: 20,
        matchBreakdown: {
          canTeach: 0,
          wantsToLearn: 0,
          department: 5,
          availability: 10
        },
        bio: 'Backend developer with a passion for cloud architecture.',
        connections: []
      }
    ]);

    // Demo conversations
    setConversations([
      {
        id: 'demo-user-123-match1',
        participants: ['demo-user-123', 'match1'],
        type: 'direct',
        participantName: 'Sarah Johnson',
        lastMessage: 'Hey! Would love to work on that ML project together.',
        lastMessageTime: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'project-1',
        projectId: '1',
        projectTitle: 'Campus Event App',
        participants: ['demo-user-123'],
        type: 'group',
        lastMessage: 'Welcome to the project chat!',
        lastMessageTime: new Date(Date.now() - 7200000).toISOString()
      }
    ]);

    // Demo connection requests
    setConnectionRequests([
      {
        id: 'req1',
        from: 'match2',
        fromName: 'Mike Chen',
        to: 'demo-user-123',
        status: 'pending',
        sentAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'req2',
        from: 'match3',
        fromName: 'Emily Rodriguez',
        to: 'demo-user-123',
        status: 'pending',
        sentAt: new Date(Date.now() - 172800000).toISOString()
      }
    ]);

    // Demo messages
    setChatMessages({
      'demo-user-123-match1': [
        {
          id: '1',
          senderId: 'match1',
          senderName: 'Sarah Johnson',
          text: 'Hi! Thanks for connecting.',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          type: 'text'
        },
        {
          id: '2',
          senderId: 'demo-user-123',
          senderName: 'Demo User',
          text: 'No problem! Excited to collaborate.',
          timestamp: new Date(Date.now() - 5400000).toISOString(),
          type: 'text'
        },
        {
          id: '3',
          senderId: 'match1',
          senderName: 'Sarah Johnson',
          text: 'Hey! Would love to work on that ML project together.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: 'text'
        }
      ],
      'project-1': [
        {
          id: '1',
          senderId: 'demo-user-123',
          senderName: 'Demo User',
          text: 'Welcome to the project chat!',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          type: 'text'
        }
      ]
    });

    setDemoMode(true);
    setLoading(false);
  };

  // Handle Google Sign In
  const handleGoogleLogin = async () => {
    if (!auth) { handleDemoLogin(); return; }
    setAuthLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // User will be set by onAuthStateChanged listener
    } catch (err) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('Sign-in was cancelled');
      } else {
        setError('Google sign-in failed. Try demo mode.');
        setTimeout(() => handleDemoLogin(), 1500);
      }
      setAuthLoading(false);
    }
  };

  // Handle Email/Password Login
  const handleEmailLogin = async () => {
    if (!auth) { handleDemoLogin(); return; }
    if (!loginEmail || !loginPassword) { setError('Please enter your email and password.'); return; }
    setAuthLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
      console.error('Email login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Sign up first.');
      } else {
        setError(err.message || 'Login failed.');
      }
      setAuthLoading(false);
    }
  };

  // Handle Email/Password Sign Up
  const handleEmailSignup = async () => {
    if (!auth) { handleDemoLogin(); return; }
    if (!loginEmail || !loginPassword) { setError('Please enter your email and password.'); return; }
    if (loginPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setAuthLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try logging in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError(err.message || 'Sign up failed.');
      }
      setAuthLoading(false);
    }
  };

  // Keep backward compat alias
  const handleLogin = handleGoogleLogin;

  // Handle Logout
  const handleLogout = async () => {
    try {
      if (auth && !demoMode) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setProfile(null);
      setCurrentPage('dashboard');
      setDemoMode(false);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout');
    }
  };

  // Handle profile edit toggle
  const toggleEditProfile = () => {
    if (isEditingProfile) {
      setEditedProfile(profile);
    }
    setIsEditingProfile(!isEditingProfile);
  };

  // Handle profile field changes
  const handleProfileChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle skills array changes
  const handleSkillAdd = (type, skill) => {
    if (!skill.trim()) return;

    setEditedProfile(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), skill.trim()]
    }));
  };

  const handleSkillRemove = (type, index) => {
    setEditedProfile(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setError(null);

    try {
      const updatedProfile = {
        ...editedProfile,
        updatedAt: new Date().toISOString()
      };

      if (db && !demoMode) {
        await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      }

      setProfile(updatedProfile);
      setIsEditingProfile(false);

      // Reload matches with updated profile
      if (!demoMode) {
        await loadMatches(user.uid, updatedProfile);
      }

    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Create new project
  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const projectData = {
        ...newProject,
        owner: user.uid,
        ownerName: profile.name,
        members: [user.uid],
        applications: [],
        joinRequests: [],
        completed: false,
        completedAt: null,
        documents: projectDocuments, // Include uploaded documents
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (db && !demoMode) {
        const projectRef = doc(collection(db, 'projects'));
        await setDoc(projectRef, projectData);
        projectData.id = projectRef.id;

        const conversationId = `project-${projectData.id}`;
        const conversationRef = doc(db, 'conversations', conversationId);

        await setDoc(conversationRef, {
          id: conversationId,
          projectId: projectData.id,
          projectTitle: projectData.title,
          participants: projectData.members,
          type: 'group',
          lastMessage: 'Project chat created!',
          lastMessageTime: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        projectData.id = `project-${Date.now()}`;
      }

      setProjects([projectData, ...projects]);
      setShowCreateProject(false);
      setNewProject({
        title: '',
        description: '',
        maxMembers: 5,
        requiredSkills: [],
        status: 'open',
        category: 'Web Development',
        visibility: 'public'
      });
      setProjectDocuments([]); // Clear documents

      const projectConvo = {
        id: `project-${projectData.id}`,
        projectId: projectData.id,
        projectTitle: projectData.title,
        participants: projectData.members,
        type: 'group',
        lastMessage: 'Project chat created!',
        lastMessageTime: new Date().toISOString()
      };
      setConversations([projectConvo, ...conversations]);

      setError(null);
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
    }
  };
  // Delete project (owner only)
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Only owner can delete
      if (project.owner !== user.uid) {
        setError('Only the project owner can delete this project.');
        return;
      }

      if (db && !demoMode) {
        // Delete project document from Firestore
        await deleteDoc(doc(db, 'projects', projectId));

        // Delete all messages in the project conversation
        try {
          const messagesQuery = query(
            collection(db, 'conversations', `project-${projectId}`, 'messages')
          );
          const messagesSnapshot = await getDocs(messagesQuery);

          // Delete all messages
          const deletePromises = messagesSnapshot.docs.map(msgDoc =>
            deleteDoc(doc(db, 'conversations', `project-${projectId}`, 'messages', msgDoc.id))
          );
          await Promise.all(deletePromises);

          // Delete the conversation document
          await deleteDoc(doc(db, 'conversations', `project-${projectId}`));
        } catch (convErr) {
          console.log('No conversation to delete or error deleting conversation:', convErr);
        }

        // Remove project ID from all members' project lists (if you store this)
        // This ensures the project is removed from everyone's view
        const memberUpdatePromises = project.members.map(async (memberId) => {
          try {
            const memberDoc = await getDoc(doc(db, 'users', memberId));
            if (memberDoc.exists()) {
              const userData = memberDoc.data();
              const updatedProjects = (userData.projects || []).filter(pid => pid !== projectId);
              await setDoc(doc(db, 'users', memberId), {
                projects: updatedProjects
              }, { merge: true });
            }
          } catch (err) {
            console.log('Error updating member:', err);
          }
        });

        await Promise.all(memberUpdatePromises);
      }

      // Remove project from local state
      setProjects(projects.filter(p => p.id !== projectId));

      // Remove project conversation from local state
      setConversations(conversations.filter(c => c.projectId !== projectId));

      // Clear chat messages for this project
      const projectConvoId = `project-${projectId}`;
      if (chatMessages[projectConvoId]) {
        const updatedMessages = { ...chatMessages };
        delete updatedMessages[projectConvoId];
        setChatMessages(updatedMessages);
      }

      // Close modal if open
      setSelectedProject(null);

      // If currently viewing the deleted project's chat, clear it
      if (activeChat?.projectId === projectId) {
        setActiveChat(null);
      }

      setError(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    }
  };

  // Leave project (member only, not owner)
  const handleLeaveProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to leave this project?')) {
      return;
    }

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Owner cannot leave their own project
      if (project.owner === user.uid) {
        setError('Project owners cannot leave. Please delete the project instead.');
        return;
      }

      const updatedMembers = project.members.filter(memberId => memberId !== user.uid);

      if (db && !demoMode) {
        // Update project members in Firestore
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, {
          members: updatedMembers,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Update conversation participants
        try {
          const conversationRef = doc(db, 'conversations', `project-${projectId}`);
          const conversationDoc = await getDoc(conversationRef);

          if (conversationDoc.exists()) {
            const updatedParticipants = (conversationDoc.data().participants || [])
              .filter(pid => pid !== user.uid);

            await setDoc(conversationRef, {
              participants: updatedParticipants,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (convErr) {
          console.log('Error updating conversation:', convErr);
        }

        // Remove project from user's projects list (if you store this)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const updatedProjects = (userData.projects || []).filter(pid => pid !== projectId);
            await setDoc(doc(db, 'users', user.uid), {
              projects: updatedProjects,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (userErr) {
          console.log('Error updating user projects:', userErr);
        }

        // Send notification to project owner (optional)
        try {
          const notificationRef = doc(collection(db, 'notifications'));
          await setDoc(notificationRef, {
            type: 'project_member_left',
            projectId: projectId,
            projectTitle: project.title,
            userId: project.owner,
            memberName: profile.name,
            memberId: user.uid,
            createdAt: new Date().toISOString(),
            read: false
          });
        } catch (notifErr) {
          console.log('Error creating notification:', notifErr);
        }
      }

      // Update local state - remove user from project members
      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, members: updatedMembers }
          : p
      ));

      // Remove from project conversation locally
      const projectConvo = conversations.find(c => c.projectId === projectId);
      if (projectConvo) {
        setConversations(conversations.filter(c => c.projectId !== projectId));
      }

      // Clear chat messages for this project locally
      const projectConvoId = `project-${projectId}`;
      if (chatMessages[projectConvoId]) {
        const updatedMessages = { ...chatMessages };
        delete updatedMessages[projectConvoId];
        setChatMessages(updatedMessages);
      }

      // If currently viewing this project's chat, clear it
      if (activeChat?.projectId === projectId) {
        setActiveChat(null);
      }

      // Close modal if open
      setSelectedProject(null);

      setError(null);
    } catch (err) {
      console.error('Error leaving project:', err);
      setError('Failed to leave project. Please try again.');
    }
  };
  // Call Gemini AI API
  const callGeminiAPI = async (prompt) => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const isGeminiConfigured = geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY" && !geminiKey.startsWith("YOUR_");

    if (!isGeminiConfigured) {
      return `[Demo Mode - Gemini AI not configured] I received your prompt: "${prompt}". Please configure VITE_GEMINI_API_KEY in your .env file to enable live AI responses.`;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are Gemini AI assistant helping a project team. Answer this question concisely and helpfully: ${prompt}`
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();

      // Extract text from Google Gemini API response structure
      if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      console.error('Unexpected Gemini API response:', data);
      return 'Sorry, I received an unexpected response format from Gemini.';
    } catch (err) {
      console.error('Error calling Gemini API:', err);
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  };
  // Complete project (owner only)
  const handleCompleteProject = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Only owner can complete
      if (project.owner !== user.uid) {
        setError('Only the project owner can mark this project as completed.');
        return;
      }

      // Open rating modal for all team members
      const membersToRate = project.members.filter(memberId => memberId !== user.uid);

      setRatingData({
        projectId: project.id,
        projectTitle: project.title,
        membersToRate: membersToRate,
        ratings: {}
      });

      setShowRatingModal(true);
      setSelectedProject(null);

    } catch (err) {
      console.error('Error completing project:', err);
      setError('Failed to complete project. Please try again.');
    }
  };

  // Submit ratings and complete project
  const handleSubmitRatings = async () => {
    try {
      const project = projects.find(p => p.id === ratingData.projectId);
      if (!project) return;

      // Validate that all members have been rated
      const allRated = ratingData.membersToRate.every(memberId =>
        ratingData.ratings[memberId] && ratingData.ratings[memberId].stars > 0
      );

      if (!allRated) {
        setError('Please rate all team members before completing the project.');
        return;
      }

      const completionData = {
        completed: true,
        completedAt: new Date().toISOString(),
        status: 'completed',
        updatedAt: new Date().toISOString()
      };

      if (db && !demoMode) {
        // Update project status
        const projectRef = doc(db, 'projects', ratingData.projectId);
        await setDoc(projectRef, completionData, { merge: true });

        // Submit ratings and update member profiles
        const ratingPromises = Object.entries(ratingData.ratings).map(async ([memberId, rating]) => {
          try {
            // Save rating document
            await addDoc(collection(db, 'ratings'), {
              projectId: ratingData.projectId,
              projectTitle: ratingData.projectTitle,
              raterId: user.uid,
              raterName: profile.name,
              ratedUserId: memberId,
              stars: rating.stars,
              comment: rating.comment || '',
              category: 'project_completion',
              createdAt: new Date().toISOString()
            });

            // Update rated user's profile
            const memberRef = doc(db, 'users', memberId);
            const memberDoc = await getDoc(memberRef);

            if (memberDoc.exists()) {
              const userData = memberDoc.data();
              const currentRating = userData.rating || 0;
              const currentCount = userData.ratingCount || 0;

              // Calculate new average rating
              const newRatingCount = currentCount + 1;
              const newRating = ((currentRating * currentCount) + rating.stars) / newRatingCount;

              // Update completed projects list
              const completedProjects = userData.completedProjects || [];
              if (!completedProjects.includes(ratingData.projectId)) {
                completedProjects.push(ratingData.projectId);
              }

              await setDoc(memberRef, {
                rating: newRating,
                ratingCount: newRatingCount,
                completedProjects: completedProjects,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch (err) {
            console.error('Error submitting rating for member:', err);
            throw err; // Re-throw to catch in main try-catch
          }
        });

        await Promise.all(ratingPromises);

        // Update project owner's completed projects
        const ownerRef = doc(db, 'users', user.uid);
        const ownerDoc = await getDoc(ownerRef);

        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          const completedProjects = ownerData.completedProjects || [];

          if (!completedProjects.includes(ratingData.projectId)) {
            await setDoc(ownerRef, {
              completedProjects: [...completedProjects, ratingData.projectId],
              updatedAt: new Date().toISOString()
            }, { merge: true });

            // Reload the profile to get updated data
            await loadUserProfile(user.uid);
          }
        }

        // Send notifications
        const notificationPromises = ratingData.membersToRate.map(async (memberId) => {
          try {
            await addDoc(collection(db, 'notifications'), {
              type: 'project_completed_with_rating',
              projectId: ratingData.projectId,
              projectTitle: ratingData.projectTitle,
              userId: memberId,
              rating: ratingData.ratings[memberId].stars,
              completedBy: profile.name,
              createdAt: new Date().toISOString(),
              read: false
            });
          } catch (err) {
            console.log('Error creating notification:', err);
          }
        });

        await Promise.all(notificationPromises);
      }

      // Update local state
      setProjects(projects.map(p =>
        p.id === ratingData.projectId
          ? { ...p, ...completionData }
          : p
      ));

      setShowRatingModal(false);
      setRatingData({ projectId: null, projectTitle: '', membersToRate: [], ratings: {} });

      alert('🎉 Project completed successfully! Ratings have been submitted.');
      setError(null);
    } catch (err) {
      console.error('Error submitting ratings:', err);
      setError('Failed to submit ratings: ' + err.message);
    }
  };

  // Load user ratings
  const handleViewUserRatings = async (userId) => {
    try {
      if (db && !demoMode) {
        const ratingsQuery = query(
          collection(db, 'ratings'),
          where('ratedUserId', '==', userId)
        );

        const querySnapshot = await getDocs(ratingsQuery);
        const ratingsList = [];

        querySnapshot.forEach((doc) => {
          ratingsList.push({ id: doc.id, ...doc.data() });
        });

        // Sort by date (newest first)
        ratingsList.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setSelectedUserRatings({ userId, ratings: ratingsList });
        setViewRatingsModal(true);
      } else {
        // Demo mode - show sample ratings
        const demoRatings = [
          {
            id: '1',
            projectTitle: 'Campus Event App',
            raterName: 'John Doe',
            stars: 5,
            comment: 'Excellent team player! Great communication and technical skills.',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: '2',
            projectTitle: 'Study Group Finder',
            raterName: 'Jane Smith',
            stars: 4,
            comment: 'Very reliable and delivered quality work on time.',
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ];

        setSelectedUserRatings({ userId, ratings: demoRatings });
        setViewRatingsModal(true);
      }
    } catch (err) {
      console.error('Error loading ratings:', err);
      setError('Failed to load ratings.');
    }
  };

  // Reopen completed project (owner only)
  const handleReopenProject = async (projectId) => {
    if (!window.confirm('Reopen this project? It will be marked as active again.')) {
      return;
    }

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Only owner can reopen
      if (project.owner !== user.uid) {
        setError('Only the project owner can reopen this project.');
        return;
      }

      const reopenData = {
        completed: false,
        completedAt: null,
        status: 'open',
        updatedAt: new Date().toISOString()
      };

      if (db && !demoMode) {
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, reopenData, { merge: true });
      }

      // Update local state
      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, ...reopenData }
          : p
      ));

      setSelectedProject(null);
      alert('Project reopened successfully!');
      setError(null);
    } catch (err) {
      console.error('Error reopening project:', err);
      setError('Failed to reopen project. Please try again.');
    }
  };

  // Apply to join project (for public projects)
  const handleApplyToProject = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      if (project.visibility === 'public') {
        // For public projects, create a join request
        const request = {
          userId: user.uid,
          userName: profile.name,
          userSkills: profile.skillsOffered,
          message: 'I would like to join this project!',
          requestedAt: new Date().toISOString(),
          status: 'pending'
        };

        if (db && !demoMode) {
          const projectRef = doc(db, 'projects', projectId);
          const updatedRequests = [...(project.joinRequests || []), request];
          await setDoc(projectRef, { joinRequests: updatedRequests }, { merge: true });
        }

        // Update local state
        setProjects(projects.map(p =>
          p.id === projectId
            ? { ...p, joinRequests: [...(p.joinRequests || []), request] }
            : p
        ));
      } else {
        // For private projects, send application
        const application = {
          userId: user.uid,
          userName: profile.name,
          userSkills: profile.skillsOffered,
          message: 'I would like to join this project!',
          appliedAt: new Date().toISOString(),
          status: 'pending'
        };

        if (db && !demoMode) {
          const projectRef = doc(db, 'projects', projectId);
          const updatedApplications = [...(project.applications || []), application];
          await setDoc(projectRef, { applications: updatedApplications }, { merge: true });
        }

        setProjects(projects.map(p =>
          p.id === projectId
            ? { ...p, applications: [...(p.applications || []), application] }
            : p
        ));
      }

      setError(null);
    } catch (err) {
      console.error('Error applying to project:', err);
      setError('Failed to apply. Please try again.');
    }
  };

  // Accept join request (for public projects)
  const handleAcceptJoinRequest = async (projectId, userId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedMembers = [...project.members, userId];
      const updatedRequests = project.joinRequests.map(req =>
        req.userId === userId ? { ...req, status: 'accepted' } : req
      );

      if (db && !demoMode) {
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, {
          members: updatedMembers,
          joinRequests: updatedRequests
        }, { merge: true });
      }

      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, members: updatedMembers, joinRequests: updatedRequests }
          : p
      ));

      // Add user to project group chat
      const projectConvo = conversations.find(c => c.projectId === projectId);
      if (projectConvo) {
        setConversations(conversations.map(c =>
          c.projectId === projectId
            ? { ...c, participants: [...c.participants, userId] }
            : c
        ));
      }

      setError(null);
    } catch (err) {
      console.error('Error accepting join request:', err);
      setError('Failed to accept request.');
    }
  };

  // Accept application
  const handleAcceptApplication = async (projectId, userId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedMembers = [...project.members, userId];
      const updatedApplications = project.applications.map(app =>
        app.userId === userId ? { ...app, status: 'accepted' } : app
      );

      if (db && !demoMode) {
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, {
          members: updatedMembers,
          applications: updatedApplications
        }, { merge: true });
      }

      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, members: updatedMembers, applications: updatedApplications }
          : p
      ));

      setError(null);
    } catch (err) {
      console.error('Error accepting application:', err);
      setError('Failed to accept application.');
    }
  };

  // Reject application
  const handleRejectApplication = async (projectId, userId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedApplications = project.applications.map(app =>
        app.userId === userId ? { ...app, status: 'rejected' } : app
      );

      if (db && !demoMode) {
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, { applications: updatedApplications }, { merge: true });
      }

      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, applications: updatedApplications }
          : p
      ));

      setError(null);
    } catch (err) {
      console.error('Error rejecting application:', err);
      setError('Failed to reject application.');
    }
  };

  // Add skill to new project
  const handleAddProjectSkill = (skill) => {
    if (skill.trim() && !newProject.requiredSkills.includes(skill.trim())) {
      setNewProject({
        ...newProject,
        requiredSkills: [...newProject.requiredSkills, skill.trim()]
      });
    }
  };

  // Remove skill from new project
  const handleRemoveProjectSkill = (index) => {
    setNewProject({
      ...newProject,
      requiredSkills: newProject.requiredSkills.filter((_, i) => i !== index)
    });
  };

  // Load all projects for browsing
  const loadAllProjects = async () => {
    try {
      if (db && !demoMode) {
        const projectsQuery = query(
          collection(db, 'projects'),
          limit(50)
        );

        const querySnapshot = await getDocs(projectsQuery);
        const projectsList = [];

        querySnapshot.forEach((doc) => {
          projectsList.push({ id: doc.id, ...doc.data() });
        });

        projectsList.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        setProjects(projectsList);
      }
    } catch (err) {
      console.error('Error loading all projects:', err);
    }
  };

  // Filter projects
  const getFilteredProjects = () => {
    switch (projectFilter) {
      case 'my':
        return projects.filter(p => p.members?.includes(user.uid));
      case 'open':
        return projects.filter(p => p.status === 'open' && !p.completed && !p.members?.includes(user.uid));
      case 'available':
        return projects.filter(p =>
          p.status === 'open' &&
          !p.completed &&
          !p.members?.includes(user.uid) &&
          (p.members?.length || 0) < (p.maxMembers || 5)
        );
      case 'completed':
        return projects.filter(p => p.completed || p.status === 'completed');
      default:
        return projects;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CampusConnect...</p>
        </div>
      </div>
    );
  }

  // Login Page
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0B0E14 0%, #131929 50%, #0B0E14 100%)' }}>
        <div className="max-w-md w-full rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#151A23', border: '1px solid #232D3F' }}>

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">CampusConnect</h1>
            <p className="text-blue-100 text-sm">Skill Exchange & Project Collaboration</p>
          </div>

          <div className="p-8">
            {/* Mode Tabs */}
            <div className="flex rounded-lg overflow-hidden border mb-6" style={{ borderColor: '#232D3F' }}>
              <button
                onClick={() => { setAuthMode('login'); setError(null); }}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={authMode === 'login' ? { background: '#4F46E5', color: '#fff' } : { background: 'transparent', color: '#94a3b8' }}
              >Log In</button>
              <button
                onClick={() => { setAuthMode('signup'); setError(null); }}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={authMode === 'signup' ? { background: '#4F46E5', color: '#fff' } : { background: 'transparent', color: '#94a3b8' }}
              >Sign Up</button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            {!auth && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#fde68a' }}>
                <strong>Demo Mode:</strong> Firebase not configured.
              </div>
            )}

            {/* Email Field */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Email address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleEmailLogin() : handleEmailSignup())}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ background: '#0F131A', border: '1px solid #232D3F', color: '#f1f5f9' }}
              />
            </div>

            {/* Password Field */}
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleEmailLogin() : handleEmailSignup())}
                placeholder={authMode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ background: '#0F131A', border: '1px solid #232D3F', color: '#f1f5f9' }}
              />
            </div>

            {/* Primary CTA */}
            <button
              onClick={authMode === 'login' ? handleEmailLogin : handleEmailSignup}
              disabled={authLoading}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
              style={{ background: 'linear-gradient(to right, #4F46E5, #3B82F6)' }}
            >
              {authLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Please wait...</>
              ) : authMode === 'login' ? 'Log In' : 'Create Account'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: '#232D3F' }}></div>
              <span className="text-xs" style={{ color: '#475569' }}>or</span>
              <div className="flex-1 h-px" style={{ background: '#232D3F' }}></div>
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              style={{ background: '#0F131A', border: '1px solid #232D3F', color: '#e2e8f0' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {!auth && (
              <button
                onClick={handleDemoLogin}
                className="w-full mt-3 py-2 rounded-lg text-xs transition-all"
                style={{ background: 'transparent', border: '1px solid #232D3F', color: '#64748b' }}
              >Try Demo Mode</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Application
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && <h2 className="text-xl font-bold text-gray-900">CampusConnect</h2>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', icon: Users, label: 'Dashboard' },
            { id: 'profile', icon: Camera, label: 'My Profile' },
            { id: 'projects', icon: Briefcase, label: 'Projects' },
            { id: 'matches', icon: Star, label: 'Skill Matches' },
            { id: 'learning', icon: Award, label: 'Learn Skills' },
            { id: 'requests', icon: Clock, label: 'Requests' },
            { id: 'chat', icon: MessageCircle, label: 'Messages' },
            { id: 'portfolio', icon: Award, label: 'Portfolio' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentPage === item.id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
              </h1>
              {demoMode && (
                <p className="text-xs text-yellow-600 mt-1">Demo Mode - Configure Firebase for full functionality</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('profile')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="View my profile"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-sm text-left">
                  <p className="font-medium text-gray-900">{profile?.name || user.displayName}</p>
                  <p className="text-gray-500">{profile?.department || 'Student'}</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dashboard */}
          {currentPage === 'dashboard' && profile && (
            <div className="space-y-6">
              {/* Unique ID Display */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-100 mb-1">Your Unique ID</h3>
                    <div className="text-3xl font-bold tracking-wider">{profile.uniqueId}</div>
                    <p className="text-sm text-blue-100 mt-2">Share this ID with others to connect</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <Users className="w-12 h-12" />
                  </div>
                </div>
              </div>

              {/* Search User by ID */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Find Users by ID</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                    placeholder="Enter user ID (e.g., CC-DEMO001)"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearchUser}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Search
                  </button>
                </div>

                {searchedUser && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{searchedUser.name}</h4>
                        <p className="text-sm text-gray-600">{searchedUser.department} • {searchedUser.year}</p>
                        <p className="text-xs text-gray-500 mt-1">ID: {searchedUser.uniqueId}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedUserProfile(searchedUser)}
                          className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Profile
                        </button>
                        {!profile.connections?.includes(searchedUser.id) && (
                          <button
                            onClick={() => handleSendConnectionRequest(searchedUser.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard icon={Briefcase} label="Active Projects" value={projects.length} color="blue" />
                <StatCard icon={Award} label="Completed" value={profile.completedProjects?.length || 0} color="green" />
                <StatCard icon={Star} label="Rating" value={profile.rating?.toFixed(1) || '0.0'} color="yellow" />
                <StatCard icon={Users} label="Collaborators" value={matches.length} color="purple" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>
                  {projects.length > 0 ? (
                    <div className="space-y-3">
                      {projects.slice(0, 3).map(project => (
                        <div key={project.id} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{project.title}</h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${project.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                  {project.status}
                                </span>
                                <span className="text-xs text-gray-500">{project.members?.length || 0} members</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No projects yet. Create your first project!</p>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Skill Matches</h3>
                  {matches.length > 0 ? (
                    <div className="space-y-3">
                      {matches.slice(0, 3).map(match => (
                        <div key={match.id} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{match.name}</h4>
                              <p className="text-sm text-gray-600">{match.department} • {match.year}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm text-gray-600">{match.rating?.toFixed(1) || '0.0'}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">{match.matchScore}%</div>
                              <div className="text-xs text-gray-500">Match</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Complete your profile to see matches!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile */}
          {currentPage === 'profile' && profile && editedProfile && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-6 mb-6">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={profile.name} className="w-24 h-24 rounded-full" />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      {profile.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editedProfile.name}
                        onChange={(e) => handleProfileChange('name', e.target.value)}
                        className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none w-full mb-2"
                        placeholder="Your Name"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                    )}
                    <p className="text-gray-600">{profile.email}</p>

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {isEditingProfile ? (
                        <>
                          <select
                            value={editedProfile.department}
                            onChange={(e) => handleProfileChange('department', e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="">Select Department</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Design">Design</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Business">Business</option>
                            <option value="Mathematics">Mathematics</option>
                          </select>
                          <select
                            value={editedProfile.year}
                            onChange={(e) => handleProfileChange('year', e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="">Select Year</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-gray-600">{profile.department || 'No department'}</span>
                          {profile.department && <span className="text-sm text-gray-600">•</span>}
                          <span className="text-sm text-gray-600">{profile.year || 'No year'}</span>
                        </>
                      )}
                      <span className="text-sm text-gray-600">•</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">{profile.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-sm text-gray-500">({profile.ratingCount || 0} reviews)</span>
                        </div>
                        <button
                          onClick={() => handleViewUserRatings(user.uid)}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          View All Ratings
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditingProfile ? (
                      <>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saveLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {saveLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={toggleEditProfile}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={toggleEditProfile}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SkillsSection
                  title="Skills I Offer"
                  skills={isEditingProfile ? editedProfile.skillsOffered : profile.skillsOffered}
                  color="blue"
                  isEditing={isEditingProfile}
                  onAdd={(skill) => handleSkillAdd('skillsOffered', skill)}
                  onRemove={(index) => handleSkillRemove('skillsOffered', index)}
                />

                <SkillsSection
                  title="Skills I Want to Learn"
                  skills={isEditingProfile ? editedProfile.skillsWanted : profile.skillsWanted}
                  color="purple"
                  isEditing={isEditingProfile}
                  onAdd={(skill) => handleSkillAdd('skillsWanted', skill)}
                  onRemove={(index) => handleSkillRemove('skillsWanted', index)}
                />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">About Me</h3>
                {isEditingProfile ? (
                  <textarea
                    value={editedProfile.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Tell us about yourself, your interests, and what you're looking for..."
                  />
                ) : (
                  <p className="text-gray-700">{profile.bio || 'No bio added yet.'}</p>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Availability:</strong>
                  </p>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={editedProfile.availability}
                      onChange={(e) => handleProfileChange('availability', e.target.value)}
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Weekdays after 4 PM"
                    />
                  ) : (
                    <p className="text-gray-700">{profile.availability || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Projects Page */}
          {currentPage === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Projects</option>
                    <option value="my">My Projects</option>
                    <option value="open">Open Projects</option>
                    <option value="available">Available to Join</option>
                    <option value="completed">Completed Projects</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Project
                </button>
              </div>

              {/* Create Project Modal */}
              {showCreateProject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
                      <button
                        onClick={() => {
                          setShowCreateProject(false);
                          setNewProject({
                            title: '',
                            description: '',
                            maxMembers: 5,
                            requiredSkills: [],
                            status: 'open',
                            category: 'Web Development'
                          });
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Project Title *
                        </label>
                        <input
                          type="text"
                          value={newProject.title}
                          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter project title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description *
                        </label>
                        <textarea
                          value={newProject.description}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          placeholder="Describe your project goals, timeline, and what you're looking for..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                          </label>
                          <select
                            value={newProject.category}
                            onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option>Web Development</option>
                            <option>Mobile Development</option>
                            <option>Data Science</option>
                            <option>Machine Learning</option>
                            <option>UI/UX Design</option>
                            <option>Game Development</option>
                            <option>Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Team Size
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="20"
                            value={newProject.maxMembers}
                            onChange={(e) => setNewProject({ ...newProject, maxMembers: parseInt(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Visibility
                          </label>
                          <select
                            value={newProject.visibility}
                            onChange={(e) => setNewProject({ ...newProject, visibility: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="public">Public - Anyone can request to join</option>
                            <option value="private">Private - Invitation only</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Required Skills
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {newProject.requiredSkills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                              {skill}
                              <button onClick={() => handleRemoveProjectSkill(i)} className="hover:text-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddProjectSkill(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type skill and press Enter"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleCreateProject}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Create Project
                        </button>
                        <button
                          onClick={() => setShowCreateProject(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Project Detail Modal */}
              {selectedProject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-2xl font-bold text-gray-900">{selectedProject.title}</h2>
                          {(selectedProject.completed || selectedProject.status === 'completed') && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs ${selectedProject.completed || selectedProject.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : selectedProject.status === 'open'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                            }`}>
                            {selectedProject.completed || selectedProject.status === 'completed' ? 'completed' : selectedProject.status}
                          </span>
                          <span>{selectedProject.category}</span>
                          <span>•</span>
                          <span>{selectedProject.members?.length || 0}/{selectedProject.maxMembers} members</span>
                        </div>
                        {(selectedProject.completed || selectedProject.status === 'completed') && selectedProject.completedAt && (
                          <p className="text-sm text-green-600 mt-2">
                            ✓ Completed on {new Date(selectedProject.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                        <p className="text-gray-700">{selectedProject.description}</p>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Visibility</h3>
                        <span className={`px-3 py-1 rounded-full text-sm ${selectedProject.visibility === 'public'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                          }`}>
                          {selectedProject.visibility === 'public' ? 'Public - Open to join requests' : 'Private - Invitation only'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedProject.requiredSkills?.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Project Documents Section */}
                      {selectedProject.documents && selectedProject.documents.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Project Documents ({selectedProject.documents.length})
                          </h3>
                          <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                            {selectedProject.documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {doc.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(doc.size / 1024).toFixed(1)} KB • Uploaded by {doc.uploaderName}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleViewDocument(doc)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Download
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            💡 Review these documents to understand the project requirements
                          </p>
                        </div>
                      )}

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Project Owner</h3>
                        <p className="text-gray-700">{selectedProject.ownerName}</p>
                      </div>

                      {/* Join Requests section (only for project owner in public projects) */}
                      {selectedProject.owner === user.uid &&
                        selectedProject.visibility === 'public' &&
                        selectedProject.joinRequests?.length > 0 &&
                        !(selectedProject.completed || selectedProject.status === 'completed') && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Join Requests</h3>
                            <div className="space-y-3">
                              {selectedProject.joinRequests.map((req, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">{req.userName}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{req.message}</p>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {req.userSkills?.slice(0, 3).map((skill, j) => (
                                          <span key={j} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-2">
                                        Requested {new Date(req.requestedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    {req.status === 'pending' && (
                                      <div className="flex gap-2 ml-4">
                                        <button
                                          onClick={() => handleAcceptJoinRequest(selectedProject.id, req.userId)}
                                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={() => handleRejectApplication(selectedProject.id, req.userId)}
                                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                    {req.status === 'accepted' && (
                                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                                        Accepted
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Applications section (only for project owner) */}
                      {selectedProject.owner === user.uid &&
                        selectedProject.applications?.length > 0 &&
                        !(selectedProject.completed || selectedProject.status === 'completed') && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Applications</h3>
                            <div className="space-y-3">
                              {selectedProject.applications.map((app, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">{app.userName}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{app.message}</p>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {app.userSkills?.slice(0, 3).map((skill, j) => (
                                          <span key={j} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-2">
                                        Applied {new Date(app.appliedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    {app.status === 'pending' && (
                                      <div className="flex gap-2 ml-4">
                                        <button
                                          onClick={() => handleAcceptApplication(selectedProject.id, app.userId)}
                                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={() => handleRejectApplication(selectedProject.id, app.userId)}
                                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                    {app.status === 'accepted' && (
                                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                                        Accepted
                                      </span>
                                    )}
                                    {app.status === 'rejected' && (
                                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Action buttons */}
                      <div className="pt-4 border-t border-gray-200 space-y-3">
                        {/* Complete/Reopen button for owner */}
                        {selectedProject.owner === user.uid && selectedProject.members?.includes(user.uid) && (
                          <div>
                            {!selectedProject.completed && selectedProject.status !== 'completed' ? (
                              <button
                                onClick={() => {
                                  handleCompleteProject(selectedProject.id);
                                }}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-5 h-5" />
                                Mark Project as Completed
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleReopenProject(selectedProject.id);
                                }}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reopen Project
                              </button>
                            )}
                          </div>
                        )}

                        {/* Request to Join button */}
                        {!selectedProject.members?.includes(user.uid) &&
                          selectedProject.status === 'open' &&
                          !selectedProject.completed &&
                          selectedProject.visibility === 'public' &&
                          !selectedProject.joinRequests?.some(req => req.userId === user.uid) && (
                            <button
                              onClick={() => {
                                handleApplyToProject(selectedProject.id);
                                setSelectedProject(null);
                              }}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Request to Join
                            </button>
                          )}

                        {/* Pending request message */}
                        {selectedProject.joinRequests?.some(req => req.userId === user.uid && req.status === 'pending') && (
                          <div className="text-center py-2 text-gray-600 bg-yellow-50 rounded-lg">
                            Join request pending review
                          </div>
                        )}

                        {/* Private project message */}
                        {!selectedProject.members?.includes(user.uid) &&
                          selectedProject.visibility === 'private' &&
                          !selectedProject.completed && (
                            <div className="text-center py-2 text-gray-600 bg-gray-50 rounded-lg">
                              This is a private project. Contact the owner for an invitation.
                            </div>
                          )}

                        {/* Pending application message */}
                        {selectedProject.applications?.some(app => app.userId === user.uid && app.status === 'pending') && (
                          <div className="text-center py-2 text-gray-600 bg-yellow-50 rounded-lg">
                            Application pending review
                          </div>
                        )}

                        {/* Member actions */}
                        {selectedProject.members?.includes(user.uid) && !selectedProject.completed && (
                          <div className="text-center">
                            <div className="py-2 text-green-600 font-medium mb-3 bg-green-50 rounded-lg">
                              You are a member of this project
                            </div>
                            <button
                              onClick={async () => {
                                const projectConvoId = `project-${selectedProject.id}`;

                                // Check if conversation exists
                                let convo = conversations.find(c => c.id === projectConvoId);

                                if (!convo) {
                                  // Create conversation if it doesn't exist
                                  if (db && !demoMode) {
                                    try {
                                      const conversationRef = doc(db, 'conversations', projectConvoId);
                                      const convoDoc = await getDoc(conversationRef);

                                      if (!convoDoc.exists()) {
                                        // Create the conversation
                                        await setDoc(conversationRef, {
                                          id: projectConvoId,
                                          projectId: selectedProject.id,
                                          projectTitle: selectedProject.title,
                                          participants: selectedProject.members,
                                          type: 'group',
                                          lastMessage: 'Project chat created!',
                                          lastMessageTime: new Date().toISOString(),
                                          createdAt: new Date().toISOString(),
                                          updatedAt: new Date().toISOString()
                                        });

                                        console.log('Created project conversation');
                                      }

                                      // Reload conversations
                                      await loadConversations();

                                      // Get the conversation again
                                      convo = conversations.find(c => c.id === projectConvoId) || {
                                        id: projectConvoId,
                                        projectId: selectedProject.id,
                                        projectTitle: selectedProject.title,
                                        participants: selectedProject.members,
                                        type: 'group'
                                      };
                                    } catch (err) {
                                      console.error('Error creating conversation:', err);
                                      setError('Failed to create chat: ' + err.message);
                                      return;
                                    }
                                  } else {
                                    // Demo mode
                                    convo = {
                                      id: projectConvoId,
                                      projectId: selectedProject.id,
                                      projectTitle: selectedProject.title,
                                      participants: selectedProject.members,
                                      type: 'group'
                                    };
                                    setConversations([convo, ...conversations]);
                                  }
                                }

                                // Set active chat and switch to chat page
                                setActiveChat(convo);
                                setCurrentPage('chat');
                                setSelectedProject(null);
                              }}
                              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-5 h-5" />
                              Go to Project Chat
                            </button>
                          </div>
                        )}

                        {/* Completed project member message */}
                        {selectedProject.members?.includes(user.uid) && selectedProject.completed && (
                          <div className="text-center py-3 text-gray-600 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="font-medium">This project has been completed!</p>
                            <p className="text-sm mt-1">Check your portfolio to see it in your completed projects.</p>
                          </div>
                        )}
                      </div>

                      {/* Delete/Leave Project Button */}
                      {selectedProject.members?.includes(user.uid) && !selectedProject.completed && (
                        <div className="pt-4 border-t border-gray-200 mt-4">
                          {selectedProject.owner === user.uid ? (
                            <button
                              onClick={() => handleDeleteProject(selectedProject.id)}
                              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Project
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLeaveProject(selectedProject.id)}
                              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Leave Project
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Projects Grid */}
              {getFilteredProjects().length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {getFilteredProjects().map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onViewDetails={() => setSelectedProject(project)}
                      onDeleteProject={handleDeleteProject}
                      onLeaveProject={handleLeaveProject}
                      currentUserId={user.uid}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
                  <p className="text-gray-600 mb-4">
                    {projectFilter === 'my'
                      ? "You haven't joined any projects yet"
                      : "No projects match your filter"}
                  </p>
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Skill Matches */}
          {currentPage === 'matches' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">How Matching Works</h3>
                <p className="text-sm text-blue-800">
                  We match you with students based on complementary skills, shared interests, and availability.
                  The match score indicates how well your skills align with theirs.
                </p>
              </div>

              {matches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onConnect={(m) => handleSendConnectionRequest(m.id)}
                      onViewProfile={(m) => setSelectedUserProfile(m)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
                  <p className="text-gray-600 mb-4">Complete your profile with skills to find perfect matches</p>
                  <button
                    onClick={() => setCurrentPage('profile')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Profile
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Create Live Session Modal */}
          {showCreateSessionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Create Live Session</h2>
                  <button
                    onClick={() => {
                      setShowCreateSessionModal(false);
                      setNewSession({
                        title: '',
                        description: '',
                        meetLink: '',
                        scheduledTime: '',
                        duration: '60',
                        skill: '',
                        maxParticipants: 10
                      });
                      setError(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Title *
                    </label>
                    <input
                      type="text"
                      value={newSession.title}
                      onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., React Hooks Deep Dive"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newSession.description}
                      onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Describe what participants will learn..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Meet Link *
                    </label>
                    <input
                      type="url"
                      value={newSession.meetLink}
                      onChange={(e) => setNewSession({ ...newSession, meetLink: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Create a Google Meet link and paste it here
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={newSession.scheduledTime}
                        onChange={(e) => setNewSession({ ...newSession, scheduledTime: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (minutes)
                      </label>
                      <select
                        value={newSession.duration}
                        onChange={(e) => setNewSession({ ...newSession, duration: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Skill/Topic
                      </label>
                      <input
                        type="text"
                        value={newSession.skill}
                        onChange={(e) => setNewSession({ ...newSession, skill: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., React, Python, Design"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Participants
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={newSession.maxParticipants}
                        onChange={(e) => setNewSession({ ...newSession, maxParticipants: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleCreateLiveSession}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create Session
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateSessionModal(false);
                        setError(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Learning Resources */}
          {currentPage === 'learning' && profile && (
            <div className="space-y-6">
              {/* Header with Tabs */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
                <h2 className="text-3xl font-bold mb-2">Skill Builder</h2>
                <p className="text-purple-100 mb-4">Search and learn any skill with free resources</p>

                {/* Tabs */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentPage('learning')}
                    className="px-6 py-3 bg-white text-purple-600 rounded-lg transition-colors font-medium"
                  >
                    📚 Learning Resources
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('learning-sessions');
                      loadLiveSessions();
                    }}
                    className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors font-medium"
                  >
                    🎥 Live Sessions
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mt-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
                    <input
                      type="text"
                      value={resourceSearchQuery}
                      onChange={(e) => setResourceSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && resourceSearchQuery.trim()) {
                          // Load resources for the searched skill
                          loadLearningResourcesEnhanced([resourceSearchQuery.trim()]);
                        }
                      }}
                      placeholder="Search for any skill (e.g., Python, React, UI/UX Design)..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    {resourceSearchQuery && (
                      <button
                        onClick={() => setResourceSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {resourceSearchQuery && (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-sm text-purple-100">
                        Showing results for: "{resourceSearchQuery}"
                      </p>
                      <button
                        onClick={() => {
                          if (resourceSearchQuery.trim()) {
                            loadLearningResourcesEnhanced([resourceSearchQuery.trim()]);
                          }
                        }}
                        className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-colors"
                      >
                        Search
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Show searched skill OR profile skills */}
              {resourceSearchQuery.trim() ? (
                // SEARCH MODE - Show resources for searched skill
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-900 mb-1">
                          Searching for: {resourceSearchQuery}
                        </h3>
                        <p className="text-sm text-blue-800">
                          {isLoadingResources
                            ? 'Loading resources...'
                            : learningResources[resourceSearchQuery]?.length
                              ? `Found ${learningResources[resourceSearchQuery].length} resources`
                              : 'Press Enter or click Search to find resources'}
                        </p>
                      </div>
                      <button
                        onClick={() => setResourceSearchQuery('')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>

                  {isLoadingResources ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading resources for {resourceSearchQuery}...</p>
                    </div>
                  ) : learningResources[resourceSearchQuery] ? (
                    // Show resources for searched skill
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {resourceSearchQuery}
                        </h3>

                        {learningProgress[resourceSearchQuery] && (
                          <div className="flex items-center gap-4">
                            <div className="flex-1 max-w-md">
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress</span>
                                <span className="font-medium">
                                  {Math.round(
                                    (learningProgress[resourceSearchQuery].completedResources /
                                      learningResources[resourceSearchQuery].length) * 100
                                  )}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${Math.round(
                                      (learningProgress[resourceSearchQuery].completedResources /
                                        learningResources[resourceSearchQuery].length) * 100
                                    )}%`
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {learningProgress[resourceSearchQuery].completedResources}/
                              {learningResources[resourceSearchQuery].length} completed
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {learningResources[resourceSearchQuery].map((resource, resIndex) => {
                          const progress = learningProgress[resourceSearchQuery] || {
                            completedResources: 0,
                            totalResources: learningResources[resourceSearchQuery].length
                          };
                          const isCompleted = resIndex < progress.completedResources;

                          return (
                            <div
                              key={resIndex}
                              className={`border rounded-lg p-4 ${isCompleted
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                }`}
                            >
                              <div className="flex gap-4">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle className="w-6 h-6 text-white" />
                                  ) : (
                                    <Award className="w-6 h-6 text-white" />
                                  )}
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {resource.title}
                                  </h4>

                                  <div className="flex flex-wrap gap-2 text-xs mt-1">
                                    <span className="text-gray-600">
                                      {resource.provider}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-gray-100">
                                      {resource.level}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-gray-100">
                                      {resource.type}
                                    </span>
                                    {resource.duration && (
                                      <span className="text-gray-600">
                                        ⏱ {resource.duration}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-sm text-gray-600 mt-2 mb-3">
                                    {resource.description}
                                  </p>

                                  <div className="flex items-center gap-2">
                                    <a
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                                    >
                                      Start Learning
                                    </a>

                                    {!isCompleted ? (
                                      <button
                                        onClick={() => handleMarkResourceComplete(resourceSearchQuery, resIndex)}
                                        className="px-4 py-2 border border-green-500 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center gap-2"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Mark Complete
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleResetResourceProgress(resourceSearchQuery, resIndex)}
                                        className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                      <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Search for a Skill
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Type a skill name and press Enter or click Search to find learning resources
                      </p>
                      <p className="text-sm text-gray-500">
                        Try: Python, JavaScript, React, Machine Learning, UI/UX Design, etc.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // PROFILE MODE - Show skills from user's profile
                <>
                  {/* Progress Overview */}
                  {profile.skillsWanted && profile.skillsWanted.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {profile.skillsWanted.length}
                        </div>
                        <div className="text-sm text-gray-600">Skills to Learn</div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {Object.values(learningProgress).reduce(
                            (sum, p) => sum + p.completedResources,
                            0
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Resources Completed</div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {Math.round(
                            (Object.values(learningProgress).reduce(
                              (sum, p) => sum + p.completedResources,
                              0
                            ) /
                              Math.max(
                                1,
                                Object.values(learningProgress).reduce(
                                  (sum, p) => sum + p.totalResources,
                                  0
                                )
                              )) *
                            100
                          )}
                          %
                        </div>
                        <div className="text-sm text-gray-600">Overall Progress</div>
                      </div>
                    </div>
                  )}

                  {/* Skills from Profile */}
                  {profile.skillsWanted && profile.skillsWanted.length > 0 ? (
                    <div className="space-y-6">
                      {profile.skillsWanted.map((skill, index) => {
                        const resources = learningResources[skill] || [];
                        const progress = learningProgress[skill] || {
                          completedResources: 0,
                          totalResources: resources.length,
                        };

                        const progressPercentage =
                          resources.length > 0
                            ? Math.round(
                              (progress.completedResources / resources.length) * 100
                            )
                            : 0;

                        return (
                          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                            <div className="mb-4">
                              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {skill}
                              </h3>

                              <div className="flex items-center gap-4">
                                <div className="flex-1 max-w-md">
                                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Progress</span>
                                    <span className="font-medium">
                                      {progressPercentage}%
                                    </span>
                                  </div>

                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                                      style={{ width: `${progressPercentage}%` }}
                                    />
                                  </div>
                                </div>

                                <span className="text-sm text-gray-600">
                                  {progress.completedResources}/{resources.length} completed
                                </span>
                              </div>
                            </div>

                            {resources.length > 0 ? (
                              <div className="space-y-3">
                                {resources.map((resource, resIndex) => {
                                  const isCompleted = resIndex < progress.completedResources;

                                  return (
                                    <div
                                      key={resIndex}
                                      className={`border rounded-lg p-4 ${isCompleted
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                        }`}
                                    >
                                      <div className="flex gap-4">
                                        <div
                                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                            }`}
                                        >
                                          {isCompleted ? (
                                            <CheckCircle className="w-6 h-6 text-white" />
                                          ) : (
                                            <Award className="w-6 h-6 text-white" />
                                          )}
                                        </div>

                                        <div className="flex-1">
                                          <h4 className="font-semibold text-gray-900">
                                            {resource.title}
                                          </h4>

                                          <div className="flex flex-wrap gap-2 text-xs mt-1">
                                            <span className="text-gray-600">
                                              {resource.provider}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-gray-100">
                                              {resource.level}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-gray-100">
                                              {resource.type}
                                            </span>
                                            {resource.duration && (
                                              <span className="text-gray-600">
                                                ⏱ {resource.duration}
                                              </span>
                                            )}
                                          </div>

                                          <p className="text-sm text-gray-600 mt-2 mb-3">
                                            {resource.description}
                                          </p>

                                          <div className="flex items-center gap-2">
                                            <a
                                              href={resource.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                                            >
                                              Start Learning
                                            </a>

                                            {!isCompleted ? (
                                              <button
                                                onClick={() => handleMarkResourceComplete(skill, resIndex)}
                                                className="px-4 py-2 border border-green-500 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center gap-2"
                                              >
                                                <CheckCircle className="w-4 h-4" />
                                                Mark Complete
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => handleResetResourceProgress(skill, resIndex)}
                                                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                              >
                                                Reset
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Resources for "{skill}" coming soon...</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                      <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Get Started with Learning
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Search for any skill above or add skills to your profile
                      </p>
                      <button
                        onClick={() => setCurrentPage('profile')}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Update Profile
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Live Sessions Page - SEPARATE SECTION */}
          {currentPage === 'learning-sessions' && profile && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Live Learning Sessions</h2>
                    <p className="text-purple-100">
                      Join or host live learning sessions with peers
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateSessionModal(true)}
                    className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Session
                  </button>
                </div>
              </div>

              {/* Back Button */}
              <button
                onClick={() => setCurrentPage('learning')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Resources
              </button>

              {/* Sessions Grid */}
              {liveSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {liveSessions.map((session) => {
                    const isHost = session.hostId === user.uid;
                    const isJoined = session.participants.includes(user.uid);
                    const isFull = session.participants.length >= session.maxParticipants;

                    const scheduledDate = new Date(session.scheduledTime);
                    const isUpcoming = scheduledDate > new Date();
                    const timeUntil = Math.floor((scheduledDate - new Date()) / 60000);

                    return (
                      <div
                        key={session.id}
                        className="bg-white rounded-lg shadow-sm p-6 border-2 border-purple-100 hover:border-purple-300 transition-all"
                      >
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {session.title}
                            </h3>
                            {isHost && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                Host
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-3">
                            {session.description}
                          </p>

                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {scheduledDate.toLocaleDateString()} at{" "}
                                {scheduledDate.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{session.duration} minutes</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>
                                {session.participants.length}/{session.maxParticipants} participants
                              </span>
                            </div>

                            {session.skill && (
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                {session.skill}
                              </span>
                            )}
                          </div>

                          {isUpcoming && timeUntil < 120 && timeUntil > 0 && (
                            <div className="flex items-center gap-2 text-sm font-medium text-orange-600 mb-2">
                              <AlertCircle className="w-4 h-4" />
                              Starting in {timeUntil} minutes
                            </div>
                          )}

                          <p className="text-sm text-gray-500">
                            Hosted by <span className="font-medium">{session.hostName}</span>
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {isJoined ? (
                            <a
                              href={session.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center font-medium flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Join Meeting
                            </a>
                          ) : isFull ? (
                            <button
                              disabled
                              className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                            >
                              Session Full
                            </button>
                          ) : (
                            <button
                              onClick={() => handleJoinSession(session.id)}
                              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                              <Plus className="w-5 h-5" />
                              Join Session
                            </button>
                          )}

                          {isHost && (
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Upcoming Sessions
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Be the first to create a live learning session!
                  </p>
                  <button
                    onClick={() => setShowCreateSessionModal(true)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Create Session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Requests Page */}
          {currentPage === 'requests' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Connection Requests */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Connection Requests</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {connectionRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </div>

                  {connectionRequests.filter(r => r.status === 'pending').length > 0 ? (
                    <div className="space-y-3">
                      {connectionRequests.filter(r => r.status === 'pending').map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                                {request.fromName?.charAt(0) || '?'}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{request.fromName}</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(request.sentAt).toLocaleDateString()} at{' '}
                                  {new Date(request.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  await handleAcceptConnection(request.id, request.from);
                                  // Reload connection requests after accepting
                                  await loadConnectionRequests();
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => {
                                  setConnectionRequests(connectionRequests.filter(r => r.id !== request.id));
                                }}
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No pending connection requests</p>
                      <p className="text-sm text-gray-400 mt-1">New requests will appear here</p>
                    </div>
                  )}
                </div>

                {/* Project Join Requests (for project owners) */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Project Join Requests</h3>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {projects.filter(p => p.owner === user.uid).reduce((total, p) =>
                        total + (p.joinRequests?.filter(r => r.status === 'pending').length || 0), 0
                      )}
                    </span>
                  </div>

                  {projects.filter(p => p.owner === user.uid && p.joinRequests?.some(r => r.status === 'pending')).length > 0 ? (
                    <div className="space-y-4">
                      {projects.filter(p => p.owner === user.uid).map(project => {
                        const pendingRequests = project.joinRequests?.filter(r => r.status === 'pending') || [];
                        if (pendingRequests.length === 0) return null;

                        return (
                          <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-gray-900">{project.title}</h4>
                                <p className="text-xs text-gray-500">{pendingRequests.length} pending request(s)</p>
                              </div>
                              <button
                                onClick={() => setSelectedProject(project)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                View All →
                              </button>
                            </div>

                            {pendingRequests.slice(0, 2).map((req, i) => (
                              <div key={i} className="mt-2 p-3 bg-gray-50 rounded">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm text-gray-900">{req.userName}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {req.userSkills?.slice(0, 2).map((skill, j) => (
                                        <span key={j} className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleAcceptJoinRequest(project.id, req.userId)}
                                      className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => handleRejectApplication(project.id, req.userId)}
                                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No pending project requests</p>
                      <p className="text-sm text-gray-400 mt-1">Requests for your projects will appear here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sent Requests */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Sent Requests</h3>

                <div className="space-y-3">
                  {/* Connection Requests Sent */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Requests</h4>
                    {connectionRequests.filter(r => r.from === user.uid).length > 0 ? (
                      <div className="space-y-2">
                        {connectionRequests.filter(r => r.from === user.uid).map((request) => (
                          <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {request.fromName?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Request sent to {request.fromName}</p>
                                <p className="text-xs text-gray-500">{new Date(request.sentAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs ${request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : request.status === 'accepted'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                              }`}>
                              {request.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No connection requests sent</p>
                    )}
                  </div>

                  {/* Project Join Requests Sent */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Project Join Requests</h4>
                    {projects.filter(p => p.joinRequests?.some(r => r.userId === user.uid)).length > 0 ? (
                      <div className="space-y-2">
                        {projects.filter(p => p.joinRequests?.some(r => r.userId === user.uid)).map((project) => {
                          const myRequest = project.joinRequests.find(r => r.userId === user.uid);
                          return (
                            <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{project.title}</p>
                                <p className="text-xs text-gray-500">
                                  Requested {new Date(myRequest.requestedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs ${myRequest.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : myRequest.status === 'accepted'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                                }`}>
                                {myRequest.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No project join requests sent</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat */}
          {currentPage === 'chat' && (
            <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-200px)] flex">
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Messages</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  {conversations.length > 0 ? (
                    <div className="p-2">
                      {conversations.map((convo) => (
                        <button
                          key={convo.id}
                          onClick={() => setActiveChat(convo)}
                          className={`w-full p-3 rounded-lg mb-2 text-left transition-colors ${activeChat?.id === convo.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50 border-transparent'
                            } border`}
                        >
                          <div className="flex items-center gap-3">
                            {convo.type === 'group' ? (
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                                <Briefcase className="w-5 h-5" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                {convo.participantName?.charAt(0) || '?'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {convo.type === 'group' ? convo.projectTitle : convo.participantName}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">
                                {convo.lastMessage || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No conversations yet</p>
                      <p className="text-sm mt-1">Connect with people or join projects to start chatting</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                {activeChat ? (
                  <>
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-900">
                        {activeChat.type === 'group' ? activeChat.projectTitle : activeChat.participantName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {activeChat.type === 'group'
                          ? `${activeChat.participants?.length || 0} members`
                          : 'Direct message'}
                      </p>
                    </div>

                    <div id="messages-container" className="flex-1 overflow-y-auto p-4 space-y-4">
                      {(chatMessages[activeChat.id] || []).map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${message.senderId === user.uid ? 'order-2' : 'order-1'}`}>
                            {message.senderId !== user.uid && activeChat.type === 'group' && (
                              <p className="text-xs text-gray-600 mb-1 px-3">{message.senderName}</p>
                            )}
                            <div className={`rounded-lg p-3 ${message.senderId === user.uid
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                              }`}>
                              {message.type === 'text' ? (
                                <p>{message.text}</p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-white bg-opacity-20 rounded">
                                    <Briefcase className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{message.fileName}</p>
                                    <p className="text-xs opacity-75">
                                      {(message.fileSize / 1024).toFixed(2)} KB
                                    </p>
                                  </div>
                                </div>
                              )}
                              <p className={`text-xs mt-1 ${message.senderId === user.uid ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <label className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                          <Plus className="w-5 h-5 text-gray-600" />
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>Select a conversation to start chatting</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Portfolio */}
          {currentPage === 'portfolio' && profile && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white">
                <h2 className="text-3xl font-bold mb-2">My Portfolio</h2>
                <p className="text-blue-100">Showcase your skills and completed projects</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <Award className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{profile.completedProjects?.length || 0}</div>
                  <div className="text-sm text-gray-600">Projects Completed</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <Star className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{profile.rating?.toFixed(1) || '0.0'}</div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{matches.length}</div>
                  <div className="text-sm text-gray-600">Skill Matches</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Featured Projects</h3>
                {projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.map(project => (
                      <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{project.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {project.requiredSkills?.map((skill, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No completed projects yet</p>
                )}
              </div>

              <div className="text-center">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Download Resume
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* User Profile Modal */}
      {selectedUserProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {selectedUserProfile.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedUserProfile.name}</h2>
                  <p className="text-gray-600">{selectedUserProfile.department} • {selectedUserProfile.year}</p>
                  <p className="text-sm text-gray-500 mt-1">ID: {selectedUserProfile.uniqueId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{selectedUserProfile.rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-xs text-gray-500">({selectedUserProfile.ratingCount || 0})</span>
                    </div>
                    <button
                      onClick={() => {
                        handleViewUserRatings(selectedUserProfile.id);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      View Ratings
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserProfile(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {selectedUserProfile.bio && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-gray-700">{selectedUserProfile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Skills Offered</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserProfile.skillsOffered && selectedUserProfile.skillsOffered.length > 0 ? (
                      selectedUserProfile.skillsOffered.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No skills listed</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Wants to Learn</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserProfile.skillsWanted && selectedUserProfile.skillsWanted.length > 0 ? (
                      selectedUserProfile.skillsWanted.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No skills listed</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                {!profile.connections?.includes(selectedUserProfile.id) && (
                  <button
                    onClick={() => {
                      handleSendConnectionRequest(selectedUserProfile.id);
                      setSelectedUserProfile(null);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send Connection Request
                  </button>
                )}
                {profile.connections?.includes(selectedUserProfile.id) && (
                  <button
                    onClick={() => {
                      const convoId = [user.uid, selectedUserProfile.id].sort().join('-');
                      const convo = conversations.find(c => c.id === convoId) || {
                        id: convoId,
                        participants: [user.uid, selectedUserProfile.id],
                        type: 'direct',
                        participantName: selectedUserProfile.name
                      };
                      setActiveChat(convo);
                      setCurrentPage('chat');
                      setSelectedUserProfile(null);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Send Message
                  </button>
                )}
                <button
                  onClick={() => setSelectedUserProfile(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Rate Your Team Members</h2>
                <p className="text-sm text-gray-600 mt-1">Project: {ratingData.projectTitle}</p>
              </div>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRatingData({ projectId: null, projectTitle: '', membersToRate: [], ratings: {} });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {ratingData.membersToRate.length > 0 ? (
                ratingData.membersToRate.map((memberId, index) => {
                  // Get member info
                  let memberName = 'Team Member';

                  // Try to find member in matches or connections
                  const matchedUser = matches.find(m => m.id === memberId);
                  if (matchedUser) {
                    memberName = matchedUser.name;
                  }

                  const currentRating = ratingData.ratings[memberId] || { stars: 0, comment: '' };

                  return (
                    <div key={memberId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                          {memberName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{memberName}</h4>
                          <p className="text-sm text-gray-600">Team Member {index + 1}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rating *
                          </label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => {
                                  setRatingData({
                                    ...ratingData,
                                    ratings: {
                                      ...ratingData.ratings,
                                      [memberId]: {
                                        ...currentRating,
                                        stars: star
                                      }
                                    }
                                  });
                                }}
                                className="transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`w-8 h-8 ${star <= currentRating.stars
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                    }`}
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600 self-center">
                              {currentRating.stars > 0 ? `${currentRating.stars}/5` : 'Not rated'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comment (Optional)
                          </label>
                          <textarea
                            value={currentRating.comment || ''}
                            onChange={(e) => {
                              setRatingData({
                                ...ratingData,
                                ratings: {
                                  ...ratingData.ratings,
                                  [memberId]: {
                                    ...currentRating,
                                    comment: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="Share your experience working with this team member..."
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-8">No team members to rate</p>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={handleSubmitRatings}
                disabled={!ratingData.membersToRate.every(id =>
                  ratingData.ratings[id] && ratingData.ratings[id].stars > 0
                )}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Ratings & Complete Project
              </button>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRatingData({ projectId: null, projectTitle: '', membersToRate: [], ratings: {} });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              * All team members must be rated before completing the project
            </p>
          </div>
        </div>
      )}

      {/* View Ratings Modal */}
      {viewRatingsModal && selectedUserRatings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Ratings & Reviews</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedUserRatings.ratings.length} review{selectedUserRatings.ratings.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setViewRatingsModal(false);
                  setSelectedUserRatings(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedUserRatings.ratings.length > 0 ? (
              <div className="space-y-4">
                {selectedUserRatings.ratings.map((rating) => (
                  <div key={rating.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${star <= rating.stars
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                                  }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {rating.stars}/5
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{rating.raterName}</p>
                        <p className="text-xs text-gray-600">Project: {rating.projectTitle}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {rating.comment && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 mt-2">
                        "{rating.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No ratings yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Complete projects to receive ratings from team members
                </p>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={() => {
                  setViewRatingsModal(false);
                  setSelectedUserRatings(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Components
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const SkillsSection = ({ title, skills, color, isEditing, onAdd, onRemove }) => {
  const [newSkill, setNewSkill] = useState('');

  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hover: 'hover:border-blue-300 hover:text-blue-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', hover: 'hover:border-purple-300 hover:text-purple-600' }
  };

  const handleAdd = () => {
    if (newSkill.trim()) {
      onAdd(newSkill);
      setNewSkill('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {skills && skills.length > 0 ? (
          skills.map((skill, i) => (
            <span key={i} className={`px-3 py-1 ${colorClasses[color].bg} ${colorClasses[color].text} rounded-full text-sm flex items-center gap-2`}>
              {skill}
              {isEditing && (
                <button onClick={() => onRemove(i)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No skills added yet</p>
        )}
        {isEditing && (
          <div className="flex gap-2 w-full mt-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add skill..."
              className="flex-1 px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              className={`px-3 py-1 border-2 border-dashed ${colorClasses[color].border} text-gray-600 rounded text-sm ${colorClasses[color].hover}`}
            >
              + Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectCard = ({ project, onViewDetails, onDeleteProject, onLeaveProject, onCompleteProject, currentUserId }) => {
  const isMember = project.members?.includes(currentUserId);
  const isOwner = project.owner === currentUserId;
  const hasApplied = project.applications?.some(app => app.userId === currentUserId);
  const isFull = (project.members?.length || 0) >= (project.maxMembers || 5);
  const isCompleted = project.completed || project.status === 'completed';

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${isCompleted ? 'border-2 border-green-200' : ''
      }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
            {isCompleted && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Completed
              </span>
            )}
            {isMember && !isCompleted && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {isOwner ? 'Owner' : 'Member'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
          {isCompleted && project.completedAt && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Completed on {new Date(project.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${project.status === 'open' && !isFull ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
              {isFull ? 'Full' : project.status}
            </span>
          )}

          {/* Action dropdown */}
          {isMember && (
            <div className="relative group">
              <button className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                {isOwner && !isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteProject(project.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 rounded-t-lg flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Completed
                  </button>
                )}
                {isOwner ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Project
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeaveProject(project.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 rounded-b-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Leave Project
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Briefcase className="w-4 h-4" />
          <span>{project.category}</span>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {project.requiredSkills?.slice(0, 4).map((skill, i) => (
              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                {skill}
              </span>
            ))}
            {project.requiredSkills?.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                +{project.requiredSkills.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{project.members?.length || 0}/{project.maxMembers || 5} members</span>
            {project.applications?.filter(app => app.status === 'pending').length > 0 &&
              project.owner === currentUserId && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                  {project.applications.filter(app => app.status === 'pending').length} pending
                </span>
              )}
          </div>
          <button
            onClick={onViewDetails}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};


const MatchCard = ({ match, onConnect, onViewProfile }) => {
  const { matchBreakdown = {} } = match;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {match.name?.charAt(0) || '?'}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">{match.matchScore}</div>
          <div className="text-xs text-gray-500">Match Score</div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">{match.name}</h3>
      <p className="text-sm text-gray-600 mb-2">{match.department} • {match.year}</p>
      <p className="text-xs text-gray-500 mb-3">ID: {match.uniqueId}</p>

      <div className="flex items-center gap-1 mb-4">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-medium">{match.rating?.toFixed(1) || '0.0'}</span>
      </div>

      {/* Match Breakdown */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs font-semibold text-gray-700 mb-2">Why This Match?</p>
        <div className="space-y-1">
          {matchBreakdown.canTeach > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">✓ You can teach them</span>
              <span className="font-medium text-green-600">+{matchBreakdown.canTeach}</span>
            </div>
          )}
          {matchBreakdown.wantsToLearn > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">✓ They can teach you</span>
              <span className="font-medium text-blue-600">+{matchBreakdown.wantsToLearn}</span>
            </div>
          )}
          {matchBreakdown.department > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">✓ Same department</span>
              <span className="font-medium text-purple-600">+{matchBreakdown.department}</span>
            </div>
          )}
          {matchBreakdown.availability > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">✓ Similar availability</span>
              <span className="font-medium text-orange-600">+{matchBreakdown.availability}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Can Teach You
          </p>
          <div className="flex flex-wrap gap-1">
            {match.skillsOffered && match.skillsOffered.length > 0 ? (
              match.skillsOffered.slice(0, 3).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No skills listed</span>
            )}
            {match.skillsOffered && match.skillsOffered.length > 3 && (
              <span className="text-xs text-gray-500">+{match.skillsOffered.length - 3} more</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Wants to Learn
          </p>
          <div className="flex flex-wrap gap-1">
            {match.skillsWanted && match.skillsWanted.length > 0 ? (
              match.skillsWanted.slice(0, 3).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No skills listed</span>
            )}
            {match.skillsWanted && match.skillsWanted.length > 3 && (
              <span className="text-xs text-gray-500">+{match.skillsWanted.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Availability Display */}
        {match.availability && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Availability
            </p>
            <p className="text-xs text-gray-600 bg-orange-50 px-2 py-1 rounded">
              {match.availability}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={() => onConnect(match)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Connect
        </button>
        <button
          onClick={() => onViewProfile(match)}
          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          View Profile
        </button>
      </div>
    </div>
  );
};
export default CampusConnect;
