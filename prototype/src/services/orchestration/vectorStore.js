/**
 * Personalized Vector Store
 * Manages student-specific knowledge embeddings for RAG
 * Stores syllabus, notes, and learning artifacts
 */

class VectorStore {
  constructor() {
    this.collections = new Map(); // studentId -> Collection
    this.embeddingCache = new Map();
    this.indexedDB = null;
    this._initIndexedDB();
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  async _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SkillDashboardVectorDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('embeddings')) {
          db.createObjectStore('embeddings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
          docStore.createIndex('studentId', 'studentId', { unique: false });
          docStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * Ingest syllabus or notes for a student
   */
  async ingestDocument(studentId, document) {
    const chunks = this._chunkDocument(document);
    const embeddings = await this._generateEmbeddings(chunks);

    const collection = {
      studentId,
      documents: chunks.map((chunk, idx) => ({
        id: `${studentId}_${Date.now()}_${idx}`,
        content: chunk,
        embedding: embeddings[idx],
        metadata: {
          type: document.type || 'syllabus',
          uploadedAt: new Date().toISOString(),
          source: document.source || 'user_upload'
        }
      }))
    };

    // Store in memory
    if (!this.collections.has(studentId)) {
      this.collections.set(studentId, []);
    }
    this.collections.get(studentId).push(...collection.documents);

    // Persist to IndexedDB
    await this._persistDocuments(collection.documents);

    return {
      success: true,
      chunksCreated: chunks.length,
      studentId
    };
  }

  /**
   * Semantic search for relevant context
   */
  async search(studentId, query, options = {}) {
    const {
      topK = 5,
      threshold = 0.7,
      filter = {}
    } = options;

    const queryEmbedding = await this._generateEmbedding(query);
    const studentDocs = this.collections.get(studentId) || [];

    if (studentDocs.length === 0) {
      return {
        results: [],
        message: 'No documents found for this student'
      };
    }

    // Calculate cosine similarity
    const scored = studentDocs.map(doc => ({
      ...doc,
      score: this._cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Filter and sort
    let filtered = scored.filter(doc => doc.score >= threshold);

    // Apply metadata filters
    if (filter.type) {
      filtered = filtered.filter(doc => doc.metadata.type === filter.type);
    }

    // Sort by relevance
    filtered.sort((a, b) => b.score - a.score);

    return {
      results: filtered.slice(0, topK),
      totalFound: filtered.length
    };
  }

  /**
   * Get context for RAG (Retrieval-Augmented Generation)
   */
  async getContext(studentId, query, maxTokens = 2000) {
    const searchResults = await this.search(studentId, query, { topK: 10 });
    
    let context = '';
    let tokenCount = 0;

    for (const result of searchResults.results) {
      const chunk = result.content;
      const chunkTokens = this._estimateTokens(chunk);

      if (tokenCount + chunkTokens > maxTokens) break;

      context += chunk + '\n\n';
      tokenCount += chunkTokens;
    }

    return {
      context: context.trim(),
      sources: searchResults.results.map(r => r.metadata),
      tokenCount
    };
  }

  /**
   * Chunk document into semantic segments
   */
  _chunkDocument(document) {
    const text = typeof document === 'string' ? document : document.content;
    const chunkSize = 512; // tokens
    const overlap = 50;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const chunks = [];
    let currentChunk = '';
    let currentSize = 0;

    for (const sentence of sentences) {
      const sentenceSize = this._estimateTokens(sentence);

      if (currentSize + sentenceSize > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Overlap: keep last part of previous chunk
        const words = currentChunk.split(' ');
        currentChunk = words.slice(-overlap).join(' ') + ' ' + sentence;
        currentSize = this._estimateTokens(currentChunk);
      } else {
        currentChunk += sentence + '. ';
        currentSize += sentenceSize;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
  }

  /**
   * Generate embeddings (mock - replace with actual embedding model)
   */
  async _generateEmbeddings(texts) {
    // In production: use OpenAI embeddings, Cohere, or local model
    // For now: simple hash-based mock embedding
    return texts.map(text => this._generateEmbedding(text));
  }

  _generateEmbedding(text) {
    // Mock 384-dim embedding (simulates sentence-transformers)
    const hash = this._simpleHash(text);
    const embedding = new Array(384).fill(0).map((_, i) => {
      return Math.sin(hash * (i + 1)) * 0.5 + Math.cos(hash * (i + 2)) * 0.5;
    });
    return this._normalize(embedding);
  }

  /**
   * Cosine similarity between vectors
   */
  _cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Normalize vector
   */
  _normalize(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  /**
   * Simple hash function
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Estimate token count (rough approximation)
   */
  _estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  /**
   * Persist documents to IndexedDB
   */
  async _persistDocuments(documents) {
    if (!this.indexedDB) await this._initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');

      documents.forEach(doc => store.add(doc));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Load student documents from IndexedDB
   */
  async loadStudentDocuments(studentId) {
    if (!this.indexedDB) await this._initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const index = store.index('studentId');
      const request = index.getAll(studentId);

      request.onsuccess = () => {
        const docs = request.result;
        if (docs.length > 0) {
          this.collections.set(studentId, docs);
        }
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data for a student
   */
  async clearStudent(studentId) {
    this.collections.delete(studentId);
    // Also clear from IndexedDB
    if (!this.indexedDB) await this._initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const index = store.index('studentId');
      const request = index.openCursor(IDBKeyRange.only(studentId));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const vectorStore = new VectorStore();
export default VectorStore;
