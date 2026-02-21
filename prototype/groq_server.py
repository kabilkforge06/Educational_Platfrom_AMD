from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import requests
import json
import os
import time
from datetime import datetime
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.language_models.llms import LLM
from typing import Any, List, Optional

load_dotenv()

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False  
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  
ALLOWED_EXTENSIONS = {'pdf', 'txt', 'doc', 'docx'}

CORS(app)  
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('vector_stores', exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class GroqPythonClient:
    def __init__(self):
        self.api_key = os.getenv('REACT_APP_GROQ_API_KEY')
        if not self.api_key:
            raise ValueError('REACT_APP_GROQ_API_KEY environment variable is required')
        self.base_url = 'https://api.groq.com/openai/v1'
        self.model = 'llama-3.3-70b-versatile'
        self.conversation_history = {}
        
        print(f'🔑 Groq API Key loaded: {self.api_key[:10]}...' if self.api_key else '❌ No API key')
        print(f'🤖 Model: {self.model}')
        
    def generate_completion(self, prompt, options=None):
        if options is None:
            options = {}
            
        system_prompt = options.get('systemPrompt', 'You are an expert educational AI assistant.')
        temperature = options.get('temperature', 0.7)
        max_tokens = options.get('maxTokens', 2048)
        session_id = options.get('sessionId')
        
        messages = self._build_messages(system_prompt, prompt, session_id)
        
        try:
            response = requests.post(
                f'{self.base_url}/chat/completions',
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': self.model,
                    'messages': messages,
                    'temperature': temperature,
                    'max_tokens': max_tokens
                },
                timeout=30
            )
            
            if not response.ok:
                error_text = response.text
                print(f'❌ Groq API Error: {response.status_code} - {error_text}')
                raise Exception(f'Groq API error: {response.status_code} - {error_text}')
                
            data = response.json()
            assistant_message = data['choices'][0]['message']['content']
            
            # Update conversation history
            if session_id:
                self._update_history(session_id, {'role': 'user', 'content': prompt})
                self._update_history(session_id, {'role': 'assistant', 'content': assistant_message})
            
            print('✅ Groq API Response received')
            
            return {
                'content': assistant_message,
                'usage': data.get('usage', {}),
                'model': data.get('model', self.model)
            }
            
        except Exception as error:
            print(f'❌ Groq inference error: {error}')
            raise error
    
    def generate_structured(self, prompt, schema, options=None):
        if options is None:
            options = {}
            
        system_prompt = f"{options.get('systemPrompt', 'You are an expert educational AI assistant.')}\n\nYou must respond with valid JSON only. No markdown, no code blocks, no explanations - just the raw JSON object matching this schema: {json.dumps(schema)}"
        
        structured_options = {
            **options,
            'systemPrompt': system_prompt,
            'temperature': 0.3  # Lower temp for structured output
        }
        
        result = self.generate_completion(prompt, structured_options)
        content = result['content'].strip()
        
        # Try to extract JSON from the response
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re
            
            # Try to find JSON in code blocks
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
            if json_match:
                try:
                    return json.loads(json_match.group(1).strip())
                except json.JSONDecodeError:
                    pass
            
            # Try to find JSON object directly (starts with { ends with })
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass
            
            print(f'Failed to parse structured output. Raw content: {content[:500]}')
            raise Exception('Invalid JSON response from model')
    
    def _build_messages(self, system_prompt, user_prompt, session_id):
        messages = [{'role': 'system', 'content': system_prompt}]
        
        # Add conversation history if session exists
        if session_id and session_id in self.conversation_history:
            messages.extend(self.conversation_history[session_id])
            
        messages.append({'role': 'user', 'content': user_prompt})
        return messages
    
    def _update_history(self, session_id, message):
        if session_id not in self.conversation_history:
            self.conversation_history[session_id] = []
            
        self.conversation_history[session_id].append(message)
        
        # Limit history to last 20 messages (10 exchanges)
        if len(self.conversation_history[session_id]) > 20:
            self.conversation_history[session_id] = self.conversation_history[session_id][-20:]
    
    def clear_session(self, session_id):
        if session_id in self.conversation_history:
            del self.conversation_history[session_id]

# Initialize Groq client
groq_client = GroqPythonClient()

# === CUSTOM GROQ LLM WRAPPER FOR LANGCHAIN ===
class GroqLLM(LLM):
    """Custom LLM wrapper for Groq API to work with LangChain"""
    
    client: Any = None
    
    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        """Call Groq API with the given prompt"""
        response = self.client.generate_completion(prompt, {
            'temperature': 0.7,
            'maxTokens': 1024
        })
        return response['content']
    
    @property
    def _llm_type(self) -> str:
        return "groq"

