import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, Brain, Target, Beaker, BarChart3, 
  Search, Sparkles, Code,
  Send, Sun, Moon, Award, TrendingUp, 
  Layers, Cpu, Calendar, MessageSquare, Zap,
  ChevronRight, ChevronLeft, CheckCircle2, Circle,
  Upload, Languages, FileText, Mic, MicOff,
  Plus, Edit3, X, Save, ChevronUp, ChevronDown, Trash2, Clock, Loader2,
  Copy, Check
} from 'lucide-react';
import { useEducationalIntelligence } from '../hooks/useEducationalIntelligence';

const SkillDashboard = () => {
  const [isDark, setIsDark] = useState(true);
  const [activeNav, setActiveNav] = useState('Learn');
  const [selectedSkill, setSelectedSkill] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [message, setMessage] = useState('');
  const [vivaMode, setVivaMode] = useState(false);
  const [currentVivaQuestion, setCurrentVivaQuestion] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState({});
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai',
      content: "I noticed you're working on nested loops. Rather than showing you the code, let me ask: what happens to your inner loop variable each time the outer loop increments?",
      timestamp: '2:34 PM',
      helpful: null
    },
    {
      role: 'user',
      content: "The inner loop completes fully, but I'm confused about when the outer variable updates.",
      timestamp: '2:36 PM'
    },
    {
      role: 'ai',
      content: "Great observation! Try this - grab some paper and manually trace through just the first 3 iterations. Write down both i and j values at each step. What patterns emerge?",
      timestamp: '2:37 PM',
      helpful: null
    }
  ]);
  const [documentChatHistory, setDocumentChatHistory] = useState([
    {
      role: 'ai',
      content: "👋 Welcome to RAG Document Chat! Upload your study materials (PDF, TXT) and I'll help you understand them better. Ask me anything about your uploaded documents!",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      helpful: null
    }
  ]);
  const [documentMessage, setDocumentMessage] = useState('');
  const [documentInputFocused, setDocumentInputFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDocumentRecording, setIsDocumentRecording] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [documentVoiceLanguage, setDocumentVoiceLanguage] = useState('en-US');
  const [showVoiceLanguageMenu, setShowVoiceLanguageMenu] = useState(false);
  const [showDocumentVoiceLanguageMenu, setShowDocumentVoiceLanguageMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const documentMessagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const documentRecognitionRef = useRef(null);
  
  // Course Management State
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseObjective, setNewCourseObjective] = useState('');
  const [generatedCurriculum, setGeneratedCurriculum] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [isCoursePanelCollapsed, setIsCoursePanelCollapsed] = useState(false);
  
  // Initialize Educational Intelligence Hook
  const { 
    askQuestion, 
    submitWork, 
    answerVivaQuestion,
    translateConcept,
    getDailyReview,
    evaluateWork,
    uploadDocument,
    askDocumentQuestion,
    generateCurriculum,
    loading,
    dailyQueue
  } = useEducationalIntelligence('student_001');

  // Course data - now as state for dynamic management
  const [skillCards, setSkillCards] = useState([
    { 
      id: 1, 
      subject: 'Big Data Analytics', 
      module: 'Hadoop & Spark Deep Dive', 
      progress: 72, 
      lastActive: '2h ago',
      nextUp: 'MapReduce Patterns',
      topics: ['MapReduce', 'HDFS', 'Spark'],
      color: 'sage',
      icon: Layers,
      streak: 12,
      isCustom: false
    },
    { 
      id: 2, 
      subject: 'LangGraph Agents', 
      module: 'Multi-Agent Systems', 
      progress: 58, 
      lastActive: '1d ago',
      nextUp: 'State Management',
      topics: ['Graphs', 'State', 'Tools'],
      color: 'lavender',
      icon: Brain,
      streak: 5,
      isCustom: false
    },
    { 
      id: 3, 
      subject: 'Data Structures', 
      module: 'Trees & Graph Theory', 
      progress: 88, 
      lastActive: '30m ago',
      nextUp: 'Binary Search Trees',
      topics: ['Trees', 'Graphs', 'DP'],
      color: 'ocean',
      icon: Code,
      streak: 18,
      isCustom: false
    },
    { 
      id: 4, 
      subject: 'IoT Engineering', 
      module: 'ESP32 & Sensors', 
      progress: 64, 
      lastActive: '5h ago',
      nextUp: 'I2C Protocol',
      topics: ['ESP32', 'MPU6050', 'I2C'],
      color: 'amber',
      icon: Cpu,
      streak: 8,
      isCustom: false
    },
  ]);

  // Color options for custom courses
  const colorOptions = ['sage', 'lavender', 'ocean', 'amber'];
  const iconOptions = [
    { name: 'Code', icon: Code },
    { name: 'Brain', icon: Brain },
    { name: 'Layers', icon: Layers },
    { name: 'Cpu', icon: Cpu },
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Target', icon: Target }
  ];

  // Generate next available ID
  const getNextCourseId = () => {
    return Math.max(...skillCards.map(c => c.id), 0) + 1;
  };

  // Handle AI curriculum generation
  const handleGenerateCurriculum = async () => {
    if (!newCourseTitle.trim()) return;
    
    setIsGenerating(true);
    try {
      const result = await generateCurriculum(newCourseTitle, newCourseObjective);
      setGeneratedCurriculum({
        title: newCourseTitle,
        objective: newCourseObjective,
        ...result
      });
    } catch (err) {
      console.error('Failed to generate curriculum:', err);
      setFeedbackMessage({ type: 'error', text: 'Failed to generate curriculum. Please try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
    setIsGenerating(false);
  };

  // Save generated course
  const handleSaveCourse = () => {
    if (!generatedCurriculum) return;
    
    const newCourse = {
      id: getNextCourseId(),
      subject: generatedCurriculum.title,
      module: generatedCurriculum.modules[0]?.moduleTitle || 'Getting Started',
      description: generatedCurriculum.description,
      progress: 0,
      lastActive: 'Just now',
      nextUp: generatedCurriculum.modules[0]?.topics[0] || 'Introduction',
      topics: generatedCurriculum.modules[0]?.topics.slice(0, 3) || [],
      color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
      icon: iconOptions[Math.floor(Math.random() * iconOptions.length)].icon,
      streak: 0,
      isCustom: true,
      modules: generatedCurriculum.modules,
      totalTime: generatedCurriculum.totalTime,
      difficulty: generatedCurriculum.difficulty
    };
    
    setSkillCards(prev => [...prev, newCourse]);
    setShowCreateCourseModal(false);
    setNewCourseTitle('');
    setNewCourseObjective('');
    setGeneratedCurriculum(null);
    setFeedbackMessage({ type: 'success', text: '✅ Course created successfully!' });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Open edit modal for a course
  const handleEditCourse = (course, e) => {
    e.stopPropagation();
    setEditingCourse({ ...course });
    setShowEditCourseModal(true);
  };

  // Save course edits
  const handleSaveEdit = () => {
    if (!editingCourse) return;
    
    setSkillCards(prev => prev.map(course => 
      course.id === editingCourse.id ? editingCourse : course
    ));
    setShowEditCourseModal(false);
    setEditingCourse(null);
    setFeedbackMessage({ type: 'success', text: '✅ Course updated!' });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Delete a course
  const handleDeleteCourse = (courseId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this course?')) {
      setSkillCards(prev => prev.filter(c => c.id !== courseId));
      if (selectedSkill >= skillCards.length - 1) {
        setSelectedSkill(Math.max(0, skillCards.length - 2));
      }
      setFeedbackMessage({ type: 'success', text: 'Course deleted' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Update module in editing course
  const updateModule = (moduleIndex, field, value) => {
    if (!editingCourse) return;
    const updatedModules = [...(editingCourse.modules || [])];
    updatedModules[moduleIndex] = { ...updatedModules[moduleIndex], [field]: value };
    setEditingCourse({ ...editingCourse, modules: updatedModules });
  };

  // Add topic to module
  const addTopicToModule = (moduleIndex) => {
    if (!editingCourse) return;
    const updatedModules = [...(editingCourse.modules || [])];
    updatedModules[moduleIndex].topics = [...updatedModules[moduleIndex].topics, 'New Topic'];
    setEditingCourse({ ...editingCourse, modules: updatedModules });
  };

  // Remove topic from module
  const removeTopicFromModule = (moduleIndex, topicIndex) => {
    if (!editingCourse) return;
    const updatedModules = [...(editingCourse.modules || [])];
    updatedModules[moduleIndex].topics = updatedModules[moduleIndex].topics.filter((_, i) => i !== topicIndex);
    setEditingCourse({ ...editingCourse, modules: updatedModules });
  };

  // Update topic in module
  const updateTopic = (moduleIndex, topicIndex, value) => {
    if (!editingCourse) return;
    const updatedModules = [...(editingCourse.modules || [])];
    updatedModules[moduleIndex].topics[topicIndex] = value;
    setEditingCourse({ ...editingCourse, modules: updatedModules });
  };

  // Add new module
  const addModule = () => {
    if (!editingCourse) return;
    const newModule = {
      moduleTitle: 'New Module',
      topics: ['Topic 1'],
      estimatedTime: '2h'
    };
    setEditingCourse({
      ...editingCourse,
      modules: [...(editingCourse.modules || []), newModule]
    });
  };

  // Remove module
  const removeModule = (moduleIndex) => {
    if (!editingCourse) return;
    setEditingCourse({
      ...editingCourse,
      modules: editingCourse.modules.filter((_, i) => i !== moduleIndex)
    });
  };

  // Move module up/down
  const moveModule = (moduleIndex, direction) => {
    if (!editingCourse) return;
    const modules = [...editingCourse.modules];
    const newIndex = moduleIndex + direction;
    if (newIndex < 0 || newIndex >= modules.length) return;
    [modules[moduleIndex], modules[newIndex]] = [modules[newIndex], modules[moduleIndex]];
    setEditingCourse({ ...editingCourse, modules });
  };

  // Filter courses by search query
  const filteredCourses = skillCards.filter(course => 
    course.subject.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
    course.module.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
    course.topics.some(t => t.toLowerCase().includes(courseSearchQuery.toLowerCase()))
  );

  // Handler for sending messages with Socratic Coach
  const handleSendMessage = async () => {
    if (!message.trim() || loading) return;
    
    const userMessage = message.trim();
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to chat
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp
    }]);
    
    setMessage('');
    
    try {
      // Call Socratic Coach feature with enhanced course context
      const response = await askQuestion(userMessage, {
        subject: currentSkill.subject,
        currentTopic: currentSkill.nextUp,
        module: currentSkill.module,
        topics: currentSkill.topics,
        isCustomCourse: currentSkill.isCustom || false,
        courseDifficulty: currentSkill.difficulty || 'intermediate',
        courseModules: currentSkill.modules || []
      });
      
      // Add AI response to chat
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: response.guidance || response.message || response.content || `🚨 No response received from AI. Check console for errors.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null
      }]);
    } catch (err) {
      console.error('❌ Error sending message:', err);
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: `🚨 Error: ${err.message}. Check browser console for details.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isError: true
      }]);
    }
  };
  
  // Handler for submitting work
  const handleSubmitWork = async (workContent) => {
    if (!workContent.trim() || loading) return;
    
    try {
      const response = await submitWork({
        content: workContent,
        subject: currentSkill.subject,
        studentId: 'student_001'
      });
      
      if (response.requiresViva) {
        setVivaMode(true);
        setCurrentVivaQuestion(response.vivaQuestion);
        
        setChatHistory(prev => [...prev, {
          role: 'ai',
          content: `I need to verify your understanding. ${response.vivaQuestion}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          helpful: null,
          isViva: true
        }]);
      } else {
        setChatHistory(prev => [...prev, {
          role: 'ai', 
          content: response.feedback || 'Great work! Your submission has been accepted.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          helpful: null
        }]);
      }
    } catch (err) {
      console.error('Error submitting work:', err);
    }
  };
  
  // Handler for viva questions
  const handleVivaResponse = async (answer) => {
    if (!vivaMode || !currentVivaQuestion) return;
    
    try {
      const response = await answerVivaQuestion(currentVivaQuestion, answer);
      
      setVivaMode(false);
      setCurrentVivaQuestion(null);
      
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: response.feedback || 'Thank you for your explanation.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null
      }]);
    } catch (err) {
      console.error('Error answering viva:', err);
    }
  };
  
  // Enhanced handler for concept translation with feedback
  const handleTranslateConcept = async (concept, targetLang = 'simplified', options = {}) => {
    try {
      setFeedbackMessage({ type: 'info', text: 'Translating concept...' });
      const response = await translateConcept({
        concept,
        subject: currentSkill.subject,
        targetLanguage: targetLang,
        ...options
      });
      
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: response.translation || response.explanation,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isTranslation: true
      }]);
      
      setFeedbackMessage({ 
        type: 'success', 
        text: `✅ Concept translated successfully! ${targetLang !== 'simplified' ? `(${targetLang.toUpperCase()})` : ''}` 
      });
      
      // Clear feedback after 3 seconds
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('Error translating concept:', err);
      setFeedbackMessage({ type: 'error', text: '❌ Translation failed. Please try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Toggle language selector for a specific message
  const toggleLanguageSelector = (messageIndex) => {
    setShowLanguageSelector(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  // Translate current message to selected language (Mentor Chat)
  const handleTranslateMessage = async (messageIndex, targetLang, langName) => {
    try {
      setFeedbackMessage({ type: 'info', text: `Translating to ${langName}...` });
      
      const currentMessage = chatHistory[messageIndex];
      
      // Extract the actual text content from the message
      let textToTranslate = '';
      if (typeof currentMessage.content === 'string') {
        textToTranslate = currentMessage.content;
      } else {
        textToTranslate = currentMessage.content?.toString() || currentSkill.nextUp;
      }
      
      // Store original content if not already stored
      const originalContent = currentMessage.originalContent || currentMessage.content;
      
      const response = await translateConcept({
        concept: textToTranslate,
        subject: currentSkill.subject,
        targetLanguage: targetLang,
        culturalContext: targetLang === 'ta' || targetLang === 'hi'
      });
      
      // Decode Unicode escape sequences if present
      let translatedText = response.translation || response.explanation || textToTranslate;
      if (translatedText.includes('\\u')) {
        try {
          translatedText = JSON.parse('"' + translatedText + '"');
        } catch (e) {
          console.log('Unicode decode not needed or failed');
        }
      }
      
      // Update the message content with translation
      setChatHistory(prev => prev.map((msg, idx) => {
        if (idx === messageIndex) {
          return {
            ...msg,
            content: translatedText,
            translatedTo: langName,
            originalContent: originalContent,
            currentLanguage: targetLang
          };
        }
        return msg;
      }));
      
      // Hide language selector after translation
      setShowLanguageSelector(prev => ({
        ...prev,
        [messageIndex]: false
      }));
      
      setFeedbackMessage({ 
        type: 'success', 
        text: `✅ Translated to ${langName} successfully!` 
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('Error translating message:', err);
      setFeedbackMessage({ type: 'error', text: '❌ Translation failed. Please try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };
  
  // Translate document chat message to selected language
  const handleTranslateDocumentMessage = async (messageIndex, targetLang, langName) => {
    try {
      setFeedbackMessage({ type: 'info', text: `Translating to ${langName}...` });
      
      const currentMessage = documentChatHistory[messageIndex];
      
      // Extract the actual text content from the message
      let textToTranslate = '';
      if (typeof currentMessage.content === 'string') {
        textToTranslate = currentMessage.content;
      } else {
        textToTranslate = currentMessage.content?.toString() || 'Translation content';
      }
      
      // Store original content if not already stored
      const originalContent = currentMessage.originalContent || currentMessage.content;
      
      const response = await translateConcept({
        concept: textToTranslate,
        subject: currentSkill.subject,
        targetLanguage: targetLang,
        culturalContext: targetLang === 'ta' || targetLang === 'hi'
      });
      
      // Decode Unicode escape sequences if present
      let translatedText = response.translation || response.explanation || textToTranslate;
      if (translatedText.includes('\\u')) {
        try {
          translatedText = JSON.parse('"' + translatedText + '"');
        } catch (e) {
          console.log('Unicode decode not needed or failed');
        }
      }
      
      // Update the document message content with translation
      setDocumentChatHistory(prev => prev.map((msg, idx) => {
        if (idx === messageIndex) {
          return {
            ...msg,
            content: translatedText,
            translatedTo: langName,
            originalContent: originalContent,
            currentLanguage: targetLang
          };
        }
        return msg;
      }));
      
      // Hide language selector after translation
      setShowLanguageSelector(prev => ({
        ...prev,
        [messageIndex]: false
      }));
      
      setFeedbackMessage({ 
        type: 'success', 
        text: `✅ Translated to ${langName} successfully!` 
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('Error translating document message:', err);
      setFeedbackMessage({ type: 'error', text: '❌ Translation failed. Please try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };
  
  // Enhanced handler for daily review with feedback
  const handleGetDailyReview = async () => {
    try {
      setFeedbackMessage({ type: 'info', text: 'Loading your daily review...' });
      const review = await getDailyReview('student_001');
      
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: `Here's your daily review: ${review.summary || 'Keep up the great work! Your learning streak is strong! 🌟'}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isReview: true
      }]);
      
      setFeedbackMessage({ 
        type: 'success', 
        text: '✅ Daily review loaded successfully!' 
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('Error getting daily review:', err);
      setFeedbackMessage({ type: 'error', text: '❌ Could not load daily review. Please try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Handler for uploading documents
  const handleUploadDocument = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setFeedbackMessage({ type: 'info', text: `📤 Uploading ${file.name}...` });
      
      const response = await uploadDocument(file);
      
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: `${response.message}\n\n📄 **${response.filename}**\n📊 Processed ${response.chunks} chunks\n\nYou can now ask me questions about this document!`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isUpload: true
      }]);
      
      setFeedbackMessage({ 
        type: 'success', 
        text: `✅ ${response.filename} uploaded successfully!` 
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setFeedbackMessage({ type: 'error', text: '❌ Upload failed. Please try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
    
    // Reset input
    event.target.value = '';
  };
  
  // Handler for asking questions about documents
  const handleAskDocumentQuestion = async (question) => {
    if (!question.trim() || loading) return;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to document chat
    setDocumentChatHistory(prev => [...prev, {
      role: 'user',
      content: question,
      timestamp
    }]);
    
    setDocumentMessage('');
    
    try {
      const response = await askDocumentQuestion(question);
      
      // Format sources with better structure
      let formattedContent = response.answer;
      
      if (response.sources && response.sources.length > 0) {
        formattedContent += `\n\n---\n\n**📚 Sources Referenced (${response.num_sources}):**\n\n`;
        response.sources.forEach((source, i) => {
          const sourceNum = i + 1;
          formattedContent += `**[${sourceNum}]** ${source.content}\n\n`;
        });
      }
      
      // Add AI response to document chat
      setDocumentChatHistory(prev => [...prev, {
        role: 'ai',
        content: formattedContent,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isDocumentQA: true
      }]);
    } catch (err) {
      console.error('Error asking document question:', err);
      setDocumentChatHistory(prev => [...prev, {
        role: 'ai',
        content: `❌ ${err.message}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isError: true
      }]);
    }
  };
  
  // Handler for uploading document in Documents tab
  const handleUploadDocumentInChat = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setFeedbackMessage({ type: 'info', text: `📤 Uploading ${file.name}...` });
      
      const response = await uploadDocument(file);
      
      setDocumentChatHistory(prev => [...prev, {
        role: 'ai',
        content: `✅ ${response.message}\n\n📄 **${response.filename}**\n📊 Processed ${response.chunks} chunks\n\nYou can now ask me questions about this document!`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isUpload: true
      }]);
      
      setFeedbackMessage({ 
        type: 'success', 
        text: `✅ ${response.filename} uploaded successfully!` 
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setFeedbackMessage({ type: 'error', text: '❌ Upload failed. Please try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      
      setDocumentChatHistory(prev => [...prev, {
        role: 'ai',
        content: `❌ Upload failed: ${err.message}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        helpful: null,
        isError: true
      }]);
    }
    
    // Reset input
    event.target.value = '';
  };
  
  // Handler for Enter key in document chat
  const handleDocumentKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskDocumentQuestion(documentMessage);
    }
  };
  
  // Voice language mapping
  const voiceLanguages = {
    'en-US': 'English',
    'ta-IN': 'Tamil',
    'hi-IN': 'Hindi',
    'te-IN': 'Telugu',
    'ml-IN': 'Malayalam'
  };
  
  // Initialize speech recognition for Mentor chat
  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setFeedbackMessage({ type: 'error', text: '❌ Voice recognition not supported in this browser' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsRecording(true);
      setFeedbackMessage({ type: 'info', text: `🎤 Listening in ${voiceLanguages[voiceLanguage]}...` });
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
      setFeedbackMessage({ type: 'success', text: '✅ Voice captured! Review and click Send.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setFeedbackMessage({ type: 'error', text: `❌ ${event.error === 'no-speech' ? 'No speech detected. Please try again.' : 'Voice recognition failed'}` });
      setTimeout(() => setFeedbackMessage(null), 3000);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };
  
  // Stop voice recording for Mentor chat
  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Initialize speech recognition for Documents chat
  const startDocumentVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setFeedbackMessage({ type: 'error', text: '❌ Voice recognition not supported in this browser' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = documentVoiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsDocumentRecording(true);
      setFeedbackMessage({ type: 'info', text: `🎤 Listening in ${voiceLanguages[documentVoiceLanguage]}...` });
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDocumentMessage(prev => prev + (prev ? ' ' : '') + transcript);
      setFeedbackMessage({ type: 'success', text: '✅ Voice captured! Review and click Ask Question.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsDocumentRecording(false);
      setFeedbackMessage({ type: 'error', text: `❌ ${event.error === 'no-speech' ? 'No speech detected. Please try again.' : 'Voice recognition failed'}` });
      setTimeout(() => setFeedbackMessage(null), 3000);
    };
    
    recognition.onend = () => {
      setIsDocumentRecording(false);
    };
    
    documentRecognitionRef.current = recognition;
    recognition.start();
  };
  
  // Stop voice recording for Documents chat
  const stopDocumentVoiceRecording = () => {
    if (documentRecognitionRef.current) {
      documentRecognitionRef.current.stop();
      setIsDocumentRecording(false);
    }
  };
  
  // Handler for Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (vivaMode) {
        handleVivaResponse(message);
        setMessage('');
      } else {
        handleSendMessage();
      }
    }
  };

  // Ensure selectedSkill is within bounds
  const safeSelectedSkill = Math.min(selectedSkill, Math.max(0, skillCards.length - 1));
  const currentSkill = skillCards[safeSelectedSkill] || {
    id: 0,
    subject: 'No Course Selected',
    module: 'Create a course to get started',
    progress: 0,
    lastActive: 'Never',
    nextUp: 'Create Course',
    topics: [],
    color: 'sage',
    icon: BookOpen,
    streak: 0
  };

  // Sophisticated color system
  const colors = {
    sage: { 
      light: '#9FB8AD', 
      base: '#7A9D8F', 
      dark: '#5A7D6F',
      glow: 'rgba(122, 157, 143, 0.15)',
      gradient: 'from-[#7A9D8F] to-[#9FB8AD]'
    },
    lavender: { 
      light: '#B8A9D6', 
      base: '#9B8BC4', 
      dark: '#7D6DA4',
      glow: 'rgba(155, 139, 196, 0.15)',
      gradient: 'from-[#9B8BC4] to-[#B8A9D6]'
    },
    ocean: { 
      light: '#7EB3D4', 
      base: '#5A9BC4', 
      dark: '#3D7BA4',
      glow: 'rgba(90, 155, 196, 0.15)',
      gradient: 'from-[#5A9BC4] to-[#7EB3D4]'
    },
    amber: { 
      light: '#E6B17E', 
      base: '#D4965A', 
      dark: '#B47A3D',
      glow: 'rgba(212, 150, 90, 0.15)',
      gradient: 'from-[#D4965A] to-[#E6B17E]'
    }
  };

  // Theme system with warm, organic tones
  const theme = {
    // Backgrounds
    bg: isDark ? 'bg-[#0F0E0E]' : 'bg-[#FAFAF8]',
    surface: isDark ? 'bg-[#1A1918]' : 'bg-white',
    surfaceElevated: isDark ? 'bg-[#232220]' : 'bg-white',
    surfaceHover: isDark ? 'hover:bg-[#232220]' : 'hover:bg-gray-50/80',
    
    // Borders - softer, more organic
    border: isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
    borderSubtle: isDark ? 'border-white/[0.03]' : 'border-black/[0.03]',
    
    // Text hierarchy
    text: isDark ? 'text-[#E8E6E3]' : 'text-[#1A1918]',
    textSecondary: isDark ? 'text-[#A8A6A3]' : 'text-[#5A5856]',
    textTertiary: isDark ? 'text-[#6A6866]' : 'text-[#8A8886]',
    
    // Inputs
    input: isDark ? 'bg-white/[0.02]' : 'bg-black/[0.02]',
    
    // Accent
    accent: colors[currentSkill.color]?.base || colors.sage.base,
    accentGlow: colors[currentSkill.color]?.glow || colors.sage.glow,
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const scrollDocumentToBottom = () => {
    documentMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);
  
  useEffect(() => {
    scrollDocumentToBottom();
  }, [documentChatHistory]);

  return (
    <div className={`flex h-screen w-screen ${theme.bg} ${theme.text} font-sans antialiased overflow-hidden transition-all duration-500 ease-out`}>
      
      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border transition-all duration-300 ${
          feedbackMessage.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          feedbackMessage.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
          'bg-blue-500/10 border-blue-500/30 text-blue-400'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              feedbackMessage.type === 'success' ? 'bg-green-500' :
              feedbackMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            } ${feedbackMessage.type === 'info' ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium">{feedbackMessage.text}</span>
          </div>
        </div>
      )}
      
      {/* Organic gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute -top-1/3 -right-1/4 w-[800px] h-[800px] rounded-full blur-[120px] transition-all duration-1000 opacity-40`}
          style={{ background: `radial-gradient(circle, ${colors[currentSkill.color].glow} 0%, transparent 70%)` }}
        />
        <div 
          className={`absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-1000 opacity-30`}
          style={{ background: isDark ? 'radial-gradient(circle, rgba(122, 157, 143, 0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(212, 150, 90, 0.05) 0%, transparent 70%)' }}
        />
      </div>

      {/* Refined Sidebar */}
      <aside className={`w-[72px] ${theme.surface} border-r ${theme.border} flex flex-col items-center py-8 relative z-10 transition-all duration-300`}>
        {/* Logo */}
        <div className="mb-12 relative group cursor-pointer">
          <div 
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 bg-gradient-to-br`}
            style={{ background: `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` }}
          >
            <Zap size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <Tooltip text="SkillForge" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-3 w-full px-3">
          <NavButton icon={BookOpen} label="Learn" active={activeNav === 'Learn'} onClick={() => setActiveNav('Learn')} theme={theme} currentColor={colors[currentSkill.color]} />
          <NavButton icon={Brain} label="Mentor" active={activeNav === 'Mentor'} onClick={() => setActiveNav('Mentor')} theme={theme} currentColor={colors[currentSkill.color]} />
          <NavButton icon={FileText} label="Documents" active={activeNav === 'Documents'} onClick={() => setActiveNav('Documents')} theme={theme} currentColor={colors[currentSkill.color]} />
          <NavButton icon={Target} label="Goals" active={activeNav === 'Goals'} onClick={() => setActiveNav('Goals')} theme={theme} currentColor={colors[currentSkill.color]} />
          <NavButton icon={BarChart3} label="Analytics" active={activeNav === 'Analytics'} onClick={() => setActiveNav('Analytics')} theme={theme} currentColor={colors[currentSkill.color]} />
          <NavButton icon={Beaker} label="Lab" active={activeNav === 'Lab'} onClick={() => setActiveNav('Lab')} theme={theme} currentColor={colors[currentSkill.color]} />
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto flex flex-col gap-4 items-center">
          <button 
            onClick={() => setIsDark(!isDark)} 
            className={`w-11 h-11 rounded-xl ${theme.input} ${theme.surfaceHover} flex items-center justify-center transition-all duration-300 border ${theme.borderSubtle}`}
          >
            {isDark ? <Sun size={18} className="text-amber-400" strokeWidth={2} /> : <Moon size={18} className={theme.textSecondary} strokeWidth={2} />}
          </button>
          
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br from-[#7A9D8F] to-[#9FB8AD] flex items-center justify-center text-white text-sm font-semibold cursor-pointer transition-all duration-300 hover:scale-105 shadow-sm`}>
            AK
          </div>
        </div>
      </aside>

      {/* Course List Panel - Collapsible */}
      <section 
        className={`${theme.surface} border-r ${theme.border} flex flex-col transition-all duration-500 ease-in-out relative`}
        style={{ 
          width: isCoursePanelCollapsed ? '80px' : '440px',
          minWidth: isCoursePanelCollapsed ? '80px' : '440px'
        }}
      >
        {/* Collapse/Expand Toggle Button */}
        <button
          onClick={() => setIsCoursePanelCollapsed(!isCoursePanelCollapsed)}
          className={`absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-12 rounded-full ${theme.surface} border ${theme.border} flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110`}
          style={{
            background: isDark ? '#232220' : 'white',
            boxShadow: `0 2px 8px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`
          }}
        >
          {isCoursePanelCollapsed ? (
            <ChevronRight size={14} className={theme.textSecondary} strokeWidth={2.5} />
          ) : (
            <ChevronLeft size={14} className={theme.textSecondary} strokeWidth={2.5} />
          )}
        </button>

        {/* Collapsed View */}
        {isCoursePanelCollapsed ? (
          <div className="flex flex-col items-center py-8 gap-4 h-full">
            {/* Collapsed Header */}
            <div className="mb-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${colors[currentSkill?.color || 'sage'].base}, ${colors[currentSkill?.color || 'sage'].light})` }}
                onClick={() => setIsCoursePanelCollapsed(false)}
              >
                <BookOpen size={20} className="text-white" />
              </div>
            </div>
            
            {/* Collapsed Course Icons */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center gap-3 w-full px-4 custom-scrollbar">
              {skillCards.slice(0, 6).map((skill, idx) => {
                const Icon = skill.icon;
                const isSelected = selectedSkill === idx;
                return (
                  <div
                    key={skill.id}
                    onClick={() => {
                      setSelectedSkill(idx);
                      setIsCoursePanelCollapsed(false);
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 ${
                      isSelected ? 'shadow-lg' : ''
                    }`}
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${colors[skill.color].base}, ${colors[skill.color].light})`
                        : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      border: isSelected ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                    }}
                    title={skill.subject}
                  >
                    <Icon size={20} className={isSelected ? 'text-white' : theme.textSecondary} strokeWidth={2} />
                  </div>
                );
              })}
              {skillCards.length > 6 && (
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${theme.textTertiary} text-xs font-medium`}
                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                  onClick={() => setIsCoursePanelCollapsed(false)}
                >
                  +{skillCards.length - 6}
                </div>
              )}
            </div>

            {/* Collapsed Create Button */}
            <button
              onClick={() => {
                setIsCoursePanelCollapsed(false);
                setTimeout(() => setShowCreateCourseModal(true), 300);
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 mt-auto"
              style={{ 
                background: `linear-gradient(135deg, ${colors[currentSkill?.color || 'sage'].base}, ${colors[currentSkill?.color || 'sage'].light})`
              }}
              title="Create Course"
            >
              <Plus size={20} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <>
            {/* Expanded Header */}
            <header className="p-8 pb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight mb-1.5">Your Courses</h1>
                  <p className={`text-sm ${theme.textSecondary} font-medium`}>
                    {skillCards.length} active · {Math.max(...skillCards.map(c => c.streak), 0)} day streak 🔥
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateCourseModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors[currentSkill?.color || 'sage'].base}, ${colors[currentSkill?.color || 'sage'].light})`,
                    color: 'white'
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Create</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textTertiary} transition-colors duration-200`} size={18} strokeWidth={2} />
                <input 
                  className={`w-full ${theme.input} border ${theme.border} rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none transition-all duration-200`}
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  style={{
                    transition: 'all 0.2s, border-color 0.2s, background-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = `${colors[currentSkill?.color || 'sage'].base}4D`;
                    e.target.style.backgroundColor = colors[currentSkill?.color || 'sage'].glow;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.backgroundColor = '';
                  }}
                  placeholder="Search your courses..."
                />
              </div>
            </header>

            {/* Course cards */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
              {filteredCourses.length === 0 ? (
                <div className={`text-center py-12 ${theme.textTertiary}`}>
                  <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No courses found</p>
                  <button
                    onClick={() => setShowCreateCourseModal(true)}
                    className="mt-4 text-sm font-medium hover:underline"
                    style={{ color: colors[currentSkill?.color || 'sage'].base }}
                  >
                    Create your first course
                  </button>
                </div>
              ) : (
                filteredCourses.map((skill, idx) => {
                const Icon = skill.icon;
                const actualIndex = skillCards.findIndex(s => s.id === skill.id);
                const isSelected = selectedSkill === actualIndex;
            
            return (
              <div
                key={skill.id}
                onClick={() => setSelectedSkill(actualIndex)}
                className={`group relative p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
                  isSelected 
                    ? `${theme.surfaceElevated} shadow-xl` 
                    : `${theme.surface} ${theme.border} ${theme.surfaceHover}`
                }`}
                style={isSelected ? { 
                  borderColor: `${colors[skill.color].base}33`,
                  boxShadow: `0 8px 32px ${colors[skill.color].glow}, 0 0 0 1px ${colors[skill.color].base}20` 
                } : {}}
              >
                {/* Edit/Delete buttons - show on hover */}
                <div className={`absolute top-4 right-4 flex items-center gap-1 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button
                    onClick={(e) => handleEditCourse(skill, e)}
                    className={`p-2 rounded-lg transition-all duration-200 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                    title="Edit course"
                  >
                    <Edit3 size={14} className={theme.textSecondary} />
                  </button>
                  {skill.isCustom && (
                    <button
                      onClick={(e) => handleDeleteCourse(skill.id, e)}
                      className={`p-2 rounded-lg transition-all duration-200 hover:bg-red-500/20`}
                      title="Delete course"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  )}
                </div>

                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300`}
                    style={{ 
                      background: isSelected ? `linear-gradient(135deg, ${colors[skill.color].base}, ${colors[skill.color].light})` : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                    }}
                  >
                    <Icon size={24} className={isSelected ? 'text-white' : theme.textSecondary} strokeWidth={2} />
                  </div>
                  
                  <div className="flex items-center gap-3 mr-16">
                    {/* Custom badge */}
                    {skill.isCustom && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
                        <Sparkles size={10} />
                        Custom
                      </div>
                    )}
                    {/* Streak indicator */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                      <div 
                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? '' : 'bg-orange-400'}`}
                        style={isSelected ? { backgroundColor: colors[skill.color].base } : {}}
                      />
                      <span className={`text-xs font-semibold ${theme.textSecondary}`}>{skill.streak}d</span>
                    </div>
                    
                    {/* Progress badge */}
                    <div 
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-300`}
                      style={isSelected ? { 
                        background: `linear-gradient(135deg, ${colors[skill.color].base}, ${colors[skill.color].light})`,
                        color: 'white'
                      } : { 
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        color: isDark ? '#A8A6A3' : '#5A5856'
                      }}
                    >
                      {skill.progress}%
                    </div>
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-semibold text-base mb-1.5 tracking-tight leading-snug">{skill.subject}</h3>
                <p className={`text-sm ${theme.textSecondary} mb-4 leading-relaxed`}>{skill.module}</p>

                {/* Progress section */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className={theme.textTertiary}>Next milestone</span>
                    <span 
                      className={`font-medium ${isSelected ? '' : theme.textSecondary}`}
                      style={isSelected ? { color: colors[skill.color].base } : {}}
                    >
                      {skill.nextUp}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out`}
                      style={{ 
                        width: `${skill.progress}%`,
                        background: isSelected ? `linear-gradient(90deg, ${colors[skill.color].base}, ${colors[skill.color].light})` : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                      }}
                    />
                  </div>
                </div>

                {/* Topics */}
                <div className="flex flex-wrap gap-2">
                  {skill.topics.map(topic => (
                    <span 
                      key={topic} 
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                        isSelected 
                          ? 'border'
                          : isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-black/[0.04] text-gray-600'
                      }`}
                      style={isSelected ? { 
                        color: colors[skill.color].dark,
                        borderColor: `${colors[skill.color].base}33`,
                        background: colors[skill.color].glow 
                      } : {}}
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                {/* Hover indicator */}
                {!isSelected && (
                  <ChevronRight 
                    size={18} 
                    className={`absolute right-6 top-1/2 -translate-y-1/2 ${theme.textTertiary} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} 
                    strokeWidth={2}
                  />
                )}
              </div>
            );
          }))}
            </div>
          </>
        )}
      </section>

      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl ${theme.surface} border ${theme.border} shadow-2xl flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Create New Course</h2>
                  <p className={`text-xs ${theme.textSecondary}`}>AI will generate your curriculum</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateCourseModal(false);
                  setNewCourseTitle('');
                  setNewCourseObjective('');
                  setGeneratedCurriculum(null);
                }}
                className={`p-2 rounded-lg ${theme.surfaceHover} transition-colors`}
              >
                <X size={20} className={theme.textSecondary} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!generatedCurriculum ? (
                <>
                  {/* Course Title Input */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme.textSecondary}`}>
                      Course Title *
                    </label>
                    <input
                      type="text"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                      placeholder="e.g., Master Kubernetes for ML Deployment"
                      className={`w-full px-4 py-3 rounded-xl ${theme.input} border ${theme.border} outline-none text-sm transition-all focus:ring-2 focus:ring-purple-500/30`}
                    />
                  </div>

                  {/* Learning Objective Input */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme.textSecondary}`}>
                      Learning Objective (Optional)
                    </label>
                    <textarea
                      value={newCourseObjective}
                      onChange={(e) => setNewCourseObjective(e.target.value)}
                      placeholder="What do you want to achieve? e.g., Deploy ML models at scale using Kubernetes..."
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl ${theme.input} border ${theme.border} outline-none text-sm resize-none transition-all focus:ring-2 focus:ring-purple-500/30`}
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateCurriculum}
                    disabled={!newCourseTitle.trim() || isGenerating}
                    className={`w-full py-4 rounded-xl font-medium text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                      !newCourseTitle.trim() || isGenerating 
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Generating Curriculum...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Generate with AI</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Generated Curriculum Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{generatedCurriculum.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
                          {generatedCurriculum.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-600'}`}>
                          <Clock size={12} />
                          {generatedCurriculum.totalTime}
                        </span>
                      </div>
                    </div>
                    
                    <p className={`text-sm ${theme.textSecondary}`}>{generatedCurriculum.description}</p>

                    {/* Modules */}
                    <div className="space-y-3 mt-4">
                      <h4 className={`text-sm font-medium ${theme.textSecondary}`}>Modules</h4>
                      {generatedCurriculum.modules?.map((module, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-xl border ${theme.border} ${theme.input}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{idx + 1}. {module.moduleTitle}</span>
                            <span className={`text-xs ${theme.textSecondary}`}>{module.estimatedTime}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {module.topics?.map((topic, tIdx) => (
                              <span 
                                key={tIdx}
                                className={`px-2 py-0.5 rounded-md text-xs ${isDark ? 'bg-white/5 text-gray-400' : 'bg-black/5 text-gray-600'}`}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setGeneratedCurriculum(null)}
                      className={`flex-1 py-3 rounded-xl font-medium border ${theme.border} ${theme.surfaceHover} transition-all`}
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={handleSaveCourse}
                      className="flex-1 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      Save Course
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditCourseModal && editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl ${theme.surface} border ${theme.border} shadow-2xl flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors[editingCourse.color].base}, ${colors[editingCourse.color].light})` }}
                >
                  <Edit3 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Edit Course</h2>
                  <p className={`text-xs ${theme.textSecondary}`}>Customize your learning path</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditCourseModal(false);
                  setEditingCourse(null);
                }}
                className={`p-2 rounded-lg ${theme.surfaceHover} transition-colors`}
              >
                <X size={20} className={theme.textSecondary} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Course Title */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme.textSecondary}`}>Course Title</label>
                <input
                  type="text"
                  value={editingCourse.subject}
                  onChange={(e) => setEditingCourse({ ...editingCourse, subject: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${theme.input} border ${theme.border} outline-none text-sm`}
                />
              </div>

              {/* Current Module */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme.textSecondary}`}>Current Module</label>
                <input
                  type="text"
                  value={editingCourse.module}
                  onChange={(e) => setEditingCourse({ ...editingCourse, module: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${theme.input} border ${theme.border} outline-none text-sm`}
                />
              </div>

              {/* Description (if custom course) */}
              {editingCourse.description !== undefined && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme.textSecondary}`}>Description</label>
                  <textarea
                    value={editingCourse.description || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                    rows={2}
                    className={`w-full px-4 py-3 rounded-xl ${theme.input} border ${theme.border} outline-none text-sm resize-none`}
                  />
                </div>
              )}

              {/* Topics */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme.textSecondary}`}>Quick Topics</label>
                <div className="flex flex-wrap gap-2">
                  {editingCourse.topics?.map((topic, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => {
                          const newTopics = [...editingCourse.topics];
                          newTopics[idx] = e.target.value;
                          setEditingCourse({ ...editingCourse, topics: newTopics });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs ${theme.input} border ${theme.border} outline-none w-24`}
                      />
                      <button
                        onClick={() => {
                          const newTopics = editingCourse.topics.filter((_, i) => i !== idx);
                          setEditingCourse({ ...editingCourse, topics: newTopics });
                        }}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <X size={12} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditingCourse({ ...editingCourse, topics: [...(editingCourse.topics || []), 'New'] })}
                    className={`px-3 py-1.5 rounded-lg text-xs ${theme.border} border border-dashed ${theme.textSecondary} hover:border-solid transition-all`}
                  >
                    + Add Topic
                  </button>
                </div>
              </div>

              {/* Modules (if custom course with modules) */}
              {editingCourse.modules && editingCourse.modules.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`text-sm font-medium ${theme.textSecondary}`}>Modules</label>
                    <button
                      onClick={addModule}
                      className="text-xs font-medium text-purple-400 hover:text-purple-300"
                    >
                      + Add Module
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editingCourse.modules.map((module, moduleIdx) => (
                      <div key={moduleIdx} className={`p-4 rounded-xl border ${theme.border} ${theme.input}`}>
                        <div className="flex items-center gap-2 mb-3">
                          {/* Reorder controls */}
                          <div className="flex flex-col gap-0.5">
                            <button 
                              onClick={() => moveModule(moduleIdx, -1)}
                              disabled={moduleIdx === 0}
                              className={`p-0.5 rounded ${moduleIdx === 0 ? 'opacity-30' : 'hover:bg-white/10'}`}
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button 
                              onClick={() => moveModule(moduleIdx, 1)}
                              disabled={moduleIdx === editingCourse.modules.length - 1}
                              className={`p-0.5 rounded ${moduleIdx === editingCourse.modules.length - 1 ? 'opacity-30' : 'hover:bg-white/10'}`}
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          
                          {/* Module title */}
                          <input
                            type="text"
                            value={module.moduleTitle}
                            onChange={(e) => updateModule(moduleIdx, 'moduleTitle', e.target.value)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm ${theme.input} border ${theme.border} outline-none`}
                          />
                          
                          {/* Time */}
                          <input
                            type="text"
                            value={module.estimatedTime}
                            onChange={(e) => updateModule(moduleIdx, 'estimatedTime', e.target.value)}
                            className={`w-16 px-2 py-2 rounded-lg text-xs text-center ${theme.input} border ${theme.border} outline-none`}
                            placeholder="2h"
                          />
                          
                          {/* Delete module */}
                          <button
                            onClick={() => removeModule(moduleIdx)}
                            className="p-2 rounded-lg hover:bg-red-500/20"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                        
                        {/* Topics */}
                        <div className="flex flex-wrap gap-1.5 ml-6">
                          {module.topics?.map((topic, topicIdx) => (
                            <div key={topicIdx} className="flex items-center gap-0.5">
                              <input
                                type="text"
                                value={topic}
                                onChange={(e) => updateTopic(moduleIdx, topicIdx, e.target.value)}
                                className={`px-2 py-1 rounded text-xs ${theme.input} border ${theme.border} outline-none w-20`}
                              />
                              <button
                                onClick={() => removeTopicFromModule(moduleIdx, topicIdx)}
                                className="p-0.5 rounded hover:bg-red-500/20"
                              >
                                <X size={10} className="text-red-400" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addTopicToModule(moduleIdx)}
                            className={`px-2 py-1 rounded text-xs border border-dashed ${theme.border} ${theme.textTertiary} hover:border-solid`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Picker */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme.textSecondary}`}>Color Theme</label>
                <div className="flex gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditingCourse({ ...editingCourse, color })}
                      className={`w-10 h-10 rounded-xl transition-all duration-200 ${editingCourse.color === color ? 'ring-2 ring-offset-2 ring-offset-[#1A1918]' : ''}`}
                      style={{ 
                        background: `linear-gradient(135deg, ${colors[color].base}, ${colors[color].light})`,
                        ringColor: colors[color].base
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => {
                  setShowEditCourseModal(false);
                  setEditingCourse(null);
                }}
                className={`flex-1 py-3 rounded-xl font-medium border ${theme.border} ${theme.surfaceHover} transition-all`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${colors[editingCourse.color].base}, ${colors[editingCourse.color].light})` }}
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Panel */}
      <section className="flex-1 flex flex-col transition-all duration-300">
        {/* Dynamic Header */}
        <header className={`h-20 ${theme.surface} border-b ${theme.border} flex items-center justify-between px-10`}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300`}
                style={{ background: `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` }}
              >
                {activeNav === 'Learn' && <BookOpen size={22} className="text-white" strokeWeight={2} />}
                {activeNav === 'Mentor' && <Brain size={22} className="text-white" strokeWeight={2} />}
                {activeNav === 'Goals' && <Target size={22} className="text-white" strokeWeight={2} />}
                {activeNav === 'Analytics' && <BarChart3 size={22} className="text-white" strokeWeight={2} />}
                {activeNav === 'Lab' && <Beaker size={22} className="text-white" strokeWeight={2} />}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1A1918] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold tracking-tight mb-0.5">
                  {activeNav === 'Learn' && 'Interactive Learning'}
                  {activeNav === 'Mentor' && 'AI Study Partner'}
                  {activeNav === 'Goals' && 'Learning Objectives'}
                  {activeNav === 'Analytics' && 'Progress Analytics'}
                  {activeNav === 'Lab' && 'Feature Laboratory'}
                </h2>
                {/* Course Indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full"
                       style={{ backgroundColor: colors[currentSkill.color].base }}></div>
                  <span className="text-xs font-medium px-2 py-1 rounded-lg" 
                        style={{ 
                          backgroundColor: `${colors[currentSkill.color].base}15`,
                          color: colors[currentSkill.color].base 
                        }}>
                    {currentSkill.subject}
                  </span>
                  {currentSkill.isCustom && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                      Custom
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {activeNav === 'Learn' && 'Adaptive content mode'}
                {activeNav === 'Mentor' && 'Active learning mode'} 
                {activeNav === 'Goals' && 'Progress tracking'}
                {activeNav === 'Analytics' && 'Data insights'}
                {activeNav === 'Lab' && 'Advanced features'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}>
              <Calendar size={15} strokeWidth={2} />
              <span className="text-xs font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        {activeNav === 'Mentor' && <MentorPanel 
          chatHistory={chatHistory}
          currentSkill={currentSkill}
          colors={colors}
          theme={theme}
          vivaMode={vivaMode}
          message={message}
          setMessage={setMessage}
          inputFocused={inputFocused}
          setInputFocused={setInputFocused}
          loading={loading}
          handleSendMessage={handleSendMessage}
          handleVivaResponse={handleVivaResponse}
          handleKeyPress={handleKeyPress}
          handleTranslateConcept={handleTranslateConcept}
          toggleLanguageSelector={toggleLanguageSelector}
          handleTranslateMessage={handleTranslateMessage}
          showLanguageSelector={showLanguageSelector}
          handleGetDailyReview={handleGetDailyReview}
          handleSubmitWork={handleSubmitWork}
          messagesEndRef={messagesEndRef}
          isRecording={isRecording}
          startVoiceRecording={startVoiceRecording}
          stopVoiceRecording={stopVoiceRecording}
          voiceLanguage={voiceLanguage}
          setVoiceLanguage={setVoiceLanguage}
          showVoiceLanguageMenu={showVoiceLanguageMenu}
          setShowVoiceLanguageMenu={setShowVoiceLanguageMenu}
          voiceLanguages={voiceLanguages}
        />}

        {activeNav === 'Lab' && <LabPanel 
          currentSkill={currentSkill}
          colors={colors}
          theme={theme}
          handleTranslateConcept={handleTranslateConcept}
          toggleLanguageSelector={toggleLanguageSelector}
          handleTranslateMessage={handleTranslateMessage}
          showLanguageSelector={showLanguageSelector}
          handleGetDailyReview={handleGetDailyReview}
          handleSubmitWork={handleSubmitWork}
          evaluateWork={evaluateWork}
          uploadDocument={uploadDocument}
          handleUploadDocument={handleUploadDocument}
          loading={loading}
        />}

        {activeNav === 'Analytics' && <AnalyticsPanel 
          currentSkill={currentSkill}
          colors={colors}
          theme={theme}
          skillCards={skillCards}
          dailyQueue={dailyQueue}
        />}

        {activeNav === 'Goals' && <GoalsPanel 
          currentSkill={currentSkill}
          colors={colors}
          theme={theme}
          skillCards={skillCards}
        />}

        {activeNav === 'Documents' && <DocumentsPanel 
          documentChatHistory={documentChatHistory}
          currentSkill={currentSkill}
          colors={colors}
          theme={theme}
          documentMessage={documentMessage}
          setDocumentMessage={setDocumentMessage}
          documentInputFocused={documentInputFocused}
          setDocumentInputFocused={setDocumentInputFocused}
          loading={loading}
          handleAskDocumentQuestion={handleAskDocumentQuestion}
          handleUploadDocumentInChat={handleUploadDocumentInChat}
          handleDocumentKeyPress={handleDocumentKeyPress}
          toggleLanguageSelector={toggleLanguageSelector}
          handleTranslateDocumentMessage={handleTranslateDocumentMessage}
          showLanguageSelector={showLanguageSelector}
          documentMessagesEndRef={documentMessagesEndRef}
          isDocumentRecording={isDocumentRecording}
          startDocumentVoiceRecording={startDocumentVoiceRecording}
          stopDocumentVoiceRecording={stopDocumentVoiceRecording}
          documentVoiceLanguage={documentVoiceLanguage}
          setDocumentVoiceLanguage={setDocumentVoiceLanguage}
          showDocumentVoiceLanguageMenu={showDocumentVoiceLanguageMenu}
          setShowDocumentVoiceLanguageMenu={setShowDocumentVoiceLanguageMenu}
          voiceLanguages={voiceLanguages}
        />}
        
        {activeNav === 'Learn' && <LearnPanel 
          currentSkill={currentSkill}
          colors={colors}
          theme={theme}
          skillCards={skillCards}
        />}
      </section>
    </div>
  );
};

// Reusable components
const NavButton = ({ icon: Icon, label, active, onClick, theme, currentColor }) => (
  <button
    onClick={onClick}
    className={`relative w-full h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group ${
      active 
        ? 'text-white shadow-lg' 
        : `${theme.textTertiary} ${theme.surfaceHover}`
    }`}
    style={active ? { background: `linear-gradient(135deg, ${currentColor.base}, ${currentColor.light})` } : {}}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <Tooltip text={label} />
  </button>
);

const Tooltip = ({ text }) => (
  <div className={`absolute left-full ml-4 px-3 py-2 rounded-xl bg-[#1A1918] border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-50 text-xs font-semibold text-white`}>
    {text}
  </div>
);

const ActionButton = ({ icon: Icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-all duration-200 group`}
  >
    <Icon size={15} className="text-gray-400 group-hover:text-gray-300 transition-colors" strokeWidth={2} />
    <span className="text-xs font-medium text-gray-400 group-hover:text-gray-300 transition-colors">{label}</span>
  </button>
);

// Format AI text responses with paragraphs, bullets, and styling
// CodeBlock component with copy functionality
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e2e]">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d3d] border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:bg-white/10"
          style={{ color: copied ? '#4ade80' : '#9ca3af' }}
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-gray-200 font-mono whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
};

const formatAIContent = (content) => {
  if (!content) return null;
  
  // First, extract code blocks and replace with placeholders
  const codeBlocks = [];
  let processedContent = content;
  
  // Match code blocks with optional language specifier: ```language\n...code...```
  const codeBlockRegex = /```(\w*)?\n?([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || '';
    const code = match[2].trim();
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ language, code, placeholder });
    processedContent = processedContent.replace(match[0], `\n${placeholder}\n`);
  }
  
  const lines = processedContent.split('\n');
  const formattedElements = [];
  let currentParagraph = [];
  let elementKey = 0;
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        formattedElements.push(
          <p key={`p-${elementKey++}`} className="mb-3">
            {formatInlineStyles(text)}
          </p>
        );
      }
      currentParagraph = [];
    }
  };
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Check for code block placeholder
    const codeBlockMatch = trimmed.match(/^__CODE_BLOCK_(\d+)__$/);
    if (codeBlockMatch) {
      flushParagraph();
      const blockIndex = parseInt(codeBlockMatch[1]);
      const block = codeBlocks[blockIndex];
      formattedElements.push(
        <CodeBlock key={`code-${elementKey++}`} code={block.code} language={block.language} />
      );
      return;
    }
    
    // Check for horizontal separator
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushParagraph();
      formattedElements.push(
        <hr key={`hr-${elementKey++}`} className="my-4 border-t border-white/10" />
      );
      return;
    }
    
    // Check for bullet points (*, -, •, numbered)
    const bulletMatch = trimmed.match(/^([*\-•]|\d+\.)\s+(.+)$/);
    
    if (bulletMatch) {
      flushParagraph();
      formattedElements.push(
        <div key={`li-${elementKey++}`} className="flex gap-2 mb-2 ml-2">
          <span className="text-gray-400 mt-0.5">•</span>
          <span className="flex-1">{formatInlineStyles(bulletMatch[2])}</span>
        </div>
      );
    } else if (trimmed.length > 0) {
      currentParagraph.push(trimmed);
    } else {
      flushParagraph();
    }
  });
  
  // Flush remaining paragraph
  flushParagraph();
  
  return <div className="formatted-content">{formattedElements}</div>;
};

// Format inline styles (bold, italic, inline code)
const formatInlineStyles = (text) => {
  if (!text) return text;
  
  // Combined regex to handle **bold**, *italic*, and `inline code`
  const combinedRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)/g;
  const parts = [];
  let lastIndex = 0;
  let key = 0;
  let match;
  
  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    if (match[1]) {
      // Bold text (**...**)
      parts.push(<strong key={`b-${key++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      // Italic text (*...*)
      parts.push(<em key={`i-${key++}`}>{match[4]}</em>);
    } else if (match[5]) {
      // Inline code (`...`)
      parts.push(
        <code 
          key={`c-${key++}`} 
          className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[0.9em]"
        >
          {match[6]}
        </code>
      );
    }
    
    lastIndex = combinedRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

// Feature Panel Components
const MentorPanel = ({ 
  chatHistory, currentSkill, colors, theme, vivaMode, message, setMessage,
  inputFocused, setInputFocused, loading, handleSendMessage, handleVivaResponse,
  handleKeyPress, handleTranslateConcept, toggleLanguageSelector, handleTranslateMessage, showLanguageSelector, handleGetDailyReview, handleSubmitWork, messagesEndRef,
  isRecording, startVoiceRecording, stopVoiceRecording, voiceLanguage, setVoiceLanguage, showVoiceLanguageMenu, setShowVoiceLanguageMenu, voiceLanguages
}) => (
  <>
    {/* Chat area */}
    <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
      {/* Course Context Card */}
      <div 
        className={`rounded-3xl p-7 border transition-all duration-300`}
        style={{ 
          background: `linear-gradient(135deg, ${colors[currentSkill.color].glow}, ${colors[currentSkill.color].glow}50)`,
          borderColor: `${colors[currentSkill.color].base}20`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` }}
            >
              <currentSkill.icon size={20} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                {currentSkill.subject}
                {currentSkill.isCustom && (
                  <span className="text-xs px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 font-medium">
                    Custom Course
                  </span>
                )}
              </h3>
              <p className={`text-xs ${theme.textSecondary}`}>Active course for chat</p>
            </div>
          </div>
          <div className="text-right">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse mb-1"></div>
            <span className="text-xs font-medium text-green-400">LIVE</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${theme.textSecondary}`}>Module:</span>
            <span className="text-sm font-medium">{currentSkill.module}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${theme.textSecondary}`}>Focus:</span>
            <span className="text-sm font-medium" style={{ color: colors[currentSkill.color].base }}>{currentSkill.nextUp}</span>
          </div>
          {currentSkill.topics && currentSkill.topics.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme.textSecondary}`}>Topics:</span>
              <div className="flex gap-1 flex-wrap">
                {currentSkill.topics.map((topic, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/70 font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className={`text-sm ${theme.textSecondary} leading-relaxed`}>
            You're {currentSkill.progress}% through this course. All my responses will be tailored to <strong>{currentSkill.subject}</strong> concepts and methodology.
          </p>
        </div>
      </div>

      {/* Chat messages */}
      {chatHistory.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] group ${msg.role === 'ai' ? `${theme.surfaceElevated} border ${theme.border} shadow-sm` : ''} rounded-3xl p-6 transition-all duration-200`}
               style={msg.role === 'user' ? { background: `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` } : {}}>
            {msg.role === 'ai' && (
              <div className="flex items-center gap-2.5 mb-3">
                <Brain size={15} style={{ color: colors[currentSkill.color].base }} strokeWidth={2} />
                <span className={`text-xs font-bold uppercase tracking-wider`} style={{ color: colors[currentSkill.color].base }}>Mentor</span>
                <span className={`text-xs ${theme.textTertiary} ml-auto`}>{msg.timestamp}</span>
              </div>
            )}
            
            <div className={`text-sm leading-relaxed ${msg.role === 'ai' ? theme.text : 'text-white'}`}>
              {msg.role === 'ai' ? formatAIContent(msg.content) : <p>{msg.content}</p>}
            </div>
            
            {msg.translatedTo && (
              <div className={`mt-2 text-xs ${theme.textTertiary} flex items-center gap-2`}>
                <Languages size={10} />
                <span>Translated to {msg.translatedTo}</span>
              </div>
            )}
            
            {msg.role === 'user' && (
              <div className="text-xs text-white/60 mt-3 text-right font-medium">{msg.timestamp}</div>
            )}

            {/* Feedback buttons for AI messages */}
            {msg.role === 'ai' && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.05]">
                <span className={`text-xs ${theme.textTertiary} mr-2`}>Helpful?</span>
                <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} flex items-center gap-1`}>
                  <CheckCircle2 size={12} className="text-green-500" />
                  Yes
                </button>
                <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} flex items-center gap-1`}>
                  <Circle size={12} className="text-red-500" />
                  No
                </button>
                
                {/* Language Selector - Always shown for AI messages */}
                <div className="relative">
                  <button 
                    onClick={() => toggleLanguageSelector(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} flex items-center gap-1 ${msg.translatedTo ? 'bg-blue-500/10' : ''}`}
                  >
                    <Languages size={12} className="text-blue-500" />
                    {msg.translatedTo ? `${msg.translatedTo}` : 'Translate'}
                  </button>
                  
                  {/* Language Selector Dropdown */}
                  {showLanguageSelector[idx] && (
                    <div className={`absolute bottom-full left-0 mb-2 ${theme.surfaceElevated} border ${theme.border} rounded-xl shadow-2xl p-3 z-50 min-w-[200px]`}>
                      <div className="text-xs font-bold text-gray-400 mb-2 px-2">Select Language</div>
                      <div className="space-y-1">
                        <button
                          onClick={() => handleTranslateMessage(idx, 'en', 'English')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇬🇧</span>
                          <span>English</span>
                        </button>
                        <button
                          onClick={() => handleTranslateMessage(idx, 'ta', 'Tamil')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Tamil</span>
                        </button>
                        <button
                          onClick={() => handleTranslateMessage(idx, 'hi', 'Hindi')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Hindi</span>
                        </button>
                        <button
                          onClick={() => handleTranslateMessage(idx, 'te', 'Telugu')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Telugu</span>
                        </button>
                        <button
                          onClick={() => handleTranslateMessage(idx, 'ml', 'Malayalam')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Malayalam</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      <div ref={messagesEndRef} />
    </div>

    {/* Input area */}
    <footer className={`p-8 border-t ${theme.border}`}>
      <div 
        className={`${theme.surfaceElevated} border rounded-3xl p-5 shadow-lg transition-all duration-300 ${
          inputFocused ? 'ring-2' : ''
        }`}
        style={inputFocused ? { 
          ringColor: `${colors[currentSkill.color].base}40`,
          borderColor: `${colors[currentSkill.color].base}30`
        } : {}}
      >
        <textarea 
          className={`w-full bg-transparent outline-none text-sm resize-none ${theme.text} placeholder:${theme.textTertiary} leading-relaxed`}
            placeholder={vivaMode ? "Please explain your approach..." : "Ask me anything about your studies..."}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          
          {vivaMode && (
            <div className={`mt-3 p-3 rounded-xl border ${theme.border} bg-orange-500/10`}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-orange-500" />
                <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Mini-Viva Session</span>
              </div>
              <p className="text-xs text-orange-400">Please explain your solution approach to verify your understanding.</p>
            </div>
          )}
          
          <div className={`flex items-center justify-between mt-4 pt-4 border-t ${theme.borderSubtle}`}>
            <div className="flex items-center gap-2">
              <ActionButton 
                icon={Sparkles} 
                label="Hint" 
                color={colors[currentSkill.color]} 
                onClick={() => handleTranslateConcept(currentSkill.nextUp)}
              />
              <ActionButton 
                icon={TrendingUp} 
                label="Review" 
                color={colors[currentSkill.color]} 
                onClick={handleGetDailyReview}
              />
              <ActionButton 
                icon={Upload} 
                label="Submit" 
                color={colors[currentSkill.color]} 
                onClick={() => {
                  const work = prompt('Enter your work/solution:');
                  if (work) handleSubmitWork(work);
                }}
              />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Voice Recording Button with Language Selector */}
              <div className="relative">
                <button 
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                  }`}
                  title={`Voice Input (${voiceLanguages[voiceLanguage]})`}
                >
                  {isRecording ? <MicOff size={16} strokeWidth={2.5} /> : <Mic size={16} strokeWidth={2.5} />}
                  <span className="text-xs">{isRecording ? 'Stop' : 'Voice'}</span>
                </button>
                
                {/* Language Selector for Voice */}
                {!isRecording && (
                  <button
                    onClick={() => setShowVoiceLanguageMenu(!showVoiceLanguageMenu)}
                    className={`absolute -top-8 right-0 px-2 py-1 rounded-lg text-xs ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
                    title="Select voice language"
                  >
                    {voiceLanguages[voiceLanguage]}
                  </button>
                )}
                
                {/* Voice Language Dropdown */}
                {showVoiceLanguageMenu && !isRecording && (
                  <div className={`absolute bottom-full right-0 mb-2 ${theme.surfaceElevated} border ${theme.border} rounded-xl shadow-2xl p-2 z-50 min-w-[150px]`}>
                    <div className="text-xs font-bold text-gray-400 mb-2 px-2">Voice Language</div>
                    {Object.entries(voiceLanguages).map(([code, name]) => (
                      <button
                        key={code}
                        onClick={() => {
                          setVoiceLanguage(code);
                          setShowVoiceLanguageMenu(false);
                        }}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors ${
                          voiceLanguage === code ? 'bg-blue-500/20 font-semibold' : ''
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={vivaMode ? () => { handleVivaResponse(message); setMessage(''); } : handleSendMessage}
                disabled={loading || !message.trim()}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                style={{ background: vivaMode ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` }}
              >
                <Send size={16} strokeWidth={2.5} />
                {loading ? 'Thinking...' : vivaMode ? 'Submit Answer' : 'Send'}
              </button>
            </div>
          </div>
      </div>
      
      {/* Quick tips */}
      <div className={`flex items-center gap-2 mt-4 text-xs ${theme.textTertiary}`}>
        <span>Try:</span>
        <button 
          onClick={() => handleTranslateConcept(currentSkill.nextUp)}
          className={`px-3 py-1.5 rounded-lg ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} transition-all duration-200`}
        >
          Explain this concept
        </button>
        <button 
          onClick={handleGetDailyReview}
          className={`px-3 py-1.5 rounded-lg ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} transition-all duration-200`}
        >
          Daily Review
        </button>
      </div>
    </footer>
  </>
);

const DocumentsPanel = ({ 
  documentChatHistory, currentSkill, colors, theme, documentMessage, setDocumentMessage,
  documentInputFocused, setDocumentInputFocused, loading, handleAskDocumentQuestion,
  handleUploadDocumentInChat, handleDocumentKeyPress, toggleLanguageSelector, 
  handleTranslateDocumentMessage, showLanguageSelector, documentMessagesEndRef,
  isDocumentRecording, startDocumentVoiceRecording, stopDocumentVoiceRecording, documentVoiceLanguage, setDocumentVoiceLanguage, showDocumentVoiceLanguageMenu, setShowDocumentVoiceLanguageMenu, voiceLanguages
}) => (
  <>
    {/* Chat area */}
    <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
      {/* Context card */}
      <div 
        className={`rounded-3xl p-7 border transition-all duration-300`}
        style={{ 
          background: `linear-gradient(135deg, ${colors[currentSkill.color].glow}, ${colors[currentSkill.color].glow}50)`,
          borderColor: `${colors[currentSkill.color].base}20`
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <FileText size={20} style={{ color: colors[currentSkill.color].base }} strokeWidth={2} />
          <h3 className="font-semibold text-base">RAG Document Chat</h3>
        </div>
        <p className={`text-sm ${theme.textSecondary} leading-relaxed`}>
          Upload your study materials (PDF, TXT) and ask me questions about them. I'll search through your documents and provide accurate answers with source references.
        </p>
      </div>

      {/* Chat messages */}
      {documentChatHistory.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] group ${msg.role === 'ai' ? `${theme.surfaceElevated} border ${theme.border} shadow-sm` : ''} rounded-3xl p-6 transition-all duration-200`}
               style={msg.role === 'user' ? { background: `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` } : {}}>
            {msg.role === 'ai' && (
              <div className="flex items-center gap-2.5 mb-3">
                <FileText size={15} style={{ color: colors[currentSkill.color].base }} strokeWidth={2} />
                <span className={`text-xs font-bold uppercase tracking-wider`} style={{ color: colors[currentSkill.color].base }}>RAG Assistant</span>
                <span className={`text-xs ${theme.textTertiary} ml-auto`}>{msg.timestamp}</span>
              </div>
            )}
            
            <div className={`text-sm leading-relaxed ${msg.role === 'ai' ? theme.text : 'text-white'}`}>
              {msg.role === 'ai' ? formatAIContent(msg.content) : <p>{msg.content}</p>}
            </div>
            
            {msg.translatedTo && (
              <div className={`mt-2 text-xs ${theme.textTertiary} flex items-center gap-2`}>
                <Languages size={10} />
                <span>Translated to {msg.translatedTo}</span>
              </div>
            )}
            
            {msg.role === 'user' && (
              <div className="text-xs text-white/60 mt-3 text-right font-medium">{msg.timestamp}</div>
            )}

            {/* Feedback buttons for AI messages */}
            {msg.role === 'ai' && !msg.isUpload && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.05]">
                <span className={`text-xs ${theme.textTertiary} mr-2`}>Helpful?</span>
                <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} flex items-center gap-1`}>
                  <CheckCircle2 size={12} className="text-green-500" />
                  Yes
                </button>
                <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} flex items-center gap-1`}>
                  <Circle size={12} className="text-red-500" />
                  No
                </button>
                
                {/* Language Selector */}
                <div className="relative">
                  <button 
                    onClick={() => toggleLanguageSelector(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${theme.input} ${theme.surfaceHover} border ${theme.borderSubtle} flex items-center gap-1 ${msg.translatedTo ? 'bg-blue-500/10' : ''}`}
                  >
                    <Languages size={12} className="text-blue-500" />
                    {msg.translatedTo ? `${msg.translatedTo}` : 'Translate'}
                  </button>
                  
                  {/* Language Selector Dropdown */}
                  {showLanguageSelector[idx] && (
                    <div className={`absolute bottom-full left-0 mb-2 ${theme.surfaceElevated} border ${theme.border} rounded-xl shadow-2xl p-3 z-50 min-w-[200px]`}>
                      <div className="text-xs font-bold text-gray-400 mb-2 px-2">Select Language</div>
                      <div className="space-y-1">
                        <button
                          onClick={() => handleTranslateDocumentMessage(idx, 'en', 'English')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇬🇧</span>
                          <span>English</span>
                        </button>
                        <button
                          onClick={() => handleTranslateDocumentMessage(idx, 'ta', 'Tamil')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Tamil</span>
                        </button>
                        <button
                          onClick={() => handleTranslateDocumentMessage(idx, 'hi', 'Hindi')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Hindi</span>
                        </button>
                        <button
                          onClick={() => handleTranslateDocumentMessage(idx, 'te', 'Telugu')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Telugu</span>
                        </button>
                        <button
                          onClick={() => handleTranslateDocumentMessage(idx, 'ml', 'Malayalam')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors flex items-center gap-2`}
                        >
                          <span>🇮🇳</span>
                          <span>Malayalam</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      <div ref={documentMessagesEndRef} />
    </div>

    {/* Input area */}
    <footer className={`p-8 border-t ${theme.border}`}>
      {/* File Upload Section */}
      <div className="mb-4">
        <label 
          htmlFor="doc-upload"
          className={`flex items-center justify-center gap-3 w-full px-4 py-4 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
          }`}
          style={{ 
            borderColor: `${colors[currentSkill.color].base}40`,
            background: `${colors[currentSkill.color].glow}40`
          }}
        >
          <Upload size={20} style={{ color: colors[currentSkill.color].base }} />
          <div className="text-center">
            <span className="font-semibold text-sm" style={{ color: colors[currentSkill.color].base }}>
              {loading ? 'Uploading...' : 'Click to Upload Document'}
            </span>
            <p className={`text-xs ${theme.textTertiary} mt-1`}>PDF, TXT (max 16MB)</p>
          </div>
          <input 
            id="doc-upload"
            type="file"
            accept=".pdf,.txt"
            onChange={handleUploadDocumentInChat}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      <div 
        className={`${theme.surfaceElevated} border rounded-3xl p-5 shadow-lg transition-all duration-300 ${
          documentInputFocused ? 'ring-2' : ''
        }`}
        style={documentInputFocused ? { 
          ringColor: `${colors[currentSkill.color].base}40`,
          borderColor: `${colors[currentSkill.color].base}30`
        } : {}}
      >
        <textarea 
          className={`w-full bg-transparent outline-none text-sm resize-none ${theme.text} placeholder:${theme.textTertiary} leading-relaxed`}
          placeholder="Ask me anything about your uploaded documents..."
          rows={3}
          value={documentMessage}
          onChange={(e) => setDocumentMessage(e.target.value)}
          onFocus={() => setDocumentInputFocused(true)}
          onBlur={() => setDocumentInputFocused(false)}
          onKeyPress={handleDocumentKeyPress}
          disabled={loading}
        />
        
        <div className={`flex items-center justify-between mt-4 pt-4 border-t ${theme.borderSubtle}`}>
          <div className="flex items-center gap-2">
            {/* Voice Recording Button with Language Selector */}
            <div className="relative">
              <button 
                onClick={isDocumentRecording ? stopDocumentVoiceRecording : startDocumentVoiceRecording}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDocumentRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                }`}
                title={`Voice Input (${voiceLanguages[documentVoiceLanguage]})`}
              >
                {isDocumentRecording ? <MicOff size={16} strokeWidth={2.5} /> : <Mic size={16} strokeWidth={2.5} />}
                <span className="text-xs">{isDocumentRecording ? 'Stop' : 'Voice'}</span>
              </button>
              
              {/* Language Selector for Voice */}
              {!isDocumentRecording && (
                <button
                  onClick={() => setShowDocumentVoiceLanguageMenu(!showDocumentVoiceLanguageMenu)}
                  className={`absolute -top-8 right-0 px-2 py-1 rounded-lg text-xs ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
                  title="Select voice language"
                >
                  {voiceLanguages[documentVoiceLanguage]}
                </button>
              )}
              
              {/* Voice Language Dropdown */}
              {showDocumentVoiceLanguageMenu && !isDocumentRecording && (
                <div className={`absolute bottom-full right-0 mb-2 ${theme.surfaceElevated} border ${theme.border} rounded-xl shadow-2xl p-2 z-50 min-w-[150px]`}>
                  <div className="text-xs font-bold text-gray-400 mb-2 px-2">Voice Language</div>
                  {Object.entries(voiceLanguages).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setDocumentVoiceLanguage(code);
                        setShowDocumentVoiceLanguageMenu(false);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs ${theme.surfaceHover} hover:bg-blue-500/10 transition-colors ${
                        documentVoiceLanguage === code ? 'bg-blue-500/20 font-semibold' : ''
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => handleAskDocumentQuestion(documentMessage)}
            disabled={loading || !documentMessage.trim()}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            style={{ background: `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` }}
          >
            <Send size={16} strokeWidth={2.5} />
            {loading ? 'Searching...' : 'Ask Question'}
          </button>
        </div>
      </div>
      
      {/* Quick tips */}
      <div className={`flex items-center gap-2 mt-4 text-xs ${theme.textTertiary}`}>
        <span>💡 Tip:</span>
        <span>Upload your syllabus, lecture notes, or study materials to get instant answers with source citations.</span>
      </div>
    </footer>
  </>
);

const LabPanel = ({ currentSkill, colors, theme, handleTranslateConcept, toggleLanguageSelector, handleTranslateMessage, showLanguageSelector, handleGetDailyReview, handleSubmitWork, evaluateWork, uploadDocument, handleUploadDocument, loading }) => (
  <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
    {/* Header */}
    <div className={`rounded-3xl p-8 border transition-all duration-300`}
         style={{ 
           background: `linear-gradient(135deg, ${colors[currentSkill.color].glow}, ${colors[currentSkill.color].glow}50)`,
           borderColor: `${colors[currentSkill.color].base}20`
         }}>
      <h2 className="text-xl font-bold mb-4">🧪 Advanced Feature Laboratory</h2>
      <p className={`text-sm ${theme.textSecondary} mb-6`}>Access all advanced AI-powered learning features in one place.</p>
    </div>

    {/* Feature Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Socratic Coach */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <Brain size={24} style={{ color: colors[currentSkill.color].base }} strokeWidth={2} />
          <h3 className="font-semibold text-lg">Socratic Coach</h3>
        </div>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>Get guided hints instead of direct answers. Develops deep understanding through strategic questioning.</p>
        <div className="space-y-3">
          <button 
            onClick={() => handleTranslateConcept(currentSkill.nextUp)}
            className={`w-full px-4 py-3 rounded-xl text-left ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={16} style={{ color: colors[currentSkill.color].base }} />
              <span className="text-sm font-medium">Get Conceptual Hint</span>
            </div>
          </button>
          <button 
            onClick={() => handleTranslateConcept(currentSkill.nextUp + ' with examples')}
            className={`w-full px-4 py-3 rounded-xl text-left ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
          >
            <div className="flex items-center gap-3">
              <BookOpen size={16} style={{ color: colors[currentSkill.color].base }} />
              <span className="text-sm font-medium">Explain with Examples</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mini-Viva Testing */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare size={24} className="text-orange-500" strokeWidth={2} />
          <h3 className="font-semibold text-lg">Mini-Viva Testing</h3>
        </div>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>Submit your work and get tested with personalized viva questions to verify understanding.</p>
        <button 
          onClick={() => {
            const work = prompt('Enter your solution/code to submit for viva testing:');
            if (work) handleSubmitWork(work);
          }}
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50`}
          style={{ background: `linear-gradient(135deg, #f59e0b, #fbbf24)` }}
        >
          {loading ? 'Processing...' : 'Submit for Viva Test'}
        </button>
      </div>

      {/* Concept Translation */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <Languages size={24} className="text-blue-500" strokeWidth={2} />
          <h3 className="font-semibold text-lg">Concept Translation</h3>
        </div>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>Translate complex technical concepts into your native language with cultural context.</p>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleTranslateConcept(currentSkill.nextUp, 'en', { culturalContext: false })}
            className={`w-full px-4 py-3 rounded-xl text-center ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
          >
            <div className="text-lg mb-1">🇬🇧</div>
            <span className="text-xs font-medium">English</span>
          </button>
          <button 
            onClick={() => handleTranslateConcept(currentSkill.nextUp, 'ta', { culturalContext: true })}
            className={`w-full px-4 py-3 rounded-xl text-center ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
          >
            <div className="text-lg mb-1">🇮🇳</div>
            <span className="text-xs font-medium">Tamil</span>
          </button>
          <button 
            onClick={() => handleTranslateConcept(currentSkill.nextUp, 'hi', { culturalContext: true })}
            className={`w-full px-4 py-3 rounded-xl text-center ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
          >
            <div className="text-lg mb-1">🇮🇳</div>
            <span className="text-xs font-medium">Hindi</span>
          </button>
          <button 
            onClick={() => handleTranslateConcept(currentSkill.nextUp, 'te', { culturalContext: true })}
            className={`w-full px-4 py-3 rounded-xl text-center ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
          >
            <div className="text-lg mb-1">🇮🇳</div>
            <span className="text-xs font-medium">Telugu</span>
          </button>
          <button 
            onClick={() => handleTranslateConcept(currentSkill.nextUp, 'ml', { culturalContext: true })}
            className={`w-full px-4 py-3 rounded-xl text-center ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}
          >
            <div className="text-lg mb-1">🇮🇳</div>
            <span className="text-xs font-medium">Malayalam</span>
          </button>
        </div>
      </div>

      {/* Rubric Evaluation */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <Award size={24} className="text-green-500" strokeWidth={2} />
          <h3 className="font-semibold text-lg">Rubric Evaluation</h3>
        </div>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>Get detailed feedback based on academic rubrics and industry standards.</p>
        <button 
          onClick={async () => {
            const work = prompt('Enter your work for detailed evaluation:');
            if (work && evaluateWork) {
              try {
                await evaluateWork(work, 'academic');
              } catch (err) {
                alert('Evaluation feature will be available once you submit work through Mentor tab.');
              }
            }
          }}
          className={`w-full px-4 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105`}
          style={{ background: `linear-gradient(135deg, #10b981, #34d399)` }}
        >
          Evaluate My Work
        </button>
      </div>

      {/* Material Upload */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <Upload size={24} className="text-purple-500" strokeWidth={2} />
          <h3 className="font-semibold text-lg">Upload Materials</h3>
        </div>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>Upload your syllabus, notes, or study materials (PDF, TXT) for personalized AI assistance.</p>
        <label 
          htmlFor="file-upload"
          className={`block w-full px-4 py-3 rounded-xl text-white font-medium text-center cursor-pointer transition-all duration-300 hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ background: `linear-gradient(135deg, #8b5cf6, #a78bfa)` }}
        >
          <div className="flex items-center justify-center gap-2">
            <Upload size={18} />
            <span>{loading ? 'Uploading...' : 'Choose File to Upload'}</span>
          </div>
          <input 
            id="file-upload"
            type="file"
            accept=".pdf,.txt"
            onChange={handleUploadDocument}
            disabled={loading}
            className="hidden"
          />
        </label>
        <p className={`text-xs ${theme.textTertiary} mt-3 text-center`}>Supported: PDF, TXT (max 16MB)</p>
      </div>

      {/* Spaced Repetition */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <Calendar size={24} className="text-pink-500" strokeWidth={2} />
          <h3 className="font-semibold text-lg">Spaced Repetition</h3>
        </div>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>AI-powered review scheduling based on your learning patterns and retention rates.</p>
        <button 
          onClick={handleGetDailyReview}
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50`}
          style={{ background: `linear-gradient(135deg, #ec4899, #f472b6)` }}
        >
          {loading ? 'Loading...' : 'Get Daily Review Queue'}
        </button>
      </div>
    </div>
  </div>
);

const AnalyticsPanel = ({ currentSkill, colors, theme, skillCards, dailyQueue }) => (
  <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
    {/* Header */}
    <div className={`rounded-3xl p-8 border transition-all duration-300`}
         style={{ 
           background: `linear-gradient(135deg, ${colors[currentSkill.color].glow}, ${colors[currentSkill.color].glow}50)`,
           borderColor: `${colors[currentSkill.color].base}20`
         }}>
      <h2 className="text-xl font-bold mb-4">📊 Learning Analytics Dashboard</h2>
      <p className={`text-sm ${theme.textSecondary}`}>Insights into your learning patterns, progress trends, and AI interaction analytics.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Progress Overview */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <TrendingUp size={20} style={{ color: colors[currentSkill.color].base }} />
          Progress Overview
        </h3>
        <div className="space-y-4">
          {skillCards.map((skill, idx) => (
            <div key={skill.id} className="flex items-center justify-between">
              <span className="text-sm font-medium">{skill.subject}</span>
              <div className="flex items-center gap-3">
                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${skill.progress}%`,
                      background: `linear-gradient(90deg, ${colors[skill.color].base}, ${colors[skill.color].light})`
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{skill.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Interaction Stats */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Brain size={20} style={{ color: colors[currentSkill.color].base }} />
          AI Interaction Stats
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className={`text-sm ${theme.textSecondary}`}>Questions Asked</span>
            <span className="text-lg font-bold" style={{ color: colors[currentSkill.color].base }}>47</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${theme.textSecondary}`}>Viva Sessions</span>
            <span className="text-lg font-bold" style={{ color: colors[currentSkill.color].base }}>12</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${theme.textSecondary}`}>Concepts Translated</span>
            <span className="text-lg font-bold" style={{ color: colors[currentSkill.color].base }}>8</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${theme.textSecondary}`}>Evaluations</span>
            <span className="text-lg font-bold" style={{ color: colors[currentSkill.color].base }}>23</span>
          </div>
        </div>
      </div>

      {/* Learning Streaks */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Award size={20} className="text-orange-500" />
          Learning Streaks
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme.textSecondary}`}>Current Streak</span>
            <span className="text-2xl font-bold text-orange-500">12 days 🔥</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme.textSecondary}`}>Longest Streak</span>
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">18 days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme.textSecondary}`}>This Week</span>
            <span className="text-lg font-semibold" style={{ color: colors[currentSkill.color].base }}>7/7 days</span>
          </div>
        </div>
      </div>

      {/* Upcoming Reviews */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-pink-500" />
          Spaced Repetition Queue
        </h3>
        {dailyQueue && dailyQueue.length > 0 ? (
          <div className="space-y-2">
            {dailyQueue.slice(0, 5).map((item, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${theme.input} border ${theme.border}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.concept || item.topic || 'Review Item'}</span>
                  <span className={`text-xs ${theme.textTertiary}`}>{item.dueDate || 'Today'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${theme.textSecondary}`}>No pending reviews. Great job staying on top of your studies! 🎉</p>
        )}
      </div>
    </div>
  </div>
);

const GoalsPanel = ({ currentSkill, colors, theme, skillCards }) => (
  <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
    {/* Header */}
    <div className={`rounded-3xl p-8 border transition-all duration-300`}
         style={{ 
           background: `linear-gradient(135deg, ${colors[currentSkill.color].glow}, ${colors[currentSkill.color].glow}50)`,
           borderColor: `${colors[currentSkill.color].base}20`
         }}>
      <h2 className="text-xl font-bold mb-4">🎯 Learning Goals & Objectives</h2>
      <p className={`text-sm ${theme.textSecondary}`}>Track your learning objectives and get AI-powered research suggestions.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Current Objectives */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Target size={20} style={{ color: colors[currentSkill.color].base }} />
          Current Objectives
        </h3>
        <div className="space-y-4">
          {skillCards.map((skill, idx) => (
            <div key={skill.id} className={`p-4 rounded-xl border ${theme.border} ${theme.input}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{skill.subject}</h4>
                <span className="text-xs px-2 py-1 rounded-lg" style={{ 
                  background: colors[skill.color].glow, 
                  color: colors[skill.color].dark 
                }}>
                  {skill.progress}%
                </span>
              </div>
              <p className={`text-sm ${theme.textSecondary} mb-2`}>Next: {skill.nextUp}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={12} />
                <span>Last active: {skill.lastActive}</span>
                <span>•</span>
                <span>{skill.streak}d streak</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Research Suggestions */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Search size={20} className="text-purple-500" />
          AI Research Suggestions
        </h3>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>Get personalized research topics based on your learning progress.</p>
        
        <button 
          onClick={() => {
            alert('Suggested research topics:\n• Advanced MapReduce Patterns\n• LangGraph Multi-Agent Orchestration\n• Tree Traversal Optimization\n• IoT Security Best Practices\n• Distributed System Design Patterns');
          }}
          className={`w-full px-4 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105`}
          style={{ background: `linear-gradient(135deg, #8b5cf6, #a78bfa)` }}
        >
          Generate Research Topics
        </button>

        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Recommended Deep Dives:</h4>
          <div className="space-y-2">
            <div className={`p-3 rounded-lg ${theme.input} border ${theme.border}`}>
              <span className="text-sm font-medium">Advanced {currentSkill.nextUp}</span>
              <p className={`text-xs ${theme.textTertiary} mt-1`}>Based on your current progress</p>
            </div>
            <div className={`p-3 rounded-lg ${theme.input} border ${theme.border}`}>
              <span className="text-sm font-medium">Real-world Applications</span>
              <p className={`text-xs ${theme.textTertiary} mt-1`}>Industry use cases for {currentSkill.subject}</p>
            </div>
            <div className={`p-3 rounded-lg ${theme.input} border ${theme.border}`}>
              <span className="text-sm font-medium">Performance Optimization</span>
              <p className={`text-xs ${theme.textTertiary} mt-1`}>Advanced techniques and best practices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Tracker */}
      <div className={`col-span-full ${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Award size={20} className="text-green-500" />
          Milestone Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {skillCards.map((skill, idx) => (
            <div key={skill.id} className={`p-4 rounded-xl border ${theme.border}`} 
                 style={{ background: colors[skill.color].glow }}>
              <h4 className="font-semibold text-sm mb-2" style={{ color: colors[skill.color].dark }}>
                {skill.subject}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: colors[skill.color].dark }}>Progress</span>
                  <span style={{ color: colors[skill.color].base }}>{skill.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${skill.progress}%`,
                      background: colors[skill.color].base
                    }}
                  />
                </div>
                <p className="text-xs" style={{ color: colors[skill.color].dark }}>
                  Next: {skill.nextUp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const LearnPanel = ({ currentSkill, colors, theme, skillCards }) => (
  <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
    {/* Header */}
    <div className={`rounded-3xl p-8 border transition-all duration-300`}
         style={{ 
           background: `linear-gradient(135deg, ${colors[currentSkill.color].glow}, ${colors[currentSkill.color].glow}50)`,
           borderColor: `${colors[currentSkill.color].base}20`
         }}>
      <h2 className="text-xl font-bold mb-4">📚 Adaptive Learning Center</h2>
      <p className={`text-sm ${theme.textSecondary}`}>Personalized learning paths and interactive content based on your progress.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Current Focus */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <BookOpen size={20} style={{ color: colors[currentSkill.color].base }} />
          Today's Focus: {currentSkill.nextUp}
        </h3>
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${theme.border}`} 
               style={{ background: colors[currentSkill.color].glow }}>
            <h4 className="font-semibold text-sm mb-2" style={{ color: colors[currentSkill.color].dark }}>
              {currentSkill.subject}
            </h4>
            <p className="text-sm" style={{ color: colors[currentSkill.color].dark }}>
              You're {currentSkill.progress}% complete. Focus on understanding {currentSkill.nextUp} concepts through practical examples.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recommended Learning Path:</h4>
            {['Conceptual Understanding', 'Practical Examples', 'Hands-on Practice', 'Real-world Applications'].map((step, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: theme.input }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'text-white' : theme.textTertiary
                }`} style={{ background: idx === 0 ? colors[currentSkill.color].base : 'transparent' }}>
                  {idx + 1}
                </div>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learning Resources */}
      <div className={`${theme.surfaceElevated} border ${theme.border} rounded-3xl p-6`}>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Layers size={20} className="text-blue-500" />
          Learning Resources
        </h3>
        <div className="space-y-3">
          <button className={`w-full p-4 rounded-xl text-left ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <BookOpen size={18} style={{ color: colors[currentSkill.color].base }} />
              <div>
                <p className="font-medium text-sm">Interactive Tutorials</p>
                <p className={`text-xs ${theme.textTertiary}`}>Step-by-step guided learning</p>
              </div>
            </div>
          </button>
          
          <button className={`w-full p-4 rounded-xl text-left ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <Code size={18} className="text-purple-500" />
              <div>
                <p className="font-medium text-sm">Code Examples</p>
                <p className={`text-xs ${theme.textTertiary}`}>Practical implementation samples</p>
              </div>
            </div>
          </button>

          <button className={`w-full p-4 rounded-xl text-left ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <Beaker size={18} className="text-green-500" />
              <div>
                <p className="font-medium text-sm">Practice Exercises</p>
                <p className={`text-xs ${theme.textTertiary}`}>Hands-on coding challenges</p>
              </div>
            </div>
          </button>

          <button className={`w-full p-4 rounded-xl text-left ${theme.input} ${theme.surfaceHover} border ${theme.border} transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <Search size={18} className="text-orange-500" />
              <div>
                <p className="font-medium text-sm">Research Papers</p>
                <p className={`text-xs ${theme.textTertiary}`}>Academic and industry insights</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`col-span-full grid grid-cols-2 md:grid-cols-3 gap-4`}>
        <button className={`p-6 rounded-2xl text-center transition-all duration-300 hover:scale-105 text-white font-semibold`}
                style={{ background: `linear-gradient(135deg, ${colors[currentSkill.color].base}, ${colors[currentSkill.color].light})` }}>
          <Brain size={24} className="mx-auto mb-2" />
          <p className="text-sm">Ask AI Mentor</p>
        </button>
        
        <button className={`p-6 rounded-2xl text-center transition-all duration-300 hover:scale-105 text-white font-semibold`}
                style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
          <MessageSquare size={24} className="mx-auto mb-2" />
          <p className="text-sm">Start Viva Session</p>
        </button>
        
        <button className={`p-6 rounded-2xl text-center transition-all duration-300 hover:scale-105 text-white font-semibold`}
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
          <Languages size={24} className="mx-auto mb-2" />
          <p className="text-sm">Translate Concept</p>
        </button>
      </div>
    </div>
  </div>
);

export default SkillDashboard;