# === RAG SYSTEM FOR DOCUMENT PROCESSING ===
class LocalStudyRAG:
    """RAG system for personalized AI assistance with document uploads"""
    
    def __init__(self, student_id='student_001'):
        self.student_id = student_id
        self.vector_store_path = f'vector_stores/{student_id}_faiss_index'
        self.embeddings = None
        self.vector_db = None
        self.llm = None
        self.uploaded_files = []
        
    def _initialize_models(self):
        """Lazy initialization of models"""
        if self.embeddings is None:
            print(f"🔄 Loading Embedding Model for {self.student_id}...")
            self.embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2",
                model_kwargs={'device': 'cpu'}
            )
            
        if self.llm is None:
            print(f"🔄 Initializing Groq LLM for {self.student_id}...")
            self.llm = GroqLLM(client=groq_client)
            
    def process_file(self, file_path: str):
        """Process uploaded file and create/update FAISS index"""
        try:
            self._initialize_models()
            
            if not os.path.exists(file_path):
                return {"error": f"File {file_path} not found"}
            
            # Load document based on file type
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext == '.pdf':
                loader = PyPDFLoader(file_path)
            elif file_ext == '.txt':
                loader = TextLoader(file_path, encoding='utf-8')
            else:
                return {"error": f"Unsupported file type: {file_ext}"}
            
            docs = loader.load()
            
            # Split documents into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=700,
                chunk_overlap=70
            )
            chunks = text_splitter.split_documents(docs)
            
            # Create or update vector store
            if self.vector_db is None:
                # Check if existing index exists
                if os.path.exists(self.vector_store_path):
                    print(f"📂 Loading existing vector store for {self.student_id}...")
                    self.vector_db = FAISS.load_local(
                        self.vector_store_path,
                        self.embeddings,
                        allow_dangerous_deserialization=True
                    )
                    self.vector_db.add_documents(chunks)
                else:
                    print(f"📝 Creating new vector store for {self.student_id}...")
                    self.vector_db = FAISS.from_documents(chunks, self.embeddings)
            else:
                self.vector_db.add_documents(chunks)
            
            # Save vector store
            self.vector_db.save_local(self.vector_store_path)
            
            # Track uploaded file
            self.uploaded_files.append(os.path.basename(file_path))
            
            return {
                "success": True,
                "message": f"✅ Indexed {len(chunks)} chunks from {os.path.basename(file_path)}",
                "chunks": len(chunks),
                "filename": os.path.basename(file_path)
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def ask_question(self, question: str):
        """Ask question about uploaded documents"""
        try:
            self._initialize_models()
            
            # Load vector store if not loaded
            if self.vector_db is None:
                if os.path.exists(self.vector_store_path):
                    print(f"📂 Loading vector store for {self.student_id}...")
                    self.vector_db = FAISS.load_local(
                        self.vector_store_path,
                        self.embeddings,
                        allow_dangerous_deserialization=True
                    )
                else:
                    return {
                        "error": "No documents uploaded yet. Please upload study materials first using the upload button above."
                    }
            
            print(f"🔍 Searching documents for: {question[:50]}...")
            
            # Retrieve relevant documents using similarity search
            docs = self.vector_db.similarity_search(question, k=3)
            
            if not docs:
                return {
                    "success": True,
                    "answer": "I couldn't find relevant information in your uploaded documents to answer this question. Please try rephrasing or upload more materials.",
                    "sources": [],
                    "num_sources": 0
                }
            
            print(f"📚 Found {len(docs)} relevant chunks")
            
            # Create context from retrieved documents
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Generate answer using Groq with structured formatting
            prompt = f"""Based on the following context from the student's study materials, provide a well-structured answer.

Context:
{context}

Question: {question}

IMPORTANT FORMATTING INSTRUCTIONS:
1. Start with a clear, direct answer
2. Use short paragraphs (2-3 sentences max)
3. Use bullet points with * for lists or key points
4. Use **bold** for important terms or concepts
5. Add blank lines between sections for readability
6. If the context lacks information, clearly state what's missing
7. Keep the tone educational and supportive

Provide a clear, well-formatted educational answer based on the context above."""

            response = groq_client.generate_completion(prompt, {
                'systemPrompt': 'You are an expert educational AI assistant. Format your responses with clear structure: use paragraphs, bullet points, and bold text for emphasis. Make answers scannable and easy to understand.',
                'temperature': 0.7,
                'maxTokens': 1024
            })
            
            # Format sources for better display
            formatted_sources = []
            for i, doc in enumerate(docs, 1):
                source_content = doc.page_content.strip()
                # Get first 150 characters or up to first newline
                preview = source_content[:150].split('\n')[0]
                if len(source_content) > 150:
                    preview += "..."
                
                formatted_sources.append({
                    "content": preview,
                    "metadata": doc.metadata,
                    "relevance_score": i
                })
            
            print(f"✅ Answer generated successfully with {len(docs)} sources")
            
            return {
                "success": True,
                "answer": response['content'],
                "sources": formatted_sources,
                "num_sources": len(docs)
            }
            
        except Exception as e:
            print(f"❌ RAG Error in ask_question: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": f"Failed to answer question: {str(e)}"}
    
    def get_study_summary(self):
        """Get summary of uploaded materials"""
        return {
            "student_id": self.student_id,
            "uploaded_files": self.uploaded_files,
            "has_index": os.path.exists(self.vector_store_path),
            "total_files": len(self.uploaded_files)
        }

# Initialize RAG systems for students (dictionary to store per-student RAG)
student_rags = {}

def get_student_rag(student_id):
    """Get or create RAG system for a student"""
    if student_id not in student_rags:
        student_rags[student_id] = LocalStudyRAG(student_id)
    return student_rags[student_id]

# === API ENDPOINTS ===

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model': groq_client.model,
        'api_key_loaded': bool(groq_client.api_key)
    })

@app.route('/api/chat/completion', methods=['POST'])
def chat_completion():
    """Basic chat completion endpoint"""
    try:
        data = request.json
        prompt = data.get('prompt', '')
        options = data.get('options', {})
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
            
        result = groq_client.generate_completion(prompt, options)
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/socratic/question', methods=['POST'])
def socratic_question():
    """Socratic coaching endpoint"""
    try:
        data = request.json
        question = data.get('question', '')
        student_id = data.get('studentId', 'student_001')
        metadata = data.get('metadata', {})
        
        # Extract course context
        subject = metadata.get('subject', 'General Programming')
        current_topic = metadata.get('currentTopic', 'Fundamentals')
        module = metadata.get('module', '')
        topics = metadata.get('topics', [])
        is_custom = metadata.get('isCustomCourse', False)
        difficulty = metadata.get('courseDifficulty', 'intermediate')
        course_modules = metadata.get('courseModules', [])
        
        # Build additional context information
        topics_text = ', '.join(topics) if topics else 'General topics'
        custom_note = "This is a custom course created by the student" if is_custom else "This is a predefined course"
        
        # Build course-aware system prompt
        system_prompt = f"""You are an expert educational AI specializing in {subject} that uses Socratic teaching methods. 

COURSE CONTEXT:
- Subject: {subject}
- Current Module: {module}
- Current Focus: {current_topic}
- Course Topics: {topics_text}
- Difficulty Level: {difficulty}
- Course Type: {custom_note}
- Teaching Method: Socratic questioning (guide discovery, never give answers)

STRICT RULES:
1. NEVER give the full solution or answer
2. NEVER write complete code or direct solutions
3. NEVER solve the problem directly
4. Always relate responses to the {subject} course context
5. Reference {current_topic} concepts when relevant
6. Tailor difficulty to the {difficulty} level
7. Consider the specific topics: {topics_text}

INSTEAD:
1. Ask 2-3 leading questions that guide discovery in {subject}
2. Provide conceptual hints specific to {subject} (not implementation)
3. Suggest what to think about related to {current_topic}
4. Use analogies that make sense for {subject} learners at {difficulty} level
5. Connect concepts to broader {subject} principles from this course
6. Reference other course topics ({topics_text}) when creating connections

FORMAT YOUR RESPONSE:
- Use short paragraphs (2-3 sentences max)
- Add blank lines between sections
- Use bullet points with * for questions
- Use **bold** for key {subject} concepts
- Keep responses organized and easy to read
- When appropriate, mention how this relates to {current_topic} or other course topics

COURSE-SPECIFIC EXAMPLES:
For Python: "What happens when you iterate over a list? How does Python handle memory? Think about what we learned about data structures..."
For Data Science: "What patterns do you see in the data distribution? How might outliers affect your analysis? Consider the statistical methods we covered..."
For IoT: "What's the relationship between sensor sampling rate and power consumption? How does this connect to the ESP32 concepts we're studying?"

Always respond as a {subject} expert who guides discovery through strategic questioning, never by giving direct answers. Remember you're teaching {current_topic} as part of the broader {module} module."""

        result = groq_client.generate_completion(question, {
            'systemPrompt': system_prompt,
            'temperature': 0.8,
            'sessionId': student_id
        })
        
        return jsonify({
            'success': True,
            'type': 'socratic_guidance',
            'guidance': result['content'],
            'model': result['model'],
            'usage': result['usage']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/viva/validate', methods=['POST'])
def viva_validation():
    """Mini-viva validation endpoint"""
    try:
        data = request.json
        submission = data.get('content', '')
        student_id = data.get('studentId', 'student_001')
        
        # Generate viva questions
        viva_prompt = f"""Analyze this student's code submission and create oral defense questions:

Submission: {submission}

Generate 3 targeted questions that test understanding (not memorization):
1. One about the approach/algorithm choice
2. One about implementation details
3. One about optimization or edge cases

Return as JSON with this schema:
{{
  "requiresViva": true,
  "questions": ["question 1", "question 2", "question 3"],
  "complexity": "beginner|intermediate|advanced"
}}"""

        result = groq_client.generate_structured(viva_prompt, {
            "requiresViva": "boolean",
            "questions": ["string"],
            "complexity": "string"
        }, {
            'systemPrompt': 'You are an expert code reviewer generating oral defense questions.',
            'temperature': 0.6
        })
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/translate/concept', methods=['POST'])
def translate_concept():
    """Multilingual concept translation endpoint"""
    try:
        data = request.json
        concept = data.get('concept', '')
        target_language = data.get('targetLanguage', 'en')
        cultural_context = data.get('culturalContext', False)
        
        if not concept:
            return jsonify({'error': 'Concept/text is required'}), 400
        
        # Language mappings
        language_names = {
            'en': 'English',
            'ta': 'Tamil',
            'hi': 'Hindi',
            'te': 'Telugu',
            'ml': 'Malayalam'
        }
        
        lang_name = language_names.get(target_language, 'English')
        
        cultural_metaphors = {
            'ta': {
                'database': 'கிராம பதிவேடு (village registry)',
                'api': 'அஞ்சல் சேவை (postal service)', 
                'cache': 'உள்ளூர் கடை சரக்கு (local shop inventory)',
                'mapreduce': 'சந்தை வர்த்தக மாதிரி (market trading pattern)'
            },
            'hi': {
                'database': 'गाँव का रजिस्टर (village register)',
                'api': 'डाक सेवा (postal service)',
                'cache': 'स्थानीय दुकान स्टॉक (local shop stock)', 
                'mapreduce': 'बाजार व्यापार पैटर्न (market trade pattern)'
            },
            'te': {
                'database': 'గ్రామ రిజిస్టర్ (village register)',
                'api': 'తపాలా సేవ (postal service)',
                'cache': 'స్థానిక దుకాణం నిల్వ (local shop stock)',
                'mapreduce': 'మార్కెట్ వాణిజ్య నమూనా (market trade pattern)'
            },
            'ml': {
                'database': 'ഗ്രാമ രജിസ്റ്റർ (village register)',
                'api': 'തപാൽ സേവനം (postal service)',
                'cache': 'പ്രാദേശിക കട സ്റ്റോക്ക് (local shop stock)',
                'mapreduce': 'വിപണി വ്യാപാര മാതൃക (market trade pattern)'
            }
        }
        
        if target_language in cultural_metaphors and cultural_context:
            metaphor_context = f"Use these cultural metaphors: {json.dumps(cultural_metaphors[target_language])}"
        else:
            metaphor_context = ""
        
        # Determine if it's a short concept or full text
        is_full_text = len(concept.split()) > 10
        
        if is_full_text:
            # Translate full text/paragraph
            translation_prompt = f"""Translate this educational content to {lang_name} while preserving the meaning and educational value:

Original Text:
{concept}

Target Language: {lang_name}
{metaphor_context}

TRANSLATION GUIDELINES:
1. Maintain the educational and pedagogical tone
2. Keep technical terms accurate
3. Use natural, conversational {lang_name}
4. Preserve formatting (paragraphs, bullets, emphasis)
5. For Tamil/Hindi: Use cultural analogies where appropriate
6. Keep the same structure and organization

Provide a natural, fluent translation that sounds like it was originally written in {lang_name}."""
        else:
            # Translate concept with explanation
            translation_prompt = f"""Translate and explain this technical concept in {lang_name}:

Concept: {concept}
Target Language: {lang_name}
{metaphor_context}

FORMAT YOUR RESPONSE WITH CLEAR STRUCTURE:
- Use short paragraphs (2-3 sentences max)
- Add blank lines between sections
- Use bullet points with * for lists
- Use **bold** for key terms
- Keep it organized and scannable

Provide:
1. **Concept Overview**: Direct cultural translation (not literal word-for-word)
2. **Cultural Analogy**: Use familiar analogies from the target culture
3. **Technical Details**: Maintain technical accuracy
4. **Regional Example**: Include a real-world scenario

Focus on IDEAS and CONCEPTS, not just words."""

        result = groq_client.generate_completion(translation_prompt, {
            'systemPrompt': f'You are an expert in multilingual education for {target_language} speakers. IMPORTANT: Output native script characters directly, NOT Unicode escape sequences.',
            'temperature': 0.7
        })
        
        # Decode any Unicode escape sequences in the response
        translation_text = result['content']
        try:
            # If the model returned escaped Unicode, decode it
            if '\\u' in translation_text:
                translation_text = translation_text.encode('utf-8').decode('unicode-escape')
        except Exception as decode_err:
            print(f'Unicode decode warning: {decode_err}')
            # Keep original if decode fails
            pass
        
        # Create response with proper UTF-8 encoding
        response_data = {
            'success': True,
            'translation': translation_text,
            'targetLanguage': target_language,
            'model': result['model']
        }
        
        return app.response_class(
            response=json.dumps(response_data, ensure_ascii=False, indent=2),
            status=200,
            mimetype='application/json; charset=utf-8'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/rubric/evaluate', methods=['POST'])
def rubric_evaluation():
    """Rubric-based evaluation endpoint"""
    try:
        data = request.json
        submission = data.get('content', '')
        mode = data.get('mode', 'academic')  # academic or industry
        
        if mode == 'academic':
            rubric_criteria = """
Academic Rubrics:
- Correctness (40%): Functional accuracy and error-free execution
- Theory Understanding (25%): Understanding of underlying concepts  
- Documentation (15%): Code comments and explanation quality
- Style (10%): Coding conventions and readability
- Testing (10%): Test coverage and edge cases"""
        else:
            rubric_criteria = """
Industry Rubrics (AMD Standards):
- Performance (30%): Execution efficiency and optimization
- Scalability (25%): Ability to handle growth and load
- Maintainability (20%): Code quality and future extensibility
- Security (15%): Vulnerability prevention and best practices
- Production Readiness (10%): Deployment readiness and robustness"""
        
        evaluation_prompt = f"""Evaluate this submission using {mode} standards:

Submission: {submission}

{rubric_criteria}

Provide detailed feedback with:
1. Score for each criterion (0-100)
2. Overall weighted score
3. Specific strengths and areas for improvement
4. Actionable recommendations

Return as structured evaluation."""

        result = groq_client.generate_completion(evaluation_prompt, {
            'systemPrompt': f'You are an expert {mode} evaluator providing detailed rubric-based feedback.',
            'temperature': 0.4
        })
        
        return jsonify({
            'success': True,
            'evaluation': result['content'],
            'mode': mode,
            'model': result['model']
        })
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/schedule/review', methods=['POST'])
def daily_review():
    """Spaced repetition daily review endpoint"""
    try:
        data = request.json
        student_id = data.get('studentId', 'student_001')
        
        review_prompt = f"""Generate a personalized daily learning review for student {student_id}:

Create a spaced repetition schedule with:
1. High priority topics (due today)
2. Medium priority topics (due soon)
3. Research suggestions for deeper learning
4. Motivational message

Focus on computer science, data structures, algorithms, and system design.

Return as JSON:
{{
  "highPriority": ["topic1", "topic2"],
  "mediumPriority": ["topic1", "topic2"],
  "researchSuggestions": ["suggestion1", "suggestion2"],
  "motivationalMessage": "encouraging message",
  "streakDays": number
}}"""

        result = groq_client.generate_structured(review_prompt, {
            "highPriority": ["string"],
            "mediumPriority": ["string"], 
            "researchSuggestions": ["string"],
            "motivationalMessage": "string",
            "streakDays": "number"
        }, {
            'systemPrompt': 'You are an expert learning scheduler using spaced repetition principles.',
            'temperature': 0.6
        })
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/course/generate', methods=['POST'])
def generate_curriculum():
    """AI-powered curriculum generation for custom courses"""
    try:
        data = request.json
        title = data.get('title', '')
        objective = data.get('objective', '')
        
        if not title:
            return jsonify({'success': False, 'error': 'Course title is required'}), 400
        
        curriculum_prompt = f"""Create a structured learning curriculum for the following course:

Course Title: {title}
Learning Objective: {objective if objective else 'Master the fundamentals and practical applications'}

Generate a well-organized curriculum with 4-6 modules. For each module, include:
1. A clear, concise module title
2. 3-5 specific topics/subtopics to cover
3. Estimated time to complete (in hours, like "2h" or "3h")
4. Logical ordering from foundational to advanced

IMPORTANT: Return ONLY the JSON object below, no other text:
{{
  "modules": [
    {{
      "moduleTitle": "Module name here",
      "topics": ["topic1", "topic2", "topic3"],
      "estimatedTime": "2h"
    }}
  ],
  "description": "A 1-2 sentence course description",
  "totalTime": "12h",
  "difficulty": "beginner"
}}"""

        result = groq_client.generate_structured(curriculum_prompt, {
            "modules": [{"moduleTitle": "string", "topics": ["string"], "estimatedTime": "string"}],
            "description": "string",
            "totalTime": "string",
            "difficulty": "string"
        }, {
            'systemPrompt': 'You are an expert curriculum designer. Respond with ONLY valid JSON, no markdown formatting, no code blocks, no explanations.',
            'temperature': 0.5
        })
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/session/clear', methods=['POST'])
def clear_session():
    """Clear conversation history for a session"""
    try:
        data = request.json
        session_id = data.get('sessionId')
        
        if session_id:
            groq_client.clear_session(session_id)
            
        return jsonify({
            'success': True,
            'message': f'Session {session_id} cleared'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# === RAG ENDPOINTS ===

@app.route('/api/upload/document', methods=['POST'])
def upload_document():
    """Upload and process student study materials"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        student_id = request.form.get('studentId', 'student_001')
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if file and allowed_file(file.filename):
            # Secure filename and save
            filename = secure_filename(file.filename)
            student_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], student_id)
            os.makedirs(student_upload_dir, exist_ok=True)
            
            file_path = os.path.join(student_upload_dir, filename)
            file.save(file_path)
            
            # Process file with RAG
            rag = get_student_rag(student_id)
            result = rag.process_file(file_path)
            
            if 'error' in result:
                return jsonify({
                    'success': False,
                    'error': result['error']
                }), 500
            
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/rag/ask', methods=['POST'])
def rag_ask_question():
    """Ask questions about uploaded documents"""
    try:
        data = request.json
        question = data.get('question', '')
        student_id = data.get('studentId', 'student_001')
        
        if not question:
            return jsonify({
                'success': False,
                'error': 'Question is required'
            }), 400
        
        print(f"📝 Answering question for {student_id}: {question[:50]}...")
        
        # Get student's RAG system
        rag = get_student_rag(student_id)
        result = rag.ask_question(question)
        
        if 'error' in result:
            print(f"❌ RAG Error: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
        
        print(f"✅ Answer generated with {result.get('num_sources', 0)} sources")
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/rag/summary', methods=['GET'])
def rag_get_summary():
    """Get summary of uploaded materials for a student"""
    try:
        student_id = request.args.get('studentId', 'student_001')
        
        rag = get_student_rag(student_id)
        summary = rag.get_study_summary()
        
        return jsonify({
            'success': True,
            'data': summary
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    print('🚀 Starting Groq Python Server with RAG Support...')
    print(f'🔑 API Key Status: {"✅ Loaded" if groq_client.api_key else "❌ Missing"}')
    print(f'🤖 Model: {groq_client.model}')
    print('🌍 CORS enabled for all origins')
    print('📡 Available endpoints:')
    print('   POST /api/chat/completion - Basic chat')
    print('   POST /api/socratic/question - Socratic coaching')
    print('   POST /api/viva/validate - Mini-viva validation') 
    print('   POST /api/translate/concept - Concept translation')
    print('   POST /api/rubric/evaluate - Rubric evaluation')
    print('   POST /api/schedule/review - Daily review')
    print('   POST /api/course/generate - AI curriculum generation 🎓')
    print('   POST /api/upload/document - Upload study materials 📚')
    print('   POST /api/rag/ask - Ask questions about documents 🔍')
    print('   GET  /api/rag/summary - Get uploaded materials summary 📊')
    print('   GET  /api/health - Health check')
    
    app.run(debug=True, host='0.0.0.0', port=5000)